export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Gender = 'male' | 'female';
export type ActivityLevel = 1 | 2 | 3 | 4 | 5;

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  1: '久坐（几乎不运动）',
  2: '轻度（每周 1-3 天）',
  3: '中度（每周 3-5 天）',
  4: '重度（每周 6-7 天）',
  5: '极重度（高强度体力劳动）',
};

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

export interface FoodItem {
  id: string;
  name: string;
  weight: number;
  caloriesMin: number;
  caloriesMax: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealRecord {
  id: string;
  date: string;
  mealType: MealType;
  createdAt: string;
  foods: FoodItem[];
  totalCaloriesMin: number;
  totalCaloriesMax: number;
}

export interface UserProfile {
  height: number;
  weight: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  tdee: number;
  dailyTarget: number;
}

export interface AppState {
  profile: UserProfile | null;
  meals: MealRecord[];
}
