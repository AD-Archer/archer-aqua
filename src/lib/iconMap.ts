import { 
  Droplet, 
  Droplets,
  Waves, 
  Trophy, 
  Flame,
  Star,
  Zap,
  Coffee,
  Wine,
  Milk,
  Battery,
  Grape,
  GlassWater,
  Target,
  Award,
  Fish,
  Sparkles,
  Baby,
  type LucideIcon
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { getCustomDrinkById, getCustomDrinkByLabel } from './storage';

// Icon mapping for drink types
export const DRINK_ICON_MAP: Record<string, LucideIcon> = {
  water: Droplet,
  sports_drink: Zap,
  milk: Milk,
  tea: Coffee,
  juice: Grape,
  coffee: Coffee,
  soda: GlassWater,
  energy_drink: Battery,
  alcohol: Wine,
  custom: GlassWater,
};

// Icon mapping for achievements
export const ACHIEVEMENT_ICON_MAP: Record<string, LucideIcon> = {
  first_day: Droplet,
  week_streak: Waves,
  month_streak: Trophy,
  total_10l: Fish,
  total_100l: Waves,
  perfect_week: Star,
};

// Icon mapping for water comparisons
export const COMPARISON_ICON_MAP: Record<string, LucideIcon> = {
  teaspoon: Droplet,
  shot_glass: GlassWater,
  coffee_mug: Coffee,
  water_bottle: Droplet,
  wine_bottle: Wine,
  milk_jug: Milk,
  soda_bottle: GlassWater,
  bucket: Droplets,
  bathtub: Waves,
  hot_tub: Waves,
  swimming_pool: Waves,
  kiddie_pool: Baby,
  standard_pool: Waves,
  english_channel: Waves,
  olympic_pool: Trophy,
};

// Icon mapping for hydration status
export const HYDRATION_STATUS_ICONS: Record<string, LucideIcon> = {
  excellent: Droplets,
  well_hydrated: Droplets,
  good_progress: Droplet,
  keep_going: Sparkles,
  need_water: Target,
};

// Helper function to get icon component
export function getDrinkIcon(type: string, customDrinkId?: string, label?: string): LucideIcon {
  if (type === 'custom') {
    const customDrink = customDrinkId ? getCustomDrinkById(customDrinkId) : null;
    if (customDrink?.icon) {
      const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[customDrink.icon];
      if (IconComponent) {
        return IconComponent;
      }
    }

    if (label) {
      const byLabel = getCustomDrinkByLabel(label);
      if (byLabel?.icon) {
        const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[byLabel.icon];
        if (IconComponent) {
          return IconComponent;
        }
      }
    }
  }

  return DRINK_ICON_MAP[type] || GlassWater;
}

export function getAchievementIcon(id: string): LucideIcon {
  return ACHIEVEMENT_ICON_MAP[id] || Award;
}

export function getComparisonIcon(key: string): LucideIcon {
  const iconKey = key.toLowerCase().replace(/\s+/g, '_');
  return COMPARISON_ICON_MAP[iconKey] || Droplet;
}

export function getHydrationStatusIcon(status: string): LucideIcon {
  return HYDRATION_STATUS_ICONS[status] || Droplet;
}
