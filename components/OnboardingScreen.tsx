'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';

interface OnboardingScreenProps {
  onContinue: () => void;
}

export default function OnboardingScreen({ onContinue }: OnboardingScreenProps) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF6F0] px-6"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(196,166,138,0.08), transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(217,89,89,0.04), transparent 50%)
        `,
        backgroundSize: '100% 100%',
      }}
    >
      {/* 品牌名 */}
      <h1
        className="text-5xl mb-1"
        style={{ fontFamily: 'var(--font-zcool-kuai-le)', color: '#3D3226' }}
      >
        这顿不算
      </h1>
      <p
        className="text-[10px] font-black uppercase text-[#B0A090] tracking-[0.3em] mb-10"
        style={{ fontFamily: 'var(--font-montserrat)' }}
      >
        This Meal Doesn&apos;t Count
      </p>

      {/* 仓鼠插画卡片 */}
      <div className="relative mb-10">
        <div className="absolute -inset-16 rounded-full bg-[#D95959]/10 blur-[80px] opacity-60" />
        <div className="relative bg-white p-3 rounded-[40px] border-4 border-white overflow-hidden aspect-[4/5] w-[200px] shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          <div className="w-full h-full rounded-[32px] bg-gradient-to-br from-[#D95959] via-[#E88D8D] to-[#E8B86D] flex items-center justify-center">
            <span className="text-8xl">🐹</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onContinue}
        className="w-full max-w-xs rounded-2xl bg-[#D95959] py-4 font-bold text-white shadow-md shadow-[#D95959]/20 transition-all active:shadow-sm active:brightness-90 mb-3"
      >
        开始吧
      </button>

      {/* 底部链接 */}
      <button
        onClick={() => router.push('/settings')}
        className="text-xs text-[#C4B5A5] hover:text-[#D95959] transition-colors"
      >
        生成腹肌
      </button>

      <p className="absolute bottom-8 text-[11px] text-[#C4B5A5] tracking-widest">
        渴了就喝水，饿了就打嘴
      </p>
    </div>
  );
}
