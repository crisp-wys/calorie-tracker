# Zakka Kitchen UI Redesign Implementation Plan

> **For agentic workers:** This is a pure visual redesign — all Tailwind class/value swaps with no logic changes. Each task touches different files with no interdependency beyond the shared design tokens.

**Goal:** Transform app from generic iOS-light style to Zakka Kitchen aesthetic — warm paper tones, terracotta red, elegant typography.

**Architecture:** Foundation layer (globals.css + layout.tsx) establishes new design tokens and fonts. Component layer swaps Tailwind classes to consume those tokens. No logic, data flow, or functionality changes.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Google Fonts (Playfair Display, ZCOOL XiaoWei, Noto Sans SC Light)

---

### Task 1: Foundation — globals.css + layout.tsx

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Rewrite globals.css with Zakka tokens**

Replace the entire file:

```css
@import "tailwindcss";

@theme {
  --color-brand: #D95959;
}

@layer base {
  * {
    -webkit-tap-highlight-color: transparent;
  }
  html {
    height: 100%;
  }
  body {
    height: 100%;
    background-color: #FAF6F0;
    color: #3D3226;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-image:
      radial-gradient(circle at 20% 30%, rgba(196,166,138,0.08), transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(217,89,89,0.04), transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(107,143,137,0.03), transparent 60%);
    background-size: 100% 100%;
  }
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

@keyframes float-gentle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

@utility animate-float {
  animation: float-gentle 4s ease-in-out infinite;
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@utility animate-slide-up {
  animation: slide-up 0.2s ease-out;
}

@keyframes chat-sheet-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes chat-sheet-down {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}

@keyframes chat-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes chat-backdrop-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

- [ ] **Step 2: Update layout.tsx — add new fonts**

In `app/layout.tsx`, add Playfair Display and ZCOOL XiaoWei imports. Replace the font declarations:

```tsx
import type { Metadata, Viewport } from 'next';
import { ZCOOL_KuaiLe, ZCOOL_XiaoWei, Noto_Sans_SC, Montserrat, Playfair_Display } from 'next/font/google';
import { AppProvider } from '@/lib/AppContext';
import BottomTabWrapper from '@/components/BottomTabWrapper';
import CoachFABWrapper from '@/components/CoachFABWrapper';
import './globals.css';

const zcool = ZCOOL_KuaiLe({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-zcool-kuai-le',
});

const zcoolXiaoWei = ZCOOL_XiaoWei({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-zcool-xiaowei',
});

const montserrat = Montserrat({
  weight: '900',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

const notoSans = Noto_Sans_SC({
  weight: ['300', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-sc',
});

const playfair = Playfair_Display({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: '这顿不算',
  description: '拍照识别热量，吃了再说',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#D95959',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${zcool.variable} ${zcoolXiaoWei.variable} ${montserrat.variable} ${notoSans.variable} ${playfair.variable}`}>
      <body style={{ fontFamily: notoSans.style.fontFamily, fontWeight: 300 }}>
        <AppProvider>
          <main className="mx-auto max-w-lg pb-16 min-h-full">
            {children}
          </main>
          <BottomTabWrapper />
          <CoachFABWrapper />
        </AppProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: Zakka Kitchen foundation — new tokens, fonts, background"
```

---

### Task 2: RingProgress — thick stroke, elegant numbers

**Files:**
- Modify: `components/RingProgress.tsx`

- [ ] **Step 1: Swap colors and typography in RingProgress**

Change the SVG circle colors, text font, and glow style:

- Track ring: `stroke="#f3f4f6"` → `stroke="#EFE8DE"`
- Active ring: `stroke={isOver ? '#ef4444' : '#E63946'}` → both use `#D95959`, over is `#C44F4F`
- Stroke width default: `12` → `14`
- Remove the `filter: 'drop-shadow(...)'` from the active circle
- Center number: add `fontFamily: 'var(--font-playfair)'`, change `font-extrabold` to `font-normal`, change `text-3xl` to `text-4xl`
- "剩余 X" text: `font-semibold` → `font-normal`, add `fontFamily: 'var(--font-zcool-xiaowei)'`

The key SVG portion:
```tsx
<circle cx={size / 2} cy={size / 2} r={radius} fill="none"
  stroke="#EFE8DE" strokeWidth={strokeWidth} />
<circle cx={size / 2} cy={size / 2} r={radius} fill="none"
  stroke={isOver ? '#C44F4F' : '#D95959'} strokeWidth={strokeWidth}
  strokeDasharray={circumference} strokeDashoffset={offset}
  strokeLinecap="round"
  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
/>
```

Center text:
```tsx
<div className="text-4xl tabular-nums tracking-tight" style={{ fontFamily: 'var(--font-playfair)', fontWeight: 400 }}>{current}</div>
<div className="text-xs text-[#C4B5A5] mt-0.5">/ {target} kcal</div>
<div className="mt-1 text-sm text-[#D95959] tabular-nums" style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}>
  剩余 {Math.max(target - current, 0)}
</div>
```

Background glow: `bg-brand/5` → `bg-[#D95959]/5`

- [ ] **Step 2: Commit**

```bash
git add components/RingProgress.tsx
git commit -m "feat: Zakka RingProgress — thick stroke, Playfair numbers, soft glow"
```

---

### Task 3: MacroBar → three-column card layout

**Files:**
- Modify: `components/MacroBar.tsx`

- [ ] **Step 1: Rewrite MacroBars from horizontal bars to three-column cards**

Replace the entire file:

```tsx
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
  const values = { protein: { current: protein, target: proteinTarget }, carbs: { current: carbs, target: carbsTarget }, fat: { current: fat, target: fatTarget } };

  return (
    <div className="flex gap-2">
      {MACRO_ITEMS.map(({ key, emoji, label, color, bg, unit }) => {
        const { current, target } = values[key];
        const ratio = target > 0 ? Math.min(current / target, 1) : 0;
        return (
          <div key={key} className="flex-1 rounded-2xl p-3.5 text-center" style={{ backgroundColor: bg }}>
            <div className="text-xl mb-1">{emoji}</div>
            <div className="text-lg tabular-nums" style={{ fontFamily: 'var(--font-playfair)', color: '#3D3226' }}>
              {current}
            </div>
            <div className="text-[10px] text-[#C4B5A5] mt-0.5">{label} {unit}</div>
            <div className="mt-2 h-1 rounded-full" style={{ backgroundColor: '#EFE8DE' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${ratio * 100}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default MacroBars;
```

Remove the old `MacroBar` single component, remove `MacroBarProps` interface. The export stays as `MacroBars`.

- [ ] **Step 2: Commit**

```bash
git add components/MacroBar.tsx
git commit -m "feat: Zakka MacroBar — three-column card layout with emoji"
```

---

### Task 4: MealSection + FoodCard

**Files:**
- Modify: `components/MealSection.tsx`
- Modify: `components/FoodCard.tsx`

- [ ] **Step 1: Update MealSection — warm paper cards, emoji, dashed empty**

Add emoji per meal type. Change visual classes:

```tsx
const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '🌞',
  dinner: '🌙',
  snack: '🍪',
};
```

Card container: `rounded-2xl bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)]` → `rounded-2xl bg-[#FFFBF6]`

Empty state link: `text-gray-300 hover:text-brand` → `text-[#C4B5A5] hover:text-[#D95959]`

Has meals button: keep same structure but update text colors:
- label: `text-sm font-medium` → add `style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}`
- calories: `text-gray-500` → `text-[#C4B5A5]`
- Empty state: `text-gray-300` → `text-[#C4B5A5]`, but with dashed border on the card (`border border-dashed border-[#E8DDD0]`) when empty

Expanded panel: `border-gray-100` → `border-[#E8DDD0]`
Timestamp: `text-gray-400` → `text-[#C4B5A5]`
Delete button: `text-gray-300 hover:text-red-500` → `text-[#C4B5A5] hover:text-[#D95959]`

Add emoji before the meal label name. Also add food item preview text for non-empty meals (first 3 food names, comma-separated). Use `meals[0]?.foods?.slice(0, 3)?.map(f => f.name)?.join(' · ')`.

---

- [ ] **Step 2: Update FoodCard — warm paper background**

In `components/FoodCard.tsx`:

Display mode: `bg-white border-gray-100` → `bg-[#FFFBF6] border-[#E8DDD0]`
- Name: `font-medium` → unchanged, keep readable
- Macros: `text-gray-400` → `text-[#C4B5A5]`

Edit mode: `border-brand/30 bg-brand/5` → `border-[#D95959]/30 bg-[#D95959]/5`
- Save button: `bg-brand` → `bg-[#D95959]`
- Input labels: `text-gray-400` → `text-[#C4B5A5]`

- [ ] **Step 3: Commit**

```bash
git add components/MealSection.tsx components/FoodCard.tsx
git commit -m "feat: Zakka MealSection + FoodCard — warm paper, emoji, dashed empty states"
```

---

### Task 5: BottomTab + CoachFAB

**Files:**
- Modify: `components/BottomTab.tsx`
- Modify: `components/CoachFAB.tsx`

- [ ] **Step 1: BottomTab — linen frosted glass**

Nav container: `bg-white/90 backdrop-blur border-t border-gray-100` → `bg-[#FAF6F0]/95 backdrop-blur border-t border-[#E8DDD0]`

Active tab: `text-brand font-semibold` → `text-[#D95959] font-semibold`
Inactive tab: `text-gray-400 hover:text-gray-600` → `text-[#C4B5A5] hover:text-[#B0A090]`

- [ ] **Step 2: CoachFAB — warm paper label**

Label pill: `bg-white text-brand border-brand/10` → `bg-[#FFFBF6] text-[#D95959] border-[#D95959]/10`

Avatar button: `shadow-lg hover:shadow-xl` → `shadow-md hover:shadow-lg` (softer)

- [ ] **Step 3: Commit**

```bash
git add components/BottomTab.tsx components/CoachFAB.tsx
git commit -m "feat: Zakka BottomTab + CoachFAB — linen glass, warm paper"
```

---

### Task 6: AlertBanner — softer gradients

**Files:**
- Modify: `components/AlertBanner.tsx`

- [ ] **Step 1: Soften gradient colors while keeping semantic meaning**

Update `COLOR_STYLES` to use softer, Zakka-friendly gradients:

```tsx
const COLOR_STYLES: Record<Alert['color'], { bg: string; border: string; text: string; subtext: string; button: string }> = {
  yellow: {
    bg: 'bg-gradient-to-br from-amber-50/90 to-orange-50/80',
    border: 'border-amber-200',
    text: 'text-amber-800',
    subtext: 'text-amber-700',
    button: 'border-amber-300 text-amber-700',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50/80 to-sky-50/80',
    border: 'border-blue-200',
    text: 'text-blue-800',
    subtext: 'text-blue-600',
    button: 'border-blue-300 text-blue-700',
  },
  purple: {
    bg: 'bg-gradient-to-br from-violet-50/80 to-purple-50/80',
    border: 'border-violet-200',
    text: 'text-violet-800',
    subtext: 'text-violet-600',
    button: 'border-violet-300 text-violet-700',
  },
};
```

Also update the chat button text: `💬 和教练聊聊` stays, but use `bg-[#FFFBF6]` for the pill background.

- [ ] **Step 2: Commit**

```bash
git add components/AlertBanner.tsx
git commit -m "feat: Zakka AlertBanner — softer gradients, warm buttons"
```

---

### Task 7: CalendarPage + CalendarGrid

**Files:**
- Modify: `components/CalendarGrid.tsx`
- Modify: `app/calendar/page.tsx`

- [ ] **Step 1: CalendarGrid — serif dates, warm colors**

Day names: `text-gray-400` → `text-[#C4B5A5]`

Day buttons:
- Selected: `bg-brand text-white shadow-sm` → `bg-[#D95959] text-white`
- Today: `bg-brand/10 text-brand font-semibold` → `bg-[#D95959]/10 text-[#D95959]`
- Default: `text-gray-700 hover:bg-gray-100` → `text-[#5D5040] hover:bg-[#EFE8DE]`

Day number font: add `style={{ fontFamily: 'var(--font-playfair)' }}`

Meal indicator dot: `bg-brand/70` → `bg-[#D95959]/60`

- [ ] **Step 2: Calendar page header**

Read `app/calendar/page.tsx`. Update month navigation text and detail card:
- Month title: `text-lg font-semibold` → add ZCOOL XiaoWei font
- Detail card: `bg-brand/10` → `bg-[#D95959]/5`, `text-brand` → `text-[#D95959]`
- Status text: `text-gray-400` → `text-[#C4B5A5]`

- [ ] **Step 3: Commit**

```bash
git add components/CalendarGrid.tsx app/calendar/page.tsx
git commit -m "feat: Zakka calendar — Playfair dates, warm markers"
```

---

### Task 8: PhotoCapture — terracotta button

**Files:**
- Modify: `components/PhotoCapture.tsx`

- [ ] **Step 1: Swap brand colors in photo capture**

Loading spinner and text: `text-brand` → `text-[#D95959]`, `text-gray-400` → `text-[#C4B5A5]`

Camera button: `bg-brand text-white shadow-lg shadow-brand/25` → `bg-[#D95959] text-white shadow-lg shadow-[#D95959]/20`

Capturing text: `text-gray-400` → `text-[#C4B5A5]`

ActionSheet backdrop: unchanged (black/35 is fine)

ActionSheet panel: `bg-white` → `bg-[#FFFBF6]`

Option buttons: `bg-gray-50 active:bg-gray-100` → `bg-[#FAF6F0] active:bg-[#EFE8DE]`

Option icon: `text-brand` → `text-[#D95959]`

Cancel button: `text-gray-400 bg-gray-100` → `text-[#C4B5A5] bg-[#EFE8DE]`

Drag handle: `bg-gray-300` → `bg-[#E8DDD0]`

- [ ] **Step 2: Commit**

```bash
git add components/PhotoCapture.tsx
git commit -m "feat: Zakka PhotoCapture — terracotta button, warm action sheet"
```

---

### Task 9: ChatSheet — warm paper bubbles

**Files:**
- Modify: `components/ChatSheet.tsx`

- [ ] **Step 1: Swap ChatSheet colors**

Panel background: `bg-white` → `bg-[#FFFBF6]`
Header border: `border-gray-100` → `border-[#E8DDD0]`

AI bubble: `bg-gray-100 text-gray-800` → `bg-[#EFE8DE] text-[#3D3226]`
User bubble: `bg-brand text-white` → `bg-[#D95959] text-white`

Input border: `border-gray-200 focus:border-brand` → `border-[#E8DDD0] focus:border-[#D95959]`
Send button: `bg-brand` → `bg-[#D95959]`
Settings buttons: `text-gray-400 hover:text-gray-600` → `text-[#C4B5A5] hover:text-[#B0A090]`

Settings modal background: keep `bg-white` (modals stay clean)

Settings modal: avatar grid selection ring: `ring-brand bg-brand/10` → `ring-[#D95959] bg-[#D95959]/10`
Settings save button: `bg-brand` → `bg-[#D95959]`

- [ ] **Step 2: Commit**

```bash
git add components/ChatSheet.tsx
git commit -m "feat: Zakka ChatSheet — warm paper bubbles, terracotta send"
```

---

### Task 10: OnboardingWizard + Settings page

**Files:**
- Modify: `components/OnboardingWizard.tsx`
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: OnboardingWizard — unified warm palette**

Background: `#F8F9FA` → `#FAF6F0`
Background image: remove the old grid pattern, use same radial gradients as body

Brand title: keep ZCOOL KuaiLe, but change `text-[#1A1A1A]` → `text-[#3D3226]`
Gradient card: `from-[#E63946] via-[#FF6B6B] to-[#FFD93D]` → `from-[#D95959] via-[#E88D8D] to-[#E8B86D]`

Progress dots active: `bg-brand` → `bg-[#D95959]`
Progress dots inactive: `bg-gray-300` → `bg-[#E8DDD0]`

Form inputs: `border-gray-200 focus:border-brand focus:ring-brand/10` → `border-[#E8DDD0] focus:border-[#D95959] focus:ring-[#D95959]/10`
Selected toggle: `border-brand bg-brand/10 text-brand shadow-sm shadow-brand/10` → `border-[#D95959] bg-[#D95959]/10 text-[#D95959]`

Primary buttons: `bg-brand shadow-md shadow-brand/20` → `bg-[#D95959] shadow-md shadow-[#D95959]/20`
TDEE preview: `bg-brand/5` → `bg-[#D95959]/5`, `text-brand` → `text-[#D95959]`

Goal cards: `border-brand bg-brand/5` → `border-[#D95959] bg-[#D95959]/5`

- [ ] **Step 2: Settings page — same token swaps**

Input fields: `border-gray-200 bg-gray-50 focus:border-brand focus:ring-brand/10` → `border-[#E8DDD0] bg-[#FAF6F0] focus:border-[#D95959] focus:ring-[#D95959]/10`

Selected gender/goal toggle: `border-brand bg-brand/10 text-brand shadow-sm shadow-brand/10` → `border-[#D95959] bg-[#D95959]/10 text-[#D95959]`

TDEE card: `bg-brand/10` → `bg-[#D95959]/5`, `text-brand` → `text-[#D95959]`

Save button: `bg-brand shadow-md shadow-brand/20` → `bg-[#D95959] shadow-md shadow-[#D95959]/20`

Page title: `text-xl font-extrabold` → add `style={{ fontFamily: 'var(--font-zcool-xiaowei)' }}`
Labels: `text-gray-600` → `text-[#8A7B6B]`

- [ ] **Step 3: Commit**

```bash
git add components/OnboardingWizard.tsx app/settings/page.tsx
git commit -m "feat: Zakka OnboardingWizard + Settings — warm palette, unified tokens"
```

---

### Task 11: Final build + polish

- [ ] **Step 1: Build and fix any issues**

Run: `cd d:/calorie-tracker && npm run build 2>&1`
Expected: Build succeeds with no TypeScript errors.

If there are errors (e.g., a font not loading correctly, or a class mismatch), fix them before proceeding.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: final Zakka build pass"
```

---

## Verification

After all tasks complete:

1. **Build**: `npm run build` passes cleanly
2. **Dashboard**: Warm cream background, Playfair Display numbers in ring, three-column macro cards with emoji, warm paper meal sections with emoji, soft alert banners
3. **Camera**: Terracotta red button (not bright red), warm action sheet
4. **Calendar**: Playfair Display date numbers, warm selected state, ZCOOL XiaoWei month header
5. **Settings**: Unified warm palette inputs and toggles
6. **Navigation**: Linen-colored frosted glass bottom tab, warm CoachFAB label
7. **Chat**: Warm paper bubbles, terracotta send button
