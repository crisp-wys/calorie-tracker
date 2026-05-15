'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import type { MealRecord, MealType } from '@/lib/types';
import { MEAL_LABELS } from '@/lib/types';
import { useApp } from '@/lib/AppContext';
import FoodCard from './FoodCard';

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
    <div className="rounded-2xl bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <button
        onClick={() => !emptyMeal && setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4"
      >
        <span className="font-medium text-sm">{MEAL_LABELS[mealType]}</span>
        <span className="text-sm text-gray-500">
          {emptyMeal ? (
            <Link
              href={`/camera?mealType=${mealType}`}
              className="text-gray-300 hover:text-brand transition-colors"
            >
              尚未记录
            </Link>
          ) : (
            <>
              {totalMin}-{totalMax} kcal
              <span className="ml-1 inline-block">{expanded ? <ChevronDown className="h-4 w-4 inline" /> : <ChevronRight className="h-4 w-4 inline" />}</span>
            </>
          )}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 space-y-3">
          {meals.map((meal) => (
            <div key={meal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {new Date(meal.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => handleDeleteMeal(meal.id)}
                  className="text-gray-300 hover:text-red-500"
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
