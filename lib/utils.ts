/**
 * Shared pure utility functions used across the app.
 */

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Average of a calorie range — used in dashboard, calendar, chat, memory. */
export function calcAvgCalories(min: number, max: number): number {
  return (min + max) / 2;
}
