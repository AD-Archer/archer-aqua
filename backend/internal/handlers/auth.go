package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/AD-Archer/archer-aqua/backend/internal/dto"
	"github.com/AD-Archer/archer-aqua/backend/internal/services"
	"github.com/google/uuid"
)

func (api *API) Register(w http.ResponseWriter, r *http.Request) {
	var request dto.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	user, token, hasProfile, err := api.auth.Register(r.Context(), request.Email, request.Password, request.DisplayName)
	if err != nil {
		switch {
		case err == services.ErrUserAlreadyExists:
			respondError(w, http.StatusConflict, err.Error())
		default:
			logError(api.logger, "register user", err)
			respondError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	respondJSON(w, http.StatusCreated, dto.AuthResponse{
		Token:      token,
		User:       dto.NewUserResponse(*user),
		HasProfile: hasProfile,
	})
}

func (api *API) Login(w http.ResponseWriter, r *http.Request) {
	var request dto.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	user, token, hasProfile, err := api.auth.Login(r.Context(), request.Email, request.Password)
	if err != nil {
		switch {
		case err == services.ErrInvalidCredentials:
			respondError(w, http.StatusUnauthorized, err.Error())
		default:
			logError(api.logger, "login user", err)
			respondError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	respondJSON(w, http.StatusOK, dto.AuthResponse{
		Token:      token,
		User:       dto.NewUserResponse(*user),
		HasProfile: hasProfile,
	})
}

func (api *API) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := api.auth.ClaimsFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "invalid token subject")
		return
	}

	user, err := api.auth.GetUserByID(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	respondJSON(w, http.StatusOK, dto.AuthStateResponse{
		User:       dto.NewUserResponse(*user),
		HasProfile: services.ProfileIsComplete(*user),
	})
}

func (api *API) BeginGoogleOAuth(w http.ResponseWriter, r *http.Request) {
	redirect := r.URL.Query().Get("redirect")
	authURL, _, err := api.auth.GoogleAuthURL(redirect)
	if err != nil {
		logError(api.logger, "google oauth redirect", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

func (api *API) GoogleOAuthCallback(w http.ResponseWriter, r *http.Request) {
	if errMsg := r.URL.Query().Get("error"); errMsg != "" {
		redirectWithError(w, r, api.auth, errMsg)
		return
	}

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	if strings.TrimSpace(code) == "" || strings.TrimSpace(state) == "" {
		redirectWithError(w, r, api.auth, "missing code or state")
		return
	}

	user, token, redirectTarget, err := api.auth.HandleGoogleCallback(r.Context(), code, state)
	if err != nil {
		logError(api.logger, "google oauth callback", err)
		redirectWithError(w, r, api.auth, err.Error())
		return
	}

	values := url.Values{}
	values.Set("token", token)
	values.Set("hasProfile", fmt.Sprintf("%t", services.ProfileIsComplete(*user)))
	values.Set("email", user.Email)
	if strings.TrimSpace(user.DisplayName) != "" {
		values.Set("displayName", user.DisplayName)
	}

	target, err := url.Parse(redirectTarget)
	if err != nil {
		redirectWithError(w, r, api.auth, "invalid redirect target")
		return
	}

	target.RawQuery = values.Encode()
	http.Redirect(w, r, target.String(), http.StatusTemporaryRedirect)
}

func redirectWithError(w http.ResponseWriter, r *http.Request, authService *services.AuthService, message string) {
	fallback := authService.DefaultRedirect()
	target, err := url.Parse(fallback)
	if err != nil {
		respondError(w, http.StatusBadRequest, message)
		return
	}
	target.RawQuery = url.Values{"error": []string{message}}.Encode()
	http.Redirect(w, r, target.String(), http.StatusTemporaryRedirect)
}
