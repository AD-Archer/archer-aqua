// Fun comparisons for water consumption
import { type LucideIcon } from 'lucide-react';
import { getComparisonIcon } from './iconMap';

export interface WaterComparison {
  type: 'body' | 'distance' | 'landmark' | 'container';
  description: string;
  iconKey: string; // Key to look up the icon
  milestone: number; // in ml
}

export const WATER_COMPARISONS: WaterComparison[] = [
  // Bodies of water
  { type: 'body', description: 'a teaspoon', iconKey: 'teaspoon', milestone: 5 },
  { type: 'body', description: 'a shot glass', iconKey: 'shot_glass', milestone: 50 },
  { type: 'container', description: 'a coffee mug', iconKey: 'coffee_mug', milestone: 250 },
  { type: 'container', description: 'a water bottle', iconKey: 'water_bottle', milestone: 500 },
  { type: 'container', description: 'a wine bottle', iconKey: 'wine_bottle', milestone: 750 },
  { type: 'container', description: 'a milk jug', iconKey: 'milk_jug', milestone: 1000 },
  { type: 'container', description: '2-liter soda bottles', iconKey: 'soda_bottle', milestone: 2000 },
  { type: 'container', description: 'a large bucket', iconKey: 'bucket', milestone: 10000 },
  { type: 'body', description: 'a bathtub', iconKey: 'bathtub', milestone: 150000 },
  { type: 'body', description: 'a hot tub', iconKey: 'hot_tub', milestone: 1000000 },
  { type: 'body', description: 'a small swimming pool', iconKey: 'swimming_pool', milestone: 50000000 },
  
  // Landmark/distance comparisons
  { type: 'distance', description: 'swim across a kiddie pool', iconKey: 'kiddie_pool', milestone: 1000 },
  { type: 'distance', description: 'swim across a standard pool', iconKey: 'standard_pool', milestone: 5000 },
  { type: 'distance', description: 'swim across the English Channel', iconKey: 'english_channel', milestone: 500000 },
  { type: 'landmark', description: 'fill an Olympic swimming pool', iconKey: 'olympic_pool', milestone: 2500000000 },
];

// Helper to get the icon component for a comparison
export function getComparisonIconComponent(comparison: WaterComparison): LucideIcon {
  return getComparisonIcon(comparison.iconKey);
}

export function getWaterComparison(totalMl: number): WaterComparison {
  // Find the highest milestone that's been reached
  const sorted = [...WATER_COMPARISONS].sort((a, b) => b.milestone - a.milestone);
  const reached = sorted.find(comp => totalMl >= comp.milestone);
  
  if (reached) {
    return reached;
  }
  
  // Return the smallest milestone if none reached
  return WATER_COMPARISONS[0];
}

export function getNextMilestone(totalMl: number): WaterComparison | null {
  const sorted = [...WATER_COMPARISONS].sort((a, b) => a.milestone - b.milestone);
  return sorted.find(comp => totalMl < comp.milestone) || null;
}

export function formatComparison(totalMl: number): { text: string; iconKey: string } {
  const comparison = getWaterComparison(totalMl);
  const count = Math.floor(totalMl / comparison.milestone);
  
  let text: string;
  if (count === 1) {
    text = comparison.description;
  } else if (count < 100) {
    text = `${count} ${comparison.description}`;
  } else {
    text = `${count.toLocaleString()} ${comparison.description}`;
  }
  
  return { text, iconKey: comparison.iconKey };
}

export function getProgressToNextMilestone(totalMl: number): { 
  next: WaterComparison | null; 
  progress: number; 
  remaining: number;
} {
  const next = getNextMilestone(totalMl);
  
  if (!next) {
    return { next: null, progress: 100, remaining: 0 };
  }
  
  // Find the previous milestone for accurate progress calculation
  const sorted = [...WATER_COMPARISONS].sort((a, b) => a.milestone - b.milestone);
  const currentIndex = sorted.findIndex(comp => comp.milestone === next.milestone);
  const previous = currentIndex > 0 ? sorted[currentIndex - 1] : null;
  
  const start = previous?.milestone || 0;
  const range = next.milestone - start;
  const current = totalMl - start;
  const progress = Math.min((current / range) * 100, 100);
  const remaining = next.milestone - totalMl;
  
  return { next, progress, remaining };
}
