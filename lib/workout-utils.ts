export interface ExerciseDef {
  name: string;
  met: number;
}

export interface BodyPartDef {
  key: string;
  label: string;
  emoji: string;
  exercises: ExerciseDef[];
}

export const BODY_PARTS: BodyPartDef[] = [
  {
    key: '胸', label: '胸', emoji: '🏋️',
    exercises: [
      { name: '杠铃卧推', met: 5 },
      { name: '哑铃卧推', met: 5 },
      { name: '上斜杠铃卧推', met: 5 },
      { name: '上斜哑铃卧推', met: 5 },
      { name: '下斜卧推', met: 5 },
      { name: '哑铃飞鸟', met: 4 },
      { name: '绳索夹胸', met: 4 },
      { name: '双杠臂屈伸', met: 5 },
    ],
  },
  {
    key: '背', label: '背', emoji: '🔙',
    exercises: [
      { name: '引体向上', met: 6 },
      { name: '坐姿划船', met: 5 },
      { name: '高位下拉', met: 5 },
      { name: 'T杠划船', met: 5 },
      { name: '大剪刀', met: 4 },
    ],
  },
  {
    key: '肩', label: '肩', emoji: '🦾',
    exercises: [
      { name: '侧平举', met: 3 },
      { name: '面拉', met: 3 },
      { name: '蝴蝶机反向飞鸟', met: 3 },
      { name: '坐姿杠铃推举', met: 5 },
      { name: 'Y字侧平举', met: 3 },
    ],
  },
  {
    key: '手臂', label: '手臂', emoji: '💪',
    exercises: [
      { name: '二头弯举', met: 3 },
      { name: '绳索三头下压', met: 3 },
    ],
  },
  {
    key: '腿', label: '腿', emoji: '🦵',
    exercises: [
      { name: '倒蹬', met: 6 },
      { name: '俯卧腿弯举', met: 4 },
      { name: '坐姿腿弯举', met: 4 },
      { name: '夹腿', met: 4 },
    ],
  },
  {
    key: '核心', label: '核心', emoji: '🏛️',
    exercises: [
      { name: '卷腹', met: 3 },
      { name: '悬垂举腿', met: 5 },
    ],
  },
  {
    key: '有氧', label: '有氧', emoji: '🏃',
    exercises: [
      { name: '游泳', met: 8 },
      { name: '爬楼', met: 8 },
      { name: '爬坡', met: 7 },
    ],
  },
];

/** Find an exercise definition by name across all body parts */
export function findExercise(name: string): (ExerciseDef & { bodyPart: BodyPartDef }) | null {
  for (const bp of BODY_PARTS) {
    const ex = bp.exercises.find((e) => e.name === name);
    if (ex) return { ...ex, bodyPart: bp };
  }
  return null;
}

/** Estimate calories burned for a strength exercise */
export function calcStrengthCalories(
  exerciseName: string,
  sets: number,
  reps: number,
  weightKg: number,
  bodyWeightKg: number,
): { duration: number; calories: number } {
  const ex = findExercise(exerciseName);
  const met = ex?.met ?? 5;
  // Duration: ~2 min per set (work + rest between sets). MET values already account for intermittent nature of weight training.
  const durationMin = sets * 2;
  // Calories = MET × weight × hours × 0.8 discount
  const rawCals = met * bodyWeightKg * (durationMin / 60);
  const calories = Math.round(rawCals * 0.8);
  return { duration: Math.round(durationMin), calories };
}

/** Estimate calories burned for a cardio exercise */
export function calcCardioCalories(
  exerciseName: string,
  durationMin: number,
  bodyWeightKg: number,
): number {
  const ex = findExercise(exerciseName);
  const met = ex?.met ?? 7;
  const rawCals = met * bodyWeightKg * (durationMin / 60);
  return Math.round(rawCals * 0.8);
}

/** Sum today's workout calories from a list of records */
export function sumTodayWorkoutCalories(workouts: { date: string; calories: number }[]): number {
  const today = new Date().toISOString().split('T')[0];
  return workouts
    .filter((w) => w.date === today)
    .reduce((sum, w) => sum + w.calories, 0);
}

/** Get daily workout calories grouped by date */
export function getWorkoutCaloriesByDate(
  workouts: { date: string; calories: number }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of workouts) {
    map.set(w.date, (map.get(w.date) ?? 0) + w.calories);
  }
  return map;
}
