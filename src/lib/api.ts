import type { DrinkType } from '@/types/water';
import { clearAuthToken, getAuthToken } from './storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions extends RequestInit {
  method?: HttpMethod;
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured. Set VITE_API_BASE_URL in your environment.');
  }

  const { skipAuth = false, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);

  const isFormData = fetchOptions.body instanceof FormData;
  if (!isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    method: fetchOptions.method ?? 'GET',
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('Content-Type');
  const isJSON = contentType?.includes('application/json');
  const data = isJSON ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAuthToken();
    }
    const message = isJSON && data?.error ? data.error : response.statusText || 'Unknown error';
    throw new Error(message);
  }

  return data as T;
}

export interface ApiLocationPayload {
  city: string;
  region: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface ApiWeightPayload {
  value: number;
  unit: 'kg' | 'lbs';
}

export interface ApiVolumePayload {
  value: number;
  unit: 'ml' | 'l' | 'oz' | 'cup' | 'cups' | 'fl_oz';
}

export interface ApiUserResponse {
  id: string;
  email: string;
  displayName: string;
  weightKg: number;
  age: number;
  gender: string;
  activityLevel: string;
  timezone: string;
  location: ApiLocationPayload;
  dailyGoalLiters: number;
  customGoalLiters?: number | null;
  volumeUnit: string;
  temperatureUnit: string;
  progressWheelStyle: string;
  weatherAdjustmentsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDrinkResponse {
  id: string;
  userId?: string | null;
  name: string;
  type: string;
  hydrationMultiplier: number;
  defaultVolumeMl?: number | null;
  colorHex?: string | null;
  source: string;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiHydrationLogResponse {
  id: string;
  userId: string;
  drinkId?: string | null;
  label: string;
  volumeMl: number;
  hydrationMultiplier: number;
  effectiveMl: number;
  consumedAt: string;
  consumedAtLocal: string;
  timezone: string;
  dailyKey: string;
  source: string;
  notes?: string | null;
}

export interface ApiDailySummaryResponse {
  date: string;
  timezone: string;
  totalVolumeMl: number;
  totalEffectiveMl: number;
  goalVolumeMl: number;
  progressPercentage: number;
  status: string;
  logs: ApiHydrationLogResponse[];
}

export interface ApiHydrationStatsResponse {
  userId: string;
  timezone: string;
  dailySummaries: ApiDailySummaryResponse[];
  streakCount: number;
  bestStreak: number;
  totalVolumeMl: number;
  totalEffectiveMl: number;
}

export interface ApiAuthResponse {
  token: string;
  user: ApiUserResponse;
  hasProfile: boolean;
}

export interface ApiAuthStateResponse {
  user: ApiUserResponse;
  hasProfile: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CreateUserPayload {
  email: string;
  displayName: string;
  weight: ApiWeightPayload;
  age: number;
  gender: string;
  activityLevel: string;
  timezone: string;
  location: ApiLocationPayload;
  volumeUnit: string;
  temperatureUnit: string;
  progressWheelStyle: string;
  weatherAdjustmentsEnabled: boolean;
  customGoalLiters?: number | null;
}

export interface UpdateUserPayload {
  displayName?: string;
  weight?: ApiWeightPayload;
  age?: number;
  gender?: string;
  activityLevel?: string;
  timezone?: string;
  location?: ApiLocationPayload;
  volumeUnit?: string;
  temperatureUnit?: string;
  progressWheelStyle?: string;
  weatherAdjustmentsEnabled?: boolean;
  customGoalLiters?: number | null;
}

export interface CreateDrinkPayload {
  name: string;
  type: string;
  hydrationMultiplier: number;
  defaultVolume?: ApiVolumePayload;
  colorHex?: string;
  source: string;
}

export interface UpdateDrinkPayload {
  name?: string;
  type?: string;
  hydrationMultiplier?: number;
  defaultVolume?: ApiVolumePayload;
  colorHex?: string;
  archived?: boolean;
}

export interface LogHydrationPayload {
  drinkId?: string;
  label: string;
  volume: ApiVolumePayload;
  hydrationMultiplier?: number;
  consumedAt?: string;
  timezone?: string;
  source?: string;
  notes?: string;
}

export const apiConfig = {
  isEnabled: Boolean(API_BASE_URL),
  baseUrl: API_BASE_URL,
};

export async function createUser(payload: CreateUserPayload) {
  return request<{ user: ApiUserResponse; drinks: ApiDrinkResponse[] }>(`/api/users/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getUser(userId: string) {
  return request<{ user: ApiUserResponse; drinks: ApiDrinkResponse[] }>(`/api/users/${userId}`);
}

export async function updateUser(userId: string, payload: UpdateUserPayload) {
  return request<ApiUserResponse>(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function listDrinks(userId: string) {
  return request<ApiDrinkResponse[]>(`/api/users/${userId}/drinks`);
}

export async function createDrink(userId: string, payload: CreateDrinkPayload) {
  return request<ApiDrinkResponse>(`/api/users/${userId}/drinks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDrink(userId: string, drinkId: string, payload: UpdateDrinkPayload) {
  return request<ApiDrinkResponse>(`/api/users/${userId}/drinks/${drinkId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteDrink(userId: string, drinkId: string) {
  return request<void>(`/api/users/${userId}/drinks/${drinkId}`, {
    method: 'DELETE',
  });
}

export async function logHydration(userId: string, payload: LogHydrationPayload) {
  return request<ApiHydrationLogResponse>(`/api/users/${userId}/hydration/logs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteHydrationLog(userId: string, logId: string) {
  return request<void>(`/api/users/${userId}/hydration/logs/${logId}`, {
    method: 'DELETE',
  });
}

export async function getDailySummary(userId: string, date: string, timezone: string) {
  const params = new URLSearchParams({ date, timezone });
  return request<ApiDailySummaryResponse>(`/api/users/${userId}/hydration/daily?${params.toString()}`);
}

export async function getHydrationStats(userId: string, timezone: string, days = 7) {
  const params = new URLSearchParams({ timezone, days: String(days) });
  return request<ApiHydrationStatsResponse>(`/api/users/${userId}/hydration/stats?${params.toString()}`);
}

export async function getWeeklySummary(userId: string, timezone: string) {
  const params = new URLSearchParams({ timezone, days: '7' });
  return request<ApiDailySummaryResponse[]>(`/api/users/${userId}/hydration/weekly?${params.toString()}`);
}

export async function getAllTimeStats(userId: string, timezone: string) {
  const params = new URLSearchParams({ timezone });
  return request<ApiHydrationStatsResponse>(`/api/users/${userId}/hydration/summary?${params.toString()}`);
}

export function resolveDrinkLabel(type: DrinkType): string {
  const labels: Record<DrinkType, string> = {
    water: 'Water',
    sports_drink: 'Sports Drink',
    milk: 'Milk',
    tea: 'Tea',
    juice: 'Juice',
    coffee: 'Coffee',
    soda: 'Soda',
    energy_drink: 'Energy Drink',
    alcohol: 'Alcohol',
    custom: 'Custom Drink',
  };
  return labels[type] ?? type;
}

export function isApiEnabled(): boolean {
  return apiConfig.isEnabled;
}

export async function registerUser(payload: RegisterPayload) {
  return request<ApiAuthResponse>(`/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });
}

export async function loginUser(payload: LoginPayload) {
  return request<ApiAuthResponse>(`/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });
}

export async function getAuthState() {
  return request<ApiAuthStateResponse>(`/api/auth/me`);
}

export function getGoogleOAuthUrl(redirectUrl: string): string {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured. Set VITE_API_BASE_URL in your environment.');
  }
  const params = new URLSearchParams();
  if (redirectUrl) {
    params.set('redirect', redirectUrl);
  }
  const suffix = params.toString();
  return `${API_BASE_URL}/api/auth/google/login${suffix ? `?${params}` : ''}`;
}
