import type { Metadata, Viewport } from 'next';
import { ZCOOL_KuaiLe, Noto_Sans_SC, Montserrat } from 'next/font/google';
import { AppProvider } from '@/lib/AppContext';
import BottomTabWrapper from '@/components/BottomTabWrapper';
import './globals.css';

const zcool = ZCOOL_KuaiLe({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-zcool-kuai-le',
});

const montserrat = Montserrat({
  weight: '900',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

const notoSans = Noto_Sans_SC({
  weight: ['400', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-sc',
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
  themeColor: '#E63946',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${zcool.variable} ${montserrat.variable} ${notoSans.variable}`}>
      <body style={{ fontFamily: notoSans.style.fontFamily }}>
        <AppProvider>
          <main className="mx-auto max-w-lg pb-16 min-h-full">
            {children}
          </main>
          <BottomTabWrapper />
        </AppProvider>
      </body>
    </html>
  );
}
