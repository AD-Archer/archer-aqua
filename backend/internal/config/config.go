package config

import (
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"
)

type Config struct {
	Port                      string
	DatabaseURL               string
	DatabaseHost              string
	DatabasePort              string
	DatabaseName              string
	DatabaseUser              string
	DatabasePassword          string
	DatabaseSSLMode           string
	DatabaseTimeZone          string
	AllowedOrigins            []string
	JWTSecret                 string
	JWTIssuer                 string
	JWTExpiry                 time.Duration
	FrontendURL               string
	HealthAppURL              string
	GoogleClientID            string
	GoogleClientSecret        string
	GoogleRedirectURL         string
	GoogleOAuthEnabled        bool
	SMTPHost                  string
	SMTPPort                  string
	SMTPUsername              string
	SMTPPassword              string
	SMTPFromEmail             string
	SMTPFromName              string
	SMTPEnabled               bool
	EmailVerificationRequired bool
	PrivacyVersion            string
	TermsVersion              string
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
	healthAppURL := strings.TrimSpace(os.Getenv("HEALTH_APP_URL"))
	// If a HEALTH_APP_URL isn't provided, allow using the Vite env variable (convenience for local dev)
	if healthAppURL == "" {
		healthAppURL = strings.TrimSpace(os.Getenv("VITE_ARCHER_HEALTH_URL"))
	}
	// As a last resort for local dev, attempt to read ../.env and parse the value directly
	if healthAppURL == "" {
		if data, err := os.ReadFile("../.env"); err == nil {
			lines := strings.Split(string(data), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}
				parts := strings.SplitN(line, "=", 2)
				if len(parts) != 2 {
					continue
				}
				key := strings.TrimSpace(parts[0])
				val := strings.TrimSpace(parts[1])
				// remove optional surrounding quotes
				val = strings.Trim(val, "\"'")
				if key == "HEALTH_APP_URL" || key == "VITE_ARCHER_HEALTH_URL" {
					healthAppURL = val
					break
				}
			}
		}
	}
	if healthAppURL == "" {
		// Provide a sensible default so deployments that don't set the env still allow the public health host
		healthAppURL = "https://health.adarcher.app"
	}

	allowedOrigins := []string{frontendURL}
	if rawOrigins := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")); rawOrigins != "" {
		allowedOrigins = splitAndClean(rawOrigins)
	}

	// If a health app URL is provided, include it in allowed origins (avoid duplicates)
	if healthAppURL != "" {
		found := false
		for _, o := range allowedOrigins {
			if o == healthAppURL {
				found = true
				break
			}
		}
		if !found {
			allowedOrigins = append(allowedOrigins, healthAppURL)
		}
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

	// SMTP Configuration
	smtpHost := strings.TrimSpace(os.Getenv("SMTP_HOST"))
	smtpPort := valueOrDefault("SMTP_PORT", "587")
	smtpUsername := strings.TrimSpace(os.Getenv("SMTP_USERNAME"))
	smtpPassword := strings.TrimSpace(os.Getenv("SMTP_PASSWORD"))
	smtpFromEmail := valueOrDefault("SMTP_FROM_EMAIL", smtpUsername)
	smtpFromName := valueOrDefault("SMTP_FROM_NAME", "Archer Aqua")
	smtpEnabled := smtpHost != "" && smtpUsername != "" && smtpPassword != ""
	emailVerificationRequired := valueOrDefault("EMAIL_VERIFICATION_REQUIRED", "false") == "true"
	privacyVersion := valueOrDefault("PRIVACY_VERSION", "2025-10-06")
	termsVersion := valueOrDefault("TERMS_VERSION", "2025-10-06")

	return Config{
		Port:                      port,
		DatabaseURL:               databaseURL,
		DatabaseHost:              host,
		DatabasePort:              portStr,
		DatabaseName:              dbName,
		DatabaseUser:              user,
		DatabasePassword:          password,
		DatabaseSSLMode:           sslMode,
		DatabaseTimeZone:          timezone,
		AllowedOrigins:            allowedOrigins,
		JWTSecret:                 jwtSecret,
		JWTIssuer:                 jwtIssuer,
		JWTExpiry:                 jwtExpiry,
		FrontendURL:               frontendURL,
        HealthAppURL:              healthAppURL,
		GoogleClientID:            googleClientID,
		GoogleClientSecret:        googleClientSecret,
		GoogleRedirectURL:         googleRedirectURL,
		GoogleOAuthEnabled:        googleEnabled,
		SMTPHost:                  smtpHost,
		SMTPPort:                  smtpPort,
		SMTPUsername:              smtpUsername,
		SMTPPassword:              smtpPassword,
		SMTPFromEmail:             smtpFromEmail,
		SMTPFromName:              smtpFromName,
		SMTPEnabled:               smtpEnabled,
		EmailVerificationRequired: emailVerificationRequired,
		PrivacyVersion:            privacyVersion,
		TermsVersion:              termsVersion,
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
