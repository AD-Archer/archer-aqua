import { cn } from '@/lib/utils';
import { VolumeUnit, formatVolume } from '@/types/water';

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  current: number;
  goal: number;
  className?: string;
  unit?: VolumeUnit;
}

export function CircularProgress({ 
  progress, 
  size = 280, 
  strokeWidth = 20,
  current,
  goal,
  className,
  unit = 'ml'
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
          stroke="url(#waterGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
        <defs>
          <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
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
