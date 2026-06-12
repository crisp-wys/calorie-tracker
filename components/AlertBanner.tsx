'use client';

import type { Alert } from '@/lib/types';

interface Props {
  alert: Alert;
  onChat: (suggestion: string) => void;
  onDismiss: () => void;
}

const COLOR_STYLES: Record<Alert['color'], { bg: string; border: string; text: string; subtext: string; button: string }> = {
  yellow: {
    bg: 'bg-gradient-to-br from-amber-50/90 to-orange-50/80',
    border: 'border-amber-200',
    text: 'text-amber-800',
    subtext: 'text-amber-700',
    button: 'border-amber-300 text-amber-700',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50/80 to-sky-50/80',
    border: 'border-blue-200',
    text: 'text-blue-800',
    subtext: 'text-blue-600',
    button: 'border-blue-300 text-blue-700',
  },
  purple: {
    bg: 'bg-gradient-to-br from-violet-50/80 to-purple-50/80',
    border: 'border-violet-200',
    text: 'text-violet-800',
    subtext: 'text-violet-600',
    button: 'border-violet-300 text-violet-700',
  },
};

export default function AlertBanner({ alert, onChat, onDismiss }: Props) {
  const s = COLOR_STYLES[alert.color];

  return (
    <div className={`rounded-2xl border p-3 ${s.bg} ${s.border}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-xl leading-none pt-0.5">{alert.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className={`font-bold text-sm ${s.text}`}>{alert.title}</span>
            <button
              onClick={onDismiss}
              className={`shrink-0 text-base leading-none ${s.subtext} opacity-50 hover:opacity-100 transition-opacity`}
              aria-label="关闭"
            >
              ✕
            </button>
          </div>
          <p className={`text-xs mt-1 ${s.subtext}`}>{alert.message}</p>
          <button
            onClick={() => onChat(alert.suggestion)}
            className={`mt-2.5 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#FFFBF6] border text-xs font-semibold ${s.button} active:brightness-95 transition-all`}
          >
            💬 和教练聊聊
          </button>
        </div>
      </div>
    </div>
  );
}
