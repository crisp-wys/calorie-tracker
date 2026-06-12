'use client';

import { useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  /** Auto-dismiss after ms (default 3500) */
  duration?: number;
}

export default function UndoToast({ message, onUndo, onDismiss, duration = 3500 }: UndoToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation on next frame
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // let exit animation play
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-center gap-3 bg-[#3D3226] text-white rounded-2xl px-4 py-3 shadow-lg shadow-black/20 text-sm whitespace-nowrap">
        <span>{message}</span>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onUndo, 150);
          }}
          className="flex items-center gap-1 text-[#E8B86D] font-semibold active:text-yellow-300 transition-colors"
        >
          <Undo2 className="h-3.5 w-3.5" />
          撤销
        </button>
      </div>
    </div>
  );
}
