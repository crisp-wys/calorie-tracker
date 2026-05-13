'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Camera, Calendar, Settings } from 'lucide-react';

const tabs = [
  { path: '/', label: '看板', icon: LayoutDashboard },
  { path: '/camera', label: '拍照', icon: Camera },
  { path: '/calendar', label: '日历', icon: Calendar },
  { path: '/settings', label: '设置', icon: Settings },
];

export default function BottomTab() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/90 backdrop-blur safe-area-bottom">
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path);
          return (
            <Link
              key={path}
              href={path}
              className={`flex flex-1 flex-col items-center py-2 text-xs transition-all duration-200 ${
                isActive
                  ? 'text-brand font-semibold scale-105'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="mt-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
