import { VisionFoodItem, FoodItem, FoodCategory, CookingMethod } from './types';
import { generateId } from './utils';
import foodDb from './food-db.json';
import ratios from './ratios.json';
import beverageDb from './beverage-db.json';

interface NutritionData {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

// ── Fuzzy matching ──────────────────────────────────────────────

const COOKING_PREFIXES = [
  '红烧', '清蒸', '水煮', '干煸', '糖醋', '宫保', '鱼香', '麻辣',
  '香辣', '酸辣', '蒜蓉', '葱爆', '酱爆', '蒜香', '椒盐', '孜然',
  '铁板', '砂锅', '干锅', '凉拌', '白灼', '上汤', '高汤', '家常',
  '爆炒', '小炒', '滑炒', '油焖', '醋溜', '拔丝', '蜜汁', '照烧',
  '卤', '熏', '腌', '风干',
];

const COOKING_SUFFIXES = [
  '汤', '羹', '煲', '锅', '串', '烧', '烤',
  '丝', '片', '丁', '块', '末', '泥', '饼', '丸', '卷', '包',
];

// ── Fallback density by category + cooking method ─────────────────

const FALLBACK_DENSITY: Record<string, { calPerGram: number; proteinPct: number; carbsPct: number; fatPct: number }> = {
  'dish|stir-fry': { calPerGram: 2.0, proteinPct: 0.15, carbsPct: 0.20, fatPct: 0.65 },
  'dish|deep-fry': { calPerGram: 2.8, proteinPct: 0.10, carbsPct: 0.20, fatPct: 0.70 },
  'dish|steam':    { calPerGram: 1.3, proteinPct: 0.30, carbsPct: 0.30, fatPct: 0.40 },
  'dish|braise':   { calPerGram: 1.8, proteinPct: 0.18, carbsPct: 0.22, fatPct: 0.60 },
  'dish|boil':     { calPerGram: 1.2, proteinPct: 0.25, carbsPct: 0.35, fatPct: 0.40 },
  'dish|roast':    { calPerGram: 2.2, proteinPct: 0.20, carbsPct: 0.15, fatPct: 0.65 },
  'dish|cold':     { calPerGram: 1.1, proteinPct: 0.25, carbsPct: 0.40, fatPct: 0.35 },
  'dish|raw':      { calPerGram: 0.8, proteinPct: 0.20, carbsPct: 0.50, fatPct: 0.30 },
  'ingredient':    { calPerGram: 1.5, proteinPct: 0.20, carbsPct: 0.30, fatPct: 0.50 },
  'beverage':      { calPerGram: 0.4, proteinPct: 0.05, carbsPct: 0.80, fatPct: 0.15 },
  'packaged':      { calPerGram: 3.5, proteinPct: 0.08, carbsPct: 0.55, fatPct: 0.37 },
};

// ── Ingredient ratios for common compound dishes ──────────────────

const DISH_RATIOS: Record<string, Record<string, number>> = {
  '番茄炒蛋':   { '番茄': 0.55, '鸡蛋': 0.45 },
  '青椒肉丝':   { '青椒': 0.35, '猪瘦肉': 0.65 },
  '宫保鸡丁':   { '鸡肉': 0.50, '花生': 0.20, '黄瓜': 0.15, '胡萝卜': 0.15 },
  '鱼香肉丝':   { '猪瘦肉': 0.50, '木耳': 0.20, '胡萝卜': 0.15, '青椒': 0.15 },
  '麻婆豆腐':   { '豆腐': 0.70, '猪肉': 0.30 },
  '西兰花炒虾仁': { '西兰花': 0.45, '虾仁': 0.55 },
  '红烧排骨':   { '猪排骨': 0.80, '土豆': 0.20 },
  '红烧牛肉':   { '牛肉': 0.70, '土豆': 0.15, '胡萝卜': 0.15 },
  '回锅肉':     { '猪肉': 0.55, '青椒': 0.25, '洋葱': 0.20 },
  '地三鲜':     { '土豆': 0.35, '茄子': 0.35, '青椒': 0.30 },
  '木须肉':     { '猪肉': 0.40, '鸡蛋': 0.30, '木耳': 0.20, '黄瓜': 0.10 },
  '酸辣土豆丝': { '土豆': 0.90, '青椒': 0.10 },
  '韭黄炒蛋':   { '鸡蛋': 0.60, '韭黄': 0.40 },
  '蒜蓉西兰花': { '西兰花': 0.95, '大蒜': 0.05 },
  '家常豆腐':   { '豆腐': 0.65, '猪肉': 0.25, '青椒': 0.10 },
  '干煸豆角':   { '豆角': 0.85, '猪肉': 0.15 },
  '红烧肉':     { '猪肉': 0.85, '土豆': 0.15 },
  '糖醋里脊':   { '猪瘦肉': 0.75, '青椒': 0.15, '洋葱': 0.10 },
  '辣子鸡':     { '鸡腿肉': 0.70, '花生': 0.20, '青椒': 0.05 },
  '水煮鱼':     { '鱼肉': 0.55, '豆芽': 0.25, '白菜': 0.20 },
  '蒜蓉菠菜':   { '菠菜': 0.95, '大蒜': 0.05 },
  '葱花蛋':     { '鸡蛋': 0.70, '洋葱': 0.30 },
  '金针菇炒蛋': { '鸡蛋': 0.55, '金针菇': 0.45 },
  '蒜蓉生菜':   { '生菜': 0.95, '大蒜': 0.05 },
  '韭菜炒蛋':   { '鸡蛋': 0.55, '韭菜': 0.45 },
  '红烧鸡块':   { '鸡肉': 0.75, '土豆': 0.25 },
  '糖醋排骨':   { '猪排骨': 0.85, '青椒': 0.10, '洋葱': 0.05 },
  '土豆炖牛肉': { '牛肉': 0.55, '土豆': 0.45 },
  '香菇青菜':   { '白菜': 0.50, '香菇': 0.50 },
};

// ── Default oil amounts & sanitization ─────────────────────────────

const DEFAULT_OIL_GRAMS: Record<string, number> = {
  steam: 0, boil: 0, raw: 0,
  'stir-fry': 10, braise: 10, roast: 8, 'deep-fry': 35, cold: 3,
};

const OIL_MAX: Record<string, number> = {
  steam: 5, boil: 5, raw: 2,
  'stir-fry': 50, braise: 30, roast: 25, 'deep-fry': 80, cold: 15,
};

/** Validate AI oil estimate; return a reasonable value if the AI estimate looks wrong */
function sanitizeOil(estimatedOil: number, cookingMethod: string | null): number {
  const method = cookingMethod ?? 'stir-fry';
  const max = OIL_MAX[method] ?? 50;
  const defaultOil = DEFAULT_OIL_GRAMS[method] ?? 10;
  if (estimatedOil <= 0 && defaultOil > 0) return defaultOil;
  if (estimatedOil > max) return max;
  return estimatedOil;
}

// Separator words used to split compound dish names into ingredients
const DISH_SEPARATORS = [
  '炒', '烧', '炖', '煮', '蒸', '拌', '烩', '熘',
  '焖', '煎', '炸', '烤', '爆', '焗', '煸', '扒',
  '涮', '汆', '滚', '烫', '炝', '卤', '酱',
];

// Normalize aliases to DB keys
const NAME_ALIASES: Record<string, string> = {
  '番茄': '番茄',
  '西红柿': '番茄',
  '马铃薯': '土豆',
  '洋芋': '土豆',
  '番薯': '红薯',
  '地瓜': '红薯',
  '甘薯': '红薯',
  '鸡蛋': '鸡蛋',
  '鸡子': '鸡蛋',
  '猪肉': '猪肉',
  '猪瘦肉': '猪瘦肉',
  '瘦肉': '猪瘦肉',
  '猪排': '猪排骨',
  '排骨': '猪排骨',
  '牛肉': '牛肉',
  '牛腱': '牛腱子',
  '虾仁': '虾仁',
  '虾肉': '虾仁',
  '鱼': '鱼肉',
  '鱼片': '鱼肉',
  '西兰花': '西兰花',
  '花椰菜': '西兰花',
  '青菜': '白菜',
  '小白菜': '白菜',
  '大白菜': '白菜',
  '包菜': '白菜',
  '圆白菜': '白菜',
  '大豆': '黄豆',
  '豆浆': '牛奶',
  '芝士': '芝士',
  '奶酪': '芝士',
  '豆腐干': '豆干',
  '豆干': '豆干',
  '油豆腐': '豆腐',
  '嫩豆腐': '豆腐',
  '老豆腐': '豆腐',
  '豆腐皮': '豆皮',
  '千张': '千张',
  '百叶': '千张',
  '腐竹': '腐竹',
  '豆芽': '豆芽',
  '芽菜': '豆芽',
  '海带': '海带',
  '昆布': '海带',
  '木耳': '木耳',
  '黑木耳': '木耳',
  '白木耳': '银耳',
  '银耳': '银耳',
  '金针菇': '金针菇',
  '香菇': '香菇',
  '冬菇': '香菇',
  '蘑菇': '蘑菇',
  '口蘑': '蘑菇',
  '鸡腿': '鸡腿肉',
  '鸡翅中': '鸡翅',
  '鸡翅根': '鸡翅',
  '鸡爪': '鸡爪',
  '凤爪': '鸡爪',
  '猪脚': '猪蹄',
  '猪手': '猪蹄',
  '牛百叶': '牛肚',
  '毛肚': '牛肚',
  '三文鱼': '三文鱼',
  '三文鱼肉': '三文鱼',
  '鲑鱼': '三文鱼',
  '米饭': '米饭',
  '饭': '米饭',
  '白米饭': '米饭',
  '米': '米饭',
  '面': '面条',
  '面条': '面条',
  '拉面': '面条',
  '挂面': '面条',
  '方便面': '面条',
  '螺丝粉': '米粉',
  '螺蛳粉': '米粉',
  '过桥米线': '米粉',
  '米线': '米粉',
  '米粉': '米粉',
  '通心粉': '米粉',
  '意面': '面条',
  '意大利面': '面条',
  '馒头': '馒头',
  '包子': '包子',
  '小笼包': '包子',
  '面包': '面包',
  '土司': '面包',
  '吐司': '面包',
  '全麦': '全麦面包',
  '饺子': '饺子',
  '水饺': '饺子',
  '馄饨': '馄饨',
  '云吞': '馄饨',
  '抄手': '馄饨',
  '春卷': '烧卖',
  '烧卖': '烧卖',
  '烧麦': '烧卖',
  '汤圆': '汤圆',
  '元宵': '汤圆',
  '粽子': '粽子',
  '年糕': '年糕',
  '糍粑': '年糕',
  '油条': '油条',
};

// Pre-computed for performance
const DISH_SEP_REGEX = new RegExp(DISH_SEPARATORS.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
const SORTED_DB_KEYS = Object.keys(foodDb as Record<string, NutritionData>).sort((a, b) => b.length - a.length);

export function findFood(name: string): NutritionData | null {
  const normalized = name.trim();
  const db = foodDb as Record<string, NutritionData>;

  // 1. Exact match
  if (db[normalized]) return db[normalized];

  // 2. Alias resolution
  const aliased = NAME_ALIASES[normalized];
  if (aliased && db[aliased]) return db[aliased];

  // 3. Strip cooking prefix and try exact match on remainder
  for (const prefix of COOKING_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      const stripped = normalized.slice(prefix.length);
      if (stripped.length > 0 && db[stripped]) return db[stripped];
      const strippedAlias = NAME_ALIASES[stripped];
      if (strippedAlias && db[strippedAlias]) return db[strippedAlias];
      break;
    }
  }

  // 4. Strip cooking suffix
  for (const suffix of COOKING_SUFFIXES) {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length) {
      const stripped = normalized.slice(0, -suffix.length);
      if (stripped.length > 0 && db[stripped]) return db[stripped];
    }
  }

  // 5. Longest substring match (prefer longer keys — uses pre-sorted keys)
  const key = SORTED_DB_KEYS.find((k) => normalized.includes(k));
  if (key) return db[key];

  return null;
}

export interface FuzzyResult {
  food: NutritionData | null;
  matchedName: string;
  matched: boolean;
}

/**
 * Full fuzzy matching pipeline for food names.
 * Returns the best match and whether it was found in DB.
 */
export function fuzzyFindFood(name: string): FuzzyResult {
  const normalized = name.trim();
  if (!normalized) return { food: null, matchedName: normalized, matched: false };

  const direct = findFood(normalized);
  if (direct) return { food: direct, matchedName: normalized, matched: true };

  // Try stripping prefix + suffix combos
  for (const prefix of COOKING_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      let stripped = normalized.slice(prefix.length);
      for (const suffix of COOKING_SUFFIXES) {
        if (stripped.endsWith(suffix) && stripped.length > suffix.length) {
          const double = stripped.slice(0, -suffix.length);
          const db = foodDb as Record<string, NutritionData>;
          if (db[double]) return { food: db[double], matchedName: double, matched: true };
        }
      }
      // Try just prefix-stripped with alias
      const aliased = NAME_ALIASES[stripped];
      if (aliased) {
        const db = foodDb as Record<string, NutritionData>;
        if (db[aliased]) return { food: db[aliased], matchedName: aliased, matched: true };
      }
      break;
    }
  }

  return { food: null, matchedName: normalized, matched: false };
}

/**
 * Decompose a compound dish name into individual ingredient names.
 * E.g. "番茄炒鸡蛋" → ["番茄", "鸡蛋"]
 *      "青椒肉丝" → ["青椒", "猪肉"]
 */
export function decomposeDish(name: string): string[] {
  const normalized = name.trim();
  if (!normalized) return [];

  const db = foodDb as Record<string, NutritionData>;

  // Strip leading cooking prefix first
  let stripped = normalized;
  for (const prefix of COOKING_PREFIXES) {
    if (stripped.startsWith(prefix)) {
      const s = stripped.slice(prefix.length);
      if (s.length >= 2) stripped = s;
      break;
    }
  }

  // Split on separator characters in one regex pass (pre-compiled)
  const rawParts = stripped.split(DISH_SEP_REGEX);

  // Strip cooking suffixes from each part
  const parts = rawParts
    .map((p) => {
      let s = p.trim();
      for (const suffix of COOKING_SUFFIXES) {
        if (s.endsWith(suffix) && s.length > suffix.length) {
          s = s.slice(0, -suffix.length);
        }
      }
      return s.trim();
    })
    .filter((p) => p.length > 0);

  // Resolve each part via alias, then keep only those that exist in DB
  const resolved = parts
    .map((p) => NAME_ALIASES[p] || p)
    .filter((p) => p.length >= 1);

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const r of resolved) {
    if (!seen.has(r)) {
      seen.add(r);
      unique.push(r);
    }
  }

  // Try matching each part in DB — prefer those that match
  const dbMatches = unique.filter((p) => db[p]);
  if (dbMatches.length >= 2) return dbMatches;

  // Fall back to substring matching if no direct matches
  if (dbMatches.length === 0 && unique.length >= 2) {
    const subMatches = unique.filter((p) => findFood(p) !== null);
    if (subMatches.length >= 2) return subMatches;
  }

  return dbMatches.length > 0 ? dbMatches : unique;
}

// ── Nutrition calculators ─────────────────────────────────────────

function calcDish(vf: VisionFoodItem): { nutrition: NutritionData; fromDB: boolean } {
  const food = findFood(vf.name);
  if (!food) return { nutrition: fallbackEstimate(vf), fromDB: false };

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
    nutrition: {
      protein: Math.round(protein) || 0,
      carbs: Math.round(carbs) || 0,
      fat: Math.round(fat) || 0,
      calories: Math.round(calories) || 0,
    },
    fromDB: true,
  };
}

function calcIngredient(vf: VisionFoodItem): { nutrition: NutritionData; fromDB: boolean } {
  const food = findFood(vf.name);
  if (!food) return { nutrition: fallbackEstimate(vf), fromDB: false };

  return {
    nutrition: {
      protein: Math.round(food.protein * vf.weight / 100) || 0,
      carbs: Math.round(food.carbs * vf.weight / 100) || 0,
      fat: Math.round(food.fat * vf.weight / 100) || 0,
      calories: Math.round(food.calories * vf.weight / 100) || 0,
    },
    fromDB: true,
  };
}

function calcBeverage(vf: VisionFoodItem): { nutrition: NutritionData; fromDB: boolean } {
  if (!vf.components || !vf.size) return { nutrition: fallbackEstimate(vf), fromDB: false };

  const multiplier = beverageDb.sizeMultiplier[vf.size] ?? 1.0;
  let total: NutritionData = { protein: 0, carbs: 0, fat: 0, calories: 0 };
  let foundAny = false;

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
      foundAny = true;
    }
  }

  if (!foundAny) return { nutrition: fallbackEstimate(vf), fromDB: false };

  return {
    nutrition: {
      protein: Math.round(total.protein * multiplier) || 0,
      carbs: Math.round(total.carbs * multiplier) || 0,
      fat: Math.round(total.fat * multiplier) || 0,
      calories: Math.round(total.calories * multiplier) || 0,
    },
    fromDB: true,
  };
}

function calcPackaged(vf: VisionFoodItem): { nutrition: NutritionData; fromDB: boolean } {
  if (!vf.nutritionLabel) return { nutrition: fallbackEstimate(vf), fromDB: false };

  const label = vf.nutritionLabel;
  const ratio = label.servingSize > 0 ? vf.weight / label.servingSize : 1;

  return {
    nutrition: {
      protein: Math.round(label.protein * ratio) || 0,
      carbs: Math.round(label.carbs * ratio) || 0,
      fat: Math.round(label.fat * ratio) || 0,
      calories: Math.round(label.calories * ratio) || 0,
    },
    fromDB: true,
  };
}

/**
 * Try to find a known ingredient ratio for a dish name.
 * Returns the ratio map keyed by ingredient name, or null.
 */
function findDishRatio(dishName: string): Record<string, number> | null {
  for (const key of Object.keys(DISH_RATIOS)) {
    if (dishName.includes(key)) return DISH_RATIOS[key];
  }
  return null;
}

/**
 * Calculate nutrition by decomposing dish into ingredients.
 * Used when AI provides ingredients list for compound dishes.
 */
function calcFromIngredients(vf: VisionFoodItem): { nutrition: NutritionData; fromDB: boolean } {
  const ingredients = vf.ingredients;
  if (!ingredients || ingredients.length === 0) {
    return { nutrition: fallbackEstimate(vf), fromDB: false };
  }

  // Try to find known ratios for this dish; fall back to equal distribution
  const ratio = findDishRatio(vf.name.trim());
  const db = foodDb as Record<string, NutritionData>;

  let total: NutritionData = { protein: 0, carbs: 0, fat: 0, calories: 0 };
  let foundCount = 0;

  for (const ing of ingredients) {
    const food = db[ing] || findFood(ing);
    if (food) {
      const ingWeight = ratio?.[ing]
        ? vf.weight * ratio[ing]
        : vf.weight / ingredients.length;
      total.protein += food.protein * ingWeight / 100;
      total.carbs += food.carbs * ingWeight / 100;
      total.fat += food.fat * ingWeight / 100;
      total.calories += food.calories * ingWeight / 100;
      foundCount++;
    }
  }

  if (foundCount === 0) return { nutrition: fallbackEstimate(vf), fromDB: false };

  // Add oil contribution
  const method = vf.cookingMethod ?? 'stir-fry';
  const ratioData = (ratios as Record<string, typeof ratios['stir-fry']>)[method] ?? ratios['stir-fry'];
  const oilFat = vf.estimatedOil * ratioData.oilAbsorption;
  total.fat += oilFat;
  total.calories += oilFat * 9;

  return {
    nutrition: {
      protein: Math.round(total.protein) || 0,
      carbs: Math.round(total.carbs) || 0,
      fat: Math.round(total.fat) || 0,
      calories: Math.round(total.calories) || 0,
    },
    fromDB: true,
  };
}

function fallbackEstimate(vf: VisionFoodItem): NutritionData {
  const key = vf.category === 'dish'
    ? `dish|${vf.cookingMethod ?? 'stir-fry'}`
    : vf.category;
  const density = FALLBACK_DENSITY[key] ?? FALLBACK_DENSITY['ingredient'];

  const totalCal = vf.weight * density.calPerGram;
  const protein = (totalCal * density.proteinPct) / 4;
  const carbs = (totalCal * density.carbsPct) / 4;
  const fat = (totalCal * density.fatPct) / 9;

  return {
    protein: Math.round(protein) || 0,
    carbs: Math.round(carbs) || 0,
    fat: Math.round(fat) || 0,
    calories: Math.round(totalCal) || Math.round(vf.weight * 1.8),
  };
}

// ── Main conversion ───────────────────────────────────────────────

export function visionToFoodItems(visionFoods: VisionFoodItem[]): FoodItem[] {
  return visionFoods.map((vf) => {
    // Defend against missing/invalid AI data
    const weight = typeof vf.weight === 'number' && vf.weight > 0 ? vf.weight : 100;
    const rawOil = typeof vf.estimatedOil === 'number' ? vf.estimatedOil : 0;
    const estimatedOil = sanitizeOil(rawOil, vf.cookingMethod);
    const safeVf = { ...vf, weight, estimatedOil };

    let nutrition: NutritionData;
    let fromDB: boolean;

    // If AI provided ingredients, try ingredient-based calculation first
    if (safeVf.ingredients && safeVf.ingredients.length >= 2) {
      const result = calcFromIngredients(safeVf);
      nutrition = result.nutrition;
      fromDB = result.fromDB;
    } else {
      switch (safeVf.category) {
        case 'ingredient': {
          const r = calcIngredient(safeVf);
          nutrition = r.nutrition;
          fromDB = r.fromDB;
          break;
        }
        case 'beverage': {
          const r = calcBeverage(safeVf);
          nutrition = r.nutrition;
          fromDB = r.fromDB;
          break;
        }
        case 'packaged': {
          const r = calcPackaged(safeVf);
          nutrition = r.nutrition;
          fromDB = r.fromDB;
          break;
        }
        default: {
          const r = calcDish(safeVf);
          nutrition = r.nutrition;
          fromDB = r.fromDB;

          // If dish not found in DB, try decomposing the name
          if (!fromDB) {
            const ingredients = decomposeDish(safeVf.name);
            if (ingredients.length >= 2) {
              const ingResult = calcFromIngredients({ ...safeVf, ingredients });
              if (ingResult.fromDB) {
                nutrition = ingResult.nutrition;
                fromDB = true;
              }
            }
          }
          break;
        }
      }
    }

    // Dynamic uncertainty: combines DB match quality and weight confidence
    const dbUncertainty = fromDB ? 0.10 : 0.30;
    const weightConf = safeVf.weightConfidence ?? 'medium';
    const weightUncertainty =
      weightConf === 'high' ? 0.15 : weightConf === 'low' ? 0.40 : 0.25;
    const uncertainty = Math.max(dbUncertainty, weightUncertainty);

    return {
      id: generateId(),
      name: safeVf.name,
      weight: safeVf.weight,
      caloriesMin: Math.round((nutrition.calories || 0) * (1 - uncertainty)),
      caloriesMax: Math.round((nutrition.calories || 0) * (1 + uncertainty)),
      protein: nutrition.protein || 0,
      carbs: nutrition.carbs || 0,
      fat: nutrition.fat || 0,
    };
  });
}

// ── Recalculate by name (for manual rename) ───────────────────────

/**
 * Recalculate nutrition for a food item when the user manually changes its name.
 * Tries to match the new name in the database and recalculate.
 * Returns updated nutrition fields (without id/name/weight — caller merges).
 */
export function recalculateByName(
  name: string,
  weight: number,
  category?: FoodCategory,
  estimatedOil?: number,
): { nutrition: NutritionData; fromDB: boolean } {
  const safeWeight = weight > 0 ? weight : 100;
  const safeOil = estimatedOil ?? 0;

  // Create a temporary VisionFoodItem for recalculation
  const temp: VisionFoodItem = {
    name,
    weight: safeWeight,
    category: category || 'dish',
    cookingMethod: 'stir-fry',
    estimatedOil: safeOil,
    size: null,
    components: null,
    ingredients: null,
    nutritionLabel: null,
  };

  // Try direct find first
  const food = findFood(name);
  if (food) {
    if (category === 'ingredient') {
      return {
        nutrition: {
          protein: Math.round(food.protein * safeWeight / 100) || 0,
          carbs: Math.round(food.carbs * safeWeight / 100) || 0,
          fat: Math.round(food.fat * safeWeight / 100) || 0,
          calories: Math.round(food.calories * safeWeight / 100) || 0,
        },
        fromDB: true,
      };
    }
    // Treat as dish
    const result = calcDish(temp);
    return { nutrition: result.nutrition, fromDB: true };
  }

  // Try decomposing the name
  const ingredients = decomposeDish(name);
  if (ingredients.length >= 2) {
    const result = calcFromIngredients({ ...temp, ingredients });
    if (result.fromDB) {
      return { nutrition: result.nutrition, fromDB: true };
    }
  }

  // Fallback
  const fb = fallbackEstimate(temp);
  return { nutrition: fb, fromDB: false };
}

/**
 * Get all known food names from the database (for AI prompts).
 */
export function getKnownFoodNames(): string[] {
  return Object.keys(foodDb as Record<string, NutritionData>);
}
