import { UserStats } from '@/types/water';
import { Card } from '@/components/ui/card';
import { Flame, Trophy, Droplets, Calendar } from 'lucide-react';

interface StatsViewProps {
  stats: UserStats;
}

export function StatsView({ stats }: StatsViewProps) {
  const totalLiters = (stats.totalWaterConsumed / 1000).toFixed(1);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="p-4 bg-gradient-water text-primary-foreground">
        <div className="flex items-center gap-3">
          <Flame className="h-8 w-8" />
          <div>
            <div className="text-2xl font-bold">{stats.currentStreak}</div>
            <div className="text-sm opacity-90">Day Streak</div>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-card">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-secondary" />
          <div>
            <div className="text-2xl font-bold">{stats.longestStreak}</div>
            <div className="text-sm text-muted-foreground">Best Streak</div>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-card">
        <div className="flex items-center gap-3">
          <Droplets className="h-8 w-8 text-primary" />
          <div>
            <div className="text-2xl font-bold">{totalLiters}L</div>
            <div className="text-sm text-muted-foreground">Total Water</div>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-card">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-accent" />
          <div>
            <div className="text-2xl font-bold">{stats.totalDaysTracked}</div>
            <div className="text-sm text-muted-foreground">Days Tracked</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
