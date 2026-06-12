import { memo } from 'react';

interface RingProgressProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
}

const RingProgress = memo(function RingProgress({
  current,
  target,
  size = 160,
  strokeWidth = 14,
}: RingProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const ratio = target > 0 ? Math.min(current / target, 1) : 0;
  const offset = circumference - ratio * circumference;
  const isOver = current > target;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* 暖红光晕 */}
      <div className="absolute inset-4 rounded-full bg-[#D95959]/5 blur-2xl" />
      <svg width={size} height={size} className="-rotate-90 relative z-10">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EFE8DE"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isOver ? '#C44F4F' : '#D95959'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>
      <div className="absolute text-center z-10">
        <div
          className="text-4xl tabular-nums tracking-tight"
          style={{ fontFamily: 'var(--font-playfair)', fontWeight: 400 }}
        >
          {current}
        </div>
        <div className="text-xs text-[#C4B5A5] mt-0.5">/ {target} kcal</div>
        <div
          className="mt-1 text-sm text-[#D95959] tabular-nums"
          style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}
        >
          剩余 {Math.max(target - current, 0)}
        </div>
      </div>
    </div>
  );
});

export default RingProgress;
