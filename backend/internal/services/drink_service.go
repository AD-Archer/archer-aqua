package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/dto"
	"github.com/AD-Archer/archer-aqua/backend/internal/models"
	"github.com/AD-Archer/archer-aqua/backend/internal/utils"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DrinkService struct {
	db *gorm.DB
}

func NewDrinkService(db *gorm.DB) *DrinkService {
	return &DrinkService{db: db}
}

func (s *DrinkService) ListDrinks(ctx context.Context, userID uuid.UUID) ([]models.Drink, error) {
	var drinks []models.Drink
	if err := s.db.WithContext(ctx).
		Where("user_id IS NULL OR user_id = ?", userID).
		Order("archived_at IS NULL DESC, name ASC").
		Find(&drinks).Error; err != nil {
		return nil, fmt.Errorf("list drinks: %w", err)
	}
	return drinks, nil
}

func (s *DrinkService) CreateDrink(ctx context.Context, userID uuid.UUID, input dto.CreateDrinkRequest) (*models.Drink, error) {
	if strings.TrimSpace(input.Name) == "" {
		return nil, fmt.Errorf("name is required")
	}

	var defaultVolumeMl *float64
	if input.DefaultVolume != nil {
		volumeMl, err := utils.ConvertVolumeToMl(input.DefaultVolume.Value, input.DefaultVolume.Unit)
		if err != nil {
			return nil, err
		}
		defaultVolumeMl = &volumeMl
	}

	drink := models.Drink{
		UserID:              &userID,
		Name:                strings.TrimSpace(input.Name),
		Type:                defaultString(input.Type, "beverage"),
		HydrationMultiplier: input.HydrationMultiplier,
		DefaultVolumeMl:     defaultVolumeMl,
		ColorHex:            input.ColorHex,
		Source:              defaultString(input.Source, "custom"),
	}

	if drink.HydrationMultiplier <= 0 {
		drink.HydrationMultiplier = 1.0
	}

	if err := s.db.WithContext(ctx).Create(&drink).Error; err != nil {
		return nil, fmt.Errorf("create drink: %w", err)
	}

	return &drink, nil
}

func (s *DrinkService) UpdateDrink(ctx context.Context, userID, drinkID uuid.UUID, input dto.UpdateDrinkRequest) (*models.Drink, error) {
	drink, err := s.getOwnedDrink(ctx, userID, drinkID)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		drink.Name = strings.TrimSpace(*input.Name)
	}
	if input.Type != nil {
		drink.Type = *input.Type
	}
	if input.HydrationMultiplier != nil && *input.HydrationMultiplier > 0 {
		drink.HydrationMultiplier = *input.HydrationMultiplier
	}
	if input.DefaultVolume != nil {
		volumeMl, err := utils.ConvertVolumeToMl(input.DefaultVolume.Value, input.DefaultVolume.Unit)
		if err != nil {
			return nil, err
		}
		drink.DefaultVolumeMl = &volumeMl
	}
	if input.ColorHex != nil {
		if strings.TrimSpace(*input.ColorHex) == "" {
			drink.ColorHex = nil
		} else {
			drink.ColorHex = input.ColorHex
		}
	}
	if input.Archived != nil {
		if *input.Archived {
			now := time.Now().UTC()
			drink.ArchivedAt = &now
		} else {
			drink.ArchivedAt = nil
		}
	}

	if err := s.db.WithContext(ctx).Save(drink).Error; err != nil {
		return nil, fmt.Errorf("update drink: %w", err)
	}

	return drink, nil
}

func (s *DrinkService) DeleteDrink(ctx context.Context, userID, drinkID uuid.UUID) error {
	// First check if the drink exists and belongs to the user
	drink, err := s.getOwnedDrink(ctx, userID, drinkID)
	if err != nil {
		return err
	}

	// Check if the drink is being used in any hydration logs
	var logCount int64
	if err := s.db.WithContext(ctx).Model(&models.HydrationLog{}).
		Where("drink_id = ?", drinkID).
		Count(&logCount).Error; err != nil {
		return fmt.Errorf("check drink usage: %w", err)
	}

	// If the drink has been used in logs, archive it instead of deleting
	if logCount > 0 {
		now := time.Now().UTC()
		drink.ArchivedAt = &now
		if err := s.db.WithContext(ctx).Save(drink).Error; err != nil {
			return fmt.Errorf("archive drink: %w", err)
		}
		return nil
	}

	// If no logs exist, we can safely delete the drink
	if err := s.db.WithContext(ctx).Delete(drink).Error; err != nil {
		return fmt.Errorf("delete drink: %w", err)
	}

	return nil
}

func (s *DrinkService) getOwnedDrink(ctx context.Context, userID, drinkID uuid.UUID) (*models.Drink, error) {
	var drink models.Drink
	if err := s.db.WithContext(ctx).First(&drink, "id = ? AND user_id = ?", drinkID, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("drink not found")
		}
		return nil, fmt.Errorf("fetch drink: %w", err)
	}
	return &drink, nil
}
