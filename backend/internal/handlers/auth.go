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

	user, token, hasProfile, err := api.auth.Register(r.Context(), request.Email, request.Password, request.DisplayName, request.AcceptPrivacy, request.AcceptTerms, request.PrivacyVersion, request.TermsVersion)
	if err != nil {
		switch {
		case strings.Contains(err.Error(), "privacy"):
			respondError(w, http.StatusBadRequest, err.Error())
		case strings.Contains(err.Error(), "terms"):
			respondError(w, http.StatusBadRequest, err.Error())
		default:
			logError(api.logger, "register user", err)
			respondError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	userResponse := dto.NewUserResponse(*user, api.auth.CurrentPrivacyVersion(), api.auth.CurrentTermsVersion())
	respondJSON(w, http.StatusCreated, dto.AuthResponse{
		Token:                    token,
		User:                     userResponse,
		HasProfile:               hasProfile,
		RequiresPolicyAcceptance: userResponse.RequiresPrivacyAcceptance || userResponse.RequiresTermsAcceptance,
		PoliciesVersion:          userResponse.PrivacyCurrentVersion, // For backward compatibility
	})
}

func (api *API) Login(w http.ResponseWriter, r *http.Request) {
	var request dto.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	user, token, hasProfile, err := api.auth.LoginWithTwoFactor(r.Context(), request.Email, request.Password, request.TwoFactorCode)
	if err != nil {
		switch {
		case err == services.ErrInvalidCredentials:
			respondError(w, http.StatusUnauthorized, err.Error())
		case err == services.ErrTwoFactorRequired:
			respondJSON(w, http.StatusAccepted, map[string]interface{}{
				"requiresTwoFactor": true,
				"message":           "Two-factor authentication required",
			})
			return
		case err == services.ErrInvalidTwoFactorCode:
			respondError(w, http.StatusUnauthorized, "invalid two-factor authentication code")
		default:
			logError(api.logger, "login user", err)
			respondError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	userResponse := dto.NewUserResponse(*user, api.auth.CurrentPrivacyVersion(), api.auth.CurrentTermsVersion())
	respondJSON(w, http.StatusOK, dto.AuthResponse{
		Token:                    token,
		User:                     userResponse,
		HasProfile:               hasProfile,
		RequiresPolicyAcceptance: userResponse.RequiresPrivacyAcceptance || userResponse.RequiresTermsAcceptance,
		PoliciesVersion:          userResponse.PrivacyCurrentVersion, // For backward compatibility
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

	userResponse := dto.NewUserResponse(*user, api.auth.CurrentPrivacyVersion(), api.auth.CurrentTermsVersion())
	respondJSON(w, http.StatusOK, dto.AuthStateResponse{
		User:                     userResponse,
		HasProfile:               services.ProfileIsComplete(*user),
		RequiresPolicyAcceptance: userResponse.RequiresPrivacyAcceptance || userResponse.RequiresTermsAcceptance,
		PoliciesVersion:          userResponse.PrivacyCurrentVersion, // For backward compatibility
	})
}

func (api *API) AcceptPolicies(w http.ResponseWriter, r *http.Request) {
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

	var request dto.AcceptPoliciesRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	user, err := api.auth.AcceptPolicies(r.Context(), userID, request.Version)
	if err != nil {
		switch err {
		case services.ErrPolicyVersionMismatch:
			respondError(w, http.StatusBadRequest, err.Error())
		default:
			logError(api.logger, "accept policies", err)
			respondError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	userResponse := dto.NewUserResponse(*user, api.auth.CurrentPrivacyVersion(), api.auth.CurrentTermsVersion())
	respondJSON(w, http.StatusOK, dto.AuthStateResponse{
		User:                     userResponse,
		HasProfile:               services.ProfileIsComplete(*user),
		RequiresPolicyAcceptance: userResponse.RequiresPolicyAcceptance,
		PoliciesVersion:          userResponse.PoliciesCurrentVersion,
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
	requiresPolicies := api.auth.RequiresPolicyAcceptance(*user)
	values.Set("requiresPolicies", fmt.Sprintf("%t", requiresPolicies))
	if requiresPolicies {
		values.Set("policiesVersion", api.auth.CurrentPoliciesVersion())
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

// ChangePassword changes a user's password
func (api *API) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	var request dto.ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	if err := api.auth.ChangePassword(r.Context(), userID, request.CurrentPassword, request.NewPassword); err != nil {
		logError(api.logger, "change password", err)
		if err == services.ErrInvalidCredentials {
			respondError(w, http.StatusUnauthorized, "current password is incorrect")
			return
		}
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Password changed successfully"})
}

// SetPassword sets a password for OAuth users
func (api *API) SetPassword(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	var request dto.SetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	if err := api.auth.SetPassword(r.Context(), userID, request.NewPassword); err != nil {
		logError(api.logger, "set password", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Password set successfully"})
}

// RemovePassword removes password for OAuth users
func (api *API) RemovePassword(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	if err := api.auth.RemovePassword(r.Context(), userID); err != nil {
		logError(api.logger, "remove password", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Password removed successfully"})
}

// SendEmailVerification sends email verification
func (api *API) SendEmailVerification(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	if err := api.auth.SendEmailVerification(r.Context(), userID); err != nil {
		logError(api.logger, "send email verification", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, dto.EmailVerificationResponse{
		Message: "Verification email sent successfully",
		Sent:    true,
	})
}

// VerifyEmail verifies email address
func (api *API) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var request dto.VerifyEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	if err := api.auth.VerifyEmail(r.Context(), request.Token); err != nil {
		logError(api.logger, "verify email", err)
		if err == services.ErrInvalidToken {
			respondError(w, http.StatusBadRequest, "invalid or expired verification token")
			return
		}
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Email verified successfully"})
}

// ForgotPassword initiates password reset
func (api *API) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var request dto.ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	if err := api.auth.ForgotPassword(r.Context(), request.Email); err != nil {
		logError(api.logger, "forgot password", err)
	}

	// Always return success to prevent email enumeration
	respondJSON(w, http.StatusOK, map[string]string{"message": "If the email exists, a reset link has been sent"})
}

// ResetPassword resets password using token
func (api *API) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var request dto.ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	if err := api.auth.ResetPassword(r.Context(), request.Token, request.NewPassword, request.BackupCode); err != nil {
		logError(api.logger, "reset password", err)
		if err == services.ErrInvalidToken {
			respondError(w, http.StatusBadRequest, "invalid or expired reset token")
			return
		}
		if err == services.ErrTwoFactorRequired {
			respondError(w, http.StatusBadRequest, "two-factor authentication required - please provide a backup code")
			return
		}
		if err == services.ErrInvalidTwoFactorCode {
			respondError(w, http.StatusBadRequest, "invalid backup code")
			return
		}
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Password reset successfully"})
}

// Enable2FA starts 2FA setup
func (api *API) Enable2FA(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	secret, totpURL, backupCodes, err := api.auth.Enable2FA(r.Context(), userID)
	if err != nil {
		logError(api.logger, "enable 2FA", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	response := dto.TwoFactorSetupResponse{
		QRCodeURL:   *totpURL,
		Secret:      *secret,
		BackupCodes: backupCodes,
	}

	respondJSON(w, http.StatusOK, response)
}

// Verify2FA completes 2FA setup
func (api *API) Verify2FA(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	var request dto.Verify2FARequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	if err := api.auth.Verify2FA(r.Context(), userID, request.Code); err != nil {
		logError(api.logger, "verify 2FA", err)
		if err == services.ErrInvalidTwoFactorCode {
			respondError(w, http.StatusBadRequest, "invalid verification code")
			return
		}
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Two-factor authentication enabled successfully"})
}

// Disable2FA disables 2FA
func (api *API) Disable2FA(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUUIDParam(r, "userID")
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	if !api.authorizeUserRequest(w, r, userID) {
		return
	}

	var request dto.Disable2FARequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	if err := api.auth.Disable2FA(r.Context(), userID, request.Password, request.Code); err != nil {
		logError(api.logger, "disable 2FA", err)
		if err == services.ErrInvalidCredentials {
			respondError(w, http.StatusUnauthorized, "invalid password")
			return
		}
		if err == services.ErrInvalidTwoFactorCode {
			respondError(w, http.StatusBadRequest, "invalid verification code")
			return
		}
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Two-factor authentication disabled successfully"})
}

func (api *API) AcceptPrivacy(w http.ResponseWriter, r *http.Request) {
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

	var request dto.AcceptPoliciesRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	user, err := api.auth.AcceptPrivacy(r.Context(), userID, request.Version)
	if err != nil {
		logError(api.logger, "accept privacy", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	userResponse := dto.NewUserResponse(*user, api.auth.CurrentPrivacyVersion(), api.auth.CurrentTermsVersion())
	respondJSON(w, http.StatusOK, userResponse)
}

func (api *API) AcceptTerms(w http.ResponseWriter, r *http.Request) {
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

	var request dto.AcceptPoliciesRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	user, err := api.auth.AcceptTerms(r.Context(), userID, request.Version)
	if err != nil {
		logError(api.logger, "accept terms", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	userResponse := dto.NewUserResponse(*user, api.auth.CurrentPrivacyVersion(), api.auth.CurrentTermsVersion())
	respondJSON(w, http.StatusOK, userResponse)
}
