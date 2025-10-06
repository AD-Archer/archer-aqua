package models

import (
	"time"

	"github.com/google/uuid"
)

// WeatherData stores cached weather information for user locations
type WeatherData struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
	UserID        uuid.UUID `gorm:"type:uuid;index"`
	Latitude      float64
	Longitude     float64
	Temperature   float64
	Humidity      float64
	Condition     string `gorm:"size:128"`
	WindSpeed     float64
	WindDirection float64
	Pressure      float64
	Visibility    float64
	UVIndex       float64
	FeelsLike     float64
	Source        string `gorm:"size:64"`  // e.g., "openweather", "weatherapi"
	SourceDataID  string `gorm:"size:128"` // external API's data identifier
	FetchedAt     time.Time
	ExpiresAt     time.Time
	RefreshCount  int  `gorm:"default:0"` // Track number of times this data was refreshed
	User          User `gorm:"constraint:OnDelete:CASCADE"`
}
