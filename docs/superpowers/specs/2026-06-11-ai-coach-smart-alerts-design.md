# AI 教练智能预警系统

## Context

当前 AI 教练完全是被动的——只有用户主动点击 FAB 打开聊天面板，AI 才有机会说话。用户想要"安静守护型"教练：平时不出声，只在检测到饮食异常时才主动提醒。这就像一个真实的营养教练——不会每顿饭都唠叨你，但在你连续几天吃太多、或是营养结构严重失衡时，会及时提醒。

目标：在看板顶部增加智能预警横幅，纯本地计算（不调 API），检测到异常时直接展示，用户可关闭或一键打开对话深入讨论。

## 设计理念

**安静守护型**——不同于每日推送或定时提醒，AI 教练只在数据出现值得关注的模式时才出现：

- ✅ 异常时才显示横幅
- ✅ 直接告诉用户发生了什么（不需要再点一下"查看详情"）
- ✅ 保留深聊入口（"和教练聊聊"按钮 → 打开 ChatSheet + 预填上下文）
- ✅ 可手动关闭（当天不再显示同类型）
- ❌ 不存服务器，不调 API（纯本地计算）
- ❌ 不弹窗打断（横幅不遮挡主要内容）
- ❌ 不自动打开 ChatSheet

## 预警规则

所有规则在 `lib/alerts.ts` 中实现，纯函数 `calcAlerts(meals, profile)` 返回 `Alert[]`。

| # | 预警类型 | 触发条件 | 颜色 | 情绪 |
|---|---------|---------|------|------|
| 1 | 连续热量超标 | 连续 3 天热量 > 目标 × 1.1 | 黄色 | ⚠️ 警告 |
| 2 | 连续热量不足 | 连续 3 天热量 < 目标 × 0.7 | 蓝色 | ℹ️ 关心 |
| 3 | 宏量元素失衡 | 7 日某宏量元素占比偏离推荐值 15%+（如碳水 >55% 或 <25%，蛋白质 <15%） | 蓝色 | ℹ️ 建议 |
| 4 | 晚餐占比过高 | 今日晚餐 > 全天热量 50% | 紫色 | 💡 节奏 |
| 5 | 某餐热量异常 | 单餐 > 全天目标 60% | 黄色 | ⚠️ 关注 |

### 规则优先级

多条预警同时触发时，按以上顺序排列（热量问题置顶）。用户关闭某条后当天不再显示同类型，但其他类型仍然展示。

### 宏量元素推荐范围

- 蛋白质：15-35% 总热量
- 碳水：40-55% 总热量
- 脂肪：20-35% 总热量

## 架构

### 数据流

```
Dashboard 加载 (page.tsx)
  │
  ├─ useEffect: calcAlerts(state.meals, state.profile)
  │     │
  │     ├─ 遍历近 7 天 meals → 每日热量、每餐占比、宏量元素均值
  │     ├─ 逐条匹配 5 条规则
  │     └─ 返回 Alert[]
  │
  ├─ alerts.length > 0 → 渲染 <AlertBannerList> 在日期下方、热量环上方
  └─ alerts.length === 0 → 不渲染
```

### 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `lib/alerts.ts` | **新建** | 纯函数计算引擎：`calcAlerts()`, 辅助函数 `calcDailyCalories()`, `calcWeeklyMacros()`, `calcMealDistribution()` |
| `components/AlertBanner.tsx` | **新建** | 单条预警横幅 UI，含 3 种配色变体、关闭按钮、聊天入口按钮 |
| `components/AlertBannerList.tsx` | **新建** | 多条预警的垂直排列容器，管理 dismissed 状态 |
| `app/page.tsx` | **修改** | 在日期和 RingProgress 之间插入 `<AlertBannerList />`，传递 `onOpenChat(prefill)` 回调 |
| `components/ChatSheet.tsx` | **修改** | props 新增 `prefill?: string`，open 时若 prefill 非空则自动填入输入框 |
| `components/CoachFABWrapper.tsx` | **修改** | 管理 `chatPrefill` 状态，传递给 ChatSheet |

### Alert 类型定义

```typescript
type AlertType = 'calorie_over' | 'calorie_under' | 'macro_imbalance' | 'dinner_heavy' | 'meal_spike';

interface Alert {
  type: AlertType;
  title: string;         // "连续3天热量超标"
  message: string;        // "今天控制在 1,800kcal 以内吧..."
  suggestion: string;     // 预填聊天消息
  color: 'yellow' | 'blue' | 'purple';
  emoji: string;
}
```

## 组件设计

### AlertBanner

```
┌─ 预警横幅 (max-w-lg, mx-4, rounded-2xl) ──────────────────────┐
│ [emoji]  [title - bold]                              [✕ 关闭] │
│          [message - small muted]                               │
│          [💬 和教练聊聊 按钮 - pill, white bg, border]         │
└────────────────────────────────────────────────────────────────┘
```

- 背景渐变对应颜色（yellow=amber gradient, blue=blue gradient, purple=violet gradient）
- 边框 1px solid 同色系
- 关闭按钮 opacity-50，hover 加深
- "和教练聊聊" 按钮点击 → `onChat(suggestion)`

### AlertBannerList

- 接收 `alerts: Alert[]` + `onOpenChat: (prefill: string) => void`
- 内部 `useState<Set<AlertType>>` 记录已关闭的类型
- 过滤已关闭 + 非空列表 → 渲染多条 AlertBanner（gap-2 垂直排列）
- 空列表 → 返回 null

## ChatSheet 预填改动

```typescript
// CoachFABWrapper.tsx
const [chatPrefill, setChatPrefill] = useState<string | undefined>();

// ChatSheet props 新增 prefill
// open 时 useChat 检测 prefill → setInput(prefill)
```

ChatSheet 打开时：
1. 若 `prefill` 非空 → `setInput(prefill)` + 自动聚焦输入框
2. 用户可以直接发送，也可以修改后再发送
3. 发送后 `prefill` 清空

## 不做

- ❌ 不存 Supabase（纯前端计算，"已关闭"状态也不持久化）
- ❌ 不通过 `/api/chat` 或 `/api/memory` 生成预警（避免额外 API 调用和延迟）
- ❌ 不推送通知（PWA push notification）
- ❌ 不在日历或设置页面显示预警
- ❌ 不自动打开 ChatSheet
- ❌ 无动画入场（保持简洁，直接渲染）

## 验证

1. `npm run build` 通过
2. 正常饮食数据 → 看板无预警横幅，界面与现在完全一致
3. 构造连续 3 天超标数据 → 黄色横幅出现在日期和热量环之间
4. 构造碳水失衡数据 → 蓝色横幅出现
5. 点击关闭 → 横幅消失，页面高度自适应
6. 点击"和教练聊聊" → ChatSheet 从底部滑出，输入框已预填消息
7. 刷新页面 → 已关闭的预警不复现（同一天内）
8. 多条预警同时触发 → 多条横幅垂直排列，各自可独立关闭
