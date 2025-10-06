import { Achievement } from '@/types/water';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface AchievementCardProps {
  achievement: Achievement;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const progress = (achievement.currentProgress / achievement.requirement) * 100;

  return (
    <Card
      className={cn(
        "p-4 transition-all hover:shadow-lg",
        achievement.unlocked ? "bg-gradient-water border-primary" : "bg-card opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "text-4xl",
          !achievement.unlocked && "grayscale"
        )}>
          {achievement.unlocked ? achievement.icon : <Lock className="h-8 w-8 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-semibold",
            achievement.unlocked && "text-primary-foreground"
          )}>
            {achievement.title}
          </h3>
          <p className={cn(
            "text-sm text-muted-foreground",
            achievement.unlocked && "text-primary-foreground/80"
          )}>
            {achievement.description}
          </p>
          {!achievement.unlocked && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{achievement.currentProgress} / {achievement.requirement}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}
          {achievement.unlocked && achievement.unlockedDate && (
            <p className="text-xs text-primary-foreground/60 mt-1">
              Unlocked {new Date(achievement.unlockedDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
