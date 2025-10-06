import { TemperatureUnit } from '@/types/water';

export interface WeatherData {
  temperature: number; // in Celsius
  humidity: number; // percentage
  description: string;
  icon: string;
  location: string;
  timestamp: number;
  feelsLike: number; // in Celsius
  uvIndex?: number;
  windSpeed?: number; // in km/h
  precipitation?: number; // in mm
  date?: string; // YYYY-MM-DD format for daily weather
}

export interface WeatherCache {
  data: WeatherData;
  cachedAt: number;
  refreshCount: number; // Track manual refreshes
  lastRefreshDate: string; // YYYY-MM-DD format
}

export interface WeeklyWeatherCache {
  dailyWeather: Record<string, WeatherData>; // date -> weather data
  location: { lat: number; lon: number; name: string };
  cachedAt: number;
  lastUpdated: string; // YYYY-MM-DD format
}

export interface LocationPreference {
  type: 'auto' | 'manual';
  manualLocation?: { lat: number; lon: number; name: string };
}

const WEATHER_CACHE_KEY = 'archer_aqua_weather_cache';
const WEEKLY_WEATHER_CACHE_KEY = 'archer_aqua_weekly_weather_cache';
const LOCATION_PREFERENCE_KEY = 'archer_aqua_location_preference';
const WEATHER_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const MAX_WEEKLY_REFRESHES = 2;

/**
 * Get the user's current coordinates using the Geolocation API
 */
export async function getUserLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(`Failed to get location: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Get location name from coordinates using reverse geocoding
 */
async function getLocationName(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const parts = [];
      if (result.name) parts.push(result.name);
      if (result.admin1) parts.push(result.admin1);
      if (result.country) parts.push(result.country);
      return parts.join(', ') || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    }
    
    return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
  } catch (error) {
    return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
  }
}

/**
 * Search for location coordinates by query (city name, zip code, airport code)
 */
export async function searchLocation(query: string): Promise<{ lat: number; lon: number; name: string }[]> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to search location');
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map((result: { latitude: number; longitude: number; name?: string; admin1?: string; country?: string }) => {
      const parts = [];
      if (result.name) parts.push(result.name);
      if (result.admin1) parts.push(result.admin1);
      if (result.country) parts.push(result.country);
      
      return {
        lat: result.latitude,
        lon: result.longitude,
        name: parts.join(', '),
      };
    });
  } catch (error) {
    console.error('Error searching location:', error);
    return [];
  }
}

/**
 * Get or set location preference
 */
export function getLocationPreference(): LocationPreference {
  try {
    const stored = localStorage.getItem(LOCATION_PREFERENCE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading location preference:', error);
  }
  return { type: 'auto' };
}

export function setLocationPreference(preference: LocationPreference): void {
  localStorage.setItem(LOCATION_PREFERENCE_KEY, JSON.stringify(preference));
}

/**
 * Get location based on user preference
 */
export async function getPreferredLocation(): Promise<{ lat: number; lon: number }> {
  const preference = getLocationPreference();
  
  if (preference.type === 'manual' && preference.manualLocation) {
    return {
      lat: preference.manualLocation.lat,
      lon: preference.manualLocation.lon,
    };
  }
  
  // Auto-detect location
  return getUserLocation();
}

/**
 * Get weather description and icon code from WMO weather code
 * WMO Weather interpretation codes (WW): https://open-meteo.com/en/docs
 */
function getWeatherInfo(weatherCode: number): { description: string; icon: string } {
  const weatherMap: Record<number, { description: string; icon: string }> = {
    0: { description: 'clear sky', icon: '01d' },
    1: { description: 'mainly clear', icon: '01d' },
    2: { description: 'partly cloudy', icon: '02d' },
    3: { description: 'overcast', icon: '03d' },
    45: { description: 'foggy', icon: '50d' },
    48: { description: 'depositing rime fog', icon: '50d' },
    51: { description: 'light drizzle', icon: '09d' },
    53: { description: 'moderate drizzle', icon: '09d' },
    55: { description: 'dense drizzle', icon: '09d' },
    56: { description: 'light freezing drizzle', icon: '09d' },
    57: { description: 'dense freezing drizzle', icon: '09d' },
    61: { description: 'slight rain', icon: '10d' },
    63: { description: 'moderate rain', icon: '10d' },
    65: { description: 'heavy rain', icon: '10d' },
    66: { description: 'light freezing rain', icon: '13d' },
    67: { description: 'heavy freezing rain', icon: '13d' },
    71: { description: 'slight snow fall', icon: '13d' },
    73: { description: 'moderate snow fall', icon: '13d' },
    75: { description: 'heavy snow fall', icon: '13d' },
    77: { description: 'snow grains', icon: '13d' },
    80: { description: 'slight rain showers', icon: '09d' },
    81: { description: 'moderate rain showers', icon: '09d' },
    82: { description: 'violent rain showers', icon: '09d' },
    85: { description: 'slight snow showers', icon: '13d' },
    86: { description: 'heavy snow showers', icon: '13d' },
    95: { description: 'thunderstorm', icon: '11d' },
    96: { description: 'thunderstorm with slight hail', icon: '11d' },
    99: { description: 'thunderstorm with heavy hail', icon: '11d' },
  };

  return weatherMap[weatherCode] || { description: 'unknown', icon: '01d' };
}

/**
 * Fetch weather data from Open-Meteo API (no API key required!)
 */
export async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData> {
  // Open-Meteo API - completely free, no API key needed!
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();
    const current = data.current;
    
    // Get location name
    const location = await getLocationName(lat, lon);
    
    // Get weather description and icon from weather code
    const weatherInfo = getWeatherInfo(current.weather_code);

    return {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      location: location,
      timestamp: Date.now(),
      feelsLike: current.apparent_temperature,
      windSpeed: current.wind_speed_10m,
      precipitation: current.precipitation,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch weather data');
  }
}

/**
 * Fetch weekly weather forecast (7 days)
 */
export async function fetchWeeklyWeatherData(lat: number, lon: number): Promise<WeatherData[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,relative_humidity_2m_mean,precipitation_sum,weather_code,wind_speed_10m_max&timezone=auto&forecast_days=7`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();
    const daily = data.daily;
    
    // Get location name
    const location = await getLocationName(lat, lon);
    
    // Map daily data to WeatherData array
    const weeklyWeather: WeatherData[] = [];
    for (let i = 0; i < daily.time.length; i++) {
      const weatherInfo = getWeatherInfo(daily.weather_code[i]);
      const avgTemp = (daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2;
      
      weeklyWeather.push({
        temperature: avgTemp,
        humidity: daily.relative_humidity_2m_mean[i],
        description: weatherInfo.description,
        icon: weatherInfo.icon,
        location: location,
        timestamp: new Date(daily.time[i]).getTime(),
        feelsLike: daily.apparent_temperature_max[i],
        windSpeed: daily.wind_speed_10m_max[i],
        precipitation: daily.precipitation_sum[i],
        date: daily.time[i], // YYYY-MM-DD format
      });
    }
    
    return weeklyWeather;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch weekly weather data');
  }
}

/**
 * Get cached weather data if it exists and is still valid
 */
export function getCachedWeather(): WeatherCache | null {
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!cached) return null;

    const weatherCache: WeatherCache = JSON.parse(cached);
    const now = Date.now();
    const cacheAge = now - weatherCache.cachedAt;

    // Check if cache is still valid (within 7 days)
    if (cacheAge > WEATHER_CACHE_DURATION) {
      // Cache expired, remove it
      localStorage.removeItem(WEATHER_CACHE_KEY);
      return null;
    }

    return weatherCache;
  } catch (error) {
    console.error('Error reading weather cache:', error);
    return null;
  }
}

/**
 * Get cached weekly weather data
 */
export function getCachedWeeklyWeather(): WeeklyWeatherCache | null {
  try {
    const cached = localStorage.getItem(WEEKLY_WEATHER_CACHE_KEY);
    if (!cached) return null;

    const weeklyCache: WeeklyWeatherCache = JSON.parse(cached);
    const now = Date.now();
    const cacheAge = now - weeklyCache.cachedAt;

    // Check if cache is still valid (within 7 days)
    if (cacheAge > WEATHER_CACHE_DURATION) {
      localStorage.removeItem(WEEKLY_WEATHER_CACHE_KEY);
      return null;
    }

    return weeklyCache;
  } catch (error) {
    console.error('Error reading weekly weather cache:', error);
    return null;
  }
}

/**
 * Get weather for a specific date from weekly cache
 */
export function getWeatherForDate(date: string): WeatherData | null {
  const weeklyCache = getCachedWeeklyWeather();
  if (!weeklyCache) return null;
  return weeklyCache.dailyWeather[date] || null;
}

/**
 * Save weather data to cache
 */
export function cacheWeatherData(data: WeatherData, isManualRefresh: boolean = false): void {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const existingCache = getCachedWeather();
    
    let refreshCount = 0;
    let lastRefreshDate = today;

    if (isManualRefresh && existingCache) {
      // Reset count if it's a new week (different date from last refresh)
      if (existingCache.lastRefreshDate !== today) {
        const daysDiff = Math.floor(
          (new Date(today).getTime() - new Date(existingCache.lastRefreshDate).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        
        // Reset count if it's been 7+ days
        if (daysDiff >= 7) {
          refreshCount = 1;
        } else {
          refreshCount = existingCache.refreshCount + 1;
        }
      } else {
        refreshCount = existingCache.refreshCount + 1;
      }
      lastRefreshDate = today;
    }

    const weatherCache: WeatherCache = {
      data,
      cachedAt: Date.now(),
      refreshCount,
      lastRefreshDate,
    };

    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherCache));
  } catch (error) {
    console.error('Error caching weather data:', error);
  }
}

/**
 * Save weekly weather data to cache
 */
export function cacheWeeklyWeatherData(
  weatherArray: WeatherData[], 
  location: { lat: number; lon: number; name: string }
): void {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dailyWeather: Record<string, WeatherData> = {};
    
    weatherArray.forEach(weather => {
      if (weather.date) {
        dailyWeather[weather.date] = weather;
      }
    });

    const weeklyCache: WeeklyWeatherCache = {
      dailyWeather,
      location,
      cachedAt: Date.now(),
      lastUpdated: today,
    };

    localStorage.setItem(WEEKLY_WEATHER_CACHE_KEY, JSON.stringify(weeklyCache));
  } catch (error) {
    console.error('Error caching weekly weather data:', error);
  }
}

/**
 * Check if user can manually refresh the weather (hasn't exceeded the weekly limit)
 */
export function canRefreshWeather(): { canRefresh: boolean; remaining: number; resetDate: string } {
  const cached = getCachedWeather();
  
  if (!cached) {
    return { canRefresh: true, remaining: MAX_WEEKLY_REFRESHES, resetDate: '' };
  }

  const today = new Date().toISOString().split('T')[0];
  const lastRefreshDate = new Date(cached.lastRefreshDate);
  const resetDate = new Date(lastRefreshDate);
  resetDate.setDate(resetDate.getDate() + 7);

  // Check if we're in a new week
  const daysSinceLastRefresh = Math.floor(
    (new Date(today).getTime() - lastRefreshDate.getTime()) / 
    (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastRefresh >= 7) {
    return { 
      canRefresh: true, 
      remaining: MAX_WEEKLY_REFRESHES, 
      resetDate: resetDate.toLocaleDateString() 
    };
  }

  const remaining = MAX_WEEKLY_REFRESHES - cached.refreshCount;
  return { 
    canRefresh: remaining > 0, 
    remaining: Math.max(0, remaining),
    resetDate: resetDate.toLocaleDateString()
  };
}

/**
 * Get or fetch weather data with caching
 */
export async function getWeatherData(forceRefresh: boolean = false): Promise<WeatherData> {
  // Check cache first if not forcing refresh
  if (!forceRefresh) {
    const cached = getCachedWeather();
    if (cached) {
      return cached.data;
    }
  }

  // Check refresh limit if forcing refresh
  if (forceRefresh) {
    const { canRefresh } = canRefreshWeather();
    if (!canRefresh) {
      throw new Error('Weekly refresh limit reached. Cache will reset in a few days.');
    }
  }

  // Fetch fresh data using preferred location
  const location = await getPreferredLocation();
  const weatherData = await fetchWeatherData(location.lat, location.lon);
  cacheWeatherData(weatherData, forceRefresh);
  
  // Also fetch and cache weekly data
  try {
    const weeklyData = await fetchWeeklyWeatherData(location.lat, location.lon);
    const locationName = await getLocationName(location.lat, location.lon);
    cacheWeeklyWeatherData(weeklyData, { ...location, name: locationName });
  } catch (error) {
    console.error('Failed to cache weekly weather:', error);
  }
  
  return weatherData;
}

/**
 * Get or fetch weekly weather data
 */
export async function getWeeklyWeatherData(forceRefresh: boolean = false): Promise<WeatherData[]> {
  // Check cache first if not forcing refresh
  if (!forceRefresh) {
    const cached = getCachedWeeklyWeather();
    if (cached) {
      return Object.values(cached.dailyWeather).sort((a, b) => 
        (a.timestamp || 0) - (b.timestamp || 0)
      );
    }
  }

  // Fetch fresh data using preferred location
  const location = await getPreferredLocation();
  const weeklyData = await fetchWeeklyWeatherData(location.lat, location.lon);
  const locationName = await getLocationName(location.lat, location.lon);
  cacheWeeklyWeatherData(weeklyData, { ...location, name: locationName });
  
  return weeklyData;
}

/**
 * Convert temperature between Celsius and Fahrenheit
 */
export function convertTemperature(celsius: number, toUnit: TemperatureUnit): number {
  if (toUnit === 'F') {
    return (celsius * 9/5) + 32;
  }
  return celsius;
}

/**
 * Format temperature with unit
 */
export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  const temp = convertTemperature(celsius, unit);
  return `${Math.round(temp)}°${unit}`;
}

/**
 * Determine climate category based on temperature
 */
export function getClimateFromTemperature(celsius: number): 'cold' | 'moderate' | 'hot' {
  if (celsius < 15) return 'cold';
  if (celsius > 25) return 'hot';
  return 'moderate';
}

/**
 * Calculate weather-based hydration multiplier
 * Returns a multiplier to adjust the base hydration goal
 */
export function calculateWeatherMultiplier(weather: WeatherData): number {
  let multiplier = 1.0;

  // Temperature adjustment
  if (weather.temperature > 30) {
    multiplier += 0.3; // Very hot
  } else if (weather.temperature > 25) {
    multiplier += 0.2; // Hot
  } else if (weather.temperature < 10) {
    multiplier -= 0.1; // Cold
  }

  // Humidity adjustment (low humidity = more dehydration)
  if (weather.humidity < 30) {
    multiplier += 0.15; // Very dry
  } else if (weather.humidity < 50) {
    multiplier += 0.05; // Dry
  }

  // Ensure multiplier stays within reasonable bounds
  return Math.max(0.8, Math.min(1.5, multiplier));
}

/**
 * Get weather icon name for Lucide icons based on icon code
 */
export function getWeatherIconName(iconCode: string): string {
  const iconMap: Record<string, string> = {
    '01d': 'sun', // clear sky day
    '01n': 'moon', // clear sky night
    '02d': 'cloud-sun', // few clouds day
    '02n': 'cloud-moon', // few clouds night
    '03d': 'cloud', // scattered clouds
    '03n': 'cloud', // scattered clouds
    '04d': 'cloudy', // broken clouds
    '04n': 'cloudy', // broken clouds
    '09d': 'cloud-drizzle', // shower rain
    '09n': 'cloud-drizzle', // shower rain
    '10d': 'cloud-rain', // rain day
    '10n': 'cloud-rain', // rain night
    '11d': 'cloud-lightning', // thunderstorm
    '11n': 'cloud-lightning', // thunderstorm
    '13d': 'cloud-snow', // snow
    '13n': 'cloud-snow', // snow
    '50d': 'cloud-fog', // mist
    '50n': 'cloud-fog', // mist
  };
  return iconMap[iconCode] || 'cloud-sun';
}

/**
 * Clear weather cache (for testing or manual reset)
 */
export function clearWeatherCache(): void {
  localStorage.removeItem(WEATHER_CACHE_KEY);
  localStorage.removeItem(WEEKLY_WEATHER_CACHE_KEY);
}
