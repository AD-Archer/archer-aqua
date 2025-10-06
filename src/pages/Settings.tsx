import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SEO } from '@/components/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Droplet, ArrowLeft, LogOut, Plus, Trash2, GlassWater, Pencil, Copy, type LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { saveUserProfile, getUserProfile, calculatePersonalizedGoal, calculatePersonalizedGoalForDate, saveDailyGoal, getDailyGoal, logout, isAuthenticated, getUser, getUnitPreference, saveUnitPreference, getCustomDrinks, getWeightUnitPreference, saveWeightUnitPreference, getTemperatureUnitPreference, saveTemperatureUnitPreference, getTimezone, saveTimezone, getUseWeatherAdjustment, saveUseWeatherAdjustment, getAllDayRecords, saveDayRecord, getProgressWheelStyle, saveProgressWheelStyle, getBackendUserId, setCustomDrinksList, getGoalMode, saveGoalMode } from '@/lib/storage';
import { Gender, ActivityLevel, UserProfile, VolumeUnit, CustomDrinkType, WeightUnit, kgToLbs, lbsToKg, TemperatureUnit, celsiusToFahrenheit, fahrenheitToCelsius, ProgressWheelStyle } from '@/types/water';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { WeatherCard } from '@/components/WeatherCard';
import { LocationPicker } from '@/components/LocationPicker';
import { WeeklyWeatherView } from '@/components/WeeklyWeatherView';
import { backendIsEnabled, ensureBackendUser, syncProfileToBackend } from '@/lib/backend';
import { getUser as getBackendUser, updateUser as updateBackendUser, getAuthState, deleteDrink, createDrink, updateDrink, isApiEnabled, changePassword, setPassword, removePassword, sendEmailVerification, enable2FA, verify2FA, disable2FA } from '@/lib/api';
import { getLocationPreference } from '@/lib/weather';

const CUSTOM_DRINK_ICONS = [
  'Droplet', 'Coffee', 'Wine', 'Beer', 'Milk', 'Apple', 'Cherry', 
  'Grape', 'Citrus', 'Banana', 'Soup', 'IceCreamCone', 'Cake', 
  'Battery', 'Heart', 'Zap', 'Sun', 'Moon', 'Star', 'Sparkles', 'GlassWater'
];

export default function Settings() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
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
  const [progressWheelStyle, setProgressWheelStyle] = useState<ProgressWheelStyle>('drink-colors');
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  
  // Custom drink form state
  const [newDrinkName, setNewDrinkName] = useState('');
  const [newDrinkColor, setNewDrinkColor] = useState('#3b82f6');
  const [newDrinkMultiplier, setNewDrinkMultiplier] = useState([1.0]);
  const [newDrinkIcon, setNewDrinkIcon] = useState('GlassWater');
  
  // Edit drink state
  const [editingDrink, setEditingDrink] = useState<CustomDrinkType | null>(null);
  const [isEditDrinkDialogOpen, setIsEditDrinkDialogOpen] = useState(false);

  useEffect(() => {
    const checkAuthAndLoadProfile = async () => {
      if (!isAuthenticated()) {
        navigate('/auth');
        return;
      }

      const loadUserData = async () => {
        const savedWeightUnit = getWeightUnitPreference();
        setWeightUnit(savedWeightUnit);

        // Try to load from backend first if available
        if (backendIsEnabled()) {
          try {
            const authState = await getAuthState();
            
            // Check if profile exists
            if (!authState?.hasProfile) {
              navigate('/profile-setup', { replace: true });
              return;
            }
            
            const userId = getBackendUserId();
            if (userId) {
              const response = await getBackendUser(userId);
              if (response?.user) {
                const backendUser = response.user;
                
                // Set basic profile info
                setDisplayName(backendUser.displayName);
                setEmail(backendUser.email);
                setEmailVerified(backendUser.emailVerified);
                setHasPassword(backendUser.hasPassword);
                setIsGoogleUser(backendUser.isGoogleUser);
                setTwoFactorEnabled(backendUser.twoFactorEnabled);

                const backendWeightUnit = (backendUser.weightUnit as WeightUnit) || 'kg';
                const weightInPreferredUnit = backendUser.weight;
                const weightInKg = backendWeightUnit === 'lbs'
                  ? lbsToKg(weightInPreferredUnit)
                  : weightInPreferredUnit;

                // Update local state from backend
                setWeight(weightInPreferredUnit.toFixed(1));
                setWeightUnit(backendWeightUnit);
                saveWeightUnitPreference(backendWeightUnit);
                setAge(backendUser.age.toString());
                setGender(backendUser.gender as Gender);
                setActivityLevel(backendUser.activityLevel as ActivityLevel);

                // Load custom drinks from backend
                if (response.drinks) {
                  const backendCustomDrinks: CustomDrinkType[] = response.drinks
                    .filter(drink => drink.source === 'custom')
                    .map(drink => ({
                      id: drink.id,
                      name: drink.name,
                      color: drink.colorHex || '#3b82f6',
                      hydrationMultiplier: drink.hydrationMultiplier,
                      icon: 'GlassWater', // Default icon since backend doesn't store icons yet
                    }));
                  setCustomDrinks(backendCustomDrinks);
                  setCustomDrinksList(backendCustomDrinks);
                }

                // Set unit preferences from backend
                const volumeUnitMap: Record<string, VolumeUnit> = {
                  'ml': 'ml',
                  'oz': 'oz',
                };
                const backendUnit = volumeUnitMap[backendUser.volumeUnit] || 'ml';
                setUnitPreference(backendUnit);
                saveUnitPreference(backendUnit);
                
                const tempUnit = backendUser.temperatureUnit === 'fahrenheit' ? 'F' : 'C';
                setTemperatureUnit(tempUnit);
                saveTemperatureUnitPreference(tempUnit);
                
                setTimezone(backendUser.timezone);
                saveTimezone(backendUser.timezone);
                
                setUseWeatherAdjustment(backendUser.weatherAdjustmentsEnabled);
                saveUseWeatherAdjustment(backendUser.weatherAdjustmentsEnabled);
                
                const wheelStyleMap: Record<string, ProgressWheelStyle> = {
                  'drink_colors': 'drink-colors',
                  'black_white': 'black-white',
                  'water_blue': 'water-blue',
                };
                const backendStyle = wheelStyleMap[backendUser.progressWheelStyle] || 'drink-colors';
                setProgressWheelStyle(backendStyle);
                saveProgressWheelStyle(backendStyle);
                
                // Set goal from backend
                const hasCustomGoal = backendUser.customGoalLiters != null && backendUser.customGoalLiters > 0;
                const goalLiters = hasCustomGoal && backendUser.customGoalLiters
                  ? backendUser.customGoalLiters
                  : backendUser.dailyGoalLiters;
                const goalMl = Math.round(goalLiters * 1000);
                saveDailyGoal(goalMl);
                setManualGoal(goalLiters ? goalLiters.toFixed(1) : '');
                setUsePersonalizedGoal(!hasCustomGoal);
                saveGoalMode(hasCustomGoal ? 'custom' : 'personalized');
                
                // Update local profile storage
                const profile: UserProfile = {
                  name: backendUser.displayName,
                  email: backendUser.email,
                  weight: weightInKg,
                  age: backendUser.age,
                  gender: backendUser.gender as Gender,
                  activityLevel: backendUser.activityLevel as ActivityLevel,
                  climate: 'moderate',
                  createdAt: new Date(backendUser.createdAt),
                  preferredWeightUnit: backendWeightUnit,
                  preferredTemperatureUnit: tempUnit,
                  timezone: backendUser.timezone,
                };
                saveUserProfile(profile);
                
                return; // Successfully loaded from backend
              }
            }
          } catch (error) {
            console.warn('Failed to load user data from backend, using local storage', error);
          }
        }

        // Fallback to local storage
        const profile = getUserProfile();
        if (!profile || !profile.weight || !profile.age) {
          navigate('/profile-setup', { replace: true });
          return;
        }
        
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
        const goalMode = getGoalMode();
        setUsePersonalizedGoal(goalMode === 'personalized');
        
        const wheelStyle = getProgressWheelStyle();
        setProgressWheelStyle(wheelStyle);
      };

      await loadUserData();
    };

    checkAuthAndLoadProfile();
  }, [navigate]);

  const handleUpdateProfile = async () => {
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

    let personalizedGoalMl: number | null = null;
    let customGoalLiters: number | null = null;

    if (usePersonalizedGoal) {
      personalizedGoalMl = calculatePersonalizedGoal(profile, useWeatherAdjustment);
      saveDailyGoal(personalizedGoalMl);
      setManualGoal((personalizedGoalMl / 1000).toFixed(1));
      saveGoalMode('personalized');
    } else {
      const manualGoalValue = parseFloat(manualGoal);
      if (Number.isNaN(manualGoalValue) || manualGoalValue < 0.5 || manualGoalValue > 10) {
        toast.error('Please enter a valid custom goal (0.5 - 10L)');
        return;
      }
      customGoalLiters = manualGoalValue;
      saveDailyGoal(customGoalLiters * 1000);
      saveGoalMode('custom');
    }

    // Sync to backend if enabled
    if (backendIsEnabled()) {
      try {
        const userId = getBackendUserId();
        if (userId) {
          // Update backend with all profile data including display name
          await updateBackendUser(userId, {
            displayName: displayName,
            weight: {
              value: weightValue,
              unit: weightUnit
            },
            age: ageNum,
            gender,
            activityLevel,
            timezone,
            volumeUnit: unitPreference,
            temperatureUnit: temperatureUnit === 'F' ? 'fahrenheit' : 'celsius',
            progressWheelStyle: progressWheelStyle.replace('-', '_'),
            weatherAdjustmentsEnabled: useWeatherAdjustment,
            customGoalLiters: customGoalLiters,
          });
        }
        await syncProfileToBackend();
        toast.success('Profile synced to backend!');
      } catch (error) {
        console.error('Failed to sync profile to backend', error);
        toast.warning('Profile updated locally, but failed to sync with server');
      }
    } else {
      const goalLitersForMessage = usePersonalizedGoal
        ? (personalizedGoalMl ?? 0) / 1000
        : customGoalLiters;
      toast.success(
        goalLitersForMessage
          ? `Profile updated! Daily goal: ${goalLitersForMessage.toFixed(1)}L`
          : 'Profile updated!'
      );
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

  const handleUpdateManualGoal = async () => {
    const manualGoalValue = parseFloat(manualGoal);
    if (Number.isNaN(manualGoalValue) || manualGoalValue < 0.5 || manualGoalValue > 10) {
      toast.error('Please enter a valid goal (0.5 - 10L)');
      return;
    }

    const goalInMl = manualGoalValue * 1000;
    saveDailyGoal(goalInMl);
    setUsePersonalizedGoal(false);
    saveGoalMode('custom');

    if (backendIsEnabled() && isAuthenticated()) {
      try {
        const userId = getBackendUserId();
        if (userId) {
          await updateBackendUser(userId, { customGoalLiters: manualGoalValue });
        }
      } catch (error) {
        console.error('Failed to sync custom goal to backend', error);
        toast.warning('Custom goal saved locally, but failed to sync with server');
        return;
      }
    }

    toast.success('Daily goal updated!');
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleUnitChange = async (unit: VolumeUnit) => {
    setUnitPreference(unit);
    saveUnitPreference(unit);
    
    // Sync to backend if enabled
    if (backendIsEnabled()) {
      try {
        const userId = getBackendUserId();
        if (userId) {
          await updateBackendUser(userId, { volumeUnit: unit });
        }
      } catch (error) {
        console.error('Failed to sync unit preference to backend', error);
      }
    }
    
    toast.success(`Unit preference updated to ${unit.toUpperCase()}`);
  };

  const handleTemperatureUnitChange = async (unit: TemperatureUnit) => {
    setTemperatureUnit(unit);
    saveTemperatureUnitPreference(unit);
    
    // Sync to backend if enabled
    if (backendIsEnabled()) {
      try {
        const userId = getBackendUserId();
        if (userId) {
          const tempUnitBackend = unit === 'F' ? 'fahrenheit' : 'celsius';
          await updateBackendUser(userId, { temperatureUnit: tempUnitBackend });
        }
      } catch (error) {
        console.error('Failed to sync temperature preference to backend', error);
      }
    }
    
    toast.success(`Temperature unit updated to °${unit}`);
  };

  const handleTimezoneChange = async (tz: string) => {
    setTimezone(tz);
    saveTimezone(tz);
    
    // Sync to backend if enabled
    if (backendIsEnabled()) {
      try {
        const userId = getBackendUserId();
        if (userId) {
          await updateBackendUser(userId, { timezone: tz });
        }
      } catch (error) {
        console.error('Failed to sync timezone to backend', error);
      }
    }
    
    toast.success(`Timezone updated to ${tz}`);
  };

  const handleAddCustomDrink = async () => {
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

    try {
      // If API is enabled and user is authenticated, save to backend first
      if (isApiEnabled() && isAuthenticated()) {
        const userId = getBackendUserId();
        if (userId) {
          const backendDrink = await createDrink(userId, {
            name: newDrink.name,
            type: 'beverage',
            hydrationMultiplier: newDrink.hydrationMultiplier,
            colorHex: newDrink.color,
            source: 'custom'
          });
          // Update the drink ID to match backend
          newDrink.id = backendDrink.id;
        }
      }

      const updatedDrinks = [...customDrinks, newDrink];
      setCustomDrinks(updatedDrinks);
      setCustomDrinksList(updatedDrinks);
      toast.success(`Custom drink "${newDrink.name}" added!`);
    } catch (error) {
      console.error('Failed to create drink:', error);
      toast.error(`Failed to create "${newDrink.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      return;
    }
    
    // Reset form
    setNewDrinkName('');
    setNewDrinkColor('#3b82f6');
    setNewDrinkMultiplier([1.0]);
    setNewDrinkIcon('GlassWater');
    setIsAddDrinkDialogOpen(false);
  };

  const handleDeleteCustomDrink = async (id: string) => {
    const drink = customDrinks.find(d => d.id === id);
    
    try {
      // If API is enabled and user is authenticated, delete from backend
      if (isApiEnabled() && isAuthenticated()) {
        const userId = getBackendUserId();
        if (userId) {
          await deleteDrink(userId, id);
        }
      }

      const updatedDrinks = customDrinks.filter(d => d.id !== id);
      setCustomDrinks(updatedDrinks);
      setCustomDrinksList(updatedDrinks);
      toast.success(`Deleted "${drink?.name}"`);
    } catch (error) {
      console.error('Failed to delete drink:', error);
      toast.error(`Failed to delete "${drink?.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditCustomDrink = (drink: CustomDrinkType) => {
    setEditingDrink(drink);
    setIsEditDrinkDialogOpen(true);
  };

  const handleUpdateCustomDrink = async () => {
    if (!editingDrink) return;

    if (!editingDrink.name.trim()) {
      toast.error('Please enter a drink name');
      return;
    }

    try {
      // If API is enabled and user is authenticated, update backend first
      if (isApiEnabled() && isAuthenticated()) {
        const userId = getBackendUserId();
        if (userId) {
          await updateDrink(userId, editingDrink.id, {
            name: editingDrink.name,
            type: 'beverage',
            hydrationMultiplier: editingDrink.hydrationMultiplier,
            colorHex: editingDrink.color,
          });
        }
      }

    const updatedDrinks = customDrinks.map(d => d.id === editingDrink.id ? editingDrink : d);
    setCustomDrinks(updatedDrinks);
    setCustomDrinksList(updatedDrinks);
      toast.success(`Updated "${editingDrink.name}"`);
    } catch (error) {
      console.error('Failed to update drink:', error);
      toast.error(`Failed to update "${editingDrink.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      return;
    }
    
    setIsEditDrinkDialogOpen(false);
    setEditingDrink(null);
  };

  // Security handlers
  const handleSendEmailVerification = async () => {
    if (!isApiEnabled() || !isAuthenticated()) {
      toast.error('Email verification not available');
      return;
    }

    try {
      const userId = getBackendUserId();
      if (userId) {
        await sendEmailVerification(userId);
        toast.success('Verification email sent! Check your inbox.');
      }
    } catch (error) {
      console.error('Failed to send verification email:', error);
      toast.error('Failed to send verification email');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      const userId = getBackendUserId();
      if (userId) {
        if (hasPassword) {
          await changePassword(userId, { currentPassword, newPassword });
        } else {
          await setPassword(userId, { newPassword });
        }
        toast.success('Password updated successfully');
        setShowPasswordDialog(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setHasPassword(true);
      }
    } catch (error) {
      console.error('Failed to update password:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    }
  };

  const handleRemovePassword = async () => {
    if (!isGoogleUser) {
      toast.error('Cannot remove password without alternative authentication method');
      return;
    }

    try {
      const userId = getBackendUserId();
      if (userId) {
        await removePassword(userId);
        toast.success('Password removed successfully');
        setHasPassword(false);
      }
    } catch (error) {
      console.error('Failed to remove password:', error);
      toast.error('Failed to remove password');
    }
  };

  const handleEnable2FA = async () => {
    try {
      const userId = getBackendUserId();
      if (userId) {
        const response = await enable2FA(userId);
        setQrCodeUrl(response.qrCodeUrl);
        setTwoFactorSecret(response.secret);
        setBackupCodes(response.backupCodes);
        
        // Generate QR code image from TOTP URL
        try {
          const qrDataURL = await QRCode.toDataURL(response.qrCodeUrl, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeImage(qrDataURL);
        } catch (qrError) {
          console.error('Failed to generate QR code:', qrError);
        }
        
        setShow2FASetup(true);
      }
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      toast.error('Failed to enable 2FA');
    }
  };

  const handleVerify2FA = async () => {
    try {
      const userId = getBackendUserId();
      if (userId) {
        await verify2FA(userId, { code: twoFactorCode });
        toast.success('Two-factor authentication enabled successfully');
        setTwoFactorEnabled(true);
        setShow2FASetup(false);
        setTwoFactorCode('');
      }
    } catch (error) {
      console.error('Failed to verify 2FA:', error);
      toast.error('Invalid verification code');
    }
  };

  const handleDisable2FA = async () => {
    try {
      const userId = getBackendUserId();
      if (userId) {
        await disable2FA(userId, { password: currentPassword, code: twoFactorCode });
        toast.success('Two-factor authentication disabled');
        setTwoFactorEnabled(false);
        setShow2FADialog(false);
        setCurrentPassword('');
        setTwoFactorCode('');
      }
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      toast.error('Failed to disable 2FA');
    }
  };

  const handleWeatherAdjustmentChange = async (enabled: boolean) => {
    setUseWeatherAdjustment(enabled);
    saveUseWeatherAdjustment(enabled);
    
    // Sync to backend if enabled
    if (backendIsEnabled()) {
      try {
        const userId = getBackendUserId();
        if (userId) {
          await updateBackendUser(userId, { weatherAdjustmentsEnabled: enabled });
        }
      } catch (error) {
        console.error('Failed to sync weather adjustment preference to backend', error);
      }
    }
    
    toast.success(`Weather-based adjustment ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleProgressWheelStyleChange = async (style: ProgressWheelStyle) => {
    setProgressWheelStyle(style);
    saveProgressWheelStyle(style);
    
    // Sync to backend if enabled
    if (backendIsEnabled()) {
      try {
        const userId = getBackendUserId();
        if (userId) {
          // Convert kebab-case to snake_case for backend
          const styleBackend = style.replace(/-/g, '_');
          await updateBackendUser(userId, { progressWheelStyle: styleBackend });
        }
      } catch (error) {
        console.error('Failed to sync progress wheel style to backend', error);
      }
    }
    
    toast.success(`Progress wheel style updated!`);
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
    <>
      <SEO 
        title="Settings"
        description="Customize your Archer Aqua experience. Adjust units, set personalized goals, and manage your hydration preferences."
        url="https://aqua.adarcher.app/settings"
      />
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
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Manage your account details and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      value={email}
                      readOnly
                      className="bg-muted"
                    />
                    {!emailVerified && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleSendEmailVerification}
                      >
                        Verify
                      </Button>
                    )}
                  </div>
                  {emailVerified ? (
                    <p className="text-xs text-green-600">✓ Verified</p>
                  ) : (
                    <p className="text-xs text-orange-600">⚠ Not verified</p>
                  )}
                </div>
              </div>
              
              {/* Authentication Status */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Authentication</Label>
                  <div className="text-sm space-y-1">
                    {isGoogleUser && <p className="text-blue-600">✓ Google Sign-in</p>}
                    {hasPassword ? (
                      <p className="text-green-600">✓ Password</p>
                    ) : (
                      <p className="text-gray-500">No password set</p>
                    )}
                    {twoFactorEnabled ? (
                      <p className="text-green-600">✓ Two-factor authentication</p>
                    ) : (
                      <p className="text-gray-500">Two-factor authentication disabled</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Security Actions</Label>
                  <div className="flex flex-wrap gap-2">
                    {!hasPassword && (
                      <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                        Set Password
                      </Button>
                    )}
                    {hasPassword && (
                      <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                        Change Password
                      </Button>
                    )}
                    {hasPassword && isGoogleUser && (
                      <Button variant="outline" size="sm" onClick={handleRemovePassword}>
                        Remove Password
                      </Button>
                    )}
                    {!twoFactorEnabled ? (
                      <Button variant="outline" size="sm" onClick={handleEnable2FA}>
                        Enable 2FA
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setShow2FADialog(true)}>
                        Disable 2FA
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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

          {/* Progress Wheel Style */}
          <Card>
            <CardHeader>
              <CardTitle>Progress Wheel Style</CardTitle>
              <CardDescription>
                Customize how your progress wheel looks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="progress-wheel-style">Wheel Style</Label>
                <Select value={progressWheelStyle} onValueChange={(value: ProgressWheelStyle) => handleProgressWheelStyleChange(value)}>
                  <SelectTrigger id="progress-wheel-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drink-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 via-orange-500 to-green-500"></div>
                        <span>Drink Colors (Default - Reflects what you drink)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="water-blue">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"></div>
                        <span>Water Blue</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="black-white">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-black to-white"></div>
                        <span>Black & White</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {progressWheelStyle === 'drink-colors' 
                    ? 'The progress wheel will show different colors based on the drinks you consume'
                    : progressWheelStyle === 'black-white'
                    ? 'A simple monochrome gradient for the progress wheel'
                    : 'Classic blue water gradient'}
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

        {/* Password Management Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{hasPassword ? 'Change Password' : 'Set Password'}</DialogTitle>
              <DialogDescription>
                {hasPassword ? 'Update your account password' : 'Create a password for your account'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {hasPassword && (
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowPasswordDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleChangePassword} className="flex-1">
                  {hasPassword ? 'Change Password' : 'Set Password'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 2FA Setup Dialog */}
        <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Scan the QR code with your authenticator app, then enter the verification code
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {(qrCodeImage || qrCodeUrl) && (
                <div className="text-center space-y-4">
                  <img 
                    src={qrCodeImage || qrCodeUrl} 
                    alt="2FA QR Code" 
                    className="mx-auto w-48 h-48 border rounded" 
                  />
                  <div className="text-sm">
                    <p className="font-medium mb-2">Can't scan? Enter this code manually:</p>
                    <div className="bg-muted p-2 rounded font-mono text-xs break-all flex justify-between items-center">
                      <span>{twoFactorSecret}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(twoFactorSecret);
                          toast.success('Secret copied to clipboard');
                        }}
                        className="h-auto p-1 ml-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="twofa-code">Verification Code</Label>
                <Input
                  id="twofa-code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>
              {backupCodes.length > 0 && (
                <div className="space-y-2">
                  <Label>Backup Codes (Save these securely!)</Label>
                  <div className="bg-muted p-3 rounded text-sm font-mono space-y-1 max-h-32 overflow-y-auto">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{code}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(code);
                            toast.success('Backup code copied to clipboard');
                          }}
                          className="h-auto p-1"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShow2FASetup(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleVerify2FA} className="flex-1">
                  Verify & Enable
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 2FA Disable Dialog */}
        <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Enter your password and a verification code to disable 2FA
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="disable-password">Password</Label>
                <Input
                  id="disable-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disable-code">Verification Code</Label>
                <Input
                  id="disable-code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="Enter 6-digit code or backup code"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShow2FADialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDisable2FA} className="flex-1">
                  Disable 2FA
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
    </>
  );
}
