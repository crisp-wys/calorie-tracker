interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

function MacroBar({ label, current, target, unit, color }: MacroBarProps) {
  const ratio = target > 0 ? Math.min(current / target, 1) : 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-10 text-gray-500">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${ratio * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-20 text-right tabular-nums text-gray-500">
        {current}/{target}{unit}
      </span>
    </div>
  );
}

export default function MacroBars({
  protein,
  proteinTarget,
  carbs,
  carbsTarget,
  fat,
  fatTarget,
}: {
  protein: number;
  proteinTarget: number;
  carbs: number;
  carbsTarget: number;
  fat: number;
  fatTarget: number;
}) {
  return (
    <div className="space-y-2">
      <MacroBar label="蛋白质" current={protein} target={proteinTarget} unit="g" color="#ef4444" />
      <MacroBar label="碳水" current={carbs} target={carbsTarget} unit="g" color="#eab308" />
      <MacroBar label="脂肪" current={fat} target={fatTarget} unit="g" color="#3b82f6" />
    </div>
  );
}
