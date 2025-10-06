export type DrinkType = 'water' | 'coffee' | 'tea' | 'juice' | 'alcohol' | 'soda' | 'energy_drink' | 'milk' | 'sports_drink' | 'custom';

export type VolumeUnit = 'ml' | 'oz';
export type WeightUnit = 'kg' | 'lbs';
export type TemperatureUnit = 'C' | 'F';
export type ProgressWheelStyle = 'drink-colors' | 'black-white' | 'water-blue';

export interface CustomDrinkType {
  id: string;
  name: string;
  color: string;
  hydrationMultiplier: number;
  icon: string; // Name of the Lucide icon to use
}

export interface Drink {
  id: string;
  type: DrinkType;
  customDrinkId?: string; // Reference to CustomDrinkType if type is 'custom'
  amount: number; // in ml
  timestamp: Date;
  hydrationValue: number; // calculated based on type
  label?: string;
  backendLogId?: string;
  source?: 'local' | 'backend';
}

export interface DailyHydrationSummary {
  date: string;
  timezone: string;
  totalVolumeMl: number;
  totalEffectiveMl: number;
  goalVolumeMl: number;
  progressPercentage: number;
  status: string;
}

export interface DayRecord {
  date: string; // YYYY-MM-DD
  drinks: Drink[];
  totalHydration: number;
  goal: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: Date;
  requirement: number;
  currentProgress: number;
}

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalDaysTracked: number;
  totalWaterConsumed: number;
  achievements: Achievement[];
  history?: DailyHydrationSummary[];
}

export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserProfile {
  name: string;
  email: string;
  weight: number; // stored in kg internally
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  climate: 'cold' | 'moderate' | 'hot';
  createdAt: Date;
  preferredUnit?: VolumeUnit; // Default to 'ml'
  preferredWeightUnit?: WeightUnit; // Default to 'kg'
  preferredTemperatureUnit?: TemperatureUnit; // Default to 'F'
  timezone?: string; // IANA timezone string (e.g., 'America/New_York')
}

export const DRINK_HYDRATION_MULTIPLIERS: Record<Exclude<DrinkType, 'custom'>, number> = {
  water: 1.0,
  sports_drink: 1.05, // electrolytes help hydration
  milk: 0.95,
  tea: 0.85,
  juice: 0.8, // sugar content reduces hydration
  coffee: 0.7, // caffeine is diuretic
  soda: 0.5, // high sugar + caffeine
  energy_drink: 0.3, // high caffeine content
  alcohol: -0.5, // dehydrating
};

export const DRINK_COLORS: Record<Exclude<DrinkType, 'custom'>, string> = {
  water: '#3b82f6', // blue
  sports_drink: '#8b5cf6', // purple
  milk: '#38bdf8', // sky blue (lighter background, visible icon)
  tea: '#84cc16', // lime
  juice: '#f97316', // orange
  coffee: '#78350f', // brown
  soda: '#f43f5e', // red
  energy_drink: '#eab308', // yellow
  alcohol: '#dc2626', // dark red
};

// Utility functions for unit conversion
export function mlToOz(ml: number): number {
  return ml * 0.033814;
}

export function ozToMl(oz: number): number {
  return oz / 0.033814;
}

export function formatVolume(ml: number, unit: VolumeUnit): string {
  if (unit === 'oz') {
    return `${mlToOz(ml).toFixed(1)}oz`;
  }
  return `${ml}ml`;
}

export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  if (unit === 'lbs') {
    return `${kgToLbs(kg).toFixed(1)} lbs`;
  }
  return `${kg.toFixed(1)} kg`;
}

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9 / 5) + 32;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) * 5 / 9;
}

export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  if (unit === 'F') {
    return `${celsiusToFahrenheit(celsius).toFixed(1)}°F`;
  }
  return `${celsius.toFixed(1)}°C`;
}
