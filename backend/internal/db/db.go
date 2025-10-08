package db

import (
	"database/sql"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/config"
	"github.com/AD-Archer/archer-aqua/backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg config.Config, appLogger *slog.Logger) (*gorm.DB, error) {
	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("database url must be provided")
	}

	gormLogger := logger.Default.LogMode(logger.Warn)

	database, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		Logger:          gormLogger,
		PrepareStmt:     true,
		CreateBatchSize: 100,
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := database.DB()
	if err != nil {
		return nil, fmt.Errorf("retrieve sql db: %w", err)
	}

	configureConnectionPool(sqlDB)

	// Set timezone using raw SQL instead of prepared statement
	query := fmt.Sprintf("SET TIME ZONE '%s'", cfg.DatabaseTimeZone)
	if err := database.Exec(query).Error; err != nil {
		appLogger.Warn("failed to set session time zone", slog.Any("error", err))
	}

	if err := migrate(database); err != nil {
		return nil, fmt.Errorf("migrate database: %w", err)
	}

	return database, nil
}

func migrate(database *gorm.DB) error {
	// Run AutoMigrate and handle column already exists errors gracefully
	err := database.AutoMigrate(
		&models.User{},
		&models.Drink{},
		&models.HydrationLog{},
		&models.DailyGoal{},
		&models.WeatherData{},
	)

	// If the error is about columns already existing, we can ignore it
	// This happens during development when the schema has been partially migrated
	if err != nil && !isColumnExistsError(err) {
		return err
	}

	return nil
}

// isColumnExistsError checks if the error is about a column already existing
func isColumnExistsError(err error) bool {
	errStr := err.Error()
	return strings.Contains(errStr, "already exists") ||
		strings.Contains(errStr, "SQLSTATE 42701")
}

func configureConnectionPool(sqlDB *sql.DB) {
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(1 * time.Hour)
	sqlDB.SetConnMaxIdleTime(30 * time.Minute)
}
