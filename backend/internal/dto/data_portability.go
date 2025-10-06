package dto

import (
	"time"

	"github.com/google/uuid"
)

type UserDataExport struct {
	User            UserResponse           `json:"user"`
	Drinks          []DrinkResponse        `json:"drinks"`
	HydrationLogs   []HydrationLogResponse `json:"hydrationLogs"`
	ExportedAt      time.Time              `json:"exportedAt"`
	PoliciesVersion string                 `json:"policiesVersion"`
}

type DrinkImport struct {
	ID                  uuid.UUID  `json:"id"`
	Name                string     `json:"name"`
	Type                string     `json:"type"`
	HydrationMultiplier float64    `json:"hydrationMultiplier"`
	DefaultVolumeMl     *float64   `json:"defaultVolumeMl"`
	ColorHex            *string    `json:"colorHex"`
	Source              string     `json:"source"`
	ArchivedAt          *time.Time `json:"archivedAt"`
	CreatedAt           *time.Time `json:"createdAt"`
	UpdatedAt           *time.Time `json:"updatedAt"`
}

type HydrationLogImport struct {
	ID                  uuid.UUID  `json:"id"`
	DrinkID             *uuid.UUID `json:"drinkId"`
	Label               string     `json:"label"`
	VolumeMl            float64    `json:"volumeMl"`
	HydrationMultiplier float64    `json:"hydrationMultiplier"`
	EffectiveMl         float64    `json:"effectiveMl"`
	ConsumedAt          time.Time  `json:"consumedAt"`
	ConsumedAtLocal     time.Time  `json:"consumedAtLocal"`
	Timezone            string     `json:"timezone"`
	DailyKey            string     `json:"dailyKey"`
	Source              string     `json:"source"`
	Notes               *string    `json:"notes"`
}

type UserDataImportRequest struct {
	Drinks          []DrinkImport        `json:"drinks"`
	HydrationLogs   []HydrationLogImport `json:"hydrationLogs"`
	ReplaceExisting *bool                `json:"replaceExisting"`
}
