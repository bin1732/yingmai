// Shopee（虾皮）店铺适配器：用卖家自己的 Partner ID/Key + 店铺授权令牌在本机直连。
// 鉴权 = OAuth2 授权码换 access_token/refresh_token + HMAC-SHA256 业务签名，纯本机、零服务器。
// 灵感引擎工坊 · bin1732

const crypto = require('crypto');

// 环境 × 位置 → API host 矩阵（2026-10-07 实时核验 open.shopee.com/documents/v2 各接口页 + research/shopee-research.md）
// 全球所有站点（SG/MY/TH/TW/VN/ID/PH…）共用 partner.shopeemobile.com，不按站点切 host；
// 店铺所属区域由授权后 get_shop_info 返回的 region 识别。
const HOSTS = {
  production: {
    global: 'https://partner.shopeemobile.com',
    cn: 'https://openplatform.shopee.cn',          // 中国大陆跨境店（CNSC）
    br: 'https://openplatform.shopee.com.br',        // 巴西站
  },
  sandbox: {
    global: 'https://openplatform.sandbox.test-stable.shopee.sg',
    cn: 'https://openplatform.sandbox.test-stable.shopee.cn',
    br: 'https://openplatform.sandbox.test-stable.shopee.sg', // 官方未单列巴西沙箱 host，复用全球沙箱
  },
};

// region 两位码 → 默认币种（ISO 4217；样本 TW/VN/SGD/VND 已核验，其余按站点本币如实映射，未列出留空）
const REGION_CURRENCY = {
  TW: 'TWD', SG: 'SGD', MY: 'MYR', TH: 'THB', VN: 'VND', ID: 'IDR',
  PH: 'PHP', BR: 'BRL', MX: 'MXN',
};

const META = {
  id: 'shopee',
  name: { zh: 'Shopee（虾皮）', en: 'Shopee' },
  category: 'crossborder',
  // 代码就绪、失败路径已对真实端点验证、normalize 用官方示例报文验证；
  // 但生产连接需开发者资料审核（Seller 类 ≤7 个工作日）+ App Go Live（24h 自动过审）后才有 Live Partner 凭证，故定 gated
  status: 'gated',
  authType: 'oauth2-hmac',
  // 官方仅公开 error_rate_limit/error_limit 两类限流错误，未公布具体 QPS；按保守 1s 间隔调用，429/限流由 ctx.request 退避
  requestGapMs: 1000,
  resources: ['products', 'orders', 'inventory'],
  credentialFields: [
    {
      key: 'env', required: true, secret: false,
      label: { zh: '环境', en: 'Environment' },
      placeholder: { zh: 'production / sandbox，默认 production', en: 'production / sandbox, production by default' },
    },
    {
      key: 'location', required: true, secret: false,
      label: { zh: '店铺所在位置', en: 'Shop location' },
      placeholder: { zh: 'global（海外站）/ cn（中国大陆跨境店）/ br（巴西站），决定 API host，默认 global', en: 'global (overseas) / cn (China cross-border) / br (Brazil), selects the API host, global by default' },
    },
    {
      key: 'partnerId', required: true, secret: false,
      label: { zh: 'Partner ID', en: 'Partner ID' },
      placeholder: { zh: '开发者后台 App 的 Partner_id（Test 或 Live）', en: 'Partner_id of your app in the developer console (Test or Live)' },
    },
    {
      key: 'partnerKey', required: true, secret: true,
      label: { zh: 'Partner Key（密钥）', en: 'Partner Key (secret)' },
      placeholder: { zh: 'App 的 Partner Key，仅用于本机签名，不会上传', en: 'App Partner Key, used for local signing only, never uploaded' },
    },
    {
      key: 'shopId', required: true, secret: false,
      label: { zh: 'Shop ID', en: 'Shop ID' },
      placeholder: { zh: '授权回调地址里的 shop_id', en: 'The shop_id from the authorization callback URL' },
    },
    {
      key: 'accessToken', required: false, secret: true,
      label: { zh: 'Access Token（授权后填写）', en: 'Access Token (after authorization)' },
      placeholder: { zh: '用授权码换取的访问令牌；首次可只填到授权步骤，换取后再填回', en: 'Access token exchanged from the authorization code; you may leave this until after the authorization step' },
    },
    {
      key: 'refreshToken', required: false, secret: true,
      label: { zh: 'Refresh Token（授权后填写）', en: 'Refresh Token (after authorization)' },
      placeholder: { zh: '与 Access Token 一起返回的刷新令牌（30 天有效、一次性，盈脉会自动轮换并加密保存新对）', en: 'Refresh token returned with the access token (valid 30 days, one-time; YingMai rotates and re-encrypts the new pair automatically)' },
    },
  ],
  official: {
    docs: 'https://open.shopee.com/documents/v2/v2.shop.get_shop_info?module=92&type=1',
    signup: 'https://open.shopee.com/',
    devapps: 'https://open.shopee.com/developer-guide/14',
  },
  scopes: [
    'v2.shop.get_shop_info',
    'v2.product.get_item_list / get_item_base_info / get_model_list',
    'v2.order.get_order_list / get_order_detail',
  ],
  needs: [
    '需注册 Shopee Open Platform 开发者（Seller In-house System，个人/个体工商户/企业/工作室均可），资料审核 Seller 类 ≤7 个工作日。',
    '创建 Seller In-house App 先拿 Test Partner_id/Key 沙箱联调；生产需 Go Live（提交后约 24h 自动过审）拿 Live Partner_id/Key。',
    '本机无公网回调地址：在 App 回调域名留空的前提下，用 https 占位 redirect 人工从地址栏复制 code+shop_id 即可。',
    'refresh_token 30 天有效且一次性，每次刷新都会换发新对；长期不调用会断开，需保持连接定期同步。',
    '部分接口可能要求在开发者后台申报出口 IP（错误 source_ip_undeclared）；巴西站已关闭 Individual Seller 类型。',
  ],
  regions: ['global', 'cn', 'br'],
};

// ── 内存态：access_token 缓存（绝不落盘；refresh_token 轮换后通过 ctx.persistCredentials 重新加密持久化） ──
const tokenCache = new Map(); // key=partnerId:shopId -> { accessToken, expiresAt }

function envOf(creds) { return String(creds.env || 'production').toLowerCase(); }
function locOf(creds) {
  const l = String(creds.location || 'global').toLowerCase();
  return ['global', 'cn', 'br'].includes(l) ? l : 'global';
}
function apiBase(creds) {
  const e = HOSTS[envOf(creds)] || HOSTS.production;
  return e[locOf(creds)] || e.global;
}
function currencyFor(region) { return REGION_CURRENCY[String(region || '').toUpperCase()] || ''; }

function hmacHex(key, data) {
  return crypto.createHmac('sha256', String(key || '')).update(data, 'utf8').digest('hex');
}
function qs(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== '' && obj[k] != null)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
    .join('&');
}
function nowTs() { return Math.floor(Date.now() / 1000); }

// 鉴权类接口（auth_partner / token/get / access_token/get）签名 base = partner_id + path + timestamp
function signAuth(creds, path, ts) {
  return hmacHex(creds.partnerKey, `${creds.partnerId}${path}${ts}`);
}
// 业务接口签名 base = partner_id + path + timestamp + access_token + shop_id
function signBusiness(creds, path, ts, accessToken) {
  return hmacHex(creds.partnerKey, `${creds.partnerId}${path}${ts}${accessToken}${creds.shopId}`);
}

// 生成 auth_partner 授权链接（供教程/后续界面使用）；redirect 建议填 https 占位地址人工复制 code
function buildAuthUrl(creds, redirect) {
  const path = '/api/v2/shop/auth_partner';
  const ts = nowTs();
  const sign = signAuth(creds, path, ts);
  return `${apiBase(creds)}${path}?${qs({
    partner_id: creds.partnerId,
    redirect: redirect || 'https://www.baidu.com/',
    response_type: 'code',
    timestamp: ts,
    sign,
  })}`;
}

// 裸 POST：用授权码 code 换 access_token + refresh_token（JSON body，query 公共参数+sign）
async function exchangeCode(creds, code) {
  const path = '/api/v2/auth/token/get';
  const ts = nowTs();
  const sign = signAuth(creds, path, ts);
  const url = `${apiBase(creds)}${path}?${qs({ partner_id: creds.partnerId, timestamp: ts, sign })}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: String(code || ''),
      partner_id: Number(creds.partnerId),
      shop_id: Number(creds.shopId),
    }),
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* 非 JSON */ }
  if (!res.ok || !json || json.error) {
    const e = new Error(`shopee_token_${res.status}:${(json && json.error) || ''}`);
    e.status = res.status;
    throw e;
  }
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expireIn: json.expire_in };
}

// 裸 POST：用 refresh_token 换新 access_token + 新 refresh_token（一次性，必须成对替换）
async function refreshTokens(creds) {
  const path = '/api/v2/auth/access_token/get';
  const ts = nowTs();
  const sign = signAuth(creds, path, ts);
  const url = `${apiBase(creds)}${path}?${qs({ partner_id: creds.partnerId, timestamp: ts, sign })}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partner_id: Number(creds.partnerId),
      shop_id: Number(creds.shopId),
      refresh_token: String(creds.refreshToken || ''),
    }),
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* 非 JSON */ }
  if (!res.ok || !json || json.error) {
    const e = new Error(`shopee_refresh_${res.status}:${(json && json.error) || ''}`);
    e.status = res.status;
    throw e;
  }
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expireIn: json.expire_in };
}

function cacheKey(creds) { return `${creds.partnerId}:${creds.shopId}`; }

// 取得有效 access_token；优先内存缓存；无缓存时直接用已持久化的 accessToken（乐观），401 由共享层触发强制刷新
async function getAccessToken(creds, ctx, force) {
  const key = cacheKey(creds);
  const now = Date.now();
  if (!force) {
    const hit = tokenCache.get(key);
    if (hit && hit.accessToken && now < hit.expiresAt) return hit.accessToken;
    if (creds.accessToken && !hit) return String(creds.accessToken);
  }
  if (!creds.refreshToken) throw new Error('missing refresh token');
  const pair = await refreshTokens(creds);
  creds.accessToken = pair.accessToken;
  creds.refreshToken = pair.refreshToken;
  const ttl = Number(pair.expireIn) || 14400;
  tokenCache.set(key, { accessToken: pair.accessToken, expiresAt: now + Math.max(60, ttl - 120) * 1000 });
  // refresh_token 一次性：把新对重新加密持久化（未保存的测试调用为 no-op）
  if (ctx && typeof ctx.persistCredentials === 'function') {
    try { await ctx.persistCredentials({ accessToken: pair.accessToken, refreshToken: pair.refreshToken }); } catch { /* 持久化失败不阻断本次请求 */ }
  }
  return pair.accessToken;
}

// 供共享层 401 时调用：强制用 refresh_token 换新对
async function refreshCredentials(creds, ctx) {
  tokenCache.delete(cacheKey(creds));
  await getAccessToken(creds, ctx, true);
  return {};
}

// 每次业务请求注入 query 公共参数：partner_id/timestamp/sign/access_token/shop_id（sign base=partner_id+path+timestamp+access_token+shop_id）
async function buildInit(creds, url, init, ctx) {
  const accessToken = await getAccessToken(creds, ctx, false);
  const u = new URL(url);
  const path = u.pathname;
  const ts = nowTs();
  const sign = signBusiness(creds, path, ts, accessToken);
  const sep = url.includes('?') ? '&' : '?';
  const fullUrl = url + sep + qs({
    partner_id: creds.partnerId,
    timestamp: ts,
    sign,
    access_token: accessToken,
    shop_id: creds.shopId,
  });
  return Object.assign({}, init, { url: fullUrl });
}

// ── 连接测试 ──
async function test(creds, ctx) {
  const need = ['partnerId', 'partnerKey', 'shopId'];
  if (need.some((k) => !String(creds[k] || '').trim())) {
    return { ok: false, error: ctx.t('conn_cred_required') };
  }
  // 1) 必须已有 access_token（授权后填入）；缺失则提示先完成店铺授权
  if (!String(creds.accessToken || '').trim()) {
    return { ok: false, error: ctx.t('conn_invalid_token') };
  }
  // 2) GET get_shop_info 验证签名与令牌
  const r = await ctx.request(`${apiBase(creds)}/api/v2/shop/get_shop_info`);
  if (r.error) return { ok: false, error: r.error };
  const j = r.json || {};
  if (!j || !j.shop_name) return { ok: false, error: ctx.t('conn_shop_not_found') };
  const region = j.region || '';
  // 店铺状态非 NORMAL（BANNED/FROZEN）如实提示
  const shopName = `${j.shop_name}（${region}）`.trim();
  const out = {
    ok: true,
    shop_name: shopName,
    shop_domain: String(creds.shopId || ''),
    currency: currencyFor(region) || ctx.shopCurrency || '',
    plan: '',
  };
  if (j.status && j.status !== 'NORMAL') out.shop_name = `${shopName}〔${j.status}〕`;
  return out;
}

// ── 订单状态映射（v2 order_status -> 统一五态） ──
// 口径（developer-guide/229 + /31 V2.0 Data Definition，2026-10-07 核验）：
// UNPAID/PENDING->pending；READY_TO_SHIP/RETRY_SHIP->paid；PROCESSED/SHIPPED->shipped；
// TO_CONFIRM_RECEIVE/COMPLETED->completed；IN_CANCEL/CANCELLED/TO_RETURN->cancelled
function orderStatus(os) {
  switch (os) {
    case 'UNPAID':
    case 'PENDING':
      return 'pending';
    case 'READY_TO_SHIP':
    case 'RETRY_SHIP':
      return 'paid';
    case 'PROCESSED':
    case 'SHIPPED':
      return 'shipped';
    case 'TO_CONFIRM_RECEIVE':
    case 'COMPLETED':
      return 'completed';
    case 'IN_CANCEL':
    case 'CANCELLED':
    case 'TO_RETURN':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// 取 stock_info_v2.summary_info.total_available_stock
function availOfStock(sv2) {
  if (!sv2) return null;
  const s = sv2.summary_info || {};
  const n = Number(s.total_available_stock);
  return Number.isFinite(n) ? n : null;
}
function priceOf(pi) {
  if (!pi) return 0;
  const n = Number(pi.current_price != null ? pi.current_price : pi.original_price);
  return Number.isFinite(n) ? n : 0;
}
function curOf(pi, fallback) { return (pi && pi.currency) || fallback || ''; }
// item_status -> active/inactive；NORMAL=active，其余（BANNED/UNLIST/REVIEWING/SELLER_DELETE/SHOPEE_DELETE）=inactive
function itemStatus(st) { return st === 'NORMAL' ? 'active' : 'inactive'; }

// ── 商品归一化：base_info 项 +（可选）model_list 变体 ──
// base: {item_id, item_name, item_status, has_model, item_sku, price_info, stock_info_v2, item_sku}
// models: [{model_id, model_sku, model_status, price_info, stock_info_v2}]
function normalizeListing(base, models, shopName, currency) {
  const out = [];
  const group = String(base.item_id || '');
  const baseStatus = itemStatus(base.item_status);
  if (!base.has_model) {
    out.push({
      _coll: 'listings',
      ext_key: `shopee:p${group}v${base.item_sku || '0'}`,
      platform: 'shopee',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: '0',
      platform_inventory_item_id: `i${group}`,
      platform_sku: base.item_sku || '',
      title: base.item_name || group,
      listing_price: priceOf(base.price_info),
      currency: curOf(base.price_info, currency),
      url: '',
      image: base.image && base.image.image_url_list && base.image.image_url_list[0] ? base.image.image_url_list[0] : '',
      vendor: '',
      platform_available: availOfStock(base.stock_info_v2),
      status: baseStatus,
      platform_updated_at: '',
    });
    return out;
  }
  for (const m of models || []) {
    const mid = String(m.model_id || '');
    out.push({
      _coll: 'listings',
      ext_key: `shopee:p${group}v${mid}`,
      platform: 'shopee',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: mid,
      platform_inventory_item_id: `m${mid}`,
      platform_sku: m.model_sku || '',
      title: `${base.item_name || group}${m.model_sku ? ' · ' + m.model_sku : ''}`,
      listing_price: priceOf(m.price_info),
      currency: curOf(m.price_info, curOf(base.price_info, currency)),
      url: '',
      image: base.image && base.image.image_url_list && base.image.image_url_list[0] ? base.image.image_url_list[0] : '',
      vendor: '',
      platform_available: availOfStock(m.stock_info_v2),
      status: baseStatus,
      platform_updated_at: '',
    });
  }
  return out;
}

// ── 库存归一化：从 base_info/model_list 的 stock_info_v2 输出 _inventory ──
function normalizeInventory(base, models) {
  const out = [];
  if (!base.has_model) {
    out.push({
      _coll: '_inventory',
      platform_inventory_item_id: `i${base.item_id}`,
      platform_available: availOfStock(base.stock_info_v2) || 0,
    });
    return out;
  }
  for (const m of models || []) {
    out.push({
      _coll: '_inventory',
      platform_inventory_item_id: `m${m.model_id}`,
      platform_available: availOfStock(m.stock_info_v2) || 0,
    });
  }
  return out;
}

// ── 订单归一化：展开 item_list 为明细行 ──
// order: get_order_detail 返回的一条 order_list 记录；需 response_optional_fields 带 item_list,recipient_address,buyer_username,total_amount,estimated_shipping_fee
function normalizeOrder(order, shopName) {
  const out = [];
  const status = orderStatus(order.order_status);
  const cur = order.currency || '';
  const addr = order.recipient_address || {};
  const buyerName = addr.name || '';
  const buyerPhone = addr.phone || '';
  const buyerUser = order.buyer_username || '';
  const shipSum = num(order.estimated_shipping_fee);
  const totalSum = num(order.total_amount);
  const lines = order.item_list || [];
  lines.forEach((it, i) => {
    const qty = Number(it.purchase_quantity || it.quantity) || 1;
    const unit = num(it.purchase_price != null ? it.purchase_price : it.model_original_price);
    const isFirst = i === 0;
    out.push({
      _coll: 'orders',
      ext_key: `shopee:order${order.order_sn}L${i + 1}`,
      order_no: order.order_sn,
      parent_order_no: order.order_sn,
      platform: 'shopee',
      shop_name: shopName,
      platform_order_id: order.order_sn,
      platform_product_id: String(it.item_id || ''),
      platform_variant_id: it.model_id != null ? String(it.model_id) : '',
      platform_sku: it.model_sku || '',
      product_name: it.model_name || it.name || '',
      qty,
      unit_price: unit,
      total_amount: qty * unit,
      currency: cur,
      status,
      buyer: buyerUser,
      buyer_name: buyerName,
      buyer_email: '',
      buyer_phone: buyerPhone,
      ship_country: order.region || '',
      ship_province: addr.state || '',
      ship_city: addr.town || addr.district || addr.city || '',
      ship_zip: addr.zipcode || '',
      ship_address: addr.full_address || '',
      order_shipping: isFirst ? shipSum : 0,
      order_tax: 0,
      order_discount: 0,
      order_total: isFirst ? totalSum : 0,
      platform_created_at: order.create_time ? new Date(Number(order.create_time) * 1000).toISOString() : '',
      platform_updated_at: order.update_time ? new Date(Number(order.update_time) * 1000).toISOString() : '',
    });
  });
  return out;
}

// 从响应里同时兼容顶层与 response 包裹两种结构
function pickList(json, key) {
  if (!json) return [];
  if (Array.isArray(json[key])) return json[key];
  if (json.response && Array.isArray(json.response[key])) return json.response[key];
  return [];
}

// 拉商品：get_item_list 翻页（按 update_time 增量）→ 批量 base_info → 有规格补 model_list
async function collectItems(creds, ctx, sinceTs) {
  const base = apiBase(creds);
  const itemIds = [];
  const pageSize = 100; // get_item_list page_size max=100（2026-10-07 核验）
  let offset = 0;
  for (;;) {
    const q = { offset, page_size: pageSize };
    if (sinceTs) { q.update_time_from = sinceTs; q.update_time_to = nowTs(); }
    const r = await ctx.request(`${base}/api/v2/product/get_item_list`, { method: 'GET', query: q });
    if (r.error || !r.json) break;
    const items = pickList(r.json, 'item');
    for (const it of items) if (it.item_id != null) itemIds.push(it.item_id);
    // 翻页：返回不足一页即视为末页；官方另有 has_next/next 字段，此处以返回数量为准（保守、不臆测字段名）
    if (!items.length || items.length < pageSize) break;
    offset += items.length;
  }
  // 批量 base_info（item_id_list 上限 [0,50]）
  const details = [];
  for (let i = 0; i < itemIds.length; i += 50) {
    const batch = itemIds.slice(i, i + 50);
    const r = await ctx.request(`${base}/api/v2/product/get_item_base_info`, {
      method: 'GET', query: { item_id_list: batch.join(',') },
    });
    if (r.error || !r.json) continue;
    const baseList = pickList(r.json, 'item_list');
    const withModel = baseList.filter((b) => b.has_model);
    // 有规格商品批量补 model_list（同样按 50 一批）
    if (withModel.length) {
      for (let j = 0; j < withModel.length; j += 50) {
        const mb = withModel.slice(j, j + 50).map((b) => b.item_id);
        const mr = await ctx.request(`${base}/api/v2/product/get_model_list`, {
          method: 'GET', query: { item_id_list: mb.join(',') },
        });
        if (mr.error || !mr.json) continue;
        const modelGroups = pickList(mr.json, 'model_list');
        for (const b of baseList) {
          const g = modelGroups.find((x) => x.item_id === b.item_id);
          details.push({ base: b, models: g ? (g.model || []) : [] });
        }
      }
    } else {
      for (const b of baseList) details.push({ base: b, models: [] });
    }
  }
  return details;
}

async function fetchResource(creds, resource, cursor, ctx) {
  const base = apiBase(creds);
  const records = [];
  let nextCursor = cursor || '';
  const shopName = `Shopee（${creds.location || 'global'}）`;
  const currency = ctx.shopCurrency || '';

  if (resource === 'products' || resource === 'inventory') {
    // 增量：按 update_time；首次无游标时不设下限（全量拉取一次）
    const sinceTs = cursor ? Number(cursor) : 0;
    const details = await collectItems(creds, ctx, sinceTs || 0);
    let maxUpd = sinceTs;
    for (const { base: b, models } of details) {
      if (resource === 'products') records.push(...normalizeListing(b, models, shopName, currency));
      else records.push(...normalizeInventory(b, models));
      if (b.update_time && Number(b.update_time) > maxUpd) maxUpd = Number(b.update_time);
    }
    if (maxUpd) nextCursor = String(maxUpd);
    return { records, nextCursor };
  }

  if (resource === 'orders') {
    // 增量：update_time 窗；首次无游标回看 15 天（接口单次时间窗上限约 15 天）
    const end = nowTs();
    const start = cursor ? Number(cursor) : end - 15 * 24 * 3600;
    const windowSec = 15 * 24 * 3600;
    const orderSnAll = [];
    // 时间窗分段（约 15 天一段）
    for (let from = start; from < end; from += windowSec) {
      const to = Math.min(from + windowSec, end);
      let pageCursor = '';
      for (;;) {
        const q = {
          time_range_field: 'update_time',
          time_from: from,
          time_to: to,
          page_size: 100,
          response_optional_fields: 'order_status',
        };
        if (pageCursor) q.cursor = pageCursor;
        const r = await ctx.request(`${base}/api/v2/order/get_order_list`, { method: 'GET', query: q });
        if (r.error || !r.json) break;
        const list = pickList(r.json, 'order_list');
        for (const o of list) if (o.order_sn) orderSnAll.push(o.order_sn);
        const resp = r.json.response || r.json;
        const more = !!(resp && resp.more);
        pageCursor = (resp && resp.next_cursor) || '';
        if (!more || !list.length) break;
      }
    }
    // 批量详情（order_sn_list 上限 [1,50]）
    for (let i = 0; i < orderSnAll.length; i += 50) {
      const batch = orderSnAll.slice(i, i + 50);
      const r = await ctx.request(`${base}/api/v2/order/get_order_detail`, {
        method: 'GET',
        query: {
          order_sn_list: batch.join(','),
          response_optional_fields: 'item_list,recipient_address,buyer_username,total_amount,estimated_shipping_fee',
        },
      });
      if (r.error || !r.json) continue;
      const orders = pickList(r.json, 'order_list');
      for (const o of orders) {
        records.push(...normalizeOrder(o, shopName));
        if (o.update_time && Number(o.update_time) > Number(nextCursor || 0)) nextCursor = String(o.update_time);
      }
    }
    if (!nextCursor) nextCursor = String(end);
    return { records, nextCursor };
  }

  return { records, nextCursor };
}

module.exports = {
  META,
  test,
  fetchResource,
  buildInit,
  refreshCredentials,
  buildAuthUrl,
  exchangeCode,
  getAccessToken,
  orderStatus,
  normalizeOrder,
  normalizeListing,
  normalizeInventory,
  apiBase,
  currencyFor,
  qs,
};
