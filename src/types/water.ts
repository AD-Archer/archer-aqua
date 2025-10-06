export type DrinkType = 'water' | 'coffee' | 'tea' | 'juice' | 'alcohol' | 'soda';

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

export const DRINK_HYDRATION_MULTIPLIERS: Record<DrinkType, number> = {
  water: 1.0,
  tea: 0.9,
  juice: 0.9,
  coffee: 0.8,
  soda: 0.6,
  alcohol: -0.5,
};
