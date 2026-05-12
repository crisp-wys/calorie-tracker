import { Gender, ActivityLevel, UserProfile } from './types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  1: 1.2,
  2: 1.375,
  3: 1.55,
  4: 1.725,
  5: 1.9,
};

export function calculateTDEE(
  height: number,
  weight: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel
): { bmr: number; tdee: number; dailyTarget: number } {
  // Mifflin-St Jeor
  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
  const dailyTarget = tdee - 500;

  return { bmr: Math.round(bmr), tdee, dailyTarget };
}

export function buildProfile(
  height: number,
  weight: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel
): UserProfile {
  const { tdee, dailyTarget } = calculateTDEE(height, weight, age, gender, activityLevel);
  return { height, weight, age, gender, activityLevel, tdee, dailyTarget };
}
