# Zakka Kitchen · UI 全面重设计

## Context

"这顿不算"当前 UI 是通用 iOS 柔和风格——亮红 `#E63946`、冷灰底色 `#F8F9FA`、白色卡片、Noto Sans SC 全局。干净但缺乏辨识度。app 名字自带"吃了就吃了"的松弛态度，视觉应该匹配这种温暖、不焦虑的气质。

目标：将整体视觉重设计为 **日式杂货铺美学 (Zakka Kitchen)**——像一家温暖的日式生活杂货铺，陶土红 × 亚麻米色 × 自然留白。

## 设计 Token

### 配色

| Token | 旧值 | 新值 | 用途 |
|-------|------|------|------|
| `--color-brand` | `#E63946` | `#D95959` | 品牌色（陶土红，更柔和） |
| page bg | `#F8F9FA` | `#FAF6F0` | 页面底色（亚麻米） |
| card bg | `#FFF` | `#FFFBF6` | 卡片（暖白纸） |
| text | `#111827` | `#3D3226` | 正文（深焙茶） |
| muted | `text-gray-400/500` | `#C4B5A5` | 辅助文字（亚麻灰） |
| track | `#f3f4f6` | `#EFE8DE` | 进度条底色（米糠白） |
| carbs | `#eab308` | `#E8B86D` | 碳水（蜂蜜金） |
| fat | `#3b82f6` | `#6B8F89` | 脂肪（抹茶绿） |
| protein | `#ef4444` | `#D95959` | 蛋白（同品牌色） |

Alert 配色保持原有语义（yellow/blue/purple），但改用更柔和的渐变。

### 字体

| 用途 | 字体 | Weight | 说明 |
|------|------|--------|------|
| 数字（热量、统计） | Playfair Display | 400 | 优雅衬线，杂志感 |
| 中文标题（日期、餐段名） | ZCOOL XiaoWei | 400 | 手工感、有个性 |
| 正文（所有 UI 文字） | Noto Sans SC | 300 (Light) | 轻量、呼吸感 |
| 品牌名 | ZCOOL KuaiLe | 400 | 保留不动 |

- Playfair Display 和 ZCOOL XiaoWei 均来自 Google Fonts
- 全局 body 改用 `Noto Sans SC Light (300)` 增加呼吸感

### 圆角

| 层级 | 值 | 用途 |
|------|------|------|
| 大卡片 | `rounded-2xl` (16px) | 热量环卡片、宏量元素卡片、餐段卡片 |
| 按钮/标签 | `rounded-xl` (12px) | 预警 pill、设置项、日历单元格 |
| 小元素 | `rounded-lg` (8px) | FoodCard、底部导航图标 |

### 背景

```css
body {
  background-color: #FAF6F0;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(196,166,138,0.08), transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(217,89,89,0.04), transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(107,143,137,0.03), transparent 60%);
}
```

移除旧的网格点背景。可选加 CSS noise 纹理（SVG feTurbulence）。

## 组件改版

### RingProgress（热量环）

- 描边加粗：`strokeWidth` 默认 12 → **14**
- 底色从 `#f3f4f6` → `#EFE8DE`
- 移除 SVG `drop-shadow` filter，改用背景光晕 `bg-[#D95959]/5 blur-2xl`
- 中间数字用 Playfair Display，`font-weight: 400`，`text-4xl`
- "剩余 X" 文字用 ZCOOL XiaoWei

### MacroBar → 三列卡片布局

从横条改为三列独立卡片：
- 每列：emoji 图标 + 数字（Playfair Display）+ 标签（Noto Sans SC Light）+ 细进度条
- 底色对应：蛋白 `#FEF0E8`、碳水 `#FFF8E8`、脂肪 `#F0F5F2`
- 进度条高 3px，用对应颜色

### MealSection（餐段卡片）

- 背景 `#FFFBF6`，圆角 `rounded-2xl`
- 每个餐段一行：emoji 圆形图标 + 餐段名 + 食物预览 + 热量
- 空态：虚线边框 `border-dashed border-[#E8DDD0]` + 灰色文字 + 红色 "+" 按钮
- 展开后的 FoodCard 用浅色分隔

### FoodCard

- 缩小圆角到 `rounded-lg`
- 背景 `#FFFBF6`，hover 时微暖
- 编辑模式下边框 `border-[#D95959]/30`，背景 `bg-[#D95959]/5`

### AlertBanner（预警横幅）

- 保持三种颜色语义，但改用更柔和的渐变
- 关闭按钮和聊天按钮样式统一为 Zakka 风格
- 圆角 `rounded-2xl`

### CalendarGrid（日历）

- 日期数字用 Playfair Display
- 今天：`bg-[#D95959]/10 text-[#D95959]`
- 选中：`bg-[#D95959] text-white`
- 标记点：`bg-[#D95959]/60`
- 月份标题用 ZCOOL XiaoWei

### BottomTab（底部导航）

- 背景 `bg-[#FAF6F0]/95 backdrop-blur`（亚麻色毛玻璃）
- 上边框 `border-t border-[#E8DDD0]`
- Active 颜色 `text-[#D95959]`
- Inactive `text-[#C4B5A5]`

### PhotoCapture（拍照按钮）

- 大圆按钮颜色从 `bg-brand` → `bg-[#D95959]`
- 外圈光晕用 `shadow-[0_0_24px_rgba(217,89,89,0.3)]`

### CoachFAB（AI 教练悬浮按钮）

- 标签 pill：`bg-[#FFFBF6] text-[#D95959] border-[#D95959]/10`
- 头像按钮保持，shadow 柔和化

### ChatSheet（聊天面板）

- 面板背景 `bg-[#FFFBF6]`
- AI 气泡：`bg-[#EFE8DE] text-[#3D3226]`（陶土质感的暖灰）
- 用户气泡：`bg-[#D95959] text-white`
- 输入框：`bg-white border-[#E8DDD0] focus:border-[#D95959]`
- Header 分隔线：`border-[#E8DDD0]`

### OnboardingWizard（引导页）

- 背景统一为 `#FAF6F0`
- 按钮颜色 `bg-[#D95959]`
- 进度点颜色 `bg-[#D95959]`
- 保留 ZCOOL KuaiLe 品牌标题

### Settings（设置页）

- 输入框：`bg-white border-[#E8DDD0] rounded-xl`
- 选中态 toggle：`bg-[#D95959]/10 border-[#D95959] text-[#D95959]`
- 保存按钮：`bg-[#D95959]`
- TDEE 预览卡片：`bg-[#D95959]/5 border-[#D95959]/10`

## 不做

- ❌ 不改 Tailwind v4 架构（保留 `@theme` 和 `@utility`）
- ❌ 不改任何功能逻辑、数据流、API 调用
- ❌ 不引入第三方 UI 库
- ❌ 不加暗色模式（保持 light-only）

## 涉及文件

| 文件 | 改动 |
|------|------|
| `app/globals.css` | 重写 — 新 CSS 变量、背景、字体、动画 |
| `app/layout.tsx` | 修改 — 加载 Playfair Display + ZCOOL XiaoWei，全局 fontFamily |
| `components/RingProgress.tsx` | 修改 — 新配色、新字体、粗描边 |
| `components/MacroBar.tsx` | 重写 — 三列卡片布局 |
| `components/MealSection.tsx` | 修改 — 新卡片样式、emoji 图标、虚线空态 |
| `components/FoodCard.tsx` | 修改 — 暖纸配色 |
| `components/AlertBanner.tsx` | 修改 — 柔和渐变 |
| `components/AlertBannerList.tsx` | 无需改动 |
| `components/CalendarGrid.tsx` | 修改 — 衬线数字、新配色 |
| `components/BottomTab.tsx` | 修改 — 亚麻毛玻璃 |
| `components/PhotoCapture.tsx` | 修改 — 陶土红大圆 |
| `components/CoachFAB.tsx` | 修改 — 暖纸标签 |
| `components/CoachFABWrapper.tsx` | 无需改动 |
| `components/ChatSheet.tsx` | 修改 — 暖纸气泡 |
| `components/OnboardingWizard.tsx` | 修改 — 统一配色 |
| `app/settings/page.tsx` | 修改 — 统一配色 |

## 验证

1. `npm run build` 通过
2. 看板：热量环陶土红、三列宏量卡片、暖纸餐段
3. 拍照：陶土红大圆、暖纸结果卡片
4. 日历：衬线日期数字、暖色标记
5. 设置：统一输入框和按钮风格
6. 全局：亚麻米底色、Playfair Display 数字、ZCOOL XiaoWei 标题
