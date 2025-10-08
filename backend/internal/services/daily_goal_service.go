package services

import (
	"context"
	"errors"
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DailyGoalService manages daily hydration goals.
type DailyGoalService struct {
	db *gorm.DB
}

func NewDailyGoalService(db *gorm.DB) *DailyGoalService {
	return &DailyGoalService{db: db}
}

var ErrDailyGoalNotFound = errors.New("daily goal not found")

// SetDailyGoal sets or updates the hydration goal for a specific date.
func (s *DailyGoalService) SetDailyGoal(ctx context.Context, userID uuid.UUID, date string, goalMl float64) (*models.DailyGoal, error) {
	var dailyGoal models.DailyGoal

	// Try to find existing goal for this date
	err := s.db.Where("user_id = ? AND date = ?", userID, date).First(&dailyGoal).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new daily goal
			dailyGoal = models.DailyGoal{
				UserID: userID,
				Date:   date,
				GoalMl: goalMl,
			}
			if err := s.db.Create(&dailyGoal).Error; err != nil {
				return nil, err
			}
			return &dailyGoal, nil
		}
		return nil, err
	}

	// Update existing goal
	dailyGoal.GoalMl = goalMl
	dailyGoal.UpdatedAt = time.Now()
	if err := s.db.Save(&dailyGoal).Error; err != nil {
		return nil, err
	}

	return &dailyGoal, nil
}

// GetDailyGoal retrieves the goal for a specific date.
// If no specific goal is set, returns the user's default daily goal.
func (s *DailyGoalService) GetDailyGoal(ctx context.Context, userID uuid.UUID, date string) (float64, error) {
	var dailyGoal models.DailyGoal

	err := s.db.Where("user_id = ? AND date = ?", userID, date).First(&dailyGoal).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// No specific goal set, return user's default goal
			var user models.User
			if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
				return 0, err
			}
			goalMl := user.DailyGoalLiters * 1000
			if goalMl == 0 {
				goalMl = 2000 // Default fallback
			}
			return goalMl, nil
		}
		return 0, err
	}

	return dailyGoal.GoalMl, nil
}

// GetDailyGoals retrieves goals for a date range.
func (s *DailyGoalService) GetDailyGoals(ctx context.Context, userID uuid.UUID, startDate, endDate string) (map[string]float64, error) {
	var dailyGoals []models.DailyGoal

	err := s.db.Where("user_id = ? AND date >= ? AND date <= ?", userID, startDate, endDate).Find(&dailyGoals).Error
	if err != nil {
		return nil, err
	}

	goals := make(map[string]float64)
	for _, goal := range dailyGoals {
		goals[goal.Date] = goal.GoalMl
	}

	return goals, nil
}

// DeleteDailyGoal removes a specific daily goal.
func (s *DailyGoalService) DeleteDailyGoal(ctx context.Context, userID uuid.UUID, date string) error {
	result := s.db.Where("user_id = ? AND date = ?", userID, date).Delete(&models.DailyGoal{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrDailyGoalNotFound
	}
	return nil
}
