package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/dto"
	"github.com/AD-Archer/archer-aqua/backend/internal/services"
)

func (api *API) LogHydration(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	// Try connection code authentication first (for Archer Health)
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		connectionCode := strings.TrimPrefix(authHeader, "Bearer ")

		// Find user by connection code
		user, err := api.users.GetUserByArcherHealthConnectionCode(r.Context(), connectionCode)
		if err == nil && user != nil && user.ID == userID {
			// Connection code auth successful
		} else {
			respondError(w, http.StatusUnauthorized, "invalid connection code")
			return
		}
	} else {
		// Fall back to JWT authentication
		if !api.authorizeUserRequest(w, r, userID) {
			return
		}
	}

	var request dto.LogHydrationRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	entry, err := api.hydration.LogHydration(r.Context(), userID, request)
	if err != nil {
		logError(api.logger, "log hydration", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, dto.NewHydrationLogResponse(*entry))
}

func (api *API) DailySummary(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		respondError(w, http.StatusBadRequest, "date query parameter is required")
		return
	}

	tz := r.URL.Query().Get("timezone")
	date, err := time.Parse(time.DateOnly, dateStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid date format (expected YYYY-MM-DD)")
		return
	}

	summary, err := api.hydration.DailySummary(r.Context(), userID, date, tz)
	if err != nil {
		logError(api.logger, "daily summary", err)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, summary)
}

func (api *API) HydrationStats(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	// Try connection code authentication first (for Archer Health)
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		connectionCode := strings.TrimPrefix(authHeader, "Bearer ")
		
		// Find user by connection code
		user, err := api.users.GetUserByArcherHealthConnectionCode(r.Context(), connectionCode)
		if err == nil && user != nil && user.ID == userID {
			// Connection code auth successful
		} else {
			respondError(w, http.StatusUnauthorized, "invalid connection code")
			return
		}
	} else {
		// Fall back to JWT authentication
		if !api.authorizeUserRequest(w, r, userID) {
			return
		}
	}

	tz := r.URL.Query().Get("timezone")
	daysStr := r.URL.Query().Get("days")
	days := 7
	if daysStr != "" {
		if parsed, err := strconv.Atoi(daysStr); err == nil && parsed > 0 {
			days = parsed
		}
	}

	stats, err := api.hydration.WeeklyStats(r.Context(), userID, tz, days)
	if err != nil {
		logError(api.logger, "hydration stats", err)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, stats)
}

func (api *API) DeleteHydrationLog(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	logID, err := parseUUIDParam(r, "logID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid hydration log id")
		return
	}

	if err := api.hydration.DeleteHydrationLog(r.Context(), userID, logID); err != nil {
		logError(api.logger, "delete hydration log", err)
		status := http.StatusInternalServerError
		if errors.Is(err, services.ErrHydrationLogNotFound) {
			status = http.StatusNotFound
		}
		respondError(w, status, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (api *API) SetDailyGoal(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	var request dto.SetDailyGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	// Validate date format
	if _, err := time.Parse(time.DateOnly, request.Date); err != nil {
		respondError(w, http.StatusBadRequest, "invalid date format (expected YYYY-MM-DD)")
		return
	}

	// Validate goal
	if request.GoalMl <= 0 {
		respondError(w, http.StatusBadRequest, "goal must be greater than 0")
		return
	}

	dailyGoal, err := api.dailyGoals.SetDailyGoal(r.Context(), userID, request.Date, request.GoalMl)
	if err != nil {
		logError(api.logger, "set daily goal", err)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response := dto.DailyGoalResponse{
		ID:     dailyGoal.ID.String(),
		UserID: dailyGoal.UserID.String(),
		Date:   dailyGoal.Date,
		GoalMl: dailyGoal.GoalMl,
	}

	respondJSON(w, http.StatusOK, response)
}

func (api *API) GetDailyGoal(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	// Try connection code authentication first (for Archer Health)
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		connectionCode := strings.TrimPrefix(authHeader, "Bearer ")

		// Find user by connection code
		user, err := api.users.GetUserByArcherHealthConnectionCode(r.Context(), connectionCode)
		if err == nil && user != nil && user.ID == userID {
			// Connection code auth successful
		} else {
			respondError(w, http.StatusUnauthorized, "invalid connection code")
			return
		}
	} else {
		// Fall back to JWT authentication
		if !api.authorizeUserRequest(w, r, userID) {
			return
		}
	}

	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		respondError(w, http.StatusBadRequest, "date query parameter is required")
		return
	}

	// Validate date format
	if _, err := time.Parse(time.DateOnly, dateStr); err != nil {
		respondError(w, http.StatusBadRequest, "invalid date format (expected YYYY-MM-DD)")
		return
	}

	goalMl, err := api.dailyGoals.GetDailyGoal(r.Context(), userID, dateStr)
	if err != nil {
		logError(api.logger, "get daily goal", err)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response := map[string]float64{"goalMl": goalMl}
	respondJSON(w, http.StatusOK, response)
}

func (api *API) DeleteDailyGoal(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		respondError(w, http.StatusBadRequest, "date query parameter is required")
		return
	}

	// Validate date format
	if _, err := time.Parse(time.DateOnly, dateStr); err != nil {
		respondError(w, http.StatusBadRequest, "invalid date format (expected YYYY-MM-DD)")
		return
	}

	if err := api.dailyGoals.DeleteDailyGoal(r.Context(), userID, dateStr); err != nil {
		logError(api.logger, "delete daily goal", err)
		status := http.StatusInternalServerError
		if errors.Is(err, services.ErrDailyGoalNotFound) {
			status = http.StatusNotFound
		}
		respondError(w, status, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
