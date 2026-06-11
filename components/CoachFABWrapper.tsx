'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/AppContext';
import { loadMemory } from '@/lib/db';
import { DEFAULT_AI_CONFIG } from '@/lib/types';
import CoachFAB from '@/components/CoachFAB';
import ChatSheet from '@/components/ChatSheet';

export default function CoachFABWrapper() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState(DEFAULT_AI_CONFIG.avatar);
  const [name, setName] = useState(DEFAULT_AI_CONFIG.name);
  const [chatPrefill, setChatPrefill] = useState<string | undefined>();

  useEffect(() => {
    loadMemory().then((m) => {
      setAvatar(m.aiConfig.avatar);
      setName(m.aiConfig.name);
    });
  }, []);

  const handleOpenChat = useCallback((prefill?: string) => {
    setChatPrefill(prefill);
    setOpen(true);
  }, []);

  // Listen for cross-component open-coach-chat events from dashboard alerts
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      handleOpenChat(detail);
    };
    window.addEventListener('open-coach-chat', handler);
    return () => window.removeEventListener('open-coach-chat', handler);
  }, [handleOpenChat]);

  const handleClose = () => {
    setOpen(false);
    setChatPrefill(undefined);
  };

  if (!state.profile) return null;

  return (
    <>
      <CoachFAB
        onClick={() => handleOpenChat()}
        isOpen={open}
        avatar={avatar}
        name={name}
      />
      <ChatSheet open={open} onClose={handleClose} prefill={chatPrefill} />
    </>
  );
}
