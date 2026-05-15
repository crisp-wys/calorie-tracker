import { Suspense } from 'react';
import CameraClient from './camera-client';

export default function CameraPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 pt-6 pb-4 space-y-4">
          <h1 className="text-xl font-extrabold">拍照识别</h1>
          <div className="animate-pulse space-y-3">
            <div className="h-64 rounded-xl bg-gray-100" />
            <div className="h-12 rounded-lg bg-gray-100" />
          </div>
        </div>
      }
    >
      <CameraClient />
    </Suspense>
  );
}
