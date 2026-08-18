const http = require('http');

async function testOllama(endpoint, body) {
  const data = JSON.stringify(body);
  console.log(`\nTesting ${endpoint} with model: ${body.model}...`);
  const start = Date.now();

  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 11434,
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          console.log(`[Status ${res.statusCode}] in ${Date.now() - start}ms`);
          try {
            const parsed = JSON.parse(raw);
            console.log('Response content:', parsed.choices?.[0]?.message?.content || parsed.message?.content || parsed);
          } catch (e) {
            console.log('Raw output:', raw);
          }
          resolve();
        });
      }
    );

    req.on('error', (err) => {
      console.error('Request error:', err.message);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

async function run() {
  // Test native Ollama endpoint /api/chat
  await testOllama('/api/chat', {
    model: 'qwen2.5:7b',
    messages: [{ role: 'user', content: 'Say hello in 3 words' }],
    stream: false,
  });

  // Test OpenAI endpoint /v1/chat/completions
  await testOllama('/v1/chat/completions', {
    model: 'qwen2.5:7b',
    messages: [{ role: 'user', content: 'Say hello in 3 words' }],
    stream: false,
  });
}

run();
