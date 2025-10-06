package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/AD-Archer/archer-aqua/backend/internal/dto"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func (api *API) CreateUser(w http.ResponseWriter, r *http.Request) {
	var request dto.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	claims, ok := api.auth.ClaimsFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	request.Email = claims.Email
	if strings.TrimSpace(request.DisplayName) == "" {
		parts := strings.Split(claims.Email, "@")
		if len(parts) > 0 {
			request.DisplayName = parts[0]
		} else {
			request.DisplayName = claims.Email
		}
	}

	user, err := api.users.CreateUser(r.Context(), request)
	if err != nil {
		logError(api.logger, "create user", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	drinks, err := api.drinks.ListDrinks(r.Context(), user.ID)
	if err != nil {
		logError(api.logger, "list drinks", err)
		respondError(w, http.StatusInternalServerError, "failed to load drinks")
		return
	}

	drinkResponses := make([]dto.DrinkResponse, 0, len(drinks))
	for _, drink := range drinks {
		drinkResponses = append(drinkResponses, dto.NewDrinkResponse(drink))
	}

	respondJSON(w, http.StatusCreated, dto.UserSummaryResponse{
		User:   dto.NewUserResponse(*user),
		Drinks: drinkResponses,
	})
}

func (api *API) GetUser(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	user, err := api.users.GetUser(r.Context(), userID)
	if err != nil {
		logError(api.logger, "get user", err)
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	drinks, err := api.drinks.ListDrinks(r.Context(), user.ID)
	if err != nil {
		logError(api.logger, "list drinks", err)
		respondError(w, http.StatusInternalServerError, "failed to load drinks")
		return
	}

	drinkResponses := make([]dto.DrinkResponse, 0, len(drinks))
	for _, drink := range drinks {
		drinkResponses = append(drinkResponses, dto.NewDrinkResponse(drink))
	}

	respondJSON(w, http.StatusOK, dto.UserSummaryResponse{
		User:   dto.NewUserResponse(*user),
		Drinks: drinkResponses,
	})
}

func (api *API) UpdateUser(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	var request dto.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	user, err := api.users.UpdateUser(r.Context(), userID, request)
	if err != nil {
		logError(api.logger, "update user", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, dto.NewUserResponse(*user))
}

func parseUUIDParam(r *http.Request, key string) (uuid.UUID, error) {
	value := chi.URLParam(r, key)
	return uuid.Parse(value)
}
