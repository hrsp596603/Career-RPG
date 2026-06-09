const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');

const PORT = 9000;
let wranglerProcess = null;
let logClients = [];
let logsBuffer = [];

// 補全 PATH 環境變數，確保 npx, node, ollama 均能被找到
const env = { ...process.env };
const commonPaths = [
  '/usr/local/bin',
  '/opt/homebrew/bin',
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin'
];
env.PATH = commonPaths.join(':') + ':' + (env.PATH || '');
env.FORCE_COLOR = '1';

// 檢查 Ollama 是否在運行 (加入防重複 callback 鎖保護，解決超時崩潰 Bug)
function checkOllamaStatus(callback) {
  let called = false;
  const safeCallback = (result) => {
    if (called) return;
    called = true;
    callback(result);
  };

  const options = {
    hostname: 'localhost',
    port: 11434,
    path: '/',
    method: 'GET',
    timeout: 1000
  };
  
  const req = http.request(options, (res) => {
    safeCallback(res.statusCode === 200);
  });
  
  req.on('error', () => {
    safeCallback(false);
  });
  
  req.on('timeout', () => {
    req.destroy();
    safeCallback(false);
  });
  
  req.end();
}

// 廣播日誌給所有連接的 SSE 客戶端
function broadcastLog(data) {
  const formatted = data.toString();
  logsBuffer.push(formatted);
  if (logsBuffer.length > 1000) logsBuffer.shift(); // 限制緩衝區大小
  
  logClients.forEach(res => {
    res.write(`data: ${encodeURIComponent(formatted)}\n\n`);
  });
}

// 建立控制 HTTP 伺服器
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'docs', 'control_panel.html'), 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('無法載入控制面板網頁，請確認 docs/control_panel.html 檔案存在。');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      }
    });
  } else if (req.url === '/api/status') {
    checkOllamaStatus((ollamaRunning) => {
      const wranglerRunning = wranglerProcess !== null && wranglerProcess.exitCode === null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ollama: ollamaRunning, wrangler: wranglerRunning }));
    });
  } else if (req.url === '/api/start' && req.method === 'POST') {
    // 1. 啟動 Ollama
    exec('pkill -f Ollama || true && launchctl setenv OLLAMA_ORIGINS "*" && open -a Ollama', { env }, (err) => {
      if (err) console.error('啟動 Ollama 出錯', err);
    });

    // 2. 啟動 Wrangler 伺服器 (加入 shell: true 與 error 監聽)
    if (!wranglerProcess || wranglerProcess.exitCode !== null) {
      logsBuffer = []; // 清空日誌緩衝
      broadcastLog('[系統] 正在啟動 Wrangler 網頁伺服器...\n');
      
      // 在啟動前，強行清除可能殘留佔用 8787 port 的進程 (例如 workerd 殘留)，防止 port 衝突
      exec('lsof -t -i :8787 | xargs kill -9 || true', { env }, () => {
        const persistPath = path.join(os.homedir(), 'wrangler-state');
        wranglerProcess = spawn('npx', ['wrangler', 'pages', 'dev', '.', '--port', '8787', '--persist-to', persistPath], {
          cwd: __dirname,
          env,
          shell: true // 確保在 shell 中解譯，拉起完整環境
        });

        wranglerProcess.stdout.on('data', (data) => {
          const text = data.toString();
          broadcastLog(data);
          // 偵測到 Ready 時，自動從後台啟動瀏覽器分頁，優化使用者體驗並避開瀏覽器 popup blocker 限制
          if (text.includes('Ready on') || text.includes('localhost:8787')) {
            exec('open http://localhost:8787', { env });
          }
        });
        
        wranglerProcess.stderr.on('data', (data) => broadcastLog(data));
        
        wranglerProcess.on('error', (err) => {
          broadcastLog(`[錯誤] 啟動 Wrangler 失敗: ${err.message}\n`);
        });
        
        wranglerProcess.on('close', (code) => {
          broadcastLog(`[系統] Wrangler 伺服器已結束 (回傳碼: ${code})\n`);
          wranglerProcess = null;
        });
      });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } else if (req.url === '/api/stop-server' && req.method === 'POST') {
    if (wranglerProcess) {
      wranglerProcess.kill();
      // 同時清除 wrangler 與其背後 workerd 進程，並強行釋放 8787 port
      exec('pkill -f wrangler || true && pkill -f workerd || true && lsof -t -i :8787 | xargs kill -9 || true', { env });
      wranglerProcess = null;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } else if (req.url === '/api/stop-ollama' && req.method === 'POST') {
    exec('pkill -f Ollama', { env });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } else if (req.url === '/api/stop-all' && req.method === 'POST') {
    if (wranglerProcess) {
      wranglerProcess.kill();
      exec('pkill -f wrangler || true && pkill -f workerd || true && lsof -t -i :8787 | xargs kill -9 || true', { env });
      wranglerProcess = null;
    }
    exec('pkill -f Ollama', { env });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    
    // 延遲關閉本主控台伺服器本身
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } else if (req.url === '/api/logs') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    logsBuffer.forEach(log => {
      res.write(`data: ${encodeURIComponent(log)}\n\n`);
    });
    
    logClients.push(res);
    
    req.on('close', () => {
      logClients = logClients.filter(client => client !== res);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`[控制台] 伺服器正在運行於 http://localhost:${PORT}`);
});
