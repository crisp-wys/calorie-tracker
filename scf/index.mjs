const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const QWEN_API_KEY = process.env.QWEN_API_KEY;
const QWEN_MODEL = 'qwen-vl-max';

const SYSTEM_PROMPT = `你是一名专业的营养分析师，擅长识别中餐菜品并估算营养数据。

请分析图片中的食物，对每道菜品输出以下信息：
- name: 菜名（中文）
- weight: 预估克数（g）
- category: 食物类别
  * "dish" — 烹饪菜品（炒菜、炖菜等）
  * "ingredient" — 单一食材（米饭、鸡蛋、水果等）
  * "beverage" — 饮品（奶茶、咖啡、果汁等）
  * "packaged" — 包装食品（有营养成分表）
- cookingMethod: 烹饪方式（仅 category=dish 时有效，其他为 null）
  可选值: "steam" | "boil" | "stir-fry" | "deep-fry" | "roast" | "braise" | "cold" | "raw"
- estimatedOil: 预估烹饪用油量（克），无油则为 0
- size: 饮品杯型（仅 beverage，"small"|"medium"|"large"，其他为 null）
- components: 饮品组件列表（仅 beverage），从以下选项中选：
  茶底: "绿茶"|"红茶"|"乌龙茶"|"茉莉花茶"|"咖啡"
  奶类: "全脂牛奶"|"脱脂牛奶"|"燕麦奶"|"椰奶"|"奶盖"
  甜味剂: "果糖糖浆"|"黑糖"|"蜂蜜"|"零卡糖"
  小料: "珍珠"|"椰果"|"红豆"|"仙草"|"布丁"|"芝士奶盖"|"芋泥"|"燕麦"
- nutritionLabel: 包装食品营养成分表（仅 packaged），从包装图片上 OCR 读取
  { calories, protein, carbs, fat, servingSize }
  其他类别为 null

注意：
1. 如果图片中无食物，foods 返回空数组
2. 严格只输出 JSON，不要输出任何其他文字
3. 烹饪方式根据图片中食物的外观判断（油光、颜色、质地）

输出格式：
{
  "foods": [
    {
      "name": "宫保鸡丁",
      "weight": 300,
      "category": "dish",
      "cookingMethod": "stir-fry",
      "estimatedOil": 15,
      "size": null,
      "components": null,
      "nutritionLabel": null
    }
  ]
}`;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResp(resp, statusCode, body) {
  resp.setStatusCode(statusCode);
  resp.setHeader('Content-Type', 'application/json');
  Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
  resp.send(JSON.stringify(body));
}

export const handler = async (req, resp, context) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    resp.setStatusCode(200);
    Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
    resp.send('');
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return jsonResp(resp, 400, { error: '缺少图片数据' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${QWEN_API_KEY}`,
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: image } },
              { type: 'text', text: '请分析这张食物图片' },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return jsonResp(resp, 502, { error: `API 调用失败: ${response.status}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return jsonResp(resp, 422, { error: '未识别到食物，请重新拍摄' });
    }

    const result = JSON.parse(jsonMatch[0]);

    if (!result.foods || result.foods.length === 0) {
      return jsonResp(resp, 422, { error: '未识别到食物，请重新拍摄' });
    }

    return jsonResp(resp, 200, result);
  } catch (error) {
    if (error.name === 'AbortError') {
      return jsonResp(resp, 504, { error: '识别超时，请稍后重试' });
    }
    return jsonResp(resp, 500, { error: '识别结果异常，请重试' });
  }
};
