'use client';

import Link from 'next/link';

export default function OnboardingScreen() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center bg-[#FAF6F0] overflow-y-auto"
      style={{
        backgroundImage: `
          radial-gradient(circle at 10% 20%, rgba(217,89,89,0.08) 0%, transparent 40%),
          radial-gradient(circle at 90% 80%, rgba(217,89,89,0.04) 0%, transparent 40%)
        `,
        backgroundSize: '100% 100%, 100% 100%',
      }}
    >
      {/* 顶部品牌 */}
      <div className="pt-16 text-center">
        <div className="flex items-center justify-center gap-3 mb-1">
          <h1
            className="text-5xl text-[#1A1A1A]"
            style={{ fontFamily: 'var(--font-zcool-kuai-le)' }}
          >
            这顿不算
          </h1>
          {/* 杠铃 SVG */}
          <div
            className="transform rotate-[15deg]"
            style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
          >
            <svg width="45" height="45" viewBox="0 0 100 100" fill="none">
              <defs>
                <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#999" />
                  <stop offset="50%" stopColor="#eee" />
                  <stop offset="100%" stopColor="#666" />
                </linearGradient>
                <radialGradient id="plateGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="70%" stopColor="#333" />
                  <stop offset="100%" stopColor="#111" />
                </radialGradient>
              </defs>
              <rect x="5" y="44" width="90" height="12" rx="6" fill="url(#barGrad)" />
              <rect x="15" y="25" width="12" height="50" rx="4" fill="url(#plateGrad)" stroke="#000" strokeWidth="1" />
              <rect x="24" y="20" width="8" height="60" rx="3" fill="url(#plateGrad)" stroke="#000" strokeWidth="1" />
              <rect x="73" y="25" width="12" height="50" rx="4" fill="url(#plateGrad)" stroke="#000" strokeWidth="1" />
              <rect x="68" y="20" width="8" height="60" rx="3" fill="url(#plateGrad)" stroke="#000" strokeWidth="1" />
              <line x1="10" y1="50" x2="90" y2="50" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
            </svg>
          </div>
        </div>
        <p
          className="text-[10px] font-black uppercase text-[#999] tracking-[0.3em]"
          style={{ fontFamily: 'var(--font-montserrat)' }}
        >
          This Meal Doesn&apos;t Count
        </p>
      </div>

      {/* 中间卡片 */}
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="relative w-[280px] animate-float">
          <div className="absolute -inset-16 bg-brand/10 rounded-full blur-[80px] opacity-60" />
          <div className="relative bg-white p-3 rounded-[40px] border-4 border-white overflow-hidden aspect-[4/5] shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
            <div className="w-full h-full rounded-[32px] bg-gradient-to-br from-[#D95959] via-[#E88D8D] to-[#E8B86D] flex items-center justify-center">
              <span className="text-8xl">🐹</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部 slogan */}
      <div className="pb-8 flex flex-col items-center">
        <Link
          href="/settings"
          className="mb-6 px-8 py-3 text-sm font-bold text-brand active:text-red-800 transition-colors"
        >
          生成腹肌
        </Link>

        <div className="relative">
          <div className="absolute inset-0 bg-[#D95959] blur-xl opacity-20" />
          <div className="relative bg-[#1A1A1A] px-8 py-4 rounded-2xl border-b-4 border-r-4 border-[#D95959]">
            <p className="text-lg font-black text-white tracking-widest">
              渴了就喝水，<span className="text-[#D95959]">饿了就打嘴</span>
            </p>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-4 opacity-30">
          <div className="h-px w-8 bg-gray-400" />
          <span
            className="text-[9px] font-black tracking-widest text-gray-500 uppercase"
            style={{ fontFamily: 'var(--font-montserrat)' }}
          >
            Energy Boost Mode
          </span>
          <div className="h-px w-8 bg-gray-400" />
        </div>
      </div>
    </div>
  );
}
