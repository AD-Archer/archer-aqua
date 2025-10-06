package server

import (
	"context"
	"net/http"
	"time"

	"log/slog"

	"github.com/AD-Archer/archer-aqua/backend/internal/config"
	"github.com/AD-Archer/archer-aqua/backend/internal/handlers"
	"github.com/AD-Archer/archer-aqua/backend/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"gorm.io/gorm"
)

type Server struct {
	cfg    config.Config
	http   *http.Server
	logger *slog.Logger
}

func New(cfg config.Config, db *gorm.DB, logger *slog.Logger) *Server {
	userService := services.NewUserService(db)
	drinkService := services.NewDrinkService(db)
	hydrationService := services.NewHydrationService(db)

	api := handlers.NewAPI(userService, drinkService, hydrationService, logger)

	r := chi.NewRouter()
	configureMiddleware(r, cfg)
	registerRoutes(r, api)

	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	return &Server{
		cfg:    cfg,
		http:   httpServer,
		logger: logger,
	}
}

func (s *Server) Run() error {
	s.logger.Info("server listening", slog.String("addr", s.http.Addr))
	return s.http.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	s.logger.Info("server shutting down")
	return s.http.Shutdown(ctx)
}

func configureMiddleware(r chi.Router, cfg config.Config) {
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))
	r.Use(httprate.LimitByIP(100, time.Minute))

	corsHandler := cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Requested-With"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	})

	r.Use(corsHandler)
	r.Use(middleware.SetHeader("Cache-Control", "no-store"))
}

func registerRoutes(r chi.Router, api *handlers.API) {
	r.Get("/healthz", handlers.Health)

	r.Route("/api", func(r chi.Router) {
		r.Route("/users", func(r chi.Router) {
			r.Post("/", api.CreateUser)
			r.Route("/{userID}", func(r chi.Router) {
				r.Get("/", api.GetUser)
				r.Patch("/", api.UpdateUser)

				r.Get("/drinks", api.ListDrinks)
				r.Post("/drinks", api.CreateDrink)
				r.Patch("/drinks/{drinkID}", api.UpdateDrink)

				r.Get("/hydration/daily", api.DailySummary)
				r.Get("/hydration/stats", api.HydrationStats)
				r.Post("/hydration/logs", api.LogHydration)
			})
		})
	})
}
