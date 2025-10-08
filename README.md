# Welcome to Archer Aqua

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

## Weather-Based Hydration

This app integrates with OpenWeatherMap to dynamically adjust your hydration goals based on:
- Temperature (higher temps = more hydration needed)
- Humidity levels (dry air increases needs)
- Real-time local conditions

## Project info

**URL**: https://aqua.adarcher.app

## How can I edit this code?

There are several ways of editing your application.


**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone https://github.com/AD-Archer/archer-aqua

# Step 2: Navigate to the project directory.
cd https://github.com/AD-Archer/archer-aqua

# Step 3: Install the necessary dependencies.
pnpm i

# Step 4: Start the development server with auto-reloading and an instant preview.
pnpm run dev
```

## Docker Deployment

This application can be deployed using Docker and Docker Compose. The Docker images are available on [Docker Hub](https://hub.docker.com/repository/docker/adarcher/archer-aqua/general).

### Features

- 🐳 **Containerized**: Easy deployment with Docker
- 🗄️ **PostgreSQL Integration**: Built-in database support
- 🔒 **Production Ready**: Optimized for production environments
- 🔄 **Auto-restart**: Services restart automatically on failure
- 🌐 **Environment Configurable**: Flexible configuration via environment variables

### Quick Start with Docker

1. Create a directory for deployment:
   ```sh
   mkdir archer-aqua-deploy
   cd archer-aqua-deploy
   ```

2. Download the production docker-compose file and environment template:
   ```sh
   wget https://raw.githubusercontent.com/AD-Archer/archer-aqua/main/docker-compose.prod.yml
   wget https://raw.githubusercontent.com/AD-Archer/archer-aqua/main/.env.example
   cp .env.example .env.prod
   ```

3. Edit the `.env.prod` file with your production values (database password, secrets, etc.)

4. Run the application:
   ```sh
   docker compose -f docker-compose.prod.yml up -d
   ```

   The application will be available at http://localhost:8080

### Environment Variables

Make sure to set the following environment variables in your `.env.prod` file:

- `POSTGRES_PASSWORD` - Database password
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgres://archer_aqua_user:password@postgres:5432/archer_aqua?sslmode=disable`)
- `JWT_SECRET` - Secret key for JWT tokens
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` - For OAuth authentication
- `SMTP_*` - Email service configuration
- Other application-specific settings

### Development

For development, clone the repository and use the development scripts:

```sh
git clone https://github.com/AD-Archer/archer-aqua.git
cd archer-aqua
pnpm install
pnpm run dev
```

### CI/CD

The project includes GitHub Actions workflow that automatically builds and pushes a single Docker image to Docker Hub on pushes to the main branch.

Docker Hub Repository: [adarcher/archer-aqua](https://hub.docker.com/repository/docker/adarcher/archer-aqua/general)

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
