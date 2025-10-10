package handlers

import (
	"bytes"
	"encoding/json"
	"log/slog"
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

	userResponse := dto.NewUserResponse(*user, api.auth.CurrentPrivacyVersion(), api.auth.CurrentTermsVersion())
	respondJSON(w, http.StatusCreated, dto.UserSummaryResponse{
		User:   userResponse,
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

	userResponse := dto.NewUserResponse(*user, api.auth.CurrentPrivacyVersion(), api.auth.CurrentTermsVersion())
	respondJSON(w, http.StatusOK, dto.UserSummaryResponse{
		User:   userResponse,
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

	// Handle email change separately
	if request.Email != nil {
		if err := api.auth.UpdateEmail(r.Context(), userID, *request.Email); err != nil {
			logError(api.logger, "update email", err)
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		// Remove email from request so user service doesn't try to handle it
		request.Email = nil
	}

	user, err := api.users.UpdateUser(r.Context(), userID, request)
	if err != nil {
		logError(api.logger, "update user", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, dto.NewUserResponse(*user, api.auth.CurrentPrivacyVersion(), api.auth.CurrentTermsVersion()))
}

func (api *API) DeleteUserAccount(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	if err := api.users.DeleteUser(r.Context(), userID); err != nil {
		logError(api.logger, "delete user", err)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Account deleted"})
}

func (api *API) ExportUserData(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	data, err := api.users.ExportUserData(r.Context(), userID, api.auth.CurrentPrivacyVersion(), api.auth.CurrentTermsVersion())
	if err != nil {
		logError(api.logger, "export user data", err)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, data)
}

func (api *API) ImportUserData(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	var request dto.UserDataImportRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	if err := api.users.ImportUserData(r.Context(), userID, request); err != nil {
		logError(api.logger, "import user data", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	data, err := api.users.ExportUserData(r.Context(), userID, api.auth.CurrentPrivacyVersion(), api.auth.CurrentTermsVersion())
	if err != nil {
		logError(api.logger, "refresh export after import", err)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, data)
}

func (api *API) RedeemConnectionCode(w http.ResponseWriter, r *http.Request) {
	var request dto.RedeemConnectionCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	claims, ok := api.auth.ClaimsFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	// Call Archer Health API to redeem the code. Use configured HealthAppURL when provided.
	healthAPIPath := "/api/redeem-connection-code"
	healthBase := api.HealthAppURL
	if strings.TrimSpace(healthBase) == "" {
		// backward-compat default
		healthBase = "https://health.adarcher.app"
	}

	// Ensure base does not end with slash
	healthBase = strings.TrimRight(healthBase, "/")
	healthAPIURL := healthBase + healthAPIPath

	payload := map[string]interface{}{
		"connectionCode":     request.ConnectionCode,
		// claims.UserID may be a uuid.UUID or string depending on auth implementation; ensure string
		"archerAquaUserId": claims.UserID,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		logError(api.logger, "marshal payload", err)
		respondError(w, http.StatusInternalServerError, "failed to prepare request")
		return
	}

	// Log which URL we're about to call for debugging local env issues
	if api.logger != nil {
		api.logger.Info("calling health API", slog.String("url", healthAPIURL))
	}

	resp, err := http.Post(healthAPIURL, "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		logError(api.logger, "call health API", err)
		respondError(w, http.StatusInternalServerError, "failed to connect to Archer Health")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errorResp map[string]string
		if err := json.NewDecoder(resp.Body).Decode(&errorResp); err != nil {
			logError(api.logger, "decode error response", err)
			respondError(w, http.StatusInternalServerError, "invalid response from Archer Health")
			return
		}
		respondError(w, resp.StatusCode, errorResp["error"])
		return
	}

	// Store the connection code locally; ensure we have a UUID for the user id
	var userUUID uuid.UUID
	if parsed, err := uuid.Parse(claims.UserID); err == nil {
		userUUID = parsed
	} else {
		// If claims.UserID isn't a UUID, attempt to use it as-is will fail; return error
		logError(api.logger, "invalid user id in claims", err)
		respondError(w, http.StatusInternalServerError, "invalid user id")
		return
	}

	if err := api.users.UpdateUserConnectionCode(r.Context(), userUUID, request.ConnectionCode); err != nil {
		logError(api.logger, "update user connection code", err)
		respondError(w, http.StatusInternalServerError, "failed to update user")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "connected"})
}

func (api *API) ClearConnectionCode(w http.ResponseWriter, r *http.Request) {
	claims, ok := api.auth.ClaimsFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var userUUID uuid.UUID
	if parsed, err := uuid.Parse(claims.UserID); err == nil {
		userUUID = parsed
	} else {
		logError(api.logger, "invalid user id in claims", err)
		respondError(w, http.StatusInternalServerError, "invalid user id")
		return
	}

	// Get the current connection code before clearing
	userModel, err := api.users.GetUser(r.Context(), userUUID)
	if err != nil {
		logError(api.logger, "get user", err)
		respondError(w, http.StatusInternalServerError, "failed to get user")
		return
	}

	oldCode := ""
	if userModel.ArcherHealthConnectionCode != nil {
		oldCode = *userModel.ArcherHealthConnectionCode
	}

	if err := api.users.UpdateUserConnectionCode(r.Context(), userUUID, ""); err != nil {
		logError(api.logger, "clear user connection code", err)
		respondError(w, http.StatusInternalServerError, "failed to clear connection")
		return
	}

	// Notify Archer Health to clear the connection
	if oldCode != "" {
		healthAPIPath := "/api/generate-connection-code"
		healthBase := api.HealthAppURL
		if strings.TrimSpace(healthBase) == "" {
			healthBase = "https://health.adarcher.app"
		}
		healthBase = strings.TrimRight(healthBase, "/")
		healthAPIURL := healthBase + healthAPIPath + "?connectionCode=" + oldCode

		resp, err := http.Post(healthAPIURL, "application/json", nil)
		if err != nil {
			logError(api.logger, "notify health to clear connection", err)
		} else {
			resp.Body.Close()
		}
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "cleared"})
}

func parseUUIDParam(r *http.Request, key string) (uuid.UUID, error) {
	value := chi.URLParam(r, key)
	return uuid.Parse(value)
}
