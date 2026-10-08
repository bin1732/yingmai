// 离线语音识别（SenseVoice：普通话/粤语/英语/日语/韩语，自动检测语种）· 灵感引擎工坊 · bin1732
// 识别组件可随程序内置，也可在首次使用时下载到用户目录，下载后离线可用。
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const http = require('http');

let bundledDir = null;
let userDir = null;
let recognizer = null;

const MODEL_FILES = ['model.int8.onnx', 'tokens.txt'];
const DOWNLOAD_BASE = 'https://hf-mirror.com/csukuangfj/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/resolve/main';

function init(paths) {
  if (paths.modelsDir) bundledDir = path.join(paths.modelsDir, 'stt');
  if (paths.userDataDir) userDir = path.join(paths.userDataDir, 'voice-model');
}

function hasFiles(dir) {
  return !!dir && MODEL_FILES.every((f) => fs.existsSync(path.join(dir, f)));
}

function resolveDir() {
  if (hasFiles(userDir)) return userDir;
  if (hasFiles(bundledDir)) return bundledDir;
  return null;
}

function available() {
  return resolveDir() !== null;
}

function status() {
  const downloaded = hasFiles(userDir);
  const bundled = hasFiles(bundledDir);
  return { available: downloaded || bundled, downloaded, bundled };
}

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'yingmai' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return resolve(downloadFile(next, dest, onProgress));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('下载失败（HTTP ' + res.statusCode + '）')); }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let received = 0;
      const tmp = dest + '.part';
      const out = fs.createWriteStream(tmp);
      res.on('data', (chunk) => {
        received += chunk.length;
        if (onProgress) onProgress({ received, total });
      });
      res.pipe(out);
      out.on('finish', () => out.close(() => {
        fs.renameSync(tmp, dest);
        resolve({ received, total });
      }));
      out.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(120000, () => req.destroy(new Error('下载超时，请检查网络后重试')));
  });
}

// 下载识别组件到用户目录；onProgress({file,fileIndex,fileCount,received,total})
async function ensureDownloaded(onProgress) {
  if (hasFiles(userDir)) return { skipped: true };
  if (!userDir) throw new Error('无法确定用户数据目录');
  fs.mkdirSync(userDir, { recursive: true });
  for (let i = 0; i < MODEL_FILES.length; i++) {
    const f = MODEL_FILES[i];
    const url = DOWNLOAD_BASE + '/' + f;
    const dest = path.join(userDir, f);
    await downloadFile(url, dest, (p) => {
      if (onProgress) onProgress(Object.assign({ file: f, fileIndex: i, fileCount: MODEL_FILES.length }, p));
    });
  }
  return { skipped: false };
}

async function getRecognizer() {
  if (recognizer) return recognizer;
  const dir = resolveDir();
  if (!dir) throw new Error('语音识别组件尚未下载，请先完成一次性下载');
  const mod = path.join(dir, 'model.int8.onnx');
  const tokens = path.join(dir, 'tokens.txt');
  const { OfflineRecognizer } = require('sherpa-onnx-node/non-streaming-asr.js');
  const threads = Math.min(4, Math.max(1, (os.cpus() || []).length));
  const config = {
    modelConfig: {
      senseVoice: { model: mod, language: '', useInverseTextNormalization: 1 },
      tokens,
      numThreads: threads,
      provider: 'cpu',
      debug: false,
    },
  };
  recognizer = await OfflineRecognizer.createAsync(config);
  return recognizer;
}

// samples: 16kHz 单声道 Float32Array
async function transcribe(samples) {
  if (!(samples && samples.length)) throw new Error('未检测到语音内容');
  const rec = await getRecognizer();
  const stream = rec.createStream();
  stream.acceptWaveform({ samples, sampleRate: 16000 });
  await rec.decodeAsync(stream).catch(() => { rec.decode(stream); });
  const result = rec.getResult(stream);
  return (result && result.text ? String(result.text) : '').trim();
}

module.exports = { init, available, status, ensureDownloaded, transcribe };
