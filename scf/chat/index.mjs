const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respJSON(callback, statusCode, body) {
  callback(null, {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  });
}

function respSSE(callback) {
  callback(null, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...CORS,
    },
    body: '',
    isBase64Encoded: false,
  });
}

async function handleChat(event, callback, body) {
  const { message, history, systemPrompt } = body;

  if (!message || !systemPrompt) {
    return respJSON(callback, 400, { error: '缺少参数' });
  }

  if (!DEEPSEEK_API_KEY) {
    return respJSON(callback, 500, { error: 'API key not configured' });
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []).map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  // Use non-streaming for event function compatibility
  let upstream;
  try {
    upstream = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });
  } catch (err) {
    return respJSON(callback, 502, { error: `无法连接 DeepSeek API: ${err.message}` });
  }

  if (!upstream.ok) {
    const errText = await upstream.text();
    return respJSON(callback, upstream.status, { error: `DeepSeek API error(${upstream.status}): ${errText}` });
  }

  const data = await upstream.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  return respJSON(callback, 200, { content });
}

async function handleMemory(event, callback, body) {
  const { systemPrompt } = body;

  if (!systemPrompt) {
    return respJSON(callback, 400, { error: '缺少 systemPrompt 参数' });
  }

  if (!DEEPSEEK_API_KEY) {
    return respJSON(callback, 500, { error: 'API key not configured' });
  }

  let upstream;
  try {
    upstream = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.3,
        max_tokens: 512,
      }),
    });
  } catch (err) {
    return respJSON(callback, 502, { error: `无法连接 DeepSeek API: ${err.message}` });
  }

  if (!upstream.ok) {
    const errText = await upstream.text();
    return respJSON(callback, upstream.status, { error: `DeepSeek API error(${upstream.status}): ${errText}` });
  }

  const data = await upstream.json();
  return respJSON(callback, 200, data);
}

// Event function handler — matches vision function format
export const handler = async (event, context, callback) => {
  try {
    // Parse HTTP request from event buffer
    const parsed = JSON.parse(Buffer.from(event).toString());
    const httpMethod = parsed.requestContext?.http?.method || parsed.httpMethod || 'POST';

    if (httpMethod === 'OPTIONS') {
      return respJSON(callback, 200, {});
    }

    const body = parsed.body;
    const bodyObj = typeof body === 'string' ? JSON.parse(body) : (body || {});

    const { action } = bodyObj;

    if (action === 'chat') {
      return handleChat(parsed, callback, bodyObj);
    } else if (action === 'memory') {
      return handleMemory(parsed, callback, bodyObj);
    } else {
      return respJSON(callback, 400, { error: '缺少 action 参数' });
    }
  } catch (error) {
    return respJSON(callback, 500, { error: '服务器内部错误' });
  }
};
