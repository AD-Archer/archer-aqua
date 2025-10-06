import { useState, useEffect, useCallback } from 'react';
import { Drink, DayRecord, UserStats, DrinkType, DRINK_HYDRATION_MULTIPLIERS } from '@/types/water';
import {
  getDayRecord,
  saveDayRecord,
  getUserStats,
  saveUserStats,
  getTodayKey,
  getDailyGoal,
  saveDailyGoal,
  getCustomDrinkById,
} from '@/lib/storage';

export function useWaterTracking() {
  const [todayRecord, setTodayRecord] = useState<DayRecord | null>(null);
  const [stats, setStats] = useState<UserStats>(getUserStats());
  const [goal, setGoal] = useState(getDailyGoal());

  useEffect(() => {
    loadTodayRecord();
  }, []);

  const loadTodayRecord = () => {
    const today = getTodayKey();
    let record = getDayRecord(today);
    
    if (!record) {
      record = {
        date: today,
        drinks: [],
        totalHydration: 0,
        goal: getDailyGoal(),
      };
      saveDayRecord(record);
    }
    
    setTodayRecord(record);
  };

  const updateStats = useCallback((record: DayRecord) => {
    const newStats = { ...stats };
    
    // Update total water consumed
    newStats.totalWaterConsumed += record.totalHydration - (todayRecord?.totalHydration || 0);
    
    // Check if goal was met
    const goalMet = record.totalHydration >= record.goal;
    
    // Update streak
    if (goalMet && todayRecord && todayRecord.totalHydration < todayRecord.goal) {
      newStats.currentStreak += 1;
      newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);
      newStats.totalDaysTracked += 1;
    }

    // Update achievements
    newStats.achievements = newStats.achievements.map(achievement => {
      if (achievement.unlocked) return achievement;

      let currentProgress = achievement.currentProgress;

      switch (achievement.id) {
        case 'first_day':
          if (goalMet) {
            return { ...achievement, unlocked: true, unlockedDate: new Date(), currentProgress: 1 };
          }
          break;
        case 'week_streak':
          currentProgress = newStats.currentStreak;
          if (currentProgress >= 7) {
            return { ...achievement, unlocked: true, unlockedDate: new Date(), currentProgress };
          }
          break;
        case 'month_streak':
          currentProgress = newStats.currentStreak;
          if (currentProgress >= 30) {
            return { ...achievement, unlocked: true, unlockedDate: new Date(), currentProgress };
          }
          break;
        case 'total_10l':
          currentProgress = newStats.totalWaterConsumed;
          if (currentProgress >= 10000) {
            return { ...achievement, unlocked: true, unlockedDate: new Date(), currentProgress };
          }
          break;
        case 'total_100l':
          currentProgress = newStats.totalWaterConsumed;
          if (currentProgress >= 100000) {
            return { ...achievement, unlocked: true, unlockedDate: new Date(), currentProgress };
          }
          break;
        case 'perfect_week':
          currentProgress = newStats.currentStreak;
          if (currentProgress >= 7) {
            return { ...achievement, unlocked: true, unlockedDate: new Date(), currentProgress };
          }
          break;
      }

      return { ...achievement, currentProgress };
    });

    setStats(newStats);
    saveUserStats(newStats);
  }, [stats, todayRecord]);

  const addDrink = useCallback((type: DrinkType, amount: number, customDrinkId?: string) => {
    if (!todayRecord) return;

    let multiplier = 1.0;
    
    if (type === 'custom' && customDrinkId) {
      const customDrink = getCustomDrinkById(customDrinkId);
      multiplier = customDrink?.hydrationMultiplier || 1.0;
    } else if (type !== 'custom') {
      multiplier = DRINK_HYDRATION_MULTIPLIERS[type];
    }
    
    const hydrationValue = amount * multiplier;

    const newDrink: Drink = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      customDrinkId,
      amount,
      timestamp: new Date(),
      hydrationValue,
    };

    const updatedDrinks = [...todayRecord.drinks, newDrink];
    const totalHydration = updatedDrinks.reduce((sum, d) => sum + d.hydrationValue, 0);

    const updatedRecord: DayRecord = {
      ...todayRecord,
      drinks: updatedDrinks,
      totalHydration,
    };

    setTodayRecord(updatedRecord);
    saveDayRecord(updatedRecord);
    updateStats(updatedRecord);
  }, [todayRecord, updateStats]);

  const updateGoal = useCallback((newGoal: number) => {
    setGoal(newGoal);
    saveDailyGoal(newGoal);
    
    if (todayRecord) {
      const updatedRecord = { ...todayRecord, goal: newGoal };
      setTodayRecord(updatedRecord);
      saveDayRecord(updatedRecord);
    }
  }, [todayRecord]);

  const removeDrink = useCallback((drinkId: string, date?: string) => {
    const targetDate = date || getTodayKey();
    const record = date ? getDayRecord(date) : todayRecord;
    
    if (!record) return;

    const updatedDrinks = record.drinks.filter(d => d.id !== drinkId);
    const totalHydration = updatedDrinks.reduce((sum, d) => sum + d.hydrationValue, 0);

    const updatedRecord: DayRecord = {
      ...record,
      drinks: updatedDrinks,
      totalHydration,
    };

    saveDayRecord(updatedRecord);
    
    if (targetDate === getTodayKey()) {
      setTodayRecord(updatedRecord);
    }
  }, [todayRecord]);

  return {
    todayRecord,
    stats,
    goal,
    addDrink,
    updateGoal,
    removeDrink,
  };
}
