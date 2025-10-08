# Archer Aqua - Docker Hub

A modern, intelligent hydration tracking application with weather-based goal adjustments.

![Archer Aqua Hero](https://aqua.adarcher.app/assets/hero-image-VCssyCnr.png)

## Features

- 📊 **Personalized Hydration Goals**: Based on weight, age, activity level, and climate
- 🌤️ **Weather Integration**: Automatically adjusts goals based on local weather conditions
- 📅 **Calendar View**: Track your hydration history across days
- 🏆 **Achievements**: Unlock badges as you build healthy habits
- 🥤 **Custom Drinks**: Add your own beverages with custom hydration multipliers
- 🌍 **Timezone Support**: Accurate tracking across different locations
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🐳 **Containerized**: Easy deployment with Docker
- 🗄️ **PostgreSQL Integration**: Built-in database support

## Quick Start

1. Create a `.env.prod` file with your environment variables (see Environment Variables section below)

2. Run the application:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

3. Access the application at http://localhost:8080

## Docker Compose

```yaml
services:
  app:
    image: adarcher/archer-aqua:latest
    container_name: archer-aqua-prod
    ports:
      - "8080:8080"
    env_file:
      - .env.prod
    environment:
      - PORT=8080
      - FRONTEND_URL=${FRONTEND_URL}
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - GOOGLE_REDIRECT_URL=${GOOGLE_REDIRECT_URL}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USERNAME=${SMTP_USERNAME}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - SMTP_FROM_EMAIL=${SMTP_FROM_EMAIL}
      - SMTP_FROM_NAME=${SMTP_FROM_NAME}
      - EMAIL_VERIFICATION_REQUIRED=${EMAIL_VERIFICATION_REQUIRED}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15
    container_name: archer-aqua-postgres
    environment:
      POSTGRES_DB: archer_aqua
      POSTGRES_USER: archer_aqua_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

## Environment Variables

Create a `.env.prod` file with the following variables:

```bash
# Application
PORT=8080
FRONTEND_URL=http://localhost:8080
ALLOWED_ORIGINS=http://localhost:8080

# Database
DATABASE_URL=postgres://archer_aqua_user:yourpassword@postgres:5432/archer_aqua?sslmode=disable
POSTGRES_PASSWORD=your-secure-database-password

# Authentication
JWT_SECRET=your-secure-jwt-secret

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=http://localhost:8080/api/auth/google/callback

# Email/SMTP (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Archer Aqua
EMAIL_VERIFICATION_REQUIRED=true
```

## Ports

- **8080**: Main application port
- **5432**: PostgreSQL database port (exposed for external access if needed)

## Volumes

- `postgres_data`: Persistent storage for PostgreSQL data

## Health Checks

The application includes automatic health checks and will restart on failure thanks to the `restart: unless-stopped` policy.

## Support

For more information, visit the [main repository](https://github.com/AD-Archer/archer-aqua).