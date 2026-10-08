// 店铺连接器：用卖家自己的凭证在本机直连平台，零服务器、零成本。
// 负责连接登记、凭证加密保管、增量同步、限额调度与幂等写入。
// 灵感引擎工坊 · bin1732

const fs = require('fs');
const path = require('path');
const vault = require('../vault');
const shopify = require('./shopify');
const amazon = require('./amazon');
const ebay = require('./ebay');
const shopee = require('./shopee');
const aliexpress = require('./aliexpress');
const tiktokshop = require('./tiktokshop');
const lazada = require('./lazada');
const c1688 = require('./c1688');
const taobao = require('./taobao');
const jd = require('./jd');
const pdd = require('./pdd');
const douyin = require('./douyin');
const kuaishou = require('./kuaishou');
const xiaohongshu = require('./xiaohongshu');
const { CATALOG } = require('./catalog');

const ADAPTERS = {
  shopify,
  amazon,
  ebay,
  shopee,
  aliexpress,
  tiktokshop,
  lazada,
  '1688': c1688,
  taobao,
  jd,
  pdd,
  douyin,
  kuaishou,
  xiaohongshu,
};

const MSG = {
  conn_shop_required: { zh: '请填写店铺域名', en: 'Please enter the store domain' },
  conn_token_required: { zh: '请填写访问令牌', en: 'Please enter the access token' },
  conn_cred_required: { zh: '请填写完整的连接凭证', en: 'Please complete the connection credentials' },
  conn_test_failed: { zh: '连接失败，请检查填写的信息', en: 'Connection failed; please check the information entered' },
  conn_invalid_token: { zh: '访问令牌无效或缺少所需权限', en: 'The access token is invalid or lacks required permissions' },
  conn_shop_not_found: { zh: '未找到该店铺，请检查域名', en: 'Store not found; please check the domain' },
  conn_network: { zh: '网络连接失败，请检查网络后重试', en: 'Network error; please check your connection and try again' },
  conn_rate: { zh: '平台暂时限制访问，将自动稍后重试', en: 'The platform temporarily limited requests; retrying shortly' },
  sync_done: { zh: '同步完成', en: 'Sync complete' },
  products_built: { zh: '已建立内部商品档案', en: 'Internal product records created' },
};

let filePath = null;
let data = null;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function pad(n) { return String(n).padStart(2, '0'); }
function nowStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function t(key) {
  const lang = (data && data.settings && data.settings.lang) || 'zh';
  const m = MSG[key];
  return m ? (m[lang] || m.zh) : key;
}
function save() {
  try {
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(stripRuntime(data), null, 2), 'utf-8');
    fs.renameSync(tmp, filePath);
  } catch { /* 目录不可写时保留内存状态 */ }
}
function stripRuntime(d) {
  return {
    settings: d.settings,
    connections: d.connections.map(({ _syncing, ...rest }) => rest),
  };
}

function init(userDir) {
  filePath = path.join(userDir, 'connections.json');
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch { data = null; }
  if (!data || typeof data !== 'object') data = {};
  if (!data.settings || typeof data.settings !== 'object') data.settings = {};
  data.settings.auto_sync = data.settings.auto_sync !== false;
  data.settings.interval_seconds = Number(data.settings.interval_seconds) || 60;
  data.settings.lang = data.settings.lang || 'zh';
  if (!Array.isArray(data.connections)) data.connections = [];
  for (const c of data.connections) {
    c.cursors = c.cursors || {};
    c.logs = Array.isArray(c.logs) ? c.logs : [];
    c.status = c.status === 'syncing' ? (c.last_error ? 'error' : 'ok') : (c.status || 'new');
  }
  save();
  startScheduler();
}

function get(id) { return data.connections.find((c) => c.id === id); }
function nextConnId() {
  return data.connections.reduce((m, c) => Math.max(m, c.id || 0), 0) + 1;
}
function addLog(conn, level, msg) {
  conn.logs.unshift({ at: nowStr(), level, msg });
  if (conn.logs.length > 60) conn.logs.length = 60;
}

// ── HTTP：节流、退避重试、分页 ──
function parseLink(header) {
  if (!header) return null;
  for (const part of header.split(',')) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="?next"?/);
    if (m) return m[1];
  }
  return null;
}
function apiErrorText(json) {
  if (json && json.errors) {
    if (typeof json.errors === 'string') return json.errors.slice(0, 160);
    try { return JSON.stringify(json.errors).slice(0, 160); } catch { return ''; }
  }
  return '';
}
function qs(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== '' && obj[k] != null)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`).join('&');
}
function makeRequester(adapter, creds, ctx) {
  const gap = adapter.META.requestGapMs || 400;
  let lastCall = 0;
  return async function request(url, init) {
    init = init || {};
    const method = (init.method || 'GET').toUpperCase();
    // 合并 query 到 URL（baseUrl，不含适配器动态签名参数）
    let baseUrl = url;
    if (init.query && Object.keys(init.query).length) {
      baseUrl += (url.includes('?') ? '&' : '?') + qs(init.query);
    }
    const w = gap - (Date.now() - lastCall);
    if (w > 0) await sleep(w);
    let attempt = 0;
    let tokenRefreshed = false;
    while (true) {
      lastCall = Date.now();
      // 组装基础 init：静态头（authHeaders）+ 调用方头；body 仅非 GET/HEAD 携带
      let reqInit = {
        method,
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          typeof adapter.authHeaders === 'function' ? adapter.authHeaders(creds) : {},
          init.headers || {}
        ),
        body: undefined,
      };
      if (method !== 'GET' && method !== 'HEAD') {
        reqInit.body = typeof init.body === 'string' ? init.body
          : (init.body != null ? JSON.stringify(init.body) : '');
      }
      // 动态签名 / 令牌注入（OAuth、SigV4、HMAC 类）。适配器可返回 { url, ...init } 覆盖最终 URL（如 Shopee 把公共参数拼进 query）。
      let reqUrl = baseUrl;
      if (typeof adapter.buildInit === 'function') {
        const built = await adapter.buildInit(creds, baseUrl, reqInit, ctx) || reqInit;
        if (built && typeof built.url === 'string') {
          reqUrl = built.url;
          const rest = Object.assign({}, built);
          delete rest.url;
          reqInit = rest;
        } else {
          reqInit = built;
        }
      }
      let res;
      try {
        res = await fetch(reqUrl, reqInit);
      } catch {
        attempt += 1;
        if (attempt >= 3) return { error: t('conn_network') };
        await sleep(700 * attempt);
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        attempt += 1;
        if (attempt >= 5) return { error: res.status === 429 ? t('conn_rate') : t('conn_test_failed') };
        const ra = parseInt(res.headers.get('retry-after') || '', 10);
        await sleep(ra ? ra * 1000 : Math.min(8000, 800 * Math.pow(1.8, attempt)));
        continue;
      }
      let json = null;
      try { json = await res.clone().json(); } catch { /* 非 JSON */ }
      // 401：用 refreshCredentials 只刷新一次并重试同一请求
      if (res.status === 401 && typeof adapter.refreshCredentials === 'function' && !tokenRefreshed) {
        tokenRefreshed = true;
        try { await adapter.refreshCredentials(creds, ctx); } catch { /* 刷新失败按无效处理 */ }
        continue;
      }
      if (res.status === 401 || res.status === 403) return { error: t('conn_invalid_token') };
      if (res.status === 404) return { error: t('conn_shop_not_found') };
      if (res.status >= 400) return { error: apiErrorText(json) || t('conn_test_failed') };
      if (adapter.paceFromHeaders) {
        const extra = adapter.paceFromHeaders(res.headers);
        if (extra) await sleep(extra);
      }
      return { json, nextUrl: parseLink(res.headers.get('link')), status: res.status, headers: res.headers };
    }
  };
}

function buildCtx(adapter, creds, conn) {
  const ctx = {
    t,
    shopCurrency: '',
    // 凭证轮换持久化（Shopee refresh_token 一次性）：对已保存连接，把 patch 字段合并进明文 creds 后用 vault 重新加密写回 conn.enc 并落盘；
    // 测试/未保存场景（conn 为空）为 no-op。Shopify/Amazon/eBay 路径不调用它，行为不变。
    persistCredentials: async (patch) => {
      if (!conn) return;
      try {
        const fields = adapter.META.credentialFields.map((f) => f.key);
        Object.assign(creds, patch || {});
        conn.enc = vault.encryptFields(creds, fields);
        save();
      } catch { /* 持久化失败不阻断本次同步 */ }
    },
  };
  ctx.request = makeRequester(adapter, creds, ctx);
  return ctx;
}

function decryptCreds(conn) {
  const adapter = ADAPTERS[conn.platform];
  const fields = adapter.META.credentialFields.map((f) => f.key);
  return vault.decryptFields(conn.enc, fields);
}

// 仅测试、不保存
async function testCredentials(payload) {
  const adapter = ADAPTERS[payload.platform];
  if (!adapter) return { ok: false, error: t('conn_test_failed') };
  if (payload.language) data.settings.lang = payload.language;
  const creds = payload.credentials || {};
  const ctx = buildCtx(adapter, creds);
  return adapter.test(creds, ctx);}

function createRecord(payload) {
  const adapter = ADAPTERS[payload.platform];
  if (!adapter) throw new Error('暂不支持该平台');
  const fields = adapter.META.credentialFields.map((f) => f.key);
  const enc = vault.encryptFields(payload.credentials || {}, fields);
  const conn = {
    id: nextConnId(),
    platform: payload.platform,
    nickname: payload.nickname || '',
    enc,
    cursors: {},
    enabled: true,
    status: 'new',
    shop_name: '', shop_domain: '', currency: '', plan: '',
    last_sync: '', last_error: '', last_counts: null, last_attempt: 0,
    logs: [],
  };
  data.connections.push(conn);
  save();
  return conn;
}

async function addConnection(payload) {
  if (payload.language) data.settings.lang = payload.language;
  const conn = createRecord(payload);
  const res = await runTest(conn);
  if (res.ok) {
    conn.shop_name = res.shop_name;
    conn.shop_domain = res.shop_domain;
    conn.currency = res.currency;
    conn.plan = res.plan;
    conn.status = 'ok';
    addLog(conn, 'info', conn.shop_name);
    save();
    beginSync(conn.id);
  } else {
    conn.status = 'error';
    conn.last_error = res.error;
    addLog(conn, 'error', res.error);
    save();
  }
  return publicConn(conn);
}

async function runTest(conn) {
  const adapter = ADAPTERS[conn.platform];
  const creds = decryptCreds(conn);
  const ctx = buildCtx(adapter, creds, conn);
  ctx.shopCurrency = conn.currency || '';
  return adapter.test(creds, ctx);
}

// ── 同步 ──
function mergeFields(existing, incoming, coll) {
  const out = Object.assign({}, incoming);
  if (coll === 'orders' && ['shipped', 'completed'].includes(existing.status)) {
    out.status = existing.status;
    if (existing.warehouse) out.warehouse = existing.warehouse;
    if (existing.shipping_company) out.shipping_company = existing.shipping_company;
    if (existing.shipping_no) out.shipping_no = existing.shipping_no;
  }
  return out;
}

function applyRecord(conn, rec, counts) {
  if (rec._coll === '_inventory') {
    const target = storeListFind('listings', (l) =>
      l.conn_id === conn.id && l.platform_inventory_item_id === rec.platform_inventory_item_id);
    if (target) {
      storeUpdate('listings', target.id, { platform_available: rec.platform_available });
      counts.updated += 1;
    } else counts.skipped += 1;
    return;
  }
  const coll = rec._coll;
  const body = Object.assign({}, rec);
  delete body._coll;
  body.conn_id = conn.id;
  const existing = storeListFind(coll, (r) => r.ext_key === rec.ext_key);
  if (existing) {
    storeUpdate(coll, existing.id, mergeFields(existing, body, coll));
    counts.updated += 1;
  } else {
    storeInsert(coll, body);
    counts.created += 1;
  }
}

// 通过 store 模块操作（延迟引入，避免初始化顺序问题）
let storeMod = null;
function storeModule() {
  if (!storeMod) storeMod = require('../store');
  return storeMod;
}
function storeListFind(coll, fn) { return storeModule().list(coll).find(fn); }
function storeUpdate(coll, id, fields) { return storeModule().update(coll, id, fields); }
function storeInsert(coll, rec) { return storeModule().insert(coll, rec); }

async function syncConnection(id) {
  const conn = get(id);
  if (!conn) throw new Error('连接不存在');
  if (conn._syncing) return { skipped: true };
  conn._syncing = true;
  conn.status = 'syncing';
  const counts = { created: 0, updated: 0, skipped: 0, failed: 0 };
  try {
    const adapter = ADAPTERS[conn.platform];
    const creds = decryptCreds(conn);
    const ctx = buildCtx(adapter, creds, conn);
    ctx.shopCurrency = conn.currency || '';
    for (const resource of adapter.META.resources) {
      const cursor = conn.cursors[resource] || '';
      const r = await adapter.fetchResource(creds, resource, cursor, ctx);
      for (const rec of r.records) {
        try { applyRecord(conn, rec, counts); }
        catch { counts.failed += 1; }
      }
      if (r.nextCursor) conn.cursors[resource] = r.nextCursor;
      save();
    }
    conn.status = 'ok';
    conn.last_sync = nowStr();
    conn.last_error = '';
    conn.last_counts = counts;
    addLog(conn, 'info', `${t('sync_done')}（+${counts.created} / ~${counts.updated}）`);
  } catch (e) {
    conn.status = 'error';
    conn.last_error = String(e.message || e);
    addLog(conn, 'error', conn.last_error);
  } finally {
    conn._syncing = false;
    conn.last_attempt = Date.now();
    save();
  }
  return counts;
}
function beginSync(id) {
  Promise.resolve().then(() => syncConnection(id)).catch(() => {});
}

// 从店铺商品建立内部商品档案
function ensureProducts(id) {
  const conn = get(id);
  if (!conn) throw new Error('连接不存在');
  const store = storeModule();
  const used = new Set(store.list('products').map((p) => p.sku));
  let n = 0;
  const genSku = () => {
    let sku = '';
    do { sku = 'IM' + String(Date.now()).slice(-7) + String(n); } while (used.has(sku));
    return sku;
  };
  for (const l of store.list('listings').filter((x) => x.conn_id === id && !x.sku)) {
    let sku = String(l.platform_sku || '').trim();
    if (!sku || used.has(sku)) sku = genSku();
    store.insert('products', { sku, name: l.title || '未命名商品', cost: 0, safety_stock: 10 });
    used.add(sku);
    store.update('listings', l.id, { sku });
    n += 1;
  }
  addLog(conn, 'info', `${t('products_built')} ${n}`);
  save();
  return { created: n };
}

function removeConnection(id, deleteData) {
  const i = data.connections.findIndex((c) => c.id === id);
  if (i < 0) return { ok: false };
  if (deleteData) {
    const store = storeModule();
    for (const l of store.list('listings').filter((x) => x.conn_id === id)) store.remove('listings', l.id);
    for (const o of store.list('orders').filter((x) => x.conn_id === id)) store.remove('orders', o.id);
  }
  data.connections.splice(i, 1);
  save();
  return { ok: true };
}

function setEnabled(id, enabled) {
  const conn = get(id);
  if (conn) { conn.enabled = !!enabled; save(); }
  return publicConn(conn);
}
function updateSettings(patch) {
  if (typeof patch.auto_sync === 'boolean') data.settings.auto_sync = patch.auto_sync;
  if (Number(patch.interval_seconds) >= 1) data.settings.interval_seconds = Number(patch.interval_seconds);
  if (patch.language) data.settings.lang = patch.language;
  save();
  return data.settings;
}

// ── 调度 ──
let timer = null;
function startScheduler() {
  stopScheduler();
  timer = setInterval(tick, 15000);
  if (timer.unref) timer.unref();
}
function stopScheduler() {
  if (timer) { clearInterval(timer); timer = null; }
}
function tick() {
  if (!data.settings.auto_sync) return;
  const interval = (Number(data.settings.interval_seconds) || 60) * 1000;
  const now = Date.now();
  for (const conn of data.connections) {
    if (!conn.enabled || conn._syncing) continue;
    if (now - (conn.last_attempt || 0) >= interval) {
      beginSync(conn.id);
    }
  }
}

// ── 对外视图 ──
function publicConn(conn) {
  return {
    id: conn.id,
    platform: conn.platform,
    nickname: conn.nickname,
    enabled: conn.enabled,
    status: conn._syncing ? 'syncing' : conn.status,
    shop_name: conn.shop_name, shop_domain: conn.shop_domain,
    currency: conn.currency, plan: conn.plan,
    last_sync: conn.last_sync, last_error: conn.last_error,
    last_counts: conn.last_counts,
    logs: conn.logs.slice(0, 20),
  };
}
function state() {
  const catalog = CATALOG.map((entry) => {
    const adapter = ADAPTERS[entry.id];
    if (!adapter) return entry;
    return Object.assign({}, entry, {
      connect: adapter.META.status || entry.connect,
      credentialFields: adapter.META.credentialFields,
      resources: adapter.META.resources,
      official: adapter.META.official,
    });
  });
  return {
    settings: data.settings,
    connections: data.connections.map(publicConn),
    catalog,
  };
}

module.exports = {
  init, state,
  testCredentials, addConnection, removeConnection,
  syncConnection, beginSync, ensureProducts,
  setEnabled, updateSettings,
};
