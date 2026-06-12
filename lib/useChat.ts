'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, AIConfig, UserMemory } from './types';
import { loadMemory, saveMemory, uploadAvatar } from './db';
import { needsMemoryUpdate, buildSystemPrompt, getDefaultMemory } from './user-memory';
import { calcAvgCalories, getLocalDateString } from './utils';
import { compressImage } from './image-compress';
import { useApp } from './AppContext';
import { CUSTOM_AVATAR_PREFIX } from './chat-utils';

const CHAT_API_URL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_CHAT_URL || ''
    : '';

export function useChat() {
  const { state } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memory, setMemory] = useState<UserMemory>(() => getDefaultMemory());
  const [config, setConfig] = useState<AIConfig>(memory.aiConfig);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  // Async load memory from Supabase
  useEffect(() => {
    loadMemory().then((m) => {
      setMemory(m);
      setConfig(m.aiConfig);
    });
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateMemory = async () => {
    try {
      const systemPrompt = buildSystemPrompt(memory, state);
      const summaryPrompt =
        '请根据以下用户数据，分析用户饮食模式、偏好和里程碑。输出严格 JSON：\n' +
        systemPrompt +
        '\n\n输出格式：{"insights":[{"id":"1","type":"pattern|trend|warning","text":"..."}],"preferences":["..."],"milestones":[{"date":"YYYY-MM-DD","event":"..."}]}';

      const res = await fetch(`${CHAT_API_URL}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: summaryPrompt }),
      });

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const update = JSON.parse(jsonMatch[0]);
          const today = getLocalDateString();
          const newMemory: UserMemory = {
            ...memory,
            insights: (update.insights || memory.insights) as UserMemory['insights'],
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

  const checkAndUpdateMemory = async () => {
    if (needsMemoryUpdate(memory)) {
      await updateMemory();
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
      const res = await fetch(`${CHAT_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      if (!reader) {
        const data = await res.json();
        const content = data.content || '';
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, content } : m))
        );
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);
            const token: string = parsed.token ?? '';
            if (token) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, content: m.content + token } : m
                )
              );
            }
          } catch {
            // skip unparseable SSE chunks
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 256, 0.7);
      const url = await uploadAvatar(compressed);
      if (url) {
        setConfig({ ...config, avatar: CUSTOM_AVATAR_PREFIX + url });
      } else {
        setConfig({ ...config, avatar: CUSTOM_AVATAR_PREFIX + compressed });
      }
    } catch {
      // silent fail
    }
  };

  const getAutoInsight = (): string => {
    const today = getLocalDateString();
    const todayMeals = state.meals.filter((m) => m.date === today);
    if (todayMeals.length === 0) return '今天还没记录饮食哦，快来记录第一餐吧～';
    const totalCal = Math.round(
      todayMeals.reduce(
        (s, m) => s + calcAvgCalories(m.totalCaloriesMin, m.totalCaloriesMax), 0
      )
    );
    const target = state.profile?.dailyTarget ?? 2000;
    if (totalCal < target * 0.7)
      return `今天热量偏低，还可以再吃 ${target - totalCal}kcal～`;
    if (totalCal > target * 1.1)
      return `今天热量略超，明天适当控制就好，别有压力～`;
    return `今天热量控制得不错！${totalCal}/${target}kcal，继续保持～`;
  };

  return {
    messages,
    input,
    setInput,
    streaming,
    memory,
    config,
    setConfig,
    settingsOpen,
    setSettingsOpen,
    handleSend,
    handleSaveSettings,
    handleAvatarUpload,
    checkAndUpdateMemory,
    messagesEndRef,
    uploadRef,
    getAutoInsight,
  };
}
