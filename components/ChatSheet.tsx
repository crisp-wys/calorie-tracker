'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Send, X, Upload } from 'lucide-react';
import { useChat } from '@/lib/useChat';
import {
  AVATAR_OPTIONS,
  PERSONALITY_OPTIONS,
  DEFAULT_AVATAR_ID,
  CUSTOM_AVATAR_PREFIX,
  isCustomAvatar,
  resolveAvatarId,
  AvatarImg,
} from '@/lib/chat-utils';

interface Props {
  open: boolean;
  onClose: () => void;
  prefill?: string;
}

export default function ChatSheet({ open, onClose, prefill }: Props) {
  const chat = useChat();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const didMount = useRef(false);

  // Trigger memory check on first open
  useEffect(() => {
    if (open && !didMount.current) {
      didMount.current = true;
      chat.checkAndUpdateMemory();
    }
  }, [open]);

  // Pre-fill input when opened with a suggestion from alerts
  useEffect(() => {
    if (open && prefill) {
      chat.setInput(prefill);
    }
  }, [open, prefill]);

  // Manage open/close visibility with animation
  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
      document.body.style.overflow = 'hidden';
    } else if (visible) {
      setClosing(true);
      document.body.style.overflow = '';
    }
  }, [open]);

  const handleAnimationEnd = () => {
    if (closing) {
      setVisible(false);
      setClosing(false);
    }
  };

  // Cleanup body overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!visible) return null;

  const { config } = chat;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/35"
        style={{
          animation: closing
            ? 'chat-backdrop-out 0.25s ease-in forwards'
            : 'chat-backdrop-in 0.25s ease-out',
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[110] h-[85vh] rounded-t-2xl bg-[#FFFBF6] flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.12)]"
        style={{
          animation: closing
            ? 'chat-sheet-down 0.25s ease-in forwards'
            : 'chat-sheet-up 0.25s ease-out',
        }}
        onAnimationEnd={handleAnimationEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8DDD0] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <AvatarImg id={config.avatar} size={32} />
            <span
              className="font-semibold text-sm"
              style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}
            >
              {config.name || 'AI 教练'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => chat.setSettingsOpen(true)}
              className="h-8 w-8 rounded-lg hover:bg-[#EFE8DE] flex items-center justify-center text-[#C4B5A5]"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-[#EFE8DE] flex items-center justify-center text-[#C4B5A5]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {chat.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-sm text-[#C4B5A5]">
              <div className="mb-3">
                <AvatarImg id={config.avatar} size={64} />
              </div>
              <p className="font-medium" style={{ color: '#3D3226', fontFamily: 'var(--font-zcool-xiaowei)' }}>
                我是{config.name || 'AI 教练'}，有什么可以帮你的？
              </p>
              <p className="text-xs mt-1 text-[#C4B5A5]">
                可以问我饮食分析、运动建议、营养知识
              </p>
            </div>
          )}
          {chat.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#D95959] text-white rounded-br-md'
                    : 'bg-[#EFE8DE] text-[#3D3226] rounded-bl-md'
                }`}
              >
                {msg.content ||
                  (chat.streaming && msg.role === 'assistant' ? '...' : '')}
              </div>
            </div>
          ))}
          <div ref={chat.messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#E8DDD0] px-4 py-3 flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => chat.setSettingsOpen(true)}
            className="h-9 w-9 rounded-xl bg-[#EFE8DE] flex items-center justify-center text-[#C4B5A5] hover:text-[#B0A090] flex-shrink-0"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>
          <input
            value={chat.input}
            onChange={(e) => chat.setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && chat.handleSend()}
            placeholder="输入你的问题..."
            className="flex-1 rounded-xl border border-[#E8DDD0] bg-white px-3.5 py-2 text-sm outline-none focus:border-[#D95959]"
            disabled={chat.streaming}
          />
          <button
            onClick={chat.handleSend}
            disabled={!chat.input.trim() || chat.streaming}
            className="h-9 w-9 rounded-xl bg-[#D95959] flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {chat.settingsOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/35"
            onClick={() => chat.setSettingsOpen(false)}
          />
          <div className="relative bg-white rounded-[20px] p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3
                className="text-lg font-bold"
                style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}
              >
                AI 设置
              </h3>
              <button
                onClick={() => chat.setSettingsOpen(false)}
                className="text-[#C4B5A5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="text-sm text-[#C4B5A5] mb-1.5 block">头像</label>
            <div className="flex items-center gap-3 mb-4">
              <AvatarImg id={config.avatar} size={56} />
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {AVATAR_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => chat.setConfig({ ...config, avatar: opt.id })}
                  title={opt.id}
                  className={`rounded-xl p-1.5 transition-all ${
                    resolveAvatarId(config.avatar) === opt.id
                      ? 'ring-2 ring-[#D95959] ring-offset-2 bg-[#D95959]/10'
                      : 'hover:bg-[#FAF6F0]'
                  }`}
                >
                  <AvatarImg id={opt.id} size={48} />
                </button>
              ))}
              {/* Custom upload as grid slot */}
              <button
                onClick={() => chat.uploadRef.current?.click()}
                className={`rounded-xl p-1.5 transition-all flex items-center justify-center border-2 border-dashed border-[#E8DDD0] hover:border-[#D95959] hover:text-[#D95959] ${
                  isCustomAvatar(config.avatar)
                    ? 'ring-2 ring-[#D95959] ring-offset-2 bg-[#D95959]/10'
                    : 'text-[#C4B5A5]'
                }`}
              >
                <Upload className="h-5 w-5" />
              </button>
              <input
                ref={chat.uploadRef}
                type="file"
                accept="image/*"
                onChange={chat.handleAvatarUpload}
                className="hidden"
              />
            </div>

            {isCustomAvatar(config.avatar) && (
              <button
                onClick={() => chat.setConfig({ ...config, avatar: DEFAULT_AVATAR_ID })}
                className="text-xs text-[#C4B5A5] hover:text-[#D95959] transition-colors mb-4"
              >
                移除自定义头像
              </button>
            )}

            <label className="text-sm text-[#C4B5A5] mb-1.5 block">昵称</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => chat.setConfig({ ...config, name: e.target.value })}
              placeholder="给你的 AI 起个名字"
              className="w-full rounded-xl border border-[#E8DDD0] px-3 py-2 text-sm outline-none focus:border-[#D95959] mb-5"
            />

            <label className="text-sm text-[#C4B5A5] mb-2 block">对话风格</label>
            <div className="space-y-2 mb-4">
              {PERSONALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => chat.setConfig({ ...config, personality: opt.value })}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    config.personality === opt.value
                      ? 'bg-[#D95959]/10 border border-[#D95959]/20'
                      : 'bg-[#FAF6F0] border border-transparent'
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <div>
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-xs text-[#C4B5A5]">{opt.desc}</div>
                  </div>
                  {config.personality === opt.value && (
                    <div className="ml-auto h-5 w-5 rounded-full bg-[#D95959] flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {config.personality === 'custom' && (
              <div className="mb-5">
                <label className="text-sm text-[#C4B5A5] mb-1.5 block">
                  自定义提示词
                </label>
                <textarea
                  value={config.customPrompt}
                  onChange={(e) => chat.setConfig({ ...config, customPrompt: e.target.value })}
                  placeholder="描述你希望 AI 怎么说话..."
                  rows={4}
                  className="w-full rounded-xl border border-[#E8DDD0] px-3 py-2 text-sm outline-none focus:border-[#D95959] resize-none"
                />
              </div>
            )}

            <button
              onClick={chat.handleSaveSettings}
              className="w-full rounded-xl bg-[#D95959] py-3 text-sm font-bold text-white active:brightness-90 transition-all"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </>
  );
}
