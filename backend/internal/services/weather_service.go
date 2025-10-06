package services

import (
	"context"
	"fmt"
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/dto"
	"github.com/AD-Archer/archer-aqua/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WeatherService struct {
	db *gorm.DB
}

func NewWeatherService(db *gorm.DB) *WeatherService {
	return &WeatherService{db: db}
}

// GetCurrentWeather returns the latest cached weather data for a user's location
func (s *WeatherService) GetCurrentWeather(ctx context.Context, userID uuid.UUID, lat, lon float64) (*models.WeatherData, error) {
	var weather models.WeatherData

	// Look for recent weather data within 0.01 degrees (roughly 1km) of the requested location
	err := s.db.WithContext(ctx).
		Where("user_id = ? AND ABS(latitude - ?) < 0.01 AND ABS(longitude - ?) < 0.01 AND expires_at > ?",
			userID, lat, lon, time.Now()).
		Order("fetched_at DESC").
		First(&weather).Error

	if err != nil {
		return nil, err
	}

	return &weather, nil
}

// SaveWeatherData stores new weather data and increments refresh count if updating existing data
func (s *WeatherService) SaveWeatherData(ctx context.Context, userID uuid.UUID, request dto.CreateWeatherRequest) (*models.WeatherData, error) {
	now := time.Now()
	expiresAt := now.Add(30 * time.Minute) // Weather data expires after 30 minutes

	// Check if we already have recent data for this location
	var existingWeather models.WeatherData
	err := s.db.WithContext(ctx).
		Where("user_id = ? AND ABS(latitude - ?) < 0.001 AND ABS(longitude - ?) < 0.001",
			userID, request.Latitude, request.Longitude).
		Order("fetched_at DESC").
		First(&existingWeather).Error

	if err == nil {
		// Update existing weather data and increment refresh count
		existingWeather.Temperature = request.Temperature
		existingWeather.Humidity = request.Humidity
		existingWeather.Condition = request.Condition
		existingWeather.WindSpeed = request.WindSpeed
		existingWeather.WindDirection = request.WindDirection
		existingWeather.Pressure = request.Pressure
		existingWeather.Visibility = request.Visibility
		existingWeather.UVIndex = request.UVIndex
		existingWeather.FeelsLike = request.FeelsLike
		existingWeather.Source = request.Source
		existingWeather.SourceDataID = request.SourceDataID
		existingWeather.FetchedAt = now
		existingWeather.ExpiresAt = expiresAt
		existingWeather.RefreshCount++

		if err := s.db.WithContext(ctx).Save(&existingWeather).Error; err != nil {
			return nil, fmt.Errorf("update weather data: %w", err)
		}

		return &existingWeather, nil
	}

	// Create new weather data
	weather := models.WeatherData{
		ID:            uuid.New(),
		UserID:        userID,
		Latitude:      request.Latitude,
		Longitude:     request.Longitude,
		Temperature:   request.Temperature,
		Humidity:      request.Humidity,
		Condition:     request.Condition,
		WindSpeed:     request.WindSpeed,
		WindDirection: request.WindDirection,
		Pressure:      request.Pressure,
		Visibility:    request.Visibility,
		UVIndex:       request.UVIndex,
		FeelsLike:     request.FeelsLike,
		Source:        request.Source,
		SourceDataID:  request.SourceDataID,
		FetchedAt:     now,
		ExpiresAt:     expiresAt,
		RefreshCount:  1,
	}

	if err := s.db.WithContext(ctx).Create(&weather).Error; err != nil {
		return nil, fmt.Errorf("create weather data: %w", err)
	}

	return &weather, nil
}

// GetWeatherHistory returns historical weather data for a user
func (s *WeatherService) GetWeatherHistory(ctx context.Context, userID uuid.UUID, limit int) ([]models.WeatherData, error) {
	var weatherData []models.WeatherData

	query := s.db.WithContext(ctx).Where("user_id = ?", userID).Order("fetched_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}

	err := query.Find(&weatherData).Error
	if err != nil {
		return nil, fmt.Errorf("get weather history: %w", err)
	}

	return weatherData, nil
}

// CleanupExpiredWeather removes expired weather data
func (s *WeatherService) CleanupExpiredWeather(ctx context.Context) error {
	err := s.db.WithContext(ctx).Where("expires_at < ?", time.Now()).Delete(&models.WeatherData{}).Error
	if err != nil {
		return fmt.Errorf("cleanup expired weather: %w", err)
	}

	return nil
}
