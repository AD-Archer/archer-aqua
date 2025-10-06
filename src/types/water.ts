export type DrinkType = 'water' | 'coffee' | 'tea' | 'juice' | 'alcohol' | 'soda' | 'energy_drink' | 'milk' | 'sports_drink';

export interface Drink {
  id: string;
  type: DrinkType;
  amount: number; // in ml
  timestamp: Date;
  hydrationValue: number; // calculated based on type
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
}

export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserProfile {
  name: string;
  email: string;
  weight: number; // in kg
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  climate: 'cold' | 'moderate' | 'hot';
  createdAt: Date;
}

export const DRINK_HYDRATION_MULTIPLIERS: Record<DrinkType, number> = {
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

export const DRINK_ICONS: Record<DrinkType, string> = {
  water: '💧',
  sports_drink: '⚡',
  milk: '🥛',
  tea: '🍵',
  juice: '🧃',
  coffee: '☕',
  soda: '🥤',
  energy_drink: '🔋',
  alcohol: '🍺',
};
