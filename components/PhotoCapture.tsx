'use client';

import { useRef, useState } from 'react';
import { Camera, Image, Loader2 } from 'lucide-react';

interface PhotoCaptureProps {
  onCapture: (base64: string) => void;
  loading: boolean;
}

export default function PhotoCapture({ onCapture, loading }: PhotoCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [showSheet, setShowSheet] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onCapture(reader.result as string);
    };
    reader.readAsDataURL(file);
    setShowSheet(false);
  };

  const handleCamera = () => {
    cameraRef.current?.click();
  };

  const handleGallery = () => {
    galleryRef.current?.click();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-brand" />
        <p className="text-sm text-gray-400">AI 正在识别中…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-20 space-y-4">
      <button
        onClick={() => setShowSheet(true)}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/25 transition-all active:scale-95 active:shadow-md"
      >
        <Camera className="h-10 w-10" />
      </button>
      <p className="text-sm text-gray-400">点击拍照识别食物</p>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ActionSheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/35"
            onClick={() => setShowSheet(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-[20px] px-4 pt-3 pb-6 animate-slide-up">
            <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3" />

            <button
              onClick={handleCamera}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl bg-gray-50 active:bg-gray-100 transition-colors mb-1"
            >
              <Camera className="h-6 w-6 text-brand" />
              <div className="text-left">
                <div className="text-[15px] font-semibold">拍照</div>
                <div className="text-xs text-gray-400">使用相机拍摄</div>
              </div>
            </button>

            <button
              onClick={handleGallery}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl bg-gray-50 active:bg-gray-100 transition-colors mb-3"
            >
              <Image className="h-6 w-6 text-brand" />
              <div className="text-left">
                <div className="text-[15px] font-semibold">从相册选择</div>
                <div className="text-xs text-gray-400">上传已有照片</div>
              </div>
            </button>

            <button
              onClick={() => setShowSheet(false)}
              className="w-full py-3 text-[15px] text-gray-400 bg-gray-100 rounded-xl active:bg-gray-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
