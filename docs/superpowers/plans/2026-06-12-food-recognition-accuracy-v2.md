# Food Recognition Accuracy v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce image food recognition calorie error from ~25% average to ~15% via category-based fallback densities, ingredient ratio dictionary, default oil values, portion reference system in vision prompt, and dynamic uncertainty bands.

**Architecture:** Three files — `lib/types.ts` gets 2 new optional fields on `VisionFoodItem`; `lib/nutrition.ts` gets 3 new config constants + logic updates to `fallbackEstimate()`, `calcFromIngredients()`, and `visionToFoodItems()`; `functions/api/vision.js` gets a rewritten SYSTEM_PROMPT with structured portion estimation references.

**Tech Stack:** TypeScript + Node.js (Next.js Functions), Qwen VL Max API, no new dependencies

---

### Task 1: Add `portionBasis` and `weightConfidence` to VisionFoodItem type

**Files:**
- Modify: `lib/types.ts:71-88` (VisionFoodItem interface)

- [ ] **Step 1: Add the two new optional fields**

Open `lib/types.ts` and find the `VisionFoodItem` interface (line 71). Add two fields after `estimatedOil`:

```ts
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
```

- [ ] **Step 2: Build to verify types**

Run: `cd d:/calorie-tracker && npm run build 2>&1 | tail -20`

Expected: Build passes with zero TypeScript errors (new fields are optional so existing code doesn't break).

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add portionBasis and weightConfidence fields to VisionFoodItem"
```

---

### Task 2: Update nutrition.ts — fallback densities, dish ratios, oil defaults, dynamic uncertainty

**Files:**
- Modify: `lib/nutrition.ts` — multiple sections

#### Subtask 2A: Category-based fallback density

- [ ] **Step 1: Add FALLBACK_DENSITY constant**

After the `COOKING_SUFFIXES` constant (after line 27), insert:

```ts
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
```

- [ ] **Step 2: Rewrite fallbackEstimate() to use FALLBACK_DENSITY**

Replace the existing `fallbackEstimate` function (lines 436-443):

```ts
function fallbackEstimate(vf: VisionFoodItem): NutritionData {
  // Build lookup key: for dishes use "dish|cookingMethod", otherwise use category
  const key = vf.category === 'dish'
    ? `dish|${vf.cookingMethod ?? 'stir-fry'}`
    : vf.category;
  const density = FALLBACK_DENSITY[key] ?? FALLBACK_DENSITY['ingredient'];

  const calories = Math.round(vf.weight * density.calPerGram);
  const protein = Math.round(vf.weight * density.proteinPct * density.calPerGram / 4);
  const fat = Math.round(vf.weight * density.fatPct * density.calPerGram / 9);
  const carbs = Math.round(vf.weight * density.carbsPct * density.calPerGram / 4);

  return {
    protein: protein > 0 ? protein : 0,
    carbs: carbs > 0 ? carbs : 0,
    fat: fat > 0 ? fat : 0,
    calories: calories > 0 ? calories : Math.round(vf.weight * 1.8),
  };
}
```

#### Subtask 2B: Dish ingredient ratios dictionary

- [ ] **Step 3: Add DISH_RATIOS constant**

After `FALLBACK_DENSITY`, insert:

```ts
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
```

- [ ] **Step 4: Add ratio lookup helper and update calcFromIngredients()**

Add this helper function right before `calcFromIngredients`:

```ts
/**
 * Try to find a known ingredient ratio for a dish name.
 * Returns the ratio map keyed by ingredient name, or null.
 */
function findDishRatio(dishName: string, rawName: string): Record<string, number> | null {
  // Try original name first, then prefix-stripped version
  const candidates = [dishName, rawName];
  for (const key of Object.keys(DISH_RATIOS)) {
    for (const candidate of candidates) {
      if (candidate.includes(key)) return DISH_RATIOS[key];
    }
  }
  return null;
}
```

Then replace the weight distribution in `calcFromIngredients` (lines 392-433). The key change is replacing the equal-weight `perIngredientWeight = vf.weight / ingredients.length` with ratio-based weights:

In `calcFromIngredients`, find the section starting at line 398 (`const perIngredientWeight = vf.weight / ingredients.length;`) and replace from that line through the end of the function:

```ts
  // Try to find known ratios for this dish; fall back to equal distribution
  const rawName = vf.name.trim();
  const ratio = findDishRatio(rawName, rawName);

  // Distribute weight: use known ratios if available, otherwise equal split
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

  // Add oil contribution (assume stir-fry if cooking method not specified)
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
```

#### Subtask 2C: Default oil values

- [ ] **Step 5: Add DEFAULT_OIL_GRAMS constant and validation helper**

After `DISH_RATIOS`, insert:

```ts
// ── Default oil amounts by cooking method (fallback when AI estimate is unreasonable) ──

const DEFAULT_OIL_GRAMS: Record<string, number> = {
  steam: 0,
  boil: 0,
  raw: 0,
  'stir-fry': 10,
  braise: 10,
  roast: 8,
  'deep-fry': 35,
  cold: 3,
};

const OIL_MAX: Record<string, number> = {
  steam: 5,
  boil: 5,
  raw: 2,
  'stir-fry': 50,
  braise: 30,
  roast: 25,
  'deep-fry': 80,
  cold: 15,
};

/** Validate AI oil estimate; return a reasonable value if the AI estimate looks wrong */
function sanitizeOil(estimatedOil: number, cookingMethod: string | null): number {
  const method = cookingMethod ?? 'stir-fry';
  const max = OIL_MAX[method] ?? 50;
  const defaultOil = DEFAULT_OIL_GRAMS[method] ?? 10;
  // If AI returned 0 for a method that always uses oil (e.g. stir-fry), use default
  if (estimatedOil <= 0 && defaultOil > 0) return defaultOil;
  // If AI returned an extreme value, cap it
  if (estimatedOil > max) return max;
  return estimatedOil;
}
```

- [ ] **Step 6: Apply oil sanitization in visionToFoodItems()**

In `visionToFoodItems()`, find the line `const estimatedOil = typeof vf.estimatedOil === 'number' ? vf.estimatedOil : 0;` (line 451) and change it to:

```ts
    const estimatedOil = sanitizeOil(
      typeof vf.estimatedOil === 'number' ? vf.estimatedOil : 0,
      safeVf.cookingMethod,
    );
```

Wait — the `safeVf` is on the next line. We need to restructure slightly. Replace lines 448-452:

Old:
```ts
    const weight = typeof vf.weight === 'number' && vf.weight > 0 ? vf.weight : 100;
    const estimatedOil = typeof vf.estimatedOil === 'number' ? vf.estimatedOil : 0;
    const safeVf = { ...vf, weight, estimatedOil };
```

New:
```ts
    const weight = typeof vf.weight === 'number' && vf.weight > 0 ? vf.weight : 100;
    const rawOil = typeof vf.estimatedOil === 'number' ? vf.estimatedOil : 0;
    const estimatedOil = sanitizeOil(rawOil, vf.cookingMethod);
    const safeVf = { ...vf, weight, estimatedOil };
```

#### Subtask 2D: Dynamic uncertainty based on weightConfidence

- [ ] **Step 7: Add dynamic uncertainty logic**

In `visionToFoodItems()`, replace the uncertainty calculation at lines 503-504:

Old:
```ts
    // Dynamic uncertainty: ±10% for DB matches, ±30% for fallback
    const uncertainty = fromDB ? 0.10 : 0.30;
```

New:
```ts
    // Dynamic uncertainty: combines DB match quality and weight confidence
    const dbUncertainty = fromDB ? 0.10 : 0.30;
    const weightConf = safeVf.weightConfidence ?? 'medium';
    const weightUncertainty =
      weightConf === 'high' ? 0.15 : weightConf === 'low' ? 0.40 : 0.25;
    // Use the larger of the two sources (we're more uncertain about whichever is worse)
    const uncertainty = Math.max(dbUncertainty, weightUncertainty);
```

- [ ] **Step 8: Build to verify all changes**

Run: `cd d:/calorie-tracker && npm run build 2>&1 | tail -30`

Expected: Zero TypeScript errors. If there are errors, fix them before committing.

- [ ] **Step 9: Commit**

```bash
git add lib/nutrition.ts
git commit -m "feat: category fallback densities, dish ratios, oil defaults, dynamic uncertainty"
```

---

### Task 3: Rewrite vision prompt with structured portion reference system

**Files:**
- Modify: `functions/api/vision.js:23-66` (SYSTEM_PROMPT variable)

- [ ] **Step 1: Replace the SYSTEM_PROMPT**

Read `functions/api/vision.js` to confirm the current `SYSTEM_PROMPT` content, then replace the entire `SYSTEM_PROMPT` constant (from `const SYSTEM_PROMPT = ...` through the backtick string ending before `export async function onRequestOptions`) with:

```js
const SYSTEM_PROMPT = `你是一名专业的营养分析师，擅长识别中餐菜品并估算营养数据。

你需要分析图片中的食物，对每道菜品输出以下 JSON 格式的信息：
- name: 菜名（中文）
- weight: 预估克数（g）。请使用下方的"份量估算参照体系"进行估算
- category: 食物类别。"dish"（烹饪菜品）| "ingredient"（单一食材）| "beverage"（饮品）| "packaged"（包装食品）
- cookingMethod: 烹饪方式，仅 dish 有效（null 替代）: "steam"|"boil"|"stir-fry"|"deep-fry"|"roast"|"braise"|"cold"|"raw"
- estimatedOil: 预估烹饪用油量（克），无油则为 0。炒菜一般 5-15g，炸物 20-50g
- size: 饮品杯型（仅 beverage）: "small"|"medium"|"large"，其他为 null
- components: 饮品组件列表（仅 beverage），从以下选择：绿茶/红茶/乌龙茶/茉莉花茶/咖啡/全脂牛奶/脱脂牛奶/燕麦奶/椰奶/奶盖/果糖糖浆/黑糖/蜂蜜/零卡糖/珍珠/椰果/红豆/仙草/布丁/芝士奶盖/芋泥/燕麦
- ingredients: 复合菜品的食材拆分（务必填写！这个很重要）。如果菜品是由多种食材组成的（如"番茄炒蛋"、"青椒肉丝"、"宫保鸡丁"），请拆分为基础食材名称列表。尽量用下面列出的食材名称。示例：
  - "番茄炒蛋" → ["番茄", "鸡蛋"]
  - "青椒肉丝" → ["青椒", "猪瘦肉"]
  - "西兰花炒虾仁" → ["西兰花", "虾仁"]
  - "红烧排骨" → ["猪排骨"]
  - "麻辣香锅" → 根据可见食材拆分为列表中存在的食材
- portionBasis: 份量估算依据（必填！）。描述你是如何估算每道食物重量的，用了什么参照物。例如"参照拳头大小，米饭约1.5份≈225g"、"盘中可见标准碗作为参照，菜量约为碗的2/3≈200g"、"无参照物，按常见份量估算"
- weightConfidence: 重量估算置信度（必填！）:
  - "high": 图片中有明确参照物（碗、手、筷子、杯子等）
  - "medium": 图片中有部分参照物或常见餐具可参考
  - "low": 无参照物、角度不佳或食物形态难以判断
- nutritionLabel: 包装食品营养表（仅 packaged），含 calories/protein/carbs/fat/servingSize

## 份量估算参照体系（核心！）

请务必以图片中可见的物品为参照来估算重量，而不是凭空猜测。按照以下步骤：

### 第1步：寻找参照物
观察图片中是否出现以下参照物：
- 碗（标准饭碗直径约12cm）
- 筷子（标准长度约23cm）
- 手/手指（如果出现在画面中）
- 杯子/易拉罐
- 盘子/碟子
- 常见调味品瓶

### 第2步：使用份量单元换算

| 参照物 | 代表什么 | 约等于 |
|--------|----------|--------|
| 🤛 一只拳头 | 1份主食 / 1份蔬菜 | 米饭150g / 蔬菜100g（生重） |
| ✋ 手掌（不含手指，掌心大小） | 1份肉类 | 100–120g（生重） |
| 🖐️ 整只手（含手指，手心大小） | 1份鱼肉/鸡胸 | 150g（生重） |
| 👍 大拇指（一节） | 1份油脂/坚果酱 | 15g |
| 🥄 一汤匙（喝汤的勺子） | 油/酱料/调味品 | 10–15g |
| 🥢 一筷子夹起的量 | 炒菜中的一口 | 15–20g |
| 🍚 标准饭碗（直径12cm） | 主食碗 | 米饭约150g（熟）/ 面条约200g（熟） |
| 🥛 一次性杯子 | 饮品 | 小杯250ml / 中杯400ml / 大杯600ml |
| 🍽️ 标准餐盘 | 一份外卖/食堂餐 | 总菜量约300–500g |

### 第3步：记录估算过程
对每道菜，在 portionBasis 字段中简要记录：
- 用了什么参照物
- 估计了几份
- 最终克数
- 不要写长段落，一两句话即可

## 我们的食材数据库包含以下食材（请尽量使用这些名称或接近的名称）：

${KNOWN_FOODS}

## Few-shot 示例：

示例1 — 一张番茄炒蛋+米饭的照片（照片中有标准饭碗和筷子）：
{"foods": [{"name": "番茄炒蛋", "weight": 350, "category": "dish", "cookingMethod": "stir-fry", "estimatedOil": 10, "size": null, "components": null, "ingredients": ["番茄", "鸡蛋"], "portionBasis": "菜量约装饭碗2碗，以碗为参照估算350g", "weightConfidence": "high", "nutritionLabel": null}, {"name": "米饭", "weight": 200, "category": "ingredient", "cookingMethod": null, "estimatedOil": 0, "size": null, "components": null, "ingredients": null, "portionBasis": "碗中米饭约1.3份拳头大小≈200g", "weightConfidence": "high", "nutritionLabel": null}]}

示例2 — 一张红烧牛肉面的照片（大碗，碗边有筷子）：
{"foods": [{"name": "红烧牛肉面", "weight": 600, "category": "dish", "cookingMethod": "braise", "estimatedOil": 15, "size": null, "components": null, "ingredients": ["面条", "牛肉"], "portionBasis": "大碗面，面条约占碗的2/3，牛肉约手掌大小，总重估算600g", "weightConfidence": "medium", "nutritionLabel": null}]}

示例3 — 一杯珍珠奶茶（手持，可见一次性杯子）：
{"foods": [{"name": "珍珠奶茶", "weight": 500, "category": "beverage", "cookingMethod": null, "estimatedOil": 0, "size": "medium", "components": ["红茶", "全脂牛奶", "果糖糖浆", "珍珠"], "ingredients": null, "portionBasis": "中杯一次性杯子，约400ml，加珍珠约500g", "weightConfidence": "high", "nutritionLabel": null}]}

示例4 — 一包薯片（可见包装袋和营养表）：
{"foods": [{"name": "薯片", "weight": 100, "category": "packaged", "cookingMethod": null, "estimatedOil": 0, "size": null, "components": null, "ingredients": null, "portionBasis": "整包薯片，按包装标注100g", "weightConfidence": "high", "nutritionLabel": {"calories": 520, "protein": 5, "carbs": 55, "fat": 32, "servingSize": 100}}]}

示例5 — 食堂餐盘，菜在盘子里但无明确参照物：
{"foods": [{"name": "青椒肉丝", "weight": 250, "category": "dish", "cookingMethod": "stir-fry", "estimatedOil": 8, "size": null, "components": null, "ingredients": ["青椒", "猪瘦肉"], "portionBasis": "无明确参照物，按常见食堂份量估算约250g", "weightConfidence": "low", "nutritionLabel": null}]}

## 重要规则：
1. 如果图片中无食物，foods 返回空数组 []
2. 严格只输出 JSON，不要输出 markdown 代码块，不要输出任何解释文字
3. 对于复合菜品（如炒菜、炖菜），务必填写 ingredients 字段，拆分为数据库中存在的基础食材
4. 重量估算必须使用份量参照体系，禁止凭空猜测
5. portionBasis 和 weightConfidence 是必填字段，每个 food 都要写
6. 烹饪用油估算要合理：蒸/煮 ≈0g，炒 ≈8-15g，炸 ≈20-50g，炖/烧 ≈5-15g

输出格式：{"foods": [{"name": "...", "weight": 300, "portionBasis": "...", "weightConfidence": "high", ...}]}`;
```

- [ ] **Step 2: Build to verify no syntax errors**

Run: `cd d:/calorie-tracker && npm run build 2>&1 | tail -30`

Expected: Build passes. The vision.js is a Cloudflare Function, not processed by TypeScript, so the key verification is that the template literal syntax is correct (no unescaped backticks, etc.).

- [ ] **Step 3: Commit**

```bash
git add functions/api/vision.js
git commit -m "feat: structured portion reference system in vision prompt"
```

---

### Task 4: Final verification build

- [ ] **Step 1: Clean build**

Run: `cd d:/calorie-tracker && npm run build 2>&1`

Expected: Full Next.js export build completes with zero errors. All pages and functions generate correctly.

- [ ] **Step 2: Commit any remaining changes**

```bash
git status
# If clean, done. If there are changes:
git add -A
git commit -m "chore: final build verification"
```
