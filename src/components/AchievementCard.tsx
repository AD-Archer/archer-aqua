import { Achievement } from '@/types/water';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Lock, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { RadialBar, RadialBarChart, PolarAngleAxis } from 'recharts';
import { getAchievementComparison } from '@/lib/achievementComparisons';
import { getAchievementIcon } from '@/lib/iconMap';

interface AchievementCardProps {
  achievement: Achievement;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const progress = Math.min((achievement.currentProgress / achievement.requirement) * 100, 100);
  const comparison = getAchievementComparison(achievement.id, achievement.currentProgress);
  const AchievementIcon = getAchievementIcon(achievement.id);
  
  // Create data for the radial chart
  const chartData = [
    {
      name: achievement.title,
      value: progress,
      fill: achievement.unlocked ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
    },
  ];

  const chartConfig = {
    value: {
      label: 'Progress',
    },
  };

  return (
    <Card
      className={cn(
        "p-4 transition-all hover:shadow-lg relative overflow-hidden",
        achievement.unlocked 
          ? "bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/10 border-primary/50" 
          : "bg-card opacity-75"
      )}
    >
      {/* Sparkle effect for unlocked achievements */}
      {achievement.unlocked && (
        <div className="absolute top-2 right-2">
          <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
        </div>
      )}
      
      <div className="flex gap-4">
        {/* Radial Progress Chart or Icon */}
        <div className="flex-shrink-0">
          {!achievement.unlocked ? (
            <div className="relative w-20 h-20">
              <ChartContainer config={chartConfig} className="w-20 h-20">
                <RadialBarChart
                  data={chartData}
                  startAngle={90}
                  endAngle={-270}
                  innerRadius="70%"
                  outerRadius="100%"
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    angleAxisId={0}
                    tick={false}
                  />
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={10}
                    fill="hsl(var(--primary))"
                  />
                </RadialBarChart>
              </ChartContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          ) : (
            <div className={cn(
              "w-20 h-20 flex items-center justify-center rounded-full",
              "bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/30"
            )}>
              <AchievementIcon className="h-10 w-10 text-primary" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={cn(
              "font-semibold text-lg",
              achievement.unlocked && "text-primary"
            )}>
              {achievement.title}
            </h3>
            {achievement.unlocked && (
              <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                <Sparkles className="h-3 w-3" />
                Unlocked
              </div>
            )}
          </div>
          
          <p className={cn(
            "text-sm text-muted-foreground mb-3",
            achievement.unlocked && "text-foreground/70"
          )}>
            {achievement.description}
          </p>
          
          {!achievement.unlocked && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-primary">
                  {achievement.currentProgress.toLocaleString()} / {achievement.requirement.toLocaleString()}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {progress.toFixed(0)}% complete
              </div>
              <div className="text-xs text-primary/80 italic mt-1">
                {comparison}
              </div>
            </div>
          )}
          
          {achievement.unlocked && achievement.unlockedDate && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Unlocked {new Date(achievement.unlockedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              <div className="text-xs text-primary/80 italic">
                {comparison}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
