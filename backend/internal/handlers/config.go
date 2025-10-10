package handlers

import (
	"net/http"

	"encoding/json"

	"github.com/AD-Archer/archer-aqua/backend/internal/config"
)

// ConfigResponse is returned by /api/config
type ConfigResponse struct {
    FrontendURL string `json:"frontendUrl"`
    HealthAppURL string `json:"healthAppUrl"`
}

// ConfigHandler returns a handler that exposes runtime-configured frontend/health URLs
func ConfigHandler(cfg config.Config) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        resp := ConfigResponse{
            FrontendURL: cfg.FrontendURL,
            HealthAppURL: cfg.HealthAppURL,
        }
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(resp)
    }
}
