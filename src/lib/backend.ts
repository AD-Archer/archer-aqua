import {
  apiConfig,
  createUser,
  getHydrationStats,
  getDailySummary,
  logHydration,
  updateUser,
  type ApiDailySummaryResponse,
  type ApiHydrationStatsResponse,
  type LogHydrationPayload,
  resolveDrinkLabel,
} from './api';
import {
  getBackendUserId,
  saveBackendUserId,
  getUser,
  getUserProfile,
  getTimezone,
  getDailyGoal,
  getUseWeatherAdjustment,
  getCustomDrinkById,
  getProgressWheelStyle,
  getUnitPreference,
} from './storage';
import { getLocationPreference } from './weather';
import { DRINK_HYDRATION_MULTIPLIERS, DrinkType, UserStats } from '@/types/water';

const DEFAULT_BASELINE_WEIGHT_KG = 70;
const DEFAULT_AGE = 30;
const DEFAULT_GENDER = 'other';
const DEFAULT_ACTIVITY = 'moderate';
const DEFAULT_VOLUME_UNIT = 'ml';
const DEFAULT_TEMPERATURE_UNIT = 'fahrenheit';
const DEFAULT_PROGRESS_STYLE = 'drink_colors';

function normalizeProgressStyle(style: string): string {
  return style.replace(/-/g, '_');
}

export function backendIsEnabled(): boolean {
  return apiConfig.isEnabled;
}

export async function ensureBackendUser(): Promise<string | null> {
  if (!backendIsEnabled()) {
    return null;
  }

  const existing = getBackendUserId();
  if (existing) {
    return existing;
  }

  const authUser = getUser();
  if (!authUser) {
    return null;
  }

  const timezone = getTimezone();
  const profile = getUserProfile();
  const weightKg = profile?.weight ?? DEFAULT_BASELINE_WEIGHT_KG;
  const age = profile?.age ?? DEFAULT_AGE;
  const gender = profile?.gender ?? DEFAULT_GENDER;
  const activityLevel = profile?.activityLevel ?? DEFAULT_ACTIVITY;
  const customGoalMl = getDailyGoal();

  const payload = {
    email: authUser.email,
    displayName: authUser.name || authUser.email.split('@')[0],
    weight: {
      value: weightKg,
      unit: 'kg' as const,
    },
    age,
    gender,
    activityLevel,
    timezone,
    location: {
      city: '',
      region: '',
      country: '',
    },
    volumeUnit: DEFAULT_VOLUME_UNIT,
    temperatureUnit: DEFAULT_TEMPERATURE_UNIT,
    progressWheelStyle: DEFAULT_PROGRESS_STYLE,
    weatherAdjustmentsEnabled: getUseWeatherAdjustment(),
    customGoalLiters: customGoalMl ? customGoalMl / 1000 : null,
  };

  const response = await createUser(payload);
  saveBackendUserId(response.user.id);
  return response.user.id;
}

export async function syncProfileToBackend(): Promise<void> {
  if (!backendIsEnabled()) {
    return;
  }
  const userId = getBackendUserId();
  if (!userId) {
    await ensureBackendUser();
    return;
  }

  const authUser = getUser();
  const profile = getUserProfile();
  if (!profile || !authUser) {
    return;
  }

  const locationPreference = getLocationPreference();
  const preferredUnit = profile.preferredUnit ?? getUnitPreference() ?? 'ml';
  const temperaturePreference = profile.preferredTemperatureUnit ?? 'F';
  const goalMl = getDailyGoal();

  const payload = {
    displayName: authUser.name,
    weight: {
      value: profile.weight,
      unit: 'kg' as const,
    },
    age: profile.age,
    gender: profile.gender,
    activityLevel: profile.activityLevel,
    timezone: getTimezone(),
    volumeUnit: preferredUnit,
    temperatureUnit: temperaturePreference === 'F' ? 'fahrenheit' : 'celsius',
    progressWheelStyle: normalizeProgressStyle(getProgressWheelStyle() ?? DEFAULT_PROGRESS_STYLE),
    weatherAdjustmentsEnabled: getUseWeatherAdjustment(),
    customGoalLiters: goalMl ? goalMl / 1000 : null,
    location: {
      city: locationPreference.type === 'manual' ? locationPreference.manualLocation?.name ?? '' : '',
      region: profile.climate,
      country: '',
      latitude: locationPreference.type === 'manual' ? locationPreference.manualLocation?.lat : undefined,
      longitude: locationPreference.type === 'manual' ? locationPreference.manualLocation?.lon : undefined,
    },
  };

  await updateUser(userId, payload);
}

export async function syncGoalToBackend(goalMl: number): Promise<void> {
  if (!backendIsEnabled()) {
    return;
  }
  const userId = await ensureBackendUser();
  if (!userId) {
    return;
  }

  await updateUser(userId, {
    customGoalLiters: goalMl / 1000,
  });
}

export async function logHydrationToBackend(
  type: DrinkType,
  amountMl: number,
  customDrinkId?: string,
): Promise<void> {
  if (!backendIsEnabled()) {
    return;
  }

  const userId = await ensureBackendUser();
  if (!userId) {
    return;
  }

  let hydrationMultiplier: number | undefined;
  let label = resolveDrinkLabel(type);
  if (type === 'custom' && customDrinkId) {
    const customDrink = getCustomDrinkById(customDrinkId);
    if (customDrink) {
      label = customDrink.name;
      hydrationMultiplier = customDrink.hydrationMultiplier;
    }
  } else {
    hydrationMultiplier = DRINK_HYDRATION_MULTIPLIERS[type as Exclude<DrinkType, 'custom'>];
  }

  const payload: LogHydrationPayload = {
    label,
    volume: {
      value: amountMl,
      unit: 'ml',
    },
    hydrationMultiplier,
    source: 'frontend',
  };

  await logHydration(userId, payload);
}

export async function fetchDailySummaryFromBackend(date: string, timezone: string): Promise<ApiDailySummaryResponse | null> {
  if (!backendIsEnabled()) {
    return null;
  }
  const userId = await ensureBackendUser();
  if (!userId) {
    return null;
  }

  return getDailySummary(userId, date, timezone);
}

export async function fetchHydrationStatsFromBackend(timezone: string, days = 7): Promise<ApiHydrationStatsResponse | null> {
  if (!backendIsEnabled()) {
    return null;
  }
  const userId = await ensureBackendUser();
  if (!userId) {
    return null;
  }

  return getHydrationStats(userId, timezone, days);
}

export function mapBackendStatsToUserStats(stats: ApiHydrationStatsResponse): UserStats {
  const achievedDays = stats.dailySummaries.filter((summary) => summary.status !== 'not_started');

  return {
    currentStreak: stats.streakCount,
    longestStreak: stats.bestStreak,
    totalDaysTracked: achievedDays.length,
    totalWaterConsumed: stats.totalEffectiveMl,
    achievements: [],
  };
}

