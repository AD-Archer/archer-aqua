import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Droplet, ArrowLeft, LogOut, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { saveUserProfile, getUserProfile, calculatePersonalizedGoal, saveDailyGoal, getDailyGoal, logout, isAuthenticated, getUser, getUnitPreference, saveUnitPreference, getCustomDrinks, saveCustomDrink, deleteCustomDrink, getWeightUnitPreference, saveWeightUnitPreference, getTemperatureUnitPreference, saveTemperatureUnitPreference, getTimezone, saveTimezone } from '@/lib/storage';
import { Gender, ActivityLevel, UserProfile, VolumeUnit, CustomDrinkType, WeightUnit, kgToLbs, lbsToKg, TemperatureUnit, celsiusToFahrenheit, fahrenheitToCelsius } from '@/types/water';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

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
  
  // Custom drink form state
  const [newDrinkName, setNewDrinkName] = useState('');
  const [newDrinkColor, setNewDrinkColor] = useState('#3b82f6');
  const [newDrinkMultiplier, setNewDrinkMultiplier] = useState([1.0]);

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
      const personalizedGoal = calculatePersonalizedGoal(profile);
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
    };

    saveCustomDrink(newDrink);
    setCustomDrinks([...customDrinks, newDrink]);
    toast.success(`Custom drink "${newDrink.name}" added!`);
    
    // Reset form
    setNewDrinkName('');
    setNewDrinkColor('#3b82f6');
    setNewDrinkMultiplier([1.0]);
    setIsAddDrinkDialogOpen(false);
  };

  const handleDeleteCustomDrink = (id: string) => {
    const drink = customDrinks.find(d => d.id === id);
    deleteCustomDrink(id);
    setCustomDrinks(customDrinks.filter(d => d.id !== id));
    toast.success(`Deleted "${drink?.name}"`);
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
              </div>

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
                            value={newDrinkColor}
                            onChange={(e) => setNewDrinkColor(e.target.value)}
                            placeholder="#3b82f6"
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hydration-multiplier">
                          Hydration Multiplier: {newDrinkMultiplier[0].toFixed(2)}x
                        </Label>
                        <Slider
                          id="hydration-multiplier"
                          min={-0.5}
                          max={1.5}
                          step={0.05}
                          value={newDrinkMultiplier}
                          onValueChange={setNewDrinkMultiplier}
                        />
                        <p className="text-xs text-muted-foreground">
                          {newDrinkMultiplier[0] < 0 ? 'Dehydrating' :
                           newDrinkMultiplier[0] < 0.5 ? 'Low hydration' :
                           newDrinkMultiplier[0] < 0.9 ? 'Moderate hydration' :
                           newDrinkMultiplier[0] < 1.1 ? 'Full hydration' :
                           'Enhanced hydration'}
                        </p>
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
                  {customDrinks.map((drink) => (
                    <div
                      key={drink.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: drink.color }}
                        />
                        <div>
                          <p className="font-medium">{drink.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {drink.hydrationMultiplier.toFixed(2)}x hydration
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCustomDrink(drink.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
