package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/dto"
)

func (api *API) LogHydration(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
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

	if !api.authorizeUserRequest(w, r, userID) {
		return
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
