import { DayRecord, UserStats, Achievement, UserProfile, CustomDrinkType, VolumeUnit, WeightUnit, TemperatureUnit, ProgressWheelStyle } from '@/types/water';
import { getCachedWeather, calculateWeatherMultiplier, getWeatherForDate } from './weather';

const STORAGE_KEYS = {
  DAYS: 'archer_aqua_days',
  STATS: 'archer_aqua_stats',
  GOAL: 'archer_aqua_goal',
  GOAL_MODE: 'archer_aqua_goal_mode',
  USER: 'archer_aqua_user',
  PROFILE: 'archer_aqua_profile',
  IS_AUTHENTICATED: 'archer_aqua_auth',
  AUTH_TOKEN: 'archer_aqua_auth_token',
  CUSTOM_DRINKS: 'archer_aqua_custom_drinks',
  UNIT_PREFERENCE: 'archer_aqua_unit_preference',
  WEIGHT_UNIT_PREFERENCE: 'archer_aqua_weight_unit_preference',
  TEMPERATURE_UNIT_PREFERENCE: 'archer_aqua_temperature_unit_preference',
  TIMEZONE: 'archer_aqua_timezone',
  USE_WEATHER_ADJUSTMENT: 'archer_aqua_use_weather_adjustment',
  PROGRESS_WHEEL_STYLE: 'archer_aqua_progress_wheel_style',
  BACKEND_USER_ID: 'archer_aqua_backend_user_id',
  BACKEND_DRINK_MAP: 'archer_aqua_backend_drink_map',
  POLICIES_ACCEPTED_VERSION: 'archer_aqua_policies_version',
  POLICIES_ACCEPTED_AT: 'archer_aqua_policies_accepted_at',
  PWA_INSTALL_DISMISSED_AT: 'archer_aqua_pwa_install_dismissed_at',
};

export const DEFAULT_GOAL = 2500; // 2.5L in ml

// Calculate personalized hydration goal based on user profile
export function calculatePersonalizedGoal(profile: UserProfile, useWeatherAdjustment: boolean = true): number {
  // Base calculation: 35ml per kg of body weight
  let baseGoal = profile.weight * 35;

  // Adjust for activity level
  const activityMultipliers = {
    sedentary: 1.0,
    light: 1.1,
    moderate: 1.2,
    active: 1.3,
    very_active: 1.5,
  };
  baseGoal *= activityMultipliers[profile.activityLevel];

  // Adjust for climate (only if not using weather adjustment)
  if (!useWeatherAdjustment) {
    const climateMultipliers = {
      cold: 0.9,
      moderate: 1.0,
      hot: 1.2,
    };
    baseGoal *= climateMultipliers[profile.climate];
  }

  // Adjust for age (older adults need slightly more)
  if (profile.age > 65) {
    baseGoal *= 1.1;
  }

  // Apply weather-based adjustment if enabled and weather data is available
  if (useWeatherAdjustment) {
    const cachedWeather = getCachedWeather();
    if (cachedWeather) {
      const weatherMultiplier = calculateWeatherMultiplier(cachedWeather.data);
      baseGoal *= weatherMultiplier;
    } else {
      // Fallback to profile climate if no weather data
      const climateMultipliers = {
        cold: 0.9,
        moderate: 1.0,
        hot: 1.2,
      };
      baseGoal *= climateMultipliers[profile.climate];
    }
  }

  // Round to nearest 100ml
  return Math.round(baseGoal / 100) * 100;
}

// Calculate personalized hydration goal for a specific date
export function calculatePersonalizedGoalForDate(
  profile: UserProfile, 
  date: string,
  useWeatherAdjustment: boolean = true
): number {
  // Base calculation: 35ml per kg of body weight
  let baseGoal = profile.weight * 35;

  // Adjust for activity level
  const activityMultipliers = {
    sedentary: 1.0,
    light: 1.1,
    moderate: 1.2,
    active: 1.3,
    very_active: 1.5,
  };
  baseGoal *= activityMultipliers[profile.activityLevel];

  // Adjust for climate (only if not using weather adjustment)
  if (!useWeatherAdjustment) {
    const climateMultipliers = {
      cold: 0.9,
      moderate: 1.0,
      hot: 1.2,
    };
    baseGoal *= climateMultipliers[profile.climate];
  }

  // Adjust for age (older adults need slightly more)
  if (profile.age > 65) {
    baseGoal *= 1.1;
  }

  // Apply weather-based adjustment for specific date if enabled
  if (useWeatherAdjustment) {
    const weatherForDate = getWeatherForDate(date);
    if (weatherForDate) {
      const weatherMultiplier = calculateWeatherMultiplier(weatherForDate);
      baseGoal *= weatherMultiplier;
    } else {
      // Fallback to profile climate if no weather data
      const climateMultipliers = {
        cold: 0.9,
        moderate: 1.0,
        hot: 1.2,
      };
      baseGoal *= climateMultipliers[profile.climate];
    }
  }

  // Round to nearest 100ml
  return Math.round(baseGoal / 100) * 100;
}

// User Profile Management
export function getUserProfile(): UserProfile | null {
  const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
  if (data) {
    const profile = JSON.parse(data);
    return {
      ...profile,
      createdAt: new Date(profile.createdAt),
    };
  }
  return null;
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

// Simple Auth Management
export function saveUser(email: string, name: string): void {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ email, name }));
  localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
}

export function getUser(): { email: string; name: string } | null {
  const data = localStorage.getItem(STORAGE_KEYS.USER);
  return data ? JSON.parse(data) : null;
}

export function saveAuthToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
}

export function getAuthToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export function clearAuthToken(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
  localStorage.removeItem(STORAGE_KEYS.BACKEND_USER_ID);
  localStorage.removeItem(STORAGE_KEYS.BACKEND_DRINK_MAP);
  clearPoliciesAcceptance();
}

export function getBackendUserId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.BACKEND_USER_ID);
}

export function saveBackendUserId(userId: string): void {
  localStorage.setItem(STORAGE_KEYS.BACKEND_USER_ID, userId);
}

export function clearBackendUserId(): void {
  localStorage.removeItem(STORAGE_KEYS.BACKEND_USER_ID);
}

export function getBackendDrinkMap(): Record<string, string> {
  const stored = localStorage.getItem(STORAGE_KEYS.BACKEND_DRINK_MAP);
  return stored ? JSON.parse(stored) : {};
}

export function saveBackendDrinkMap(map: Record<string, string>): void {
  localStorage.setItem(STORAGE_KEYS.BACKEND_DRINK_MAP, JSON.stringify(map));
}

export function savePoliciesAcceptance(version: string): void {
  localStorage.setItem(STORAGE_KEYS.POLICIES_ACCEPTED_VERSION, version);
  localStorage.setItem(STORAGE_KEYS.POLICIES_ACCEPTED_AT, new Date().toISOString());
}

export function getPoliciesAcceptedVersion(): string | null {
  return localStorage.getItem(STORAGE_KEYS.POLICIES_ACCEPTED_VERSION);
}

export function getPoliciesAcceptedAt(): Date | null {
  const raw = localStorage.getItem(STORAGE_KEYS.POLICIES_ACCEPTED_AT);
  return raw ? new Date(raw) : null;
}

export function clearPoliciesAcceptance(): void {
  localStorage.removeItem(STORAGE_KEYS.POLICIES_ACCEPTED_VERSION);
  localStorage.removeItem(STORAGE_KEYS.POLICIES_ACCEPTED_AT);
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken()) || localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === 'true';
}

export function logout(): void {
  clearAuthToken();
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.PROFILE);
  localStorage.removeItem(STORAGE_KEYS.GOAL);
  localStorage.removeItem(STORAGE_KEYS.DAYS);
  localStorage.removeItem(STORAGE_KEYS.STATS);
  clearPoliciesAcceptance();
}

export function getTodayKey(): string {
  const timezone = getTimezone();
  return getTodayKeyInTimezone(timezone);
}

export function getDayRecord(date: string): DayRecord | null {
  const days = getAllDayRecords();
  return days[date] || null;
}

export function getAllDayRecords(): Record<string, DayRecord> {
  const data = localStorage.getItem(STORAGE_KEYS.DAYS);
  return data ? JSON.parse(data) : {};
}

export function saveDayRecord(record: DayRecord): void {
  const days = getAllDayRecords();
  days[record.date] = record;
  localStorage.setItem(STORAGE_KEYS.DAYS, JSON.stringify(days));
}

export function getUserStats(): UserStats {
  const data = localStorage.getItem(STORAGE_KEYS.STATS);
  if (data) {
    const stats = JSON.parse(data);
    // Convert date strings back to Date objects
    stats.achievements = stats.achievements.map((a: Achievement) => ({
      ...a,
      unlockedDate: a.unlockedDate ? new Date(a.unlockedDate) : undefined,
    }));
    return stats;
  }
  
  return {
    currentStreak: 0,
    longestStreak: 0,
    totalDaysTracked: 0,
    totalWaterConsumed: 0,
    achievements: getDefaultAchievements(),
  };
}

export function saveUserStats(stats: UserStats): void {
  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
}

export function getDailyGoal(): number {
  const goal = localStorage.getItem(STORAGE_KEYS.GOAL);
  return goal ? parseInt(goal) : DEFAULT_GOAL;
}

export function saveDailyGoal(goal: number): void {
  localStorage.setItem(STORAGE_KEYS.GOAL, goal.toString());
}

export type GoalMode = 'personalized' | 'custom';

export function getGoalMode(): GoalMode {
  const mode = localStorage.getItem(STORAGE_KEYS.GOAL_MODE);
  return mode === 'custom' ? 'custom' : 'personalized';
}

export function saveGoalMode(mode: GoalMode): void {
  localStorage.setItem(STORAGE_KEYS.GOAL_MODE, mode);
}

function getDefaultAchievements(): Achievement[] {
  return [
    {
      id: 'first_day',
      title: 'First Drop',
      description: 'Complete your first day',
      icon: 'first_day',
      unlocked: false,
      requirement: 1,
      currentProgress: 0,
    },
    {
      id: 'week_streak',
      title: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: 'week_streak',
      unlocked: false,
      requirement: 7,
      currentProgress: 0,
    },
    {
      id: 'month_streak',
      title: 'Hydration Hero',
      description: 'Maintain a 30-day streak',
      icon: 'month_streak',
      unlocked: false,
      requirement: 30,
      currentProgress: 0,
    },
    {
      id: 'total_10l',
      title: 'Ocean Explorer',
      description: 'Drink 10 liters total',
      icon: 'total_10l',
      unlocked: false,
      requirement: 10000,
      currentProgress: 0,
    },
    {
      id: 'total_100l',
      title: 'Aqua Master',
      description: 'Drink 100 liters total',
      icon: 'total_100l',
      unlocked: false,
      requirement: 100000,
      currentProgress: 0,
    },
    {
      id: 'perfect_week',
      title: 'Perfect Week',
      description: 'Meet your goal 7 days in a row',
      icon: 'perfect_week',
      unlocked: false,
      requirement: 7,
      currentProgress: 0,
    },
  ];
}

// Custom Drinks Management
export function getCustomDrinks(): CustomDrinkType[] {
  const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_DRINKS);
  return data ? JSON.parse(data) : [];
}

export function saveCustomDrink(drink: CustomDrinkType): void {
  const drinks = getCustomDrinks();
  const existingIndex = drinks.findIndex(d => d.id === drink.id);
  
  if (existingIndex >= 0) {
    drinks[existingIndex] = drink;
  } else {
    drinks.push(drink);
  }
  
  localStorage.setItem(STORAGE_KEYS.CUSTOM_DRINKS, JSON.stringify(drinks));
}

export function replaceCustomDrinks(drinks: CustomDrinkType[]): void {
  localStorage.setItem(STORAGE_KEYS.CUSTOM_DRINKS, JSON.stringify(drinks));
}

export function setCustomDrinksList(drinks: CustomDrinkType[]): void {
  localStorage.setItem(STORAGE_KEYS.CUSTOM_DRINKS, JSON.stringify(drinks));
}

export function deleteCustomDrink(id: string): void {
  const drinks = getCustomDrinks().filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEYS.CUSTOM_DRINKS, JSON.stringify(drinks));
}

function normalizeDrinkName(name: string): string {
  return name.trim().toLowerCase();
}

export function getCustomDrinkById(id: string): CustomDrinkType | null {
  const drinks = getCustomDrinks();
  const matchById = drinks.find((d) => d.id === id);
  if (matchById) {
    return matchById;
  }

  const backendMap = getBackendDrinkMap();
  const fallbackLabel = backendMap[id];
  if (!fallbackLabel) {
    return null;
  }

  return getCustomDrinkByLabel(fallbackLabel);
}

export function getCustomDrinkByLabel(label: string): CustomDrinkType | null {
  if (!label) {
    return null;
  }
  const normalized = normalizeDrinkName(label);
  const drinks = getCustomDrinks();
  return drinks.find((drink) => normalizeDrinkName(drink.name) === normalized) || null;
}

// Unit Preference Management
export function getUnitPreference(): VolumeUnit {
  const unit = localStorage.getItem(STORAGE_KEYS.UNIT_PREFERENCE);
  return (unit as VolumeUnit) || 'ml';
}

export function saveUnitPreference(unit: VolumeUnit): void {
  localStorage.setItem(STORAGE_KEYS.UNIT_PREFERENCE, unit);
}

export function getWeightUnitPreference(): WeightUnit {
  const unit = localStorage.getItem(STORAGE_KEYS.WEIGHT_UNIT_PREFERENCE);
  return (unit as WeightUnit) || 'kg';
}

export function saveWeightUnitPreference(unit: WeightUnit): void {
  localStorage.setItem(STORAGE_KEYS.WEIGHT_UNIT_PREFERENCE, unit);
}

// Temperature Unit Preference Management
export function getTemperatureUnitPreference(): TemperatureUnit {
  const unit = localStorage.getItem(STORAGE_KEYS.TEMPERATURE_UNIT_PREFERENCE);
  return (unit as TemperatureUnit) || 'F';
}

export function saveTemperatureUnitPreference(unit: TemperatureUnit): void {
  localStorage.setItem(STORAGE_KEYS.TEMPERATURE_UNIT_PREFERENCE, unit);
}

// Timezone Management
export function getTimezone(): string {
  const timezone = localStorage.getItem(STORAGE_KEYS.TIMEZONE);
  return timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function saveTimezone(timezone: string): void {
  localStorage.setItem(STORAGE_KEYS.TIMEZONE, timezone);
}

// Get current date key using user's timezone
export function getTodayKeyInTimezone(timezone?: string): string {
  const tz = timezone || getTimezone();
  const date = new Date();
  return date.toLocaleDateString('en-CA', { timeZone: tz }); // en-CA gives YYYY-MM-DD format
}

// Weather Adjustment Preference
export function getUseWeatherAdjustment(): boolean {
  const preference = localStorage.getItem(STORAGE_KEYS.USE_WEATHER_ADJUSTMENT);
  return preference === null ? true : preference === 'true'; // Default to true
}

export function saveUseWeatherAdjustment(useWeather: boolean): void {
  localStorage.setItem(STORAGE_KEYS.USE_WEATHER_ADJUSTMENT, useWeather.toString());
}

// Progress Wheel Style Preference
export function getProgressWheelStyle(): ProgressWheelStyle {
  const style = localStorage.getItem(STORAGE_KEYS.PROGRESS_WHEEL_STYLE);
  return (style as ProgressWheelStyle) || 'drink-colors'; // Default to drink-colors
}

export function saveProgressWheelStyle(style: ProgressWheelStyle): void {
  localStorage.setItem(STORAGE_KEYS.PROGRESS_WHEEL_STYLE, style);
}

// PWA Install Prompt
export function getPWAInstallDismissedAt(): string | null {
  return localStorage.getItem(STORAGE_KEYS.PWA_INSTALL_DISMISSED_AT);
}

export function savePWAInstallDismissedAt(): void {
  localStorage.setItem(STORAGE_KEYS.PWA_INSTALL_DISMISSED_AT, new Date().toISOString());
}

export function shouldShowPWAInstallPrompt(): boolean {
  const dismissedAt = getPWAInstallDismissedAt();
  if (!dismissedAt) return true;

  const dismissedDate = new Date(dismissedAt);
  const now = new Date();
  const daysSinceDismissal = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceDismissal >= 3; // Show again after 3 days
}

export function isRunningAsPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as { standalone?: boolean }).standalone === true ||
         document.referrer.includes('android-app://');
}

