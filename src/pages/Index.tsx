import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWaterTracking } from '@/hooks/useWaterTracking';
import { CircularProgress } from '@/components/CircularProgress';
import { QuickAddButtons } from '@/components/QuickAddButtons';
import { AddDrinkDialog } from '@/components/AddDrinkDialog';
import { AchievementCard } from '@/components/AchievementCard';
import { StatsView } from '@/components/StatsView';
import { HydrationStatus } from '@/components/HydrationStatus';
import { CalendarView } from '@/components/CalendarView';
import { WeatherCard } from '@/components/WeatherCard';
import { DrinkType, formatVolume, DRINK_COLORS } from '@/types/water';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Settings, Trophy, BarChart3, Droplet, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { isAuthenticated, getUnitPreference, getCustomDrinkById, getTodayKey, getUseWeatherAdjustment } from '@/lib/storage';
import { format } from 'date-fns';
import { getDrinkIcon } from '@/lib/iconMap';
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
  const { todayRecord, stats, goal, addDrink, updateGoal, removeDrink } = useWaterTracking();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unitPreference, setUnitPreference] = useState(getUnitPreference());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey());
  const [currentTab, setCurrentTab] = useState('today');
  const [showWeather, setShowWeather] = useState(getUseWeatherAdjustment());

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

  const handleQuickAdd = (amount: number) => {
    addDrink('water', amount, undefined, selectedDate);
    const isToday = selectedDate === getTodayKey();
    const dateText = isToday ? 'today' : format(new Date(selectedDate), 'MMM d');
    toast.success(`Added ${formatVolume(amount, unitPreference)} of water to ${dateText}!`);
  };

  const handleAddDrink = (type: DrinkType, amount: number, customDrinkId?: string) => {
    addDrink(type, amount, customDrinkId, selectedDate);
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
    const isToday = selectedDate === getTodayKey();
    const dateText = isToday ? 'today' : format(new Date(selectedDate), 'MMM d');
    toast.success(`Added ${formatVolume(amount, unitPreference)} of ${drinkNames[type]} to ${dateText}!`);
  };

  const handleDateSelect = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateString);
  };

  const handleRemoveDrink = (drinkId: string, date?: string) => {
    removeDrink(drinkId, date);
    toast.success('Drink removed');
  };

  const current = todayRecord?.totalHydration || 0;
  const percentage = (current / goal) * 100;

  return (
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

        <Tabs defaultValue="today" className="w-full" value={currentTab} onValueChange={(value) => {
          setCurrentTab(value);
          if (value === 'today') {
            setSelectedDate(getTodayKey());
          }
        }}>
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
              />
              <HydrationStatus percentage={percentage} />
            </div>

            {/* Quick Add Buttons */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Quick Add</h2>
              <QuickAddButtons
                onQuickAdd={handleQuickAdd}
                onCustomAdd={() => setDialogOpen(true)}
                unit={unitPreference}
              />
            </div>

            {/* Today's Drinks */}
            {todayRecord && todayRecord.drinks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Today's Drinks</h2>
                <div className="space-y-2">
                  {todayRecord.drinks.slice().reverse().map((drink) => {
                    const isCustom = drink.type === 'custom' && drink.customDrinkId;
                    const customDrink = isCustom ? getCustomDrinkById(drink.customDrinkId!) : null;
                    const drinkColor = isCustom && customDrink ? customDrink.color : DRINK_COLORS[drink.type as Exclude<DrinkType, 'custom'>];
                    const DrinkIcon = getDrinkIcon(drink.type);
                    const drinkName = isCustom && customDrink ? customDrink.name : drink.type.replace('_', ' ');
                    
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
                                <AlertDialogAction onClick={() => handleRemoveDrink(drink.id)} className="bg-destructive text-destructive-foreground">
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
              onRemoveDrink={handleRemoveDrink}
              onAddDrink={() => setDialogOpen(true)}
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

        {/* Add Drink Dialog */}
        <AddDrinkDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onAddDrink={handleAddDrink}
        />
      </div>
    </div>
  );
};

export default Index;
