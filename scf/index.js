var QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
var QWEN_API_KEY = process.env.QWEN_API_KEY;
var QWEN_MODEL = 'qwen-vl-max';

var SYSTEM_PROMPT = '你是一名专业的营养分析师，擅长识别中餐菜品并估算营养数据。\n' +
  '\n' +
  '请分析图片中的食物，对每道菜品输出以下信息：\n' +
  '- name: 菜名（中文）\n' +
  '- weight: 预估克数（g）\n' +
  '- caloriesMin: 预估热量下限（kcal）\n' +
  '- caloriesMax: 预估热量上限（kcal）\n' +
  '- protein: 蛋白质含量（g）\n' +
  '- carbs: 碳水化合物含量（g）\n' +
  '- fat: 脂肪含量（g）\n' +
  '\n' +
  '注意：\n' +
  '1. 热量给一个范围（如 300-400），体现估算的不确定性\n' +
  '2. 单一成分食物（如米饭、鸡蛋）范围可以很窄\n' +
  '3. 如果图片中无食物，返回空数组\n' +
  '4. 严格只输出 JSON，不要输出任何其他文字\n' +
  '\n' +
  '输出格式：\n' +
  '{\n' +
  '  "foods": [\n' +
  '    {\n' +
  '      "name": "...",\n' +
  '      "weight": 250,\n' +
  '      "caloriesMin": 400,\n' +
  '      "caloriesMax": 500,\n' +
  '      "protein": 30,\n' +
  '      "carbs": 20,\n' +
  '      "fat": 25\n' +
  '    }\n' +
  '  ],\n' +
  '  "totalCaloriesMin": 400,\n' +
  '  "totalCaloriesMax": 500\n' +
  '}';

var CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResp(statusCode, data) {
  return {
    statusCode: statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

exports.handler = async function(event, context, callback) {
  // Parse event - Alibaba Cloud FC passes HTTP trigger event as Buffer
  var parsed = typeof event === 'string' ? JSON.parse(event) : JSON.parse(event.toString());
  var method = (parsed.requestContext && parsed.requestContext.http && parsed.requestContext.http.method) || '';

  // CORS preflight
  if (method === 'OPTIONS') {
    callback(null, { statusCode: 200, headers: CORS_HEADERS, body: '' });
    return;
  }

  try {
    var payload = typeof parsed.body === 'string' ? JSON.parse(parsed.body) : (parsed.body || {});
    var image = payload.image;

    if (!image || typeof image !== 'string') {
      callback(null, jsonResp(400, { error: '缺少图片数据' }));
      return;
    }

    if (!QWEN_API_KEY) {
      callback(null, jsonResp(500, { error: '服务未配置 API Key' }));
      return;
    }

    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 15000);

    var response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + QWEN_API_KEY,
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
      callback(null, jsonResp(502, { error: 'AI 调用失败: ' + response.status }));
      return;
    }

    var data = await response.json();
    var content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';

    var jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      callback(null, jsonResp(422, { error: '未识别到食物，请重新拍摄' }));
      return;
    }

    var result = JSON.parse(jsonMatch[0]);

    if (!result.foods || result.foods.length === 0) {
      callback(null, jsonResp(422, { error: '未识别到食物，请重新拍摄' }));
      return;
    }

    callback(null, jsonResp(200, result));
  } catch (error) {
    if (error.name === 'AbortError') {
      callback(null, jsonResp(504, { error: '识别超时，请稍后重试' }));
      return;
    }
    callback(null, jsonResp(500, { error: '识别异常: ' + error.message }));
  }
};
