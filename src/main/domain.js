// 电商领域服务：把商品、库存、单据、资金、客户与预警真正联动起来 · 灵感引擎工坊 · bin1732
const fs = require('fs');
const path = require('path');
const store = require('./store');

let defaultFees = { platforms: {} };
let dataDir = null;

const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const pad = (n) => String(n).padStart(2, '0');

function parseTs(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) { const d = new Date(s); return isNaN(d) ? null : d; }
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}
function dayKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function monthKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

// 平台机器 ID → 本地化名（后端文案使用）
const PLATFORM_NAME = {
  taobao: { zh: '淘宝', en: 'Taobao' }, tmall: { zh: '天猫', en: 'Tmall' },
  jd: { zh: '京东', en: 'JD.com' }, pdd: { zh: '拼多多', en: 'Pinduoduo' },
  douyin: { zh: '抖音电商', en: 'Douyin E-commerce' }, kuaishou: { zh: '快手电商', en: 'Kuaishou E-commerce' },
  xiaohongshu: { zh: '小红书', en: 'Xiaohongshu' }, amazon: { zh: '亚马逊', en: 'Amazon' },
  shopee: { zh: '虾皮', en: 'Shopee' }, tiktokshop: { zh: 'TikTok Shop', en: 'TikTok Shop' },
  shopify: { zh: 'Shopify', en: 'Shopify' }, ebay: { zh: 'eBay', en: 'eBay' },
  aliexpress: { zh: '速卖通', en: 'AliExpress' }, lazada: { zh: '来赞达', en: 'Lazada' },
};
function platformName(id, lang) {
  const p = PLATFORM_NAME[id];
  if (p) return lang === 'en' ? p.en : p.zh;
  return id == null ? '' : String(id);
}

// ---------------- 初始化与迁移 ----------------
function init(dir) {
  dataDir = dir;
  try {
    defaultFees = JSON.parse(fs.readFileSync(path.join(dir, 'fees.json'), 'utf-8'));
  } catch { defaultFees = { platforms: {} }; }
  const raw = store.raw();
  if (!raw._feeOverrides) raw._feeOverrides = {};
  ensureWarehouses();
  ensureProductFields();
  migrateOpeningStock();
}

function ensureWarehouses() {
  if (store.list('warehouses').length) return;
  store.insert('warehouses', { name: '默认仓', code: 'WH01', is_default: true, address: '', notes: '' });
}
function defaultWarehouse() {
  const all = store.list('warehouses');
  return (all.find((w) => w.is_default) || all[0] || { name: '默认仓' }).name;
}

function ensureProductFields() {
  for (const p of store.list('products')) {
    const patch = {};
    if (!p.sku) { patch.sku = `SP${String(1000 + p.id).slice(-4)}`; }
    if (!('safety_stock' in p)) patch.safety_stock = 10;
    if (!('cost' in p)) patch.cost = 0;
    if (Object.keys(patch).length) store.update('products', p.id, patch);
  }
}

// 旧版“库存表”一次性迁移为期初库存（仅当流水为空）
function migrateOpeningStock() {
  if (store.list('stock_ledger').length) return;
  for (const inv of store.list('inventory')) {
    const sku = inv.sku || (findProductByName(inv.product_name) || {}).sku;
    const wh = inv.warehouse || defaultWarehouse();
    const qty = Number(inv.stock_qty) || 0;
    if (sku && qty > 0 && store.getStock(sku, wh) === 0) {
      store.applyStockMovement({ sku, warehouse: wh, qty, movement_type: 'adjust', ref_type: 'opening', reason: '期初库存' });
    }
  }
}

// ---------------- 费率（默认值 + 用户覆盖，覆盖随 store 持久化） ----------------
function getFees(platform) {
  const base = (defaultFees.platforms && defaultFees.platforms[platform]) || {
    currency: '', referral_pct: 0, payment_pct: 0, referral_range: '', payment_range: '', fulfillment_note: '', official: '',
  };
  const over = store.raw()._feeOverrides[platform] || {};
  return Object.assign({}, base, over);
}
function feesMeta() {
  return { updated: defaultFees.updated, note: defaultFees.currency_note };
}
function allFees() {
  const platforms = {};
  for (const key of Object.keys(defaultFees.platforms || {})) platforms[key] = getFees(key);
  return { meta: feesMeta(), platforms };
}
function setPlatformFees(platform, fields) {
  const raw = store.raw();
  raw._feeOverrides[platform] = Object.assign({}, raw._feeOverrides[platform], fields);
  return getFees(platform);
}
function resetPlatformFees(platform) { delete store.raw()._feeOverrides[platform]; return getFees(platform); }

// ---------------- 新手入行引导（来自 guides.json） ----------------
let guidesCache = null;
function loadGuides() {
  if (guidesCache) return guidesCache;
  try {
    guidesCache = JSON.parse(fs.readFileSync(path.join(dataDir, 'guides.json'), 'utf-8'));
  } catch { guidesCache = { domestic: { steps: [] }, crossborder: { steps: [] } }; }
  return guidesCache;
}
// 返回入行步骤；firstOnly=true 时只给准备阶段
function onboardingSteps(track, lang, firstOnly) {
  const g = loadGuides();
  const section = track === 'crossborder' ? g.crossborder : g.domestic;
  let steps = (section && section.steps || []).slice().sort((a, b) => a.order - b.order);
  if (firstOnly) steps = steps.filter((s) => s.phase === (lang === 'en' ? 'Preparation' : '准备阶段'));
  return steps.map((s) => ({
    phase: lang === 'en' ? s.phase_en : s.phase,
    title: lang === 'en' ? s.title_en : s.title_zh,
    details: (lang === 'en' ? s.details_en : s.details_zh) || [],
  }));
}

// 重置全部业务数据（含库存结存、流水与预警），保留仓库设置
function resetDemo() {
  const raw = store.raw();
  for (const c of ['products', 'listings', 'orders', 'purchases', 'aftersales', 'suppliers',
    'transfers', 'expenses', 'inventory', 'history', 'stock_ledger', 'alerts']) raw[c] = [];
  raw._stock = {};
  ensureWarehouses();
}

// ---------------- 商品与店铺商品 ----------------
function getProductBySku(sku) {
  return store.list('products').find((p) => p.sku === sku) || null;
}
function findProductByName(name) {
  const q = String(name || '').trim().toLowerCase();
  if (!q) return null;
  const all = store.list('products');
  return all.find((p) => String(p.name).trim().toLowerCase() === q)
    || all.find((p) => String(p.name).toLowerCase().includes(q))
    || all.find((p) => q.includes(String(p.name).toLowerCase())) || null;
}
function createProduct(b) {
  if (!b.name) throw new Error('请填写商品名称');
  const rec = Object.assign({
    sku: b.sku || `SP${String(Date.now()).slice(-6)}`, category: '', brand: '', barcode: '',
    cost: Number(b.cost) || 0, price: Number(b.price) || 0, weight_g: Number(b.weight_g) || 0,
    safety_stock: Number(b.safety_stock) || 10, status: 'active', notes: b.notes || '',
  }, b);
  if (getProductBySku(rec.sku)) throw new Error('该 SKU 已存在');
  return store.insert('products', rec);
}
function listingsForSku(sku) { return store.list('listings').filter((l) => l.sku === sku); }
function createListing(b) {
  if (!b.platform || !b.sku) throw new Error('请选择平台并关联内部商品');
  if (!getProductBySku(b.sku)) throw new Error('关联的内部商品不存在，请先在商品库添加');
  const rec = Object.assign({
    shop: b.shop || '默认店铺', platform_product_id: b.platform_product_id || '',
    platform_sku: b.platform_sku || b.sku, title: b.title || '', listing_price: Number(b.listing_price) || 0,
    currency: b.currency || '', url: b.url || '', status: 'active',
  }, b);
  return store.insert('listings', rec);
}

// 订单行 → 内部 SKU
function resolveOrderSku(line) {
  if (line.sku && getProductBySku(line.sku)) return { sku: line.sku, match: 'exact' };
  const listings = store.list('listings');
  let l = null;
  if (line.platform_sku) {
    l = listings.find((x) => x.platform_sku === line.platform_sku && (!line.platform || x.platform === line.platform))
      || listings.find((x) => x.platform_sku === line.platform_sku);
  }
  if (!l && line.platform_product_id) {
    l = listings.find((x) => x.platform_product_id === line.platform_product_id);
  }
  if (l) return { sku: l.sku, match: 'listing' };
  const p = findProductByName(line.product_name);
  if (p) return { sku: p.sku, match: 'name' };
  return { sku: null, match: 'none' };
}

// ---------------- 仓库与库存视图 ----------------
function stockTable() {
  const rows = store.allStock().map((s) => {
    const p = getProductBySku(s.sku);
    const safety = p ? Number(p.safety_stock) || 0 : 0;
    return {
      sku: s.sku, product_name: p ? p.name : s.sku, warehouse: s.warehouse,
      qty: s.qty, safety_stock: safety,
      status: s.qty <= 0 ? 'stockout' : (s.qty <= safety ? 'low' : 'ok'),
    };
  });
  return rows.sort((a, b) => a.qty - b.qty);
}
function stockForSku(sku) {
  return store.allStock().filter((s) => s.sku === sku);
}
function lowStockList() {
  return stockTable().filter((r) => r.status !== 'ok');
}
// 由流水重算结存并与当前结存核对
function verifyStock() {
  const calc = {};
  for (const e of store.list('stock_ledger').slice().sort((a, b) => a.id - b.id)) {
    const k = store.stockKey(e.sku, e.warehouse);
    const sign = e.direction === 'in' ? 1 : -1;
    calc[k] = (calc[k] || 0) + sign * e.qty;
  }
  const diffs = [];
  const keys = new Set([...Object.keys(calc), ...Object.keys(store.raw()._stock)]);
  for (const k of keys) {
    const a = calc[k] || 0, b = store.raw()._stock[k] || 0;
    if (a !== b) { const [sku, wh] = k.split('||'); diffs.push({ sku, warehouse: wh, from_ledger: a, current: b }); }
  }
  return { ok: diffs.length === 0, diffs };
}

// ---------------- 调拨 ----------------
function createTransfer(b) {
  if (!b.sku || !b.from_warehouse || !b.to_warehouse) throw new Error('请填写商品、调出仓与调入仓');
  if (b.from_warehouse === b.to_warehouse) throw new Error('调出仓和调入仓不能相同');
  const qty = Number(b.qty) || 0;
  if (qty <= 0) throw new Error('调拨数量需大于0');
  return store.insert('transfers', {
    transfer_no: `TR${Date.now()}`, sku: b.sku, from_warehouse: b.from_warehouse,
    to_warehouse: b.to_warehouse, qty, status: 'draft', notes: b.notes || '',
  });
}
function shipTransfer(id) {
  const t = store.list('transfers').find((x) => x.id === id);
  if (!t) throw new Error('调拨单不存在');
  if (t.status !== 'draft') throw new Error('该调拨单已发出');
  store.applyStockMovement({ sku: t.sku, warehouse: t.from_warehouse, qty: -t.qty, movement_type: 'transfer_out', ref_type: 'transfer', ref_no: t.transfer_no });
  store.update('transfers', id, { status: 'in_transit', shipped_at: store.now() });
  return t;
}
function receiveTransfer(id) {
  const t = store.list('transfers').find((x) => x.id === id);
  if (!t) throw new Error('调拨单不存在');
  if (t.status !== 'in_transit') throw new Error('该调拨单尚未发出');
  store.applyStockMovement({ sku: t.sku, warehouse: t.to_warehouse, qty: t.qty, movement_type: 'transfer_in', ref_type: 'transfer', ref_no: t.transfer_no });
  store.update('transfers', id, { status: 'done', received_at: store.now() });
  return t;
}

// ---------------- 订单状态机 ----------------
const PRE_SHIP = ['pending', 'paid', 'confirmed'];
function confirmOrder(id) {
  const o = store.list('orders').find((x) => x.id === id);
  if (!o) throw new Error('订单不存在');
  if (!PRE_SHIP.includes(o.status)) throw new Error('当前状态不能审核');
  store.update('orders', id, { status: 'confirmed' });
  return o;
}
function shipOrder(id, b) {
  const o = store.list('orders').find((x) => x.id === id);
  if (!o) throw new Error('订单不存在');
  if (!PRE_SHIP.includes(o.status)) throw new Error('该订单已处理或已取消');
  const res = resolveOrderSku(o);
  if (!res.sku) throw new Error('未能匹配内部商品：请先在商品库添加商品，或在店铺商品中建立关联');
  const wh = (b && b.warehouse) || o.warehouse || defaultWarehouse();
  const qty = Number(o.qty) || 1;
  store.applyStockMovement({ sku: res.sku, warehouse: wh, qty: -qty, movement_type: 'sale_out', ref_type: 'order', ref_no: o.order_no });
  store.update('orders', id, {
    sku: res.sku, status: 'shipped', warehouse: wh,
    shipping_company: (b && b.shipping_company) || o.shipping_company || '',
    shipping_no: (b && b.shipping_no) || o.shipping_no || '',
    shipped_at: store.now(),
  });
  return o;
}
function completeOrder(id) {
  const o = store.list('orders').find((x) => x.id === id);
  if (!o || o.status !== 'shipped') throw new Error('仅已发货订单可标记完成');
  store.update('orders', id, { status: 'completed' });
  return o;
}
function cancelOrder(id) {
  const o = store.list('orders').find((x) => x.id === id);
  if (!o) throw new Error('订单不存在');
  if (['shipped', 'completed'].includes(o.status)) throw new Error('已发货订单不能直接取消，请走售后');
  store.update('orders', id, { status: 'cancelled' });
  return o;
}

// ---------------- 采购状态机 ----------------
function confirmPurchase(id) {
  const p = store.list('purchases').find((x) => x.id === id);
  if (!p) throw new Error('采购单不存在');
  if (p.status !== 'draft') throw new Error('该采购单已确认');
  store.update('purchases', id, { status: 'ordered', ordered_at: store.now() });
  return p;
}
function receivePurchase(id, b) {
  const p = store.list('purchases').find((x) => x.id === id);
  if (!p) throw new Error('采购单不存在');
  if (!['ordered', 'partially_received'].includes(p.status)) throw new Error('请先确认采购单再收货');
  const ordered = Number(p.qty) || 0;
  const got = Number(p.received_qty) || 0;
  const remain = ordered - got;
  const qty = b && b.qty != null ? Number(b.qty) : remain;
  if (!(qty > 0) || qty > remain) throw new Error('本次收货数量超出未收货数量');
  const sku = p.sku || (findProductByName(p.product_name) || {}).sku;
  if (!sku) throw new Error('未能匹配内部商品，请先在商品库添加');
  const wh = (b && b.warehouse) || defaultWarehouse();
  store.applyStockMovement({ sku, warehouse: wh, qty, movement_type: 'purchase_in', ref_type: 'purchase', ref_no: p.po_no });
  const nowGot = got + qty;
  store.update('purchases', id, {
    sku, received_qty: nowGot, warehouse: wh,
    status: nowGot >= ordered ? 'received' : 'partially_received', received_at: store.now(),
  });
  return p;
}

// ---------------- 售后处理 ----------------
function processAftersale(id, b) {
  const a = store.list('aftersales').find((x) => x.id === id);
  if (!a) throw new Error('售后单不存在');
  if (a.status === 'resolved') throw new Error('该售后单已处理');
  const resolution = b.resolution || a.resolution || 'return_refund';
  const order = store.list('orders').find((o) => o.order_no === a.order_no);
  const line = { sku: a.sku, product_name: a.product_name || (order || {}).product_name, platform: a.platform, platform_sku: a.platform_sku };
  const res = resolveOrderSku(line);
  const sku = b.new_sku || res.sku;
  const wh = (b && b.warehouse) || (order && order.warehouse) || defaultWarehouse();
  const qty = Number(a.qty || (order && order.qty) || 1);
  const condition = b.item_condition === 'defective' ? 'defective' : 'good';
  if (b.action === 'reject') { store.update('aftersales', id, { status: 'rejected' }); return a; }
  if (!sku && resolution !== 'refund_only') throw new Error('未能匹配内部商品，请先在商品库添加');

  // 超量保护：累计售后数量不得超过订单数量；累计退款不得超过订单已付金额
  const oq = Number((order && order.qty) || qty);
  const oa = Number((order && (order.total_amount != null ? order.total_amount : order.unit_price * order.qty)) || (a.amount || 0));
  const others = store.list('aftersales').filter((x) => x.order_no === a.order_no && x.id !== id && x.status !== 'rejected');
  const unitResolutions = ['return_refund', 'reship', 'exchange'];
  let usedUnits = 0, committedAmount = 0;
  for (const x of others) {
    if (unitResolutions.includes(x.resolution)) usedUnits += Number(x.qty || 1);
    committedAmount += Number(x.amount || 0);
  }
  if (unitResolutions.includes(resolution) && usedUnits + qty > oq + 1e-6) {
    throw new Error('售后数量超出该订单的购买数量');
  }
  const thisAmount = ['refund_only', 'return_refund'].includes(resolution) ? Number(a.amount || 0) : 0;
  if (committedAmount + thisAmount > oa + 0.01) {
    throw new Error('退款金额超出该订单的已付金额');
  }

  if (resolution === 'return_refund') {
    store.applyStockMovement({ sku, warehouse: wh, qty, movement_type: 'return_in', ref_type: 'aftersale', ref_no: a.order_no });
    if (condition === 'defective') {
      store.applyStockMovement({ sku, warehouse: wh, qty: -qty, movement_type: 'defect_writeoff', ref_type: 'aftersale', ref_no: a.order_no, reason: '退货残次品核销' });
    }
  } else if (resolution === 'reship') {
    store.applyStockMovement({ sku, warehouse: wh, qty: -qty, movement_type: 'reship_out', ref_type: 'aftersale', ref_no: a.order_no });
  } else if (resolution === 'exchange') {
    store.applyStockMovement({ sku: res.sku, warehouse: wh, qty, movement_type: 'return_in', ref_type: 'aftersale', ref_no: a.order_no });
    if (condition === 'defective') {
      store.applyStockMovement({ sku: res.sku, warehouse: wh, qty: -qty, movement_type: 'defect_writeoff', ref_type: 'aftersale', ref_no: a.order_no, reason: '换货旧件残次核销' });
    }
    store.applyStockMovement({ sku, warehouse: wh, qty: -qty, movement_type: 'reship_out', ref_type: 'aftersale', ref_no: a.order_no });
  }

  // 退款是否需要实际执行：退款类售后先记“待退款”，补发无退款
  let refundStatus = 'none';
  if (['refund_only', 'return_refund'].includes(resolution)) refundStatus = 'pending';
  else if (resolution === 'exchange' && Number(a.amount || 0) > 0) refundStatus = 'pending';

  store.update('aftersales', id, {
    sku, resolution, warehouse: wh, item_condition: ['return_refund', 'exchange'].includes(resolution) ? condition : 'good',
    refund_status: refundStatus, status: 'resolved', resolved_at: store.now(),
  });
  return a;
}

// 登记退款实际执行结果（审批与资金动作分离）
function markRefundIssued(id, b) {
  const a = store.list('aftersales').find((x) => x.id === id);
  if (!a) throw new Error('售后单不存在');
  if (a.status !== 'resolved') throw new Error('请先处理该售后单');
  if (a.refund_status === 'none') throw new Error('该售后单无需退款');
  const amount = Number((b && b.amount) != null ? b.amount : a.amount) || 0;
  const order = store.list('orders').find((o) => o.order_no === a.order_no);
  const oa = Number((order && (order.total_amount != null ? order.total_amount : order.unit_price * order.qty)) || amount);
  if (amount - oa > 0.01) throw new Error('退款金额超出该订单的已付金额');
  store.update('aftersales', id, {
    refund_status: 'issued', refund_issued_at: store.now(), refund_amount_actual: amount,
  });
  return a;
}

// ---------------- 费用 ----------------
function createExpense(b) {
  if (!b.category || !(Number(b.amount) > 0)) throw new Error('请填写费用类别与金额');
  return store.insert('expenses', {
    occurred_on: b.occurred_on || dayKey(new Date()), category: b.category,
    amount: Number(b.amount), platform: b.platform || '', order_no: b.order_no || '', note: b.note || '',
  });
}

// ---------------- 逐单真实损益 ----------------
const EXP_CATS = ['advertising', 'shipping', 'storage', 'software', 'service', 'other'];
function orderPnl(o, ctx) {
  const fees = getFees(o.platform);
  const sku = (resolveOrderSku(o)).sku;
  const product = sku ? getProductBySku(sku) : null;
  const qty = Number(o.qty) || 1;
  const revenue = r2(Number(o.total_amount) != null ? o.total_amount : (Number(o.unit_price) || 0) * qty);
  const cogs = product ? r2(qty * (Number(product.cost) || 0)) : null;
  const referral = r2(revenue * (Number(fees.referral_pct) || 0) / 100);
  const payment = r2(revenue * (Number(fees.payment_pct) || 0) / 100);
  const notes = [];
  if (cogs === null) notes.push('未匹配商品，缺少采购成本');
  // 直接关联该订单的费用
  const direct = ctx.direct[o.order_no] || {};
  let fulfillment = Number(o.fulfillment_cost) || direct.shipping || 0;
  // 平台+月份费用池，按销售额分摊
  const mk = monthKey(parseTs(o.created_at) || new Date());
  const pool = ctx.pools[`${o.platform}|${mk}`];
  let ad = direct.advertising || 0;
  let other = (direct.storage || 0) + (direct.software || 0) + (direct.service || 0) + (direct.other || 0);
  if (pool) {
    const share = pool.base > 0 ? revenue / pool.base : 0;
    if (!fulfillment) fulfillment = r2((pool.shipping || 0) * share);
    if (!ad) ad = r2((pool.advertising || 0) * share);
    other += r2(((pool.storage || 0) + (pool.software || 0) + (pool.service || 0) + (pool.other || 0)) * share);
  }
  // 退款
  const af = ctx.aftersales[o.order_no] || { amount: 0, returned_qty: 0 };
  const refundAmount = r2(af.amount || 0);
  const returnedCogs = cogs != null ? r2((af.returned_qty || 0) * (Number(product.cost) || 0)) : 0;
  const totalCost = (cogs || 0) + referral + payment + fulfillment + ad + other + refundAmount - returnedCogs;
  const net = r2(revenue - totalCost);
  if (!fulfillment) notes.push('未记录物流/履约费用');
  return {
    order_no: o.order_no, platform: o.platform, sku, product_name: product ? product.name : o.product_name,
    created_at: o.created_at, month: mk, revenue, cogs, referral, payment, fulfillment,
    ad, other, refund_amount: refundAmount, returned_cogs: returnedCogs, net,
    net_pct: revenue ? r2(net / revenue * 100) : 0, currency: fees.currency, notes,
  };
}

function buildPnlContext(orders) {
  const direct = {}, pools = {}, aftersales = {};
  const valid = new Set(orders.map((o) => o.order_no));
  for (const e of store.list('expenses')) {
    if (e.order_no && valid.has(e.order_no)) {
      direct[e.order_no] = direct[e.order_no] || {};
      direct[e.order_no][e.category] = (direct[e.order_no][e.category] || 0) + (Number(e.amount) || 0);
    } else {
      const d = parseTs(`${e.occurred_on} 00:00:00`) || new Date();
      const k = `${e.platform || ''}|${monthKey(d)}`;
      pools[k] = pools[k] || { base: 0 };
      pools[k][e.category] = (pools[k][e.category] || 0) + (Number(e.amount) || 0);
    }
  }
  for (const o of orders) {
    const mk = monthKey(parseTs(o.created_at) || new Date());
    const k = `${o.platform}|${mk}`;
    pools[k] = pools[k] || { base: 0 };
    pools[k].base += Number(o.total_amount) || 0;
  }
  for (const a of store.list('aftersales')) {
    if (!valid.has(a.order_no) || a.status !== 'resolved') continue;
    const cur = aftersales[a.order_no] || { amount: 0, returned_qty: 0 };
    // 仅当退款实际执行后才计入退款金额
    if (a.refund_status === 'issued') cur.amount += Number(a.refund_amount_actual != null ? a.refund_amount_actual : a.amount) || 0;
    if (['return_refund', 'exchange'].includes(a.resolution)) {
      const order = orders.find((x) => x.order_no === a.order_no);
      cur.returned_qty += Number(a.qty || (order && order.qty) || 1);
    }
    aftersales[a.order_no] = cur;
  }
  return { direct, pools, aftersales };
}

function pnlLines() {
  const orders = store.list('orders').filter((o) => ['shipped', 'completed'].includes(o.status));
  const ctx = buildPnlContext(orders);
  return orders.map((o) => orderPnl(o, ctx));
}
function pnlSummary(groupBy) {
  const lines = pnlLines();
  const groups = {};
  const totals = { revenue: 0, cogs: 0, referral: 0, payment: 0, fulfillment: 0, ad: 0, other: 0, refund_amount: 0, returned_cogs: 0, net: 0, orders: 0 };
  for (const l of lines) {
    let key;
    if (groupBy === 'product') key = l.product_name || l.sku;
    else if (groupBy === 'month') key = l.month;
    else key = l.platform;
    groups[key] = groups[key] || { key, revenue: 0, cogs: 0, fees: 0, ad: 0, fulfillment: 0, other: 0, refund_amount: 0, returned_cogs: 0, net: 0, orders: 0 };
    const g = groups[key];
    g.revenue += l.revenue; g.cogs += l.cogs || 0;
    g.fees += l.referral + l.payment; g.ad += l.ad;
    g.fulfillment += l.fulfillment; g.other += l.other;
    g.refund_amount += l.refund_amount; g.returned_cogs += l.returned_cogs;
    g.net += l.net; g.orders += 1;
    totals.revenue += l.revenue; totals.cogs += l.cogs || 0; totals.referral += l.referral; totals.payment += l.payment;
    totals.fulfillment += l.fulfillment; totals.ad += l.ad; totals.other += l.other;
    totals.refund_amount += l.refund_amount; totals.returned_cogs += l.returned_cogs; totals.net += l.net; totals.orders += 1;
  }
  const rows = Object.values(groups).map((g) => {
    const round = (x) => r2(x);
    return {
      key: g.key, orders: g.orders, revenue: round(g.revenue), cogs: round(g.cogs),
      fees: round(g.fees), ad: round(g.ad), fulfillment: round(g.fulfillment), other: round(g.other),
      refund_amount: round(g.refund_amount), returned_cogs: round(g.returned_cogs),
      net: round(g.net), net_pct: g.revenue ? r2(g.net / g.revenue * 100) : 0,
    };
  }).sort((a, b) => b.net - a.net);
  const t = {
    orders: totals.orders, revenue: r2(totals.revenue), cogs: r2(totals.cogs),
    referral: r2(totals.referral), payment: r2(totals.payment), fulfillment: r2(totals.fulfillment),
    ad: r2(totals.ad), other: r2(totals.other), refund_amount: r2(totals.refund_amount),
    returned_cogs: r2(totals.returned_cogs), net: r2(totals.net),
    net_pct: totals.revenue ? r2(totals.net / totals.revenue * 100) : 0,
  };
  return { rows, totals: t };
}

// ---------------- 平台结算对账 ----------------
function reconcile(rows) {
  const local = {};
  for (const o of store.list('orders')) {
    local[o.order_no] = o;
  }
  const out = [];
  for (const r of rows) {
    const o = local[r.order_no];
    if (!o) { out.push({ order_no: r.order_no, status: 'missing_local', settlement: r.settlement_amount }); continue; }
    const fees = getFees(o.platform);
    const revenue = Number(o.total_amount) || 0;
    const expected = r2(revenue - revenue * ((Number(fees.referral_pct) + Number(fees.payment_pct)) / 100));
    const diff = r2((Number(r.settlement_amount) || 0) - expected);
    out.push({
      order_no: r.order_no, expected, settlement: Number(r.settlement_amount) || 0, diff,
      status: Math.abs(diff) <= 1 ? 'matched' : 'diff',
    });
  }
  const settled = new Set(rows.map((r) => r.order_no));
  for (const no of Object.keys(local)) {
    if (!settled.has(no) && ['shipped', 'completed'].includes(local[no].status)) {
      out.push({ order_no: no, status: 'missing_settlement', settlement: null });
    }
  }
  const summary = {
    matched: out.filter((x) => x.status === 'matched').length,
    diff: out.filter((x) => x.status === 'diff').length,
    missing_local: out.filter((x) => x.status === 'missing_local').length,
    missing_settlement: out.filter((x) => x.status === 'missing_settlement').length,
  };
  return { rows: out, summary };
}

// ---------------- 客户 / RFM / LTV / cohort ----------------
function buildCustomers() {
  const map = {};
  for (const o of store.list('orders')) {
    if (o.status === 'cancelled' || !o.buyer) continue;
    const k = `${o.platform}|${o.buyer}`;
    const d = parseTs(o.created_at) || new Date();
    const c = map[k] || { platform: o.platform, buyer: o.buyer, orders: 0, spend: 0, first: d, last: d };
    c.orders += 1; c.spend += Number(o.total_amount) || 0;
    if (d < c.first) c.first = d; if (d > c.last) c.last = d;
    map[k] = c;
  }
  const list = Object.values(map);
  const today = new Date();
  const score = (vals, value, higher) => {
    const s = [...vals].sort((a, b) => a - b);
    const rank = higher ? s.filter((x) => x <= value).length : s.filter((x) => x >= value).length;
    return Math.max(1, Math.min(5, Math.ceil(rank / Math.max(1, s.length) * 5)));
  };
  const recVals = list.map((c) => daysBetween(c.last, today));
  const freqVals = list.map((c) => c.orders);
  const monVals = list.map((c) => c.spend);
  const segments = {
    '555': '重要价值客户', '515': '重要发展客户', '525': '重要保持客户', '535': '重要挽留客户',
    '155': '一般价值客户', '115': '一般发展客户', '125': '一般保持客户', '135': '一般挽留客户',
  };
  return list.map((c) => {
    const r = score(recVals, daysBetween(c.last, today), false);
    const f = score(freqVals, c.orders, true);
    const m = score(monVals, c.spend, true);
    const rfm = `${r}${f}${m}`;
    return {
      platform: c.platform, buyer: c.buyer, orders: c.orders,
      spend: r2(c.spend), aov: r2(c.spend / c.orders), ltv: r2(c.spend),
      recency_days: daysBetween(c.last, today), first: dayKey(c.first), last: dayKey(c.last),
      rfm, segment: segments[rfm] || '一般客户',
    };
  }).sort((a, b) => b.spend - a.spend);
}

function cohortMatrix() {
  const customers = buildCustomers();
  const cohorts = {};
  for (const c of customers) {
    const cm = c.first.slice(0, 7);
    cohorts[cm] = cohorts[cm] || { cohort: cm, customers: 0, months: {} };
    cohorts[cm].customers += 1;
  }
  // 用订单月份统计各 cohort 在第 N 月活跃数
  for (const o of store.list('orders')) {
    if (o.status === 'cancelled' || !o.buyer) continue;
    const c = customers.find((x) => x.platform === o.platform && x.buyer === o.buyer);
    if (!c) continue;
    const cm = c.first.slice(0, 7);
    const om = (o.created_at || '').slice(0, 7);
    const ci = new Date(cm + '-01'), oi = new Date(om + '-01');
    const idx = (oi.getFullYear() - ci.getFullYear()) * 12 + (oi.getMonth() - ci.getMonth());
    if (idx >= 0) cohorts[cm].months[idx] = (cohorts[cm].months[idx] || 0) + 1;
  }
  return Object.values(cohorts).sort((a, b) => (a.cohort < b.cohort ? 1 : -1));
}

// ---------------- ABC / 滞销 / 需求 ----------------
function productSalesSeries(sku, days) {
  const from = new Date(); from.setDate(from.getDate() - days);
  const map = {};
  for (const o of store.list('orders')) {
    if (!['shipped', 'completed'].includes(o.status)) continue;
    const r = resolveOrderSku(o);
    if (r.sku !== sku) continue;
    const d = parseTs(o.created_at);
    if (d < from) continue;
    const k = dayKey(d);
    map[k] = map[k] || { qty: 0, revenue: 0 };
    map[k].qty += Number(o.qty) || 1; map[k].revenue += Number(o.total_amount) || 0;
  }
  return map;
}
function abcAnalysis(days) {
  const from = new Date(); from.setDate(from.getDate() - days);
  const agg = {};
  for (const o of store.list('orders')) {
    if (!['shipped', 'completed'].includes(o.status)) continue;
    const d = parseTs(o.created_at); if (d < from) continue;
    const r = resolveOrderSku(o); if (!r.sku) continue;
    agg[r.sku] = agg[r.sku] || { qty: 0, revenue: 0 };
    agg[r.sku].qty += Number(o.qty) || 1;
    agg[r.sku].revenue += Number(o.total_amount) || 0;
  }
  const sorted = Object.keys(agg).map((sku) => ({ sku, product_name: (getProductBySku(sku) || { name: sku }).name, ...agg[sku] }))
    .sort((a, b) => b.revenue - a.revenue);
  const total = sorted.reduce((s, x) => s + x.revenue, 0);
  let cum = 0;
  return sorted.map((x) => {
    cum += x.revenue;
    const share = total ? cum / total : 0;
    return { ...x, revenue: r2(x.revenue), cum_pct: r2(share * 100), abc: share <= 0.8 ? 'A' : share <= 0.95 ? 'B' : 'C' };
  });
}
function deadStock(days) {
  const out = [];
  for (const s of store.allStock()) {
    const series = productSalesSeries(s.sku, days);
    const soldQty = Object.values(series).reduce((n, x) => n + x.qty, 0);
    const lastDates = Object.keys(series).sort();
    const p = getProductBySku(s.sku);
    const last = lastDates.length ? parseTs(lastDates[lastDates.length - 1]) : null;
    const idle = last ? daysBetween(last, new Date()) : days;
    if (s.qty > 0 && soldQty === 0) {
      out.push({ sku: s.sku, product_name: p ? p.name : s.sku, warehouse: s.warehouse, qty: s.qty,
        stock_value: r2(s.qty * (p ? Number(p.cost) || 0 : 0)), idle_days: idle, kind: 'dead' });
    }
  }
  return out;
}

// ---------------- 预警 ----------------
function runMonitors(lang) {
  const lng = lang === 'en' ? 'en' : 'zh';
  const created = [];
  const push = (level, type, title, detail, ref) => {
    const prior = store.list('alerts').find((a) => a.type === type && a.ref === ref);
    if (prior) {
      // 同一问题只保留一条：已读但问题仍在则重新激活；已忽略则不再打扰
      if (prior.status === 'read') { const rec = store.update('alerts', prior.id, { status: 'open', level, title, detail: detail || '' }); if (rec) created.push(prior); }
      return;
    }
    const rec = store.insert('alerts', { level, type, title, detail: detail || '', ref: ref || '', status: 'open' });
    created.push(rec);
  };
  for (const r of lowStockList()) {
    push(r.status === 'stockout' ? 'critical' : 'warning', 'low_stock',
      r.status === 'stockout' ? `商品已缺货：${r.product_name}` : `库存偏低：${r.product_name}`,
      `${r.warehouse} 当前${r.qty}件，安全库存${r.safety_stock}件`, `${r.sku}|${r.warehouse}`);
  }
  const today = new Date();
  for (const o of store.list('orders')) {
    if (!PRE_SHIP.includes(o.status)) continue;
    const d = parseTs(o.created_at); const age = daysBetween(d, today);
    if (age >= 2) push('warning', 'ship_timeout', `订单待处理超时：${o.order_no}`, `已等待${age}天，请尽快审核发货`, o.order_no);
  }
  // 各平台退款情况：仅统计已处理且退款实际执行（issued）的金额，与损益口径一致
  const byPl = {};
  for (const a of store.list('aftersales')) {
    byPl[a.platform] = byPl[a.platform] || { orders: new Set(), af: 0 };
    if (a.status === 'resolved' && a.refund_status === 'issued') {
      byPl[a.platform].af += Number(a.refund_amount_actual != null ? a.refund_amount_actual : a.amount) || 0;
    }
  }
  for (const o of store.list('orders')) { (byPl[o.platform] = byPl[o.platform] || { orders: new Set(), af: 0 }).orders.add(o.order_no); }
  for (const pl of Object.keys(byPl)) {
    const n = byPl[pl].orders.size;
    if (n >= 10) {
      const refundRate = byPl[pl].af / Math.max(1, store.list('orders').filter((o) => o.platform === pl).reduce((s, o) => s + (Number(o.total_amount) || 0), 0));
      if (refundRate > 0.1) push('warning', 'high_refund', `${platformName(pl, lng)}退款金额占比偏高`, `近期退款金额占销售额约${r2(refundRate * 100)}%`, pl);
    }
  }
  for (const d of deadStock(60)) {
    push('info', 'dead_stock', `滞销商品：${d.product_name}`, `${d.warehouse} 已${d.idle_days}天无销售，占用资金约${d.stock_value}`, d.sku);
  }
  // 近两日无销售
  const recentSales = store.list('orders').some((o) => {
    const d = parseTs(o.created_at); return d && daysBetween(d, today) <= 2 && o.status !== 'cancelled';
  });
  const hasHistory = store.list('orders').length > 0;
  if (hasHistory && !recentSales) push('info', 'zero_sales', '近两日没有新订单', '可检查流量、价格或推广情况', 'sales');
  return { created: created.length, open: store.list('alerts').filter((a) => a.status === 'open').length };
}
function markAlert(id, status) {
  store.update('alerts', id, { status: status || 'read' });
  return store.list('alerts');
}

// ---------------- 报表 ----------------
function reportSummary(from, to) {
  const fd = parseTs(`${from} 00:00:00`), td = parseTs(`${to} 23:59:59`);
  const orders = store.list('orders').filter((o) => {
    const d = parseTs(o.created_at); return d >= fd && d <= td && o.status !== 'cancelled';
  });
  const revenue = r2(orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0));
  const byProduct = {};
  for (const o of orders) {
    const r = resolveOrderSku(o);
    byProduct[r.sku || o.product_name] = byProduct[r.sku || o.product_name] || { name: o.product_name, qty: 0, revenue: 0 };
    byProduct[r.sku || o.product_name].qty += Number(o.qty) || 1;
    byProduct[r.sku || o.product_name].revenue += Number(o.total_amount) || 0;
  }
  const top = Object.values(byProduct).map((x) => ({ name: x.name, qty: x.qty, revenue: r2(x.revenue) }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  return {
    from, to, orders: orders.length, revenue,
    pending_ship: store.list('orders').filter((o) => PRE_SHIP.includes(o.status)).length,
    open_alerts: store.list('alerts').filter((a) => a.status === 'open').length,
    low_stock: lowStockList().length, top_products: top,
  };
}

module.exports = {
  init, resetDemo, platformName,
  // 商品 / listing
  getProductBySku, findProductByName, createProduct, createListing, listingsForSku, resolveOrderSku,
  // 仓库 / 库存
  defaultWarehouse, stockTable, stockForSku, lowStockList, verifyStock,
  createTransfer, shipTransfer, receiveTransfer,
  // 单据
  confirmOrder, shipOrder, completeOrder, cancelOrder,
  confirmPurchase, receivePurchase, processAftersale, markRefundIssued,
  // 费用 / 资金
  getFees, feesMeta, allFees, setPlatformFees, resetPlatformFees, onboardingSteps, createExpense,
  pnlLines, pnlSummary, reconcile,
  // 客户
  buildCustomers, cohortMatrix,
  // 分析
  productSalesSeries, abcAnalysis, deadStock,
  // 预警 / 报表
  runMonitors, markAlert, reportSummary,
};
