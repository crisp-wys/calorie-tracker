# 看板 AI 对话功能设计文档

## Context

当前看板仅展示饮食数据，缺少主动分析和建议能力。用户需要一个 AI 健身教练，能基于个人画像、饮食记录和历史趋势，给出个性化指导。

---

## Feature 1: 看板内嵌聊天卡片

### Design

看板页面 MealSection 列表下方嵌入 ChatCard 组件：

- **默认状态**：收起，显示 AI 头像 + 昵称 + 一句自动生成的洞察（基于今日数据）
- **展开状态**：消息列表 + 输入框，支持流式对话
- 点击卡片任意位置展开/收起

### 交互

- 首次进入：AI 根据今日饮食自动生成一句洞察，展示在收起卡片上
- 展开后：显示完整对话历史（最近 20 轮），新消息从底部追加
- AI 回复流式输出，逐字出现（SSE）
- 支持 Markdown 渲染（加粗、列表、数字）

### Implementation

| 文件 | 操作 | 职责 |
|------|------|------|
| `components/ChatCard.tsx` | 新建 | 聊天 UI 卡片组件 |
| `app/page.tsx` | 修改 | 在 MealSection 后引入 ChatCard |

---

## Feature 2: AI 人格定制

### Design

ChatCard 右上角齿轮图标打开设置面板，三个设置项：

| 设置 | 说明 |
|------|------|
| 头像 | 可选预设 emoji 或上传自定义图片（base64 存 localStorage） |
| 昵称 | 自由输入，拼入 system prompt |
| 对话风格 | 三选一：鼓励型 / 严父型 / 自定义 |

### 三种人格

**鼓励型：**
```
你是一个温暖、友好、充满正能量的健身与营养教练。
核心风格：
- 每次对话先肯定用户的努力和进步，哪怕是很小的进步也要看到并说出来
- 用「我们」而不是「你」，让用户感觉你在和他一起努力
- 多用表情符号和语气词（～！），让对话轻松愉快
- 当发现饮食或运动问题时，先说「没关系，这很正常」，再给出具体的改进建议
- 永远不批评用户的选择，而是引导他找到更好的替代方案
- 如果用户今天吃超了热量，帮他想办法在接下来几天温和调整
- 每次对话结尾给一个具体的小目标，如「明天早餐加一个鸡蛋怎么样？」

数据使用原则：
- 用具体的饮食数据来表扬用户
- 指出问题时附带数据
- 引用趋势数据来鼓励
```

**严父型：**
```
你是一个严格、直接、不废话的健身与营养教练。
核心风格：
- 开门见山，直接指出问题，不铺垫，不安慰
- 用数据和事实说话，不带情绪但也不留情面
- 少用语气词，不用表情符号，句子简短有力
- 永远基于用户的实际数据发言
- 绝对禁止：人身攻击、辱骂、贬低用户人格、使用侮辱性词汇
- 批评的是行为不是人
- 每次对话结尾给出明确的量化行动指令

数据使用原则：
- 直接指出数据异常
- 用数字说话
- 对比历史数据
- 给出明确的量化目标
```

**自定义：**
- 用户在设置面板中输入自己的提示词，完全替代预设
- 输入框仅在选中「自定义」时显示

### 代表形象

| 风格 | emoji | 说明 |
|------|-------|------|
| 鼓励型 | 🧸 | 暖熊教练，亲切温暖 |
| 严父型 | 🫡 | 严肃教官，直接有力 |
| 自定义 | 🎨 | 自由插画，用户创作 |

### Implementation

| 文件 | 操作 | 职责 |
|------|------|------|
| `lib/types.ts` | 修改 | 新增 AIConfig 类型（name, personality, customPrompt, avatar） |
| `components/ChatCard.tsx` | 新建（含设置面板） | 内联 settings modal |

---

## Feature 3: 用户记忆系统

### Design

在 localStorage 维护 `user-memory`，由 AI 每日自动更新。

### 数据结构

```json
{
  "aiConfig": {
    "name": "小暖",
    "personality": "encouraging",
    "customPrompt": "",
    "avatar": ""
  },
  "insights": [
    { "id": "1", "type": "pattern", "text": "早餐蛋白质持续偏低，近7天平均仅14g", "createdAt": "..." },
    { "id": "2", "type": "trend", "text": "近3周体重稳定下降，周均0.6kg", "createdAt": "..." }
  ],
  "preferences": [
    "不喜欢鸡胸肉，更偏好豆腐和鱼",
    "午餐习惯吃中餐"
  ],
  "milestones": [
    { "date": "2026-05-10", "event": "体重降至68kg，突破平台期" }
  ],
  "lastSummaryDate": "2026-05-15"
}
```

### 更新机制

- 每天首次打开 AI 对话时，检查 `lastSummaryDate`
- 如果不是今天 → 收集近 7 天饮食数据 → 发给 DeepSeek 生成洞察更新 → 写入 localStorage
- 更新过程非阻塞，用户可正常对话

### Implementation

| 文件 | 操作 | 职责 |
|------|------|------|
| `lib/user-memory.ts` | 新建 | 记忆读写、每日更新逻辑、构建上下文 |

---

## Feature 4: API Route + DeepSeek 流式调用

### 架构

```
POST /api/chat
  body: { message: string, history: ChatMessage[] }

服务端组装 6 层 system prompt:
  ① 人格提示词（根据 aiConfig）
  ② 用户画像（profile）
  ③ 今日饮食记录（meals）
  ④ 近 7 天饮食汇总
  ⑤ AI 记忆档案（insights + preferences + milestones）
  ⑥ 最近 6 轮对话历史

→ POST DeepSeek API（stream: true）
→ SSE 流式返回前端
```

### DeepSeek 调用

- 端点：`https://api.deepseek.com/v1/chat/completions`
- 模型：`deepseek-chat`
- 参数：`stream: true`, `temperature: 0.7`, `max_tokens: 1024`
- API key 从服务端环境变量读取

### SSE 响应格式

```
data: {"choices":[{"delta":{"content":"你"}}]}

data: {"choices":[{"delta":{"content":"今"}}]}

...

data: [DONE]
```

### Implementation

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/api/chat/route.ts` | 新建 | API 路由，组装上下文，调用 DeepSeek，流式返回 |
| `.env.local` | 修改 | 新增 `DEEPSEEK_API_KEY` |

---

## 全部文件汇总

| 文件 | 操作 | 职责 |
|------|------|------|
| `components/ChatCard.tsx` | 新建 | 聊天卡片 + AI 设置面板 |
| `app/api/chat/route.ts` | 新建 | API 路由，DeepSeek 流式调用 |
| `lib/user-memory.ts` | 新建 | 用户记忆读写 + 每日更新 |
| `lib/types.ts` | 修改 | 新增 ChatMessage、AIConfig、UserMemory 类型 |
| `app/page.tsx` | 修改 | 引入 ChatCard，传入用户数据 |
| `.env.local` | 修改 | 新增 DEEPSEEK_API_KEY |

---

## Verification

1. 看板页面底部出现 AI 对话卡片，默认收起
2. 点击卡片展开，可输入消息并发送
3. AI 回复流式逐字出现
4. 设置面板可修改昵称、头像、对话风格
5. 选中「自定义」时出现提示词输入框
6. 鼓励型 AI 语气温暖友好；严父型 AI 语气直接严厉
7. 首次打开对话触发记忆更新，insights/preferences/milestones 自动生成
8. AI 回复中引用今日饮食数据和历史趋势
9. `npm run build` 通过
10. Vercel 部署后功能正常
