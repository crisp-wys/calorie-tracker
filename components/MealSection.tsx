'use client';

import { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Trash2, Plus, Copy } from 'lucide-react';
import type { MealRecord, MealType, FoodItem } from '@/lib/types';
import { MEAL_LABELS } from '@/lib/types';
import { useApp } from '@/lib/AppContext';
import { generateId, getLocalDateString } from '@/lib/utils';
import FoodCard from './FoodCard';
import QuickAddMeal from './QuickAddMeal';
import UndoToast from './UndoToast';

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
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [undo, setUndo] = useState<{ type: 'meal'; record: MealRecord } | { type: 'food'; mealId: string; food: FoodItem } | null>(null);
  const { state, dispatch } = useApp();

  const emptyMeal = meals.length === 0;
  const totalMin = meals.reduce((s, m) => s + m.totalCaloriesMin, 0);
  const totalMax = meals.reduce((s, m) => s + m.totalCaloriesMax, 0);

  // Find yesterday's same mealType for quick copy
  const yesterdayMeal = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = getLocalDateString(d);
    const yMeals = state.meals.filter((m) => m.date === yesterday && m.mealType === mealType);
    return yMeals.length > 0 ? yMeals : null;
  }, [state.meals, mealType]);

  const handleDeleteMeal = (meal: MealRecord) => {
    setUndo({ type: 'meal', record: meal });
    dispatch({ type: 'DELETE_MEAL', id: meal.id });
  };

  const handleUndo = () => {
    if (!undo) return;
    if (undo.type === 'meal') {
      dispatch({ type: 'ADD_MEAL', meal: undo.record });
    } else {
      // Re-add food to meal
      const meal = state.meals.find((m) => m.id === undo.mealId);
      if (meal) {
        const updatedFoods = [...meal.foods, undo.food];
        const totalMin = updatedFoods.reduce((s, f) => s + f.caloriesMin, 0);
        const totalMax = updatedFoods.reduce((s, f) => s + f.caloriesMax, 0);
        dispatch({
          type: 'UPDATE_MEAL',
          meal: { ...meal, foods: updatedFoods, totalCaloriesMin: totalMin, totalCaloriesMax: totalMax },
        });
      }
    }
    setUndo(null);
  };

  const handleQuickAdd = (food: FoodItem) => {
    const meal: MealRecord = {
      id: generateId(),
      date,
      mealType,
      createdAt: new Date().toISOString(),
      foods: [food],
      totalCaloriesMin: food.caloriesMin,
      totalCaloriesMax: food.caloriesMax,
    };
    dispatch({ type: 'ADD_MEAL', meal });
    setShowQuickAdd(false);
  };

  const handleCopyYesterday = () => {
    if (!yesterdayMeal) return;
    for (const meal of yesterdayMeal) {
      const clone: MealRecord = {
        ...meal,
        id: generateId(),
        date,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_MEAL', meal: clone });
    }
  };

  return (
    <>
      <div className={`rounded-2xl bg-[#FFFBF6] transition-shadow ${
        emptyMeal ? 'border border-dashed border-[#E8DDD0]' : ''
      }`}>
        {/* Empty state */}
        {emptyMeal ? (
          <div>
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
            {/* Quick actions for empty meal */}
            <div className="flex items-center gap-2 px-4 pb-3">
              <button
                onClick={() => setShowQuickAdd(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] py-2 text-xs text-[#8A7B6B] hover:border-[#D95959]/30 hover:text-[#D95959] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> 快速添加
              </button>
              {yesterdayMeal && (
                <button
                  onClick={handleCopyYesterday}
                  className="flex items-center justify-center gap-1 rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] px-3 py-2 text-xs text-[#8A7B6B] hover:border-[#D95959]/30 hover:text-[#D95959] transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  <span className="hidden sm:inline">昨天</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between p-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{MEAL_EMOJIS[mealType]}</span>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-medium text-sm"
                    style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}
                  >
                    {MEAL_LABELS[mealType]}
                  </span>
                </div>
                {!expanded && (
                  <div className="text-[11px] text-[#C4B5A5] mt-0.5">
                    {(meals[0]?.foods?.slice(0, 3).map(f => f.name).join(' · ') || '')}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#C4B5A5]">
                {totalMin}-{totalMax} kcal
              </span>
              <span>
                {expanded ? <ChevronDown className="h-4 w-4 inline text-[#C4B5A5]" /> : <ChevronRight className="h-4 w-4 inline text-[#C4B5A5]" />}
              </span>
            </div>
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
                    onClick={() => handleDeleteMeal(meal)}
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
            {/* Quick add inside expanded section */}
            <button
              onClick={() => setShowQuickAdd(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E8DDD0] py-2.5 text-xs text-[#C4B5A5] hover:border-[#D95959]/30 hover:text-[#D95959] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> 添加食物
            </button>
          </div>
        )}
      </div>

      {/* Quick add popup */}
      <QuickAddMeal
        open={showQuickAdd}
        mealType={mealType}
        date={date}
        onClose={() => setShowQuickAdd(false)}
        onAdd={handleQuickAdd}
      />

      {/* Undo toast */}
      {undo && (
        <UndoToast
          message={undo.type === 'meal' ? '已删除一餐' : '已删除食物'}
          onUndo={handleUndo}
          onDismiss={() => setUndo(null)}
        />
      )}
    </>
  );
}
