# 拍照页改进：相册上传 + 非食物提醒 + 营养识别精度

## Context

当前拍照页三个不足：
1. 只能调起相机，无法从相册选取已有照片
2. 上传非食物图片时只有一个红色错误框，不够显眼
3. Qwen VL 直接估算营养数据，同一盘菜两次结果可能差 100 kcal

---

## Feature 1: ActionSheet 相册上传

### Design

点击红色相机按钮 → 底部弹出 ActionSheet，两个选项 + 取消：

```
┌─────────────────────────┐
│       📷 相机按钮        │
│   点击拍照识别食物        │
├─────────────────────────┤
│  📷  拍照               │  ← capture="environment"
│      使用相机拍摄         │
│  🖼️  从相册选择          │  ← 无 capture，打开文件选择器
│      上传已有照片         │
│                         │
│        [ 取消 ]          │
└─────────────────────────┘
```

- 面板从底部 slide-up，backdrop 半透明黑色
- 点击 backdrop = 取消
- 两个选项带图标 + 标题 + 副标题
- 顶部有拖拽条

### Implementation

**文件：** `components/PhotoCapture.tsx`

新增：`showSheet` state、无 `capture` 的 hidden input、ActionSheet UI（内联）

保留：原有 `capture="environment"` input、`handleFileChange` 逻辑两个 input 共用

---

## Feature 2: 非食物图片弹窗

### Design

上传非食物图片 → 居中 Dialog：图标 + 文案 +「重新拍摄」+「取消」

- 居中弹出，圆角卡片 + 遮罩
- 点击遮罩 / 「取消」关闭
- 「重新拍摄」回到拍照状态

触发：API 返回 422 / foods 为空 / JSON 解析失败
不触发：网络异常 / 超时（沿用红色错误框）

### Implementation

**文件：** `app/camera/page.tsx`

新增：`showNotFoodDialog` state、Dialog JSX（内联）

---

## Feature 3: 营养识别精度提升

### 核心思路

Qwen VL 只负责「看图描述」，精确营养数据在本地计算。

### 识别流程

```
拍照 → Qwen VL（只输出菜名+份量+烹饪方式+分类）
         │
    ┌────┴────┐
    │ 包装食品？ │ → OCR 读营养成分表 → 直接出结果
    └────┬────┘
         │ No
    ┌────┴────┐
    │ 固体食物？ │ → 查食材库 → 套生熟比 → 套修正系数 → +油热量
    └────┬────┘
         │ No (饮品)
    └── 拆分茶底+奶+糖+小料 → 查组件库 → 计算
```

### Qwen VL 新 Prompt

输出从「直接报热量数字」改为「描述+分类」：

```json
{
  "foods": [{
    "name": "宫保鸡丁",
    "weight": 300,
    "category": "dish",
    "cookingMethod": "炒",
    "estimatedOil": 15,
    // 饮品
    "size": null,
    "components": null,
    // 包装食品
    "nutritionLabel": null
  }]
}
```

去掉 caloriesMin/caloriesMax/protein/carbs/fat 六个数字字段，token 更少，速度更快。

### 新建数据文件

```
lib/
├── food-db.json        # 食材基础营养（每100g生重）
├── ratios.json         # 生熟比 + 修正系数（食材×烹饪方式）
├── beverage-db.json    # 饮品组件库（茶底/奶/糖/小料）
└── nutrition.ts        # 计算引擎
```

计算引擎实现公式（来源：Frontiers in Nutrition 2024）：

```
熟食营养素 = 生重 × 每百克营养素 × 生熟比 × 烹饪修正系数
熟食脂肪   = 生重 × 每百克脂肪 × 生熟比 × 修正系数 + 烹饪用油量
```

### 四类食物，三条路径

| 类型 | 路径 | 精度 |
|------|------|------|
| 正餐菜品 | Qwen 识别 → 查食材库 → 套烹饪系数 | 高 |
| 单一食材 | 米饭/鸡蛋/蔬菜 直接查库 | 最高 |
| 饮品 | Qwen 识别 → 拆分茶/奶/糖/小料 → 查组件库 | 中高 |
| 包装零食 | Qwen OCR 读营养成分表 → 直接录入 | 最高 |

### Implementation

| 文件 | 改动 |
|------|------|
| `scf/index.mjs` | 更新 SYSTEM_PROMPT（Qwen 输出新 JSON 格式） |
| `lib/food-db.json` | 新建，常见食材基础营养数据 |
| `lib/ratios.json` | 新建，生熟比 + 烹饪修正系数 |
| `lib/beverage-db.json` | 新建，饮品组件营养数据 |
| `lib/nutrition.ts` | 新建，计算引擎 |
| `app/camera/page.tsx` | 调用 nutrition.ts 计算最终营养，适配新 API 响应格式 |
| `lib/types.ts` | 更新 FoodItem 和 API 响应类型 |

---

## Verification

**Feature 1:**
1. 打开拍照页 → 看到红色相机按钮
2. 点击按钮 → 底部弹出 ActionSheet，有「拍照」「从相册选择」「取消」
3. 点击「拍照」→ 调起相机；点击「从相册选择」→ 打开文件选择器
4. 点击遮罩 / 「取消」→ 面板关闭
5. 桌面端两个选项都应打开文件选择器

**Feature 2:**
1. 上传非食物图片 → 弹出居中 Dialog「未识别到食物」
2. 点击「重新拍摄」→ 回到拍照状态；点遮罩/取消 → 关闭
3. 断网测试 → 红色错误框，不走 Dialog

**Feature 3:**
1. 拍同一盘菜两次 → 热量结果接近（误差在合理范围）
2. 拍包装零食 → OCR 识别出营养成分表数据
3. 拍饮品 → 正常拆分组件并计算
4. `npm run build` 通过
