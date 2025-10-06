package config

import (
	"fmt"
	"net/url"
	"os"
	"strings"
)

type Config struct {
	Port             string
	DatabaseURL      string
	DatabaseHost     string
	DatabasePort     string
	DatabaseName     string
	DatabaseUser     string
	DatabasePassword string
	DatabaseSSLMode  string
	DatabaseTimeZone string
	AllowedOrigins   []string
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

	allowedOrigins := []string{"*"}
	if rawOrigins := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")); rawOrigins != "" {
		allowedOrigins = splitAndClean(rawOrigins)
	}

	return Config{
		Port:             port,
		DatabaseURL:      databaseURL,
		DatabaseHost:     host,
		DatabasePort:     portStr,
		DatabaseName:     dbName,
		DatabaseUser:     user,
		DatabasePassword: password,
		DatabaseSSLMode:  sslMode,
		DatabaseTimeZone: timezone,
		AllowedOrigins:   allowedOrigins,
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
