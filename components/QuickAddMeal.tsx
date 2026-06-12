'use client';

import { useState } from 'react';
import { X, Zap } from 'lucide-react';
import type { MealType, FoodItem } from '@/lib/types';
import { MEAL_LABELS } from '@/lib/types';
import { generateId } from '@/lib/utils';

interface PresetFood {
  name: string;
  weight: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const PRESETS: PresetFood[] = [
  { name: '鸡蛋', weight: 50, calories: 72, protein: 6, carbs: 1, fat: 5 },
  { name: '香蕉', weight: 120, calories: 112, protein: 1, carbs: 27, fat: 0 },
  { name: '牛奶(250ml)', weight: 250, calories: 135, protein: 8, carbs: 12, fat: 7 },
  { name: '白米饭(碗)', weight: 200, calories: 260, protein: 5, carbs: 58, fat: 1 },
  { name: '鸡胸肉(100g)', weight: 100, calories: 133, protein: 31, carbs: 0, fat: 3 },
  { name: '苹果', weight: 200, calories: 104, protein: 1, carbs: 28, fat: 0 },
  { name: '全麦面包(片)', weight: 40, calories: 100, protein: 4, carbs: 18, fat: 1 },
  { name: '酸奶(杯)', weight: 200, calories: 170, protein: 6, carbs: 23, fat: 6 },
];

interface QuickAddMealProps {
  open: boolean;
  mealType: MealType;
  date: string;
  onClose: () => void;
  onAdd: (food: FoodItem) => void;
}

export default function QuickAddMeal({ open, mealType, onClose, onAdd }: QuickAddMealProps) {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState(100);
  const [calories, setCalories] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);

  if (!open) return null;

  const isValid = name.trim() && weight > 0 && calories > 0;

  const handleSubmit = () => {
    if (!isValid) return;

    // Auto-fill macros from calories if not provided (30/40/30 split)
    const finalProtein = protein || Math.round(calories * 0.25 / 4);
    const finalCarbs = carbs || Math.round(calories * 0.45 / 4);
    const finalFat = fat || Math.round(calories * 0.30 / 9);

    const food: FoodItem = {
      id: generateId(),
      name: name.trim(),
      weight,
      caloriesMin: calories,
      caloriesMax: Math.round(calories * 1.1),
      protein: finalProtein,
      carbs: finalCarbs,
      fat: finalFat,
    };
    onAdd(food);
    // Reset form
    setName('');
    setWeight(100);
    setCalories(0);
    setProtein(0);
    setCarbs(0);
    setFat(0);
    setShowAdvanced(false);
  };

  const handlePreset = (preset: PresetFood) => {
    setName(preset.name);
    setWeight(preset.weight);
    setCalories(preset.calories);
    setProtein(preset.protein);
    setCarbs(preset.carbs);
    setFat(preset.fat);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#FFFBF6] rounded-t-[20px] px-5 pt-4 pb-7 animate-slide-up max-h-[85vh] overflow-y-auto">
        {/* Handle bar */}
        <div className="w-8 h-1 bg-[#E8DDD0] rounded-full mx-auto mb-3" />

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}>
            快速添加 · {MEAL_LABELS[mealType]}
          </h2>
          <button onClick={onClose} className="text-[#C4B5A5] hover:text-[#8A7B6B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preset foods */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 -mx-1 px-1 scrollbar-hide">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePreset(preset)}
              className="flex-shrink-0 rounded-xl bg-[#FAF6F0] border border-[#E8DDD0] px-3 py-2 text-xs text-[#3D3226] hover:border-[#D95959]/30 active:bg-[#EFE8DE] transition-colors text-left"
            >
              <div className="font-medium">{preset.name}</div>
              <div className="text-[#C4B5A5] mt-0.5">{preset.calories} kcal</div>
            </button>
          ))}
        </div>

        {/* Main fields */}
        <div className="space-y-2.5">
          <input
            type="text"
            placeholder="菜名（必填）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-3 text-sm focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="重量(g)"
              value={weight}
              min={1}
              onChange={(e) => setWeight(Math.max(1, Number(e.target.value)))}
              className="flex-1 rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-3 text-sm focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
            />
            <input
              type="number"
              placeholder="热量(kcal)"
              value={calories}
              min={0}
              onChange={(e) => setCalories(Math.max(0, Number(e.target.value)))}
              className="flex-1 rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-3 text-sm focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
            />
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-[#C4B5A5] hover:text-[#8A7B6B] flex items-center gap-1"
          >
            <Zap className="h-3 w-3" />
            {showAdvanced ? '收起高级选项' : '高级选项（蛋白质/碳水/脂肪）'}
          </button>

          {showAdvanced && (
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="蛋白质(g)"
                value={protein}
                min={0}
                onChange={(e) => setProtein(Math.max(0, Number(e.target.value)))}
                className="flex-1 rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-2.5 text-xs focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
              />
              <input
                type="number"
                placeholder="碳水(g)"
                value={carbs}
                min={0}
                onChange={(e) => setCarbs(Math.max(0, Number(e.target.value)))}
                className="flex-1 rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-2.5 text-xs focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
              />
              <input
                type="number"
                placeholder="脂肪(g)"
                value={fat}
                min={0}
                onChange={(e) => setFat(Math.max(0, Number(e.target.value)))}
                className="flex-1 rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-2.5 text-xs focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`mt-4 w-full rounded-2xl py-3.5 font-bold text-sm transition-all ${
            isValid
              ? 'bg-[#D95959] text-white shadow-md shadow-[#D95959]/20 active:shadow-sm active:brightness-90'
              : 'bg-[#C4B5A5] text-white cursor-not-allowed'
          }`}
        >
          添加
        </button>
      </div>
    </div>
  );
}
