const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const QWEN_MODEL = 'qwen-vl-max';

// ⚠️ SYNC NOTICE: This list must stay in sync with lib/food-db.json.
// When you add/remove foods in the DB, update this list accordingly.
// Tip: run `node -e "const db = require('./lib/food-db.json'); console.log(Object.keys(db).sort().join(' '))"` to get the full list.
const KNOWN_FOODS = `
【主食】米饭 稀饭 粥 面条 馒头 花卷 包子 饺子 馄饨 烧卖 油条 烧饼 面包 全麦面包 米粉 河粉 粉丝 红薯粉 年糕 粽子 汤圆 燕麦片 小米粥 八宝粥 玉米 红薯 紫薯 土豆 山药 芋头 南瓜 藕
【蛋类】鸡蛋 鸭蛋 鹌鹑蛋
【禽肉】鸡肉 鸡胸肉 鸡腿肉 鸡翅 鸡爪 鸡胗 鸡肝 鸭肉 鸭血 鹅肉 鸽子
【畜肉】猪肉 猪瘦肉 猪排骨 猪蹄 猪肝 猪肚 猪血 腊肉 香肠 培根 火腿 牛肉 牛腱子 牛腩 牛舌 牛肚 羊肉
【水产】虾 虾仁 鱼肉 三文鱼 带鱼 鲈鱼 鲫鱼 鳕鱼 金枪鱼 鱿鱼 墨鱼 螃蟹 龙虾 蛤蜊 牡蛎 扇贝 海参
【豆制品】豆腐 豆皮 腐竹 千张 豆干 素鸡 毛豆 黄豆
【蔬菜】白菜 菠菜 西兰花 番茄 黄瓜 胡萝卜 青椒 蘑菇 芹菜 生菜 油麦菜 韭菜 蒜苗 洋葱 大蒜 姜 秋葵 芦笋 竹笋 茄子 豆角 荷兰豆 豆芽 海带 紫菜 木耳 银耳 苦瓜 丝瓜 冬瓜
【菌菇】香菇 金针菇 杏鲍菇 平菇 茶树菇
【水果】香蕉 苹果 草莓 蓝莓 葡萄 西瓜 哈密瓜 芒果 柚子 猕猴桃 橙子 梨 桃子 李子 樱桃 荔枝 龙眼 榴莲 椰子
【坚果】花生 核桃 杏仁 腰果 开心果 瓜子 松子
【奶类】牛奶 酸奶 芝士 黄油 奶油
【调味】食用油 白砂糖 酱油 蚝油 芝麻酱 番茄酱 豆瓣酱 甜面酱 辣椒油 沙拉酱 蛋黄酱 咖喱块 火锅底料 蜂蜜
【零食】薯片 饼干 巧克力 蛋糕 冰淇淋
`;

const SYSTEM_PROMPT = `你是一名专业的营养分析师，擅长识别中餐菜品并估算营养数据。

你需要分析图片中的食物，对每道菜品输出以下 JSON 格式的信息：
- name: 菜名（中文）
- weight: 预估克数（g）。请使用下方的"份量估算参照体系"进行估算
- category: 食物类别。"dish"（烹饪菜品）| "ingredient"（单一食材）| "beverage"（饮品）| "packaged"（包装食品）
- cookingMethod: 烹饪方式，仅 dish 有效（null 替代）: "steam"|"boil"|"stir-fry"|"deep-fry"|"roast"|"braise"|"cold"|"raw"
- estimatedOil: 预估烹饪用油量（克），无油则为 0。炒菜一般 5-15g，炸物 20-50g
- size: 饮品杯型（仅 beverage）: "small"|"medium"|"large"，其他为 null
- components: 饮品组件列表（仅 beverage），从以下选择：绿茶/红茶/乌龙茶/茉莉花茶/咖啡/全脂牛奶/脱脂牛奶/燕麦奶/椰奶/奶盖/果糖糖浆/黑糖/蜂蜜/零卡糖/珍珠/椰果/红豆/仙草/布丁/芝士奶盖/芋泥/燕麦
- ingredients: 复合菜品的食材拆分（务必填写！这个很重要）。如果菜品是由多种食材组成的（如"番茄炒蛋"、"青椒肉丝"、"宫保鸡丁"），请拆分为基础食材名称列表。尽量用下面列出的食材名称。示例：
  - "番茄炒蛋" → ["番茄", "鸡蛋"]
  - "青椒肉丝" → ["青椒", "猪瘦肉"]
  - "西兰花炒虾仁" → ["西兰花", "虾仁"]
  - "红烧排骨" → ["猪排骨"]
  - "麻辣香锅" → 根据可见食材拆分为列表中存在的食材
- portionBasis: 份量估算依据（必填！）。描述你是如何估算每道食物重量的，用了什么参照物。例如"参照拳头大小，米饭约1.5份≈225g"、"盘中可见标准碗，菜量约为碗的2/3≈200g"、"无参照物，按常见份量估算"
- weightConfidence: 重量估算置信度（必填！）:
  - "high": 图片中有明确参照物（碗、手、筷子、杯子等）
  - "medium": 图片中有部分参照物或常见餐具可参考
  - "low": 无参照物、角度不佳或食物形态难以判断
- nutritionLabel: 包装食品营养表（仅 packaged），含 calories/protein/carbs/fat/servingSize

## 份量估算参照体系（核心！）

请务必以图片中可见的物品为参照来估算重量，而不是凭空猜测。按照以下步骤：

### 第1步：寻找参照物
观察图片中是否出现以下参照物：
- 碗（标准饭碗直径约12cm）
- 筷子（标准长度约23cm）
- 手/手指（如果出现在画面中）
- 杯子/易拉罐
- 盘子/碟子
- 常见调味品瓶

### 第2步：使用份量单元换算

| 参照物 | 代表什么 | 约等于 |
|--------|----------|--------|
| 🤛 一只拳头 | 1份主食 / 1份蔬菜 | 米饭150g / 蔬菜100g（生重） |
| ✋ 手掌（不含手指，掌心大小） | 1份肉类 | 100–120g（生重） |
| 🖐️ 整只手（含手指，手心大小） | 1份鱼肉/鸡胸 | 150g（生重） |
| 👍 大拇指（一节） | 1份油脂/坚果酱 | 15g |
| 🥄 一汤匙（喝汤的勺子） | 油/酱料/调味品 | 10–15g |
| 🥢 一筷子夹起的量 | 炒菜中的一口 | 15–20g |
| 🍚 标准饭碗（直径12cm） | 主食碗 | 米饭约150g（熟）/ 面条约200g（熟） |
| 🥛 一次性杯子 | 饮品 | 小杯250ml / 中杯400ml / 大杯600ml |
| 🍽️ 标准餐盘 | 一份外卖/食堂餐 | 总菜量约300–500g |

### 第3步：记录估算过程
对每道菜，在 portionBasis 字段中简要记录你用了什么参照物、估计了几份、最终克数。一两句话即可。

## 我们的食材数据库包含以下食材（请尽量使用这些名称或接近的名称）：

${KNOWN_FOODS}

## Few-shot 示例：

示例1 — 一张番茄炒蛋+米饭的照片（照片中有标准饭碗和筷子）：
{"foods": [{"name": "番茄炒蛋", "weight": 350, "category": "dish", "cookingMethod": "stir-fry", "estimatedOil": 10, "size": null, "components": null, "ingredients": ["番茄", "鸡蛋"], "portionBasis": "菜量约装饭碗2碗，以碗为参照估算350g", "weightConfidence": "high", "nutritionLabel": null}, {"name": "米饭", "weight": 200, "category": "ingredient", "cookingMethod": null, "estimatedOil": 0, "size": null, "components": null, "ingredients": null, "portionBasis": "碗中米饭约1.3份拳头大小≈200g", "weightConfidence": "high", "nutritionLabel": null}]}

示例2 — 一张红烧牛肉面的照片（大碗，碗边有筷子）：
{"foods": [{"name": "红烧牛肉面", "weight": 600, "category": "dish", "cookingMethod": "braise", "estimatedOil": 15, "size": null, "components": null, "ingredients": ["面条", "牛肉"], "portionBasis": "大碗面，面条约占碗的2/3，牛肉约手掌大小，总重估算600g", "weightConfidence": "medium", "nutritionLabel": null}]}

示例3 — 一杯珍珠奶茶（手持，可见一次性杯子）：
{"foods": [{"name": "珍珠奶茶", "weight": 500, "category": "beverage", "cookingMethod": null, "estimatedOil": 0, "size": "medium", "components": ["红茶", "全脂牛奶", "果糖糖浆", "珍珠"], "ingredients": null, "portionBasis": "中杯一次性杯子约400ml，加珍珠约500g", "weightConfidence": "high", "nutritionLabel": null}]}

示例4 — 一包薯片（可见包装袋和营养表）：
{"foods": [{"name": "薯片", "weight": 100, "category": "packaged", "cookingMethod": null, "estimatedOil": 0, "size": null, "components": null, "ingredients": null, "portionBasis": "整包薯片，按包装标注100g", "weightConfidence": "high", "nutritionLabel": {"calories": 520, "protein": 5, "carbs": 55, "fat": 32, "servingSize": 100}}]}

示例5 — 食堂餐盘，菜在盘子里但无明确参照物：
{"foods": [{"name": "青椒肉丝", "weight": 250, "category": "dish", "cookingMethod": "stir-fry", "estimatedOil": 8, "size": null, "components": null, "ingredients": ["青椒", "猪瘦肉"], "portionBasis": "无明确参照物，按常见食堂份量估算约250g", "weightConfidence": "low", "nutritionLabel": null}]}

## 重要规则：
1. 如果图片中无食物，foods 返回空数组 []
2. 严格只输出 JSON，不要输出 markdown 代码块，不要输出任何解释文字
3. 对于复合菜品（如炒菜、炖菜），务必填写 ingredients 字段，拆分为数据库中存在的基础食材
4. 重量估算必须使用份量参照体系，禁止凭空猜测
5. portionBasis 和 weightConfidence 是必填字段，每个 food 都要写
6. 烹饪用油估算要合理：蒸/煮 ≈0g，炒 ≈8-15g，炸 ≈20-50g，炖/烧 ≈5-15g

输出格式：{"foods": [{"name": "...", "weight": 300, "portionBasis": "...", "weightConfidence": "high", ...}]}`;

export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

export async function onRequestPost({ request, env }) {
  const apiKey = env.QWEN_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: '无效的请求体' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const { image } = body;
  if (!image || typeof image !== 'string') {
    return new Response(JSON.stringify({ error: '缺少图片数据' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: image } },
              { type: 'text', text: '请分析这张食物图片，输出 JSON（不要 markdown 代码块）' },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `API 调用失败: ${response.status}` }),
        { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: '未识别到食物，请重新拍摄' }),
        { status: 422, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);
    if (!result.foods || result.foods.length === 0) {
      return new Response(
        JSON.stringify({ error: '未识别到食物，请重新拍摄' }),
        { status: 422, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: '识别超时，请稍后重试' }),
        { status: 504, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
    return new Response(
      JSON.stringify({ error: '识别结果异常，请重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
