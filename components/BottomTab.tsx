'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Camera, Calendar, Dumbbell } from 'lucide-react';

const tabs = [
  { path: '/', label: '看板', icon: LayoutDashboard },
  { path: '/camera', label: '拍照', icon: Camera },
  { path: '/fitness', label: '健身', icon: Dumbbell },
  { path: '/calendar', label: '日历', icon: Calendar },
];

export default function BottomTab() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E8DDD0] bg-[#FAF6F0]/95 backdrop-blur safe-area-bottom">
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path);
          return (
            <Link
              key={path}
              href={path}
              className={`flex flex-1 flex-col items-center py-2 text-xs transition-all duration-200 ${
                isActive
                  ? 'text-[#D95959] font-semibold scale-105'
                  : 'text-[#C4B5A5] hover:text-[#B0A090]'
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
