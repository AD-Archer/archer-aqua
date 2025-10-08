# Welcome to Archer Aqua

A modern, intelligent hydration tracking application with weather-based goal adjustments.

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

### Setup Weather Integration

1. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Create a `.env` file in the root directory:
   ```bash
   VITE_OPENWEATHERMAP_API_KEY=your_api_key_here
   ```
3. Restart the development server

For detailed documentation, see [WEATHER_INTEGRATION.md](./WEATHER_INTEGRATION.md)

## Project info

**URL**: https://lovable.dev/projects/4e7f2d06-a668-40e8-9cbe-8acc3d732831

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4e7f2d06-a668-40e8-9cbe-8acc3d732831) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4e7f2d06-a668-40e8-9cbe-8acc3d732831) and click on Share -> Publish.

## Docker Deployment

This application can be deployed using Docker and Docker Compose. The Docker images are available on Docker Hub.

### Prerequisites

- Docker and Docker Compose installed
- A PostgreSQL database (can be run separately or use the commented service in docker-compose.yml)

### Quick Start with Docker

1. Create a directory for deployment:
   ```sh
   mkdir archer-aqua-deploy
   cd archer-aqua-deploy
   ```

2. Download the docker-compose.yml and .env files:
   ```sh
   # Download from your repository or copy them
   wget https://raw.githubusercontent.com/AD-Archer/archer-aqua/main/docker-compose.yml
   wget https://raw.githubusercontent.com/AD-Archer/archer-aqua/main/.env
   ```

3. Edit the `.env` file with your production values (database URL, secrets, etc.)

4. Run the application:
   ```sh
   docker compose up -d
   ```

   The application will be available at http://localhost (both frontend and API)

### Using External PostgreSQL

The docker-compose.yml includes a commented PostgreSQL service. For production, use an external PostgreSQL database and update the `DATABASE_URL` in your `.env` file.

# Uncomment the postgres service in docker-compose.yml if you want to run it locally:
# postgres:
#   image: postgres:15
#   environment:
#     POSTGRES_DB: archer-aqua
#     POSTGRES_USER: archer_aqua_user
#     POSTGRES_PASSWORD: JPMrkHW2eNHZ4KGax5nK8yzUailA6dO58RXijdwN
#   ports:
#     - "5432:5432"
#   volumes:
#     - postgres_data:/var/lib/postgresql/data
#   restart: unless-stopped

# volumes:
#   postgres_data:

### Environment Variables

Make sure to set the following environment variables in your `.env` file:

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for OAuth
- `DATABASE_URL` for PostgreSQL connection
- `JWT_SECRET` for session management
- SMTP settings for email functionality

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

Image available at: `adarcher/archer-aqua`

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
