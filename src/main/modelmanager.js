// 本地模型管理器 · 灵感引擎工坊 · bin1732
// 按设备配置选择并下载本地模型；下载后在本机直接运行，不依赖其他软件。
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const engine = require('./engine');

let modelsDir = '';
let catalogFile = '';
let catalog = null;
const jobs = {};

function init(p) {
  modelsDir = p.modelsDir;
  catalogFile = path.join(p.refDataDir, 'localmodels.json');
}

function loadCatalog() {
  if (catalog) return catalog;
  catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
  return catalog;
}

function entryPresent(entry) {
  return entry.files.every((f) => {
    const p = path.join(modelsDir, f.name);
    return fs.existsSync(p) && fs.statSync(p).size === f.size;
  });
}

// 扫描已下载模型：优先与目录条目对应，其余为本机已有的兼容模型
function scanDownloaded() {
  let names = [];
  try { names = fs.readdirSync(modelsDir).filter((f) => f.toLowerCase().endsWith('.gguf')); } catch {}
  const used = new Set();
  const out = [];
  for (const e of loadCatalog().models) {
    if (entryPresent(e)) {
      e.files.forEach((f) => used.add(f.name));
      out.push({ id: e.id, file: e.select_file, label: e.label, size: e.total_size, bundled: !!e.bundled, family: e.family });
    }
  }
  for (const n of names) {
    if (used.has(n)) continue;
    // 分片模型只显示首片
    if (/\d{5}-of-\d{5}/.test(n) && !/-00001-of/.test(n)) continue;
    let size = 0;
    try { size = fs.statSync(path.join(modelsDir, n)).size; } catch {}
    out.push({ id: 'custom:' + n, file: n, label: { zh: n, en: n }, size, bundled: false, family: 'custom' });
  }
  return out;
}

// 按显存与内存给出推荐档位
function recommendTier(hw, ramBytes) {
  const vram = hw.vram_total || 0;
  const ramGb = ramBytes / (1024 * 1024 * 1024);
  if (vram >= 12288 || (!hw.gpu_name && ramGb >= 32)) return 'high';
  if (vram >= 6144 || ramGb >= 16) return 'mid';
  return 'low';
}

async function state() {
  const hw = await engine.detectHardware();
  const ram = os.totalmem();
  const recommendedTier = recommendTier(hw, ram);
  const cfg = engine.getConfig();
  const activeFile = cfg.provider === 'builtin' ? (cfg.builtin_model || '') : '';
  const models = loadCatalog().models.map((e) => ({
    id: e.id,
    tier: e.tier,
    family: e.family,
    label: e.label,
    desc: e.desc,
    total_size: e.total_size,
    bundled: !!e.bundled,
    source_page: e.source_page,
    rec_vram_mb: e.rec_vram_mb,
    rec_ram_mb: e.rec_ram_mb,
    present: entryPresent(e),
    active: !!activeFile && e.select_file === activeFile,
    job: jobs[e.id] || null,
  }));
  return { hardware: hw, ram_total: ram, recommended_tier: recommendedTier, active_file: activeFile, models };
}

// ── 下载（支持重定向、断点临时文件、体积校验、进度回调）──
function fetchResponse(url, redirects, cb, errcb) {
  const mod = url.startsWith('https') ? https : http;
  const req = mod.get(url, { headers: { 'User-Agent': 'yingmai' } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume();
      if (redirects <= 0) return errcb(new Error('重定向次数过多'));
      return fetchResponse(new URL(res.headers.location, url).href, redirects - 1, cb, errcb);
    }
    if (res.statusCode !== 200) { res.resume(); return errcb(new Error('HTTP ' + res.statusCode)); }
    cb(res);
  });
  req.on('error', errcb);
}

function downloadOne(url, dest, expectedSize, onProgress) {
  return new Promise((resolve, reject) => {
    fetchResponse(url, 8, (res) => {
      const total = expectedSize || Number(res.headers['content-length']) || 0;
      const tmp = dest + '.part';
      const ws = fs.createWriteStream(tmp);
      let received = 0;
      res.on('data', (d) => { received += d.length; onProgress(received, total); });
      res.pipe(ws);
      ws.on('finish', () => ws.close(() => {
        const sz = fs.statSync(tmp).size;
        if (total && sz !== total) { try { fs.unlinkSync(tmp); } catch {} return reject(new Error('文件大小校验失败')); }
        fs.renameSync(tmp, dest);
        resolve({ size: sz });
      }));
      ws.on('error', (e) => { try { fs.unlinkSync(tmp); } catch {} reject(e); });
    }, reject);
  });
}

async function download(id) {
  const entry = loadCatalog().models.find((m) => m.id === id);
  if (!entry) throw new Error('未找到该模型');
  if (jobs[id] && jobs[id].running) return jobs[id];
  const total = entry.total_size;
  const job = jobs[id] = { running: true, received: 0, total, pct: 0, file: '', error: '' };
  fs.mkdirSync(modelsDir, { recursive: true });
  (async () => {
    let doneBefore = 0;
    try {
      for (const f of entry.files) {
        const dest = path.join(modelsDir, f.name);
        const ok = fs.existsSync(dest) && fs.statSync(dest).size === f.size;
        job.file = f.name;
        if (ok) {
          doneBefore += f.size;
        } else {
          await downloadOne(f.url, dest, f.size, (rec) => {
            job.received = doneBefore + rec;
            job.pct = total ? Math.round((100 * job.received) / total) : 0;
          });
          doneBefore += f.size;
        }
        job.received = doneBefore;
        job.pct = total ? Math.round((100 * doneBefore) / total) : 0;
      }
      job.running = false;
      job.pct = 100;
    } catch (e) {
      job.running = false;
      job.error = e.message || '下载失败';
    }
  })();
  return job;
}

async function select(file) {
  return engine.selectBuiltin(file);
}

function remove(id) {
  const entry = loadCatalog().models.find((m) => m.id === id);
  if (!entry) throw new Error('未找到该模型');
  if (entry.bundled) throw new Error('默认内置模型不支持删除');
  const cfg = engine.getConfig();
  if (cfg.provider === 'builtin' && cfg.builtin_model === entry.select_file)
    throw new Error('请先切换到其它模型后再删除');
  for (const f of entry.files) {
    const p = path.join(modelsDir, f.name);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  delete jobs[id];
  return { ok: true };
}

function progress() {
  return jobs;
}

module.exports = {
  init, state, download, select, remove, progress,
  recommendTier, scanDownloaded, entryPresent, loadCatalog,
};
