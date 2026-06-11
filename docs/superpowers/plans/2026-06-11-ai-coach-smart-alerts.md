# AI Coach Smart Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local-computed alert banners to dashboard that detect 5 dietary anomaly patterns and let users open AI chat with pre-filled context.

**Architecture:** Pure-function alert engine (`lib/alerts.ts`) computes alerts from local meal data. AlertBannerList + AlertBanner components render them on dashboard between date and calorie ring. CoachFABWrapper gains a `chatPrefill` state that flows to ChatSheet, which pre-fills its input when opened.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, no new dependencies.

---

## File Structure

| File | Role |
|------|------|
| `lib/alerts.ts` (NEW) | Pure functions: `calcAlerts()`, rule-checkers, helpers. Input: meals + profile → Output: `Alert[]` |
| `lib/types.ts` (MODIFY) | Add `AlertType` and `Alert` interface |
| `components/AlertBanner.tsx` (NEW) | Single alert banner: emoji, title, message, chat button, dismiss button. 3 color variants. |
| `components/AlertBannerList.tsx` (NEW) | Vertical stack of AlertBanners. Manages `dismissed` Set in local state. |
| `app/page.tsx` (MODIFY) | Import `calcAlerts`, render `AlertBannerList` between date `<h1>` and `RingProgress`. Provide `onOpenChat` callback. |
| `components/ChatSheet.tsx` (MODIFY) | Add optional `prefill` prop. On open, if prefill is set, call `chat.setInput(prefill)`. |
| `components/CoachFABWrapper.tsx` (MODIFY) | Add `chatPrefill` state. Pass it to ChatSheet. Expose a `handleOpenChat(prefill)` callback via context or prop drilling to page.tsx. |

**Data flow:** `page.tsx` calls `calcAlerts(meals, profile)` → renders alerts → user clicks "和教练聊聊" → `onOpenChat(prefill)` in CoachFABWrapper sets `chatPrefill` and opens ChatSheet → ChatSheet detects `prefill` and sets input.

---

### Task 1: Add Alert types to lib/types.ts

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add AlertType and Alert type definitions**

At the end of `lib/types.ts` (before `DEFAULT_AI_CONFIG`), insert:

```typescript
// ── 智能预警 ──

export type AlertType = 'calorie_over' | 'calorie_under' | 'macro_imbalance' | 'dinner_heavy' | 'meal_spike';

export interface Alert {
  type: AlertType;
  title: string;
  message: string;
  suggestion: string;
  color: 'yellow' | 'blue' | 'purple';
  emoji: string;
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd d:/calorie-tracker && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to these new types.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add Alert type definitions for smart alert system"
```

---

### Task 2: Create lib/alerts.ts — alert computation engine

**Files:**
- Create: `lib/alerts.ts`

- [ ] **Step 1: Write the full alerts engine**

```typescript
import type { Alert, AlertType, MealRecord, UserProfile, MealType, FoodItem } from './types';
import { calcAvgCalories } from './utils';

// ── Helpers ──────────────────────────────────────────────────────

interface DailySummary {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealBreakdown: Record<MealType, number>;
}

/** Get per-day calorie/macro summaries for the last N days */
function getDailySummaries(meals: MealRecord[], days: number): DailySummary[] {
  const map = new Map<string, DailySummary>();

  for (const m of meals) {
    let day = map.get(m.date);
    if (!day) {
      day = {
        date: m.date,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        mealBreakdown: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
      };
      map.set(m.date, day);
    }
    const mealCal = calcAvgCalories(m.totalCaloriesMin, m.totalCaloriesMax);
    day.calories += mealCal;
    day.mealBreakdown[m.mealType] += mealCal;
    m.foods.forEach((f: FoodItem) => {
      day.protein += f.protein;
      day.carbs += f.carbs;
      day.fat += f.fat;
    });
  }

  return Array.from(map.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days);
}

// ── Rule 1: Consecutive calorie over ─────────────────────────────

function checkCalorieOver(summaries: DailySummary[], target: number): Alert | null {
  const overDays = summaries.filter((d) => d.calories > target * 1.1);
  // Check for 3 consecutive days among the last 7
  const sorted = [...summaries].sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0;
  for (const d of sorted) {
    if (d.calories > target * 1.1) {
      streak++;
      if (streak >= 3) {
        const avg = Math.round(overDays.reduce((s, d) => s + d.calories, 0) / overDays.length);
        return {
          type: 'calorie_over',
          title: `连续${streak}天热量超标`,
          message: `最近${streak}天平均摄入 ${avg}kcal，建议今天控制在 ${target}kcal 以内`,
          suggestion: `我最近几天热量超标了，今天怎么调整饮食？目标 ${target}kcal`,
          color: 'yellow',
          emoji: '⚠️',
        };
      }
    } else {
      streak = 0;
    }
  }
  return null;
}

// ── Rule 2: Consecutive calorie under ────────────────────────────

function checkCalorieUnder(summaries: DailySummary[], target: number): Alert | null {
  const sorted = [...summaries].sort((a, b) => a.date.localeCompare(b.date));
  let streak = 0;
  for (const d of sorted) {
    if (d.calories > 0 && d.calories < target * 0.7) {
      streak++;
      if (streak >= 3) {
        return {
          type: 'calorie_under',
          title: `连续${streak}天热量不足`,
          message: `最近${streak}天摄入偏低，注意营养均衡，别饿着自己`,
          suggestion: `我最近几天吃得太少了，怎么确保营养充足又能控制体重？`,
          color: 'blue',
          emoji: '🔵',
        };
      }
    } else {
      streak = 0;
    }
  }
  return null;
}

// ── Rule 3: Macro imbalance ──────────────────────────────────────

const MACRO_TARGETS = {
  protein: { min: 0.15, max: 0.35 }, // 15-35% of calories
  carbs: { min: 0.40, max: 0.55 },   // 40-55%
  fat: { min: 0.20, max: 0.35 },     // 20-35%
};

function checkMacroImbalance(summaries: DailySummary[]): Alert | null {
  // Calculate 7-day macro averages
  let totalProtein = 0, totalCarbs = 0, totalFat = 0, totalCal = 0;
  for (const d of summaries) {
    totalProtein += d.protein;
    totalCarbs += d.carbs;
    totalFat += d.fat;
    totalCal += d.calories;
  }
  if (totalCal === 0) return null;

  const proteinPct = (totalProtein * 4) / totalCal;
  const carbsPct = (totalCarbs * 4) / totalCal;
  const fatPct = (totalFat * 9) / totalCal;

  // Check deviations >15% from recommended range
  if (carbsPct > MACRO_TARGETS.carbs.max + 0.15) {
    return {
      type: 'macro_imbalance',
      title: `碳水占比偏高（${Math.round(carbsPct * 100)}%）`,
      message: '最近一周碳水占比较高，蛋白质偏少。多加一份肉或蛋吧',
      suggestion: `我的碳水吃太多了，帮我规划一下蛋白质比例怎么提升？`,
      color: 'blue',
      emoji: '🍚',
    };
  }
  if (proteinPct < MACRO_TARGETS.protein.min - 0.15) {
    return {
      type: 'macro_imbalance',
      title: `蛋白质摄入不足（${Math.round(proteinPct * 100)}%）`,
      message: '蛋白质对维持肌肉和代谢很重要，每餐加一份肉/蛋/豆制品',
      suggestion: `我蛋白质吃太少了，有什么简单的高蛋白食物推荐？`,
      color: 'blue',
      emoji: '🥩',
    };
  }

  return null;
}

// ── Rule 4: Dinner too heavy ─────────────────────────────────────

function checkDinnerHeavy(summaries: DailySummary[]): Alert | null {
  const today = summaries[0];
  if (!today || today.calories === 0) return null;

  const dinnerCal = today.mealBreakdown.dinner;
  if (dinnerCal > today.calories * 0.5) {
    const pct = Math.round((dinnerCal / today.calories) * 100);
    return {
      type: 'dinner_heavy',
      title: `晚餐占全天热量 ${pct}%`,
      message: '晚上代谢慢，试试把大餐挪到中午，晚上清淡一点',
      suggestion: `我晚上总是吃太多，怎么调整晚餐习惯？最近晚餐占比${pct}%`,
      color: 'purple',
      emoji: '🌙',
    };
  }
  return null;
}

// ── Rule 5: Single meal spike ────────────────────────────────────

function checkMealSpike(summaries: DailySummary[], target: number): Alert | null {
  const today = summaries[0];
  if (!today || today.calories === 0) return null;

  const mealLabels: Record<MealType, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '加餐',
  };

  for (const mealType of ['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]) {
    const mealCal = today.mealBreakdown[mealType];
    if (mealCal > target * 0.6) {
      return {
        type: 'meal_spike',
        title: `${mealLabels[mealType]}热量偏高`,
        message: `这餐就占了全天目标的 ${Math.round((mealCal / target) * 100)}%，可以考虑分一部分到其他餐`,
        suggestion: `我的${mealLabels[mealType]}吃太多了，帮我优化一下全天饮食分配`,
        color: 'yellow',
        emoji: '⚡',
      };
    }
  }
  return null;
}

// ── Main entry ────────────────────────────────────────────────────

/**
 * Calculate all active alerts from meal data and user profile.
 * Pure function — no side effects, no API calls.
 * Returns alerts in priority order (calorie issues first).
 */
export function calcAlerts(meals: MealRecord[], profile: { dailyTarget: number } | null): Alert[] {
  if (!profile || meals.length === 0) return [];

  const target = profile.dailyTarget;
  const summaries = getDailySummaries(meals, 7);
  if (summaries.length === 0) return [];

  const alerts: Alert[] = [];

  const over = checkCalorieOver(summaries, target);
  if (over) alerts.push(over);

  const under = checkCalorieUnder(summaries, target);
  if (under) alerts.push(under);

  const macro = checkMacroImbalance(summaries);
  if (macro) alerts.push(macro);

  const dinner = checkDinnerHeavy(summaries);
  if (dinner) alerts.push(dinner);

  const spike = checkMealSpike(summaries, target);
  if (spike) alerts.push(spike);

  return alerts;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd d:/calorie-tracker && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/alerts.ts
git commit -m "feat: add calcAlerts engine with 5 dietary anomaly rules"
```

---

### Task 3: Create AlertBanner component

**Files:**
- Create: `components/AlertBanner.tsx`

- [ ] **Step 1: Write the AlertBanner component**

```tsx
'use client';

import type { Alert } from '@/lib/types';

interface Props {
  alert: Alert;
  onChat: (suggestion: string) => void;
  onDismiss: () => void;
}

const COLOR_STYLES: Record<Alert['color'], { bg: string; border: string; text: string; subtext: string; button: string }> = {
  yellow: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100',
    border: 'border-amber-300',
    text: 'text-amber-900',
    subtext: 'text-amber-700',
    button: 'border-amber-400 text-amber-700',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
    border: 'border-blue-300',
    text: 'text-blue-900',
    subtext: 'text-blue-600',
    button: 'border-blue-400 text-blue-700',
  },
  purple: {
    bg: 'bg-gradient-to-br from-violet-50 to-violet-100',
    border: 'border-violet-300',
    text: 'text-violet-900',
    subtext: 'text-violet-600',
    button: 'border-violet-400 text-violet-700',
  },
};

export default function AlertBanner({ alert, onChat, onDismiss }: Props) {
  const s = COLOR_STYLES[alert.color];

  return (
    <div className={`rounded-2xl border p-3 ${s.bg} ${s.border}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-xl leading-none pt-0.5">{alert.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className={`font-bold text-sm ${s.text}`}>{alert.title}</span>
            <button
              onClick={onDismiss}
              className={`shrink-0 text-base leading-none ${s.subtext} opacity-50 hover:opacity-100 transition-opacity`}
              aria-label="关闭"
            >
              ✕
            </button>
          </div>
          <p className={`text-xs mt-1 ${s.subtext}`}>{alert.message}</p>
          <button
            onClick={() => onChat(alert.suggestion)}
            className={`mt-2.5 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white border text-xs font-semibold ${s.button} active:brightness-95 transition-all`}
          >
            💬 和教练聊聊
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/AlertBanner.tsx
git commit -m "feat: add AlertBanner component with 3 color variants"
```

---

### Task 4: Create AlertBannerList component

**Files:**
- Create: `components/AlertBannerList.tsx`

- [ ] **Step 1: Write the AlertBannerList component**

```tsx
'use client';

import { useState } from 'react';
import type { Alert, AlertType } from '@/lib/types';
import AlertBanner from './AlertBanner';

interface Props {
  alerts: Alert[];
  onOpenChat: (prefill: string) => void;
}

export default function AlertBannerList({ alerts, onOpenChat }: Props) {
  const [dismissed, setDismissed] = useState<Set<AlertType>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.type));
  if (visible.length === 0) return null;

  const handleDismiss = (type: AlertType) => {
    setDismissed((prev) => new Set(prev).add(type));
  };

  return (
    <div className="space-y-2">
      {visible.map((alert) => (
        <AlertBanner
          key={alert.type}
          alert={alert}
          onChat={onOpenChat}
          onDismiss={() => handleDismiss(alert.type)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/AlertBannerList.tsx
git commit -m "feat: add AlertBannerList container with local dismiss state"
```

---

### Task 5: Modify app/page.tsx — wire alerts into dashboard

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add imports and alert computation**

Replace the top imports block to add the new imports:

The current imports (lines 1-11):
```tsx
'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/AppContext';
import { type MealType } from '@/lib/types';
import { calcAvgCalories } from '@/lib/utils';
import RingProgress from '@/components/RingProgress';
import MacroBars from '@/components/MacroBar';
import MealSection from '@/components/MealSection';
import OnboardingWizard from '@/components/OnboardingWizard';
```

Add these two new imports after the existing imports:
```tsx
import { calcAlerts } from '@/lib/alerts';
import AlertBannerList from '@/components/AlertBannerList';
```

- [ ] **Step 2: Add alerts computation and onOpenChat callback**

After the `const macros = useMemo(...)` block (line 43-53), add:

```tsx
  const alerts = useMemo(() => calcAlerts(meals, profile), [meals, profile]);
```

- [ ] **Step 3: Add alert rendering and open-chat handling**

The dashboard component needs a way to open ChatSheet with prefill. Since ChatSheet is managed in CoachFABWrapper (at layout level), we need a simple mechanism. The simplest approach that avoids context or prop-drilling hell: use a **custom event** or a **module-level callback**.

Add a module-level callback in `CoachFABWrapper.tsx` (done in Task 7). For page.tsx, we just need to call it.

In the JSX return, between the date `<h1>` and the `<div className="flex justify-center...">` (between lines 69-70 original), insert:

```tsx
      <AlertBannerList
        alerts={alerts}
        onOpenChat={(prefill) => {
          // Dispatch custom event picked up by CoachFABWrapper
          window.dispatchEvent(new CustomEvent('open-coach-chat', { detail: prefill }));
        }}
      />
```

The final JSX structure should look like:
```tsx
  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-sm text-gray-400 tracking-wide">{dateStr}</h1>

      <AlertBannerList
        alerts={alerts}
        onOpenChat={(prefill) => {
          window.dispatchEvent(new CustomEvent('open-coach-chat', { detail: prefill }));
        }}
      />

      <div className="flex justify-center pt-2 pb-2">
        <RingProgress current={roundedCalories} target={dailyTarget} />
      </div>
      {/* ... rest unchanged ... */}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd d:/calorie-tracker && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire AlertBannerList into dashboard between date and calorie ring"
```

---

### Task 6: Modify ChatSheet — accept prefill prop

**Files:**
- Modify: `components/ChatSheet.tsx`

- [ ] **Step 1: Add prefill prop to Props interface**

Read the current Props interface (lines 16-19):
```tsx
interface Props {
  open: boolean;
  onClose: () => void;
}
```

Change to:
```tsx
interface Props {
  open: boolean;
  onClose: () => void;
  prefill?: string;
}
```

In the component function signature, destructure `prefill`:
```tsx
export default function ChatSheet({ open, onClose, prefill }: Props) {
```

- [ ] **Step 2: Apply prefill when ChatSheet opens**

After the existing `useEffect` that triggers `checkAndUpdateMemory` (lines 28-33), add a new effect:

```tsx
  // Pre-fill input when opened with a suggestion
  useEffect(() => {
    if (open && prefill) {
      chat.setInput(prefill);
    }
  }, [open, prefill]);
```

The `chat` object comes from `useChat()`. The `setInput` function is already returned by the hook. This will automatically populate the input field when ChatSheet opens with a prefill.

- [ ] **Step 3: Commit**

```bash
git add components/ChatSheet.tsx
git commit -m "feat: add prefill prop to ChatSheet for auto-filling input"
```

---

### Task 7: Modify CoachFABWrapper — bridge alerts to ChatSheet

**Files:**
- Modify: `components/CoachFABWrapper.tsx`

- [ ] **Step 1: Add custom event listener for open-coach-chat**

Replace the entire file content. Current code (37 lines):

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/AppContext';
import { loadMemory } from '@/lib/db';
import { DEFAULT_AI_CONFIG } from '@/lib/types';
import CoachFAB from '@/components/CoachFAB';
import ChatSheet from '@/components/ChatSheet';

export default function CoachFABWrapper() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState(DEFAULT_AI_CONFIG.avatar);
  const [name, setName] = useState(DEFAULT_AI_CONFIG.name);

  useEffect(() => {
    loadMemory().then((m) => {
      setAvatar(m.aiConfig.avatar);
      setName(m.aiConfig.name);
    });
  }, []);

  if (!state.profile) return null;

  return (
    <>
      <CoachFAB
        onClick={() => setOpen(true)}
        isOpen={open}
        avatar={avatar}
        name={name}
      />
      <ChatSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

New version:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/AppContext';
import { loadMemory } from '@/lib/db';
import { DEFAULT_AI_CONFIG } from '@/lib/types';
import CoachFAB from '@/components/CoachFAB';
import ChatSheet from '@/components/ChatSheet';

export default function CoachFABWrapper() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState(DEFAULT_AI_CONFIG.avatar);
  const [name, setName] = useState(DEFAULT_AI_CONFIG.name);
  const [chatPrefill, setChatPrefill] = useState<string | undefined>();

  useEffect(() => {
    loadMemory().then((m) => {
      setAvatar(m.aiConfig.avatar);
      setName(m.aiConfig.name);
    });
  }, []);

  const handleOpenChat = useCallback((prefill?: string) => {
    setChatPrefill(prefill);
    setOpen(true);
  }, []);

  // Listen for cross-component open-coach-chat events from dashboard alerts
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      handleOpenChat(detail);
    };
    window.addEventListener('open-coach-chat', handler);
    return () => window.removeEventListener('open-coach-chat', handler);
  }, [handleOpenChat]);

  const handleClose = () => {
    setOpen(false);
    setChatPrefill(undefined);
  };

  if (!state.profile) return null;

  return (
    <>
      <CoachFAB
        onClick={() => handleOpenChat()}
        isOpen={open}
        avatar={avatar}
        name={name}
      />
      <ChatSheet open={open} onClose={handleClose} prefill={chatPrefill} />
    </>
  );
}
```

- [ ] **Step 2: Verify full build**

Run: `cd d:/calorie-tracker && npm run build 2>&1`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add components/CoachFABWrapper.tsx
git commit -m "feat: bridge dashboard alerts to ChatSheet via custom event + prefill"
```

---

## Verification

After all tasks complete, verify end-to-end:

1. **Build**: `npm run build` passes
2. **No-alert state**: Empty/fresh data shows no banners (normal dashboard unchanged)
3. **Calorie over alert**: With 3+ days of meals exceeding target × 1.1, yellow banner appears between date and calorie ring
4. **Macro imbalance alert**: With 7-day carbs > 70% of calories, blue banner appears
5. **Dismiss**: Click ✕ on a banner → it disappears, other banners remain
6. **Chat prefill**: Click "和教练聊聊" → ChatSheet opens with message pre-filled in input
7. **Build succeeds**: Final `npm run build` passes cleanly
