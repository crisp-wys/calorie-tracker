'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { buildProfile, calculateTDEE, type GoalType, GOAL_LABELS } from '@/lib/tdee';
import { ACTIVITY_LABELS, type Gender, type ActivityLevel } from '@/lib/types';

export default function SettingsPage() {
  const { state, dispatch } = useApp();
  const router = useRouter();

  const [height, setHeight] = useState(state.profile?.height ?? 170);
  const [weight, setWeight] = useState(state.profile?.weight ?? 70);
  const [age, setAge] = useState(state.profile?.age ?? 30);
  const [gender, setGender] = useState<Gender>(state.profile?.gender ?? 'male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    state.profile?.activityLevel ?? 1
  );
  const [goalType, setGoalType] = useState<GoalType>(
    state.profile?.goalType ?? 'lose'
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state.profile) {
      setHeight(state.profile.height);
      setWeight(state.profile.weight);
      setAge(state.profile.age);
      setGender(state.profile.gender);
      setActivityLevel(state.profile.activityLevel);
      setGoalType(state.profile.goalType ?? 'lose');
    }
  }, [state.profile]);

  const { tdee, dailyTarget } = calculateTDEE(height, weight, age, gender, activityLevel, goalType);

  const handleSave = () => {
    const profile = buildProfile(height, weight, age, gender, activityLevel, goalType);
    dispatch({ type: 'SET_PROFILE', profile });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header with back arrow */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/calendar')}
          className="h-9 w-9 rounded-xl bg-[#FAF6F0] border border-[#E8DDD0] flex items-center justify-center text-[#8A7B6B] hover:text-[#D95959] hover:border-[#D95959]/30 transition-colors"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="text-xl font-extrabold" style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}>
          个人代谢画像
        </h1>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#8A7B6B] mb-1.5">身高 (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-3 text-base transition-colors focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#8A7B6B] mb-1.5">体重 (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-3 text-base transition-colors focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#8A7B6B] mb-1.5">年龄</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-3 text-base transition-colors focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#8A7B6B] mb-1.5">性别</label>
          <div className="flex gap-2">
            {(['male', 'female'] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`flex-1 rounded-xl border p-3 text-sm font-medium transition-all ${
                  gender === g
                    ? 'border-[#D95959] bg-[#D95959]/10 text-[#D95959] shadow-sm shadow-[#D95959]/10'
                    : 'border-[#E8DDD0] text-[#8A7B6B] hover:border-gray-300'
                }`}
              >
                {g === 'male' ? '男' : '女'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#8A7B6B] mb-1.5">活动等级</label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(Number(e.target.value) as ActivityLevel)}
            className="w-full rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] p-3 text-base transition-colors focus:bg-white focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
          >
            {(Object.entries(ACTIVITY_LABELS) as [string, string][]).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#8A7B6B] mb-1.5">目标</label>
          <div className="flex gap-2">
            {(Object.entries(GOAL_LABELS) as [string, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setGoalType(val as GoalType)}
                className={`flex-1 rounded-xl border p-3 text-sm font-medium transition-all ${
                  goalType === val
                    ? 'border-[#D95959] bg-[#D95959]/10 text-[#D95959] shadow-sm shadow-[#D95959]/10'
                    : 'border-[#E8DDD0] text-[#8A7B6B] hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-[#D95959]/10 p-5 text-center">
        <div className="text-sm text-[#D95959]">
          TDEE: <span className="font-bold text-lg">{tdee}</span> kcal
        </div>
        <div className="text-sm text-[#D95959] mt-1">
          每日{GOAL_LABELS[goalType]}目标: <span className="font-bold text-lg">{dailyTarget}</span> kcal
        </div>
      </div>

      <button
        onClick={handleSave}
        className="mt-4 w-full rounded-2xl bg-[#D95959] p-4 font-bold text-white shadow-md shadow-[#D95959]/20 transition-all active:shadow-sm active:brightness-90"
      >
        {saved ? '已保存' : '保存设置'}
      </button>
    </div>
  );
}
