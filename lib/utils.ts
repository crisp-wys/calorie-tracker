import type { MealRecord, MealType } from './types';

/**
 * Shared pure utility functions used across the app.
 */

export function generateId(): string {
  return crypto.randomUUID();
}

/** Average of a calorie range — used in dashboard, calendar, chat, memory. */
export function calcAvgCalories(min: number, max: number): number {
  return (min + max) / 2;
}

// ── Daily summary aggregation ─────────────────────────────────────

export interface DailySummary {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealBreakdown: Record<MealType, number>;
}

function emptyBreakdown(): Record<MealType, number> {
  return { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
}

/** Aggregate meals into per-day summaries for the last N days. */
export function getDailySummaries(meals: MealRecord[], days: number): DailySummary[] {
  const map = new Map<string, DailySummary>();

  for (const m of meals) {
    let day = map.get(m.date);
    if (!day) {
      day = {
        date: m.date,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        mealBreakdown: emptyBreakdown(),
      };
      map.set(m.date, day);
    }
    const mealCal = calcAvgCalories(m.totalCaloriesMin, m.totalCaloriesMax);
    day.calories += mealCal;
    day.mealBreakdown[m.mealType] += mealCal;
    m.foods.forEach((f) => {
      day.protein += f.protein;
      day.carbs += f.carbs;
      day.fat += f.fat;
    });
  }

  return Array.from(map.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days);
}
