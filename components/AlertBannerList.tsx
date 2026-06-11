'use client';

import { useState } from 'react';
import type { Alert, AlertType } from '@/lib/types';
import AlertBanner from './AlertBanner';

interface Props {
  alerts: Alert[];
  onOpenChat: (prefill: string) => void;
}

export default function AlertBannerList({ alerts, onOpenChat }: Props) {
  const [dismissed, setDismissed] = useState<Set<AlertType>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.type));
  if (visible.length === 0) return null;

  const handleDismiss = (type: AlertType) => {
    setDismissed((prev) => new Set(prev).add(type));
  };

  return (
    <div className="space-y-2">
      {visible.map((alert) => (
        <AlertBanner
          key={alert.type}
          alert={alert}
          onChat={onOpenChat}
          onDismiss={() => handleDismiss(alert.type)}
        />
      ))}
    </div>
  );
}
