import { VisionFoodItem, FoodItem, FoodCategory, CookingMethod } from './types';
import foodDb from './food-db.json';
import ratios from './ratios.json';
import beverageDb from './beverage-db.json';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface NutritionData {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

function findFood(name: string): NutritionData | null {
  const normalized = name.trim();
  const db = foodDb as Record<string, NutritionData>;
  // Exact match first
  if (db[normalized]) return db[normalized];
  // Then longest key contained in name (prefer longer matches to avoid "鸡" matching "鸡蛋")
  const keys = Object.keys(db).sort((a, b) => b.length - a.length);
  const key = keys.find((k) => normalized.includes(k));
  if (!key) return null;
  return db[key];
}

function calcDish(vf: VisionFoodItem): NutritionData {
  const food = findFood(vf.name);
  if (!food) return fallbackEstimate(vf);

  const method = vf.cookingMethod ?? 'stir-fry';
  const ratio = (ratios as Record<string, typeof ratios['stir-fry']>)[method] ?? ratios['stir-fry'];

  const rawWeight = vf.weight / ratio.rawToCookedRatio;

  const protein = rawWeight * (food.protein / 100) * ratio.correctionFactor;
  const carbs = rawWeight * (food.carbs / 100) * ratio.correctionFactor;
  const baseFat = rawWeight * (food.fat / 100) * ratio.correctionFactor;
  const oilFat = vf.estimatedOil * ratio.oilAbsorption;
  const fat = baseFat + oilFat;

  const calories = protein * 4 + carbs * 4 + fat * 9;

  return {
    protein: Math.round(protein) || 0,
    carbs: Math.round(carbs) || 0,
    fat: Math.round(fat) || 0,
    calories: Math.round(calories) || 0,
  };
}

function calcIngredient(vf: VisionFoodItem): NutritionData {
  const food = findFood(vf.name);
  if (!food) return fallbackEstimate(vf);

  return {
    protein: Math.round(food.protein * vf.weight / 100) || 0,
    carbs: Math.round(food.carbs * vf.weight / 100) || 0,
    fat: Math.round(food.fat * vf.weight / 100) || 0,
    calories: Math.round(food.calories * vf.weight / 100) || 0,
  };
}

function calcBeverage(vf: VisionFoodItem): NutritionData {
  if (!vf.components || !vf.size) return fallbackEstimate(vf);

  const multiplier = beverageDb.sizeMultiplier[vf.size] ?? 1.0;
  let total: NutritionData = { protein: 0, carbs: 0, fat: 0, calories: 0 };

  for (const comp of vf.components) {
    const entry =
      beverageDb.base[comp as keyof typeof beverageDb.base] ??
      beverageDb.milk[comp as keyof typeof beverageDb.milk] ??
      beverageDb.sweetener[comp as keyof typeof beverageDb.sweetener] ??
      beverageDb.topping[comp as keyof typeof beverageDb.topping];

    if (entry) {
      total.protein += entry.protein;
      total.carbs += entry.carbs;
      total.fat += entry.fat;
      total.calories += entry.calories;
    }
  }

  total = {
    protein: Math.round(total.protein * multiplier) || 0,
    carbs: Math.round(total.carbs * multiplier) || 0,
    fat: Math.round(total.fat * multiplier) || 0,
    calories: Math.round(total.calories * multiplier) || 0,
  };

  return total;
}

function calcPackaged(vf: VisionFoodItem): NutritionData {
  if (!vf.nutritionLabel) return fallbackEstimate(vf);

  const label = vf.nutritionLabel;
  const ratio = label.servingSize > 0 ? vf.weight / label.servingSize : 1;

  return {
    protein: Math.round(label.protein * ratio) || 0,
    carbs: Math.round(label.carbs * ratio) || 0,
    fat: Math.round(label.fat * ratio) || 0,
    calories: Math.round(label.calories * ratio) || 0,
  };
}

function fallbackEstimate(vf: VisionFoodItem): NutritionData {
  return {
    protein: Math.round(vf.weight * 0.12) || 0,
    carbs: Math.round(vf.weight * 0.15) || 0,
    fat: Math.round(vf.weight * 0.08) || 0,
    calories: Math.round(vf.weight * 1.8) || 0,
  };
}

export function visionToFoodItems(visionFoods: VisionFoodItem[]): FoodItem[] {
  return visionFoods.map((vf) => {
    // 防御 AI 模型返回缺失字段导致 NaN
    const weight = typeof vf.weight === 'number' && vf.weight > 0 ? vf.weight : 100;
    const estimatedOil = typeof vf.estimatedOil === 'number' ? vf.estimatedOil : 0;
    const safeVf = { ...vf, weight, estimatedOil };

    let nutrition: NutritionData;

    switch (safeVf.category) {
      case 'ingredient':
        nutrition = calcIngredient(safeVf);
        break;
      case 'beverage':
        nutrition = calcBeverage(safeVf);
        break;
      case 'packaged':
        nutrition = calcPackaged(safeVf);
        break;
      default:
        nutrition = calcDish(safeVf);
    }

    return {
      id: generateId(),
      name: safeVf.name,
      weight: safeVf.weight,
      caloriesMin: Math.round((nutrition.calories || 0) * 0.85),
      caloriesMax: Math.round((nutrition.calories || 0) * 1.15),
      protein: nutrition.protein || 0,
      carbs: nutrition.carbs || 0,
      fat: nutrition.fat || 0,
    };
  });
}
