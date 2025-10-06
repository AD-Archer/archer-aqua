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
	Email                     string `gorm:"uniqueIndex"`
	DisplayName               string
	WeightKg                  float64
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
