import { DayRecord, UserStats, Achievement } from '@/types/water';

const STORAGE_KEYS = {
  DAYS: 'archer_aqua_days',
  STATS: 'archer_aqua_stats',
  GOAL: 'archer_aqua_goal',
};

export const DEFAULT_GOAL = 2500; // 2.5L in ml

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
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

function getDefaultAchievements(): Achievement[] {
  return [
    {
      id: 'first_day',
      title: 'First Drop',
      description: 'Complete your first day',
      icon: '💧',
      unlocked: false,
      requirement: 1,
      currentProgress: 0,
    },
    {
      id: 'week_streak',
      title: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: '🌊',
      unlocked: false,
      requirement: 7,
      currentProgress: 0,
    },
    {
      id: 'month_streak',
      title: 'Hydration Hero',
      description: 'Maintain a 30-day streak',
      icon: '🏆',
      unlocked: false,
      requirement: 30,
      currentProgress: 0,
    },
    {
      id: 'total_10l',
      title: 'Ocean Explorer',
      description: 'Drink 10 liters total',
      icon: '🐋',
      unlocked: false,
      requirement: 10000,
      currentProgress: 0,
    },
    {
      id: 'total_100l',
      title: 'Aqua Master',
      description: 'Drink 100 liters total',
      icon: '🌊',
      unlocked: false,
      requirement: 100000,
      currentProgress: 0,
    },
    {
      id: 'perfect_week',
      title: 'Perfect Week',
      description: 'Meet your goal 7 days in a row',
      icon: '⭐',
      unlocked: false,
      requirement: 7,
      currentProgress: 0,
    },
  ];
}
