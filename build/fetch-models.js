// 一次性获取内置离线模型（对话 + 语音识别）。
// 已存在且大小正确的文件会跳过；下载使用国内可访问的镜像，完成后即可离线使用。
// 用法：在项目根目录运行  node build/fetch-models.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const modelsDir = path.join(root, 'models');
const sttDir = path.join(modelsDir, 'stt');

const FILES = [
  {
    url: 'https://hf-mirror.com/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    dest: path.join(modelsDir, 'qwen2.5-1.5b-instruct-q4_k_m.gguf'),
    size: 1117320736,
  },
  {
    url: 'https://hf-mirror.com/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve/main/model.int8.onnx',
    dest: path.join(sttDir, 'model.int8.onnx'),
    size: 239233841,
  },
  {
    url: 'https://hf-mirror.com/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve/main/tokens.txt',
    dest: path.join(sttDir, 'tokens.txt'),
    size: 315894,
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = dest + '.part';
    const req = https.get(url, { headers: { 'User-Agent': 'yingmai-setup' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(download(new URL(res.headers.location, url).toString(), dest));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let received = 0; let last = 0;
      const out = fs.createWriteStream(tmp);
      res.on('data', (c) => {
        received += c.length;
        if (received - last > 20 * 1024 * 1024) {
          last = received;
          const pct = total ? Math.round((received / total) * 100) : '';
          console.log('  ' + path.basename(dest) + '  ' + (received / 1048576).toFixed(0) + ' MB ' + pct + '%');
        }
      });
      res.pipe(out);
      out.on('finish', () => out.close(() => { fs.renameSync(tmp, dest); resolve(); }));
      out.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(300000, () => req.destroy(new Error('timeout')));
  });
}

(async () => {
  for (const f of FILES) {
    if (fs.existsSync(f.dest) && fs.statSync(f.dest).size === f.size) {
      console.log('skip (present): ' + path.relative(root, f.dest));
      continue;
    }
    console.log('downloading: ' + path.relative(root, f.dest));
    await download(f.url, f.dest);
    console.log('done: ' + path.relative(root, f.dest));
  }
  console.log('\nAll models are ready. You can now run the app or build the packages.');
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
