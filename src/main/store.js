// 本地数据存储（JSON 持久化）· 灵感引擎工坊 · bin1732
const fs = require('fs');
const path = require('path');

// 业务集合（统一在此登记，便于初始化、备份与导入导出）
const COLLECTIONS = [
  'products', 'listings', 'warehouses',
  'orders', 'purchases', 'aftersales', 'suppliers',
  'stock_ledger', 'transfers', 'expenses', 'alerts', 'improvements',
  'inventory', 'history',
];

// 仅允许通过专用流程写入、不允许在界面直接编辑或删除的集合
const PROTECTED = ['stock_ledger', 'alerts'];

let storePath = null;
let cache = null;
let seq = 0;

function now() {
  // 时间格式：YYYY-MM-DD HH:MM:SS
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function init(dir) {
  storePath = path.join(dir, 'store.json');
  try {
    cache = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
  } catch {
    cache = {};
  }
  if (!cache || typeof cache !== 'object' || Array.isArray(cache)) cache = {};
  for (const c of COLLECTIONS) {
    if (!Array.isArray(cache[c])) cache[c] = [];
  }
  // 库存结存（内部数据，不开放直接编辑；库存流水为可追溯依据）
  if (!cache._stock || typeof cache._stock !== 'object') cache._stock = {};
  seq = COLLECTIONS.reduce((m, c) => cache[c].reduce((x, r) => Math.max(x, r.id || 0), m), 0);
  persist();
}

function persist() {
  try {
    const tmp = storePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf-8');
    fs.renameSync(tmp, storePath);
  } catch { /* 目录不可写时静默，保证界面可用 */ }
}

function list(coll) {
  return (cache[coll] || []).slice().sort((a, b) => (b.id || 0) - (a.id || 0));
}

function insert(coll, obj) {
  seq += 1;
  const ts = now();
  const rec = Object.assign({ id: seq }, obj);
  if (!('created_at' in rec)) rec.created_at = ts;
  if (coll === 'inventory' && !('updated_at' in rec)) rec.updated_at = ts;
  cache[coll].push(rec);
  persist();
  return rec;
}

function update(coll, id, fields) {
  const rec = (cache[coll] || []).find((r) => r.id === id);
  if (rec) {
    Object.assign(rec, fields);
    if (coll === 'inventory') rec.updated_at = now();
    persist();
  }
  return !!rec;
}

function remove(coll, id) {
  const arr = cache[coll] || [];
  const i = arr.findIndex((r) => r.id === id);
  if (i !== -1) { arr.splice(i, 1); persist(); return true; }
  return false;
}

function clearAll(colls, opts) {
  const force = !!(opts && opts.force);
  for (const c of (colls || COLLECTIONS)) {
    if (PROTECTED.includes(c) && !force) continue;
    cache[c] = [];
  }
  // 清空业务数据时一并重置库存结存
  if (!colls || colls.includes('stock_ledger') || colls.includes('inventory')) {
    cache._stock = {};
    if (!colls) cache.stock_ledger = [];
  }
  persist();
}

// 按库存流水按时间顺序重算全部结存（用于备份恢复后保证账实一致）
function rebuildStockFromLedger() {
  cache._stock = {};
  const rows = (cache.stock_ledger || []).slice().sort((a, b) => (a.id || 0) - (b.id || 0));
  rows.forEach((r) => {
    const key = stockKey(r.sku, r.warehouse);
    const cur = Number.isFinite(cache._stock[key]) ? cache._stock[key] : 0;
    const delta = r.direction === 'out' ? -Number(r.qty) : Number(r.qty);
    cache._stock[key] = cur + delta;
  });
  persist();
}

function raw() { return cache; }

// ---------- 库存结存与流水 ----------
function stockKey(sku, warehouse) {
  return `${String(sku).trim()}||${String(warehouse).trim()}`;
}

function getStock(sku, warehouse) {
  const v = cache._stock[stockKey(sku, warehouse)];
  return Number.isFinite(v) ? v : 0;
}

function allStock() {
  const out = [];
  for (const k of Object.keys(cache._stock)) {
    const [sku, warehouse] = k.split('||');
    out.push({ sku, warehouse, qty: cache._stock[k] });
  }
  return out;
}

// 库存变动的唯一入口：更新结存并写入不可改流水，返回流水记录
function applyStockMovement(mv) {
  const sku = mv.sku == null ? '' : String(mv.sku).trim();
  const warehouse = mv.warehouse == null ? '' : String(mv.warehouse).trim();
  const qtyNum = Number(mv.qty);
  const delta = Number.isFinite(qtyNum) ? qtyNum : 0;
  if (!sku || !warehouse || !delta) throw new Error('库存变动信息不完整');
  const key = stockKey(sku, warehouse);
  const before = Number.isFinite(cache._stock[key]) ? cache._stock[key] : 0;
  const after = before + delta;
  if (after < 0) throw new Error('库存不足，无法完成该操作');
  cache._stock[key] = after;
  seq += 1;
  const rec = {
    id: seq,
    created_at: now(),
    sku,
    warehouse,
    movement_type: mv.movement_type || 'adjust',
    direction: delta > 0 ? 'in' : 'out',
    qty: Math.abs(delta),
    balance_before: before,
    balance_after: after,
    ref_type: mv.ref_type || '',
    ref_no: mv.ref_no || '',
    reason: mv.reason || '',
  };
  cache.stock_ledger.push(rec);
  persist();
  return rec;
}

module.exports = {
  init, list, insert, update, remove, clearAll, raw, now,
  COLLECTIONS, PROTECTED,
  getStock, allStock, applyStockMovement, stockKey, rebuildStockFromLedger,
};
