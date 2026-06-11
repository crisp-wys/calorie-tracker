'use client';

import { useApp } from '@/lib/AppContext';
import BottomTab from '@/components/BottomTab';

export default function BottomTabWrapper() {
  const { state } = useApp();
  if (!state.profile) return null;
  return <BottomTab />;
}
