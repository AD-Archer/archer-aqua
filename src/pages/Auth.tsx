import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplet, Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  saveUser,
  isAuthenticated,
  saveBackendUserId,
  saveAuthToken,
  saveUserProfile,
  saveDailyGoal,
  saveWeightUnitPreference,
  saveTemperatureUnitPreference,
  saveUnitPreference,
  saveTimezone,
  saveUseWeatherAdjustment,
  saveProgressWheelStyle,
  clearAuthToken,
} from '@/lib/storage';
import {
  loginUser,
  registerUser,
  getGoogleOAuthUrl,
  getAuthState,
  type ApiAuthResponse,
  type ApiUserResponse,
} from '@/lib/api';
import { backendIsEnabled } from '@/lib/backend';
import type {
  ActivityLevel,
  Gender,
  ProgressWheelStyle,
  TemperatureUnit,
  UserProfile,
  VolumeUnit,
  WeightUnit,
} from '@/types/water';

function hydrateLocalStateFromBackend(user: ApiUserResponse): void {
  const allowedGenders: Gender[] = ['male', 'female', 'other'];
  const allowedActivities: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
  const allowedStyles: ProgressWheelStyle[] = ['drink-colors', 'black-white', 'water-blue'];

  const gender = (allowedGenders.includes(user.gender as Gender) ? user.gender : 'other') as Gender;
  const activityLevel = (allowedActivities.includes(user.activityLevel as ActivityLevel)
    ? user.activityLevel
    : 'moderate') as ActivityLevel;

  const temperatureUnit: TemperatureUnit = user.temperatureUnit?.toLowerCase() === 'celsius' ? 'C' : 'F';
  const volumeUnit: VolumeUnit = user.volumeUnit === 'oz' ? 'oz' : 'ml';
  const normalizedProgressStyle = (user.progressWheelStyle || 'drink_colors').replace(/_/g, '-') as ProgressWheelStyle;
  const progressStyle = allowedStyles.includes(normalizedProgressStyle) ? normalizedProgressStyle : 'drink-colors';

  const profile: UserProfile = {
    name: user.displayName,
    email: user.email,
    weight: user.weight,
    age: user.age,
    gender,
    activityLevel,
    climate: 'moderate',
    createdAt: new Date(user.createdAt),
    preferredUnit: volumeUnit,
    preferredWeightUnit: (user.weightUnit as WeightUnit) || 'kg',
    preferredTemperatureUnit: temperatureUnit,
    timezone: user.timezone,
  };

  saveUserProfile(profile);

  const rawGoalLiters = typeof user.customGoalLiters === 'number' && user.customGoalLiters > 0
    ? user.customGoalLiters
    : user.dailyGoalLiters;
  if (rawGoalLiters && Number.isFinite(rawGoalLiters) && rawGoalLiters > 0) {
    const goalLiters = Number(rawGoalLiters);
    saveDailyGoal(Math.round(goalLiters * 1000));
  }

  saveWeightUnitPreference((user.weightUnit as WeightUnit) || 'kg');
  saveUnitPreference(volumeUnit);
  saveTemperatureUnitPreference(temperatureUnit);
  if (user.timezone) {
    saveTimezone(user.timezone);
  }
  saveUseWeatherAdjustment(user.weatherAdjustmentsEnabled);
  saveProgressWheelStyle(progressStyle);
}

function finalizeAuthSession(user: ApiUserResponse) {
  const fallbackName = user.displayName || user.email.split('@')[0];
  saveBackendUserId(user.id);
  saveUser(user.email, fallbackName);
  hydrateLocalStateFromBackend(user);
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const apiEnabled = backendIsEnabled();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/app');
    }
  }, [navigate]);

  useEffect(() => {
    if (!apiEnabled) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      toast.error(errorParam);
      navigate('/auth', { replace: true });
      return;
    }

    const tokenParam = params.get('token');
    if (!tokenParam) {
      return;
    }

    const hasProfileParam = params.get('hasProfile') === 'true';
    setIsGoogleLoading(true);
    saveAuthToken(tokenParam);

    (async () => {
      try {
        const authState = await getAuthState();
        finalizeAuthSession(authState.user);
        toast.success('Signed in with Google!');
        navigate((hasProfileParam || authState.hasProfile) ? '/app' : '/profile-setup', {
          replace: true,
        });
      } catch (error) {
        clearAuthToken();
        const message = error instanceof Error ? error.message : 'Failed to complete Google sign-in';
        toast.error(message);
        navigate('/auth', { replace: true });
      } finally {
        setIsGoogleLoading(false);
      }
    })();
  }, [apiEnabled, location.search, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (isSignUp && !name) {
      toast.error('Please enter your name');
      return;
    }

    if (requiresTwoFactor && !twoFactorCode) {
      toast.error('Please enter your two-factor authentication code');
      return;
    }

    // Simple validation
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email');
      return;
    }

    setIsSubmitting(true);

    try {
      if (apiEnabled) {
        if (isSignUp) {
          const response = await registerUser({
            email,
            password,
            displayName: name || email.split('@')[0],
            acceptPolicies: false,
            policiesVersion: ''
          });
          
          saveAuthToken(response.token);
          finalizeAuthSession(response.user);
          toast.success('Account created successfully!');
          navigate(response.hasProfile ? '/app' : '/profile-setup');
        } else {
          const response = await loginUser({ 
            email, 
            password, 
            ...(requiresTwoFactor && twoFactorCode ? { twoFactorCode } : {})
          });
          
          if ('requiresTwoFactor' in response) {
            setRequiresTwoFactor(true);
            toast.info('Please enter your two-factor authentication code');
            return;
          }
          
          saveAuthToken(response.token);
          finalizeAuthSession(response.user);
          toast.success('Welcome back!');
          navigate(response.hasProfile ? '/app' : '/profile-setup');
        }
      } else {
        const displayName = isSignUp ? name : email.split('@')[0];
        saveUser(email, displayName);
        toast.success(isSignUp ? 'Account created locally!' : 'Welcome back!');
        navigate('/profile-setup');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to authenticate';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (!apiEnabled) {
      toast.info('Start the backend server to use Google sign-in.');
      return;
    }

    setIsGoogleLoading(true);
    const redirectTarget = `${window.location.origin}/auth`;
    const url = getGoogleOAuthUrl(redirectTarget);
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-gradient-sky flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Droplet className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            <span className="text-secondary">ARCHER</span>{' '}
            <span className="text-primary">AQUA</span>
          </CardTitle>
          <CardDescription>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {requiresTwoFactor && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">Two-Factor Authentication Code</Label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  maxLength={6}
                  required={requiresTwoFactor}
                />
              </div>
            )}

            <Button type="submit" className="w-full bg-gradient-water" disabled={isSubmitting || isGoogleLoading}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={!apiEnabled || isGoogleLoading || isSubmitting}
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              Continue with Google
            </Button>
            {!apiEnabled && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Connect the backend to enable Google sign-in and secure authentication.
              </p>
            )}
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
