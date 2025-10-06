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
	ErrUserAlreadyExists   = errors.New("user already exists")
	ErrInvalidCredentials  = errors.New("invalid email or password")
	ErrGoogleOAuthDisabled = errors.New("google oauth is not configured")
)

type AuthService struct {
	db          *gorm.DB
	cfg         config.Config
	oauthConfig *oauth2.Config
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
			Scopes: []string{
				"openid",
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
			},
			Endpoint: google.Endpoint,
		}
	}

	return &AuthService{db: db, cfg: cfg, oauthConfig: oauthCfg}
}

func (s *AuthService) Register(ctx context.Context, email, password, displayName string) (*models.User, string, bool, error) {
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
