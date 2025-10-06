import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Droplet } from 'lucide-react';
import { toast } from 'sonner';
import { saveUserProfile, getUserProfile, calculatePersonalizedGoal, saveDailyGoal, isAuthenticated } from '@/lib/storage';
import { Gender, ActivityLevel, UserProfile } from '@/types/water';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [weight, setWeight] = useState('70');
  const [age, setAge] = useState('30');
  const [gender, setGender] = useState<Gender>('other');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [climate, setClimate] = useState<'cold' | 'moderate' | 'hot'>('moderate');

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }

    // Check if profile already exists
    const existingProfile = getUserProfile();
    if (existingProfile) {
      setWeight(existingProfile.weight.toString());
      setAge(existingProfile.age.toString());
      setGender(existingProfile.gender);
      setActivityLevel(existingProfile.activityLevel);
      setClimate(existingProfile.climate);
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const weightNum = parseFloat(weight);
    const ageNum = parseInt(age);

    if (weightNum < 30 || weightNum > 300) {
      toast.error('Please enter a valid weight (30-300 kg)');
      return;
    }

    if (ageNum < 13 || ageNum > 120) {
      toast.error('Please enter a valid age (13-120)');
      return;
    }

    const profile: UserProfile = {
      name: '', // Will be populated from user storage
      email: '', // Will be populated from user storage
      weight: weightNum,
      age: ageNum,
      gender,
      activityLevel,
      climate,
      createdAt: new Date(),
    };

    saveUserProfile(profile);
    
    // Calculate and save personalized goal
    const personalizedGoal = calculatePersonalizedGoal(profile);
    saveDailyGoal(personalizedGoal);
    
    toast.success(`Your daily goal is set to ${(personalizedGoal / 1000).toFixed(1)}L`);
    navigate('/app');
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
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="30"
                  max="300"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                />
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
              <Label htmlFor="climate">Climate</Label>
              <Select value={climate} onValueChange={(value: 'cold' | 'moderate' | 'hot') => setClimate(value)}>
                <SelectTrigger id="climate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">Cold (below 15°C / 59°F)</SelectItem>
                  <SelectItem value="moderate">Moderate (15-25°C / 59-77°F)</SelectItem>
                  <SelectItem value="hot">Hot (above 25°C / 77°F)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Your typical environment</p>
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
