package dto

import (
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/models"
	"github.com/google/uuid"
)

type LogHydrationRequest struct {
	DrinkID             *uuid.UUID    `json:"drinkId"`
	Label               string        `json:"label"`
	Volume              VolumePayload `json:"volume"`
	HydrationMultiplier *float64      `json:"hydrationMultiplier"`
	ConsumedAt          time.Time     `json:"consumedAt"`
	Timezone            string        `json:"timezone"`
	Source              string        `json:"source"`
	Notes               *string       `json:"notes"`
}

type HydrationLogResponse struct {
	ID                  uuid.UUID  `json:"id"`
	UserID              uuid.UUID  `json:"userId"`
	DrinkID             *uuid.UUID `json:"drinkId"`
	Label               string     `json:"label"`
	VolumeMl            float64    `json:"volumeMl"`
	HydrationMultiplier float64    `json:"hydrationMultiplier"`
	EffectiveMl         float64    `json:"effectiveMl"`
	ConsumedAt          time.Time  `json:"consumedAt"`
	ConsumedAtLocal     time.Time  `json:"consumedAtLocal"`
	Timezone            string     `json:"timezone"`
	DailyKey            string     `json:"dailyKey"`
	Source              string     `json:"source"`
	Notes               *string    `json:"notes"`
}

type DailySummaryResponse struct {
	Date               string                 `json:"date"`
	Timezone           string                 `json:"timezone"`
	TotalVolumeMl      float64                `json:"totalVolumeMl"`
	TotalEffectiveMl   float64                `json:"totalEffectiveMl"`
	GoalVolumeMl       float64                `json:"goalVolumeMl"`
	ProgressPercentage float64                `json:"progressPercentage"`
	Status             string                 `json:"status"`
	Logs               []HydrationLogResponse `json:"logs"`
}

type SetDailyGoalRequest struct {
	Date   string  `json:"date"`
	GoalMl float64 `json:"goalMl"`
}

type DailyGoalResponse struct {
	ID     string  `json:"id"`
	UserID string  `json:"userId"`
	Date   string  `json:"date"`
	GoalMl float64 `json:"goalMl"`
}

type HydrationStatsResponse struct {
	UserID           uuid.UUID              `json:"userId"`
	Timezone         string                 `json:"timezone"`
	DailySummaries   []DailySummaryResponse `json:"dailySummaries"`
	StreakCount      int                    `json:"streakCount"`
	BestStreak       int                    `json:"bestStreak"`
	TotalVolumeMl    float64                `json:"totalVolumeMl"`
	TotalEffectiveMl float64                `json:"totalEffectiveMl"`
}

func NewHydrationLogResponse(log models.HydrationLog) HydrationLogResponse {
	return HydrationLogResponse{
		ID:                  log.ID,
		UserID:              log.UserID,
		DrinkID:             log.DrinkID,
		Label:               log.Label,
		VolumeMl:            log.VolumeMl,
		HydrationMultiplier: log.HydrationMultiplier,
		EffectiveMl:         log.EffectiveMl,
		ConsumedAt:          log.ConsumedAt,
		ConsumedAtLocal:     log.ConsumedAtLocal,
		Timezone:            log.Timezone,
		DailyKey:            log.DailyKey,
		Source:              log.Source,
		Notes:               log.Notes,
	}
}
