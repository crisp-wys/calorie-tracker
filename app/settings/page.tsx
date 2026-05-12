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
    <div className="p-4">
      <h1 className="text-lg font-bold mb-4">个人代谢画像</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">身高 (cm)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 p-3 text-base"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">体重 (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 p-3 text-base"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">年龄</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 p-3 text-base"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">性别</label>
          <div className="flex gap-2">
            {(['male', 'female'] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`flex-1 rounded-lg border p-3 text-sm transition-colors ${
                  gender === g
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {g === 'male' ? '男' : '女'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">活动等级</label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(Number(e.target.value) as ActivityLevel)}
            className="w-full rounded-lg border border-gray-200 p-3 text-base"
          >
            {(Object.entries(ACTIVITY_LABELS) as [string, string][]).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-green-50 p-4 text-center">
        <div className="text-sm text-green-700">
          TDEE: <span className="font-bold text-lg">{tdee}</span> kcal
        </div>
        <div className="text-sm text-green-700 mt-1">
          每日减脂目标: <span className="font-bold text-lg">{dailyTarget}</span> kcal
        </div>
      </div>

      <button
        onClick={handleSave}
        className="mt-4 w-full rounded-xl bg-green-500 p-3 font-bold text-white transition-colors active:bg-green-600"
      >
        {saved ? '已保存' : '保存设置'}
      </button>
    </div>
  );
}
