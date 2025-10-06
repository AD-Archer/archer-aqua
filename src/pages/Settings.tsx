import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Droplet, ArrowLeft, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { saveUserProfile, getUserProfile, calculatePersonalizedGoal, saveDailyGoal, getDailyGoal, logout, isAuthenticated, getUser } from '@/lib/storage';
import { Gender, ActivityLevel, UserProfile } from '@/types/water';

export default function Settings() {
  const navigate = useNavigate();
  const [weight, setWeight] = useState('70');
  const [age, setAge] = useState('30');
  const [gender, setGender] = useState<Gender>('other');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [climate, setClimate] = useState<'cold' | 'moderate' | 'hot'>('moderate');
  const [manualGoal, setManualGoal] = useState('');
  const [usePersonalizedGoal, setUsePersonalizedGoal] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }

    const profile = getUserProfile();
    if (profile) {
      setWeight(profile.weight.toString());
      setAge(profile.age.toString());
      setGender(profile.gender);
      setActivityLevel(profile.activityLevel);
      setClimate(profile.climate);
    }

    const currentGoal = getDailyGoal();
    setManualGoal((currentGoal / 1000).toFixed(1));
  }, [navigate]);

  const handleUpdateProfile = () => {
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

    const user = getUser();
    const profile: UserProfile = {
      name: user?.name || '',
      email: user?.email || '',
      weight: weightNum,
      age: ageNum,
      gender,
      activityLevel,
      climate,
      createdAt: new Date(),
    };

    saveUserProfile(profile);
    
    if (usePersonalizedGoal) {
      const personalizedGoal = calculatePersonalizedGoal(profile);
      saveDailyGoal(personalizedGoal);
      toast.success(`Profile updated! Daily goal: ${(personalizedGoal / 1000).toFixed(1)}L`);
    } else {
      toast.success('Profile updated!');
    }
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
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="30"
                    max="300"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
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
                    <SelectItem value="cold">Cold</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
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
