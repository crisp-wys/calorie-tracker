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
  const key = Object.keys(foodDb).find(
    (k) => name.includes(k) || k.includes(name)
  );
  if (!key) return null;
  return (foodDb as Record<string, NutritionData>)[key];
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
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    calories: Math.round(calories),
  };
}

function calcIngredient(vf: VisionFoodItem): NutritionData {
  const food = findFood(vf.name);
  if (!food) return fallbackEstimate(vf);

  return {
    protein: Math.round(food.protein * vf.weight / 100),
    carbs: Math.round(food.carbs * vf.weight / 100),
    fat: Math.round(food.fat * vf.weight / 100),
    calories: Math.round(food.calories * vf.weight / 100),
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
    protein: Math.round(total.protein * multiplier),
    carbs: Math.round(total.carbs * multiplier),
    fat: Math.round(total.fat * multiplier),
    calories: Math.round(total.calories * multiplier),
  };

  return total;
}

function calcPackaged(vf: VisionFoodItem): NutritionData {
  if (!vf.nutritionLabel) return fallbackEstimate(vf);

  const label = vf.nutritionLabel;
  const weight = vf.weight > 0 ? vf.weight / label.servingSize : 1;

  return {
    protein: Math.round(label.protein * weight),
    carbs: Math.round(label.carbs * weight),
    fat: Math.round(label.fat * weight),
    calories: Math.round(label.calories * weight),
  };
}

function fallbackEstimate(vf: VisionFoodItem): NutritionData {
  return {
    protein: Math.round(vf.weight * 0.12),
    carbs: Math.round(vf.weight * 0.15),
    fat: Math.round(vf.weight * 0.08),
    calories: Math.round(vf.weight * 1.8),
  };
}

export function visionToFoodItems(visionFoods: VisionFoodItem[]): FoodItem[] {
  return visionFoods.map((vf) => {
    let nutrition: NutritionData;

    switch (vf.category) {
      case 'ingredient':
        nutrition = calcIngredient(vf);
        break;
      case 'beverage':
        nutrition = calcBeverage(vf);
        break;
      case 'packaged':
        nutrition = calcPackaged(vf);
        break;
      default:
        nutrition = calcDish(vf);
    }

    return {
      id: generateId(),
      name: vf.name,
      weight: vf.weight,
      caloriesMin: Math.round(nutrition.calories * 0.85),
      caloriesMax: Math.round(nutrition.calories * 1.15),
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
    };
  });
}
