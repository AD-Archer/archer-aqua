package dto

import (
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/models"
	"github.com/google/uuid"
)

type WeightPayload struct {
	Value float64 `json:"value"`
	Unit  string  `json:"unit"`
}

type LocationPayload struct {
	City      string   `json:"city"`
	Region    string   `json:"region"`
	Country   string   `json:"country"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
}

type CreateUserRequest struct {
	Email                     string          `json:"email"`
	DisplayName               string          `json:"displayName"`
	Weight                    WeightPayload   `json:"weight"`
	Age                       int             `json:"age"`
	Gender                    string          `json:"gender"`
	ActivityLevel             string          `json:"activityLevel"`
	Timezone                  string          `json:"timezone"`
	Location                  LocationPayload `json:"location"`
	VolumeUnit                string          `json:"volumeUnit"`
	TemperatureUnit           string          `json:"temperatureUnit"`
	ProgressWheelStyle        string          `json:"progressWheelStyle"`
	WeatherAdjustmentsEnabled bool            `json:"weatherAdjustmentsEnabled"`
	CustomGoalLiters          *float64        `json:"customGoalLiters"`
}

type UpdateUserRequest struct {
	DisplayName               *string          `json:"displayName"`
	Weight                    *WeightPayload   `json:"weight"`
	Age                       *int             `json:"age"`
	Gender                    *string          `json:"gender"`
	ActivityLevel             *string          `json:"activityLevel"`
	Timezone                  *string          `json:"timezone"`
	Location                  *LocationPayload `json:"location"`
	VolumeUnit                *string          `json:"volumeUnit"`
	TemperatureUnit           *string          `json:"temperatureUnit"`
	ProgressWheelStyle        *string          `json:"progressWheelStyle"`
	WeatherAdjustmentsEnabled *bool            `json:"weatherAdjustmentsEnabled"`
	CustomGoalLiters          *float64         `json:"customGoalLiters"`
}

type UserResponse struct {
	ID                        uuid.UUID       `json:"id"`
	Email                     string          `json:"email"`
	DisplayName               string          `json:"displayName"`
	WeightKg                  float64         `json:"weightKg"`
	Age                       int             `json:"age"`
	Gender                    string          `json:"gender"`
	ActivityLevel             string          `json:"activityLevel"`
	Timezone                  string          `json:"timezone"`
	Location                  LocationPayload `json:"location"`
	DailyGoalLiters           float64         `json:"dailyGoalLiters"`
	CustomGoalLiters          *float64        `json:"customGoalLiters"`
	VolumeUnit                string          `json:"volumeUnit"`
	TemperatureUnit           string          `json:"temperatureUnit"`
	ProgressWheelStyle        string          `json:"progressWheelStyle"`
	WeatherAdjustmentsEnabled bool            `json:"weatherAdjustmentsEnabled"`
	CreatedAt                 time.Time       `json:"createdAt"`
	UpdatedAt                 time.Time       `json:"updatedAt"`
}

type UserSummaryResponse struct {
	User   UserResponse    `json:"user"`
	Drinks []DrinkResponse `json:"drinks"`
}

func NewUserResponse(user models.User) UserResponse {
	return UserResponse{
		ID:            user.ID,
		Email:         user.Email,
		DisplayName:   user.DisplayName,
		WeightKg:      user.WeightKg,
		Age:           user.Age,
		Gender:        user.Gender,
		ActivityLevel: user.ActivityLevel,
		Timezone:      user.Timezone,
		Location: LocationPayload{
			City:      user.LocationCity,
			Region:    user.LocationRegion,
			Country:   user.LocationCountry,
			Latitude:  user.LocationLatitude,
			Longitude: user.LocationLongitude,
		},
		DailyGoalLiters:           user.DailyGoalLiters,
		CustomGoalLiters:          user.CustomGoalLiters,
		VolumeUnit:                user.VolumeUnit,
		TemperatureUnit:           user.TemperatureUnit,
		ProgressWheelStyle:        user.ProgressWheelStyle,
		WeatherAdjustmentsEnabled: user.WeatherAdjustmentsEnabled,
		CreatedAt:                 user.CreatedAt,
		UpdatedAt:                 user.UpdatedAt,
	}
}
