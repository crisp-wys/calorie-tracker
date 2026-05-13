'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { MEAL_LABELS, type MealType, type FoodItem } from '@/lib/types';
import PhotoCapture from '@/components/PhotoCapture';
import FoodCard from '@/components/FoodCard';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface VisionResult {
  foods: FoodItem[];
  totalCaloriesMin: number;
  totalCaloriesMax: number;
}

function suggestMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'snack';
  return 'dinner';
}

export default function CameraPage() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>(suggestMealType());

  const handleCapture = async (base64: string) => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_SCF_URL || '/api/vision';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mealType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '识别失败');
        return;
      }

      const foods: FoodItem[] = (data.foods ?? []).map((f: FoodItem) => ({
        ...f,
        id: generateId(),
      }));

      setResult({
        foods,
        totalCaloriesMin: data.totalCaloriesMin ?? foods.reduce((s, f) => s + f.caloriesMin, 0),
        totalCaloriesMax: data.totalCaloriesMax ?? foods.reduce((s, f) => s + f.caloriesMax, 0),
      });
    } catch {
      setError('网络异常，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!result) return;

    const date = new Date().toISOString().split('T')[0];
    const meal = {
      id: generateId(),
      date,
      mealType,
      createdAt: new Date().toISOString(),
      foods: result.foods,
      totalCaloriesMin: result.totalCaloriesMin,
      totalCaloriesMax: result.totalCaloriesMax,
    };

    dispatch({ type: 'ADD_MEAL', meal });
    router.push('/');
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  if (!state.profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 space-y-4">
        <AlertTriangle className="h-10 w-10 text-yellow-500" />
        <p className="text-sm text-gray-500 text-center">请先在设置中填写个人代谢画像</p>
        <button
          onClick={() => router.push('/settings')}
          className="rounded-xl bg-green-500 px-6 py-2 text-sm font-medium text-white"
        >
          前往设置
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold">拍照识别</h1>

      {!result && !error && (
        <PhotoCapture onCapture={handleCapture} loading={loading} />
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-6 text-center space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={handleReset}
            className="rounded-lg bg-red-500 px-6 py-2 text-sm font-medium text-white"
          >
            重新拍摄
          </button>
        </div>
      )}

      {result && (
        <>
          <div>
            <label className="text-sm text-gray-500 mb-1 block">选择餐次</label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="w-full rounded-lg border border-gray-200 p-3 text-base"
            >
              {MEAL_ORDER.map((mt) => (
                <option key={mt} value={mt}>{MEAL_LABELS[mt]}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {result.foods.map((food) => (
              <FoodCard key={food.id} food={food} mealId="" readonly />
            ))}
          </div>

          <div className="rounded-xl bg-green-50 p-3 text-center text-sm text-green-700 font-medium">
            本餐合计: {result.totalCaloriesMin}-{result.totalCaloriesMax} kcal
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-xl bg-green-500 p-3 font-bold text-white transition-colors active:bg-green-600"
            >
              确认记录
            </button>
            <button
              onClick={handleReset}
              className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-500"
            >
              重新拍摄
            </button>
          </div>
        </>
      )}
    </div>
  );
}
