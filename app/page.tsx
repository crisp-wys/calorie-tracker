'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/AppContext';
import { type MealType } from '@/lib/types';
import RingProgress from '@/components/RingProgress';
import MacroBars from '@/components/MacroBar';
import MealSection from '@/components/MealSection';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function DashboardPage() {
  const { state } = useApp();
  const { profile, meals } = state;

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 space-y-4">
        <h1 className="text-lg font-bold">Calorie Tracker</h1>
        <p className="text-sm text-gray-400 text-center">AI 驱动的减脂饮食追踪工具</p>
        <p className="text-xs text-gray-300 text-center">请先设置你的个人代谢画像以开始使用</p>
        <a
          href="/settings"
          className="rounded-xl bg-green-500 px-6 py-2 text-sm font-medium text-white"
        >
          开始设置
        </a>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todayMeals = meals.filter((m) => m.date === today);

  const totalCalories = todayMeals.reduce(
    (s, m) => s + (m.totalCaloriesMin + m.totalCaloriesMax) / 2,
    0
  );
  const roundedCalories = Math.round(totalCalories);

  const macros = useMemo(() => {
    let protein = 0, carbs = 0, fat = 0;
    todayMeals.forEach((m) =>
      m.foods.forEach((f) => {
        protein += f.protein;
        carbs += f.carbs;
        fat += f.fat;
      })
    );
    return { protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
  }, [todayMeals]);

  const dailyTarget = profile?.dailyTarget ?? 2000;

  const proteinTarget = Math.round((dailyTarget * 0.3) / 4);
  const carbsTarget = Math.round((dailyTarget * 0.4) / 4);
  const fatTarget = Math.round((dailyTarget * 0.3) / 9);

  const dateStr = new Date().toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-sm text-gray-400">{dateStr}</h1>

      <div className="flex justify-center">
        <RingProgress current={roundedCalories} target={dailyTarget} />
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <MacroBars
          protein={macros.protein}
          proteinTarget={proteinTarget}
          carbs={macros.carbs}
          carbsTarget={carbsTarget}
          fat={macros.fat}
          fatTarget={fatTarget}
        />
      </div>

      <div className="space-y-2">
        {MEAL_ORDER.map((mealType) => (
          <MealSection
            key={mealType}
            mealType={mealType}
            meals={todayMeals.filter((m) => m.mealType === mealType)}
            date={today}
          />
        ))}
      </div>
    </div>
  );
}
