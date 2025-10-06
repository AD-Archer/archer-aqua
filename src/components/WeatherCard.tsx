import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  MapPin, 
  Droplets, 
  AlertCircle, 
  Thermometer, 
  Wind,
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  Cloudy,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
  LucideIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getWeatherData, 
  getCachedWeather, 
  canRefreshWeather, 
  formatTemperature,
  getWeatherIconName,
  calculateWeatherMultiplier,
  getClimateFromTemperature
} from '@/lib/weather';
import type { WeatherData } from '@/lib/weather';
import { getTemperatureUnitPreference } from '@/lib/storage';

interface WeatherCardProps {
  onWeatherUpdate?: () => void;
}

export function WeatherCard({ onWeatherUpdate }: WeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshInfo, setRefreshInfo] = useState({ canRefresh: true, remaining: 2, resetDate: '' });
  const temperatureUnit = getTemperatureUnitPreference();

  // Map icon names to Lucide components
  const iconComponents: Record<string, LucideIcon> = {
    'sun': Sun,
    'moon': Moon,
    'cloud-sun': CloudSun,
    'cloud-moon': CloudMoon,
    'cloud': Cloud,
    'cloudy': Cloudy,
    'cloud-drizzle': CloudDrizzle,
    'cloud-rain': CloudRain,
    'cloud-lightning': CloudLightning,
    'cloud-snow': CloudSnow,
    'cloud-fog': CloudFog,
  };

  const updateRefreshInfo = () => {
    const info = canRefreshWeather();
    setRefreshInfo(info);
  };

  const loadWeatherData = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getWeatherData(forceRefresh);
      setWeather(data);
      updateRefreshInfo();
      
      if (forceRefresh) {
        toast.success('Weather data refreshed!');
        onWeatherUpdate?.();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load weather data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWeatherData();
    updateRefreshInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    if (!refreshInfo.canRefresh) {
      toast.error(`You've used all manual refreshes this week. Resets on ${refreshInfo.resetDate}`);
      return;
    }
    await loadWeatherData(true);
  };

  const getCacheAge = () => {
    const cached = getCachedWeather();
    if (!cached) return null;

    const ageMs = Date.now() - cached.cachedAt;
    const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const getHydrationImpact = () => {
    if (!weather) return null;
    const multiplier = calculateWeatherMultiplier(weather);
    const percentChange = Math.round((multiplier - 1) * 100);
    
    if (percentChange > 0) {
      return { text: `+${percentChange}% hydration needed`, variant: 'default' as const };
    } else if (percentChange < 0) {
      return { text: `${percentChange}% hydration needed`, variant: 'secondary' as const };
    }
    return { text: 'Normal hydration', variant: 'secondary' as const };
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Weather-Based Hydration
          </CardTitle>
          <CardDescription>Adjust your goals based on local weather</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={() => loadWeatherData(false)} 
            className="w-full mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Weather-Based Hydration
          </CardTitle>
          <CardDescription>Adjust your goals based on local weather</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Button 
              onClick={() => loadWeatherData(false)} 
              disabled={isLoading}
              className="bg-gradient-water"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading Weather...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Enable Weather Tracking
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cacheAge = getCacheAge();
  const impact = getHydrationImpact();
  const climate = getClimateFromTemperature(weather.temperature);
  
  // Get the appropriate weather icon component
  const iconName = getWeatherIconName(weather.icon);
  const WeatherIcon = iconComponents[iconName] || CloudSun;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Weather-Based Hydration
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <MapPin className="h-3 w-3" />
              {weather.location}
            </CardDescription>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoading || !refreshInfo.canRefresh}
            size="sm"
            variant="outline"
            title={!refreshInfo.canRefresh ? `Refreshes reset on ${refreshInfo.resetDate}` : 'Refresh weather data'}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Weather Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <WeatherIcon className="h-10 w-10 text-primary" />
            </div>
            <div>
              <div className="text-3xl font-bold">
                {formatTemperature(weather.temperature, temperatureUnit)}
              </div>
              <div className="text-sm text-muted-foreground capitalize">
                {weather.description}
              </div>
              <div className="text-xs text-muted-foreground">
                Feels like {formatTemperature(weather.feelsLike, temperatureUnit)}
              </div>
            </div>
          </div>
        </div>

        {/* Weather Details Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">Humidity</div>
              <div className="font-semibold">{weather.humidity}%</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">Climate</div>
              <div className="font-semibold capitalize">{climate}</div>
            </div>
          </div>
        </div>

        {/* Hydration Impact */}
        {impact && (
          <div className="pt-4 border-t">
            <Badge variant={impact.variant} className="w-full justify-center py-2">
              {impact.text}
            </Badge>
          </div>
        )}

        {/* Cache Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>Updated: {cacheAge}</span>
          <span>
            {refreshInfo.remaining} refresh{refreshInfo.remaining !== 1 ? 'es' : ''} left this week
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
