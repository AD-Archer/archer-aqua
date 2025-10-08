package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DailyGoal tracks the hydration goal for a specific day.
// This allows users to set different goals for different days,
// and historical data will reflect the goal that was set for that day.
type DailyGoal struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	CreatedAt time.Time
	UpdatedAt time.Time
	UserID    uuid.UUID `gorm:"type:uuid;index"`
	Date      string    `gorm:"size:16;index"` // YYYY-MM-DD format
	GoalMl    float64   // Goal in milliliters
}

// BeforeCreate ensures UUIDs are set.
func (d *DailyGoal) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}
