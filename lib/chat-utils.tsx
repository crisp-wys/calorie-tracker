'use client';

import type { Personality } from './types';

export const PERSONALITY_OPTIONS: {
  value: Personality; emoji: string; label: string; desc: string;
}[] = [
  { value: 'encouraging', emoji: '\u{1F9B8}', label: '鼓励型', desc: '温暖友好，陪你一起努力' },
  { value: 'strict', emoji: '\u{1FA1D}', label: '严父型', desc: '直接严厉，用数据说话' },
  { value: 'custom', emoji: '\u{1F3A8}', label: '自定义', desc: '自己定义 AI 的说话方式' },
];

export const AVATAR_OPTIONS = [
  { id: 'robot', emoji: '🤖', color: '#E63946' },
  { id: 'muscle', emoji: '💪', color: '#2563EB' },
  { id: 'leaf', emoji: '🥗', color: '#16A34A' },
  { id: 'sparkle', emoji: '✨', color: '#7C3AED' },
  { id: 'fire', emoji: '🔥', color: '#EA580C' },
  { id: 'heart', emoji: '💖', color: '#DB2777' },
  { id: 'star', emoji: '🌟', color: '#0D9488' },
] as const;

export const DEFAULT_AVATAR_ID = 'robot';

export const CUSTOM_AVATAR_PREFIX = 'custom:';

export function isCustomAvatar(avatar: string): boolean {
  return avatar.startsWith(CUSTOM_AVATAR_PREFIX) || avatar.startsWith('data:') || avatar.startsWith('https://');
}

export function resolveAvatarId(avatar: string): string {
  if (isCustomAvatar(avatar)) return '';
  const byId = AVATAR_OPTIONS.find(a => a.id === avatar);
  if (byId) return byId.id;
  const byEmoji = AVATAR_OPTIONS.find(a => a.emoji === avatar);
  if (byEmoji) return byEmoji.id;
  return DEFAULT_AVATAR_ID;
}

export function getAvatar(id: string) {
  return AVATAR_OPTIONS.find(a => a.id === resolveAvatarId(id)) ?? AVATAR_OPTIONS[0];
}

export function AvatarImg({ id, size }: { id: string; size: number }) {
  if (isCustomAvatar(id)) {
    const src = id.startsWith(CUSTOM_AVATAR_PREFIX) ? id.slice(CUSTOM_AVATAR_PREFIX.length) : id;
    return (
      <div
        className="rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ width: size, height: size }}
      >
        <img
          src={src}
          alt="AI 教练头像"
          style={{ width: size, height: size, objectFit: 'cover' }}
        />
      </div>
    );
  }
  const a = getAvatar(id);
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)` }}
    >
      <span style={{ fontSize: size * 0.55 }}>{a.emoji}</span>
    </div>
  );
}
