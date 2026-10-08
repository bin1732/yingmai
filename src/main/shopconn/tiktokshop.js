// TikTok Shop 店铺连接器：用卖家自己的 App Key/Secret + 店铺授权令牌在本机直连。
// 鉴权 = OAuth2 授权码换 access_token/refresh_token（按 epoch 秒过期时间戳倒计时）+ HMAC-SHA256 业务签名，纯本机、零服务器。
// 2026-10-07 按官方 docv2 核验；正文 JS 渲染未直读处已在台账标注。
// 灵感引擎工坊 · bin1732

const crypto = require('crypto');

// 业务 API 全球统一 host（2026-10-07 核验 methods-and-endpoints / OpenAPI servers），不按区域切 host。
const API_BASE = 'https://open-api.tiktokglobalshop.com';
// 令牌端点（换 token / 刷新），裸 GET，不参与业务那套 HMAC 签名（R3：官方参数表仅 app_key/app_secret/auth_code/grant_type）。
const TOKEN_BASE = 'https://auth.tiktok-shops.com';

// region 两位码 -> 默认币种（ISO 4217；按任务口径映射，未列出留空，以订单/商品返回币种为准）
const REGION_CURRENCY = {
  US: 'USD', GB: 'GBP', ID: 'IDR', MY: 'MYR',
  PH: 'PHP', TH: 'THB', VN: 'VND', SG: 'SGD',
  BR: 'BRL', MX: 'MXN',
};

const META = {
  id: 'tiktokshop',
  name: { zh: 'TikTok Shop', en: 'TikTok Shop' },
  category: 'crossborder',
  // 代码就绪、失败路径已对真实端点验证、normalize 用官方字段形状构造的示例报文验证；
  // 但生产连接必须先通过卖家自用 security/合规审核（US/UK 强制、≥3 周）拿到可授权的 App，故定 gated。
  status: 'gated',
  authType: 'oauth2-hmac256',
  // 官方仅公开 429 + 业务码 36009002 + Retry-After 退避策略；具体 QPS/QPM 页正文 JS 渲染未抓到数字，
  // 按保守 1s 间隔调用，不写死未证实 QPS；遇限流由 ctx.request 按 Retry-After 退避。
  requestGapMs: 1000,
  resources: ['products', 'orders', 'inventory'],
  credentialFields: [
    {
      key: 'authRegion', required: true, secret: false,
      label: { zh: '授权区域', en: 'Authorization region' },
      placeholder: { zh: 'us（美国站授权页）/ row（其余市场，默认 row），决定授权页域名', en: 'us (US authorization page) / row (other markets, default row); selects the authorization page domain' },
    },
    {
      key: 'appKey', required: true, secret: false,
      label: { zh: 'App Key', en: 'App Key' },
      placeholder: { zh: 'Partner Center → App details 里的 App Key', en: 'App Key from Partner Center → App details' },
    },
    {
      key: 'appSecret', required: true, secret: true,
      label: { zh: 'App Secret（密钥）', en: 'App Secret (secret)' },
      placeholder: { zh: 'App details 页的 App Secret，仅用于本机 HMAC 签名，不会上传', en: 'App Secret from the app details page, used for local HMAC signing only, never uploaded' },
    },
    {
      key: 'accessToken', required: false, secret: true,
      label: { zh: 'Access Token（授权后填写）', en: 'Access Token (after authorization)' },
      placeholder: { zh: '用授权码换取的访问令牌；首次可只填到授权步骤，换取后再填回，盈脉会按到期时间自动刷新', en: 'Access token exchanged from the authorization code; fill after the authorization step, YingMai refreshes it by expiry time automatically' },
    },
    {
      key: 'refreshToken', required: false, secret: true,
      label: { zh: 'Refresh Token（授权后填写）', en: 'Refresh Token (after authorization)' },
      placeholder: { zh: '与 Access Token 一起返回的刷新令牌；盈脉到期前自动换新并加密保存新对', en: 'Refresh token returned with the access token; YingMai rotates it before expiry and re-encrypts the new pair' },
    },
    {
      key: 'shopCipher', required: false, secret: false,
      label: { zh: 'Shop Cipher（跨境店必填）', en: 'Shop Cipher (required for cross-border shops)' },
      placeholder: { zh: '用 Access Token 调 Get Authorized Shops 得到的 shops[].cipher；跨境店必填，本土店多数端点可选', en: 'shops[].cipher from Get Authorized Shops with your access token; required for cross-border shops, optional for most local-shop endpoints' },
    },
    {
      key: 'accessTokenExpireAt', required: false, secret: false,
      label: { zh: 'Access Token 到期时间（epoch 秒，可空）', en: 'Access token expiry (epoch seconds, optional)' },
      placeholder: { zh: '官方下发的过期时间戳，盈脉自动维护，一般无需手填', en: 'Expiry timestamp returned by the platform; maintained automatically by YingMai, usually leave blank' },
    },
    {
      key: 'refreshTokenExpireAt', required: false, secret: false,
      label: { zh: 'Refresh Token 到期时间（epoch 秒，可空）', en: 'Refresh token expiry (epoch seconds, optional)' },
      placeholder: { zh: '官方下发的过期时间戳，盈脉自动维护，一般无需手填', en: 'Expiry timestamp returned by the platform; maintained automatically by YingMai, usually leave blank' },
    },
  ],
  official: {
    docs: 'https://partner.tiktokshop.com/docv2/page/tts-developer-guide',
    signup: 'https://partner.tiktokshop.com/',
    devapps: 'https://partner.tiktokshop.com/docv2/page/create-your-app',
  },
  scopes: [
    'seller.authorization（Get Authorized Shops）',
    'seller.product.basic（商品/库存读取）',
    'seller.order（订单读取）',
  ],
  needs: [
    '需在 Partner Center 注册并登记为开发者；卖家自用（Custom App）security/合规审核为强制，US/UK 总是强制、周期 ≥3 周，表格如实填写，连续 3 次拒绝会拉黑账号。',
    '业务 API 全球统一 host open-api.tiktokglobalshop.com，不按区域切 host；店铺区域与币种由 Get Authorized Shops 返回。',
    '本机无公网回调：把 Redirect URL 配成一个 https 占位地址，授权后人工从地址栏复制 code（30 分钟一次性），盈脉本机直接换 token。',
    'shop_cipher 由 Get Authorized Shops 返回；中国跨境店必填、作为 query 参数参与签名。',
    '若 App 配了 IP 白名单，未加白出口 IP 会返回 36009033；遇 105005 Access denied 先查 scope 是否已在控制台启用。',
  ],
  regions: ['global（统一 host open-api.tiktokglobalshop.com，区域由店铺返回）'],
};

function nowTs() { return Math.floor(Date.now() / 1000); }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function currencyFor(region) { return REGION_CURRENCY[String(region || '').toUpperCase()] || ''; }

// 通用 query 序列化（发送用，做 URL 编码）；空值/空串忽略。
function qs(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== '' && obj[k] != null)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
    .join('&');
}

// ── HMAC-SHA256 签名（官方 sign-your-api-request，2026-10-07 核验）──
// 1) 剔除 sign 与 access_token，按 key 字母序升序；
// 2) 拼接 {key1}{value1}{key2}{value2}...（无 =、无 &，原始未编码值）；
// 3) 前拼请求 path；
// 4) 非 multipart 时把实际发送的 body 字节串原样追加（与线上请求同一序列化结果）；
// 5) 首尾包 app_secret；以 app_secret 为 HMAC key 做 HMAC-SHA256，输出小写 hex。
function signParamString(query) {
  return Object.keys(query || {})
    .filter((k) => k !== 'sign' && k !== 'access_token' && query[k] !== '' && query[k] != null)
    .sort()
    .map((k) => `${k}${query[k]}`)
    .join('');
}
function signBase(appSecret, path, query, bodyStr) {
  return `${appSecret}${path}${signParamString(query)}${bodyStr || ''}${appSecret}`;
}
function signRequest(appSecret, path, query, bodyStr) {
  return crypto.createHmac('sha256', String(appSecret || ''))
    .update(signBase(appSecret, path, query, bodyStr), 'utf8')
    .digest('hex');
}

// 授权链接（service_id 以 Partner Center “Copy authorization link” 给出的为准）。
function authPageBase(creds) {
  return String(creds.authRegion || 'row').toLowerCase() === 'us'
    ? 'https://services.us.tiktokshop.com/open/authorize'
    : 'https://services.tiktokshop.com/open/authorize';
}
function buildAuthUrl(creds, serviceId) {
  return `${authPageBase(creds)}?service_id=${encodeURIComponent(serviceId || '')}`;
}

// ── 令牌：裸 GET（不经 ctx.request，不签 HMAC）──
async function bareGetToken(path, params) {
  const url = `${TOKEN_BASE}${path}?${qs(params)}`;
  const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  let json = null;
  try { json = await res.clone().json(); } catch { /* 非 JSON */ }
  if (!res.ok || !json || (json.code != null && json.code !== 0)) {
    const e = new Error(`tiktokshop_token_${res.status}:${(json && json.message) || ''}`);
    e.status = res.status;
    e.body = json;
    throw e;
  }
  return json.data || {};
}

// code 换 token：GET /api/v2/token/get（grant_type=authorized_code）
async function exchangeCode(creds, code) {
  return bareGetToken('/api/v2/token/get', {
    app_key: creds.appKey,
    app_secret: creds.appSecret,
    auth_code: code,
    grant_type: 'authorized_code',
  });
}

// 刷新：GET /api/v2/token/refresh（grant_type=refresh_token）。返回新 access/refresh 及 epoch 秒过期时间戳。
async function refreshTokens(creds) {
  return bareGetToken('/api/v2/token/refresh', {
    app_key: creds.appKey,
    app_secret: creds.appSecret,
    refresh_token: creds.refreshToken,
    grant_type: 'refresh_token',
  });
}

function asPair(data) {
  return {
    accessToken: data.access_token || '',
    refreshToken: data.refresh_token || '',
    accessTokenExpireAt: data.access_token_expire_in || 0,
    refreshTokenExpireAt: data.refresh_token_expire_in || 0,
  };
}

// 取有效 access_token：按官方下发的 epoch 秒过期时间戳倒计时（不写死小时数）；
// 距过期 ≤120s 或缺失时用 refresh_token 换新；新对经 ctx.persistCredentials 重新加密持久化。
async function getAccessToken(creds, ctx, force) {
  const now = nowTs();
  if (!force && creds.accessToken && Number(creds.accessTokenExpireAt) > now + 120) {
    return String(creds.accessToken);
  }
  if (!creds.refreshToken) throw new Error('missing refresh token');
  const data = await refreshTokens(creds);
  const pair = asPair(data);
  creds.accessToken = pair.accessToken;
  creds.refreshToken = pair.refreshToken;
  creds.accessTokenExpireAt = pair.accessTokenExpireAt;
  creds.refreshTokenExpireAt = pair.refreshTokenExpireAt;
  if (ctx && typeof ctx.persistCredentials === 'function') {
    try {
      await ctx.persistCredentials({
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
        accessTokenExpireAt: pair.accessTokenExpireAt,
        refreshTokenExpireAt: pair.refreshTokenExpireAt,
      });
    } catch { /* 持久化失败不阻断本次请求 */ }
  }
  return pair.accessToken;
}

// 供共享层 401 时调用：强制用 refresh_token 换新
async function refreshCredentials(creds, ctx) {
  await getAccessToken(creds, ctx, true);
  return {};
}

// 每次业务请求注入公共 query：app_key/timestamp（+shop_cipher 当有），按 path+query+body 签 HMAC-SHA256；
// access_token 走头 x-tts-access-token（不参与签名）。sign 与 body 共用同一序列化结果（init.body 已是共享层序列化好的字符串）。
async function buildInit(creds, url, init, ctx) {
  const accessToken = await getAccessToken(creds, ctx, false);
  const u = new URL(url);
  const path = u.pathname;
  const query = {};
  u.searchParams.forEach((v, k) => { query[k] = v; });
  query.app_key = String(creds.appKey || '');
  query.timestamp = String(nowTs());
  if (creds.shopCipher) query.shop_cipher = String(creds.shopCipher);
  const bodyStr = (init && typeof init.body === 'string') ? init.body : '';
  const sign = signRequest(creds.appSecret, path, query, bodyStr);
  query.sign = sign;
  const fullUrl = `${u.origin}${path}?${qs(query)}`;
  return Object.assign({}, init, {
    url: fullUrl,
    headers: Object.assign({}, (init && init.headers) || {}, { 'x-tts-access-token': accessToken }),
  });
}

// 统一解包 { code, message, data }；code===0 取 data，否则抛出业务错误。
function unwrap(json) {
  if (!json) throw new Error('empty response');
  if (json.code != null && json.code !== 0) {
    const e = new Error(`tiktokshop_${json.code}:${json.message || ''}`);
    e.code = json.code;
    throw e;
  }
  return json.data || {};
}

// ── 连接测试：GET /authorization/202309/shops 验证签名与令牌 ──
async function test(creds, ctx) {
  const need = ['appKey', 'appSecret'];
  if (need.some((k) => !String(creds[k] || '').trim())) {
    return { ok: false, error: ctx.t('conn_cred_required') };
  }
  if (!String(creds.accessToken || '').trim() && !String(creds.refreshToken || '').trim()) {
    return { ok: false, error: ctx.t('conn_invalid_token') };
  }
  let data;
  try {
    const r = await ctx.request(`${API_BASE}/authorization/202309/shops`);
    if (r.error) return { ok: false, error: r.error };
    data = unwrap(r.json);
  } catch (e) {
    // 业务码 105005（scope 未开）/ 36009033（IP 未加白）等都如实回用户可读失败，绝不误判 ok
    return { ok: false, error: ctx.t('conn_test_failed') };
  }
  const shops = Array.isArray(data.shops) ? data.shops : [];
  if (!shops.length) return { ok: false, error: ctx.t('conn_shop_not_found') };
  const s0 = shops[0];
  const region = s0.region || '';
  return {
    ok: true,
    shop_name: `${s0.name || 'TikTok Shop'}（${region}）`.trim(),
    shop_domain: String(s0.id || ''),
    currency: currencyFor(region) || ctx.shopCurrency || '',
    plan: '',
  };
}

// ── 订单状态映射（官方枚举 -> 统一五态）──
// UNPAID/ON_HOLD->pending；AWAITING_SHIPMENT/AWAITING_COLLECTION->paid；
// IN_TRANSIT/DELIVERED->shipped；COMPLETED->completed；CANCELLED->cancelled
function orderStatus(os) {
  switch (os) {
    case 'UNPAID':
    case 'ON_HOLD':
      return 'pending';
    case 'AWAITING_SHIPMENT':
    case 'AWAITING_COLLECTION':
      return 'paid';
    case 'IN_TRANSIT':
    case 'DELIVERED':
      return 'shipped';
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function amountOf(price) {
  if (!price) return 0;
  const n = Number(price.amount);
  return Number.isFinite(n) ? n : 0;
}
function currencyOf(price, fallback) { return (price && price.currency) || fallback || ''; }

// 商品状态 -> active/inactive（LIVE=active，其余 REVIEWING/SELLER_DEACTIVATED/PLATFORM_SUSPENDED 等=inactive）
function productStatus(st) { return st === 'LIVE' ? 'active' : 'inactive'; }
// 搜索列表返回的状态字段名可能为 status（v202502）；详情态以 product.status 为准
function firstImage(product) {
  const imgs = product && product.images;
  if (Array.isArray(imgs) && imgs.length) {
    const first = imgs[0];
    if (first) return first.uri || first.url || first.image_url || '';
  }
  return '';
}

// ── 商品归一化：Get Product(v202309) 详情的 skus[]，展开多规格 ──
// product: data.product { id, title, status, images[], skus[]{ id, seller_sku, price{amount,currency}, sale_properties[] } }
function normalizeListing(product, shopName, currency) {
  const out = [];
  const group = String(product.id || '');
  const status = productStatus(product.status);
  const baseImage = firstImage(product);
  const skus = Array.isArray(product.skus) ? product.skus : [];
  if (!skus.length) {
    out.push({
      _coll: 'listings',
      ext_key: `tiktokshop:p${group}v0`,
      platform: 'tiktokshop',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: '0',
      platform_inventory_item_id: '0',
      platform_sku: '',
      title: product.title || group,
      listing_price: 0,
      currency: currency || '',
      url: '',
      image: baseImage,
      vendor: '',
      platform_available: null,
      status,
      platform_updated_at: product.update_time ? new Date(Number(product.update_time) * 1000).toISOString() : '',
    });
    return out;
  }
  for (const sku of skus) {
    const sid = String(sku.id || '');
    const spec = Array.isArray(sku.sale_properties) && sku.sale_properties.length
      ? sku.sale_properties.map((p) => p.value_name || p.value || '').filter(Boolean).join('/')
      : '';
    out.push({
      _coll: 'listings',
      ext_key: `tiktokshop:p${group}v${sid}`,
      platform: 'tiktokshop',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: sid,
      platform_inventory_item_id: sid,
      platform_sku: sku.seller_sku || '',
      title: `${product.title || group}${spec ? ' · ' + spec : ''}`,
      listing_price: amountOf(sku.price),
      currency: currencyOf(sku.price, currency),
      url: '',
      image: (sku.image && (sku.image.uri || sku.image.url)) || baseImage,
      vendor: '',
      platform_available: null,
      status,
      platform_updated_at: product.update_time ? new Date(Number(product.update_time) * 1000).toISOString() : '',
    });
  }
  return out;
}

// ── 库存归一化：Inventory Search 返回 inventory[].skus[] ──
function normalizeInventory(invList) {
  const out = [];
  for (const inv of invList || []) {
    for (const sku of inv.skus || []) {
      out.push({
        _coll: '_inventory',
        platform_inventory_item_id: String(sku.id || ''),
        platform_available: num(sku.total_available_quantity),
      });
    }
  }
  return out;
}

// ── 订单归一化：展开 line_items 为明细行；汇总金额只写在 L1 ──
// order: Get Order Detail 返回的 data.order { order_id, order_status, create_time, update_time,
//   buyer_email, recipient_address{name,phone_number,region_code,address_line1,city,province_code,postal_code},
//   line_items[]{ item_id, product_name, sku_id, seller_sku, quantity, sale_price{amount,currency} } }
function normalizeOrder(order, shopName) {
  const out = [];
  const status = orderStatus(order.order_status);
  const cur = (order.payment && order.payment.currency) || '';
  const addr = order.recipient_address || {};
  const lines = Array.isArray(order.line_items) ? order.line_items : [];
  // 汇总金额：优先取订单级字段，否则用明细合计兜底；只在 L1 写
  const shipping = num(order.shipping_fee != null ? order.shipping_fee
    : (order.payment && order.payment.shipping_fee && order.payment.shipping_fee.amount));
  const tax = num(order.tax != null ? order.tax
    : (order.payment && order.payment.tax && order.payment.tax.amount));
  const discount = num(order.discount != null ? order.discount
    : (order.payment && order.payment.discount && order.payment.discount.amount));
  const orderTotal = num(order.total_amount != null ? order.total_amount
    : (order.payment && order.payment.total_amount && order.payment.total_amount.amount));
  lines.forEach((it, i) => {
    const qty = Number(it.quantity) || 1;
    const unit = amountOf(it.sale_price);
    const isFirst = i === 0;
    out.push({
      _coll: 'orders',
      ext_key: `tiktokshop:order${order.order_id}L${i + 1}`,
      order_no: String(order.order_id || ''),
      parent_order_no: String(order.order_id || ''),
      platform: 'tiktokshop',
      shop_name: shopName,
      platform_order_id: String(order.order_id || ''),
      platform_product_id: String(it.item_id || ''),
      platform_variant_id: String(it.sku_id || ''),
      platform_sku: it.seller_sku || '',
      product_name: it.product_name || '',
      qty,
      unit_price: unit,
      total_amount: qty * unit,
      currency: cur || currencyOf(it.sale_price, ''),
      status,
      buyer: addr.name || '',
      buyer_name: addr.name || '',
      buyer_email: order.buyer_email || '',
      buyer_phone: addr.phone_number || '',
      ship_country: addr.region_code || '',
      ship_province: addr.province_code || '',
      ship_city: addr.city || '',
      ship_zip: addr.postal_code || '',
      ship_address: addr.address_line1 || '',
      order_shipping: isFirst ? shipping : 0,
      order_tax: isFirst ? tax : 0,
      order_discount: isFirst ? discount : 0,
      order_total: isFirst ? (orderTotal || lines.reduce((s, x) => s + (Number(x.quantity) || 1) * amountOf(x.sale_price), 0)) : 0,
      platform_created_at: order.create_time ? new Date(Number(order.create_time) * 1000).toISOString() : '',
      platform_updated_at: order.update_time ? new Date(Number(order.update_time) * 1000).toISOString() : '',
    });
  });
  return out;
}

// 收集店铺下全部 product_id（搜索 v202502，page_size=100 翻页）
async function collectProductIds(creds, ctx) {
  const ids = [];
  let pageToken = '';
  for (;;) {
    const query = { page_size: 100 };
    if (pageToken) query.page_token = pageToken;
    const r = await ctx.request(`${API_BASE}/product/202502/products/search`, {
      method: 'POST', query, body: { status: 'ALL' },
    });
    if (r.error || !r.json) break;
    let data;
    try { data = unwrap(r.json); } catch { break; }
    const products = Array.isArray(data.products) ? data.products : [];
    for (const p of products) if (p.id != null) ids.push(String(p.id));
    pageToken = data.next_page_token || '';
    if (!pageToken || !products.length) break;
  }
  return ids;
}

async function fetchResource(creds, resource, cursor, ctx) {
  const records = [];
  let nextCursor = cursor || '';
  const shopName = `TikTok Shop（${creds.authRegion || 'global'}）`;
  const currency = ctx.shopCurrency || '';

  if (resource === 'products') {
    // 搜索列表（lean）→ 逐个 Get Product 取 skus 详情，展开多规格
    const ids = await collectProductIds(creds, ctx);
    let maxUpd = Number(cursor || 0);
    for (const pid of ids) {
      const r = await ctx.request(`${API_BASE}/product/202309/products/${encodeURIComponent(pid)}`);
      if (r.error || !r.json) continue;
      let product;
      try { product = unwrap(r.json).product || {}; } catch { continue; }
      records.push(...normalizeListing(product, shopName, currency));
      if (product.update_time && Number(product.update_time) > maxUpd) maxUpd = Number(product.update_time);
    }
    if (maxUpd) nextCursor = String(maxUpd);
    return { records, nextCursor };
  }

  if (resource === 'inventory') {
    // 先收集 product_id，再按 ≤100/批调 inventory/search（query shop_cipher）
    const ids = await collectProductIds(creds, ctx);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const r = await ctx.request(`${API_BASE}/product/202309/inventory/search`, {
        method: 'POST', body: { product_ids: batch },
      });
      if (r.error || !r.json) continue;
      let data;
      try { data = unwrap(r.json); } catch { continue; }
      records.push(...normalizeInventory(data.inventory));
    }
    return { records, nextCursor };
  }

  if (resource === 'orders') {
    // 增量：update_time 窗；首次无游标回看 24h（接口时间窗上限未直读，保守短窗+重叠）
    const end = nowTs();
    const start = cursor ? Number(cursor) : end - 24 * 3600;
    const orderIds = [];
    let pageToken = '';
    for (;;) {
      const body = { page_size: 100, update_time_ge: start, update_time_lt: end };
      if (pageToken) body.page_token = pageToken;
      const r = await ctx.request(`${API_BASE}/order/202309/orders/search`, { method: 'POST', body });
      if (r.error || !r.json) break;
      let data;
      try { data = unwrap(r.json); } catch { break; }
      const orders = Array.isArray(data.orders) ? data.orders : [];
      for (const o of orders) if (o.order_id) orderIds.push(String(o.order_id));
      pageToken = data.next_page_token || '';
      if (!pageToken || !orders.length) break;
    }
    // 逐个取详情展开明细行
    for (const oid of orderIds) {
      const r = await ctx.request(`${API_BASE}/order/202309/orders`, { method: 'GET', query: { order_id: oid } });
      if (r.error || !r.json) continue;
      let data;
      try { data = unwrap(r.json); } catch { continue; }
      const order = data.order || {};
      records.push(...normalizeOrder(order, shopName));
      if (order.update_time && Number(order.update_time) > Number(nextCursor || 0)) nextCursor = String(order.update_time);
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
  authPageBase,
  exchangeCode,
  refreshTokens,
  getAccessToken,
  orderStatus,
  normalizeOrder,
  normalizeListing,
  normalizeInventory,
  unwrap,
  signRequest,
  signBase,
  signParamString,
  currencyFor,
  qs,
};
