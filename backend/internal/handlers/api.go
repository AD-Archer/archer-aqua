package handlers

import (
	"log/slog"

	"github.com/AD-Archer/archer-aqua/backend/internal/services"
)

type API struct {
	users     *services.UserService
	drinks    *services.DrinkService
	hydration *services.HydrationService
	logger    *slog.Logger
}

func NewAPI(userService *services.UserService, drinkService *services.DrinkService, hydrationService *services.HydrationService, logger *slog.Logger) *API {
	return &API{
		users:     userService,
		drinks:    drinkService,
		hydration: hydrationService,
		logger:    logger,
	}
}
