'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { type MealType } from '@/lib/types';
import RingProgress from '@/components/RingProgress';
import MacroBars from '@/components/MacroBar';
import MealSection from '@/components/MealSection';
import SplashScreen from '@/components/SplashScreen';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function DashboardPage() {
  const { state } = useApp();
  const { profile, meals } = state;
  const [splashDone, setSplashDone] = useState(false);

  if (!profile) {
    if (!splashDone) {
      return <SplashScreen onDone={() => setSplashDone(true)} />;
    }
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 space-y-4">
        <h1 className="text-lg font-bold">这顿不算</h1>
        <p className="text-sm text-gray-400 text-center">拍照识别热量，吃了再说</p>
        <p className="text-xs text-gray-300 text-center">请先设置你的个人代谢画像以开始使用</p>
        <a
          href="/settings"
          className="rounded-xl bg-brand px-6 py-2 text-sm font-medium text-white"
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
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-sm text-gray-400 tracking-wide">{dateStr}</h1>

      <div className="flex justify-center pt-2 pb-2">
        <RingProgress current={roundedCalories} target={dailyTarget} />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
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
