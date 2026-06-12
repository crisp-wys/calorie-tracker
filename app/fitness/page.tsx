'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/AppContext';
import { getLocalDateString } from '@/lib/utils';
import { BODY_PARTS, calcStrengthCalories, calcCardioCalories, sumTodayWorkoutCalories } from '@/lib/workout-utils';
import { calcDynamicTarget } from '@/lib/tdee';
import { Trash2 } from 'lucide-react';
import type { WorkoutRecord } from '@/lib/types';

export default function FitnessPage() {
  const { state, dispatch } = useApp();
  const profile = state.profile;
  const today = getLocalDateString();

  // Form state
  const [selectedPart, setSelectedPart] = useState<string>(BODY_PARTS[0].key);
  const [selectedExercise, setSelectedExercise] = useState<string>(BODY_PARTS[0].exercises[0].name);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState(20);
  const [duration, setDuration] = useState(30);
  const [added, setAdded] = useState(false);

  const bodyWeight = profile?.weight ?? 70;

  // Today's workouts
  const todayWorkouts = useMemo(
    () => state.workouts.filter((w) => w.date === today),
    [state.workouts, today]
  );

  const todayExerciseCals = useMemo(
    () => sumTodayWorkoutCalories(state.workouts),
    [state.workouts]
  );

  const { effectiveTarget } = useMemo(() => {
    const baseTarget = profile?.dailyTarget ?? 2000;
    return calcDynamicTarget(baseTarget, todayExerciseCals);
  }, [profile?.dailyTarget, todayExerciseCals]);

  const selectedBodyPart = BODY_PARTS.find((bp) => bp.key === selectedPart)!;
  const isCardio = selectedPart === '有氧';

  // Find the last workout for the selected exercise (before today)
  const lastWorkout = useMemo(() => {
    const sorted = state.workouts
      .filter((w) => w.exercise === selectedExercise && w.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0] ?? null;
  }, [state.workouts, selectedExercise, today]);

  const daysSince = lastWorkout
    ? Math.floor((Date.now() - new Date(lastWorkout.date).getTime()) / 86400000)
    : 0;

  const handlePartSelect = (key: string) => {
    setSelectedPart(key);
    const bp = BODY_PARTS.find((b) => b.key === key)!;
    setSelectedExercise(bp.exercises[0].name);
  };

  const handleAdd = () => {
    let calories: number;
    let dur: number;

    if (isCardio) {
      calories = calcCardioCalories(selectedExercise, duration, bodyWeight);
      dur = duration;
    } else {
      const result = calcStrengthCalories(selectedExercise, sets, reps, weightKg, bodyWeight);
      calories = result.calories;
      dur = result.duration;
    }

    const workout: WorkoutRecord = {
      id: crypto.randomUUID(),
      date: today,
      bodyPart: selectedPart,
      exercise: selectedExercise,
      sets: isCardio ? 0 : sets,
      reps: isCardio ? 0 : reps,
      weight: isCardio ? 0 : weightKg,
      duration: dur,
      calories,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_WORKOUT', workout });
    // Reset form to defaults
    setSets(3);
    setReps(10);
    setWeightKg(20);
    setDuration(30);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_WORKOUT', id });
  };

  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-xl font-extrabold"
          style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}
        >
          健身
        </h1>
        <span className="text-sm text-[#C4B5A5]">{today}</span>
      </div>

      {/* Daily summary */}
      <div className="rounded-2xl bg-[#FFFBF6] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-xs text-[#C4B5A5] mb-1">今日运动消耗</p>
            <p className="text-2xl font-bold text-[#D95959]">{todayExerciseCals} kcal</p>
          </div>
          <div className="w-px h-10 bg-[#E8DDD0]" />
          <div className="text-center flex-1">
            <p className="text-xs text-[#C4B5A5] mb-1">动态目标</p>
            <p className="text-2xl font-bold text-[#3D3226]">{effectiveTarget} kcal</p>
          </div>
        </div>
      </div>

      {/* Add workout form */}
      <div className="rounded-2xl bg-[#FFFBF6] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <h2 className="text-sm font-semibold text-[#8A7B6B] mb-3">新增运动</h2>

        {/* Body part chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-1 px-1 scrollbar-hide">
          {BODY_PARTS.map((bp) => (
            <button
              key={bp.key}
              onClick={() => handlePartSelect(bp.key)}
              className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium transition-all ${
                selectedPart === bp.key
                  ? 'bg-[#D95959] text-white shadow-sm shadow-[#D95959]/20'
                  : 'bg-[#FAF6F0] text-[#8A7B6B] border border-[#E8DDD0] hover:border-[#D95959]/30'
              }`}
            >
              {bp.emoji} {bp.label}
            </button>
          ))}
        </div>

        {/* Exercise selector */}
        <div className="mb-3">
          <label className="block text-xs text-[#C4B5A5] mb-1.5">动作</label>
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="w-full rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-3 text-sm transition-colors focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
          >
            {selectedBodyPart.exercises.map((ex) => (
              <option key={ex.name} value={ex.name}>
                {ex.name} ({ex.met} MET)
              </option>
            ))}
          </select>
        </div>

        {/* Last workout hint */}
        {lastWorkout && !isCardio && (
          <div className="mb-4 rounded-xl bg-[#FAF6F0] border border-[#E8DDD0] px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#C4B5A5]">
                上次：{daysSince === 0 ? '昨天' : `${daysSince}天前`}
              </span>
              <span className="text-xs font-medium text-[#3D3226]">
                {lastWorkout.sets}组×{lastWorkout.reps}次
                {lastWorkout.weight > 0 ? `×${lastWorkout.weight}kg` : '自重'}
              </span>
            </div>
            {/* Progressive overload delta */}
            {lastWorkout.weight > 0 && weightKg > 0 && weightKg !== lastWorkout.weight && (
              <div className="mt-1 text-[11px] font-semibold">
                {weightKg > lastWorkout.weight ? (
                  <span className="text-green-600">重量 +{weightKg - lastWorkout.weight}kg 🔥</span>
                ) : (
                  <span className="text-[#8A7B6B]">重量 -{lastWorkout.weight - weightKg}kg</span>
                )}
              </div>
            )}
            {lastWorkout.reps !== reps && lastWorkout.sets === sets && (
              <div className="mt-0.5 text-[11px] font-semibold">
                {reps > lastWorkout.reps ? (
                  <span className="text-green-600">次数 +{reps - lastWorkout.reps} 🔥</span>
                ) : (
                  <span className="text-[#8A7B6B]">次数 -{lastWorkout.reps - reps}</span>
                )}
              </div>
            )}
            {lastWorkout.sets > 0 && sets > lastWorkout.sets && (
              <div className="mt-0.5 text-[11px] font-semibold text-green-600">
                组数 +{sets - lastWorkout.sets} 🔥
              </div>
            )}
          </div>
        )}

        {/* Last cardio hint */}
        {lastWorkout && isCardio && (
          <div className="mb-4 rounded-xl bg-[#FAF6F0] border border-[#E8DDD0] px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#C4B5A5]">
                上次：{daysSince === 0 ? '昨天' : `${daysSince}天前`}
              </span>
              <span className="text-xs font-medium text-[#3D3226]">
                {lastWorkout.duration}分钟 · {lastWorkout.calories} kcal
              </span>
            </div>
          </div>
        )}

        {/* Input fields: strength vs cardio */}
        {isCardio ? (
          <div className="mb-4">
            <label className="block text-xs text-[#C4B5A5] mb-1.5">时长 (分钟)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-3 text-sm transition-colors focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
            />
            <p className="text-xs text-[#C4B5A5] mt-1">
              预估消耗: {calcCardioCalories(selectedExercise, duration, bodyWeight)} kcal
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div>
              <label className="block text-xs text-[#C4B5A5] mb-1.5">组数</label>
              <input
                type="number"
                value={sets}
                onChange={(e) => setSets(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-3 text-sm transition-colors focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
              />
            </div>
            <div>
              <label className="block text-xs text-[#C4B5A5] mb-1.5">次数</label>
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-3 text-sm transition-colors focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
              />
            </div>
            <div>
              <label className="block text-xs text-[#C4B5A5] mb-1.5">重量 kg</label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-3 text-sm transition-colors focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
              />
            </div>
          </div>
        )}

        {/* Add button */}
        <button
          onClick={handleAdd}
          className="w-full rounded-2xl bg-[#D95959] p-3.5 font-bold text-white shadow-md shadow-[#D95959]/20 transition-all active:shadow-sm active:brightness-90 text-sm"
        >
          {added ? '已添加 ✓' : `添加${isCardio ? '有氧' : '力量'}记录`}
        </button>
      </div>

      {/* Today's workout list */}
      <div className="rounded-2xl bg-[#FFFBF6] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <h2 className="text-sm font-semibold text-[#8A7B6B] mb-3">
          今日运动记录
          {todayWorkouts.length > 0 && (
            <span className="ml-1.5 text-xs text-[#C4B5A5] font-normal">({todayWorkouts.length})</span>
          )}
        </h2>

        {todayWorkouts.length === 0 ? (
          <p className="text-sm text-[#C4B5A5] text-center py-6">今天还没有运动记录</p>
        ) : (
          <div className="space-y-2">
            {todayWorkouts.map((w) => {
              const bp = BODY_PARTS.find((b) => b.key === w.bodyPart);
              const detail =
                w.bodyPart === '有氧'
                  ? `${w.duration}分钟`
                  : `${w.sets}组×${w.reps}次${w.weight > 0 ? `×${w.weight}kg` : '自重'}`;
              return (
                <div
                  key={w.id}
                  className="flex items-center gap-3 rounded-xl bg-[#FAF6F0] px-3.5 py-3"
                >
                  <span className="text-lg flex-shrink-0">{bp?.emoji ?? '🏋️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#3D3226] truncate">{w.exercise}</p>
                    <p className="text-xs text-[#C4B5A5]">
                      {detail} · {w.calories} kcal
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="flex-shrink-0 h-8 w-8 rounded-lg hover:bg-[#EFE8DE] flex items-center justify-center text-[#C4B5A5] hover:text-[#D95959] transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
