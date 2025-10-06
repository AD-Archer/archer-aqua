import { cn } from '@/lib/utils';
import { Droplet, Droplets, Sparkles, Target } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

interface HydrationStatusProps {
  percentage: number;
}

export function HydrationStatus({ percentage }: HydrationStatusProps) {
  const getStatus = (): { label: string; color: string; Icon: LucideIcon } => {
    if (percentage >= 100) return { label: 'Excellent', color: 'text-primary', Icon: Droplets };
    if (percentage >= 75) return { label: 'Well Hydrated', color: 'text-primary', Icon: Droplets };
    if (percentage >= 50) return { label: 'Good Progress', color: 'text-accent', Icon: Droplet };
    if (percentage >= 25) return { label: 'Keep Going', color: 'text-secondary', Icon: Sparkles };
    return { label: 'Need Water', color: 'text-destructive', Icon: Target };
  };

  const status = getStatus();
  const StatusIcon = status.Icon;

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <StatusIcon className={cn("h-8 w-8", status.color)} />
      <div>
        <div className={cn("font-semibold", status.color)}>{status.label}</div>
        <div className="text-sm text-muted-foreground">Hydration Level</div>
      </div>
    </div>
  );
}
