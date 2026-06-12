'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import type { MealRecord, MealType } from '@/lib/types';
import { MEAL_LABELS } from '@/lib/types';
import { useApp } from '@/lib/AppContext';
import FoodCard from './FoodCard';

const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '🌞',
  dinner: '🌙',
  snack: '🍪',
};

interface MealSectionProps {
  mealType: MealType;
  meals: MealRecord[];
  date: string;
}

export default function MealSection({ mealType, meals, date }: MealSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const { dispatch } = useApp();

  const emptyMeal = meals.length === 0;
  const totalMin = meals.reduce((s, m) => s + m.totalCaloriesMin, 0);
  const totalMax = meals.reduce((s, m) => s + m.totalCaloriesMax, 0);

  const handleDeleteMeal = (id: string) => {
    dispatch({ type: 'DELETE_MEAL', id });
  };

  return (
    <div className={`rounded-2xl bg-[#FFFBF6] transition-shadow ${
      emptyMeal ? 'border border-dashed border-[#E8DDD0]' : ''
    }`}>
      {emptyMeal ? (
        <Link
          href={`/camera?mealType=${mealType}`}
          className="flex w-full items-center justify-between p-4"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{MEAL_EMOJIS[mealType]}</span>
            <span
              className="font-medium text-sm"
              style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}
            >
              {MEAL_LABELS[mealType]}
            </span>
          </div>
          <span className="text-sm text-[#C4B5A5] hover:text-[#D95959] transition-colors">尚未记录</span>
        </Link>
      ) : (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between p-4"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{MEAL_EMOJIS[mealType]}</span>
            <div className="text-left">
              <span
                className="font-medium text-sm"
                style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}
              >
                {MEAL_LABELS[mealType]}
              </span>
              {!expanded && (
                <div className="text-[11px] text-[#C4B5A5] mt-0.5">
                  {meals[0]?.foods?.slice(0, 3).map(f => f.name).join(' · ') || ''}
                </div>
              )}
            </div>
          </div>
          <span className="text-sm text-[#C4B5A5]">
            {totalMin}-{totalMax} kcal
            <span className="ml-1 inline-block">
              {expanded ? <ChevronDown className="h-4 w-4 inline" /> : <ChevronRight className="h-4 w-4 inline" />}
            </span>
          </span>
        </button>
      )}

      {expanded && (
        <div className="border-t border-[#E8DDD0] px-4 pb-4 space-y-3">
          {meals.map((meal) => (
            <div key={meal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#C4B5A5]">
                  {new Date(meal.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => handleDeleteMeal(meal.id)}
                  className="text-[#C4B5A5] hover:text-[#D95959]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {meal.foods.map((food) => (
                <FoodCard key={food.id} food={food} mealId={meal.id} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
