package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/AD-Archer/archer-aqua/backend/internal/dto"
)

func (api *API) ListDrinks(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	drinks, err := api.drinks.ListDrinks(r.Context(), userID)
	if err != nil {
		logError(api.logger, "list drinks", err)
		respondError(w, http.StatusInternalServerError, "failed to load drinks")
		return
	}

	responses := make([]dto.DrinkResponse, 0, len(drinks))
	for _, drink := range drinks {
		responses = append(responses, dto.NewDrinkResponse(drink))
	}

	respondJSON(w, http.StatusOK, responses)
}

func (api *API) CreateDrink(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	var request dto.CreateDrinkRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	drink, err := api.drinks.CreateDrink(r.Context(), userID, request)
	if err != nil {
		logError(api.logger, "create drink", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, dto.NewDrinkResponse(*drink))
}

func (api *API) UpdateDrink(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	drinkID, err := parseUUIDParam(r, "drinkID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid drink id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	var request dto.UpdateDrinkRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	drink, err := api.drinks.UpdateDrink(r.Context(), userID, drinkID, request)
	if err != nil {
		logError(api.logger, "update drink", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, dto.NewDrinkResponse(*drink))
}
