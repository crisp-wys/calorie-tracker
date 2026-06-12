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

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

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
  /** Preserved from AI recognition — used when recalculating after user edits */
  cookingMethod?: CookingMethod | null;
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
  goalType: 'lose' | 'maintain' | 'gain';
}

export interface AppState {
  profile: UserProfile | null;
  meals: MealRecord[];
  workouts: WorkoutRecord[];
}

export interface WorkoutRecord {
  id: string;
  date: string;        // YYYY-MM-DD
  bodyPart: string;    // '胸' | '背' | '肩' | '手臂' | '腿' | '核心' | '有氧'
  exercise: string;    // 动作名
  sets: number;        // 组数（有氧填 0）
  reps: number;        // 次数（有氧填 0）
  weight: number;      // 重量kg（自重/有氧填 0）
  duration: number;    // 分钟，力量自动估算，有氧手动填
  calories: number;    // 估算消耗（已打8折）
  createdAt: string;
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
  /** 复合菜品的食材拆解，如"番茄炒蛋" → ["番茄", "鸡蛋"]，便于本地数据库查表计算 */
  ingredients: string[] | null;
  /** 份量估算依据描述，如"参照拳头大小，米饭约1.5份≈225g" */
  portionBasis?: string | null;
  /** AI 对重量估算的置信度：high=有明确参照物, medium=部分参照, low=无参照 */
  weightConfidence?: 'high' | 'medium' | 'low' | null;
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

// ── AI 对话 ──

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export type Personality = 'encouraging' | 'strict' | 'custom';

export interface AIConfig {
  name: string;
  personality: Personality;
  customPrompt: string;
  avatar: string;
}

export interface MemoryInsight {
  id: string;
  type: 'pattern' | 'trend' | 'warning';
  text: string;
  createdAt: string;
}

export interface UserMemory {
  aiConfig: AIConfig;
  insights: MemoryInsight[];
  preferences: string[];
  milestones: { date: string; event: string }[];
  lastSummaryDate: string | null;
}

// ── 智能预警 ──

export type AlertType = 'calorie_over' | 'calorie_under' | 'macro_imbalance' | 'dinner_heavy' | 'meal_spike';

export interface Alert {
  type: AlertType;
  title: string;
  message: string;
  suggestion: string;
  color: 'yellow' | 'blue' | 'purple';
  emoji: string;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  name: 'AI 教练',
  personality: 'encouraging',
  customPrompt: '',
  avatar: 'robot',
};
