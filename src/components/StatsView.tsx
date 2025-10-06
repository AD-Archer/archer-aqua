import { UserStats } from '@/types/water';
import { Card } from '@/components/ui/card';
import { Flame, Trophy, Droplets, Calendar, TrendingUp, Target } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatComparison, getProgressToNextMilestone, getComparisonIconComponent } from '@/lib/waterComparisons';
import { Progress } from '@/components/ui/progress';

interface StatsViewProps {
  stats: UserStats;
}

export function StatsView({ stats }: StatsViewProps) {
  const totalLiters = (stats.totalWaterConsumed / 1000).toFixed(1);
  const comparisonData = formatComparison(stats.totalWaterConsumed);
  const ComparisonIcon = getComparisonIconComponent(
    getProgressToNextMilestone(stats.totalWaterConsumed).next || 
    { iconKey: 'water_bottle', description: '', type: 'container', milestone: 0 }
  );
  const milestone = getProgressToNextMilestone(stats.totalWaterConsumed);

  // Mock data for the charts - you can replace this with real data later
  const last7Days = [
    { day: 'Mon', amount: 2200, goal: 2500 },
    { day: 'Tue', amount: 2500, goal: 2500 },
    { day: 'Wed', amount: 2100, goal: 2500 },
    { day: 'Thu', amount: 2700, goal: 2500 },
    { day: 'Fri', amount: 2400, goal: 2500 },
    { day: 'Sat', amount: 2600, goal: 2500 },
    { day: 'Sun', amount: 2300, goal: 2500 },
  ];

  const streakData = [
    { week: 'W1', streak: 3 },
    { week: 'W2', streak: 5 },
    { week: 'W3', streak: 7 },
    { week: 'W4', streak: stats.currentStreak },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
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

      {/* Water Comparison Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Your Water Journey</h3>
          </div>
          <div className="flex items-center gap-2 text-2xl font-bold text-primary">
            <ComparisonIcon className="h-8 w-8" />
            <span>You've consumed {comparisonData.text}!</span>
          </div>
          {milestone.next && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span>Next milestone:</span>
                  {(() => {
                    const NextIcon = getComparisonIconComponent(milestone.next);
                    return <NextIcon className="h-4 w-4 inline" />;
                  })()}
                  <span>{milestone.next.description}</span>
                </div>
                <span>{(milestone.remaining / 1000).toFixed(1)}L to go</span>
              </div>
              <Progress value={milestone.progress} className="h-2" />
            </div>
          )}
        </div>
      </Card>

      {/* Weekly Hydration Chart */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Last 7 Days</h3>
          </div>
          <ChartContainer
            config={{
              amount: {
                label: 'Water Consumed',
                color: 'hsl(var(--primary))',
              },
              goal: {
                label: 'Goal',
                color: 'hsl(var(--muted-foreground))',
              },
            }}
            className="h-[200px] w-full"
          >
            <AreaChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="day" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                tickFormatter={(value) => `${value / 1000}L`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="goal"
                stroke="hsl(var(--muted-foreground))"
                fill="hsl(var(--muted))"
                fillOpacity={0.2}
                strokeDasharray="5 5"
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </Card>

      {/* Streak Progress Chart */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold">Streak Progress</h3>
          </div>
          <ChartContainer
            config={{
              streak: {
                label: 'Streak Days',
                color: 'hsl(var(--secondary))',
              },
            }}
            className="h-[200px] w-full"
          >
            <BarChart data={streakData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="streak"
                fill="hsl(var(--secondary))"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </Card>
    </div>
  );
}
