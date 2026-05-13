interface RingProgressProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
}

export default function RingProgress({
  current,
  target,
  size = 160,
  strokeWidth = 12,
}: RingProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const ratio = target > 0 ? Math.min(current / target, 1) : 0;
  const offset = circumference - ratio * circumference;
  const isOver = current > target;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* 背景光晕 */}
      <div className="absolute inset-4 rounded-full bg-brand/5 blur-2xl" />
      <svg width={size} height={size} className="-rotate-90 relative z-10">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isOver ? '#ef4444' : '#E63946'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: 'drop-shadow(0 2px 8px rgba(230, 57, 70, 0.25))',
          }}
        />
      </svg>
      <div className="absolute text-center z-10">
        <div className="text-3xl font-extrabold tabular-nums tracking-tight">{current}</div>
        <div className="text-xs text-gray-400 mt-0.5">/ {target} kcal</div>
        <div className="mt-1 text-sm font-semibold text-brand tabular-nums">
          剩余 {Math.max(target - current, 0)}
        </div>
      </div>
    </div>
  );
}
