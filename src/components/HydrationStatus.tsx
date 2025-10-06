import { cn } from '@/lib/utils';
import { Droplet } from 'lucide-react';

interface HydrationStatusProps {
  percentage: number;
}

export function HydrationStatus({ percentage }: HydrationStatusProps) {
  const getStatus = () => {
    if (percentage >= 100) return { label: 'Excellent', color: 'text-primary', emoji: '💧💧💧' };
    if (percentage >= 75) return { label: 'Well Hydrated', color: 'text-primary', emoji: '💧💧' };
    if (percentage >= 50) return { label: 'Good Progress', color: 'text-accent', emoji: '💧' };
    if (percentage >= 25) return { label: 'Keep Going', color: 'text-secondary', emoji: '🌱' };
    return { label: 'Need Water', color: 'text-destructive', emoji: '🏜️' };
  };

  const status = getStatus();

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <span className="text-2xl">{status.emoji}</span>
      <div>
        <div className={cn("font-semibold", status.color)}>{status.label}</div>
        <div className="text-sm text-muted-foreground">Hydration Level</div>
      </div>
    </div>
  );
}
