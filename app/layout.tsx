import type { Metadata, Viewport } from 'next';
import { AppProvider } from '@/lib/AppContext';
import BottomTab from '@/components/BottomTab';
import './globals.css';

export const metadata: Metadata = {
  title: 'Calorie Tracker',
  description: 'AI 减脂饮食追踪',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#22c55e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppProvider>
          <main className="mx-auto max-w-lg pb-16 min-h-full">
            {children}
          </main>
          <BottomTab />
        </AppProvider>
      </body>
    </html>
  );
}
