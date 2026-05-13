'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import CalendarGrid from '@/components/CalendarGrid';

export default function CalendarPage() {
  const { state } = useApp();
  const { profile } = state;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(todayStr);

  const dateMeals = useMemo(() => {
    const map = new Map<string, number>();
    state.meals.forEach((m) => {
      const avg = (m.totalCaloriesMin + m.totalCaloriesMax) / 2;
      map.set(m.date, (map.get(m.date) ?? 0) + avg);
    });
    return map;
  }, [state.meals]);

  const selectedCalories = Math.round(dateMeals.get(selected) ?? 0);
  const target = profile?.dailyTarget ?? 2000;
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

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-xl font-extrabold">饮食日历</h1>

      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1 text-gray-500">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-medium text-sm">{monthName}</span>
        <button onClick={nextMonth} className="p-1 text-gray-500">
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

      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="text-sm text-gray-500">{selected}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-xl font-bold tabular-nums">{selectedCalories}</span>
          <span className="text-sm text-gray-400">/ {target} kcal</span>
        </div>
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
