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
- weight: 预估克数（g）。参考：一碗米饭 ≈150g，一个鸡蛋 ≈50g，一块鸡胸 ≈200g，一个馒头 ≈80g，一根香蕉 ≈120g，一个苹果 ≈200g，一小碗菜 ≈150g，一盘炒菜 ≈300-500g
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
- nutritionLabel: 包装食品营养表（仅 packaged），含 calories/protein/carbs/fat/servingSize

## 我们的食材数据库包含以下食材（请尽量使用这些名称或接近的名称）：

${KNOWN_FOODS}

## Few-shot 示例：

示例1 - 一张番茄炒蛋+米饭的照片：
{"foods": [{"name": "番茄炒蛋", "weight": 350, "category": "dish", "cookingMethod": "stir-fry", "estimatedOil": 10, "size": null, "components": null, "ingredients": ["番茄", "鸡蛋"], "nutritionLabel": null}, {"name": "米饭", "weight": 200, "category": "ingredient", "cookingMethod": null, "estimatedOil": 0, "size": null, "components": null, "ingredients": null, "nutritionLabel": null}]}

示例2 - 一张红烧牛肉面的照片：
{"foods": [{"name": "红烧牛肉面", "weight": 600, "category": "dish", "cookingMethod": "braise", "estimatedOil": 15, "size": null, "components": null, "ingredients": ["面条", "牛肉"], "nutritionLabel": null}]}

示例3 - 一杯珍珠奶茶：
{"foods": [{"name": "珍珠奶茶", "weight": 500, "category": "beverage", "cookingMethod": null, "estimatedOil": 0, "size": "medium", "components": ["红茶", "全脂牛奶", "果糖糖浆", "珍珠"], "ingredients": null, "nutritionLabel": null}]}

示例4 - 一包薯片：
{"foods": [{"name": "薯片", "weight": 100, "category": "packaged", "cookingMethod": null, "estimatedOil": 0, "size": null, "components": null, "ingredients": null, "nutritionLabel": {"calories": 520, "protein": 5, "carbs": 55, "fat": 32, "servingSize": 100}}]}

## 重要规则：
1. 如果图片中无食物，foods 返回空数组 []
2. 严格只输出 JSON，不要输出 markdown 代码块，不要输出任何解释文字
3. 对于复合菜品（如炒菜、炖菜），务必填写 ingredients 字段，拆分为数据库中存在的基础食材
4. 重量估算宁可偏保守，常见错误是估算过高
5. 烹饪用油估算要合理：蒸/煮 ≈0g，炒 ≈8-15g，炸 ≈20-50g，炖/烧 ≈5-15g

输出格式：{"foods": [{"name": "...", "weight": 300, ...}]}`;

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
        max_tokens: 1536,
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
