# 食物识别准确度 v2 — 设计文档

> **目标**：在现有 184 种食物 DB + fuzzy matching + 复合拆解基础上，进一步降低图片识别卡路里误差，从当前 ±30% fallback 误差缩到 ±15-20%。

## 现有误差链分析

| 误差源 | 贡献占比 | 当前处理 |
|--------|:---:|------|
| 重量/份量估算不准 | ~40% | AI 零散参照（一碗米饭≈150g） |
| Fallback 公式一刀切 | ~25% | `weight × 1.8 kcal/g` 不分炸鸡/沙拉 |
| 复合菜品食材均分重量 | ~15% | 番茄炒蛋 → 番茄:鸡蛋 = 50:50 |
| 用油估算方差大 | ~10% | AI 自由估算 5-50g |
| 其他（菜名识别等） | ~10% | fuzzyFindFood 已较完善 |

## 设计

### Part A：本地计算层精化（`lib/nutrition.ts` 纯本地）

#### A1. 分类 Fallback 热量密度表

当前 `fallbackEstimate()` 对任何未匹配到 DB 的食物都返回统一公式：
```
protein = weight × 0.12
carbs = weight × 0.15
fat = weight × 0.08
calories = weight × 1.8
```

改进为按 `(category, cookingMethod)` 查表选取不同密度：

```ts
const FALLBACK_DENSITY: Record<string, { calPerGram: number; proteinPct: number; carbsPct: number; fatPct: number }> = {
  // dish by cooking method
  'dish|stir-fry': { calPerGram: 2.0, proteinPct: 0.15, carbsPct: 0.20, fatPct: 0.65 },
  'dish|deep-fry': { calPerGram: 2.8, proteinPct: 0.10, carbsPct: 0.20, fatPct: 0.70 },
  'dish|steam':    { calPerGram: 1.3, proteinPct: 0.30, carbsPct: 0.30, fatPct: 0.40 },
  'dish|braise':   { calPerGram: 1.8, proteinPct: 0.18, carbsPct: 0.22, fatPct: 0.60 },
  'dish|boil':     { calPerGram: 1.2, proteinPct: 0.25, carbsPct: 0.35, fatPct: 0.40 },
  'dish|roast':    { calPerGram: 2.2, proteinPct: 0.20, carbsPct: 0.15, fatPct: 0.65 },
  'dish|cold':     { calPerGram: 1.1, proteinPct: 0.25, carbsPct: 0.40, fatPct: 0.35 },
  'dish|raw':      { calPerGram: 0.8, proteinPct: 0.20, carbsPct: 0.50, fatPct: 0.30 },
  // non-dish
  'ingredient':    { calPerGram: 1.5, proteinPct: 0.20, carbsPct: 0.30, fatPct: 0.50 },
  'beverage':      { calPerGram: 0.4, proteinPct: 0.05, carbsPct: 0.80, fatPct: 0.15 },
  'packaged':      { calPerGram: 3.5, proteinPct: 0.08, carbsPct: 0.55, fatPct: 0.37 },
};
```

Key: `dish` 用 `category|cookingMethod`，非 dish 用 `category`。找不到 key 时 fallback 回原始 1.8。

#### A2. 食材配比词典

当前 `calcFromIngredients()` 均分重量给所有食材。新增常见菜谱的真实配比：

```ts
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
  '韭黄炒蛋':   { '韭黄': 0.40, '鸡蛋': 0.60 },
  '蒜蓉西兰花': { '西兰花': 0.95, '大蒜': 0.05 },
  '家常豆腐':   { '豆腐': 0.65, '猪肉': 0.25, '青椒': 0.10 },
  '干煸豆角':   { '豆角': 0.85, '猪肉': 0.15 },
  '红烧肉':     { '猪肉': 0.85, '土豆': 0.15 },
  '糖醋里脊':   { '猪肉': 0.75, '青椒': 0.15, '洋葱': 0.10 },
  '辣子鸡':     { '鸡腿肉': 0.70, '花生': 0.20, '青椒': 0.05, '干辣椒': 0.05 },
  '水煮鱼':     { '鱼肉': 0.55, '豆芽': 0.25, '白菜': 0.20 },
};
```

匹配逻辑：
1. `decomposeDish()` 拆解菜名 → 得到食材列表
2. 用菜名（原始 or 去前缀后）查 `DISH_RATIOS`
3. 如果命中且食材名称能对应上 → 按配比分配重量
4. 如果配比中的某个食材不在 DB 里 → 该食材按均分处理
5. 未命中配比词典 → 保持现有均分逻辑

#### A3. 用油默认值兜底

AI 返回的 `estimatedOil` 有时明显不合理。新增默认值 + 合理性校验：

```ts
const DEFAULT_OIL_GRAMS: Record<string, number> = {
  steam: 0,
  boil: 0,
  raw: 0,
  stirfry: 10,
  braise: 10,
  roast: 8,
  deepfry: 35,
  cold: 3,
};
```

校验规则：如果 AI 返回的 `estimatedOil` 超出合理范围（如炒菜 0g 或 >50g），用默认值替换。

### Part B：视觉份量系统（`functions/api/vision.js` prompt 改造）

#### B1. 份量单元参照表（嵌入 System Prompt）

替换现有零散的重量参照，引入结构化人手参照系：

```
## 份量估算参照体系

请根据图片中的参照物（碗、筷子、手等）估算食物份量和重量：

| 参照物 | 代表 | 约等于 |
|--------|------|--------|
| 🤛 一只拳头 | 1份主食 / 1份蔬菜 | 米饭150g / 蔬菜100g |
| ✋ 手掌（不含手指） | 1份肉类 | 100–120g |
| 🖐️ 整只手（含手指） | 1份鱼肉 | 150g |
| 👍 大拇指（一节） | 1份油脂/酱料 | 15g |
| 🥄 一汤匙 | 油/酱料/调味品 | 10–15g |
| 🥢 一筷子夹起的量 | 炒菜中的一口 | 15–20g |
| 🍚 标准碗（直径~12cm） | 主食碗 | 米饭约150g / 面条约200g（熟） |
| 🥛 一次性杯子 | 饮品 | 小杯250ml / 中杯400ml / 大杯600ml |

## 估算步骤
1. 先观察图片中是否有上述参照物（碗、筷子、手、杯子、盘子）
2. 以参照物为基准估计食物份数
3. 份数 × 每份克数 = 最终重量
4. 在 portionBasis 字段中记录你的估算依据
```

#### B2. 新增 AI 返回字段

```ts
// VisionFoodItem 新增（已在 types.ts 中存在）
portionBasis?: string;      // "参照拳头大小，米饭约1.5份 ≈ 225g"
weightConfidence?: 'high' | 'medium' | 'low';
```

- `high`: 图片中有明确参照物（碗/手/筷子），估算偏差 ±15%
- `medium`: 有部分参照物或常见餐具，估算偏差 ±25%
- `low`: 无参照物或角度不佳，估算偏差 ±40%

#### B3. 误差带动态联动

```ts
// visionToFoodItems 中
const weightConf = vf.weightConfidence ?? 'medium';
const weightUncertainty = weightConf === 'high' ? 0.15 : weightConf === 'medium' ? 0.25 : 0.40;
const dbUncertainty = fromDB ? 0.10 : 0.30;
// 最终误差带取两者较大值
const uncertainty = Math.max(weightUncertainty, dbUncertainty * 0.5);
```

### Part C：FoodCard 编辑按钮移动端可见

**Bug fix**（已修）：`opacity-0 group-hover:opacity-100` → `opacity-60`。手机无 hover，编辑按钮之前完全不可见。

## 涉及文件

| 文件 | 操作 | 内容 |
|------|------|------|
| `lib/nutrition.ts` | **修改** | A1: 分类 fallback 密度表 + 改造 fallbackEstimate；A2: DISH_RATIOS 词典 + 加权 calcFromIngredients；A3: 用油默认值 + 校验；B3: 动态误差带联动 weightConfidence |
| `lib/types.ts` | **修改** | B2: VisionFoodItem 新增 `portionBasis?` `weightConfidence?` |
| `functions/api/vision.js` | **修改** | B1: system prompt 重构，加入份量参照体系 + 估算步骤 + few-shot 示例更新 |
| `components/FoodCard.tsx` | **已修改** | Part C: 编辑按钮手机端可见 |

## 预期效果

| 场景 | 当前误差 | 优化后 |
|------|:---:|:---:|
| DB 命中 + 有参照物 | ±10% | ±10%（不变） |
| DB 命中 + 无参照物 | ±10% | ±15% |
| 未命中 + 分类 fallback | ±30%（1.8×） | ±20%（分类密度） |
| 复合菜品 + 配比词典命中 | ±30% | ±15% |
| 复合菜品 + 配比未命中 | ±30% | ±30%（不变） |
| 炒菜 0g 用油 | 偏差大 | 默认 10g 兜底 |

**总体**：约 60% 的识别结果能看到精度提升，平均误差从 ~25% 降到 ~15%。

## 验证

1. `npm run build` 零错误
2. 用"番茄炒蛋"照片测试 → ingredients 拆解 + 配比词典命中 → 热量接近真实值
3. 用未知菜品测试 → fallback 按分类密度计算，不再是统一 1.8
4. 用油炸食品测试 → deep-fry fallback 密度 2.8，明显高于炒菜 2.0
5. 检查 AI 返回 → portionBasis 字段包含估算依据描述
6. 手机上打开拍照结果 → FoodCard 编辑铅笔按钮可见
