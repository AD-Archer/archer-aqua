import { cn } from '@/lib/utils';
import { VolumeUnit, formatVolume, ProgressWheelStyle, Drink, DRINK_COLORS } from '@/types/water';
import { getCustomDrinkById, getCustomDrinkByLabel } from '@/lib/storage';

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  current: number;
  goal: number;
  className?: string;
  unit?: VolumeUnit;
  progressWheelStyle?: ProgressWheelStyle;
  drinks?: Drink[];
}

export function CircularProgress({ 
  progress, 
  size = 280, 
  strokeWidth = 20,
  current,
  goal,
  className,
  unit = 'ml',
  progressWheelStyle = 'drink-colors',
  drinks = []
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  const formatAmount = (ml: number) => {
    if (unit === 'oz') {
      return (ml * 0.033814).toFixed(1);
    }
    return (ml / 1000).toFixed(1);
  };

  const unitLabel = unit === 'oz' ? 'oz' : 'L';

  // Calculate gradient stops based on drinks and style
  const getGradientStops = () => {
    if (progressWheelStyle === 'black-white') {
      return [
        { offset: '0%', color: '#000000' },
        { offset: '100%', color: '#ffffff' }
      ];
    }
    
    if (progressWheelStyle === 'water-blue') {
      return [
        { offset: '0%', color: 'hsl(var(--primary))' },
        { offset: '100%', color: 'hsl(var(--accent))' }
      ];
    }
    
    // drink-colors mode
    if (drinks.length === 0) {
      // Default to water blue if no drinks
      return [
        { offset: '0%', color: '#3b82f6' },
        { offset: '100%', color: '#60a5fa' }
      ];
    }
    
    // Calculate cumulative hydration for each drink
    let cumulativeHydration = 0;
    const drinkSegments = drinks.map(drink => {
      const isCustom = drink.type === 'custom';
      const customDrink = isCustom
        ? (drink.customDrinkId ? getCustomDrinkById(drink.customDrinkId) : null) ?? (drink.label ? getCustomDrinkByLabel(drink.label) : null)
        : null;
      const color = isCustom && customDrink
        ? customDrink.color
        : DRINK_COLORS[drink.type as Exclude<typeof drink.type, 'custom'>];
      
      const startPercent = (cumulativeHydration / goal) * 100;
      cumulativeHydration += drink.hydrationValue;
      const endPercent = Math.min((cumulativeHydration / goal) * 100, 100);
      
      return { startPercent, endPercent, color };
    });
    
    // Create gradient stops
    const stops: Array<{ offset: string; color: string }> = [];
    drinkSegments.forEach((segment, index) => {
      // Add start color
      stops.push({ 
        offset: `${segment.startPercent.toFixed(1)}%`, 
        color: segment.color 
      });
      // Add end color
      stops.push({ 
        offset: `${segment.endPercent.toFixed(1)}%`, 
        color: segment.color 
      });
    });
    
    return stops.length > 0 ? stops : [
      { offset: '0%', color: '#3b82f6' },
      { offset: '100%', color: '#60a5fa' }
    ];
  };

  const gradientStops = getGradientStops();

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#dynamicGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
        <defs>
          <linearGradient id="dynamicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            {gradientStops.map((stop, index) => (
              <stop key={index} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-bold text-foreground">
          {formatAmount(current)}
          <span className="text-3xl text-muted-foreground">/{formatAmount(goal)}{unitLabel}</span>
        </div>
        <div className="mt-2 text-sm font-medium text-muted-foreground">
          {progress >= 100 ? 'Goal Reached! 🎉' : `${Math.round(progress)}% Complete`}
        </div>
      </div>
    </div>
  );
}
