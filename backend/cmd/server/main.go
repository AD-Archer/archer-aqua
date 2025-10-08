package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/config"
	"github.com/AD-Archer/archer-aqua/backend/internal/db"
	"github.com/AD-Archer/archer-aqua/backend/internal/server"
	"github.com/joho/godotenv"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	if err := godotenv.Load("../.env"); err != nil {
		logger.Info("skipping .env file load", slog.Any("error", err))
	}

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", slog.Any("error", err))
		os.Exit(1)
	}

	dbConn, err := db.Connect(cfg, logger)
	if err != nil {
		logger.Error("failed to connect to database", slog.Any("error", err))
		os.Exit(1)
	}

	srv := server.New(cfg, dbConn, logger)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		if err := srv.Run(); err != nil {
			logger.Error("server encountered an error", slog.Any("error", err))
			stop()
		}
	}()

	<-ctx.Done()
	logger.Info("shutdown signal received")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("failed to gracefully shutdown server", slog.Any("error", err))
		os.Exit(1)
	}

	logger.Info("server shut down gracefully")
}
