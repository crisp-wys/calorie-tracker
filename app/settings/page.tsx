'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/AppContext';
import { buildProfile, calculateTDEE } from '@/lib/tdee';
import { ACTIVITY_LABELS, type Gender, type ActivityLevel } from '@/lib/types';

export default function SettingsPage() {
  const { state, dispatch } = useApp();

  const [height, setHeight] = useState(state.profile?.height ?? 170);
  const [weight, setWeight] = useState(state.profile?.weight ?? 70);
  const [age, setAge] = useState(state.profile?.age ?? 30);
  const [gender, setGender] = useState<Gender>(state.profile?.gender ?? 'male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    state.profile?.activityLevel ?? 1
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state.profile) {
      setHeight(state.profile.height);
      setWeight(state.profile.weight);
      setAge(state.profile.age);
      setGender(state.profile.gender);
      setActivityLevel(state.profile.activityLevel);
    }
  }, [state.profile]);

  const { tdee, dailyTarget } = calculateTDEE(height, weight, age, gender, activityLevel);

  const handleSave = () => {
    const profile = buildProfile(height, weight, age, gender, activityLevel);
    dispatch({ type: 'SET_PROFILE', profile });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-extrabold mb-6">个人代谢画像</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">身高 (cm)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-base transition-colors focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">体重 (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-base transition-colors focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">年龄</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-base transition-colors focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">性别</label>
          <div className="flex gap-2">
            {(['male', 'female'] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`flex-1 rounded-xl border p-3.5 text-sm font-medium transition-all ${
                  gender === g
                    ? 'border-brand bg-brand/10 text-brand shadow-sm shadow-brand/10'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {g === 'male' ? '男' : '女'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">活动等级</label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(Number(e.target.value) as ActivityLevel)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-base transition-colors focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10"
          >
            {(Object.entries(ACTIVITY_LABELS) as [string, string][]).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-brand/10 p-5 text-center">
        <div className="text-sm text-brand">
          TDEE: <span className="font-bold text-lg">{tdee}</span> kcal
        </div>
        <div className="text-sm text-brand mt-1">
          每日减脂目标: <span className="font-bold text-lg">{dailyTarget}</span> kcal
        </div>
      </div>

      <button
        onClick={handleSave}
        className="mt-4 w-full rounded-2xl bg-brand p-4 font-bold text-white shadow-md shadow-brand/20 transition-all active:shadow-sm active:brightness-90"
      >
        {saved ? '已保存' : '保存设置'}
      </button>
    </div>
  );
}
