package dto

import (
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/models"
	"github.com/google/uuid"
)

type WeatherResponse struct {
	ID            uuid.UUID `json:"id"`
	Latitude      float64   `json:"latitude"`
	Longitude     float64   `json:"longitude"`
	Temperature   float64   `json:"temperature"`
	Humidity      float64   `json:"humidity"`
	Condition     string    `json:"condition"`
	WindSpeed     float64   `json:"windSpeed"`
	WindDirection float64   `json:"windDirection"`
	Pressure      float64   `json:"pressure"`
	Visibility    float64   `json:"visibility"`
	UVIndex       float64   `json:"uvIndex"`
	FeelsLike     float64   `json:"feelsLike"`
	Source        string    `json:"source"`
	FetchedAt     time.Time `json:"fetchedAt"`
	ExpiresAt     time.Time `json:"expiresAt"`
	RefreshCount  int       `json:"refreshCount"`
}

type CreateWeatherRequest struct {
	Latitude      float64 `json:"latitude"`
	Longitude     float64 `json:"longitude"`
	Temperature   float64 `json:"temperature"`
	Humidity      float64 `json:"humidity"`
	Condition     string  `json:"condition"`
	WindSpeed     float64 `json:"windSpeed"`
	WindDirection float64 `json:"windDirection"`
	Pressure      float64 `json:"pressure"`
	Visibility    float64 `json:"visibility"`
	UVIndex       float64 `json:"uvIndex"`
	FeelsLike     float64 `json:"feelsLike"`
	Source        string  `json:"source"`
	SourceDataID  string  `json:"sourceDataId"`
}

func NewWeatherResponse(weather models.WeatherData) WeatherResponse {
	return WeatherResponse{
		ID:            weather.ID,
		Latitude:      weather.Latitude,
		Longitude:     weather.Longitude,
		Temperature:   weather.Temperature,
		Humidity:      weather.Humidity,
		Condition:     weather.Condition,
		WindSpeed:     weather.WindSpeed,
		WindDirection: weather.WindDirection,
		Pressure:      weather.Pressure,
		Visibility:    weather.Visibility,
		UVIndex:       weather.UVIndex,
		FeelsLike:     weather.FeelsLike,
		Source:        weather.Source,
		FetchedAt:     weather.FetchedAt,
		ExpiresAt:     weather.ExpiresAt,
		RefreshCount:  weather.RefreshCount,
	}
}
