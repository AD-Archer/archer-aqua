import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MapPin, Search, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { 
  searchLocation, 
  getLocationPreference, 
  setLocationPreference,
  getWeatherData,
  type LocationPreference 
} from '@/lib/weather';

interface LocationPickerProps {
  onLocationUpdate?: () => void;
}

export function LocationPicker({ onLocationUpdate }: LocationPickerProps) {
  const [locationType, setLocationType] = useState<'auto' | 'manual'>(() => {
    const pref = getLocationPreference();
    return pref.type;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ lat: number; lon: number; name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number; name: string } | null>(() => {
    const pref = getLocationPreference();
    return pref.manualLocation || null;
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a location to search');
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchLocation(searchQuery);
      if (results.length === 0) {
        toast.error('No locations found. Try a different search term.');
      } else {
        setSearchResults(results);
      }
    } catch (error) {
      toast.error('Failed to search location');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (location: { lat: number; lon: number; name: string }) => {
    setSelectedLocation(location);
    setSearchResults([]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const preference: LocationPreference = {
        type: locationType,
        manualLocation: locationType === 'manual' ? selectedLocation || undefined : undefined,
      };
      
      setLocationPreference(preference);
      
      // Fetch fresh weather data with new location
      await getWeatherData(true);
      
      toast.success('Location preference saved!');
      onLocationUpdate?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save location preference';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Settings
        </CardTitle>
        <CardDescription>
          Choose how we determine your location for weather data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={locationType} onValueChange={(value: 'auto' | 'manual') => setLocationType(value)}>
          <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-accent/50">
            <RadioGroupItem value="auto" id="auto" />
            <Label htmlFor="auto" className="flex-1 cursor-pointer">
              <div className="font-medium">Auto-detect</div>
              <div className="text-sm text-muted-foreground">
                Use your device's GPS to automatically detect location
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-accent/50">
            <RadioGroupItem value="manual" id="manual" />
            <Label htmlFor="manual" className="flex-1 cursor-pointer">
              <div className="font-medium">Manual location</div>
              <div className="text-sm text-muted-foreground">
                Search and select your location manually
              </div>
            </Label>
          </div>
        </RadioGroup>

        {locationType === 'manual' && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="location-search">Search Location</Label>
              <div className="flex gap-2">
                <Input
                  id="location-search"
                  placeholder="City, zip code, airport code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching}
                  variant="outline"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {selectedLocation && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  Selected: <strong>{selectedLocation.name}</strong>
                </AlertDescription>
              </Alert>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Search Results</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectLocation(result)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="font-medium">{result.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {result.lat.toFixed(4)}°, {result.lon.toFixed(4)}°
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={isSaving || (locationType === 'manual' && !selectedLocation)}
          className="w-full bg-gradient-water"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Location Preference'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
