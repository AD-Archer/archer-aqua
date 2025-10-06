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
  getTimezone,
} from '@/lib/storage';
import {
  backendIsEnabled,
  fetchDayRecordFromBackend,
  fetchHydrationStatsFromBackend,
  logHydrationToBackend,
  mapBackendStatsToUserStats,
  syncGoalToBackend,
} from '@/lib/backend';
import { resolveDrinkLabel } from '@/lib/api';

export function useWaterTracking() {
  const [todayRecord, setTodayRecord] = useState<DayRecord | null>(null);
  const [stats, setStats] = useState<UserStats>(getUserStats());
  const [goal, setGoal] = useState(getDailyGoal());
  const [recordsByDate, setRecordsByDate] = useState<Record<string, DayRecord>>({});

  const loadLocalTodayRecord = useCallback(() => {
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
    setRecordsByDate((prev) => ({ ...prev, [record.date]: record }));
    setGoal(record.goal);
  }, []);

  const refreshBackendData = useCallback(async () => {
    if (!backendIsEnabled()) {
      return;
    }

    const timezone = getTimezone();
    const today = getTodayKey();

    try {
      const [record, statsResponse] = await Promise.all([
        fetchDayRecordFromBackend(today, timezone),
        fetchHydrationStatsFromBackend(timezone, 7),
      ]);

      if (record) {
        setTodayRecord(record);
        saveDayRecord(record);
        setRecordsByDate((prev) => ({ ...prev, [record.date]: record }));
        if (record.goal) {
          setGoal(record.goal);
          saveDailyGoal(record.goal);
        }
      } else {
        loadLocalTodayRecord();
      }

      if (statsResponse) {
        const mapped = mapBackendStatsToUserStats(statsResponse);
        setStats((prev) => {
          const achievements = prev.achievements?.length ? prev.achievements : mapped.achievements;
          const next = { ...mapped, achievements };
          saveUserStats(next);
          return next;
        });
      }
    } catch (error) {
      console.warn('Failed to load backend hydration data', error);
      loadLocalTodayRecord();
    }
  }, [loadLocalTodayRecord]);

  useEffect(() => {
    if (backendIsEnabled()) {
      refreshBackendData();
    } else {
      loadLocalTodayRecord();
    }
  }, [loadLocalTodayRecord, refreshBackendData]);

  const updateStats = useCallback((record: DayRecord, previousRecord?: DayRecord | null) => {
    setStats((prevStats) => {
      const baseline = previousRecord?.totalHydration ?? 0;
      const priorGoalMet = previousRecord ? previousRecord.totalHydration >= previousRecord.goal : false;
      const goalMet = record.totalHydration >= record.goal;

      const newStats: UserStats = {
        ...prevStats,
        totalWaterConsumed: prevStats.totalWaterConsumed + record.totalHydration - baseline,
      };

      if (goalMet && !priorGoalMet) {
        newStats.currentStreak += 1;
        newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);
        newStats.totalDaysTracked += 1;
      }

      newStats.achievements = newStats.achievements.map((achievement) => {
        if (achievement.unlocked) {
          return achievement;
        }

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

      saveUserStats(newStats);
      return newStats;
    });
  }, []);

  const addDrink = useCallback(async (type: DrinkType, amount: number, customDrinkId?: string, date?: string) => {
    if (backendIsEnabled()) {
      const timezone = getTimezone();
      let consumedAt: string | undefined;
      if (date) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        consumedAt = new Date(`${date}T${hours}:${minutes}:${seconds}`).toISOString();
      }

      const response = await logHydrationToBackend(type, amount, customDrinkId, {
        consumedAt,
        timezone,
      });

      if (!response) {
        throw new Error('Unable to log hydration with the backend.');
      }

      await refreshBackendData();
      return;
    }

    const targetDate = date || getTodayKey();
    let record = getDayRecord(targetDate);
    
    if (!record) {
      // Create a new record for this date if it doesn't exist
      record = {
        date: targetDate,
        drinks: [],
        totalHydration: 0,
        goal: getDailyGoal(),
      };
    }

    let multiplier = 1.0;
    let label = resolveDrinkLabel(type);

    if (type === 'custom' && customDrinkId) {
      const customDrink = getCustomDrinkById(customDrinkId);
      multiplier = customDrink?.hydrationMultiplier || 1.0;
      label = customDrink?.name || label;
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
      label,
      source: 'local',
    };

    const updatedDrinks = [...record.drinks, newDrink];
    const totalHydration = updatedDrinks.reduce((sum, d) => sum + d.hydrationValue, 0);

    const updatedRecord: DayRecord = {
      ...record,
      drinks: updatedDrinks,
      totalHydration,
    };

    saveDayRecord(updatedRecord);
    setRecordsByDate((prev) => ({ ...prev, [updatedRecord.date]: updatedRecord }));
    
    // Update todayRecord if we're adding to today
    if (targetDate === getTodayKey()) {
      const previousRecord = todayRecord;
      setTodayRecord(updatedRecord);
      updateStats(updatedRecord, previousRecord);
    }
  }, [refreshBackendData, todayRecord, updateStats]);

  const updateGoal = useCallback(async (newGoal: number) => {
    setGoal(newGoal);
    saveDailyGoal(newGoal);

    if (todayRecord) {
    const updatedRecord = { ...todayRecord, goal: newGoal };
    setTodayRecord(updatedRecord);
    saveDayRecord(updatedRecord);
    setRecordsByDate((prev) => ({ ...prev, [updatedRecord.date]: updatedRecord }));
    }

    if (backendIsEnabled()) {
      try {
        await syncGoalToBackend(newGoal);
        await refreshBackendData();
      } catch (error) {
        console.warn('Failed to sync goal with backend', error);
      }
    }
  }, [todayRecord, refreshBackendData]);

  const removeDrink = useCallback((drinkId: string, date?: string) => {
    if (backendIsEnabled()) {
      console.warn('Removing drinks is not yet supported by the backend API.');
      void refreshBackendData();
      return;
    }

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
    setRecordsByDate((prev) => ({ ...prev, [updatedRecord.date]: updatedRecord }));
    
    if (targetDate === getTodayKey()) {
      setTodayRecord(updatedRecord);
    }
  }, [refreshBackendData, todayRecord]);

  const loadRecordForDate = useCallback(async (date: string): Promise<DayRecord | null> => {
    if (recordsByDate[date]) {
      return recordsByDate[date];
    }

    if (backendIsEnabled()) {
      try {
        const record = await fetchDayRecordFromBackend(date, getTimezone());
        if (record) {
          saveDayRecord(record);
          setRecordsByDate((prev) => ({ ...prev, [date]: record }));
          if (date === getTodayKey()) {
            setTodayRecord(record);
            if (record.goal) {
              setGoal(record.goal);
            }
          }
          return record;
        }
      } catch (error) {
        console.warn('Failed to fetch day record from backend', error);
      }
    }

    const localRecord = getDayRecord(date);
    if (localRecord) {
      setRecordsByDate((prev) => ({ ...prev, [date]: localRecord }));
      if (date === getTodayKey()) {
        setTodayRecord(localRecord);
        setGoal(localRecord.goal);
      }
      return localRecord;
    }

    return null;
  }, [recordsByDate]);

  return {
    todayRecord,
    stats,
    goal,
    addDrink,
    updateGoal,
    removeDrink,
    loadRecordForDate,
    recordsByDate,
  };
}
