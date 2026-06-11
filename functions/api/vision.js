const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
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
- components: 饮品组件列表（仅 beverage）
- nutritionLabel: 包装食品营养成分表（仅 packaged）

注意：
1. 如果图片中无食物，foods 返回空数组
2. 严格只输出 JSON，不要输出任何其他文字

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
