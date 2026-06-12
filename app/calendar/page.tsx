'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { calcAvgCalories, getLocalDateString } from '@/lib/utils';
import { calcDynamicTarget } from '@/lib/tdee';
import { getWorkoutCaloriesByDate } from '@/lib/workout-utils';
import CalendarGrid from '@/components/CalendarGrid';

export default function CalendarPage() {
  const { state } = useApp();
  const { profile } = state;
  const router = useRouter();

  const today = new Date();
  const todayStr = getLocalDateString(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(todayStr);

  const dateMeals = useMemo(() => {
    const map = new Map<string, number>();
    state.meals.forEach((m) => {
      const avg = calcAvgCalories(m.totalCaloriesMin, m.totalCaloriesMax);
      map.set(m.date, (map.get(m.date) ?? 0) + avg);
    });
    return map;
  }, [state.meals]);

  const dateWorkouts = useMemo(
    () => getWorkoutCaloriesByDate(state.workouts),
    [state.workouts]
  );

  const selectedCalories = Math.round(dateMeals.get(selected) ?? 0);
  const selectedWorkoutCals = dateWorkouts.get(selected) ?? 0;
  const baseTarget = profile?.dailyTarget ?? 2000;
  const { effectiveTarget: target } = useMemo(
    () => calcDynamicTarget(baseTarget, selectedWorkoutCals),
    [baseTarget, selectedWorkoutCals]
  );
  const isOver = selectedCalories > target;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const monthName = `${viewYear}年 ${viewMonth + 1}月`;
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelected(todayStr);
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold" style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}>饮食日历</h1>
        <button
          onClick={() => router.push('/calendar/settings')}
          className="h-9 w-9 rounded-xl bg-[#FAF6F0] border border-[#E8DDD0] flex items-center justify-center text-[#C4B5A5] hover:text-[#D95959] hover:border-[#D95959]/30 transition-colors"
        >
          <Settings className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1 text-[#C4B5A5]">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm" style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}>{monthName}</span>
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              className="rounded-lg bg-[#D95959]/10 px-2 py-0.5 text-[11px] font-medium text-[#D95959] hover:bg-[#D95959]/20 transition-colors"
            >
              回今天
            </button>
          )}
        </div>
        <button onClick={nextMonth} className="p-1 text-[#C4B5A5]">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <CalendarGrid
        year={viewYear}
        month={viewMonth}
        dateMeals={dateMeals}
        selectedDate={selected}
        onSelect={setSelected}
      />

      <div className="rounded-2xl bg-[#FFFBF6] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="text-sm text-[#C4B5A5]">{selected}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-xl font-bold tabular-nums">{selectedCalories}</span>
          <span className="text-sm text-[#C4B5A5]">/ {target} kcal</span>
        </div>
        {selectedWorkoutCals > 0 && (
          <div className="mt-1 text-xs text-[#D95959]">
            🔥 运动消耗 {selectedWorkoutCals} kcal · 目标已调整
          </div>
        )}
        <div className={`mt-1 text-sm ${isOver ? 'text-red-500' : 'text-brand'}`}>
          {selectedCalories === 0
            ? selected === todayStr
              ? '暂无记录'
              : '无记录'
            : isOver
            ? `超出 ${selectedCalories - target} kcal`
            : '未超标'}
        </div>
      </div>
    </div>
  );
}
