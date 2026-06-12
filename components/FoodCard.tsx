'use client';

import { memo, useState } from 'react';
import { Pencil } from 'lucide-react';
import type { FoodItem } from '@/lib/types';
import { useApp } from '@/lib/AppContext';

interface FoodCardProps {
  food: FoodItem;
  mealId: string;
  readonly?: boolean;
  onEdit?: (food: FoodItem) => void;
}

const FoodCard = memo(function FoodCard({ food, mealId, readonly = false, onEdit }: FoodCardProps) {
  const { dispatch } = useApp();
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState(food);

  const handleSave = () => {
    if (onEdit) {
      onEdit(edit);
    } else {
      dispatch({ type: 'UPDATE_FOOD', mealId, food: edit });
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="rounded-lg border border-[#E8DDD0] bg-[#FFFBF6] p-3 text-sm group hover:border-[#D5CCC0] transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-medium" style={{ color: '#3D3226' }}>{food.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-[#C4B5A5]">约 {food.weight}g</span>
            {!readonly && (
              <button
                onClick={() => setEditing(true)}
                className="text-[#C4B5A5] opacity-60 active:opacity-100 hover:opacity-100 transition-opacity"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-1 flex gap-3 text-xs text-[#C4B5A5]">
          <span>{food.caloriesMin}-{food.caloriesMax} kcal</span>
          <span>蛋白 {food.protein}g</span>
          <span>碳水 {food.carbs}g</span>
          <span>脂肪 {food.fat}g</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-[#D95959]/30 bg-[#D95959]/5 p-3 text-sm space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-[#C4B5A5]">菜名</label>
          <input
            value={edit.name}
            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            className="w-full rounded border border-[#E8DDD0] p-1.5 text-sm"
          />
        </div>
        <div className="w-20">
          <label className="text-xs text-[#C4B5A5]">重量(g)</label>
          <input
            type="number"
            value={edit.weight}
            onChange={(e) => setEdit({ ...edit, weight: Number(e.target.value) })}
            className="w-full rounded border border-[#E8DDD0] p-1.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-[#C4B5A5]">热量下限</label>
          <input
            type="number"
            value={edit.caloriesMin}
            onChange={(e) => setEdit({ ...edit, caloriesMin: Number(e.target.value) })}
            className="w-full rounded border border-[#E8DDD0] p-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-[#C4B5A5]">热量上限</label>
          <input
            type="number"
            value={edit.caloriesMax}
            onChange={(e) => setEdit({ ...edit, caloriesMax: Number(e.target.value) })}
            className="w-full rounded border border-[#E8DDD0] p-1.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-[#C4B5A5]">蛋白(g)</label>
          <input
            type="number"
            value={edit.protein}
            onChange={(e) => setEdit({ ...edit, protein: Number(e.target.value) })}
            className="w-full rounded border border-[#E8DDD0] p-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-[#C4B5A5]">碳水(g)</label>
          <input
            type="number"
            value={edit.carbs}
            onChange={(e) => setEdit({ ...edit, carbs: Number(e.target.value) })}
            className="w-full rounded border border-[#E8DDD0] p-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-[#C4B5A5]">脂肪(g)</label>
          <input
            type="number"
            value={edit.fat}
            onChange={(e) => setEdit({ ...edit, fat: Number(e.target.value) })}
            className="w-full rounded border border-[#E8DDD0] p-1.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 rounded bg-[#D95959] py-1.5 text-xs font-medium text-white"
        >
          确认
        </button>
        <button
          onClick={() => setEditing(false)}
          className="flex-1 rounded bg-[#EFE8DE] py-1.5 text-xs font-medium text-[#8A7B6B]"
        >
          取消
        </button>
      </div>
    </div>
  );
});

export default FoodCard;
