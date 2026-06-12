'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { MEAL_ORDER } from '@/lib/types';
import { calcAvgCalories, getLocalDateString } from '@/lib/utils';
import { calcDynamicTarget } from '@/lib/tdee';
import { sumTodayWorkoutCalories } from '@/lib/workout-utils';
import RingProgress from '@/components/RingProgress';
import MacroBars from '@/components/MacroBar';
import MealSection from '@/components/MealSection';
import OnboardingWizard from '@/components/OnboardingWizard';
import { calcAlerts } from '@/lib/alerts';
import AlertBannerList from '@/components/AlertBannerList';
import CalorieTrend from '@/components/CalorieTrend';

export default function DashboardPage() {
  const { state, loading, loadError } = useApp();
  const { profile, meals } = state;
  const router = useRouter();

  const isFirstDay = meals.length === 0;

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

  // Load failed with no profile and no cache → show error with retry
  if (!profile && loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-6 space-y-4">
        <p className="text-5xl">😵</p>
        <p className="text-sm text-[#8A7B6B] text-center">无法连接到服务器</p>
        <p className="text-xs text-[#C4B5A5] text-center">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-[#D95959] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#D95959]/20"
        >
          重试
        </button>
      </div>
    );
  }

  if (!profile) {
    return <OnboardingWizard />;
  }

  const today = getLocalDateString();

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

  // Dynamic daily target = base target + today's exercise calories × 0.8
  const todayExerciseCals = useMemo(
    () => sumTodayWorkoutCalories(state.workouts),
    [state.workouts]
  );
  const baseTarget = profile?.dailyTarget ?? 2000;
  const { effectiveTarget: dailyTarget } = useMemo(
    () => calcDynamicTarget(baseTarget, todayExerciseCals),
    [baseTarget, todayExerciseCals]
  );

  const alerts = useMemo(
    () => calcAlerts(meals, dailyTarget, !!profile),
    [meals, dailyTarget, profile]
  );

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
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm text-gray-400 tracking-wide">{dateStr}</h1>
        <button
          onClick={() => router.push('/calendar/settings')}
          className="h-8 w-8 rounded-xl bg-[#FAF6F0] border border-[#E8DDD0] flex items-center justify-center text-[#C4B5A5] hover:text-[#D95959] hover:border-[#D95959]/30 transition-colors"
          aria-label="设置"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* First-day guidance */}
      {isFirstDay && (
        <div className="rounded-xl bg-gradient-to-r from-[#D95959]/8 to-[#E8B86D]/10 border border-[#D95959]/15 px-4 py-3">
          <p className="text-sm font-semibold text-[#3D3226] mb-1">👋 开始记录你的第一天吧！</p>
          <p className="text-xs text-[#8A7B6B]">
            点击下方餐段的 <span className="font-medium text-[#D95959]">快速添加</span> 或 📷 拍照识别来记录第一餐
          </p>
        </div>
      )}

      {loadError && profile && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-2.5 text-xs text-yellow-700">
          ⚠️ 数据同步失败，当前显示的是本地缓存。{loadError}
        </div>
      )}

      <AlertBannerList
        alerts={alerts}
        onOpenChat={(prefill) => {
          window.dispatchEvent(new CustomEvent('open-coach-chat', { detail: prefill }));
        }}
      />

      <CalorieTrend />

      <div className="flex justify-center pt-2 pb-2">
        <RingProgress current={roundedCalories} target={dailyTarget} isEmpty={todayMeals.length === 0} />
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
