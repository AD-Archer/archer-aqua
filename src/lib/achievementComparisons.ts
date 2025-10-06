// Enhanced achievement descriptions with water comparisons

export const ACHIEVEMENT_COMPARISONS: Record<string, string> = {
  first_day: "Started your hydration journey",
  week_streak: "A week of consistent hydration - that's 14 liters!",
  month_streak: "A month of hydration - enough to fill a bathtub!",
  total_10l: "10L total - you could fill 20 water bottles!",
  total_100l: "100L total - that's a kiddie pool full of water!",
  perfect_week: "A perfect week of meeting your goals!",
  total_500l: "500L - enough to fill a standard bathtub twice!",
  total_1000l: "1,000L - you could swim in that much water!",
  hydration_master: "Master of hydration - that's Olympic pool level!",
};

export function getAchievementComparison(achievementId: string, currentProgress: number): string {
  // Return custom comparison based on achievement type
  if (achievementId.includes('streak')) {
    const days = currentProgress;
    const liters = (days * 2.5).toFixed(1); // Assuming 2.5L per day average
    return `${days} days of consistency = ${liters}L of health!`;
  }
  
  if (achievementId.includes('total')) {
    const ml = currentProgress;
    const liters = (ml / 1000).toFixed(1);
    
    if (ml >= 1000000) {
      return `${liters}L - You could fill a hot tub!`;
    } else if (ml >= 500000) {
      return `${liters}L - That's a bathtub full!`;
    } else if (ml >= 100000) {
      return `${liters}L - Enough for a kiddie pool!`;
    } else if (ml >= 50000) {
      return `${liters}L - You've filled 100 water bottles!`;
    } else if (ml >= 10000) {
      return `${liters}L - That's 20 water bottles!`;
    }
  }
  
  return ACHIEVEMENT_COMPARISONS[achievementId] || "Keep up the great work!";
}
