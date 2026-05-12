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
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isOver ? '#ef4444' : '#22c55e'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold tabular-nums">{current}</div>
        <div className="text-xs text-gray-400">/ {target} kcal</div>
        <div className="mt-1 text-sm font-medium text-green-600 tabular-nums">
          剩余 {Math.max(target - current, 0)}
        </div>
      </div>
    </div>
  );
}
