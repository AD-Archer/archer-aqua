import { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, CheckCircle2, Circle } from 'lucide-react';
import { getCustomDrinkById, getCustomDrinkByLabel } from '@/lib/storage';
import { DrinkType, DRINK_COLORS, formatVolume, VolumeUnit, Drink, DayRecord, DailyHydrationSummary } from '@/types/water';
import { format, parseISO } from 'date-fns';
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
  record: DayRecord | null;
  selectedDate: Date;
  todayKey: string;
  hydrationHistory?: DailyHydrationSummary[];
  recordsByDate?: Record<string, DayRecord>;
  isLoading?: boolean;
  onRemoveDrink: (drinkId: string, date: string) => void | Promise<void>;
  onAddDrink: () => void;
  onDateSelect: (date: Date) => void | Promise<void>;
}

export function CalendarView({
  unitPreference,
  record,
  hydrationHistory,
  recordsByDate,
  selectedDate,
  todayKey,
  isLoading = false,
  onRemoveDrink,
  onAddDrink,
  onDateSelect,
}: CalendarViewProps) {
  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const isToday = selectedDateString === todayKey;
  const isFutureDate = selectedDate > new Date();

  const historyMap = useMemo(() => {
    const map = new Map<string, DailyHydrationSummary>();
    hydrationHistory?.forEach((entry) => {
      map.set(entry.date, entry);
    });
    return map;
  }, [hydrationHistory]);

  const recordsMap = useMemo(() => recordsByDate ?? {}, [recordsByDate]);

  const calendarModifiers = useMemo(() => ({
    hasData: (date: Date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayRecord = recordsMap[dateKey];
      if (dayRecord) {
        return dayRecord.drinks.length > 0 || dayRecord.totalHydration > 0;
      }
      const historyEntry = historyMap.get(dateKey);
      return historyEntry ? historyEntry.totalVolumeMl > 0 : false;
    },
    goalMet: (date: Date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayRecord = recordsMap[dateKey];
      if (dayRecord) {
        return dayRecord.totalHydration >= dayRecord.goal;
      }
      const historyEntry = historyMap.get(dateKey);
      return historyEntry ? historyEntry.status === 'completed' : false;
    },
  }), [recordsMap, historyMap]);

  const displayRecord = useMemo(() => {
    if (record && record.date === selectedDateString) {
      return record;
    }
    if (recordsMap[selectedDateString]) {
      return recordsMap[selectedDateString];
    }
    const historyEntry = historyMap.get(selectedDateString);
    if (!historyEntry) {
      return null;
    }
    return {
      date: historyEntry.date,
      drinks: [],
      totalHydration: historyEntry.totalEffectiveMl,
      goal: historyEntry.goalVolumeMl,
    } as DayRecord;
  }, [record, recordsMap, historyMap, selectedDateString]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      return;
    }
    void onDateSelect(date);
  };

  const handleTodayClick = () => {
    const today = parseISO(todayKey);
    void onDateSelect(Number.isNaN(today.getTime()) ? new Date() : today);
  };

  const drinks = displayRecord?.drinks ?? [];
  const totalHydration = displayRecord?.totalHydration ?? 0;
  const goal = displayRecord?.goal ?? 0;

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
            modifiers={calendarModifiers}
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
                {displayRecord ? `${drinks.length} drink${drinks.length !== 1 ? 's' : ''} • ${formatVolume(totalHydration, unitPreference)} hydration` : 'No drinks recorded'}
              </CardDescription>
            </div>
            <Button onClick={onAddDrink} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Drink
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Loading hydration data...</p>
            </div>
          ) : !displayRecord || drinks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No drinks recorded for this date</p>
              {isFutureDate && (
                <p className="text-sm mt-2">Future date - you can add drinks in advance</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {drinks.slice().reverse().map((drink: Drink) => {
                const isCustom = drink.type === 'custom';
                const customDrink = isCustom
                  ? (drink.customDrinkId ? getCustomDrinkById(drink.customDrinkId) : null) ?? (drink.label ? getCustomDrinkByLabel(drink.label) : null)
                  : null;
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
                            <AlertDialogAction 
                              onClick={() => void onRemoveDrink(drink.id, selectedDateString)} 
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

      {displayRecord && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Hydration</p>
                <p className="text-2xl font-bold text-primary">
                  {formatVolume(totalHydration, unitPreference)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Goal</p>
                <p className="text-2xl font-bold">
                  {formatVolume(goal, unitPreference)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">
                  {goal > 0 ? ((totalHydration / goal) * 100).toFixed(0) : '0'}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className={`flex items-center gap-2 text-xl font-bold ${totalHydration >= goal && goal > 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                  {totalHydration >= goal && goal > 0 ? (
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
