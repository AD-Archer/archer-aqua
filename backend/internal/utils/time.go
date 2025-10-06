package utils

import (
	"fmt"
	"time"
)

// LoadLocation attempts to load the timezone location, defaulting to UTC when invalid.
func LoadLocation(tz string) (*time.Location, error) {
	if tz == "" {
		return time.UTC, nil
	}

	loc, err := time.LoadLocation(tz)
	if err != nil {
		return time.UTC, fmt.Errorf("load location: %w", err)
	}

	return loc, nil
}

// DayBounds calculates the start and end instants for a local day.
func DayBounds(date time.Time, loc *time.Location) (time.Time, time.Time) {
	local := date.In(loc)
	start := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, loc)
	end := start.Add(24*time.Hour - time.Nanosecond)
	return start, end
}

// DailyKey returns a YYYY-MM-DD string in the provided location.
func DailyKey(t time.Time, loc *time.Location) string {
	return t.In(loc).Format("2006-01-02")
}

// ConvertVolumeToMl converts a value and unit ("ml", "l", "oz") into milliliters.
func ConvertVolumeToMl(value float64, unit string) (float64, error) {
	switch unit {
	case "ml", "milliliter", "milliliters":
		return value, nil
	case "l", "liter", "liters":
		return value * 1000, nil
	case "oz", "fl_oz", "fluid_ounce", "fluid_ounces":
		return value * 29.5735, nil
	case "cup", "cups":
		return value * 236.588, nil
	case "gal", "gallon", "gallons":
		return value * 3785.41, nil
	default:
		return 0, fmt.Errorf("unsupported volume unit: %s", unit)
	}
}

// ConvertWeightToKg converts values in kg or lbs into kilograms.
func ConvertWeightToKg(value float64, unit string) (float64, error) {
	switch unit {
	case "kg", "kilogram", "kilograms":
		return value, nil
	case "lb", "lbs", "pound", "pounds":
		return value * 0.453592, nil
	default:
		return 0, fmt.Errorf("unsupported weight unit: %s", unit)
	}
}

// ConvertWeightFromKg converts weight from kilograms to the specified unit.
func ConvertWeightFromKg(weightKg float64, unit string) (float64, error) {
	switch unit {
	case "kg", "kilogram", "kilograms":
		return weightKg, nil
	case "lb", "lbs", "pound", "pounds":
		return weightKg / 0.453592, nil
	default:
		return 0, fmt.Errorf("unsupported weight unit: %s", unit)
	}
}
