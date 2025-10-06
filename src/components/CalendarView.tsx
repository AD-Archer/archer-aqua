import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, CheckCircle2, Circle } from 'lucide-react';
import { getDayRecord, getTodayKey, getCustomDrinkById } from '@/lib/storage';
import { DrinkType, DRINK_COLORS, formatVolume, VolumeUnit, Drink } from '@/types/water';
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

interface CalendarViewProps {
  unitPreference: VolumeUnit;
  onRemoveDrink: (drinkId: string, date: string) => void;
  onAddDrink: () => void;
  onDateSelect: (date: Date) => void;
}

export function CalendarView({ unitPreference, onRemoveDrink, onAddDrink, onDateSelect }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDateString, setSelectedDateString] = useState(getTodayKey());

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const dateString = format(date, 'yyyy-MM-dd');
      setSelectedDateString(dateString);
      onDateSelect(date);
    }
  };

  const handleTodayClick = () => {
    const today = new Date();
    setSelectedDate(today);
    setSelectedDateString(getTodayKey());
    onDateSelect(today);
  };

  const record = getDayRecord(selectedDateString);
  const isToday = selectedDateString === getTodayKey();
  const isFutureDate = new Date(selectedDateString) > new Date();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Date</CardTitle>
              <CardDescription>
                View and manage your hydration for any date
              </CardDescription>
            </div>
            {!isToday && (
              <Button onClick={handleTodayClick} size="sm" variant="outline">
                Jump to Today
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
            modifiers={{
              hasData: (date) => {
                const dateString = format(date, 'yyyy-MM-dd');
                const dayRecord = getDayRecord(dateString);
                return dayRecord !== null && dayRecord.drinks.length > 0;
              },
              goalMet: (date) => {
                const dateString = format(date, 'yyyy-MM-dd');
                const dayRecord = getDayRecord(dateString);
                return dayRecord !== null && dayRecord.totalHydration >= dayRecord.goal;
              },
            }}
            modifiersClassNames={{
              hasData: 'font-bold underline decoration-primary decoration-2 underline-offset-2',
              goalMet: 'bg-green-500/20 text-green-700 dark:text-green-300 font-extrabold ring-2 ring-green-500/50',
            }}
          />
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500/20 ring-2 ring-green-500/50 flex items-center justify-center text-green-700 dark:text-green-300 font-bold">
                15
              </div>
              <span className="text-muted-foreground">Goal Met</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold underline decoration-primary decoration-2">
                15
              </div>
              <span className="text-muted-foreground">Has Data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                15
              </div>
              <span className="text-muted-foreground">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold">
                15
              </div>
              <span className="text-muted-foreground">Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {isToday ? "Today's Drinks" : format(selectedDate, 'MMMM d, yyyy')}
              </CardTitle>
              <CardDescription>
                {record ? `${record.drinks.length} drink${record.drinks.length !== 1 ? 's' : ''} • ${formatVolume(record.totalHydration, unitPreference)} hydration` : 'No drinks recorded'}
              </CardDescription>
            </div>
            <Button onClick={onAddDrink} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Drink
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!record || record.drinks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No drinks recorded for this date</p>
              {isFutureDate && (
                <p className="text-sm mt-2">Future date - you can add drinks in advance</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {record.drinks.slice().reverse().map((drink: Drink) => {
                const isCustom = drink.type === 'custom' && drink.customDrinkId;
                const customDrink = isCustom ? getCustomDrinkById(drink.customDrinkId!) : null;
                const drinkColor = isCustom && customDrink ? customDrink.color : DRINK_COLORS[drink.type as Exclude<DrinkType, 'custom'>];
                const DrinkIcon = getDrinkIcon(drink.type, drink.customDrinkId);
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
                            <AlertDialogAction 
                              onClick={() => onRemoveDrink(drink.id, selectedDateString)} 
                              className="bg-destructive text-destructive-foreground"
                            >
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
          )}
        </CardContent>
      </Card>

      {record && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Hydration</p>
                <p className="text-2xl font-bold text-primary">
                  {formatVolume(record.totalHydration, unitPreference)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Goal</p>
                <p className="text-2xl font-bold">
                  {formatVolume(record.goal, unitPreference)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">
                  {((record.totalHydration / record.goal) * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className={`flex items-center gap-2 text-xl font-bold ${record.totalHydration >= record.goal ? 'text-green-500' : 'text-yellow-500'}`}>
                  {record.totalHydration >= record.goal ? (
                    <>
                      <CheckCircle2 className="h-6 w-6" />
                      <span>Met</span>
                    </>
                  ) : (
                    <>
                      <Circle className="h-6 w-6" />
                      <span>In Progress</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
