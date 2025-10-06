import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  AlertCircle, 
  Thermometer,
  Droplets,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getWeeklyWeatherData, 
  formatTemperature,
  getClimateFromTemperature,
  calculateWeatherMultiplier
} from '@/lib/weather';
import type { WeatherData } from '@/lib/weather';
import { getTemperatureUnitPreference } from '@/lib/storage';

export function WeeklyWeatherView() {
  const [weeklyWeather, setWeeklyWeather] = useState<WeatherData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
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
    if (isTomorrow) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
            
            return (
              <div
                key={weather.date || index}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 text-sm font-medium text-muted-foreground">
                    {weather.date && formatDate(weather.date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-primary" />
                    <span className="font-semibold">
                      {formatTemperature(weather.temperature, temperatureUnit)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {weather.humidity}%
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground capitalize">
                    {climate}
                  </span>
                </div>
                <Badge variant={adjustment.variant} className="ml-auto">
                  {adjustment.text}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
