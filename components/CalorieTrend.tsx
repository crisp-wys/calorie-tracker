'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/AppContext';
import { calcAvgCalories } from '@/lib/utils';
import { calcDynamicTarget } from '@/lib/tdee';
import { getWorkoutCaloriesByDate } from '@/lib/workout-utils';

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const CHART_H = 80;
const CHART_W = 260; // viewBox width — will scale to container

export default function CalorieTrend() {
  const { state } = useApp();
  const { profile, meals, workouts } = state;

  const data = useMemo(() => {
    // Build 7-day array: [{ date, dayLabel, isToday, calories, target }]
    const days: { date: string; label: string; isToday: boolean; calories: number; target: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split('T')[0];
      days.push({
        date,
        label: DAY_LABELS[d.getDay()],
        isToday: i === 0,
        calories: 0,
        target: 0,
      });
    }

    // Sum calories per day
    const calMap = new Map<string, number>();
    for (const m of meals) {
      const avg = calcAvgCalories(m.totalCaloriesMin, m.totalCaloriesMax);
      calMap.set(m.date, (calMap.get(m.date) ?? 0) + avg);
    }

    // Sum workout cals per day
    const workoutMap = getWorkoutCaloriesByDate(workouts);

    const baseTarget = profile?.dailyTarget ?? 2000;
    for (const day of days) {
      day.calories = Math.round(calMap.get(day.date) ?? 0);
      const wc = workoutMap.get(day.date) ?? 0;
      day.target = calcDynamicTarget(baseTarget, wc).effectiveTarget;
    }

    const daysWithData = days.filter((d) => d.calories > 0);
    const avgCal = daysWithData.length > 0
      ? Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length)
      : 0;
    const avgTarget = Math.round(days.reduce((s, d) => s + d.target, 0) / days.length);
    const surplus = avgCal > 0 ? avgCal - avgTarget : 0;

    return { days, avgCal, avgTarget, surplus };
  }, [meals, workouts, profile?.dailyTarget]);

  const { days, avgCal, avgTarget, surplus } = data;

  const maxVal = Math.max(avgTarget * 1.3, ...days.map((d) => d.calories), ...days.map((d) => d.target));

  // Bar chart geometry
  const barW = 28;
  const gap = 8;
  const totalBarSpace = days.length * (barW + gap) - gap;
  const startX = (CHART_W - totalBarSpace) / 2;
  const baseline = CHART_H - 16; // leave bottom for labels
  const scale = (baseline - 10) / maxVal; // leave top for target label

  return (
    <div className="rounded-2xl bg-[#FFFBF6] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      {/* Summary row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#8A7B6B]">本周热量</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#C4B5A5]">
            日均摄入 <span className="font-semibold text-[#3D3226]">{avgCal}</span> kcal
          </span>
          {avgCal > 0 && (
            <span className={`font-semibold ${surplus > 0 ? 'text-[#D95959]' : 'text-green-600'}`}>
              {surplus > 0 ? `+${surplus}` : surplus}
            </span>
          )}
        </div>
      </div>

      {/* Sparkline chart */}
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" role="img" aria-label="7-day calorie trend">
        {/* Target line */}
        {avgTarget > 0 && (
          <>
            <line
              x1={0} y1={baseline - avgTarget * scale}
              x2={CHART_W} y2={baseline - avgTarget * scale}
              stroke="#E8DDD0"
              strokeWidth={1.5}
              strokeDasharray="6 3"
            />
            <text
              x={CHART_W - 4}
              y={baseline - avgTarget * scale - 5}
              textAnchor="end"
              fill="#C4B5A5"
              fontSize="9"
            >
              目标 {avgTarget}
            </text>
          </>
        )}

        {/* Bars */}
        {days.map((day, i) => {
          const x = startX + i * (barW + gap);
          const barH = Math.max(day.calories > 0 ? 3 : 0, day.calories * scale);
          const isFuture = day.date > new Date().toISOString().split('T')[0];

          return (
            <g key={day.date}>
              {/* Bar */}
              <rect
                x={x}
                y={baseline - barH}
                width={barW}
                height={barH}
                rx={4}
                fill={day.isToday ? '#D95959' : isFuture ? 'transparent' : '#EFE8DE'}
                className="transition-all duration-300"
              />
              {/* Day label */}
              <text
                x={x + barW / 2}
                y={CHART_H - 2}
                textAnchor="middle"
                fill={day.isToday ? '#D95959' : '#C4B5A5'}
                fontSize="10"
                fontWeight={day.isToday ? 'bold' : 'normal'}
              >
                {day.label}
              </text>
              {/* Calorie number */}
              {day.calories > 0 && (
                <text
                  x={x + barW / 2}
                  y={baseline - barH - 4}
                  textAnchor="middle"
                  fill={day.isToday ? '#D95959' : '#8A7B6B'}
                  fontSize="8"
                  fontWeight={day.isToday ? 'bold' : 'normal'}
                >
                  {day.calories}
                </text>
              )}
              {/* Future day: dash */}
              {isFuture && (
                <text
                  x={x + barW / 2}
                  y={baseline - 20}
                  textAnchor="middle"
                  fill="#D5CCC0"
                  fontSize="10"
                >
                  —
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-[#C4B5A5]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#EFE8DE]" /> 摄入
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 rounded border-t border-dashed border-[#E8DDD0]" /> 目标
        </span>
        {avgCal > 0 && (
          <span className={`${surplus > 0 ? 'text-[#D95959]' : 'text-green-600'}`}>
            {surplus > 0 ? '盈余' : '缺口'} {Math.abs(surplus)} kcal/天
          </span>
        )}
      </div>
    </div>
  );
}
