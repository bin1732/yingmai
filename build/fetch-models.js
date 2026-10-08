// 获取随包内置的离线模型（对话 + 语音识别）。
// 模型为较大的二进制文件，不通过 Git 提交（与 llama.cpp、whisper.cpp 等项目做法一致）：
//   - 普通用户可直接使用 Releases 中已内置模型的安装包/便携包；
//   - 从源码运行或打包时，在项目根目录执行 `npm run setup`。
// 下载使用国内可访问的镜像，并在完成后校验文件大小与 SHA256，确保文件完整、可离线使用。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const root = path.join(__dirname, '..');
const modelsDir = path.join(root, 'models');
const sttDir = path.join(modelsDir, 'stt');

const FILES = [
  {
    url: 'https://hf-mirror.com/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    dest: path.join(modelsDir, 'qwen2.5-1.5b-instruct-q4_k_m.gguf'),
    size: 1117320736,
    sha256: '6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e',
  },
  {
    url: 'https://hf-mirror.com/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve/main/model.int8.onnx',
    dest: path.join(sttDir, 'model.int8.onnx'),
    size: 239233841,
    sha256: 'c71f0ce00bec95b07744e116345e33d8cbbe08cef896382cf907bf4b51a2cd51',
  },
  {
    url: 'https://hf-mirror.com/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve/main/tokens.txt',
    dest: path.join(sttDir, 'tokens.txt'),
    size: 315894,
    sha256: 'f449eb28dc567533d7fa59be34e2abca8784f771850c78a47fb731a31429a1dc',
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

function hashFile(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const rs = fs.createReadStream(file);
    rs.on('error', reject);
    rs.on('data', (d) => hash.update(d));
    rs.on('end', () => resolve(hash.digest('hex')));
  });
}

async function verify(f) {
  if (!fs.existsSync(f.dest)) return false;
  const stat = fs.statSync(f.dest);
  if (stat.size !== f.size) return false;
  const got = await hashFile(f.dest);
  return got === f.sha256;
}

async function ensure(f, attempt) {
  const rel = path.relative(root, f.dest);
  if (fs.existsSync(f.dest)) {
    if (await verify(f)) {
      console.log('skip (verified): ' + rel);
      return;
    }
    console.log('file incomplete or mismatched, re-downloading: ' + rel);
    fs.rmSync(f.dest, { force: true });
  }
  console.log('downloading: ' + rel);
  await download(f.url, f.dest);
  if (!(await verify(f))) {
    if (attempt < 2) {
      console.log('verification failed, retrying: ' + rel);
      fs.rmSync(f.dest, { force: true });
      return ensure(f, attempt + 1);
    }
    throw new Error('verification failed after retry: ' + rel);
  }
  console.log('done (verified): ' + rel);
}

(async () => {
  for (const f of FILES) {
    await ensure(f, 1);
  }
  console.log('\nAll models are ready. You can now run the app or build the packages.');
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
