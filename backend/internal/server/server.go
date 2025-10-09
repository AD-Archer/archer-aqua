package server

import (
	"context"
	"net/http"
	"os"
	"time"

	"log/slog"

	"github.com/AD-Archer/archer-aqua/backend/internal/config"
	"github.com/AD-Archer/archer-aqua/backend/internal/handlers"
	appmiddleware "github.com/AD-Archer/archer-aqua/backend/internal/middleware"
	"github.com/AD-Archer/archer-aqua/backend/internal/services"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
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
	dailyGoalService := services.NewDailyGoalService(db)
	hydrationService := services.NewHydrationService(db, dailyGoalService)
	authService := services.NewAuthService(db, cfg)
	weatherService := services.NewWeatherService(db)

	api := handlers.NewAPI(userService, drinkService, hydrationService, dailyGoalService, authService, weatherService, logger)

	r := chi.NewRouter()
	configureMiddleware(r, cfg)
	authMiddleware := appmiddleware.RequireAuth(authService)
	registerRoutes(r, api, authMiddleware)

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
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Timeout(60 * time.Second))
	r.Use(httprate.LimitByIP(1000, time.Minute))

	corsHandler := cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Requested-With"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	})

	r.Use(corsHandler)
	r.Use(chimiddleware.SetHeader("Cache-Control", "no-store"))
}

func registerRoutes(r chi.Router, api *handlers.API, authMiddleware func(http.Handler) http.Handler) {
	r.Get("/healthz", handlers.Health)

	r.Route("/api", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", api.Register)
			r.Post("/login", api.Login)
			r.Get("/google/login", api.BeginGoogleOAuth)
			r.Get("/google/callback", api.GoogleOAuthCallback)
			r.With(authMiddleware).Get("/me", api.Me)
			r.With(authMiddleware).Post("/accept-policies", api.AcceptPolicies)
			r.With(authMiddleware).Post("/accept-privacy", api.AcceptPrivacy)
			r.With(authMiddleware).Post("/accept-terms", api.AcceptTerms)

			// Password management
			r.Post("/forgot-password", api.ForgotPassword)
			r.Post("/reset-password", api.ResetPassword)
			r.Post("/verify-email", api.VerifyEmail)
		})

		r.With(authMiddleware).Route("/users", func(r chi.Router) {
			r.Post("/", api.CreateUser)
			r.Route("/{userID}", func(r chi.Router) {
				r.Get("/", api.GetUser)
				r.Patch("/", api.UpdateUser)
				r.Delete("/", api.DeleteUserAccount)
				r.Get("/export", api.ExportUserData)
				r.Post("/import", api.ImportUserData)

				r.Get("/drinks", api.ListDrinks)
				r.Post("/drinks", api.CreateDrink)
				r.Patch("/drinks/{drinkID}", api.UpdateDrink)
				r.Delete("/drinks/{drinkID}", api.DeleteDrink)

				r.Get("/hydration/daily", api.DailySummary)
				r.Get("/hydration/stats", api.HydrationStats)
				r.Post("/hydration/logs", api.LogHydration)
				r.Delete("/hydration/logs/{logID}", api.DeleteHydrationLog)

				r.Get("/hydration/goals/daily", api.GetDailyGoal)
				r.Post("/hydration/goals/daily", api.SetDailyGoal)
				r.Delete("/hydration/goals/daily", api.DeleteDailyGoal)

				// Weather endpoints
				r.Get("/weather/current", api.GetCurrentWeather)
				r.Post("/weather", api.SaveWeatherData)
				r.Get("/weather/history", api.GetWeatherHistory)

				// Security endpoints
				r.Post("/change-password", api.ChangePassword)
				r.Post("/set-password", api.SetPassword)
				r.Delete("/password", api.RemovePassword)
				r.Post("/send-verification", api.SendEmailVerification)
				r.Post("/enable-2fa", api.Enable2FA)
				r.Post("/verify-2fa", api.Verify2FA)
				r.Post("/disable-2fa", api.Disable2FA)
			})
		})
	})

	// Serve static files for all other routes (SPA fallback)
	fileServer := http.FileServer(http.Dir("./static"))

	// Explicitly serve the SPA for the reset password route (no auth required)
	r.Get("/reset-password", func(w http.ResponseWriter, req *http.Request) {
		http.ServeFile(w, req, "./static/index.html")
	})

	r.Get("/*", func(w http.ResponseWriter, req *http.Request) {
		if req.URL.Path == "/" || req.URL.Path == "" {
			http.ServeFile(w, req, "./static/index.html")
			return
		}
		// Check if file exists, if not serve index.html for SPA routing
		path := "./static" + req.URL.Path
		if _, err := os.Stat(path); os.IsNotExist(err) {
			http.ServeFile(w, req, "./static/index.html")
			return
		}
		fileServer.ServeHTTP(w, req)
	})
}
