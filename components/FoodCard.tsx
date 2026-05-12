'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { FoodItem } from '@/lib/types';
import { useApp } from '@/lib/AppContext';

interface FoodCardProps {
  food: FoodItem;
  mealId: string;
  readonly?: boolean;
}

export default function FoodCard({ food, mealId, readonly = false }: FoodCardProps) {
  const { dispatch } = useApp();
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState(food);

  const handleSave = () => {
    dispatch({ type: 'UPDATE_FOOD', mealId, food: edit });
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="rounded-lg border border-gray-100 p-3 text-sm group">
        <div className="flex items-center justify-between">
          <span className="font-medium">{food.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">约 {food.weight}g</span>
            {!readonly && (
              <button
                onClick={() => setEditing(true)}
                className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-1 flex gap-3 text-xs text-gray-400">
          <span>{food.caloriesMin}-{food.caloriesMax} kcal</span>
          <span>蛋白 {food.protein}g</span>
          <span>碳水 {food.carbs}g</span>
          <span>脂肪 {food.fat}g</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-green-300 bg-green-50/50 p-3 text-sm space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-400">菜名</label>
          <input
            value={edit.name}
            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            className="w-full rounded border border-gray-200 p-1.5 text-sm"
          />
        </div>
        <div className="w-20">
          <label className="text-xs text-gray-400">重量(g)</label>
          <input
            type="number"
            value={edit.weight}
            onChange={(e) => setEdit({ ...edit, weight: Number(e.target.value) })}
            className="w-full rounded border border-gray-200 p-1.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-400">热量下限</label>
          <input
            type="number"
            value={edit.caloriesMin}
            onChange={(e) => setEdit({ ...edit, caloriesMin: Number(e.target.value) })}
            className="w-full rounded border border-gray-200 p-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400">热量上限</label>
          <input
            type="number"
            value={edit.caloriesMax}
            onChange={(e) => setEdit({ ...edit, caloriesMax: Number(e.target.value) })}
            className="w-full rounded border border-gray-200 p-1.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-400">蛋白(g)</label>
          <input
            type="number"
            value={edit.protein}
            onChange={(e) => setEdit({ ...edit, protein: Number(e.target.value) })}
            className="w-full rounded border border-gray-200 p-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400">碳水(g)</label>
          <input
            type="number"
            value={edit.carbs}
            onChange={(e) => setEdit({ ...edit, carbs: Number(e.target.value) })}
            className="w-full rounded border border-gray-200 p-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400">脂肪(g)</label>
          <input
            type="number"
            value={edit.fat}
            onChange={(e) => setEdit({ ...edit, fat: Number(e.target.value) })}
            className="w-full rounded border border-gray-200 p-1.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 rounded bg-green-500 py-1.5 text-xs font-medium text-white"
        >
          确认
        </button>
        <button
          onClick={() => setEditing(false)}
          className="flex-1 rounded bg-gray-200 py-1.5 text-xs font-medium text-gray-600"
        >
          取消
        </button>
      </div>
    </div>
  );
}
