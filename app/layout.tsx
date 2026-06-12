import type { Metadata, Viewport } from 'next';
import { ZCOOL_KuaiLe, ZCOOL_XiaoWei, Noto_Sans_SC, Montserrat, Playfair_Display } from 'next/font/google';
import { AppProvider } from '@/lib/AppContext';
import BottomTabWrapper from '@/components/BottomTabWrapper';
import CoachFABWrapper from '@/components/CoachFABWrapper';
import ErrorBoundary from '@/components/ErrorBoundary';
import './globals.css';

const zcool = ZCOOL_KuaiLe({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-zcool-kuai-le',
});

const zcoolXiaoWei = ZCOOL_XiaoWei({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-zcool-xiaowei',
});

const montserrat = Montserrat({
  weight: '900',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

const notoSans = Noto_Sans_SC({
  weight: ['300', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-sc',
});

const playfair = Playfair_Display({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: '这顿不算',
  description: '拍照识别热量，吃了再说',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#D95959',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${zcool.variable} ${zcoolXiaoWei.variable} ${montserrat.variable} ${notoSans.variable} ${playfair.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </head>
      <body style={{ fontFamily: notoSans.style.fontFamily, fontWeight: 300 }}>
        <AppProvider>
          <ErrorBoundary>
            <main className="mx-auto max-w-lg pb-16 min-h-full">
              {children}
            </main>
            <BottomTabWrapper />
            <CoachFABWrapper />
          </ErrorBoundary>
        </AppProvider>
      </body>
    </html>
  );
}
