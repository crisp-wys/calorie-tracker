'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Salad } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { MEAL_LABELS, type MealType, type VisionFoodItem } from '@/lib/types';
import { visionToFoodItems } from '@/lib/nutrition';
import PhotoCapture from '@/components/PhotoCapture';
import FoodCard from '@/components/FoodCard';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
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
  const [result, setResult] = useState<{ foods: ReturnType<typeof visionToFoodItems>; totalMin: number; totalMax: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFoodOpen, setNotFoodOpen] = useState(false);
  const searchParams = useSearchParams();

  const [mealType, setMealType] = useState<MealType>(() => {
    const fromUrl = searchParams.get('mealType');
    if (fromUrl && ['breakfast', 'lunch', 'dinner', 'snack'].includes(fromUrl)) {
      return fromUrl as MealType;
    }
    return suggestMealType();
  });

  const [manualForm, setManualForm] = useState<{
    name: string; weight: number; calories: number;
    protein: number; carbs: number; fat: number;
  } | null>(null);

  const handleCapture = async (base64: string) => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_SCF_URL || 'https://calorie-vision-wkllwsxbqi.cn-hangzhou.fcapp.run';
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

      const visionFoods: VisionFoodItem[] = data.foods ?? [];

      if (visionFoods.length === 0) {
        setNotFoodOpen(true);
        return;
      }

      const foods = visionToFoodItems(visionFoods);

      setResult({
        foods,
        totalMin: foods.reduce((s, f) => s + f.caloriesMin, 0),
        totalMax: foods.reduce((s, f) => s + f.caloriesMax, 0),
      });
    } catch {
      setError('网络异常，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualForm || !manualForm.name.trim()) return;
    const food = {
      id: generateId(),
      name: manualForm.name.trim(),
      weight: manualForm.weight > 0 ? manualForm.weight : 100,
      caloriesMin: manualForm.calories,
      caloriesMax: manualForm.calories,
      protein: manualForm.protein || 0,
      carbs: manualForm.carbs || 0,
      fat: manualForm.fat || 0,
    };
    setResult({
      foods: [food],
      totalMin: food.caloriesMin,
      totalMax: food.caloriesMax,
    });
    setManualForm(null);
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
      totalCaloriesMin: result.totalMin,
      totalCaloriesMax: result.totalMax,
    };

    dispatch({ type: 'ADD_MEAL', meal });
    router.push('/');
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setManualForm(null);
  };

  if (!state.profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 space-y-4">
        <AlertTriangle className="h-10 w-10 text-yellow-500" />
        <p className="text-sm text-gray-500 text-center">请先在设置中填写个人代谢画像</p>
        <button
          onClick={() => router.push('/settings')}
          className="rounded-xl bg-brand px-6 py-2 text-sm font-medium text-white shadow-md shadow-brand/20 transition-all active:shadow-sm active:brightness-90"
        >
          前往设置
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-xl font-extrabold">拍照识别</h1>

      {!result && !error && !manualForm && (
        <PhotoCapture
          onCapture={handleCapture}
          onManual={() => setManualForm({ name: '', weight: 100, calories: 0, protein: 0, carbs: 0, fat: 0 })}
          loading={loading}
        />
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

          <div className="rounded-xl bg-brand/10 p-3 text-center text-sm text-brand font-medium">
            本餐合计: {result.totalMin}-{result.totalMax} kcal
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-2xl bg-brand p-4 font-bold text-white shadow-md shadow-brand/20 transition-all active:shadow-sm active:brightness-90"
            >
              确认记录
            </button>
            <button
              onClick={handleReset}
              className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-600"
            >
              重新拍摄
            </button>
          </div>
        </>
      )}

      {/* Manual entry form */}
      {manualForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/35" onClick={() => setManualForm(null)} />
          <div className="relative bg-white rounded-[20px] p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">手动输入</h3>
            <div className="space-y-3">
              <input
                placeholder="菜名"
                value={manualForm.name}
                onChange={e => setManualForm({ ...manualForm, name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-brand"
              />
              <input
                type="number"
                placeholder="重量 (g)"
                value={manualForm.weight}
                onChange={e => setManualForm({ ...manualForm, weight: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-brand"
              />
              <input
                type="number"
                placeholder="热量 (kcal)"
                value={manualForm.calories}
                onChange={e => setManualForm({ ...manualForm, calories: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-brand"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="蛋白质 (g)"
                  value={manualForm.protein}
                  onChange={e => setManualForm({ ...manualForm, protein: Number(e.target.value) })}
                  className="flex-1 rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-brand"
                />
                <input
                  type="number"
                  placeholder="碳水 (g)"
                  value={manualForm.carbs}
                  onChange={e => setManualForm({ ...manualForm, carbs: Number(e.target.value) })}
                  className="flex-1 rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-brand"
                />
                <input
                  type="number"
                  placeholder="脂肪 (g)"
                  value={manualForm.fat}
                  onChange={e => setManualForm({ ...manualForm, fat: Number(e.target.value) })}
                  className="flex-1 rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleManualSubmit}
                className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white active:brightness-90 transition-all"
              >
                添加到记录
              </button>
              <button
                onClick={() => setManualForm(null)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-500 active:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-food dialog */}
      {notFoodOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNotFoodOpen(false)} />
          <div className="relative bg-white rounded-[20px] p-7 w-full max-w-sm text-center shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
            <Salad className="h-14 w-14 mx-auto text-brand mb-3" />
            <h3 className="text-[17px] font-bold mb-1.5">未识别到食物</h3>
            <p className="text-[13px] text-gray-400 mb-5">这张图片中似乎没有食物，请重新拍摄或选择食物照片</p>
            <button
              onClick={() => { setNotFoodOpen(false); handleReset(); }}
              className="w-full py-3 rounded-xl bg-brand text-[15px] font-semibold text-white active:brightness-90 transition-all"
            >
              重新拍摄
            </button>
            <button
              onClick={() => setNotFoodOpen(false)}
              className="w-full py-2.5 mt-1.5 rounded-xl text-[13px] text-gray-400 active:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
