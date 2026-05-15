export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Gender = 'male' | 'female';
export type ActivityLevel = 1 | 2 | 3 | 4 | 5;
export type FoodCategory = 'dish' | 'ingredient' | 'beverage' | 'packaged';
export type CookingMethod = 'steam' | 'boil' | 'stir-fry' | 'deep-fry' | 'roast' | 'braise' | 'cold' | 'raw';

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

export const COOKING_LABELS: Record<CookingMethod, string> = {
  'steam': '蒸',
  'boil': '煮',
  'stir-fry': '炒',
  'deep-fry': '炸',
  'roast': '烤',
  'braise': '炖/红烧',
  'cold': '凉拌',
  'raw': '生食',
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

// Qwen VL returns raw food descriptions
export interface VisionFoodItem {
  name: string;
  weight: number;
  category: FoodCategory;
  cookingMethod: CookingMethod | null;
  estimatedOil: number;
  size: 'small' | 'medium' | 'large' | null;
  components: string[] | null;
  nutritionLabel: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize: number;
  } | null;
}

// API response
export interface VisionResult {
  foods: VisionFoodItem[];
}
