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

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
