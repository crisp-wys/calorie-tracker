'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings, Send, X } from 'lucide-react';
import type { ChatMessage, Personality, AIConfig } from '@/lib/types';
import { DEFAULT_AI_CONFIG } from '@/lib/types';
import {
  loadMemory,
  saveMemory,
  needsMemoryUpdate,
  buildSystemPrompt,
} from '@/lib/user-memory';
import { useApp } from '@/lib/AppContext';

const PERSONALITY_OPTIONS: {
  value: Personality; emoji: string; label: string; desc: string;
}[] = [
  { value: 'encouraging', emoji: '\u{1F9B8}', label: '鼓励型', desc: '温暖友好，陪你一起努力' },
  { value: 'strict', emoji: '\u{1FA1D}', label: '严父型', desc: '直接严厉，用数据说话' },
  { value: 'custom', emoji: '\u{1F3A8}', label: '自定义', desc: '自己定义 AI 的说话方式' },
];

const CHAT_API_URL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_CHAT_URL || ''
    : '';

export default function ChatCard() {
  const { state } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memory, setMemory] = useState(() => loadMemory());
  const [config, setConfig] = useState<AIConfig>(memory.aiConfig);
  const messagesEnd = useRef<HTMLDivElement>(null);

  // Daily first-expand triggers memory update
  useEffect(() => {
    if (!expanded || !needsMemoryUpdate(memory)) return;
    updateMemory();
  }, [expanded]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateMemory = async () => {
    try {
      const systemPrompt = buildSystemPrompt(memory, state);
      const summaryPrompt =
        '请根据以下用户数据，分析用户饮食模式、偏好和里程碑。输出严格 JSON：\n' +
        systemPrompt +
        '\n\n输出格式：{"insights":[{"id":"1","type":"pattern|trend|warning","text":"..."}],"preferences":["..."],"milestones":[{"date":"YYYY-MM-DD","event":"..."}]}';

      const res = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'memory', systemPrompt: summaryPrompt }),
      });

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const update = JSON.parse(jsonMatch[0]);
          const today = new Date().toISOString().split('T')[0];
          const newMemory = {
            ...memory,
            insights: (update.insights || memory.insights) as typeof memory.insights,
            preferences: update.preferences || memory.preferences,
            milestones: update.milestones || memory.milestones,
            lastSummaryDate: today,
          };
          setMemory(newMemory);
          saveMemory(newMemory);
        }
      }
    } catch {
      // memory update failure does not block chat
    }
  };

  const handleSend = async () => {
    if (!input.trim() || streaming) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(36),
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);

    const history = newMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const systemPrompt = buildSystemPrompt(memory, state);

    const aiMsgId = (Date.now() + 1).toString(36);
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setMessages([...newMessages, aiMsg]);

    try {
      const res = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: userMsg.content,
          history: history.slice(0, -1),
          systemPrompt,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let content = '';
      let clientBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        clientBuffer += decoder.decode(value, { stream: true });
        const lines = clientBuffer.split('\n');
        clientBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                content += parsed.token;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId ? { ...m, content } : m
                  )
                );
              }
            } catch {
              // skip unparseable token
            }
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: `抱歉，出了点问题：${errorMsg}` }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  const handleSaveSettings = () => {
    const newMemory = { ...memory, aiConfig: config };
    setMemory(newMemory);
    saveMemory(newMemory);
    setSettingsOpen(false);
  };

  const getAutoInsight = (): string => {
    const today = new Date().toISOString().split('T')[0];
    const todayMeals = state.meals.filter((m) => m.date === today);
    if (todayMeals.length === 0) return '今天还没记录饮食哦，快来记录第一餐吧～';
    const totalCal = Math.round(
      todayMeals.reduce(
        (s, m) => s + (m.totalCaloriesMin + m.totalCaloriesMax) / 2, 0
      )
    );
    const target = state.profile?.dailyTarget ?? 2000;
    if (totalCal < target * 0.7)
      return `今天热量偏低，还可以再吃 ${target - totalCal}kcal～`;
    if (totalCal > target * 1.1)
      return `今天热量略超，明天适当控制就好，别有压力～`;
    return `今天热量控制得不错！${totalCal}/${target}kcal，继续保持～`;
  };

  return (
    <>
      <div className="rounded-2xl bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center text-lg">
              {config.avatar || '\u{1F916}'}
            </div>
            <span className="font-medium text-sm">
              {config.name || 'AI 教练'}
            </span>
          </div>
          <span className="text-xs text-gray-400 max-w-[180px] truncate hidden sm:block">
            {getAutoInsight()}
          </span>
        </button>

        {expanded && (
          <div className="border-t border-gray-100">
            <div className="h-80 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-12 text-sm text-gray-400">
                  <p className="text-3xl mb-2">{config.avatar || '\u{1F916}'}</p>
                  <p>
                    我是{config.name || 'AI 教练'}，有什么可以帮你的？
                  </p>
                  <p className="text-xs mt-1">
                    可以问我饮食分析、运动建议、营养知识
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-brand text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}
                  >
                    {msg.content ||
                      (streaming && msg.role === 'assistant' ? '...' : '')}
                  </div>
                </div>
              ))}
              <div ref={messagesEnd} />
            </div>

            <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-2">
              <button
                onClick={() => setSettingsOpen(true)}
                className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <Settings className="h-4.5 w-4.5" />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="输入你的问题..."
                className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-brand"
                disabled={streaming}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className="h-9 w-9 rounded-xl bg-brand flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Settings Panel */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/35"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="relative bg-white rounded-[20px] p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">AI 设置</h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="text-sm text-gray-500 mb-1.5 block">头像</label>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-14 w-14 rounded-full bg-brand/10 flex items-center justify-center text-2xl">
                {config.avatar || '\u{1F916}'}
              </div>
              <input
                type="text"
                value={config.avatar}
                onChange={(e) =>
                  setConfig({ ...config, avatar: e.target.value })
                }
                placeholder="输入 emoji 作为头像"
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>

            <label className="text-sm text-gray-500 mb-1.5 block">昵称</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) =>
                setConfig({ ...config, name: e.target.value })
              }
              placeholder="给你的 AI 起个名字"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand mb-5"
            />

            <label className="text-sm text-gray-500 mb-2 block">对话风格</label>
            <div className="space-y-2 mb-4">
              {PERSONALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    setConfig({ ...config, personality: opt.value })
                  }
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    config.personality === opt.value
                      ? 'bg-brand/10 border border-brand/20'
                      : 'bg-gray-50 border border-transparent'
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <div>
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.desc}</div>
                  </div>
                  {config.personality === opt.value && (
                    <div className="ml-auto h-5 w-5 rounded-full bg-brand flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {config.personality === 'custom' && (
              <div className="mb-5">
                <label className="text-sm text-gray-500 mb-1.5 block">
                  自定义提示词
                </label>
                <textarea
                  value={config.customPrompt}
                  onChange={(e) =>
                    setConfig({ ...config, customPrompt: e.target.value })
                  }
                  placeholder="描述你希望 AI 怎么说话..."
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand resize-none"
                />
              </div>
            )}

            <button
              onClick={handleSaveSettings}
              className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white active:brightness-90 transition-all"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </>
  );
}
