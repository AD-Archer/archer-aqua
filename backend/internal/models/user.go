package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User captures hydration profile, preferences, and personalization attributes for goal calculations.
type User struct {
	ID                        uuid.UUID `gorm:"type:uuid;primaryKey"`
	CreatedAt                 time.Time
	UpdatedAt                 time.Time
	Email                     string  `gorm:"uniqueIndex"`
	EmailVerified             bool    `gorm:"default:false"`
	EmailVerificationToken    *string `gorm:"size:255"`
	EmailVerificationExpiry   *time.Time
	DisplayName               string
	PasswordHash              *string `gorm:"size:255"`
	GoogleSubject             *string `gorm:"size:255;uniqueIndex"`
	TwoFactorEnabled          bool    `gorm:"default:false"`
	TwoFactorSecret           *string `gorm:"size:255"`
	TwoFactorBackupCodes      *string `gorm:"type:text"` // JSON array of backup codes
	PasswordResetToken        *string `gorm:"size:255"`
	PasswordResetExpiry       *time.Time
	WeightKg                  float64
	WeightUnit                string `gorm:"size:32"`
	Age                       int
	Gender                    string `gorm:"size:32"`
	ActivityLevel             string `gorm:"size:64"`
	Timezone                  string `gorm:"size:128"`
	LocationCity              string `gorm:"size:128"`
	LocationRegion            string `gorm:"size:128"`
	LocationCountry           string `gorm:"size:128"`
	LocationLatitude          *float64
	LocationLongitude         *float64
	DailyGoalLiters           float64
	CustomGoalLiters          *float64
	VolumeUnit                string `gorm:"size:32"`
	TemperatureUnit           string `gorm:"size:32"`
	ProgressWheelStyle        string `gorm:"size:64"`
	WeatherAdjustmentsEnabled bool
	TimezoneLastConfirmedAt   *time.Time
	LastLoginAt               *time.Time
	LoginAttempts             int `gorm:"default:0"`
	LockedUntil               *time.Time
	PoliciesAcceptedVersion   *string `gorm:"size:64"`
	PoliciesAcceptedAt        *time.Time
	Drinks                    []Drink        `gorm:"constraint:OnDelete:CASCADE"`
	HydrationLogs             []HydrationLog `gorm:"constraint:OnDelete:CASCADE"`
}

// BeforeCreate ensures UUIDs are set before persisting records.
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}
