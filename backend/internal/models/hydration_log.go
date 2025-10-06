package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// HydrationLog tracks individual drink consumption events.
// Volume and hydration adjustments are stored in milliliters to preserve precision regardless of display units.
// ConsumedAt stores UTC timestamp; ConsumedAtLocal captures local time with timezone name for display.
// DailyKey is a YYYY-MM-DD string specific to the user's timezone to simplify daily aggregations.
type HydrationLog struct {
	ID                  uuid.UUID `gorm:"type:uuid;primaryKey"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
	UserID              uuid.UUID  `gorm:"type:uuid;index"`
	DrinkID             *uuid.UUID `gorm:"type:uuid;index"`
	Label               string     `gorm:"size:128"`
	VolumeMl            float64
	HydrationMultiplier float64 `gorm:"default:1.0"`
	EffectiveMl         float64
	ConsumedAt          time.Time `gorm:"index"`
	ConsumedAtLocal     time.Time
	Timezone            string `gorm:"size:128"`
	DailyKey            string `gorm:"size:16;index"`
	Source              string `gorm:"size:32;default:'manual'"`
	Notes               *string
	Metadata            datatypes.JSONMap `gorm:"type:jsonb"`
}

// BeforeCreate ensures UUIDs are set.
func (h *HydrationLog) BeforeCreate(tx *gorm.DB) error {
	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	return nil
}
