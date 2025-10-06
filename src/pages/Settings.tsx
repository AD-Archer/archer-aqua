import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Droplet, ArrowLeft, LogOut, Plus, Trash2, GlassWater, Pencil, type LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { saveUserProfile, getUserProfile, calculatePersonalizedGoal, calculatePersonalizedGoalForDate, saveDailyGoal, getDailyGoal, logout, isAuthenticated, getUser, getUnitPreference, saveUnitPreference, getCustomDrinks, saveCustomDrink, deleteCustomDrink, getWeightUnitPreference, saveWeightUnitPreference, getTemperatureUnitPreference, saveTemperatureUnitPreference, getTimezone, saveTimezone, getUseWeatherAdjustment, saveUseWeatherAdjustment, getAllDayRecords, saveDayRecord } from '@/lib/storage';
import { Gender, ActivityLevel, UserProfile, VolumeUnit, CustomDrinkType, WeightUnit, kgToLbs, lbsToKg, TemperatureUnit, celsiusToFahrenheit, fahrenheitToCelsius } from '@/types/water';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { WeatherCard } from '@/components/WeatherCard';
import { LocationPicker } from '@/components/LocationPicker';
import { WeeklyWeatherView } from '@/components/WeeklyWeatherView';

const CUSTOM_DRINK_ICONS = [
  'Droplet', 'Coffee', 'Wine', 'Beer', 'Milk', 'Apple', 'Cherry', 
  'Grape', 'Citrus', 'Banana', 'Soup', 'IceCreamCone', 'Cake', 
  'Battery', 'Heart', 'Zap', 'Sun', 'Moon', 'Star', 'Sparkles', 'GlassWater'
];

export default function Settings() {
  const navigate = useNavigate();
  const [weight, setWeight] = useState('70');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [age, setAge] = useState('30');
  const [gender, setGender] = useState<Gender>('other');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [climate, setClimate] = useState<'cold' | 'moderate' | 'hot'>('moderate');
  const [manualGoal, setManualGoal] = useState('');
  const [usePersonalizedGoal, setUsePersonalizedGoal] = useState(true);
  const [unitPreference, setUnitPreference] = useState<VolumeUnit>('ml');
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>('F');
  const [timezone, setTimezone] = useState('');
  const [customDrinks, setCustomDrinks] = useState<CustomDrinkType[]>([]);
  const [isAddDrinkDialogOpen, setIsAddDrinkDialogOpen] = useState(false);
  const [useWeatherAdjustment, setUseWeatherAdjustment] = useState(true);
  
  // Custom drink form state
  const [newDrinkName, setNewDrinkName] = useState('');
  const [newDrinkColor, setNewDrinkColor] = useState('#3b82f6');
  const [newDrinkMultiplier, setNewDrinkMultiplier] = useState([1.0]);
  const [newDrinkIcon, setNewDrinkIcon] = useState('GlassWater');
  
  // Edit drink state
  const [editingDrink, setEditingDrink] = useState<CustomDrinkType | null>(null);
  const [isEditDrinkDialogOpen, setIsEditDrinkDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }

    const savedWeightUnit = getWeightUnitPreference();
    setWeightUnit(savedWeightUnit);

    const profile = getUserProfile();
    if (profile) {
      const displayWeight = savedWeightUnit === 'lbs' 
        ? kgToLbs(profile.weight) 
        : profile.weight;
      setWeight(displayWeight.toFixed(1));
      setAge(profile.age.toString());
      setGender(profile.gender);
      setActivityLevel(profile.activityLevel);
      setClimate(profile.climate);
    }

    const currentGoal = getDailyGoal();
    setManualGoal((currentGoal / 1000).toFixed(1));
    
    const unit = getUnitPreference();
    setUnitPreference(unit);
    
    const tempUnit = getTemperatureUnitPreference();
    setTemperatureUnit(tempUnit);
    
    const tz = getTimezone();
    setTimezone(tz);
    
    const drinks = getCustomDrinks();
    setCustomDrinks(drinks);
    
    const weatherPref = getUseWeatherAdjustment();
    setUseWeatherAdjustment(weatherPref);
  }, [navigate]);

  const handleUpdateProfile = () => {
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

    const user = getUser();
    const profile: UserProfile = {
      name: user?.name || '',
      email: user?.email || '',
      weight: weightInKg, // Always store in kg
      age: ageNum,
      gender,
      activityLevel,
      climate,
      createdAt: new Date(),
      preferredWeightUnit: weightUnit,
      preferredTemperatureUnit: temperatureUnit,
      timezone: timezone,
    };

    saveUserProfile(profile);
    saveWeightUnitPreference(weightUnit);
    saveTemperatureUnitPreference(temperatureUnit);
    saveTimezone(timezone);
    
    if (usePersonalizedGoal) {
      const personalizedGoal = calculatePersonalizedGoal(profile, useWeatherAdjustment);
      saveDailyGoal(personalizedGoal);
      toast.success(`Profile updated! Daily goal: ${(personalizedGoal / 1000).toFixed(1)}L`);
    } else {
      toast.success('Profile updated!');
    }
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

  const handleUpdateManualGoal = () => {
    const goalInMl = parseFloat(manualGoal) * 1000;
    if (goalInMl > 0 && goalInMl <= 10000) {
      saveDailyGoal(goalInMl);
      setUsePersonalizedGoal(false);
      toast.success('Daily goal updated!');
    } else {
      toast.error('Please enter a valid goal (0.5 - 10L)');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleUnitChange = (unit: VolumeUnit) => {
    setUnitPreference(unit);
    saveUnitPreference(unit);
    toast.success(`Unit preference updated to ${unit.toUpperCase()}`);
  };

  const handleTemperatureUnitChange = (unit: TemperatureUnit) => {
    setTemperatureUnit(unit);
    saveTemperatureUnitPreference(unit);
    toast.success(`Temperature unit updated to °${unit}`);
  };

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
    saveTimezone(tz);
    toast.success(`Timezone updated to ${tz}`);
  };

  const handleAddCustomDrink = () => {
    if (!newDrinkName.trim()) {
      toast.error('Please enter a drink name');
      return;
    }

    const newDrink: CustomDrinkType = {
      id: `custom_${Date.now()}`,
      name: newDrinkName.trim(),
      color: newDrinkColor,
      hydrationMultiplier: newDrinkMultiplier[0],
      icon: newDrinkIcon,
    };

    saveCustomDrink(newDrink);
    setCustomDrinks([...customDrinks, newDrink]);
    toast.success(`Custom drink "${newDrink.name}" added!`);
    
    // Reset form
    setNewDrinkName('');
    setNewDrinkColor('#3b82f6');
    setNewDrinkMultiplier([1.0]);
    setNewDrinkIcon('GlassWater');
    setIsAddDrinkDialogOpen(false);
  };

  const handleDeleteCustomDrink = (id: string) => {
    const drink = customDrinks.find(d => d.id === id);
    deleteCustomDrink(id);
    setCustomDrinks(customDrinks.filter(d => d.id !== id));
    toast.success(`Deleted "${drink?.name}"`);
  };

  const handleEditCustomDrink = (drink: CustomDrinkType) => {
    setEditingDrink(drink);
    setIsEditDrinkDialogOpen(true);
  };

  const handleUpdateCustomDrink = () => {
    if (!editingDrink) return;

    if (!editingDrink.name.trim()) {
      toast.error('Please enter a drink name');
      return;
    }

    saveCustomDrink(editingDrink);
    setCustomDrinks(customDrinks.map(d => d.id === editingDrink.id ? editingDrink : d));
    toast.success(`Updated "${editingDrink.name}"`);
    setIsEditDrinkDialogOpen(false);
    setEditingDrink(null);
  };

  const handleWeatherAdjustmentChange = (enabled: boolean) => {
    setUseWeatherAdjustment(enabled);
    saveUseWeatherAdjustment(enabled);
    toast.success(`Weather-based adjustment ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleWeatherUpdate = () => {
    // Recalculate goal when weather is updated
    const profile = getUserProfile();
    if (profile && usePersonalizedGoal) {
      const personalizedGoal = calculatePersonalizedGoal(profile, useWeatherAdjustment);
      saveDailyGoal(personalizedGoal);
      
      // Recalculate goals for all days in the past week
      if (useWeatherAdjustment) {
        const allDays = getAllDayRecords();
        const today = new Date();
        
        // Update goals for past 7 days
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateKey = date.toISOString().split('T')[0];
          
          const dayRecord = allDays[dateKey];
          if (dayRecord) {
            const adjustedGoal = calculatePersonalizedGoalForDate(profile, dateKey, true);
            dayRecord.goal = adjustedGoal;
            saveDayRecord(dayRecord);
          }
        }
        
        toast.success('Hydration goals recalculated based on weather!');
      }
    }
  };

  const handleLocationUpdate = () => {
    // Trigger weather update when location changes
    handleWeatherUpdate();
  };

  return (
    <div className="min-h-screen bg-gradient-sky">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <header className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/app')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your profile and preferences</p>
          </div>
        </header>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your details for personalized hydration goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  />
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
                    <SelectItem value="sedentary">Sedentary</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="very_active">Very Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!useWeatherAdjustment && (
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
                    Enable weather-based adjustments below for automatic climate detection
                  </p>
                </div>
              )}

              <Button onClick={handleUpdateProfile} className="w-full bg-gradient-water">
                Update Profile & Recalculate Goal
              </Button>
            </CardContent>
          </Card>

          {/* Manual Goal Setting */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Goal</CardTitle>
              <CardDescription>
                Set a custom daily water goal or use our personalized recommendation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-goal">Custom Goal (Liters)</Label>
                <Input
                  id="manual-goal"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10"
                  value={manualGoal}
                  onChange={(e) => setManualGoal(e.target.value)}
                />
              </div>
              <Button onClick={handleUpdateManualGoal} variant="outline" className="w-full">
                Set Custom Goal
              </Button>
            </CardContent>
          </Card>

          {/* Unit Preference */}
          <Card>
            <CardHeader>
              <CardTitle>Display Units</CardTitle>
              <CardDescription>
                Choose your preferred units for displaying values
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unit-preference">Volume Unit</Label>
                <Select value={unitPreference} onValueChange={(value: VolumeUnit) => handleUnitChange(value)}>
                  <SelectTrigger id="unit-preference">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ml">Milliliters (ml)</SelectItem>
                    <SelectItem value="oz">Fluid Ounces (oz)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="temperature-unit">Temperature Unit</Label>
                <Select value={temperatureUnit} onValueChange={(value: TemperatureUnit) => handleTemperatureUnitChange(value)}>
                  <SelectTrigger id="temperature-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">Celsius (°C)</SelectItem>
                    <SelectItem value="F">Fahrenheit (°F)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Custom Drinks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Custom Drinks</CardTitle>
                  <CardDescription>
                    Add your own drinks with custom hydration values
                  </CardDescription>
                </div>
                <Dialog open={isAddDrinkDialogOpen} onOpenChange={setIsAddDrinkDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom Drink</DialogTitle>
                      <DialogDescription>
                        Create a custom drink type with your own hydration multiplier
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="drink-name">Drink Name</Label>
                        <Input
                          id="drink-name"
                          placeholder="e.g., Herbal Tea, Smoothie"
                          value={newDrinkName}
                          onChange={(e) => setNewDrinkName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="drink-color">Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="drink-color"
                            type="color"
                            value={newDrinkColor}
                            onChange={(e) => setNewDrinkColor(e.target.value)}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={newDrinkColor}
                            onChange={(e) => setNewDrinkColor(e.target.value)}
                            placeholder="#3b82f6"
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Hydration Multiplier: {newDrinkMultiplier[0].toFixed(2)}x</Label>
                        <Slider
                          value={newDrinkMultiplier}
                          onValueChange={setNewDrinkMultiplier}
                          min={-0.5}
                          max={1.5}
                          step={0.05}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          {newDrinkMultiplier[0] < 0 ? 'Dehydrating' :
                           newDrinkMultiplier[0] < 0.5 ? 'Low hydration' :
                           newDrinkMultiplier[0] < 0.9 ? 'Moderate hydration' :
                           newDrinkMultiplier[0] < 1.1 ? 'Full hydration' :
                           'Enhanced hydration'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Choose Icon</Label>
                        <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                          <div className="grid grid-cols-7 gap-2">
                            {CUSTOM_DRINK_ICONS.map((iconName) => {
                              const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];
                              return (
                                <Button
                                  key={iconName}
                                  type="button"
                                  variant={newDrinkIcon === iconName ? "default" : "outline"}
                                  size="sm"
                                  className="h-10 w-10 p-0"
                                  onClick={() => setNewDrinkIcon(iconName)}
                                >
                                  {IconComponent && <IconComponent className="h-4 w-4" />}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <Button onClick={handleAddCustomDrink} className="w-full bg-gradient-water">
                        Add Custom Drink
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {customDrinks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No custom drinks yet. Add one to get started!
                </p>
              ) : (
                <div className="space-y-2">
                  {customDrinks.map((drink) => {
                    const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[drink.icon] || GlassWater;
                    return (
                      <div
                        key={drink.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: drink.color }}
                          >
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{drink.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {drink.hydrationMultiplier.toFixed(2)}x hydration
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditCustomDrink(drink)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCustomDrink(drink.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Custom Drink Dialog */}
          <Dialog open={isEditDrinkDialogOpen} onOpenChange={setIsEditDrinkDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Custom Drink</DialogTitle>
                <DialogDescription>
                  Update your custom drink settings
                </DialogDescription>
              </DialogHeader>
              {editingDrink && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-drink-name">Drink Name</Label>
                    <Input
                      id="edit-drink-name"
                      placeholder="e.g., Herbal Tea, Smoothie"
                      value={editingDrink.name}
                      onChange={(e) => setEditingDrink({ ...editingDrink, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-drink-color">Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="edit-drink-color"
                        type="color"
                        value={editingDrink.color}
                        onChange={(e) => setEditingDrink({ ...editingDrink, color: e.target.value })}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={editingDrink.color}
                        onChange={(e) => setEditingDrink({ ...editingDrink, color: e.target.value })}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Hydration Multiplier: {editingDrink.hydrationMultiplier.toFixed(2)}x</Label>
                    <Slider
                      value={[editingDrink.hydrationMultiplier]}
                      onValueChange={(value) => setEditingDrink({ ...editingDrink, hydrationMultiplier: value[0] })}
                      min={-0.5}
                      max={1.5}
                      step={0.05}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      {editingDrink.hydrationMultiplier < 0 ? 'Dehydrating' :
                       editingDrink.hydrationMultiplier < 0.5 ? 'Low hydration' :
                       editingDrink.hydrationMultiplier < 0.9 ? 'Moderate hydration' :
                       editingDrink.hydrationMultiplier < 1.1 ? 'Full hydration' :
                       'Enhanced hydration'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Choose Icon</Label>
                    <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                      <div className="grid grid-cols-7 gap-2">
                        {CUSTOM_DRINK_ICONS.map((iconName) => {
                          const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];
                          return (
                            <Button
                              key={iconName}
                              type="button"
                              variant={editingDrink.icon === iconName ? "default" : "outline"}
                              size="sm"
                              className="h-10 w-10 p-0"
                              onClick={() => setEditingDrink({ ...editingDrink, icon: iconName })}
                            >
                              {IconComponent && <IconComponent className="h-4 w-4" />}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleUpdateCustomDrink} className="w-full bg-gradient-water">
                    Update Custom Drink
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Timezone Preference */}
          <Card>
            <CardHeader>
              <CardTitle>Timezone</CardTitle>
              <CardDescription>
                Set your timezone for accurate daily tracking across different locations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={handleTimezoneChange}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="America/New_York">Eastern Time (New York)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (Chicago)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (Denver)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (Los Angeles)</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska Time (Anchorage)</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii Time (Honolulu)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Berlin">Berlin (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Moscow">Moscow (MSK)</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                    <SelectItem value="Asia/Shanghai">China (CST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Seoul">Seoul (KST)</SelectItem>
                    <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney (AEDT/AEST)</SelectItem>
                    <SelectItem value="Australia/Melbourne">Melbourne (AEDT/AEST)</SelectItem>
                    <SelectItem value="Australia/Perth">Perth (AWST)</SelectItem>
                    <SelectItem value="Pacific/Auckland">Auckland (NZDT/NZST)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Your current timezone: {timezone}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Weather Toggle */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Weather-Based Adjustments</CardTitle>
                  <CardDescription>
                    {useWeatherAdjustment 
                      ? 'Automatically adjust your hydration goals based on local weather conditions'
                      : 'Enable weather tracking to automatically adjust your hydration goals based on local weather conditions'
                    }
                  </CardDescription>
                </div>
                <Switch
                  checked={useWeatherAdjustment}
                  onCheckedChange={handleWeatherAdjustmentChange}
                />
              </div>
            </CardHeader>
          </Card>

          {/* Location Settings - Only show when weather is enabled */}
          {useWeatherAdjustment && (
            <LocationPicker onLocationUpdate={handleLocationUpdate} />
          )}

          {/* Current Weather - Only show when weather is enabled */}
          {useWeatherAdjustment && (
            <Card>
              <CardHeader>
                <CardTitle>Current Weather</CardTitle>
                <CardDescription>
                  Real-time weather conditions affecting your hydration needs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <WeatherCard onWeatherUpdate={handleWeatherUpdate} />
              </CardContent>
            </Card>
          )}

          {/* Weekly Weather View - Only show when weather is enabled */}
          {useWeatherAdjustment && (
            <WeeklyWeatherView />
          )}

        
          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLogout} variant="destructive" className="w-full">
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
