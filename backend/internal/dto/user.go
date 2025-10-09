package dto

import (
	"strings"
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/models"
	"github.com/AD-Archer/archer-aqua/backend/internal/utils"
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
	Email                     *string          `json:"email"`
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
	EmailVerified             bool            `json:"emailVerified"`
	DisplayName               string          `json:"displayName"`
	HasPassword               bool            `json:"hasPassword"`
	IsGoogleUser              bool            `json:"isGoogleUser"`
	TwoFactorEnabled          bool            `json:"twoFactorEnabled"`
	WeightKg                  float64         `json:"weight"`
	WeightUnit                string          `json:"weightUnit"`
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
	LastLoginAt               *time.Time      `json:"lastLoginAt"`
	CreatedAt                 time.Time       `json:"createdAt"`
	UpdatedAt                 time.Time       `json:"updatedAt"`
	PrivacyAcceptedVersion    *string         `json:"privacyAcceptedVersion"`
	PrivacyAcceptedAt         *time.Time      `json:"privacyAcceptedAt"`
	TermsAcceptedVersion      *string         `json:"termsAcceptedVersion"`
	TermsAcceptedAt           *time.Time      `json:"termsAcceptedAt"`
	PrivacyCurrentVersion     string          `json:"privacyCurrentVersion"`
	TermsCurrentVersion       string          `json:"termsCurrentVersion"`
	RequiresPrivacyAcceptance bool            `json:"requiresPrivacyAcceptance"`
	RequiresTermsAcceptance   bool            `json:"requiresTermsAcceptance"`
	PoliciesAcceptedVersion   *string         `json:"policiesAcceptedVersion"`  // Backward compatibility
	PoliciesAcceptedAt        *time.Time      `json:"policiesAcceptedAt"`       // Backward compatibility
	PoliciesCurrentVersion    string          `json:"policiesCurrentVersion"`   // Backward compatibility
	RequiresPolicyAcceptance  bool            `json:"requiresPolicyAcceptance"` // Backward compatibility
}

type UserSummaryResponse struct {
	User   UserResponse    `json:"user"`
	Drinks []DrinkResponse `json:"drinks"`
}

func NewUserResponse(user models.User, currentPrivacyVersion, currentTermsVersion string) UserResponse {
	// Convert weight back to user's preferred unit, fallback to kg if conversion fails
	weightInPreferredUnit := user.WeightKg
	if user.WeightUnit != "" {
		if converted, err := utils.ConvertWeightFromKg(user.WeightKg, user.WeightUnit); err == nil {
			weightInPreferredUnit = converted
		}
	}

	return UserResponse{
		ID:               user.ID,
		Email:            user.Email,
		EmailVerified:    user.EmailVerified,
		DisplayName:      user.DisplayName,
		HasPassword:      user.PasswordHash != nil,
		IsGoogleUser:     user.GoogleSubject != nil,
		TwoFactorEnabled: user.TwoFactorEnabled,
		WeightKg:         weightInPreferredUnit,
		WeightUnit:       user.WeightUnit,
		Age:              user.Age,
		Gender:           user.Gender,
		ActivityLevel:    user.ActivityLevel,
		Timezone:         user.Timezone,
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
		LastLoginAt:               user.LastLoginAt,
		CreatedAt:                 user.CreatedAt,
		UpdatedAt:                 user.UpdatedAt,
		PrivacyAcceptedVersion:    user.PrivacyAcceptedVersion,
		PrivacyAcceptedAt:         user.PrivacyAcceptedAt,
		TermsAcceptedVersion:      user.TermsAcceptedVersion,
		TermsAcceptedAt:           user.TermsAcceptedAt,
		PrivacyCurrentVersion:     currentPrivacyVersion,
		TermsCurrentVersion:       currentTermsVersion,
		RequiresPrivacyAcceptance: strings.TrimSpace(currentPrivacyVersion) != "" && (user.PrivacyAcceptedVersion == nil || *user.PrivacyAcceptedVersion != currentPrivacyVersion),
		RequiresTermsAcceptance:   strings.TrimSpace(currentTermsVersion) != "" && (user.TermsAcceptedVersion == nil || *user.TermsAcceptedVersion != currentTermsVersion),
		PoliciesAcceptedVersion:   user.PrivacyAcceptedVersion,                                                                                                                                                                                                                                                                // Backward compatibility
		PoliciesAcceptedAt:        user.PrivacyAcceptedAt,                                                                                                                                                                                                                                                                     // Backward compatibility
		PoliciesCurrentVersion:    currentPrivacyVersion,                                                                                                                                                                                                                                                                      // Backward compatibility
		RequiresPolicyAcceptance:  strings.TrimSpace(currentPrivacyVersion) != "" && (user.PrivacyAcceptedVersion == nil || *user.PrivacyAcceptedVersion != currentPrivacyVersion) || strings.TrimSpace(currentTermsVersion) != "" && (user.TermsAcceptedVersion == nil || *user.TermsAcceptedVersion != currentTermsVersion), // Backward compatibility
	}
}
