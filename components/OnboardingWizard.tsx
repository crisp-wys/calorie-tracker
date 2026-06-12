'use client';

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { buildProfile, calculateTDEE, type GoalType, GOAL_OFFSETS, GOAL_LABELS } from '@/lib/tdee';
import { ACTIVITY_LABELS, type Gender, type ActivityLevel } from '@/lib/types';

const STEPS = ['欢迎', '身体数据', '目标确认'];

const GOAL_OPTIONS: { type: GoalType; emoji: string; desc: string }[] = [
  { type: 'lose', emoji: '🔥', desc: '每日热量缺口 500kcal\n适合减脂期' },
  { type: 'maintain', emoji: '⚖️', desc: '保持当前体重\n摄入 = 消耗' },
  { type: 'gain', emoji: '💪', desc: '每日热量盈余 300kcal\n适合增肌期' },
];

export default function OnboardingWizard() {
  const { dispatch } = useApp();
  const [step, setStep] = useState(0);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState<Gender>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(1);
  const [goalType, setGoalType] = useState<GoalType>('lose');

  const { tdee, dailyTarget } = calculateTDEE(height, weight, age, gender, activityLevel, goalType);

  const heightOk = height >= 100 && height <= 250;
  const weightOk = weight >= 30 && weight <= 300;
  const ageOk = age >= 10 && age <= 120;
  const metricsValid = heightOk && weightOk && ageOk;

  const handleComplete = () => {
    const profile = buildProfile(height, weight, age, gender, activityLevel, goalType);
    dispatch({ type: 'SET_PROFILE', profile });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#FAF6F0] overflow-y-auto"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(196,166,138,0.08), transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(217,89,89,0.04), transparent 50%)
        `,
        backgroundSize: '100% 100%',
      }}
    >
      {/* Progress dots */}
      <div className="pt-10 pb-2 flex justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                i <= step ? 'w-6 bg-[#D95959]' : 'w-2 bg-[#E8DDD0]'
              }`}
            />
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 ${i < step ? 'bg-[#D95959]/40' : 'bg-[#E8DDD0]'}`} />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-[#C4B5A5] mb-4">
        {STEPS[step]}
      </p>

      {/* Step 1: Welcome */}
      {step === 0 && (
        <div className="flex-1 flex flex-col animate-slide-up">
          <div className="pt-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-1">
              <h1
                className="text-5xl text-[#3D3226]"
                style={{ fontFamily: 'var(--font-zcool-kuai-le)' }}
              >
                这顿不算
              </h1>
              <div
                className="transform rotate-[15deg]"
                style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
              >
                <svg width="45" height="45" viewBox="0 0 100 100" fill="none">
                  <defs>
                    <linearGradient id="barGradWiz" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#999" />
                      <stop offset="50%" stopColor="#eee" />
                      <stop offset="100%" stopColor="#666" />
                    </linearGradient>
                    <radialGradient id="plateGradWiz" cx="50%" cy="50%" r="50%">
                      <stop offset="70%" stopColor="#333" />
                      <stop offset="100%" stopColor="#111" />
                    </radialGradient>
                  </defs>
                  <rect x="5" y="44" width="90" height="12" rx="6" fill="url(#barGradWiz)" />
                  <rect x="15" y="25" width="12" height="50" rx="4" fill="url(#plateGradWiz)" stroke="#000" strokeWidth="1" />
                  <rect x="24" y="20" width="8" height="60" rx="3" fill="url(#plateGradWiz)" stroke="#000" strokeWidth="1" />
                  <rect x="73" y="25" width="12" height="50" rx="4" fill="url(#plateGradWiz)" stroke="#000" strokeWidth="1" />
                  <rect x="68" y="20" width="8" height="60" rx="3" fill="url(#plateGradWiz)" stroke="#000" strokeWidth="1" />
                  <line x1="10" y1="50" x2="90" y2="50" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
                </svg>
              </div>
            </div>
            <p
              className="text-[10px] font-black uppercase text-[#B0A090] tracking-[0.3em]"
              style={{ fontFamily: 'var(--font-montserrat)' }}
            >
              This Meal Doesn&apos;t Count
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center py-8">
            <div className="relative w-[240px] animate-float">
              <div className="absolute -inset-16 bg-[#D95959]/10 rounded-full blur-[80px] opacity-60" />
              <div className="relative bg-white p-3 rounded-[40px] border-4 border-white overflow-hidden aspect-[4/5] shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
                <div className="w-full h-full rounded-[32px] bg-gradient-to-br from-[#D95959] via-[#E88D8D] to-[#E8B86D] flex items-center justify-center">
                  <span className="text-8xl">🐹</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pb-10 flex flex-col items-center px-8">
            <p className="text-sm text-[#8A7B6B] text-center mb-6 leading-relaxed">
              用 AI 拍照识别食物，追踪每日热量<br />
              聪明的 AI 教练陪你养成健康习惯
            </p>
            <button
              onClick={() => setStep(1)}
              className="w-full max-w-xs rounded-2xl bg-[#D95959] py-4 font-bold text-white shadow-md shadow-[#D95959]/20 transition-all active:shadow-sm active:brightness-90"
            >
              开始吧
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Body metrics */}
      {step === 1 && (
        <div className="flex-1 flex flex-col px-6 animate-slide-up">
          <h2 className="text-lg font-bold mb-5">完善身体数据</h2>

          <div className="space-y-3 flex-1">
            <div>
              <label className="block text-sm font-medium text-[#8A7B6B] mb-1">身高 (cm)</label>
              <input
                type="number"
                value={height}
                min={100} max={250}
                onChange={(e) => setHeight(Number(e.target.value))}
                className={`w-full rounded-xl border bg-white p-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#D95959]/10 transition-colors ${
                  heightOk ? 'border-[#E8DDD0] focus:border-[#D95959]' : 'border-red-300 focus:border-red-400'
                }`}
              />
              {!heightOk && <p className="text-xs text-red-500 mt-1">身高需在 100-250 cm</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8A7B6B] mb-1">体重 (kg)</label>
              <input
                type="number"
                value={weight}
                min={30} max={300}
                onChange={(e) => setWeight(Number(e.target.value))}
                className={`w-full rounded-xl border bg-white p-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#D95959]/10 transition-colors ${
                  weightOk ? 'border-[#E8DDD0] focus:border-[#D95959]' : 'border-red-300 focus:border-red-400'
                }`}
              />
              {!weightOk && <p className="text-xs text-red-500 mt-1">体重需在 30-300 kg</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8A7B6B] mb-1">年龄</label>
              <input
                type="number"
                value={age}
                min={10} max={120}
                onChange={(e) => setAge(Number(e.target.value))}
                className={`w-full rounded-xl border bg-white p-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#D95959]/10 transition-colors ${
                  ageOk ? 'border-[#E8DDD0] focus:border-[#D95959]' : 'border-red-300 focus:border-red-400'
                }`}
              />
              {!ageOk && <p className="text-xs text-red-500 mt-1">年龄需在 10-120 岁</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8A7B6B] mb-1">性别</label>
              <div className="flex gap-2">
                {(['male', 'female'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`flex-1 rounded-xl border p-3.5 text-sm font-medium transition-all ${
                      gender === g
                        ? 'border-[#D95959] bg-[#D95959]/10 text-[#D95959] shadow-sm shadow-[#D95959]/10'
                        : 'border-[#E8DDD0] text-[#8A7B6B] hover:border-gray-300'
                    }`}
                  >
                    {g === 'male' ? '🙋 男' : '🙋‍♀️ 女'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8A7B6B] mb-1">活动等级</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(Number(e.target.value) as ActivityLevel)}
                className="w-full rounded-xl border border-[#E8DDD0] bg-white p-3.5 text-base focus:border-[#D95959] focus:outline-none focus:ring-2 focus:ring-[#D95959]/10"
              >
                {(Object.entries(ACTIVITY_LABELS) as [string, string][]).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl bg-[#D95959]/5 p-4 text-center">
              <p className="text-xs text-[#8A7B6B]">预估每日消耗</p>
              <p className="text-2xl font-extrabold text-[#D95959] mt-0.5">{tdee} kcal</p>
            </div>
          </div>

          <div className="py-4 flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="rounded-2xl border border-[#E8DDD0] px-6 py-3.5 text-sm text-[#8A7B6B] active:bg-[#EFE8DE] transition-colors"
            >
              返回
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!metricsValid}
              className={`flex-1 rounded-2xl py-3.5 font-bold text-white shadow-md transition-all ${
                metricsValid
                  ? 'bg-[#D95959] shadow-[#D95959]/20 active:shadow-sm active:brightness-90'
                  : 'bg-[#C4B5A5] cursor-not-allowed'
              }`}
            >
              下一步
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Goal selection & confirm */}
      {step === 2 && (
        <div className="flex-1 flex flex-col px-6 animate-slide-up">
          <h2 className="text-lg font-bold mb-1">选择你的目标</h2>
          <p className="text-sm text-[#C4B5A5] mb-5">
            基于你的 TDEE {tdee} kcal，选择适合的目标
          </p>

          <div className="space-y-3 flex-1">
            {GOAL_OPTIONS.map((opt) => {
              const target = tdee + GOAL_OFFSETS[opt.type];
              return (
                <button
                  key={opt.type}
                  onClick={() => setGoalType(opt.type)}
                  className={`w-full rounded-2xl p-4 text-left transition-all ${
                    goalType === opt.type
                      ? 'border-2 border-[#D95959] bg-[#D95959]/5 shadow-sm shadow-[#D95959]/10'
                      : 'border-2 border-[#E8DDD0] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{opt.emoji}</span>
                    <div className="flex-1">
                      <div className="font-bold text-base">{GOAL_LABELS[opt.type]}</div>
                      <div className="text-xs text-[#C4B5A5] whitespace-pre-line">{opt.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-extrabold text-[#D95959] tabular-nums">{target}</div>
                      <div className="text-xs text-[#C4B5A5]">kcal/天</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="py-4 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="rounded-2xl border border-[#E8DDD0] px-6 py-3.5 text-sm text-[#8A7B6B] active:bg-[#EFE8DE] transition-colors"
            >
              返回
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 rounded-2xl bg-[#D95959] py-3.5 font-bold text-white shadow-md shadow-[#D95959]/20 transition-all active:shadow-sm active:brightness-90"
            >
              开始使用 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
