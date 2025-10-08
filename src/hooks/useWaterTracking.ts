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
  removeHydrationLogFromBackend,
  syncGoalToBackend,
  setDailyGoalToBackend,
  syncCustomDrinksFromBackend,
} from '@/lib/backend';
import { resolveDrinkLabel } from '@/lib/api';

export function useWaterTracking() {
  const [todayRecord, setTodayRecord] = useState<DayRecord | null>(null);
  const [stats, setStats] = useState<UserStats>(getUserStats());
  const [goal, setGoal] = useState(getDailyGoal());
  const [recordsByDate, setRecordsByDate] = useState<Record<string, DayRecord>>({});
  const [isLoading, setIsLoading] = useState(true);

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

  const refreshBackendData = useCallback(async (skipLoadingState = false) => {
    if (!backendIsEnabled()) {
      setIsLoading(false);
      return;
    }

    if (!skipLoadingState) {
      setIsLoading(true);
    }

    const timezone = getTimezone();
    const today = getTodayKey();

    try {
      const [record, statsResponse] = await Promise.all([
        fetchDayRecordFromBackend(today, timezone),
        fetchHydrationStatsFromBackend(timezone, 7),
      ]);
      await syncCustomDrinksFromBackend();

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
          // Preserve unlock dates from local storage if they exist
          const mergedAchievements = mapped.achievements.map((backendAch) => {
            const localAch = prev.achievements?.find(a => a.id === backendAch.id);
            if (localAch && localAch.unlocked && localAch.unlockedDate) {
              // Keep the original unlock date from local storage
              return {
                ...backendAch,
                unlockedDate: localAch.unlockedDate,
              };
            }
            return backendAch;
          });
          
          const next = { ...mapped, achievements: mergedAchievements };
          saveUserStats(next);
          return next;
        });
      }
    } catch (error) {
      console.warn('Failed to load backend hydration data', error);
      loadLocalTodayRecord();
    } finally {
      if (!skipLoadingState) {
        setIsLoading(false);
      }
    }
  }, [loadLocalTodayRecord]);

  useEffect(() => {
    if (backendIsEnabled()) {
      refreshBackendData();
    } else {
      loadLocalTodayRecord();
      setIsLoading(false);
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
    const targetDate = date || getTodayKey();
    const isToday = targetDate === getTodayKey();
    
    // Optimistically update local state and storage first
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
    
    const optimisticDrink: Drink = {
      id: `temp-${Date.now()}`,
      type,
      customDrinkId,
      amount,
      timestamp: new Date(),
      hydrationValue,
      label,
      source: 'local',
    };
    
    setTodayRecord((prevRecord) => {
      if (!prevRecord || prevRecord.date !== targetDate) return prevRecord;
      
      const updatedRecord = {
        ...prevRecord,
        drinks: [...prevRecord.drinks, optimisticDrink],
        totalHydration: prevRecord.totalHydration + hydrationValue,
      };
      
      // Save optimistically to localStorage
      saveDayRecord(updatedRecord);
      return updatedRecord;
    });
    
    setRecordsByDate((prev) => {
      const existing = prev[targetDate];
      if (!existing) return prev;
      
      const updated = {
        ...existing,
        drinks: [...existing.drinks, optimisticDrink],
        totalHydration: existing.totalHydration + hydrationValue,
      };
      
      return { ...prev, [targetDate]: updated };
    });

    try {
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

      console.log('Water logged successfully, refreshing data...');
      
      // Force a full refresh to get the latest data
      const today = getTodayKey();
      
      console.log('Fetching data for date:', today, 'timezone:', timezone);
      
      const [record, statsResponse] = await Promise.all([
        fetchDayRecordFromBackend(today, timezone),
        fetchHydrationStatsFromBackend(timezone, 7),
      ]);
      await syncCustomDrinksFromBackend();

      console.log('Raw API Response - record:', JSON.stringify(record, null, 2));
      console.log('Raw API Response - statsResponse:', JSON.stringify(statsResponse, null, 2));
      console.log('Fetched updated record:', record);
      console.log('Total drinks in record:', record?.drinks.length || 0);

      if (record) {
        setTodayRecord(record);
        saveDayRecord(record);
        setRecordsByDate((prev) => ({ ...prev, [record.date]: record }));
        if (record.goal) {
          setGoal(record.goal);
          saveDailyGoal(record.goal);
        }
      }

      if (statsResponse) {
        const mapped = mapBackendStatsToUserStats(statsResponse);
        setStats((prev) => {
          const mergedAchievements = mapped.achievements.map((backendAch) => {
            const localAch = prev.achievements?.find(a => a.id === backendAch.id);
            if (localAch && localAch.unlocked && localAch.unlockedDate) {
              return {
                ...backendAch,
                unlockedDate: localAch.unlockedDate,
              };
            }
            return backendAch;
          });
          
          const next = { ...mapped, achievements: mergedAchievements };
          saveUserStats(next);
          return next;
        });
      }

      return;
    }

    // Backend not enabled, just update stats locally
    const record = getDayRecord(targetDate);
    if (record) {
      updateStats(record);
    }
    } catch (error) {
      console.error('Failed to add drink:', error);
      
      // Revert optimistic update on failure
      if (isToday) {
        const currentRecord = getDayRecord(targetDate);
        if (currentRecord) {
          // Remove the optimistic drink
          const revertedRecord = {
            ...currentRecord,
            drinks: currentRecord.drinks.filter(d => d.id !== optimisticDrink.id),
            totalHydration: currentRecord.totalHydration - hydrationValue,
          };
          setTodayRecord(revertedRecord);
          saveDayRecord(revertedRecord);
          setRecordsByDate((prev) => ({ ...prev, [targetDate]: revertedRecord }));
        }
      }
      
      throw error; // Re-throw to let UI handle error
    }
  }, [updateStats]);

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
        await refreshBackendData(true);
      } catch (error) {
        console.warn('Failed to sync goal with backend', error);
      }
    }
  }, [todayRecord, refreshBackendData]);

  const setDailyGoal = useCallback(async (date: string, goalMl: number) => {
    // Update local record if it exists
    const existingRecord = recordsByDate[date] ?? getDayRecord(date);
    if (existingRecord) {
      const updatedRecord = { ...existingRecord, goal: goalMl };
      saveDayRecord(updatedRecord);
      setRecordsByDate((prev) => ({ ...prev, [date]: updatedRecord }));
      if (date === getTodayKey()) {
        setTodayRecord(updatedRecord);
        setGoal(goalMl);
      }
    }

    // Sync with backend
    if (backendIsEnabled()) {
      try {
        await setDailyGoalToBackend(date, goalMl);
        // Refresh backend data to get updated summaries
        await refreshBackendData(true);
      } catch (error) {
        console.warn('Failed to sync daily goal with backend', error);
      }
    }
  }, [recordsByDate, refreshBackendData]);

  const removeDrink = useCallback(async (drinkId: string, date?: string): Promise<DayRecord | null> => {
    const targetDate = date || getTodayKey();
    const currentRecord = recordsByDate[targetDate]
      ?? (targetDate === getTodayKey() ? todayRecord : null)
      ?? getDayRecord(targetDate);

    if (!currentRecord) {
      return null;
    }

    const drinkToRemove = currentRecord.drinks.find((d) => d.id === drinkId);
    if (!drinkToRemove) {
      return currentRecord;
    }

    const updatedDrinks = currentRecord.drinks.filter((d) => d.id !== drinkId);
    const totalHydration = updatedDrinks.reduce((sum, d) => sum + d.hydrationValue, 0);

    const updatedRecord: DayRecord = {
      ...currentRecord,
      drinks: updatedDrinks,
      totalHydration,
    };

    const applyLocalUpdates = () => {
      saveDayRecord(updatedRecord);
      setRecordsByDate((prev) => ({ ...prev, [updatedRecord.date]: updatedRecord }));
      if (targetDate === getTodayKey()) {
        setTodayRecord(updatedRecord);
      }
    };

    if (backendIsEnabled()) {
      await removeHydrationLogFromBackend(drinkId);
      applyLocalUpdates();
      void (async () => {
        try {
          await refreshBackendData(true);
        } catch (error) {
          console.warn('Failed to refresh backend data after removal', error);
        }
      })();
    } else {
      applyLocalUpdates();
      setStats((prevStats) => {
        const nextStats: UserStats = {
          ...prevStats,
          totalWaterConsumed: Math.max(0, prevStats.totalWaterConsumed - drinkToRemove.hydrationValue),
        };

        if (prevStats.history) {
          nextStats.history = prevStats.history.map((entry) => {
            if (entry.date !== targetDate) {
              return entry;
            }
            const nextTotalVolume = Math.max(0, entry.totalVolumeMl - drinkToRemove.amount);
            const nextTotalEffective = Math.max(0, entry.totalEffectiveMl - drinkToRemove.hydrationValue);
            const nextProgress = entry.goalVolumeMl > 0 ? (nextTotalEffective / entry.goalVolumeMl) * 100 : 0;
            let status = 'not_started';
            if (nextTotalEffective >= entry.goalVolumeMl && entry.goalVolumeMl > 0) {
              status = 'completed';
            } else if (nextTotalEffective > 0) {
              status = 'in_progress';
            }

            return {
              ...entry,
              totalVolumeMl: nextTotalVolume,
              totalEffectiveMl: nextTotalEffective,
              progressPercentage: nextProgress,
              status,
            };
          });
        }

        saveUserStats(nextStats);
        return nextStats;
      });
    }

    return updatedRecord;
  }, [recordsByDate, todayRecord, refreshBackendData]);

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

  const refreshData = useCallback(async () => {
    await refreshBackendData(true);
  }, [refreshBackendData]);

  return {
    todayRecord,
    stats,
    goal,
    addDrink,
    updateGoal,
    setDailyGoal,
    removeDrink,
    loadRecordForDate,
    recordsByDate,
    isLoading,
    refreshData,
  };
}
