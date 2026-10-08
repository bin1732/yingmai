// 真实数据连接器：Keepa 商品数据 / 实时汇率 / 云端商品配图
// 灵感引擎工坊 · bin1732
// 仅在用户提供有效凭据或选用相应功能时发起真实网络请求；失败如实返回，不生成替代结果。

const engine = require('./engine');

const KEEPA_DOMAINS = {
  1: ['美国', 'amazon.com'], 2: ['英国', 'amazon.co.uk'], 3: ['德国', 'amazon.de'],
  4: ['法国', 'amazon.fr'], 5: ['日本', 'amazon.co.jp'], 6: ['加拿大', 'amazon.ca'],
  8: ['意大利', 'amazon.it'], 9: ['西班牙', 'amazon.es'], 10: ['印度', 'amazon.in'],
  11: ['墨西哥', 'amazon.com.mx'], 12: ['巴西', 'amazon.com.br'], 13: ['澳大利亚', 'amazon.com.au'],
};

async function fetchWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, Object.assign({ signal: ctrl.signal }, options)); }
  finally { clearTimeout(t); }
}

// ── Keepa：真实商品数据 ──
function keepaTimeToISO(t) {
  return new Date((Number(t) + 21564000) * 60000).toISOString().slice(0, 10);
}
function decodeCsv(arr, isPrice) {
  const out = [];
  if (!Array.isArray(arr)) return out;
  for (let i = 0; i + 1 < arr.length; i += 2) {
    const t = arr[i], v = arr[i + 1];
    if (v === null || v === undefined || v < 0) continue;
    out.push({ date: keepaTimeToISO(t), value: isPrice ? v / 100 : v });
  }
  return out;
}

async function keepaQuery(b) {
  const key = String(b.key || '').trim();
  const domain = parseInt(b.domain, 10);
  const asin = String(b.asin || '').trim().toUpperCase();
  if (!key) return { ok: false, error: '请填写 Keepa 访问密钥' };
  if (!domain || !KEEPA_DOMAINS[domain]) return { ok: false, error: '请选择站点' };
  if (!/^[A-Z0-9]{10}$/.test(asin)) return { ok: false, error: '请填写 10 位 ASIN' };
  const url = `https://api.keepa.com/product?key=${encodeURIComponent(key)}&domain=${domain}`
    + `&asin=${encodeURIComponent(asin)}&stats=1&update=0`;
  try {
    const r = await fetchWithTimeout(url, {}, 25000);
    const j = await r.json();
    if (j.error) return { ok: false, error: KeepaErr(j.error) };
    const p = Array.isArray(j.products) ? j.products[0] : null;
    if (!p) return { ok: false, error: '未查询到该商品，可能站点选择不正确或商品不存在' };
    const st = p.stats || {};
    const pick = (arr, i, isPrice) => {
      const v = Array.isArray(arr) ? arr[i] : null;
      if (v === null || v === undefined || v < 0) return null;
      return isPrice ? Math.round(v) / 100 : v;
    };
    const priceHist = decodeCsv(p.csv ? p.csv[0] : null, true);
    const bsrHist = decodeCsv(p.csv ? p.csv[3] : null, false);
    const bsrSpark = bsrHist.slice(-40);
    const rating = p.rating ? Math.round(p.rating) / 10
      : pick(st.current, 16, false) ? Math.round(pick(st.current, 16, false)) / 10 : null;
    const ratingCount = p.ratings || pick(st.current, 17, false) || null;
    return {
      ok: true,
      asin: p.asin, title: p.title, brand: p.brand || null,
      domain_label: KEEPA_DOMAINS[domain][0] + ' · ' + KEEPA_DOMAINS[domain][1],
      current_price: pick(st.current, 0, true),
      avg_price_30: pick(st.avg30, 0, true),
      avg_price_90: pick(st.avg90, 0, true),
      avg_price_180: pick(st.avg180, 0, true),
      current_bsr: pick(st.current, 3, false),
      avg_bsr_30: pick(st.avg30, 3, false),
      avg_bsr_90: pick(st.avg90, 3, false),
      avg_bsr_180: pick(st.avg180, 3, false),
      monthly_sold: p.monthlySold || (st.atcs != null ? st.atcs : null),
      rating, rating_count: ratingCount,
      bsr_spark: bsrSpark,
      image: pickImage(p),
    };
  } catch (e) {
    return { ok: false, error: /aborted/i.test(String(e.message)) ? '请求超时，请检查网络后重试' : '连接失败，请检查网络' };
  }
}
function pickImage(p) {
  try {
    const im = p.images;
    const keys = Object.keys(im).map(Number).sort((a, b) => a - b);
    const id = im[keys[0]][0];
    return `https://m.media-amazon.com/images/I/${id}`;
  } catch { return null; }
}
function KeepaErr(e) {
  const type = e && e.type;
  if (type === 'missingkey' || type === 'badkey') return '密钥无效或已过期，请确认 Keepa 订阅有效';
  if (type === 'token') return '当前查询额度不足，请稍后再试';
  return (e && e.message) || '查询失败';
}

// ── 实时汇率（免费，无需密钥） ──
async function exchangeRate(b) {
  const base = String(b.base || 'USD').toUpperCase();
  // 源1：Frankfurter（欧洲央行公开数据，免费、无需密钥）
  try {
    const r = await fetchWithTimeout(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`, {}, 10000);
    const j = await r.json();
    if (j && j.rates) {
      j.rates[base] = 1;
      return { ok: true, base: j.base || base, rates: j.rates, updated: j.date || '' };
    }
  } catch (e) { /* 继续尝试备选源 */ }
  // 源2：open.er-api.com
  try {
    const r = await fetchWithTimeout(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`, {}, 10000);
    const j = await r.json();
    if (j.result === 'success' && j.rates) {
      return { ok: true, base: j.base_code || base, rates: j.rates, updated: j.time_last_update_utc || '' };
    }
  } catch (e) { /* 落到失败提示 */ }
  return { ok: false, error: '暂时无法获取汇率，可使用手工汇率' };
}

// ── 云端商品配图（走当前云服务商 OpenAI 兼容图像接口） ──
async function cloudImage(b) {
  const cfg = engine.getConfig();
  const provider = cfg.provider || 'builtin';
  const prompt = String(b.prompt || '').trim();
  const size = String(b.size || '1024x1024');
  if (!prompt) return { ok: false, error: '请描述想要的商品图' };
  if (provider === 'builtin' || !cfg.base_url)
    return { ok: false, error: '内置助手不支持生成图片。可在设置中接入支持图像的云端模型后使用' };
  if (provider === 'ollama')
    return { ok: false, error: '当前本地引擎未提供图像接口，请改用支持图像的云端模型' };
  const imageModel = String(b.image_model || cfg.model || '').trim();
  if (!imageModel) return { ok: false, error: '请填写支持图像的模型名称' };
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.api_key) headers.Authorization = `Bearer ${cfg.api_key}`;
  try {
    const r = await fetchWithTimeout(cfg.base_url.replace(/\/$/, '') + '/images/generations', {
      method: 'POST', headers,
      body: JSON.stringify({ model: imageModel, prompt, size, n: 1, response_format: 'url' }),
    }, 90000);
    let data;
    try { data = await r.json(); } catch { return { ok: false, error: `服务返回异常（HTTP ${r.status}）` }; }
    if (r.status !== 200 || data.error)
      return { ok: false, error: imageErr(data, r.status) };
    const item = data.data && data.data[0];
    if (!item) return { ok: false, error: '服务未返回图片，请确认该模型支持图像生成' };
    if (item.url) return { ok: true, url: item.url, model: imageModel };
    if (item.b64_json) return { ok: true, b64: 'data:image/png;base64,' + item.b64_json, model: imageModel };
    return { ok: false, error: '未获取到图片内容' };
  } catch (e) {
    return { ok: false, error: /aborted/i.test(String(e.message)) ? '生成超时，请稍后重试' : '连接失败，请检查网络' };
  }
}
function imageErr(data, status) {
  const m = data && data.error;
  if (m) {
    if (typeof m === 'string') return m.slice(0, 160);
    return (m.message || '该模型不支持图像生成，请更换为支持图像的模型').slice(0, 160);
  }
  return `请求未成功（HTTP ${status}），请确认模型支持图像生成`;
}

module.exports = { keepaQuery, exchangeRate, cloudImage, KEEPA_DOMAINS };
