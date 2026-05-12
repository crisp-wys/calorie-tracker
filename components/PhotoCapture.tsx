'use client';

import { useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';

interface PhotoCaptureProps {
  onCapture: (base64: string) => void;
  loading: boolean;
}

export default function PhotoCapture({ onCapture, loading }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onCapture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-green-500" />
        <p className="text-sm text-gray-400">AI 正在识别中…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-20 space-y-4">
      <button
        onClick={() => inputRef.current?.click()}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform active:scale-95"
      >
        <Camera className="h-10 w-10" />
      </button>
      <p className="text-sm text-gray-400">点击拍照识别食物</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
