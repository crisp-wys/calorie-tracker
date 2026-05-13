const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const QWEN_API_KEY = process.env.QWEN_API_KEY;
const QWEN_MODEL = 'qwen-vl-max';

const SYSTEM_PROMPT = `你是一名专业的营养分析师，擅长识别中餐菜品并估算营养数据。

请分析图片中的食物，对每道菜品输出以下信息：
- name: 菜名（中文）
- weight: 预估克数（g）
- caloriesMin: 预估热量下限（kcal）
- caloriesMax: 预估热量上限（kcal）
- protein: 蛋白质含量（g）
- carbs: 碳水化合物含量（g）
- fat: 脂肪含量（g）

注意：
1. 热量给一个范围（如 300-400），体现估算的不确定性
2. 单一成分食物（如米饭、鸡蛋）范围可以很窄
3. 如果图片中无食物，返回空数组
4. 严格只输出 JSON，不要输出任何其他文字

输出格式：
{
  "foods": [
    {
      "name": "...",
      "weight": 250,
      "caloriesMin": 400,
      "caloriesMax": 500,
      "protein": 30,
      "carbs": 20,
      "fat": 25
    }
  ],
  "totalCaloriesMin": 400,
  "totalCaloriesMax": 500
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

module.exports.handler = async (req, resp, context) => {
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
