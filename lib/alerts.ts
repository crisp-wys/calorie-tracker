import type { Alert, MealRecord, MealType } from './types';
import { getDailySummaries, type DailySummary } from './utils';

// ── Helpers ──────────────────────────────────────────────────────

// ── Rule 1: Consecutive calorie over ─────────────────────────────

function checkCalorieOver(summaries: DailySummary[], target: number): Alert | null {
  const sorted = [...summaries].sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0;
  for (const d of sorted) {
    if (d.calories > target * 1.1) {
      streak++;
      if (streak >= 3) {
        const avg = Math.round(
          sorted.filter((x) => x.calories > target * 1.1).reduce((s, x) => s + x.calories, 0) /
            sorted.filter((x) => x.calories > target * 1.1).length
        );
        return {
          type: 'calorie_over',
          title: `连续${streak}天热量超标`,
          message: `最近${streak}天平均摄入 ${avg}kcal，建议今天控制在 ${target}kcal 以内`,
          suggestion: `我最近几天热量超标了，今天怎么调整饮食？目标 ${target}kcal`,
          color: 'yellow',
          emoji: '⚠️',
        };
      }
    } else {
      streak = 0;
    }
  }
  return null;
}

// ── Rule 2: Consecutive calorie under ────────────────────────────

function checkCalorieUnder(summaries: DailySummary[], target: number): Alert | null {
  const sorted = [...summaries].sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0;
  for (const d of sorted) {
    if (d.calories > 0 && d.calories < target * 0.7) {
      streak++;
      if (streak >= 3) {
        return {
          type: 'calorie_under',
          title: `连续${streak}天热量不足`,
          message: `最近${streak}天摄入偏低，注意营养均衡，别饿着自己`,
          suggestion: `我最近几天吃得太少了，怎么确保营养充足又能控制体重？`,
          color: 'blue',
          emoji: '🔵',
        };
      }
    } else {
      streak = 0;
    }
  }
  return null;
}

// ── Rule 3: Macro imbalance ──────────────────────────────────────

const MACRO_TARGETS = {
  protein: { min: 0.15, max: 0.35 },
  carbs: { min: 0.40, max: 0.55 },
  fat: { min: 0.20, max: 0.35 },
};

function checkMacroImbalance(summaries: DailySummary[]): Alert | null {
  let totalProtein = 0, totalCarbs = 0, totalFat = 0, totalCal = 0;
  for (const d of summaries) {
    totalProtein += d.protein;
    totalCarbs += d.carbs;
    totalFat += d.fat;
    totalCal += d.calories;
  }
  if (totalCal === 0) return null;

  const proteinPct = (totalProtein * 4) / totalCal;
  const carbsPct = (totalCarbs * 4) / totalCal;
  const fatPct = (totalFat * 9) / totalCal;

  if (carbsPct > MACRO_TARGETS.carbs.max + 0.15) {
    return {
      type: 'macro_imbalance',
      title: `碳水占比偏高（${Math.round(carbsPct * 100)}%）`,
      message: '最近一周碳水占比较高，蛋白质偏少。多加一份肉或蛋吧',
      suggestion: `我的碳水吃太多了，帮我规划一下蛋白质比例怎么提升？`,
      color: 'blue',
      emoji: '🍚',
    };
  }
  if (proteinPct < MACRO_TARGETS.protein.min - 0.15) {
    return {
      type: 'macro_imbalance',
      title: `蛋白质摄入不足（${Math.round(proteinPct * 100)}%）`,
      message: '蛋白质对维持肌肉和代谢很重要，每餐加一份肉/蛋/豆制品',
      suggestion: `我蛋白质吃太少了，有什么简单的高蛋白食物推荐？`,
      color: 'blue',
      emoji: '🥩',
    };
  }

  return null;
}

// ── Rule 4: Dinner too heavy ─────────────────────────────────────

function checkDinnerHeavy(summaries: DailySummary[]): Alert | null {
  const today = summaries[0];
  if (!today || today.calories === 0) return null;

  const dinnerCal = today.mealBreakdown.dinner;
  if (dinnerCal > today.calories * 0.5) {
    const pct = Math.round((dinnerCal / today.calories) * 100);
    return {
      type: 'dinner_heavy',
      title: `晚餐占全天热量 ${pct}%`,
      message: '晚上代谢慢，试试把大餐挪到中午，晚上清淡一点',
      suggestion: `我晚上总是吃太多，怎么调整晚餐习惯？最近晚餐占比${pct}%`,
      color: 'purple',
      emoji: '🌙',
    };
  }
  return null;
}

// ── Rule 5: Single meal spike ────────────────────────────────────

function checkMealSpike(summaries: DailySummary[], target: number): Alert | null {
  const today = summaries[0];
  if (!today || today.calories === 0) return null;

  const mealLabels: Record<MealType, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '加餐',
  };

  for (const mealType of ['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]) {
    const mealCal = today.mealBreakdown[mealType];
    if (mealCal > target * 0.6) {
      return {
        type: 'meal_spike',
        title: `${mealLabels[mealType]}热量偏高`,
        message: `这餐就占了全天目标的 ${Math.round((mealCal / target) * 100)}%，可以考虑分一部分到其他餐`,
        suggestion: `我的${mealLabels[mealType]}吃太多了，帮我优化一下全天饮食分配`,
        color: 'yellow',
        emoji: '⚡',
      };
    }
  }
  return null;
}

// ── Main entry ────────────────────────────────────────────────────

/**
 * Calculate all active alerts from meal data and user profile.
 * Pure function — no side effects, no API calls.
 * Returns alerts in priority order (calorie issues first).
 */
export function calcAlerts(meals: MealRecord[], profile: { dailyTarget: number } | null): Alert[] {
  if (!profile || meals.length === 0) return [];

  const target = profile.dailyTarget;
  const summaries = getDailySummaries(meals, 7);
  if (summaries.length === 0) return [];

  const alerts: Alert[] = [];

  const over = checkCalorieOver(summaries, target);
  if (over) alerts.push(over);

  const under = checkCalorieUnder(summaries, target);
  if (under) alerts.push(under);

  const macro = checkMacroImbalance(summaries);
  if (macro) alerts.push(macro);

  const dinner = checkDinnerHeavy(summaries);
  if (dinner) alerts.push(dinner);

  const spike = checkMealSpike(summaries, target);
  if (spike) alerts.push(spike);

  return alerts;
}
