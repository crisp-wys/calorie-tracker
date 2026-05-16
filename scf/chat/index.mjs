const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export const handler = async (req, resp, context) => {
  if (req.method === 'OPTIONS') {
    resp.setStatusCode(200);
    Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
    resp.send('');
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { action } = body;

    if (action === 'chat') {
      return handleChat(req, resp, body);
    } else if (action === 'memory') {
      return handleMemory(req, resp, body);
    } else {
      resp.setStatusCode(400);
      Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
      resp.setHeader('Content-Type', 'application/json');
      resp.send(JSON.stringify({ error: '缺少 action 参数' }));
    }
  } catch (error) {
    resp.setStatusCode(500);
    Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
    resp.setHeader('Content-Type', 'application/json');
    resp.send(JSON.stringify({ error: '服务器内部错误' }));
  }
};

async function handleChat(req, resp, body) {
  const { message, history, systemPrompt } = body;

  if (!message || !systemPrompt) {
    resp.setStatusCode(400);
    Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
    resp.setHeader('Content-Type', 'application/json');
    resp.send(JSON.stringify({ error: '缺少参数' }));
    return;
  }

  if (!DEEPSEEK_API_KEY) {
    resp.setStatusCode(500);
    Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
    resp.setHeader('Content-Type', 'application/json');
    resp.send(JSON.stringify({ error: 'API key not configured' }));
    return;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []).map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

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
        stream: true,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });
  } catch (err) {
    resp.setStatusCode(502);
    Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
    resp.setHeader('Content-Type', 'application/json');
    resp.send(JSON.stringify({ error: `无法连接 DeepSeek API: ${err.message}` }));
    return;
  }

  if (!upstream.ok) {
    const errText = await upstream.text();
    resp.setStatusCode(upstream.status);
    Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
    resp.setHeader('Content-Type', 'application/json');
    resp.send(JSON.stringify({ error: `DeepSeek API error(${upstream.status}): ${errText}` }));
    return;
  }

  resp.setStatusCode(200);
  Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
  resp.setHeader('Content-Type', 'text/event-stream');
  resp.setHeader('Cache-Control', 'no-cache');
  resp.setHeader('Connection', 'keep-alive');

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            resp.write('data: [DONE]\n\n');
            continue;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              resp.write(`data: ${JSON.stringify({ token: content })}\n\n`);
            }
          } catch {
            // skip unparseable chunks
          }
        }
      }
    }
  } finally {
    resp.end();
  }
}

async function handleMemory(req, resp, body) {
  const { systemPrompt } = body;

  if (!systemPrompt) {
    resp.setStatusCode(400);
    Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
    resp.setHeader('Content-Type', 'application/json');
    resp.send(JSON.stringify({ error: '缺少 systemPrompt 参数' }));
    return;
  }

  if (!DEEPSEEK_API_KEY) {
    resp.setStatusCode(500);
    Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
    resp.setHeader('Content-Type', 'application/json');
    resp.send(JSON.stringify({ error: 'API key not configured' }));
    return;
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
    resp.setStatusCode(502);
    Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
    resp.setHeader('Content-Type', 'application/json');
    resp.send(JSON.stringify({ error: `无法连接 DeepSeek API: ${err.message}` }));
    return;
  }

  if (!upstream.ok) {
    const errText = await upstream.text();
    resp.setStatusCode(upstream.status);
    Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
    resp.setHeader('Content-Type', 'application/json');
    resp.send(JSON.stringify({ error: `DeepSeek API error(${upstream.status}): ${errText}` }));
    return;
  }

  const data = await upstream.json();
  resp.setStatusCode(200);
  Object.entries(corsHeaders()).forEach(([k, v]) => resp.setHeader(k, v));
  resp.setHeader('Content-Type', 'application/json');
  resp.send(JSON.stringify(data));
}
