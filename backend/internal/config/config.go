package config

import (
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"
)

type Config struct {
	Port               string
	DatabaseURL        string
	DatabaseHost       string
	DatabasePort       string
	DatabaseName       string
	DatabaseUser       string
	DatabasePassword   string
	DatabaseSSLMode    string
	DatabaseTimeZone   string
	AllowedOrigins     []string
	JWTSecret          string
	JWTIssuer          string
	JWTExpiry          time.Duration
	FrontendURL        string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	GoogleOAuthEnabled bool
}

func Load() (Config, error) {
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}

	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))

	host := valueOrDefault("DB_HOST", "localhost")
	portStr := valueOrDefault("DB_PORT", "5432")
	dbName := valueOrDefault("DB_NAME", "archer_aqua")
	user := valueOrDefault("DB_USER", "archer_aqua")
	password := os.Getenv("DB_PASSWORD")
	sslMode := valueOrDefault("DB_SSLMODE", "disable")
	timezone := valueOrDefault("DB_TIMEZONE", "UTC")

	if databaseURL == "" {
		credentials := user
		if password != "" {
			credentials = fmt.Sprintf("%s:%s", url.PathEscape(user), url.PathEscape(password))
		} else {
			credentials = url.PathEscape(user)
		}

		params := url.Values{}
		params.Set("sslmode", sslMode)
		params.Set("TimeZone", timezone)

		databaseURL = fmt.Sprintf("postgres://%s@%s:%s/%s?%s", credentials, host, portStr, url.PathEscape(dbName), params.Encode())
	}

	frontendURL := valueOrDefault("FRONTEND_URL", "http://localhost:5173")

	allowedOrigins := []string{frontendURL}
	if rawOrigins := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")); rawOrigins != "" {
		allowedOrigins = splitAndClean(rawOrigins)
	}

	jwtSecret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if jwtSecret == "" {
		return Config{}, fmt.Errorf("JWT_SECRET must be provided")
	}

	jwtIssuer := valueOrDefault("JWT_ISSUER", "archer-aqua")
	jwtExpiryStr := valueOrDefault("JWT_EXPIRES_IN", "168h")
	jwtExpiry, err := time.ParseDuration(jwtExpiryStr)
	if err != nil {
		return Config{}, fmt.Errorf("invalid JWT_EXPIRES_IN duration: %w", err)
	}

	googleClientID := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_ID"))
	googleClientSecret := strings.TrimSpace(os.Getenv("GOOGLE_CLIENT_SECRET"))
	googleRedirectURL := valueOrDefault("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/auth/google/callback")
	googleEnabled := googleClientID != "" && googleClientSecret != ""

	return Config{
		Port:               port,
		DatabaseURL:        databaseURL,
		DatabaseHost:       host,
		DatabasePort:       portStr,
		DatabaseName:       dbName,
		DatabaseUser:       user,
		DatabasePassword:   password,
		DatabaseSSLMode:    sslMode,
		DatabaseTimeZone:   timezone,
		AllowedOrigins:     allowedOrigins,
		JWTSecret:          jwtSecret,
		JWTIssuer:          jwtIssuer,
		JWTExpiry:          jwtExpiry,
		FrontendURL:        frontendURL,
		GoogleClientID:     googleClientID,
		GoogleClientSecret: googleClientSecret,
		GoogleRedirectURL:  googleRedirectURL,
		GoogleOAuthEnabled: googleEnabled,
	}, nil
}

func splitAndClean(value string) []string {
	parts := strings.Split(value, ",")
	clean := make([]string, 0, len(parts))
	for _, part := range parts {
		token := strings.TrimSpace(part)
		if token != "" {
			clean = append(clean, token)
		}
	}

	if len(clean) == 0 {
		return []string{"*"}
	}

	return clean
}

func valueOrDefault(envKey, fallback string) string {
	value := strings.TrimSpace(os.Getenv(envKey))
	if value == "" {
		return fallback
	}
	return value
}
