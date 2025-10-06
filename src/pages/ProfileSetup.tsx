import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Droplet } from 'lucide-react';
import { toast } from 'sonner';
import { saveUserProfile, getUserProfile, calculatePersonalizedGoal, saveDailyGoal, isAuthenticated, saveWeightUnitPreference, getWeightUnitPreference, saveTemperatureUnitPreference, getTemperatureUnitPreference, saveTimezone, getTimezone, saveUseWeatherAdjustment, getUseWeatherAdjustment, getBackendUserId, getUser, saveGoalMode, saveUnitPreference, getUnitPreference } from '@/lib/storage';
import { backendIsEnabled, ensureBackendUser } from '@/lib/backend';
import { getUser as getBackendUser, createUser as createBackendUser, getAuthState } from '@/lib/api';
import { Gender, ActivityLevel, UserProfile, WeightUnit, lbsToKg, kgToLbs, TemperatureUnit, VolumeUnit } from '@/types/water';
import { getWeatherData, getLocationPreference } from '@/lib/weather';
import { LocationPicker } from '@/components/LocationPicker';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [weight, setWeight] = useState('154'); // Default in lbs (70kg)
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs');
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>('F');
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>('ml');
  const [age, setAge] = useState('30');
  const [gender, setGender] = useState<Gender>('other');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [climate, setClimate] = useState<'cold' | 'moderate' | 'hot'>('moderate');
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }

    const checkExistingProfile = async () => {
      // Check if profile exists in backend
      if (backendIsEnabled()) {
        try {
          const authState = await getAuthState();
          if (authState?.hasProfile) {
            // Profile already exists, redirect to app
            toast.info('Profile already set up');
            navigate('/app', { replace: true });
            return;
          }
        } catch (error) {
          console.warn('Failed to check backend profile status', error);
        }
      }

      const savedWeightUnit = getWeightUnitPreference();
      setWeightUnit(savedWeightUnit);

      const savedTempUnit = getTemperatureUnitPreference();
      setTemperatureUnit(savedTempUnit);

      const savedVolumeUnit = getUnitPreference();
      setVolumeUnit(savedVolumeUnit);

      // Check if weather is already enabled
      const weatherAdjustment = getUseWeatherAdjustment();
      setWeatherEnabled(weatherAdjustment);
      setShowLocationPicker(weatherAdjustment);

      // Check if profile already exists locally
      const existingProfile = getUserProfile();
      if (existingProfile) {
        const displayWeight = savedWeightUnit === 'lbs' 
          ? kgToLbs(existingProfile.weight) 
          : existingProfile.weight;
        setWeight(displayWeight.toFixed(1));
        setAge(existingProfile.age.toString());
        setGender(existingProfile.gender);
        setActivityLevel(existingProfile.activityLevel);
        setClimate(existingProfile.climate);
      } else {
        // Set default weight based on unit
        setWeight(savedWeightUnit === 'lbs' ? '154' : '70');
      }
    };

    checkExistingProfile();
  }, [navigate]);

  const handleEnableWeather = async () => {
    setIsLoadingWeather(true);
    try {
      await getWeatherData(false);
      saveUseWeatherAdjustment(true);
      setWeatherEnabled(true);
      setShowLocationPicker(true);
      toast.success('Weather tracking enabled! You can now configure your location below.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to enable weather tracking';
      toast.error(errorMessage);
      saveUseWeatherAdjustment(false);
      setWeatherEnabled(false);
      // Still show location picker so user can set manual location
      setShowLocationPicker(true);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleLocationUpdate = () => {
    toast.success('Location updated! Your hydration goals will be adjusted based on local weather.');
  };

  const handleDisableWeather = () => {
    saveUseWeatherAdjustment(false);
    setWeatherEnabled(false);
    setShowLocationPicker(false);
    toast.success('Weather tracking disabled');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const weightValue = parseFloat(weight);
    const ageNum = parseInt(age);

    // Convert weight to kg for storage
    const weightInKg = weightUnit === 'lbs' ? lbsToKg(weightValue) : weightValue;

    if (weightInKg < 30 || weightInKg > 300) {
      toast.error(`Please enter a valid weight (${weightUnit === 'lbs' ? '66-660 lbs' : '30-300 kg'})`);
      return;
    }

    if (ageNum < 13 || ageNum > 120) {
      toast.error('Please enter a valid age (13-120)');
      return;
    }

    // Save user's timezone
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    saveTimezone(detectedTimezone);

    const user = getUser();
    const profile: UserProfile = {
      name: user?.name || '',
      email: user?.email || '',
      weight: weightInKg,
      age: ageNum,
      gender,
      activityLevel,
      climate,
      createdAt: new Date(),
      preferredWeightUnit: weightUnit,
      preferredTemperatureUnit: temperatureUnit,
      timezone: detectedTimezone,
    };

    // Save locally
    saveUserProfile(profile);
    saveWeightUnitPreference(weightUnit);
    saveTemperatureUnitPreference(temperatureUnit);
    saveUnitPreference(volumeUnit);
    
    // Calculate and save personalized goal
    const personalizedGoal = calculatePersonalizedGoal(profile, weatherEnabled);
    saveDailyGoal(personalizedGoal);
    saveGoalMode('personalized');

    // Create profile in backend if enabled
    if (backendIsEnabled()) {
      try {
        const locationPreference = getLocationPreference();
        
        const payload = {
          email: user?.email || '',
          displayName: user?.name || user?.email?.split('@')[0] || '',
          weight: {
            value: weightValue,
            unit: weightUnit,
          },
          age: ageNum,
          gender: gender,
          activityLevel: activityLevel,
          timezone: detectedTimezone,
          location: {
            city: locationPreference.type === 'manual' ? locationPreference.manualLocation?.name ?? '' : '',
            region: climate,
            country: '',
            latitude: locationPreference.type === 'manual' ? locationPreference.manualLocation?.lat : undefined,
            longitude: locationPreference.type === 'manual' ? locationPreference.manualLocation?.lon : undefined,
          },
          volumeUnit: volumeUnit,
          temperatureUnit: temperatureUnit === 'F' ? 'fahrenheit' : 'celsius',
          progressWheelStyle: 'drink_colors',
          weatherAdjustmentsEnabled: weatherEnabled,
          customGoalLiters: personalizedGoal / 1000,
        };

        const response = await createBackendUser(payload);
        
        if (response?.user) {
          toast.success(`Profile created! Daily goal: ${(personalizedGoal / 1000).toFixed(1)}L`);
        }
      } catch (error) {
        console.error('Failed to create profile in backend', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.warning(`Profile saved locally, but backend sync failed: ${message}`);
      }
    } else {
      toast.success(`Your daily goal is set to ${(personalizedGoal / 1000).toFixed(1)}L`);
    }

    navigate('/app', { replace: true });
  };

  const handleWeightUnitChange = (newUnit: WeightUnit) => {
    const currentWeight = parseFloat(weight);
    if (!isNaN(currentWeight)) {
      const convertedWeight = newUnit === 'lbs'
        ? (weightUnit === 'kg' ? kgToLbs(currentWeight) : currentWeight)
        : (weightUnit === 'lbs' ? lbsToKg(currentWeight) : currentWeight);
      setWeight(convertedWeight.toFixed(1));
    }
    setWeightUnit(newUnit);
  };

  return (
    <div className="min-h-screen bg-gradient-sky flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Droplet className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set Up Your Profile</CardTitle>
          <CardDescription>
            Help us personalize your hydration goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <div className="flex gap-2">
                  <Input
                    id="weight"
                    type="number"
                    min={weightUnit === 'lbs' ? '66' : '30'}
                    max={weightUnit === 'lbs' ? '660' : '300'}
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Select value={weightUnit} onValueChange={(value: WeightUnit) => handleWeightUnitChange(value)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lbs">lbs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">Your current weight</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="13"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  onFocus={(e) => {
                    // Set cursor to end of input
                    setTimeout(() => {
                      e.target.setSelectionRange(e.target.value.length, e.target.value.length);
                    }, 0);
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">Your age in years</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={gender} onValueChange={(value: Gender) => setGender(value)}>
                <SelectTrigger id="gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity">Activity Level</Label>
              <Select value={activityLevel} onValueChange={(value: ActivityLevel) => setActivityLevel(value)}>
                <SelectTrigger id="activity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary (little to no exercise)</SelectItem>
                  <SelectItem value="light">Light (exercise 1-3 days/week)</SelectItem>
                  <SelectItem value="moderate">Moderate (exercise 3-5 days/week)</SelectItem>
                  <SelectItem value="active">Active (exercise 6-7 days/week)</SelectItem>
                  <SelectItem value="very_active">Very Active (intense exercise daily)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">How often do you exercise?</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature-unit">Temperature Unit</Label>
              <Select value={temperatureUnit} onValueChange={(value: TemperatureUnit) => setTemperatureUnit(value)}>
                <SelectTrigger id="temperature-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="C">Celsius (°C)</SelectItem>
                  <SelectItem value="F">Fahrenheit (°F)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Your preferred temperature unit</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="volume-unit">Volume Unit</Label>
              <Select value={volumeUnit} onValueChange={(value: VolumeUnit) => setVolumeUnit(value)}>
                <SelectTrigger id="volume-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ml">Milliliters (ml)</SelectItem>
                  <SelectItem value="oz">Fluid Ounces (oz)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Your preferred volume unit for water tracking</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="climate">Climate</Label>
              <Select value={climate} onValueChange={(value: 'cold' | 'moderate' | 'hot') => setClimate(value)}>
                <SelectTrigger id="climate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">
                    Cold (below {temperatureUnit === 'F' ? '59°F' : '15°C'})
                  </SelectItem>
                  <SelectItem value="moderate">
                    Moderate ({temperatureUnit === 'F' ? '59-77°F' : '15-25°C'})
                  </SelectItem>
                  <SelectItem value="hot">
                    Hot (above {temperatureUnit === 'F' ? '77°F' : '25°C'})
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Your typical environment (used as fallback if weather tracking is disabled)
              </p>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Label className="text-sm font-medium">Enable Weather Tracking (Optional)</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Get personalized goals based on your local weather conditions
                  </p>
                </div>
              </div>
              {!weatherEnabled ? (
                <Button
                  type="button"
                  onClick={handleEnableWeather}
                  disabled={isLoadingWeather}
                  variant="outline"
                  className="w-full"
                >
                  {isLoadingWeather ? 'Enabling...' : 'Enable Weather Tracking'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleDisableWeather}
                  variant="outline"
                  className="w-full"
                >
                  Disable Weather Tracking
                </Button>
              )}
              
              {showLocationPicker && (
                <div className="mt-4">
                  <LocationPicker onLocationUpdate={handleLocationUpdate} />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full bg-gradient-water">
              Calculate My Goal
            </Button>
          </form>
        </CardContent>
        

      </Card>
</div>
  );
}
