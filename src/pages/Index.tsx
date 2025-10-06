import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWaterTracking } from '@/hooks/useWaterTracking';
import { SEO } from '@/components/SEO';
import { CircularProgress } from '@/components/CircularProgress';
import { QuickAddButtons } from '@/components/QuickAddButtons';
import { AchievementCard } from '@/components/AchievementCard';
import { StatsView } from '@/components/StatsView';
import { HydrationStatus } from '@/components/HydrationStatus';
import { CalendarView } from '@/components/CalendarView';
import { WeatherCard } from '@/components/WeatherCard';
import { DrinkType, DayRecord, formatVolume, DRINK_COLORS } from '@/types/water';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Settings, Trophy, BarChart3, Droplet, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { isAuthenticated, getUnitPreference, getCustomDrinkById, getCustomDrinkByLabel, getTodayKey, getUseWeatherAdjustment, getProgressWheelStyle, getUserProfile } from '@/lib/storage';
import { format, parseISO } from 'date-fns';
import { getDrinkIcon } from '@/lib/iconMap';
import { backendIsEnabled } from '@/lib/backend';
import { getAuthState } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const Index = () => {
  const navigate = useNavigate();
  const { todayRecord, stats, goal, addDrink, updateGoal, removeDrink, loadRecordForDate, recordsByDate, isLoading: isDataLoading } = useWaterTracking();
  const [unitPreference, setUnitPreference] = useState(getUnitPreference());
  const [todayKey, setTodayKey] = useState(getTodayKey());
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [selectedRecord, setSelectedRecord] = useState<DayRecord | null>(todayRecord ?? null);
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('today');
  const [showWeather, setShowWeather] = useState(getUseWeatherAdjustment());
  const [progressWheelStyle, setProgressWheelStyle] = useState(getProgressWheelStyle());
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  // Get all drinks for today
  const allDrinks = todayRecord?.drinks || [];
  
  // Get unique recent drinks (last 4 unique drink types/amounts)
  const getUniqueRecentDrinks = () => {
    const reversedDrinks = [...allDrinks].reverse();
    const uniqueDrinks: typeof allDrinks = [];
    const seenCombos = new Set<string>();
    
    for (const drink of reversedDrinks) {
      const combo = `${drink.type}-${drink.label ?? ''}-${drink.amount}-${drink.customDrinkId || ''}`;
      if (!seenCombos.has(combo) && uniqueDrinks.length < 4) {
        uniqueDrinks.push(drink);
        seenCombos.add(combo);
      }
    }
    
    return uniqueDrinks;
  };

  const recentUniqueDrinks = getUniqueRecentDrinks();

  const resolveCustomDrink = (customDrinkId?: string, label?: string | null) => {
    const byId = customDrinkId ? getCustomDrinkById(customDrinkId) : null;
    if (byId) {
      return byId;
    }
    return label ? getCustomDrinkByLabel(label) : null;
  };

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      if (!isAuthenticated()) {
        navigate('/');
        return;
      }

      // Check if profile is complete in backend
      if (backendIsEnabled()) {
        try {
          const authState = await getAuthState();
          if (!authState?.hasProfile) {
            // Profile not complete, redirect to setup
            navigate('/profile-setup', { replace: true });
            return;
          }
        } catch (error) {
          console.warn('Failed to check backend profile status', error);
          // Fallback to local check
          const localProfile = getUserProfile();
          if (!localProfile || !localProfile.weight || !localProfile.age) {
            navigate('/profile-setup', { replace: true });
            return;
          }
        }
      } else {
        // Check local profile
        const localProfile = getUserProfile();
        if (!localProfile || !localProfile.weight || !localProfile.age) {
          navigate('/profile-setup', { replace: true });
          return;
        }
      }
      
      setIsCheckingProfile(false);
    };

    checkAuthAndProfile();
  }, [navigate]);

  const handleQuickAdd = async (amount: number) => {
    try {
      await addDrink('water', amount, undefined, selectedDate);
      const isToday = selectedDate === todayKey;
      const parsedDate = parseISO(selectedDate);
      const dateText = isToday ? 'today' : format(parsedDate, 'MMM d');
      toast.success(`Added ${formatVolume(amount, unitPreference)} of water to ${dateText}!`);
      setIsRecordLoading(true);
      try {
        const updatedRecord = await loadRecordForDate(selectedDate);
        setSelectedRecord(updatedRecord);
      } finally {
        setIsRecordLoading(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to log water intake';
      toast.error(message);
    }
  };

  const handleAddDrink = async (type: DrinkType, amount: number, customDrinkId?: string) => {
    try {
      await addDrink(type, amount, customDrinkId, selectedDate);
      const drinkNames: Record<DrinkType, string> = {
        water: 'water',
        coffee: 'coffee',
        tea: 'tea',
        juice: 'juice',
        soda: 'soda',
        alcohol: 'alcohol',
        energy_drink: 'energy drink',
        milk: 'milk',
        sports_drink: 'sports drink',
        custom: 'custom drink',
      };
      const isToday = selectedDate === todayKey;
      const parsedDate = parseISO(selectedDate);
      const dateText = isToday ? 'today' : format(parsedDate, 'MMM d');
      toast.success(`Added ${formatVolume(amount, unitPreference)} of ${drinkNames[type]} to ${dateText}!`);
      setIsRecordLoading(true);
      try {
        const updatedRecord = await loadRecordForDate(selectedDate);
        setSelectedRecord(updatedRecord);
      } finally {
        setIsRecordLoading(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add drink';
      toast.error(message);
    }
  };

  const handleDateSelect = async (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateString);
    setCurrentTab('calendar');
    const cached = recordsByDate[dateString];
    if (cached) {
      setSelectedRecord(cached);
      setIsRecordLoading(false);
      return;
    }
    setIsRecordLoading(true);
    try {
      const fetched = await loadRecordForDate(dateString);
      setSelectedRecord(fetched);
    } finally {
      setIsRecordLoading(false);
    }
  };

  const handleRemoveDrink = async (drinkId: string, date?: string) => {
    const targetDate = date ?? selectedDate;
    setIsRecordLoading(true);
    try {
      const updatedRecord = await removeDrink(drinkId, date);
      if (targetDate === selectedDate) {
        setSelectedRecord(updatedRecord ?? null);
      }
      toast.success('Drink removed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove drink';
      toast.error(message);
    } finally {
      setIsRecordLoading(false);
    }
  };

  const handleCalendarAddDrink = () => {
    const nextTodayKey = getTodayKey();
    setTodayKey(nextTodayKey);
    setSelectedDate(nextTodayKey);
    setCurrentTab('today');
    const todayCandidate = todayRecord ?? recordsByDate[nextTodayKey] ?? null;
    setSelectedRecord(todayCandidate);
    setIsRecordLoading(false);
  };

  const current = todayRecord?.totalHydration || 0;
  const percentage = (current / goal) * 100;

  useEffect(() => {
    const nextTodayKey = getTodayKey();
    setTodayKey(nextTodayKey);
    if (selectedDate === nextTodayKey) {
      setSelectedRecord(todayRecord ?? null);
    }
  }, [todayRecord, selectedDate]);

  useEffect(() => {
    const cached = recordsByDate[selectedDate];
    if (cached) {
      setSelectedRecord(cached);
      setIsRecordLoading(false);
    }
  }, [recordsByDate, selectedDate]);

  const selectedDateObj = (() => {
    const parsed = parseISO(selectedDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  })();

  // Show loading state while checking profile or loading data
  if (isCheckingProfile || isDataLoading) {
    return (
      <>
        <SEO 
          title="Dashboard"
          description="Track your daily water intake with Archer Aqua. Monitor hydration levels, view achievements, and stay healthy with AI-powered insights."
          url="https://aqua.adarcher.app/"
        />
        <div className="min-h-screen bg-gradient-sky flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Droplet className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground">Loading your hydration data...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO 
        title="Dashboard"
        description="Track your daily water intake with Archer Aqua. Monitor hydration levels, view achievements, and stay healthy with AI-powered insights."
        url="https://aqua.adarcher.app/"
      />
      <div className="min-h-screen bg-gradient-sky">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Droplet className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                <span className="text-secondary">ARCHER</span>{' '}
                <span className="text-primary">AQUA</span>
              </h1>
              <p className="text-sm text-muted-foreground">Hydrate. Track. Thrive.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/settings')}
            className="rounded-full"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </header>

        <Tabs
          defaultValue="today"
          className="w-full"
          value={currentTab}
          onValueChange={(value) => {
            setCurrentTab(value);
            if (value === 'today') {
              const nextTodayKey = getTodayKey();
              setTodayKey(nextTodayKey);
              setSelectedDate(nextTodayKey);
              setSelectedRecord(todayRecord ?? recordsByDate[nextTodayKey] ?? null);
              setIsRecordLoading(false);
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="today">
              <Droplet className="h-4 w-4 mr-2" />
              Today
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="h-4 w-4 mr-2" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="achievements">
              <Trophy className="h-4 w-4 mr-2" />
              Awards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            {/* Progress Circle */}
            <div className="flex flex-col items-center">
              <CircularProgress
                progress={percentage}
                current={current}
                goal={goal}
                className="mb-4"
                unit={unitPreference}
                progressWheelStyle={progressWheelStyle}
                drinks={allDrinks}
              />
              <HydrationStatus percentage={percentage} />
            </div>

            {/* Quick Add Buttons */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Quick Add</h2>
              <QuickAddButtons
                onQuickAdd={handleQuickAdd}
                onAddDrink={handleAddDrink}
                unit={unitPreference}
              />
            </div>

            {/* Recent Drink Quick Add Cards */}
            {recentUniqueDrinks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Quick Add Recent</h2>
                <div className="grid grid-cols-2 gap-3">
                  {recentUniqueDrinks.map((drink, index) => {
                    const isCustom = drink.type === 'custom';
                    const customDrink = isCustom ? resolveCustomDrink(drink.customDrinkId, drink.label) : null;
                    const baseColor = drink.type !== 'custom'
                      ? DRINK_COLORS[drink.type as Exclude<DrinkType, 'custom'>]
                      : undefined;
                    const drinkColor = isCustom && customDrink ? customDrink.color : baseColor ?? '#0ea5e9';
                    const DrinkIcon = getDrinkIcon(drink.type, drink.customDrinkId, drink.label ?? customDrink?.name);
                    const drinkName = drink.label ?? (isCustom && customDrink ? customDrink.name : drink.type.replace('_', ' '));
                    
                    return (
                      <Button
                        key={`${drink.type}-${drink.amount}-${index}`}
                        onClick={() => handleAddDrink(drink.type, drink.amount, drink.customDrinkId)}
                        variant="outline"
                        className="flex flex-col h-24 hover:bg-primary/10 hover:border-primary transition-all group p-3"
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: `${drinkColor}20`, color: drinkColor }}
                        >
                          <DrinkIcon className="h-5 w-5" style={{ color: drinkColor }} />
                        </div>
                        <span className="text-sm font-medium capitalize">{drinkName}</span>
                        <span className="text-xs text-muted-foreground">{formatVolume(drink.amount, unitPreference)}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Today's Drinks - All drinks with scrollable container */}
            {allDrinks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Today's Drinks</h2>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                  {[...allDrinks].reverse().map((drink) => {
                    const isCustom = drink.type === 'custom';
                    const customDrink = isCustom ? resolveCustomDrink(drink.customDrinkId, drink.label) : null;
                    const baseColor = drink.type !== 'custom'
                      ? DRINK_COLORS[drink.type as Exclude<DrinkType, 'custom'>]
                      : undefined;
                    const drinkColor = isCustom && customDrink ? customDrink.color : baseColor ?? '#0ea5e9';
                    const DrinkIcon = getDrinkIcon(drink.type, drink.customDrinkId, drink.label ?? customDrink?.name);
                    const drinkName = drink.label ?? (isCustom && customDrink ? customDrink.name : drink.type.replace('_', ' '));
                    
                    return (
                      <div
                        key={drink.id}
                        className="flex items-center justify-between p-3 bg-card rounded-lg border"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${drinkColor}20`, color: drinkColor }}
                          >
                            <DrinkIcon className="h-5 w-5" style={{ color: drinkColor }} />
                          </div>
                          <div>
                            <div className="font-medium capitalize">{drinkName}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(drink.timestamp).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-semibold">{formatVolume(drink.amount, unitPreference)}</div>
                            <div className={`text-sm ${drink.hydrationValue >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              {drink.hydrationValue > 0 ? '+' : ''}{formatVolume(drink.hydrationValue, unitPreference)}
                            </div>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Drink?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove this drink entry? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void handleRemoveDrink(drink.id)} className="bg-destructive text-destructive-foreground">
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <CalendarView 
              unitPreference={unitPreference}
              record={selectedRecord}
              selectedDate={selectedDateObj}
              todayKey={todayKey}
              hydrationHistory={stats.history}
              recordsByDate={recordsByDate}
              isLoading={isRecordLoading}
              onRemoveDrink={handleRemoveDrink}
              onAddDrink={handleCalendarAddDrink}
              onDateSelect={handleDateSelect}
            />
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <StatsView stats={stats} />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            {stats.achievements.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
};

export default Index;
