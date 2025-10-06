package handlers

import (
	"log/slog"

	"github.com/AD-Archer/archer-aqua/backend/internal/services"
)

type API struct {
	users     *services.UserService
	drinks    *services.DrinkService
	hydration *services.HydrationService
	auth      *services.AuthService
	weather   *services.WeatherService
	logger    *slog.Logger
}

func NewAPI(userService *services.UserService, drinkService *services.DrinkService, hydrationService *services.HydrationService, authService *services.AuthService, weatherService *services.WeatherService, logger *slog.Logger) *API {
	return &API{
		users:     userService,
		drinks:    drinkService,
		hydration: hydrationService,
		auth:      authService,
		weather:   weatherService,
		logger:    logger,
	}
}
