'use client';

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  dateMeals: Map<string, number>; // date string → total calories
  selectedDate: string;
  onSelect: (date: string) => void;
}

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export default function CalendarGrid({ year, month, dateMeals, selectedDate, onSelect }: CalendarGridProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const today = new Date().toISOString().split('T')[0];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="space-y-0.5">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 text-center">
            {row.map((day, di) => {
              if (day === null) return <div key={`empty-${di}`} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasMeals = dateMeals.has(dateStr);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={dateStr}
                  onClick={() => onSelect(dateStr)}
                  className={`relative py-1.5 text-sm rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-green-500 text-white'
                      : isToday
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {day}
                  {hasMeals && (
                    <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-green-500'
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
