package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/AD-Archer/archer-aqua/backend/internal/config"
	"github.com/AD-Archer/archer-aqua/backend/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"gorm.io/gorm"
)

var (
	ErrUserAlreadyExists     = errors.New("user already exists")
	ErrInvalidCredentials    = errors.New("invalid email or password")
	ErrGoogleOAuthDisabled   = errors.New("google oauth is not configured")
	ErrEmailNotVerified      = errors.New("email address is not verified")
	ErrAccountLocked         = errors.New("account is temporarily locked due to too many failed attempts")
	ErrInvalidToken          = errors.New("invalid or expired token")
	ErrTwoFactorRequired     = errors.New("two-factor authentication required")
	ErrInvalidTwoFactorCode  = errors.New("invalid two-factor authentication code")
	ErrPoliciesNotAccepted   = errors.New("you must accept the latest privacy policy and terms of service")
	ErrPolicyVersionMismatch = errors.New("policy version mismatch")
)

type AuthService struct {
	db           *gorm.DB
	cfg          config.Config
	oauthConfig  *oauth2.Config
	emailService *EmailService
	twoFAService *TwoFactorService
}

type TokenClaims struct {
	UserID string `json:"uid"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

type contextKey string

const tokenClaimsKey contextKey = "authTokenClaims"

func NewAuthService(db *gorm.DB, cfg config.Config) *AuthService {
	var oauthCfg *oauth2.Config
	if cfg.GoogleOAuthEnabled {
		oauthCfg = &oauth2.Config{
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			RedirectURL:  cfg.GoogleRedirectURL,
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		}
	}

	emailService := NewEmailService(cfg)
	twoFAService := NewTwoFactorService("Archer Aqua")

	return &AuthService{
		db:           db,
		cfg:          cfg,
		oauthConfig:  oauthCfg,
		emailService: emailService,
		twoFAService: twoFAService,
	}
}

func (s *AuthService) Register(ctx context.Context, email, password, displayName string, acceptedPrivacy, acceptedTerms bool, privacyVersion, termsVersion string) (*models.User, string, bool, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, "", false, fmt.Errorf("email is required")
	}

	password = strings.TrimSpace(password)
	if len(password) < 8 {
		return nil, "", false, fmt.Errorf("password must be at least 8 characters")
	}

	displayName = strings.TrimSpace(displayName)
	if displayName == "" {
		if parts := strings.Split(email, "@"); len(parts) > 0 {
			displayName = parts[0]
		}
	}

	if !acceptedPrivacy {
		return nil, "", false, fmt.Errorf("you must accept the latest privacy policy")
	}

	if !acceptedTerms {
		return nil, "", false, fmt.Errorf("you must accept the latest terms of service")
	}

	privacyVersion = strings.TrimSpace(privacyVersion)
	if privacyVersion == "" {
		return nil, "", false, fmt.Errorf("privacy version is required")
	}

	termsVersion = strings.TrimSpace(termsVersion)
	if termsVersion == "" {
		return nil, "", false, fmt.Errorf("terms version is required")
	}

	if privacyVersion != strings.TrimSpace(s.cfg.PrivacyVersion) {
		return nil, "", false, fmt.Errorf("privacy version mismatch")
	}

	if termsVersion != strings.TrimSpace(s.cfg.TermsVersion) {
		return nil, "", false, fmt.Errorf("terms version mismatch")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", false, fmt.Errorf("hash password: %w", err)
	}

	var user models.User
	var hasProfile bool

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Where("email = ?", email).First(&user)
		switch {
		case result.Error == nil:
			if user.PasswordHash != nil {
				return ErrUserAlreadyExists
			}
		case errors.Is(result.Error, gorm.ErrRecordNotFound):
			user = models.User{
				Email:                     email,
				DisplayName:               displayName,
				VolumeUnit:                "ml",
				TemperatureUnit:           "c",
				ProgressWheelStyle:        "drink_colors",
				WeatherAdjustmentsEnabled: true,
			}
			if err := tx.Create(&user).Error; err != nil {
				return err
			}
		default:
			return result.Error
		}

		hashString := string(hash)
		user.PasswordHash = &hashString
		if strings.TrimSpace(user.DisplayName) == "" {
			user.DisplayName = displayName
		}

		now := time.Now().UTC()
		user.PrivacyAcceptedVersion = &privacyVersion
		user.PrivacyAcceptedAt = &now
		user.TermsAcceptedVersion = &termsVersion
		user.TermsAcceptedAt = &now

		if err := tx.Save(&user).Error; err != nil {
			return err
		}

		hasProfile = profileIsComplete(user)
		return nil
	})
	if err != nil {
		return nil, "", false, err
	}

	token, err := s.generateToken(&user)
	if err != nil {
		return nil, "", false, err
	}

	return &user, token, hasProfile, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*models.User, string, bool, error) {
	return s.LoginWithTwoFactor(ctx, email, password, nil)
}

func (s *AuthService) LoginWithTwoFactor(ctx context.Context, email, password string, twoFactorCode *string) (*models.User, string, bool, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || strings.TrimSpace(password) == "" {
		return nil, "", false, ErrInvalidCredentials
	}

	var user models.User
	if err := s.db.WithContext(ctx).Where("email = ?", email).First(&user).Error; err != nil {
		return nil, "", false, ErrInvalidCredentials
	}

	if user.PasswordHash == nil {
		return nil, "", false, fmt.Errorf("account uses Google sign-in")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)); err != nil {
		return nil, "", false, ErrInvalidCredentials
	}

	// Check if 2FA is enabled and required
	if user.TwoFactorEnabled {
		if twoFactorCode == nil || *twoFactorCode == "" {
			return nil, "", false, ErrTwoFactorRequired
		}

		// Validate 2FA code
		valid := false
		if user.TwoFactorSecret != nil {
			valid = s.twoFAService.ValidateCode(*user.TwoFactorSecret, *twoFactorCode)
		}

		// If regular code didn't work, try backup codes
		if !valid && user.TwoFactorBackupCodes != nil {
			isBackupValid, updatedCodes, err := s.twoFAService.ValidateBackupCode(*user.TwoFactorBackupCodes, *twoFactorCode)
			if err == nil && isBackupValid {
				valid = true
				// Update backup codes
				if updatedCodesJSON, err := s.twoFAService.EncodeBackupCodes(updatedCodes); err == nil {
					user.TwoFactorBackupCodes = &updatedCodesJSON
					s.db.WithContext(ctx).Save(&user)
				}
			}
		}

		if !valid {
			return nil, "", false, ErrInvalidTwoFactorCode
		}
	}

	token, err := s.generateToken(&user)
	if err != nil {
		return nil, "", false, err
	}

	return &user, token, profileIsComplete(user), nil
}

func (s *AuthService) GoogleAuthURL(redirect string) (string, string, error) {
	if s.oauthConfig == nil {
		return "", "", ErrGoogleOAuthDisabled
	}

	defaultRedirect := s.cfg.FrontendURL + "/auth"
	redirectURL := SanitizeRedirect(defaultRedirect, redirect)

	stateToken, err := s.encodeStateToken(redirectURL)
	if err != nil {
		return "", "", err
	}

	return s.oauthConfig.AuthCodeURL(stateToken, oauth2.AccessTypeOffline), stateToken, nil
}

func (s *AuthService) HandleGoogleCallback(ctx context.Context, code, state string) (*models.User, string, string, error) {
	if s.oauthConfig == nil {
		return nil, "", "", ErrGoogleOAuthDisabled
	}

	redirectTarget, err := s.decodeStateToken(state)
	if err != nil {
		return nil, "", "", err
	}

	token, err := s.oauthConfig.Exchange(ctx, code)
	if err != nil {
		return nil, "", "", fmt.Errorf("exchange code: %w", err)
	}

	client := s.oauthConfig.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo?alt=json")
	if err != nil {
		return nil, "", "", fmt.Errorf("fetch user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, "", "", fmt.Errorf("google userinfo error: %s", resp.Status)
	}

	var googleUser struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		VerifiedEmail bool   `json:"verified_email"`
		Name          string `json:"name"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&googleUser); err != nil {
		return nil, "", "", fmt.Errorf("decode google user: %w", err)
	}

	if googleUser.Email == "" || googleUser.ID == "" {
		return nil, "", "", errors.New("google response missing id or email")
	}

	user, err := s.upsertGoogleUser(ctx, googleUser.Email, googleUser.ID, googleUser.Name)
	if err != nil {
		return nil, "", "", err
	}

	tokenString, err := s.generateToken(user)
	if err != nil {
		return nil, "", "", err
	}

	return user, tokenString, redirectTarget, nil
}

func (s *AuthService) GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (s *AuthService) ParseToken(tokenString string) (*TokenClaims, error) {
	claims := &TokenClaims{}
	parsedToken, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}
	if !parsedToken.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

func (s *AuthService) ContextWithClaims(ctx context.Context, claims *TokenClaims) context.Context {
	return context.WithValue(ctx, tokenClaimsKey, claims)
}

func (s *AuthService) ClaimsFromContext(ctx context.Context) (*TokenClaims, bool) {
	claims, ok := ctx.Value(tokenClaimsKey).(*TokenClaims)
	return claims, ok
}

func (s *AuthService) encodeStateToken(redirect string) (string, error) {
	claims := jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(5 * time.Minute)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Issuer:    s.cfg.JWTIssuer,
		Subject:   "google_oauth_state",
		Audience:  []string{redirect},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *AuthService) decodeStateToken(state string) (string, error) {
	claims := &jwt.RegisteredClaims{}
	parsedToken, err := jwt.ParseWithClaims(state, claims, func(token *jwt.Token) (any, error) {
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil {
		return "", fmt.Errorf("decode state: %w", err)
	}
	if !parsedToken.Valid {
		return "", errors.New("invalid state token")
	}
	if len(claims.Audience) == 0 {
		return "", errors.New("state missing redirect")
	}

	redirect := claims.Audience[0]
	if !strings.HasPrefix(redirect, s.cfg.FrontendURL) {
		return "", errors.New("redirect host not allowed")
	}

	return redirect, nil
}

func (s *AuthService) generateToken(user *models.User) (string, error) {
	claims := TokenClaims{
		UserID: user.ID.String(),
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.String(),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.cfg.JWTExpiry)),
			Issuer:    s.cfg.JWTIssuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *AuthService) upsertGoogleUser(ctx context.Context, email, googleID, name string) (*models.User, error) {
	email = strings.ToLower(email)
	var user models.User

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Where("google_subject = ?", googleID).First(&user)
		if result.Error != nil {
			if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
				return result.Error
			}

			result = tx.Where("email = ?", email).First(&user)
			if result.Error != nil {
				if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
					return result.Error
				}

				user = models.User{
					Email:                     email,
					DisplayName:               name,
					VolumeUnit:                "ml",
					TemperatureUnit:           "c",
					ProgressWheelStyle:        "drink_colors",
					WeatherAdjustmentsEnabled: true,
				}
				if err := tx.Create(&user).Error; err != nil {
					return err
				}
			}
		}

		if strings.TrimSpace(user.DisplayName) == "" {
			user.DisplayName = name
		}
		user.GoogleSubject = &googleID

		return tx.Save(&user).Error
	})
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func profileIsComplete(user models.User) bool {
	return user.WeightKg > 0 && user.Age > 0 && strings.TrimSpace(user.Timezone) != ""
}

func ProfileIsComplete(user models.User) bool {
	return profileIsComplete(user)
}

func (s *AuthService) RequiresPrivacyAcceptance(user models.User) bool {
	version := strings.TrimSpace(s.cfg.PrivacyVersion)
	if version == "" {
		return false
	}
	if user.PrivacyAcceptedVersion == nil {
		return true
	}
	return *user.PrivacyAcceptedVersion != version
}

func (s *AuthService) RequiresTermsAcceptance(user models.User) bool {
	version := strings.TrimSpace(s.cfg.TermsVersion)
	if version == "" {
		return false
	}
	if user.TermsAcceptedVersion == nil {
		return true
	}
	return *user.TermsAcceptedVersion != version
}

func (s *AuthService) CurrentPrivacyVersion() string {
	return s.cfg.PrivacyVersion
}

func (s *AuthService) CurrentTermsVersion() string {
	return s.cfg.TermsVersion
}

func (s *AuthService) AcceptPolicies(ctx context.Context, userID uuid.UUID, version string) (*models.User, error) {
	// For backward compatibility, accept both privacy and terms with the same version
	_, err := s.AcceptPrivacy(ctx, userID, version)
	if err != nil {
		return nil, err
	}
	user, err := s.AcceptTerms(ctx, userID, version)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (s *AuthService) CurrentPoliciesVersion() string {
	// For backward compatibility, return privacy version
	return s.cfg.PrivacyVersion
}

func (s *AuthService) RequiresPolicyAcceptance(user models.User) bool {
	return s.RequiresPrivacyAcceptance(user) || s.RequiresTermsAcceptance(user)
}

func (s *AuthService) AcceptPrivacy(ctx context.Context, userID uuid.UUID, version string) (*models.User, error) {
	version = strings.TrimSpace(version)
	if version == "" {
		return nil, fmt.Errorf("privacy version is required")
	}
	if version != strings.TrimSpace(s.cfg.PrivacyVersion) {
		return nil, fmt.Errorf("privacy version mismatch")
	}

	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}

	now := time.Now().UTC()
	user.PrivacyAcceptedVersion = &version
	user.PrivacyAcceptedAt = &now
	if err := s.db.WithContext(ctx).Save(&user).Error; err != nil {
		return nil, fmt.Errorf("update privacy acceptance: %w", err)
	}

	return &user, nil
}

func (s *AuthService) AcceptTerms(ctx context.Context, userID uuid.UUID, version string) (*models.User, error) {
	version = strings.TrimSpace(version)
	if version == "" {
		return nil, fmt.Errorf("terms version is required")
	}
	if version != strings.TrimSpace(s.cfg.TermsVersion) {
		return nil, fmt.Errorf("terms version mismatch")
	}

	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}

	now := time.Now().UTC()
	user.TermsAcceptedVersion = &version
	user.TermsAcceptedAt = &now
	if err := s.db.WithContext(ctx).Save(&user).Error; err != nil {
		return nil, fmt.Errorf("update terms acceptance: %w", err)
	}

	return &user, nil
}

func (s *AuthService) DefaultRedirect() string {
	return s.cfg.FrontendURL + "/auth"
}

func SanitizeRedirect(base string, redirect string) string {
	if redirect == "" {
		return base
	}

	target, err := url.Parse(redirect)
	if err != nil {
		return base
	}

	baseURL, err := url.Parse(base)
	if err != nil {
		return base
	}

	if target.Scheme == "" {
		target.Scheme = baseURL.Scheme
	}
	if target.Host == "" {
		target.Host = baseURL.Host
	}

	if !strings.HasPrefix(target.String(), baseURL.Scheme+"://"+baseURL.Host) {
		return base
	}

	return target.String()
}

// ChangePassword changes a user's password
func (s *AuthService) ChangePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error {
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		return fmt.Errorf("user not found")
	}

	// Verify current password if user has one
	if user.PasswordHash != nil {
		if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(currentPassword)); err != nil {
			return ErrInvalidCredentials
		}
	}

	// Hash new password
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	hashString := string(hash)
	user.PasswordHash = &hashString

	return s.db.WithContext(ctx).Save(&user).Error
}

// SetPassword sets a password for OAuth users
func (s *AuthService) SetPassword(ctx context.Context, userID uuid.UUID, newPassword string) error {
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		return fmt.Errorf("user not found")
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	hashString := string(hash)
	user.PasswordHash = &hashString

	return s.db.WithContext(ctx).Save(&user).Error
}

// RemovePassword removes password for OAuth users
func (s *AuthService) RemovePassword(ctx context.Context, userID uuid.UUID) error {
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		return fmt.Errorf("user not found")
	}

	// Can only remove password if user has Google OAuth
	if user.GoogleSubject == nil {
		return fmt.Errorf("cannot remove password without alternative authentication method")
	}

	user.PasswordHash = nil
	return s.db.WithContext(ctx).Save(&user).Error
}

// SendEmailVerification sends an email verification link
func (s *AuthService) SendEmailVerification(ctx context.Context, userID uuid.UUID) error {
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		return fmt.Errorf("user not found")
	}

	if user.EmailVerified {
		return fmt.Errorf("email is already verified")
	}

	// Generate verification token
	token, err := GenerateSecureToken(32)
	if err != nil {
		return fmt.Errorf("failed to generate token: %w", err)
	}

	// Set token expiry (24 hours)
	expiry := time.Now().Add(24 * time.Hour)
	user.EmailVerificationToken = &token
	user.EmailVerificationExpiry = &expiry

	if err := s.db.WithContext(ctx).Save(&user).Error; err != nil {
		return fmt.Errorf("failed to save verification token: %w", err)
	}

	// Send email
	return s.emailService.SendVerificationEmail(user.Email, user.DisplayName, token)
}

// VerifyEmail verifies an email address using a token
func (s *AuthService) VerifyEmail(ctx context.Context, token string) error {
	var user models.User
	if err := s.db.WithContext(ctx).Where("email_verification_token = ?", token).First(&user).Error; err != nil {
		return ErrInvalidToken
	}

	// Check if token is expired
	if user.EmailVerificationExpiry != nil && time.Now().After(*user.EmailVerificationExpiry) {
		return ErrInvalidToken
	}

	// Mark email as verified
	user.EmailVerified = true
	user.EmailVerificationToken = nil
	user.EmailVerificationExpiry = nil

	return s.db.WithContext(ctx).Save(&user).Error
}

// ForgotPassword initiates password reset flow
func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	email = strings.ToLower(strings.TrimSpace(email))

	var user models.User
	if err := s.db.WithContext(ctx).Where("email = ?", email).First(&user).Error; err != nil {
		// Don't reveal if email exists
		return nil
	}

	// Only send reset if user has a password
	if user.PasswordHash == nil {
		return nil
	}

	// Generate reset token
	token, err := GenerateSecureToken(32)
	if err != nil {
		return fmt.Errorf("failed to generate token: %w", err)
	}

	// Set token expiry (1 hour)
	expiry := time.Now().Add(1 * time.Hour)
	user.PasswordResetToken = &token
	user.PasswordResetExpiry = &expiry

	if err := s.db.WithContext(ctx).Save(&user).Error; err != nil {
		return fmt.Errorf("failed to save reset token: %w", err)
	}

	// Send email
	return s.emailService.SendPasswordResetEmail(user.Email, user.DisplayName, token)
}

// ResetPassword resets password using a token
func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string, backupCode *string) error {
	var user models.User
	if err := s.db.WithContext(ctx).Where("password_reset_token = ?", token).First(&user).Error; err != nil {
		return ErrInvalidToken
	}

	// Check if token is expired
	if user.PasswordResetExpiry != nil && time.Now().After(*user.PasswordResetExpiry) {
		return ErrInvalidToken
	}

	// If 2FA is enabled, require backup code
	if user.TwoFactorEnabled {
		if backupCode == nil || *backupCode == "" {
			return ErrTwoFactorRequired
		}

		// Validate backup code
		valid, remainingCodes, err := s.twoFAService.ValidateBackupCode(*user.TwoFactorBackupCodes, *backupCode)
		if err != nil {
			return fmt.Errorf("failed to validate backup code: %w", err)
		}
		if !valid {
			return ErrInvalidTwoFactorCode
		}

		// Update backup codes (remove the used one)
		if len(remainingCodes) > 0 {
			updatedCodesJSON, err := s.twoFAService.EncodeBackupCodes(remainingCodes)
			if err != nil {
				return fmt.Errorf("failed to encode updated backup codes: %w", err)
			}
			user.TwoFactorBackupCodes = &updatedCodesJSON
		} else {
			user.TwoFactorBackupCodes = nil
		}
	}

	// Hash new password
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	hashString := string(hash)
	user.PasswordHash = &hashString
	user.PasswordResetToken = nil
	user.PasswordResetExpiry = nil
	user.EmailVerified = true // Verify email as a consequence of successful password reset

	return s.db.WithContext(ctx).Save(&user).Error
}

// Enable2FA enables two-factor authentication for a user
func (s *AuthService) Enable2FA(ctx context.Context, userID uuid.UUID) (*string, *string, []string, error) {
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		return nil, nil, nil, fmt.Errorf("user not found")
	}

	if user.TwoFactorEnabled {
		return nil, nil, nil, fmt.Errorf("two-factor authentication is already enabled")
	}

	// Generate 2FA secret
	key, err := s.twoFAService.GenerateSecret(user.Email)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to generate 2FA secret: %w", err)
	}

	// Generate backup codes
	backupCodes, err := s.twoFAService.GenerateBackupCodes(8)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to generate backup codes: %w", err)
	}

	// Store secret (not yet enabled)
	secret := key.Secret()
	user.TwoFactorSecret = &secret

	// Store backup codes
	backupCodesJSON, err := s.twoFAService.EncodeBackupCodes(backupCodes)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to encode backup codes: %w", err)
	}
	user.TwoFactorBackupCodes = &backupCodesJSON

	if err := s.db.WithContext(ctx).Save(&user).Error; err != nil {
		return nil, nil, nil, fmt.Errorf("failed to save 2FA setup: %w", err)
	}

	totpURL := s.twoFAService.GetTOTPURL(key)
	return &secret, &totpURL, backupCodes, nil
}

// Verify2FA verifies and enables 2FA with a code
func (s *AuthService) Verify2FA(ctx context.Context, userID uuid.UUID, code string) error {
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		return fmt.Errorf("user not found")
	}

	if user.TwoFactorSecret == nil {
		return fmt.Errorf("2FA setup not initiated")
	}

	// Validate code
	if !s.twoFAService.ValidateCode(*user.TwoFactorSecret, code) {
		return ErrInvalidTwoFactorCode
	}

	// Enable 2FA
	user.TwoFactorEnabled = true

	if err := s.db.WithContext(ctx).Save(&user).Error; err != nil {
		return fmt.Errorf("failed to enable 2FA: %w", err)
	}

	// Send backup codes via email
	if s.emailService.IsEnabled() && user.TwoFactorBackupCodes != nil {
		var backupCodes []string
		if err := json.Unmarshal([]byte(*user.TwoFactorBackupCodes), &backupCodes); err == nil {
			s.emailService.SendTwoFactorBackupCodes(user.Email, user.DisplayName, backupCodes)
		}
	}

	return nil
}

// Disable2FA disables two-factor authentication
func (s *AuthService) Disable2FA(ctx context.Context, userID uuid.UUID, password, code string) error {
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		return fmt.Errorf("user not found")
	}

	if !user.TwoFactorEnabled {
		return fmt.Errorf("two-factor authentication is not enabled")
	}

	// Verify password if user has one
	if user.PasswordHash != nil {
		if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)); err != nil {
			return ErrInvalidCredentials
		}
	}

	// Verify 2FA code or backup code
	valid := false
	if user.TwoFactorSecret != nil {
		valid = s.twoFAService.ValidateCode(*user.TwoFactorSecret, code)
	}

	// If regular code didn't work, try backup codes
	if !valid && user.TwoFactorBackupCodes != nil {
		isBackupValid, updatedCodes, err := s.twoFAService.ValidateBackupCode(*user.TwoFactorBackupCodes, code)
		if err == nil && isBackupValid {
			valid = true
			// Update backup codes
			if updatedCodesJSON, err := s.twoFAService.EncodeBackupCodes(updatedCodes); err == nil {
				user.TwoFactorBackupCodes = &updatedCodesJSON
			}
		}
	}

	if !valid {
		return ErrInvalidTwoFactorCode
	}

	// Disable 2FA
	user.TwoFactorEnabled = false
	user.TwoFactorSecret = nil
	user.TwoFactorBackupCodes = nil

	return s.db.WithContext(ctx).Save(&user).Error
}
