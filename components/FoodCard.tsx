'use client';

import type { FoodItem } from '@/lib/types';

interface FoodCardProps {
  food: FoodItem;
  mealId: string;
  readonly?: boolean;
}

export default function FoodCard({ food, mealId, readonly = false }: FoodCardProps) {
  return (
    <div className="rounded-lg border border-gray-100 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{food.name}</span>
        <span className="text-gray-500">约 {food.weight}g</span>
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
