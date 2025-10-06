package services

import "strings"

// CalculateDailyGoalLiters returns a personalized hydration goal in liters.
// The baseline is weight (kg) * 0.033 with adjustments for gender and activity level.
func CalculateDailyGoalLiters(weightKg float64, activityLevel, gender string) float64 {
	base := weightKg * 0.033

	switch strings.ToLower(activityLevel) {
	case "sedentary", "low":
		base += 0
	case "light":
		base += 0.2
	case "moderate":
		base += 0.35
	case "high", "active":
		base += 0.5
	case "athlete", "very_high":
		base += 0.75
	default:
		base += 0.25
	}

	switch strings.ToLower(gender) {
	case "male", "man":
		base += 0.3
	case "female", "woman":
		base += 0.1
	}

	if base < 1.5 {
		base = 1.5
	}

	return roundTo(base, 2)
}

func roundTo(value float64, decimals int) float64 {
	pow := 1.0
	for i := 0; i < decimals; i++ {
		pow *= 10
	}
	return float64(int(value*pow+0.5)) / pow
}
