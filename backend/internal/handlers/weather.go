package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/AD-Archer/archer-aqua/backend/internal/dto"
)

func (api *API) GetCurrentWeather(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	// Parse latitude and longitude from query parameters
	latStr := r.URL.Query().Get("lat")
	lonStr := r.URL.Query().Get("lon")

	if latStr == "" || lonStr == "" {
		respondError(w, http.StatusBadRequest, "latitude and longitude are required")
		return
	}

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid latitude")
		return
	}

	lon, err := strconv.ParseFloat(lonStr, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid longitude")
		return
	}

	weather, err := api.weather.GetCurrentWeather(r.Context(), userID, lat, lon)
	if err != nil {
		logError(api.logger, "get current weather", err)
		respondError(w, http.StatusNotFound, "no weather data found")
		return
	}

	respondJSON(w, http.StatusOK, dto.NewWeatherResponse(*weather))
}

func (api *API) SaveWeatherData(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	var request dto.CreateWeatherRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	weather, err := api.weather.SaveWeatherData(r.Context(), userID, request)
	if err != nil {
		logError(api.logger, "save weather data", err)
		respondError(w, http.StatusInternalServerError, "failed to save weather data")
		return
	}

	respondJSON(w, http.StatusCreated, dto.NewWeatherResponse(*weather))
}

func (api *API) GetWeatherHistory(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	// Parse optional limit parameter
	limit := 10 // default limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	weatherData, err := api.weather.GetWeatherHistory(r.Context(), userID, limit)
	if err != nil {
		logError(api.logger, "get weather history", err)
		respondError(w, http.StatusInternalServerError, "failed to get weather history")
		return
	}

	responses := make([]dto.WeatherResponse, 0, len(weatherData))
	for _, weather := range weatherData {
		responses = append(responses, dto.NewWeatherResponse(weather))
	}

	respondJSON(w, http.StatusOK, responses)
}
