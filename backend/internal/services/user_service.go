package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/dto"
	"github.com/AD-Archer/archer-aqua/backend/internal/models"
	"github.com/AD-Archer/archer-aqua/backend/internal/utils"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserService manages hydration user profiles.
type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

func (s *UserService) GetUser(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found: %w", err)
		}
		return nil, fmt.Errorf("fetch user: %w", err)
	}
	return &user, nil
}

func (s *UserService) CreateUser(ctx context.Context, input dto.CreateUserRequest) (*models.User, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if email == "" {
		return nil, fmt.Errorf("email is required")
	}

	weightKg, err := utils.ConvertWeightToKg(input.Weight.Value, input.Weight.Unit)
	if err != nil {
		return nil, err
	}

	loc, err := utils.LoadLocation(input.Timezone)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	dailyGoal := CalculateDailyGoalLiters(weightKg, input.ActivityLevel, input.Gender)
	if input.CustomGoalLiters != nil && *input.CustomGoalLiters > 0 {
		dailyGoal = *input.CustomGoalLiters
	}

	var user models.User
	result := s.db.WithContext(ctx).Where("email = ?", email).First(&user)
	if result.Error != nil {
		if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("fetch user: %w", result.Error)
		}
		user = models.User{Email: email}
	}

	user.DisplayName = defaultString(input.DisplayName, user.DisplayName)
	user.WeightKg = weightKg
	user.WeightUnit = defaultString(input.Weight.Unit, "kg")
	user.Age = input.Age
	user.Gender = input.Gender
	user.ActivityLevel = input.ActivityLevel
	user.Timezone = loc.String()
	user.TimezoneLastConfirmedAt = &now
	user.LocationCity = input.Location.City
	user.LocationRegion = input.Location.Region
	user.LocationCountry = input.Location.Country
	user.LocationLatitude = input.Location.Latitude
	user.LocationLongitude = input.Location.Longitude
	user.DailyGoalLiters = dailyGoal
	user.CustomGoalLiters = input.CustomGoalLiters
	user.VolumeUnit = defaultString(input.VolumeUnit, "ml")
	user.TemperatureUnit = defaultString(input.TemperatureUnit, "c")
	user.ProgressWheelStyle = defaultString(input.ProgressWheelStyle, defaultString(user.ProgressWheelStyle, "drink_colors"))
	user.WeatherAdjustmentsEnabled = input.WeatherAdjustmentsEnabled

	if err := s.db.WithContext(ctx).Save(&user).Error; err != nil {
		return nil, fmt.Errorf("save user: %w", err)
	}

	return &user, nil
}

func (s *UserService) UpdateUser(ctx context.Context, userID uuid.UUID, input dto.UpdateUserRequest) (*models.User, error) {
	user, err := s.GetUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	if input.DisplayName != nil {
		user.DisplayName = *input.DisplayName
	}
	if input.Weight != nil {
		weightKg, err := utils.ConvertWeightToKg(input.Weight.Value, input.Weight.Unit)
		if err != nil {
			return nil, err
		}
		user.WeightKg = weightKg
		user.WeightUnit = input.Weight.Unit
	}
	if input.Age != nil {
		user.Age = *input.Age
	}
	if input.Gender != nil {
		user.Gender = *input.Gender
	}
	if input.ActivityLevel != nil {
		user.ActivityLevel = *input.ActivityLevel
	}
	if input.Timezone != nil {
		loc, err := utils.LoadLocation(*input.Timezone)
		if err != nil {
			return nil, err
		}
		user.Timezone = loc.String()
		now := time.Now().UTC()
		user.TimezoneLastConfirmedAt = &now
	}
	if input.Location != nil {
		user.LocationCity = input.Location.City
		user.LocationRegion = input.Location.Region
		user.LocationCountry = input.Location.Country
		user.LocationLatitude = input.Location.Latitude
		user.LocationLongitude = input.Location.Longitude
	}
	if input.VolumeUnit != nil {
		user.VolumeUnit = *input.VolumeUnit
	}
	if input.TemperatureUnit != nil {
		user.TemperatureUnit = *input.TemperatureUnit
	}
	if input.ProgressWheelStyle != nil {
		user.ProgressWheelStyle = *input.ProgressWheelStyle
	}
	if input.WeatherAdjustmentsEnabled != nil {
		user.WeatherAdjustmentsEnabled = *input.WeatherAdjustmentsEnabled
	}
	if input.CustomGoalLiters != nil {
		user.CustomGoalLiters = input.CustomGoalLiters
	}

	user.DailyGoalLiters = CalculateDailyGoalLiters(user.WeightKg, user.ActivityLevel, user.Gender)
	if user.CustomGoalLiters != nil && *user.CustomGoalLiters > 0 {
		user.DailyGoalLiters = *user.CustomGoalLiters
	}

	if err := s.db.WithContext(ctx).Save(user).Error; err != nil {
		return nil, fmt.Errorf("update user: %w", err)
	}

	return user, nil
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
