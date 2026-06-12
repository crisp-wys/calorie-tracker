'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/AppContext';
import { type MealType } from '@/lib/types';
import { calcAvgCalories } from '@/lib/utils';
import RingProgress from '@/components/RingProgress';
import MacroBars from '@/components/MacroBar';
import MealSection from '@/components/MealSection';
import OnboardingWizard from '@/components/OnboardingWizard';
import { calcAlerts } from '@/lib/alerts';
import AlertBannerList from '@/components/AlertBannerList';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function DashboardPage() {
  const { state, loading } = useApp();
  const { profile, meals } = state;

  // Show loading spinner while fetching from Supabase
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-sm text-gray-400">加载中…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <OnboardingWizard />;
  }

  const today = new Date().toISOString().split('T')[0];

  const { todayMeals, totalCalories, roundedCalories, macros } = useMemo(() => {
    const todayMeals = meals.filter((m) => m.date === today);
    const totalCalories = todayMeals.reduce(
      (s, m) => s + calcAvgCalories(m.totalCaloriesMin, m.totalCaloriesMax),
      0
    );
    let protein = 0, carbs = 0, fat = 0;
    todayMeals.forEach((m) =>
      m.foods.forEach((f) => {
        protein += f.protein;
        carbs += f.carbs;
        fat += f.fat;
      })
    );
    return {
      todayMeals,
      totalCalories,
      roundedCalories: Math.round(totalCalories),
      macros: { protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) },
    };
  }, [meals, today]);

  const alerts = useMemo(() => calcAlerts(meals, profile), [meals, profile]);

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

      <AlertBannerList
        alerts={alerts}
        onOpenChat={(prefill) => {
          window.dispatchEvent(new CustomEvent('open-coach-chat', { detail: prefill }));
        }}
      />

      <div className="flex justify-center pt-2 pb-2">
        <RingProgress current={roundedCalories} target={dailyTarget} />
      </div>

      <div className="rounded-2xl bg-[#FFFBF6] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
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
