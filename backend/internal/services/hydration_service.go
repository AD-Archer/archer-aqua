package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/dto"
	"github.com/AD-Archer/archer-aqua/backend/internal/models"
	"github.com/AD-Archer/archer-aqua/backend/internal/utils"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// HydrationService manages hydration logs, summaries, and streaks.
type HydrationService struct {
	db *gorm.DB
}

func NewHydrationService(db *gorm.DB) *HydrationService {
	return &HydrationService{db: db}
}

func (s *HydrationService) LogHydration(ctx context.Context, userID uuid.UUID, input dto.LogHydrationRequest) (*models.HydrationLog, error) {
	user, err := s.fetchUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	volumeMl, err := utils.ConvertVolumeToMl(input.Volume.Value, input.Volume.Unit)
	if err != nil {
		return nil, err
	}

	hydrationMultiplier := 1.0

	var drink *models.Drink
	if input.DrinkID != nil {
		d, err := s.fetchDrink(ctx, userID, *input.DrinkID)
		if err != nil {
			return nil, err
		}
		drink = d
		hydrationMultiplier = d.HydrationMultiplier
		if strings.TrimSpace(input.Label) == "" {
			input.Label = d.Name
		}
	}

	if input.HydrationMultiplier != nil && *input.HydrationMultiplier > 0 {
		hydrationMultiplier = *input.HydrationMultiplier
	}

	consumedAt := input.ConsumedAt
	if consumedAt.IsZero() {
		consumedAt = time.Now().UTC()
	}

	tz := user.Timezone
	if strings.TrimSpace(input.Timezone) != "" {
		tz = input.Timezone
	}

	loc, err := utils.LoadLocation(tz)
	if err != nil {
		return nil, err
	}

	consumedLocal := consumedAt.In(loc)
	dailyKey := utils.DailyKey(consumedAt, loc)

	effectiveMl := volumeMl * hydrationMultiplier

	logEntry := models.HydrationLog{
		UserID:              user.ID,
		DrinkID:             nil,
		Label:               strings.TrimSpace(input.Label),
		VolumeMl:            volumeMl,
		HydrationMultiplier: hydrationMultiplier,
		EffectiveMl:         effectiveMl,
		ConsumedAt:          consumedAt.UTC(),
		ConsumedAtLocal:     consumedLocal,
		Timezone:            loc.String(),
		DailyKey:            dailyKey,
		Source:              defaultString(input.Source, "manual"),
		Notes:               input.Notes,
	}

	if drink != nil {
		logEntry.DrinkID = &drink.ID
	}

	logEntry.Metadata = datatypes.JSONMap{
		"volumeUnit":       input.Volume.Unit,
		"createdFromDrink": drink != nil,
	}

	if err := s.db.WithContext(ctx).Create(&logEntry).Error; err != nil {
		return nil, fmt.Errorf("log hydration: %w", err)
	}

	return &logEntry, nil
}

func (s *HydrationService) DailySummary(ctx context.Context, userID uuid.UUID, date time.Time, timezone string) (*dto.DailySummaryResponse, error) {
	user, err := s.fetchUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	tz := user.Timezone
	if strings.TrimSpace(timezone) != "" {
		tz = timezone
	}

	loc, err := utils.LoadLocation(tz)
	if err != nil {
		return nil, err
	}

	date = date.In(loc)
	start, end := utils.DayBounds(date, loc)

	var logs []models.HydrationLog
	if err := s.db.WithContext(ctx).
		Where("user_id = ? AND consumed_at BETWEEN ? AND ?", userID, start.UTC(), end.UTC()).
		Order("consumed_at ASC").
		Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("fetch logs: %w", err)
	}

	totalVolume := 0.0
	totalEffective := 0.0
	responses := make([]dto.HydrationLogResponse, 0, len(logs))
	for _, logEntry := range logs {
		totalVolume += logEntry.VolumeMl
		totalEffective += logEntry.EffectiveMl
		responses = append(responses, dto.NewHydrationLogResponse(logEntry))
	}

	goalMl := user.DailyGoalLiters * 1000
	if goalMl == 0 {
		goalMl = 2000
	}

	progress := 0.0
	if goalMl > 0 {
		progress = (totalEffective / goalMl) * 100
	}

	status := "not_started"
	if totalEffective >= goalMl {
		status = "completed"
	} else if totalEffective > 0 {
		status = "in_progress"
	}

	return &dto.DailySummaryResponse{
		Date:               start.Format("2006-01-02"),
		Timezone:           loc.String(),
		TotalVolumeMl:      totalVolume,
		TotalEffectiveMl:   totalEffective,
		GoalVolumeMl:       goalMl,
		ProgressPercentage: progress,
		Status:             status,
		Logs:               responses,
	}, nil
}

func (s *HydrationService) WeeklyStats(ctx context.Context, userID uuid.UUID, timezone string, days int) (*dto.HydrationStatsResponse, error) {
	if days <= 0 {
		days = 7
	}

	user, err := s.fetchUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	tz := user.Timezone
	if strings.TrimSpace(timezone) != "" {
		tz = timezone
	}

	loc, err := utils.LoadLocation(tz)
	if err != nil {
		return nil, err
	}

	now := time.Now().In(loc)
	startRange := now.AddDate(0, 0, -days+1)

	var logs []models.HydrationLog
	if err := s.db.WithContext(ctx).
		Where("user_id = ? AND consumed_at >= ?", userID, startRange.Add(-24*time.Hour).UTC()).
		Order("consumed_at ASC").
		Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("fetch logs: %w", err)
	}

	summaries := make(map[string]*dto.DailySummaryResponse)
	totalVolume := 0.0
	totalEffective := 0.0

	goalMl := user.DailyGoalLiters * 1000
	if goalMl == 0 {
		goalMl = 2000
	}

	for _, logEntry := range logs {
		key := utils.DailyKey(logEntry.ConsumedAtLocal, loc)
		summary, exists := summaries[key]
		if !exists {
			summary = &dto.DailySummaryResponse{
				Date:         key,
				Timezone:     loc.String(),
				GoalVolumeMl: goalMl,
			}
			summaries[key] = summary
		}
		summary.TotalVolumeMl += logEntry.VolumeMl
		summary.TotalEffectiveMl += logEntry.EffectiveMl
		summary.Logs = append(summary.Logs, dto.NewHydrationLogResponse(logEntry))
		totalVolume += logEntry.VolumeMl
		totalEffective += logEntry.EffectiveMl
	}

	ordered := make([]dto.DailySummaryResponse, 0, len(summaries))
	streak := 0
	bestStreak := 0

	for i := 0; i < days; i++ {
		date := startRange.AddDate(0, 0, i)
		key := date.Format("2006-01-02")
		summary, exists := summaries[key]
		if !exists {
			summary = &dto.DailySummaryResponse{
				Date:         key,
				Timezone:     loc.String(),
				GoalVolumeMl: goalMl,
				Logs:         []dto.HydrationLogResponse{},
			}
			summaries[key] = summary
		}

		summary.ProgressPercentage = 0
		if summary.GoalVolumeMl > 0 {
			summary.ProgressPercentage = (summary.TotalEffectiveMl / summary.GoalVolumeMl) * 100
		}

		if summary.TotalEffectiveMl >= summary.GoalVolumeMl {
			summary.Status = "completed"
			streak++
			if streak > bestStreak {
				bestStreak = streak
			}
		} else if summary.TotalEffectiveMl > 0 {
			summary.Status = "in_progress"
			streak = 0
		} else {
			summary.Status = "not_started"
			streak = 0
		}

		ordered = append(ordered, *summary)
	}

	return &dto.HydrationStatsResponse{
		UserID:           user.ID,
		Timezone:         loc.String(),
		DailySummaries:   ordered,
		StreakCount:      streak,
		BestStreak:       bestStreak,
		TotalVolumeMl:    totalVolume,
		TotalEffectiveMl: totalEffective,
	}, nil
}

func (s *HydrationService) fetchUser(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("fetch user: %w", err)
	}
	return &user, nil
}

func (s *HydrationService) fetchDrink(ctx context.Context, userID, drinkID uuid.UUID) (*models.Drink, error) {
	var drink models.Drink
	if err := s.db.WithContext(ctx).
		Where("id = ? AND (user_id IS NULL OR user_id = ?)", drinkID, userID).
		First(&drink).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("drink not available")
		}
		return nil, fmt.Errorf("fetch drink: %w", err)
	}
	return &drink, nil
}
