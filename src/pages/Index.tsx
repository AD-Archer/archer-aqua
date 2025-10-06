import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWaterTracking } from '@/hooks/useWaterTracking';
import { CircularProgress } from '@/components/CircularProgress';
import { QuickAddButtons } from '@/components/QuickAddButtons';
import { AddDrinkDialog } from '@/components/AddDrinkDialog';
import { AchievementCard } from '@/components/AchievementCard';
import { StatsView } from '@/components/StatsView';
import { HydrationStatus } from '@/components/HydrationStatus';
import { DrinkType } from '@/types/water';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Settings, Trophy, BarChart3, Droplet } from 'lucide-react';
import { toast } from 'sonner';
import { isAuthenticated } from '@/lib/storage';

const Index = () => {
  const navigate = useNavigate();
  const { todayRecord, stats, goal, addDrink, updateGoal } = useWaterTracking();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

  const handleQuickAdd = (amount: number) => {
    addDrink('water', amount);
    toast.success(`Added ${amount}ml of water! 💧`);
  };

  const handleAddDrink = (type: DrinkType, amount: number) => {
    addDrink(type, amount);
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
    };
    toast.success(`Added ${amount}ml of ${drinkNames[type]}!`);
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

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="today">
              <Droplet className="h-4 w-4 mr-2" />
              Today
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
              />
              <HydrationStatus percentage={percentage} />
            </div>

            {/* Quick Add Buttons */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Quick Add</h2>
              <QuickAddButtons
                onQuickAdd={handleQuickAdd}
                onCustomAdd={() => setDialogOpen(true)}
              />
            </div>

            {/* Today's Drinks */}
            {todayRecord && todayRecord.drinks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Today's Drinks</h2>
                <div className="space-y-2">
                  {todayRecord.drinks.slice().reverse().map((drink) => (
                    <div
                      key={drink.id}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Droplet className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium capitalize">{drink.type}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(drink.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{drink.amount}ml</div>
                        <div className={`text-sm ${drink.hydrationValue >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {drink.hydrationValue > 0 ? '+' : ''}{drink.hydrationValue.toFixed(0)}ml
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
