'use client';

import { AvatarImg } from '@/lib/chat-utils';

interface Props {
  onClick: () => void;
  isOpen: boolean;
  avatar: string;
  name: string;
}

export default function CoachFAB({ onClick, isOpen, avatar, name }: Props) {
  return (
    <div
      className={`fixed top-4 right-4 z-40 flex items-center gap-2 transition-all duration-200 ${
        isOpen ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Label pill */}
      <span className="px-3 py-1.5 rounded-full bg-[#FFFBF6] text-[#D95959] text-xs font-semibold shadow-md whitespace-nowrap border border-[#D95959]/10">
        {name || 'AI 教练'}
      </span>

      {/* Avatar button */}
      <button
        onClick={onClick}
        aria-label="AI 教练聊天"
        className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden flex-shrink-0"
      >
        <AvatarImg id={avatar} size={56} />
      </button>
    </div>
  );
}
