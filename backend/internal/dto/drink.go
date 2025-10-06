package dto

import (
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/models"
	"github.com/google/uuid"
)

type VolumePayload struct {
	Value float64 `json:"value"`
	Unit  string  `json:"unit"`
}

type CreateDrinkRequest struct {
	Name                string         `json:"name"`
	Type                string         `json:"type"`
	HydrationMultiplier float64        `json:"hydrationMultiplier"`
	DefaultVolume       *VolumePayload `json:"defaultVolume"`
	ColorHex            *string        `json:"colorHex"`
	Source              string         `json:"source"`
}

type UpdateDrinkRequest struct {
	Name                *string        `json:"name"`
	Type                *string        `json:"type"`
	HydrationMultiplier *float64       `json:"hydrationMultiplier"`
	DefaultVolume       *VolumePayload `json:"defaultVolume"`
	ColorHex            *string        `json:"colorHex"`
	Archived            *bool          `json:"archived"`
}

type DrinkResponse struct {
	ID                  uuid.UUID  `json:"id"`
	UserID              *uuid.UUID `json:"userId"`
	Name                string     `json:"name"`
	Type                string     `json:"type"`
	HydrationMultiplier float64    `json:"hydrationMultiplier"`
	DefaultVolumeMl     *float64   `json:"defaultVolumeMl"`
	ColorHex            *string    `json:"colorHex"`
	Source              string     `json:"source"`
	ArchivedAt          *time.Time `json:"archivedAt"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

func NewDrinkResponse(drink models.Drink) DrinkResponse {
	return DrinkResponse{
		ID:                  drink.ID,
		UserID:              drink.UserID,
		Name:                drink.Name,
		Type:                drink.Type,
		HydrationMultiplier: drink.HydrationMultiplier,
		DefaultVolumeMl:     drink.DefaultVolumeMl,
		ColorHex:            drink.ColorHex,
		Source:              drink.Source,
		ArchivedAt:          drink.ArchivedAt,
		CreatedAt:           drink.CreatedAt,
		UpdatedAt:           drink.UpdatedAt,
	}
}
