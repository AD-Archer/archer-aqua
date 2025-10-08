import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  RefreshCw, 
  AlertCircle, 
  Thermometer,
  Droplets,
  ChevronLeft,
  ChevronRight,
  GlassWater,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getWeeklyWeatherData, 
  formatTemperature,
  getClimateFromTemperature,
  calculateWeatherMultiplier
} from '@/lib/weather';
import type { WeatherData } from '@/lib/weather';
import { getTemperatureUnitPreference, getDailyGoal } from '@/lib/storage';

export function WeeklyWeatherView() {
  const [weeklyWeather, setWeeklyWeather] = useState<WeatherData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [selectedWeather, setSelectedWeather] = useState<WeatherData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const temperatureUnit = getTemperatureUnitPreference();

  const loadWeeklyWeather = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getWeeklyWeatherData(false);
      setWeeklyWeather(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load weekly weather';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWeeklyWeather();
  }, []);

  const getHydrationAdjustment = (weather: WeatherData) => {
    const multiplier = calculateWeatherMultiplier(weather);
    const percentChange = Math.round((multiplier - 1) * 100);
    
    if (percentChange > 0) {
      return { text: `+${percentChange}%`, variant: 'default' as const };
    } else if (percentChange < 0) {
      return { text: `${percentChange}%`, variant: 'secondary' as const };
    }
    return { text: 'Normal', variant: 'secondary' as const };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tmr';
    
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getEstimatedGoal = (weather: WeatherData) => {
    const baseGoal = getDailyGoal();
    const multiplier = calculateWeatherMultiplier(weather);
    const estimatedGoal = Math.round(baseGoal * multiplier);
    return estimatedGoal;
  };

  const handleWeatherClick = (weather: WeatherData) => {
    setSelectedWeather(weather);
    setIsModalOpen(true);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="ml-2">{error}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (weeklyWeather.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
          <p className="text-sm text-muted-foreground">No weekly weather data available</p>
          <Button onClick={loadWeeklyWeather} variant="outline">
            Load Weekly Weather
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            7-Day Weather Forecast
          </CardTitle>
          <Button
            onClick={loadWeeklyWeather}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {weeklyWeather.map((weather, index) => {
            const adjustment = getHydrationAdjustment(weather);
            const climate = getClimateFromTemperature(weather.temperature);
            const estimatedGoal = getEstimatedGoal(weather);
            
            return (
              <div
                key={weather.date || index}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-2 cursor-pointer"
                onClick={() => handleWeatherClick(weather)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-14 text-sm font-medium text-muted-foreground flex-shrink-0">
                    {weather.date && formatDate(weather.date)}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Thermometer className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-semibold truncate">
                      {formatTemperature(weather.temperature, temperatureUnit)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Droplets className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">
                      {weather.humidity}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <GlassWater className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-primary">
                      {estimatedGoal}ml
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground capitalize hidden sm:inline">
                    {climate}
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <span className="text-sm text-muted-foreground capitalize sm:hidden">
                    {climate}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant={adjustment.variant}>
                      {adjustment.text}
                    </Badge>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            {selectedWeather?.date && formatDate(selectedWeather.date)} Weather Details
          </DialogTitle>
        </DialogHeader>

        {selectedWeather && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Temperature</p>
                  <p className="font-semibold">{formatTemperature(selectedWeather.temperature, temperatureUnit)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Humidity</p>
                  <p className="font-semibold">{selectedWeather.humidity}%</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <GlassWater className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Est. Goal</p>
                  <p className="font-semibold">{getEstimatedGoal(selectedWeather)}ml</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Climate</p>
                  <p className="font-semibold capitalize">{getClimateFromTemperature(selectedWeather.temperature)}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hydration Adjustment</span>
                <Badge variant={getHydrationAdjustment(selectedWeather).variant}>
                  {getHydrationAdjustment(selectedWeather).text}
                </Badge>
              </div>
            </div>

            {selectedWeather.description && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">Conditions</p>
                <p className="font-medium capitalize">{selectedWeather.description}</p>
              </div>
            )}

            {(selectedWeather.windSpeed || selectedWeather.precipitation !== undefined) && (
              <div className="pt-2 border-t">
                <div className="grid grid-cols-2 gap-4">
                  {selectedWeather.windSpeed && (
                    <div>
                      <p className="text-sm text-muted-foreground">Wind Speed</p>
                      <p className="font-semibold">{selectedWeather.windSpeed} km/h</p>
                    </div>
                  )}
                  {selectedWeather.precipitation !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Precipitation</p>
                      <p className="font-semibold">{selectedWeather.precipitation} mm</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
