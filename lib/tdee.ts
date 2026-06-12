import { Gender, ActivityLevel, UserProfile } from './types';

export type GoalType = 'lose' | 'maintain' | 'gain';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  1: 1.20,
  2: 1.25,
  3: 1.30,
  4: 1.35,
  5: 1.40,
};

export const GOAL_OFFSETS: Record<GoalType, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

export const GOAL_LABELS: Record<GoalType, string> = {
  lose: '减脂',
  maintain: '维持',
  gain: '增肌',
};

export function calculateTDEE(
  height: number,
  weight: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  goalType: GoalType = 'lose',
): { bmr: number; tdee: number; dailyTarget: number } {
  // Mifflin-St Jeor
  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  // NEAT = baseline living without exercise. Activity level now captures
  // non-exercise activity (job, walking, fidgeting). Exercise is tracked
  // separately and added dynamically via calcDynamicTarget().
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
  const dailyTarget = Math.max(tdee + GOAL_OFFSETS[goalType], 1200);

  return { bmr: Math.round(bmr), tdee, dailyTarget };
}

/**
 * Compute the effective daily calorie target including today's exercise.
 * Exercise calories already discounted in calcStrengthCalories/calcCardioCalories.
 */
export function calcDynamicTarget(
  baseTarget: number,
  exerciseCalories: number,
): { effectiveTarget: number; exerciseCals: number } {
  return {
    effectiveTarget: baseTarget + exerciseCalories,
    exerciseCals: exerciseCalories,
  };
}

export function buildProfile(
  height: number,
  weight: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  goalType: GoalType = 'lose',
): UserProfile {
  const { tdee, dailyTarget } = calculateTDEE(height, weight, age, gender, activityLevel, goalType);
  return { height, weight, age, gender, activityLevel, tdee, dailyTarget, goalType };
}
