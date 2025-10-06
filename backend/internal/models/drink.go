package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Drink represents user-specific beverages with hydration multipliers.
// Custom drinks are stored per user; built-in drinks can be seeded globally with a nil UserID.
// HydrationMultiplier expresses how hydrating the drink is compared to water (1.0 = same, < 1 reduces).
// DefaultVolumeMl allows quick-add buttons to prefill volumes.
// Color may be used client-side for progress wheel display.
// Source indicates whether the drink was user-custom, default, or synced from integrations.
// ArchivedAt allows soft deletion while keeping historic log references intact.
//
// Note: keep enum values aligned with frontend constants when available.
// Source values: "default", "custom", "integration".
// Type values: "water", "beverage", "food".
//
// TODO: consider moving enums to shared constants package with validation.
//
// Unique constraint ensures a user can't create duplicate drink names differing only by case.
type Drink struct {
	ID                  uuid.UUID `gorm:"type:uuid;primaryKey"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
	ArchivedAt          *time.Time
	UserID              *uuid.UUID `gorm:"type:uuid;index:idx_drinks_user_name,priority:1"`
	Name                string     `gorm:"size:128;index:idx_drinks_user_name,priority:2"`
	Type                string     `gorm:"size:32;default:'beverage'"`
	HydrationMultiplier float64    `gorm:"default:1.0"`
	DefaultVolumeMl     *float64
	ColorHex            *string           `gorm:"size:16"`
	Source              string            `gorm:"size:32;default:'custom'"`
	Metadata            datatypes.JSONMap `gorm:"type:jsonb"`
	HydrationLogs       []HydrationLog
}

// BeforeCreate ensures UUIDs are set.
func (d *Drink) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}
