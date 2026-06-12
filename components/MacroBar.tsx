import { memo } from 'react';

interface MacroBarsProps {
  protein: number;
  proteinTarget: number;
  carbs: number;
  carbsTarget: number;
  fat: number;
  fatTarget: number;
}

const MACRO_ITEMS = [
  { key: 'protein' as const, emoji: '🥩', label: '蛋白质', color: '#D95959', bg: '#FEF0E8', unit: 'g' },
  { key: 'carbs' as const, emoji: '🍚', label: '碳水', color: '#E8B86D', bg: '#FFF8E8', unit: 'g' },
  { key: 'fat' as const, emoji: '🥑', label: '脂肪', color: '#6B8F89', bg: '#F0F5F2', unit: 'g' },
];

const MacroBars = memo(function MacroBars({ protein, proteinTarget, carbs, carbsTarget, fat, fatTarget }: MacroBarsProps) {
  const values = {
    protein: { current: protein, target: proteinTarget },
    carbs: { current: carbs, target: carbsTarget },
    fat: { current: fat, target: fatTarget },
  };

  return (
    <div className="flex gap-2">
      {MACRO_ITEMS.map(({ key, emoji, label, color, bg, unit }) => {
        const { current, target } = values[key];
        const ratio = target > 0 ? Math.min(current / target, 1) : 0;
        return (
          <div key={key} className="flex-1 rounded-2xl p-3.5 text-center" style={{ backgroundColor: bg }}>
            <div className="text-xl mb-1">{emoji}</div>
            <div
              className="text-lg tabular-nums"
              style={{ fontFamily: 'var(--font-playfair)', color: '#3D3226' }}
            >
              {current}
            </div>
            <div className="text-[10px] text-[#C4B5A5] mt-0.5">{label} {unit}</div>
            <div className="mt-2 h-1 rounded-full" style={{ backgroundColor: '#EFE8DE' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${ratio * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default MacroBars;
