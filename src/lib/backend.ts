import {
  apiConfig,
  getHydrationStats,
  getDailySummary,
  getAuthState,
  logHydration,
  deleteHydrationLog,
  updateUser,
  type ApiDailySummaryResponse,
  type ApiHydrationLogResponse,
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
  getBackendDrinkMap,
  saveBackendDrinkMap,
} from './storage';
import { getLocationPreference } from './weather';
import { DRINK_HYDRATION_MULTIPLIERS, Drink, DrinkType, DayRecord, UserStats } from '@/types/water';

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

  try {
    const authState = await getAuthState();
    if (authState?.user?.id) {
      saveBackendUserId(authState.user.id);
      return authState.user.id;
    }
  } catch (error) {
    console.warn('Failed to resolve backend auth state', error);
  }

  return null;
}

export async function syncProfileToBackend(): Promise<void> {
  if (!backendIsEnabled()) {
    return;
  }
  let userId = getBackendUserId();
  if (!userId) {
    userId = await ensureBackendUser();
    if (!userId) {
      return;
    }
  }

  const profile = getUserProfile();
  if (!profile) {
    return;
  }
  const authUser = getUser();

  const locationPreference = getLocationPreference();
  const preferredUnit = profile.preferredUnit ?? getUnitPreference() ?? 'ml';
  const temperaturePreference = profile.preferredTemperatureUnit ?? 'F';
  const goalMl = getDailyGoal();
  const displayName = profile.name || authUser?.name || authUser?.email?.split('@')[0] || '';

  const payload = {
    displayName,
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
  options?: { consumedAt?: string; timezone?: string },
): Promise<ApiHydrationLogResponse | null> {
  if (!backendIsEnabled()) {
    return null;
  }

  const userId = await ensureBackendUser();
  if (!userId) {
    return null;
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

  if (options?.consumedAt) {
    payload.consumedAt = options.consumedAt;
  }
  if (options?.timezone) {
    payload.timezone = options.timezone;
  }

  const response = await logHydration(userId, payload);

  if (response.drinkId && response.label) {
    rememberBackendDrink(response.drinkId, response.label);
  }

  return response;
}

export async function removeHydrationLogFromBackend(logId: string): Promise<boolean> {
  if (!backendIsEnabled()) {
    return false;
  }

  const userId = await ensureBackendUser();
  if (!userId) {
    return false;
  }

  await deleteHydrationLog(userId, logId);
  return true;
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

  // Calculate achievements based on backend data
  const achievements = getAchievementsFromBackendStats(stats);

  return {
    currentStreak: stats.streakCount,
    longestStreak: stats.bestStreak,
    totalDaysTracked: achievedDays.length,
    totalWaterConsumed: stats.totalEffectiveMl,
    achievements,
    history: stats.dailySummaries.map((summary) => ({
      date: summary.date,
      timezone: summary.timezone,
      totalVolumeMl: summary.totalVolumeMl,
      totalEffectiveMl: summary.totalEffectiveMl,
      goalVolumeMl: summary.goalVolumeMl,
      progressPercentage: summary.progressPercentage,
      status: summary.status,
    })),
  };
}

function getAchievementsFromBackendStats(stats: ApiHydrationStatsResponse) {
  const completedDays = stats.dailySummaries.filter((s) => s.status === 'completed').length;
  const totalMl = stats.totalEffectiveMl;
  const currentStreak = stats.streakCount;
  
  return [
    {
      id: 'first_day',
      title: 'First Drop',
      description: 'Complete your first day',
      icon: 'first_day',
      unlocked: completedDays >= 1,
      unlockedDate: completedDays >= 1 ? new Date() : undefined,
      requirement: 1,
      currentProgress: completedDays,
    },
    {
      id: 'week_streak',
      title: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: 'week_streak',
      unlocked: currentStreak >= 7,
      unlockedDate: currentStreak >= 7 ? new Date() : undefined,
      requirement: 7,
      currentProgress: currentStreak,
    },
    {
      id: 'month_streak',
      title: 'Hydration Hero',
      description: 'Maintain a 30-day streak',
      icon: 'month_streak',
      unlocked: currentStreak >= 30,
      unlockedDate: currentStreak >= 30 ? new Date() : undefined,
      requirement: 30,
      currentProgress: currentStreak,
    },
    {
      id: 'total_10l',
      title: 'Ocean Explorer',
      description: 'Drink 10 liters total',
      icon: 'total_10l',
      unlocked: totalMl >= 10000,
      unlockedDate: totalMl >= 10000 ? new Date() : undefined,
      requirement: 10000,
      currentProgress: totalMl,
    },
    {
      id: 'total_100l',
      title: 'Aqua Master',
      description: 'Drink 100 liters total',
      icon: 'total_100l',
      unlocked: totalMl >= 100000,
      unlockedDate: totalMl >= 100000 ? new Date() : undefined,
      requirement: 100000,
      currentProgress: totalMl,
    },
    {
      id: 'perfect_week',
      title: 'Perfect Week',
      description: 'Meet your goal 7 days in a row',
      icon: 'perfect_week',
      unlocked: currentStreak >= 7,
      unlockedDate: currentStreak >= 7 ? new Date() : undefined,
      requirement: 7,
      currentProgress: currentStreak,
    },
  ];
}

export async function fetchDayRecordFromBackend(date: string, timezone: string): Promise<DayRecord | null> {
  const summary = await fetchDailySummaryFromBackend(date, timezone);
  console.log('fetchDailySummaryFromBackend returned:', JSON.stringify(summary, null, 2));
  if (!summary) {
    return null;
  }
  const mapped = mapDailySummaryToDayRecord(summary);
  console.log('Mapped to DayRecord:', JSON.stringify(mapped, null, 2));
  return mapped;
}

const LABEL_TO_DRINK_TYPE: Record<string, DrinkType> = {
  water: 'water',
  'sparkling water': 'water',
  'sports drink': 'sports_drink',
  'sports_drink': 'sports_drink',
  gatorade: 'sports_drink',
  powerade: 'sports_drink',
  milk: 'milk',
  latte: 'milk',
  tea: 'tea',
  coffee: 'coffee',
  espresso: 'coffee',
  cappuccino: 'coffee',
  juice: 'juice',
  orange: 'juice',
  'orange juice': 'juice',
  apple: 'juice',
  'apple juice': 'juice',
  soda: 'soda',
  cola: 'soda',
  'energy drink': 'energy_drink',
  monster: 'energy_drink',
  'red bull': 'energy_drink',
  alcohol: 'alcohol',
  beer: 'alcohol',
  wine: 'alcohol',
};

function guessDrinkType(label?: string): DrinkType {
  if (!label) {
    return 'water';
  }
  const normalized = label.trim().toLowerCase();
  return LABEL_TO_DRINK_TYPE[normalized] ?? 'custom';
}

function rememberBackendDrink(drinkId: string, label: string) {
  const map = getBackendDrinkMap();
  if (map[drinkId] === label) {
    return;
  }
  map[drinkId] = label;
  saveBackendDrinkMap(map);
}

export function mapApiLogToDrink(log: ApiHydrationLogResponse): Drink {
  if (log.drinkId && log.label) {
    rememberBackendDrink(log.drinkId, log.label);
  }

  const type = guessDrinkType(log.label);

  return {
    id: log.id,
    backendLogId: log.id,
    type,
    customDrinkId: type === 'custom' ? log.drinkId ?? undefined : undefined,
    amount: log.volumeMl,
    timestamp: new Date(log.consumedAt),
    hydrationValue: log.effectiveMl,
    label: log.label,
    source: 'backend',
  };
}

export function mapDailySummaryToDayRecord(summary: ApiDailySummaryResponse): DayRecord {
  return {
    date: summary.date,
    drinks: summary.logs.map(mapApiLogToDrink),
    totalHydration: summary.totalEffectiveMl,
    goal: summary.goalVolumeMl,
  };
}

