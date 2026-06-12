import type {
  UserMemory,
  AppState,
} from './types';
import { DEFAULT_AI_CONFIG } from './types';
import { calcAvgCalories, getDailySummaries } from './utils';

const ENCOURAGING_PROMPT = `你是一个温暖、友好、充满正能量的健身与营养教练。
核心风格：
- 每次对话先肯定用户的努力和进步，哪怕是很小的进步也要看到并说出来
- 用「我们」而不是「你」，让用户感觉你在和他一起努力
- 多用表情符号和语气词（～！），让对话轻松愉快
- 当发现饮食或运动问题时，先说「没关系，这很正常」，再给出具体的改进建议
- 永远不批评用户的选择，而是引导他找到更好的替代方案
- 如果用户今天吃超了热量，帮他想办法在接下来几天温和调整，而不是让他产生负罪感
- 每次对话结尾给一个具体的、容易做到的小目标，如「明天早餐加一个鸡蛋怎么样？」

数据使用原则：
- 用具体的饮食数据来表扬用户（"今天蛋白质 80g，比昨天好！"）
- 指出问题时附带数据（"午餐碳水占比偏高了点，晚餐可以适当减米饭"）
- 引用趋势数据来鼓励（"这周平均热量比上周低了 150kcal，你在进步！"）`;

const STRICT_PROMPT = `你是一个严格、直接、不废话的健身与营养教练。
核心风格：
- 开门见山，直接指出问题，不铺垫，不安慰
- 用数据和事实说话，不带情绪但也不留情面
- 少用语气词，不用表情符号，句子简短有力
- 永远基于用户的实际数据发言
- 绝对禁止：人身攻击、辱骂、贬低用户人格、使用侮辱性词汇
- 批评的是行为不是人——说「今天碳水严重超标」而不是「你太没自制力了」
- 每次对话结尾给出明确的、不可讨价还价的量化行动指令，如「明天蛋白质必须吃到 100g」

数据使用原则：
- 直接指出数据异常（"连续三天热量超标，趋势不对"）
- 用数字说话（"你的日均蛋白质只有 52g，目标 100g，差了一半"）
- 对比历史数据施压（"上周减了 0.3kg，这周不动，你在偷懒吗？"）
- 给出明确的量化目标，不模棱两可`;

// Note: loadMemory / saveMemory are now async — import from './db' directly

export function getDefaultMemory(): UserMemory {
  return {
    aiConfig: { ...DEFAULT_AI_CONFIG },
    insights: [],
    preferences: [],
    milestones: [],
    lastSummaryDate: null,
  };
}

export function needsMemoryUpdate(memory: UserMemory): boolean {
  if (memory.lastSummaryDate === null) return true;
  const today = new Date().toISOString().split('T')[0];
  return memory.lastSummaryDate !== today;
}

const MAX_PROMPT_TOKENS = 8000;
const MAX_TODAY_FOODS = 20;
const MAX_INSIGHTS = 10;
const MAX_MILESTONES = 5;

/** Rough token estimation: ~1 token per 1.5 Chinese/English chars. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 1.5);
}

export function buildSystemPrompt(
  memory: UserMemory,
  state: AppState
): string {
  const config = memory.aiConfig;

  let prompt = '';
  if (config.personality === 'encouraging') {
    prompt = `你的名字是「${config.name}」。\n\n${ENCOURAGING_PROMPT}`;
  } else if (config.personality === 'strict') {
    prompt = `你的名字是「${config.name}」。\n\n${STRICT_PROMPT}`;
  } else {
    prompt = config.customPrompt
      ? `你的名字是「${config.name}」。\n\n${config.customPrompt}`
      : `你的名字是「${config.name}」。`;
  }

  const profile = state.profile;
  if (profile) {
    prompt += `\n\n【用户画像】\n身高：${profile.height}cm\n体重：${profile.weight}kg\n年龄：${profile.age}岁\n性别：${profile.gender === 'male' ? '男' : '女'}\n每日目标热量：${profile.dailyTarget}kcal\nTDEE：${profile.tdee}kcal`;
  }

  const today = new Date().toISOString().split('T')[0];
  const todayMeals = state.meals.filter((m) => m.date === today);
  const mealLabels: Record<string, string> = {
    breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐',
  };

  if (todayMeals.length > 0) {
    prompt += '\n\n【今日饮食记录】';
    let foodCount = 0;
    for (const m of todayMeals) {
      const foods = m.foods.slice(0, MAX_TODAY_FOODS - foodCount).map((f) => `${f.name}(${f.weight}g)`).join('、');
      prompt += `\n${mealLabels[m.mealType] || m.mealType}：${foods} 共 ${m.totalCaloriesMin}-${m.totalCaloriesMax}kcal`;
      foodCount += m.foods.length;
      if (foodCount >= MAX_TODAY_FOODS) break;
    }
    const totalToday = todayMeals.reduce(
      (s, m) => s + calcAvgCalories(m.totalCaloriesMin, m.totalCaloriesMax), 0
    );
    prompt += `\n今日已摄入：${Math.round(totalToday)}/${profile?.dailyTarget ?? 2000}kcal`;
  } else {
    prompt += '\n\n【今日饮食记录】\n今日暂无饮食记录';
  }

  const weekText = buildWeekSummary(state.meals);
  if (weekText) prompt += weekText;

  if (memory.insights.length > 0) {
    const limited = memory.insights.slice(-MAX_INSIGHTS);
    prompt += '\n\n【AI 记忆档案】\n洞察：' +
      limited.map((i) => i.text).join('；');
  }
  if (memory.preferences.length > 0) {
    prompt += '\n用户偏好：' + memory.preferences.slice(-10).join('；');
  }
  if (memory.milestones.length > 0) {
    const limited = memory.milestones.slice(-MAX_MILESTONES);
    prompt += '\n里程碑：' +
      limited.map((m) => `${m.date} ${m.event}`).join('；');
  }

  return prompt;
}

function buildWeekSummary(meals: AppState['meals']): string {
  const summaries = getDailySummaries(meals, 7);
  const withData = summaries.filter((d) => d.calories > 0);
  if (withData.length === 0) return '';

  const avgCal = Math.round(
    withData.reduce((s, d) => s + d.calories, 0) / withData.length
  );
  const avgProtein = Math.round(
    withData.reduce((s, d) => s + d.protein, 0) / withData.length
  );

  let text = `\n\n【近 ${withData.length} 天饮食汇总】`;
  text += `\n日均摄入：${avgCal}kcal`;
  text += `\n日均蛋白质：${avgProtein}g`;
  text += '\n每日详情：';
  for (const d of withData) {
    text += `\n${d.date.slice(5)}：${d.calories}kcal 蛋白${d.protein}g 碳水${d.carbs}g 脂肪${d.fat}g`;
  }

  return text;
}
