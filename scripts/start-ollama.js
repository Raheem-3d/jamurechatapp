const { spawn } = require('child_process');
const http = require('http');

/**
 * Automatically ensures Ollama is running with OLLAMA_NUM_PARALLEL=4
 */
function startOllama() {
  const req = http.get('http://127.0.0.1:11434/api/version', (res) => {
    console.log('✅ [Ollama] Ollama server is already running on http://127.0.0.1:11434');
  });

  req.on('error', () => {
    console.log('🚀 [Ollama] Starting Ollama server with OLLAMA_NUM_PARALLEL=4...');
    const env = { ...process.env, OLLAMA_NUM_PARALLEL: '4' };
    
    try {
      const ollamaProcess = spawn('ollama', ['serve'], {
        env,
        stdio: 'ignore',
        shell: true,
        detached: true,
      });
      
      ollamaProcess.unref();
      console.log('✅ [Ollama] Ollama background process initiated with OLLAMA_NUM_PARALLEL=4.');
    } catch (err) {
      console.error('⚠️ [Ollama] Could not start Ollama process automatically:', err.message);
    }
  });

  req.setTimeout(1500, () => {
    req.destroy();
  });
}

startOllama();
