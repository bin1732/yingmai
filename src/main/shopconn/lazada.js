// Lazada（来赞达）店铺连接器：用卖家自己的 App Key/Secret + 店铺授权令牌在本机直连。
// 鉴权 = OAuth2 授权码换 access_token/refresh_token（按 expires_in/refresh_expires_in 秒数倒计时）+ HMAC-SHA256 业务签名，纯本机、零服务器。
// 2026-10-07 按 open.lazada.com 主机实测 + developer.alibaba.com LazOP 镜像文档核验；
// open.lazada.com 正文为 MTOP 登录态单页应用，字段级正文未直读处（分页/字段大小写）已在台账与教程如实标注，normalize 做大小写防御式扫描。
// 灵感引擎工坊 · bin1732

const crypto = require('crypto');

// 国家 -> 业务 API host（2026-10-07 主机实测存活；越南是 api.lazada.vn，不是 .com.vn）
const HOSTS = {
  sg: 'https://api.lazada.sg',
  my: 'https://api.lazada.com.my',
  th: 'https://api.lazada.co.th',
  ph: 'https://api.lazada.com.ph',
  id: 'https://api.lazada.co.id',
  vn: 'https://api.lazada.vn',
};
// 授权/令牌统一 host（与业务 host 无关，2026-10-07 实测存活）
const AUTH_BASE = 'https://auth.lazada.com';

// 国家 -> 默认币种（ISO 4217；按任务口径映射，未列出留空，以订单/商品返回币种为准）
const REGION_CURRENCY = {
  SG: 'SGD', MY: 'MYR', TH: 'THB', PH: 'PHP', ID: 'IDR', VN: 'VND',
};

const META = {
  id: 'lazada',
  name: { zh: 'Lazada（来赞达）', en: 'Lazada' },
  category: 'crossborder',
  // 代码就绪、失败路径已对真实端点验证、normalize 用按官方字段形状构造的示例报文验证；
  // 但生产连接必须先在 open.lazada.com 创建应用并通过 Lazada 管理员人工审核才拿得到 App Key/Secret，故定 gated。
  status: 'gated',
  authType: 'oauth2-hmac256',
  // 官方限流 QPS/QPM 正文未取到（二手资料冲突：约 10~100 次/分钟/应用）；按保守 1s 间隔调用，
  // 错误统一为 HTTP200+JSON code（无 429），遇限流业务码由 ctx.request 退避，不写死未证实配额。
  requestGapMs: 1000,
  resources: ['products', 'orders', 'inventory'],
  credentialFields: [
    {
      key: 'country', required: true, secret: false,
      label: { zh: '店铺国家', en: 'Shop country' },
      placeholder: { zh: 'sg/my/th/ph/id/vn，决定业务 API host，默认 sg', en: 'sg/my/th/ph/id/vn, selects the business API host, sg by default' },
    },
    {
      key: 'appKey', required: true, secret: false,
      label: { zh: 'App Key', en: 'App Key' },
      placeholder: { zh: 'open.lazada.com 应用详情页的 App Key（即授权页 client_id）', en: 'App Key from your open.lazada.com app details (the authorize page client_id)' },
    },
    {
      key: 'appSecret', required: true, secret: true,
      label: { zh: 'App Secret（密钥）', en: 'App Secret (secret)' },
      placeholder: { zh: '应用详情页的 App Secret，仅用于本机 HMAC 签名，不会上传', en: 'App Secret from the app details page, used for local HMAC signing only, never uploaded' },
    },
    {
      key: 'accessToken', required: false, secret: true,
      label: { zh: 'Access Token（授权后填写）', en: 'Access Token (after authorization)' },
      placeholder: { zh: '用授权码换取的访问令牌；首次可只填到授权步骤，换取后再填回，盈脉会按到期时间自动刷新', en: 'Access token exchanged from the authorization code; fill after the authorization step, YingMai refreshes it by expiry time automatically' },
    },
    {
      key: 'refreshToken', required: false, secret: true,
      label: { zh: 'Refresh Token（授权后填写）', en: 'Refresh Token (after authorization)' },
      placeholder: { zh: '与 Access Token 一起返回的刷新令牌；盈脉到期前自动换新并加密保存新对（refresh_token 滚动更新）', en: 'Refresh token returned with the access token; YingMai rotates it before expiry and re-encrypts the new pair (rolling refresh_token)' },
    },
    {
      key: 'accessTokenExpireAt', required: false, secret: false,
      label: { zh: 'Access Token 到期 epoch（可空）', en: 'Access token expiry (epoch seconds, optional)' },
      placeholder: { zh: '按 expires_in 计算的到期时间戳，盈脉自动维护，一般无需手填', en: 'Expiry timestamp derived from expires_in; maintained automatically by YingMai, usually leave blank' },
    },
    {
      key: 'refreshTokenExpireAt', required: false, secret: false,
      label: { zh: 'Refresh Token 到期 epoch（可空）', en: 'Refresh token expiry (epoch seconds, optional)' },
      placeholder: { zh: '按 refresh_expires_in 计算的到期时间戳，盈脉自动维护，一般无需手填', en: 'Expiry timestamp derived from refresh_expires_in; maintained automatically by YingMai, usually leave blank' },
    },
  ],
  official: {
    docs: 'https://open.lazada.com/',
    signup: 'https://open.lazada.com/apps/user/register',
    devapps: 'https://open.lazada.com/',
  },
  scopes: [
    '/shop/get（店铺信息）',
    '/products/get + /product/get（商品/SKU）',
    '/orders/get + /order/items/get（订单/明细）',
    '/inventory/get（库存读取）',
  ],
  needs: [
    '需在 open.lazada.com 用“For Lazada Sellers（自营卖家自用）”通道注册开发者，创建应用并选应用类目，由 Lazada 管理员人工审核后才发放 App Key/Secret。',
    '业务 API host 按店铺国家切分（SG/MY/TH/PH/ID/VN）；同一个 access_token 只属一个国家，多国店铺需分别授权、分别打对应 host。',
    '本机无公网回调：在 App Console 登记一个本机 localhost 或 https 占位 Callback URL，redirect 必须与登记值逐字一致；授权后人工复制 code（约 30 分钟一次性）。',
    '错误统一为 HTTP 200 + JSON {type:ISV,code,message}，不能靠 HTTP 状态/429 判定；限流 code 名称需登录 open.lazada.com 文档确认，遇限流由共享层退避。',
  ],
  regions: ['sg', 'my', 'th', 'ph', 'id', 'vn'],
};

function nowTs() { return Math.floor(Date.now() / 1000); }
// 签名时间戳：2026-10-07 实测 auth/业务 host 均要求毫秒（13 位）epoch；秒级返回 IllegalTimestamp。
function nowTsMs() { return String(Date.now()); }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function countryOf(creds) {
  const c = String(creds.country || 'sg').toLowerCase();
  return HOSTS[c] ? c : 'sg';
}
function apiBase(creds) { return HOSTS[countryOf(creds)]; }
function currencyFor(country) { return REGION_CURRENCY[String(country || '').toUpperCase()] || ''; }

// 通用 query 序列化（发送用，做 URL 编码）；空值/空串忽略。
function qs(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== '' && obj[k] != null)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
    .join('&');
}

// 防御式取字段：官方正文未直读，CamelCase（OrderId）与 snake_case（order_id）都尝试
function pick(obj, keys) {
  if (!obj) return '';
  for (const k of keys) {
    const v = obj[k];
    if (v != null && v !== '') return v;
  }
  return '';
}

// ── HMAC-SHA256 签名（research §2.5，TOP/LAZOP 通用算法 + 镜像文档印证）──
// 1) 剔除 sign，其余参数（含 access_token/app_key/timestamp/sign_method/format）按 key ASCII 升序；
// 2) 拼成 key1value1key2value2...（无 =、无 &，原始未编码值）；
// 3) 最前面拼接 API 路径名（/rest/ 之后的部分，如 /products/get）；
// 4) 以 App Secret 为 HMAC key 做 HMAC-SHA256，输出大写 hex；sign 走 query。
function signParamString(query) {
  return Object.keys(query || {})
    .filter((k) => k !== 'sign' && query[k] !== '' && query[k] != null)
    .sort()
    .map((k) => `${k}${query[k]}`)
    .join('');
}
function signBase(apiPath, query) {
  return `${apiPath}${signParamString(query)}`;
}
function signRequest(appSecret, apiPath, query) {
  return crypto.createHmac('sha256', String(appSecret || ''))
    .update(signBase(apiPath, query), 'utf8')
    .digest('hex')
    .toUpperCase();
}

// 授权链接（2026-10-07 实测：旧 /oauth/2.0/authorize 已 404，当前为 /oauth/authorize）
function buildAuthUrl(creds, redirect, state) {
  return `${AUTH_BASE}/oauth/authorize?${qs({
    response_type: 'code',
    client_id: creds.appKey || '',
    redirect_uri: redirect || '',
    state: state || '',
    force_auth: 'true',
  })}`;
}

// ── 令牌：GET（不经 ctx.request，但仍按 LAZOP 公共参数签名）──
// 2026-10-07 实测：/rest/auth/token/create、/rest/auth/token/refresh 同样校验 timestamp/sign_method/sign/format；
// 秒级时间戳报 IllegalTimestamp，毫秒 + 正确签名后才进入 app_key/code 校验。app_secret 作为 query 参数参与签名。
async function signedGetToken(path, appKey, appSecret, bizParams) {
  const params = Object.assign({
    app_key: appKey,
    app_secret: appSecret,
    sign_method: 'hmac',
    timestamp: nowTsMs(),
    format: 'json',
  }, bizParams);
  const apiPath = path.replace(/^\/rest/, ''); // /auth/token/create
  const sign = signRequest(appSecret, apiPath, params);
  const url = `${AUTH_BASE}${path}?${qs(Object.assign(params, { sign }))}`;
  const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  let json = null;
  try { json = await res.clone().json(); } catch { /* 非 JSON */ }
  // token 端点错误同样是 {type:ISV,code,message}；成功直接返回 token 字段（无 Response 包裹）
  if (!res.ok || !json || json.type === 'ISV' || json.code) {
    const e = new Error(`lazada_token_${res.status}:${(json && json.message) || (json && json.code) || ''}`);
    e.status = res.status;
    e.body = json;
    throw e;
  }
  return json;
}

// code 换 token：GET /rest/auth/token/create（grant_type=authorization_code）
async function exchangeCode(creds, code) {
  return signedGetToken('/rest/auth/token/create', creds.appKey, creds.appSecret, {
    grant_type: 'authorization_code',
    code: String(code || ''),
  });
}

// 刷新：GET /rest/auth/token/refresh（grant_type=refresh_token）。返回新 access/refresh 与 expires_in/refresh_expires_in。
async function refreshTokens(creds) {
  return signedGetToken('/rest/auth/token/refresh', creds.appKey, creds.appSecret, {
    grant_type: 'refresh_token',
    refresh_token: String(creds.refreshToken || ''),
  });
}

// 取有效 access_token：按 expires_in/refresh_expires_in（秒）动态倒计时（不写死天数）；
// 距过期 ≤120s 或缺失时用 refresh_token 换新；refresh_token 滚动更新，新对经 ctx.persistCredentials 重新加密持久化。
async function getAccessToken(creds, ctx, force) {
  const now = nowTs();
  if (!force && creds.accessToken && Number(creds.accessTokenExpireAt) > now + 120) {
    return String(creds.accessToken);
  }
  if (!creds.refreshToken) throw new Error('missing refresh token');
  const data = await refreshTokens(creds);
  const accessToken = data.access_token || '';
  const refreshToken = data.refresh_token || '';
  // expires_in / refresh_expires_in 为秒；按实际返回值动态倒计时，不写死
  const accessTtl = Number(data.expires_in) || 0;
  const refreshTtl = Number(data.refresh_expires_in) || 0;
  creds.accessToken = accessToken;
  creds.refreshToken = refreshToken;
  creds.accessTokenExpireAt = accessTtl ? now + accessTtl : 0;
  creds.refreshTokenExpireAt = refreshTtl ? now + refreshTtl : 0;
  if (ctx && typeof ctx.persistCredentials === 'function') {
    try {
      await ctx.persistCredentials({
        accessToken,
        refreshToken,
        accessTokenExpireAt: creds.accessTokenExpireAt,
        refreshTokenExpireAt: creds.refreshTokenExpireAt,
      });
    } catch { /* 持久化失败不阻断本次请求 */ }
  }
  return accessToken;
}

// 供共享层 401 时调用：强制用 refresh_token 换新
async function refreshCredentials(creds, ctx) {
  await getAccessToken(creds, ctx, true);
  return {};
}

// 每次业务请求注入 query 公共参数 app_key/timestamp/sign_method=hmac/format=json/access_token，
// 按 API 路径 + 除 sign 外全部参数（ASCII 升序 key+value 直拼）做 HMAC-SHA256，sign 走 query。
async function buildInit(creds, url, init, ctx) {
  const accessToken = await getAccessToken(creds, ctx, false);
  const u = new URL(url);
  // API 路径名 = /rest/ 之后的部分（如 /products/get），参与签名
  const apiPath = u.pathname.replace(/^\/rest/, '') || u.pathname;
  const query = {};
  u.searchParams.forEach((v, k) => { query[k] = v; });
  query.app_key = String(creds.appKey || '');
  query.timestamp = nowTsMs(); // 毫秒 epoch（实测）
  query.sign_method = 'hmac';
  query.format = 'json';
  query.access_token = accessToken;
  const sign = signRequest(creds.appSecret, apiPath, query);
  query.sign = sign;
  const fullUrl = `${u.origin}${u.pathname}?${qs(query)}`;
  return Object.assign({}, init, { url: fullUrl });
}

// 解包成功信封 {Response:{...}}；错误信封 {type:ISV,code,message} 抛业务错误。
// LazOP 错误统一 HTTP200 + JSON code，不能靠 HTTP 状态判定。
function unwrap(json) {
  if (!json) throw new Error('empty response');
  if (json.Response && typeof json.Response === 'object') return json.Response;
  if (json.code) {
    const e = new Error(`lazop_${json.code}:${json.message || ''}`);
    e.code = json.code;
    e.body = json;
    throw e;
  }
  // 兼容个别成功直接平铺字段的情况
  return json;
}

// ── 连接测试：GET /shop/get 验证签名与令牌 ──
async function test(creds, ctx) {
  const need = ['country', 'appKey', 'appSecret'];
  if (need.some((k) => !String(creds[k] || '').trim())) {
    return { ok: false, error: ctx.t('conn_cred_required') };
  }
  if (!String(creds.accessToken || '').trim() && !String(creds.refreshToken || '').trim()) {
    return { ok: false, error: ctx.t('conn_invalid_token') };
  }
  let data;
  try {
    const r = await ctx.request(`${apiBase(creds)}/rest/shop/get`);
    if (r.error) return { ok: false, error: r.error };
    data = unwrap(r.json);
  } catch (e) {
    // HTTP200 但 JSON code 非成功（无效 token/签名/scope）都如实回用户可读失败，绝不误判 ok
    return { ok: false, error: ctx.t('conn_test_failed') };
  }
  const country = String(pick(data, ['Country', 'country']) || countryOf(creds)).toUpperCase();
  const sellerId = pick(data, ['SellerId', 'SellerID', 'seller_id', 'ShopId', 'shop_id']);
  const shopName = pick(data, ['Name', 'ShopName', 'SellerName', 'shop_name', 'name']);
  if (!shopName && !sellerId) return { ok: false, error: ctx.t('conn_shop_not_found') };
  return {
    ok: true,
    shop_name: `${shopName || 'Lazada'}（${country}）`.trim(),
    shop_domain: String(sellerId || ''),
    currency: currencyFor(country) || ctx.shopCurrency || '',
    plan: '',
  };
}

// ── 订单状态映射（官方镜像文档 + Seller Center 状态名 -> 统一五态）──
// unpaid/pending->pending；ready_to_ship->paid；shipped/toconfirmreceive->shipped；
// delivered/closed->completed；canceled/cancelled/returned/lost->cancelled
function orderStatus(st) {
  switch (String(st || '').toLowerCase()) {
    case 'unpaid':
    case 'pending':
      return 'pending';
    case 'ready_to_ship':
    case 'readytoship':
      return 'paid';
    case 'shipped':
    case 'toconfirmreceive':
    case 'to_confirm_receive':
      return 'shipped';
    case 'delivered':
    case 'closed':
    case 'completed':
      return 'completed';
    case 'canceled':
    case 'cancelled':
    case 'returned':
    case 'lost':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function firstImage(item) {
  const imgs = item && (item.Images || item.images);
  if (Array.isArray(imgs) && imgs.length) {
    const first = imgs[0];
    if (!first) return '';
    if (typeof first === 'string') return first.startsWith('//') ? `https:${first}` : first;
    return first.Image || first.image || first.Url || first.url || '';
  }
  return '';
}
function skuStatus(st) {
  const s = String(st || '').toLowerCase();
  return s === 'normal' || s === 'active' || s === 'enabled' ? 'active' : 'inactive';
}

// ── 商品归一化：/product/get 返回 Item.Skus[]，展开多规格 ──
// item: { ItemId/Item_id, ItemName/item_name, Images[], Status/status, Skus[]{ SkuId/Sku_id, Sku/seller_sku, Price, Quantity, Status/status } }
function normalizeListing(item, shopName, currency) {
  const out = [];
  const group = String(pick(item, ['ItemId', 'item_id', 'ItemID']) || '');
  const title = pick(item, ['ItemName', 'item_name', 'Name', 'name']) || group;
  const baseImage = firstImage(item);
  const itemStatus = skuStatus(pick(item, ['Status', 'status']));
  const skus = item.Skus || item.skus || [];
  if (!Array.isArray(skus) || !skus.length) {
    out.push({
      _coll: 'listings',
      ext_key: `lazada:p${group}v0`,
      platform: 'lazada',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: '0',
      platform_inventory_item_id: '',
      platform_sku: '',
      title: title || group,
      listing_price: 0,
      currency: currency || '',
      url: '',
      image: baseImage,
      vendor: '',
      platform_available: null,
      status: itemStatus,
      platform_updated_at: '',
    });
    return out;
  }
  for (const sku of skus) {
    const skuId = String(pick(sku, ['SkuId', 'sku_id']) || '0');
    const sellerSku = pick(sku, ['Sku', 'SellerSku', 'seller_sku', 'ShopSku', 'shop_sku']) || '';
    out.push({
      _coll: 'listings',
      ext_key: `lazada:p${group}v${skuId}`,
      platform: 'lazada',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: skuId,
      platform_inventory_item_id: sellerSku,
      platform_sku: sellerSku,
      title: sellerSku ? `${title} · ${sellerSku}` : title,
      listing_price: num(pick(sku, ['Price', 'price', 'PromotionalPrice', 'promotional_price'])),
      currency: currency || '',
      url: '',
      image: firstImage(sku) || baseImage,
      vendor: '',
      platform_available: Number(pick(sku, ['Quantity', 'quantity'])) || 0,
      status: skuStatus(pick(sku, ['Status', 'status'])) || itemStatus,
      platform_updated_at: '',
    });
  }
  return out;
}

// ── 库存归一化：/inventory/get 返回的 SKU 行，platform_inventory_item_id=sku 对应键 ──
// rows: [{ Sku/seller_sku, Quantity/quantity, ... }]
function normalizeInventory(rows) {
  const out = [];
  for (const r of rows || []) {
    const sellerSku = pick(r, ['Sku', 'SellerSku', 'seller_sku', 'sku', 'ShopSku']) || '';
    if (!sellerSku) continue;
    out.push({
      _coll: '_inventory',
      platform_inventory_item_id: sellerSku,
      platform_available: num(pick(r, ['Quantity', 'quantity', 'AvailableStock', 'available_stock'])),
    });
  }
  return out;
}

// ── 订单归一化：展开 OrderItems 为明细行；汇总金额只写在 L1 ──
// order: /orders/get 的一条 { OrderId/order_id, Statuses/statuses[], Currency/currency,
//   PaidTime/paid_time, CreatedAt/created_at, UpdatedAt/updated_at, Price/price, ShippingFee/shipping_fee, BuyerUserId/buyer_user_id }
// items: /order/items/get 的 OrderItems[] { OrderItemId, OrderId, Sku/ModelSku, Name/ModelName, Quantity, Price, PaidPrice, Status }
function normalizeOrder(order, items, shopName) {
  const out = [];
  const orderId = String(pick(order, ['OrderId', 'order_id', 'OrderNumber', 'order_number']) || '');
  // 订单状态取 Statuses 数组第一个，或单条 Status
  const statuses = order.Statuses || order.statuses || [];
  const rawStatus = Array.isArray(statuses) && statuses.length ? statuses[0] : pick(order, ['Status', 'status']);
  const status = orderStatus(rawStatus);
  const cur = pick(order, ['Currency', 'currency']) || '';
  const buyerUser = pick(order, ['BuyerUserId', 'buyer_user_id', 'BuyerUsername', 'buyer_username']);
  const shipSum = num(pick(order, ['ShippingFee', 'shipping_fee']));
  const orderTotal = num(pick(order, ['Price', 'price', 'OrderTotal', 'order_total']));
  const createdTs = Number(pick(order, ['PaidTime', 'paid_time', 'CreatedAt', 'created_at']));
  const updatedTs = Number(pick(order, ['UpdatedAt', 'updated_at', 'UpdateTime', 'update_time']));
  const lines = Array.isArray(items) ? items : [];
  lines.forEach((it, i) => {
    const qty = num(pick(it, ['Quantity', 'quantity'])) || 1;
    const unit = num(pick(it, ['PaidPrice', 'paid_price', 'Price', 'price', 'OriginalPrice', 'original_price']));
    const sellerSku = pick(it, ['Sku', 'SellerSku', 'seller_sku', 'ModelSku', 'model_sku']);
    const isFirst = i === 0;
    out.push({
      _coll: 'orders',
      ext_key: `lazada:order${orderId}L${i + 1}`,
      order_no: orderId,
      parent_order_no: orderId,
      platform: 'lazada',
      shop_name: shopName,
      platform_order_id: orderId,
      platform_product_id: String(pick(it, ['ItemId', 'item_id', 'OrderId', 'order_id']) || orderId),
      platform_variant_id: String(pick(it, ['OrderItemId', 'order_item_id', 'SkuId', 'sku_id']) || ''),
      platform_sku: sellerSku,
      product_name: pick(it, ['Name', 'name', 'ModelName', 'model_name']),
      qty,
      unit_price: unit,
      total_amount: qty * unit,
      currency: cur,
      status,
      buyer: buyerUser,
      buyer_name: pick(it, ['BuyerName', 'buyer_name', 'RecipientAddressName', 'recipient_name']),
      buyer_email: '',
      buyer_phone: pick(it, ['BuyerPhone', 'buyer_phone', 'RecipientPhone', 'recipient_phone']),
      ship_country: pick(order, ['ShipCountry', 'ship_country', 'Country', 'country']),
      ship_province: pick(it, ['ShipProvince', 'ship_province', 'Province', 'province']),
      ship_city: pick(it, ['ShipCity', 'ship_city', 'City', 'city']),
      ship_zip: pick(it, ['ShipZip', 'ship_zip', 'PostCode', 'post_code']),
      ship_address: pick(it, ['ShipAddress', 'ship_address', 'Address', 'address']),
      order_shipping: isFirst ? shipSum : 0,
      order_tax: 0,
      order_discount: 0,
      order_total: isFirst ? orderTotal : 0,
      platform_created_at: createdTs ? new Date(createdTs * 1000).toISOString() : '',
      platform_updated_at: updatedTs ? new Date(updatedTs * 1000).toISOString() : '',
    });
  });
  return out;
}

// 从响应里取列表（兼容 Response.Products / Response.Items / Response.Orders / Response.OrderItems 等多种包裹）
function pickList(resp, keys) {
  for (const k of keys) {
    if (Array.isArray(resp[k])) return resp[k];
  }
  return [];
}

async function fetchResource(creds, resource, cursor, ctx) {
  const base = apiBase(creds);
  const records = [];
  let nextCursor = cursor || '';
  const cc = countryOf(creds).toUpperCase();
  const shopName = `Lazada（${cc}）`;
  const currency = ctx.shopCurrency || currencyFor(cc);

  if (resource === 'products') {
    // /products/get 翻页（offset/limit），update_after 增量；逐条 /product/get 取 SKU
    const start = cursor ? Number(cursor) : 0;
    const end = nowTs();
    const pageSize = 100;
    let offset = 0;
    for (;;) {
      const q = { offset, limit: pageSize, update_after: start, update_before: end };
      const r = await ctx.request(`${base}/rest/products/get`, { method: 'GET', query: q });
      if (r.error || !r.json) break;
      let resp;
      try { resp = unwrap(r.json); } catch { break; }
      const items = pickList(resp, ['Products', 'products', 'Items', 'items']);
      for (const it of items) {
        const itemId = pick(it, ['ItemId', 'item_id']);
        if (!itemId) continue;
        const dr = await ctx.request(`${base}/rest/product/get`, { method: 'GET', query: { item_id: itemId } });
        if (dr.error || !dr.json) continue;
        let dresp;
        try { dresp = unwrap(dr.json); } catch { continue; }
        const detail = dresp.Item || dresp.item || dresp;
        records.push(...normalizeListing(detail, shopName, currency));
        const upd = Number(pick(it, ['UpdatedAt', 'updated_at', 'UpdateTime', 'update_time']));
        if (upd > start) nextCursor = String(upd);
      }
      if (!items.length || items.length < pageSize) break;
      offset += items.length;
    }
    if (!nextCursor) nextCursor = String(end);
    return { records, nextCursor };
  }

  if (resource === 'inventory') {
    // /inventory/get 输出 _inventory（platform_inventory_item_id=sku）
    const r = await ctx.request(`${base}/rest/inventory/get`, { method: 'GET', query: { offset: 0, limit: 100 } });
    if (!r.error && r.json) {
      try {
        const resp = unwrap(r.json);
        const rows = pickList(resp, ['Products', 'products', 'Inventories', 'inventories', 'Skus', 'skus']);
        records.push(...normalizeInventory(rows));
      } catch { /* 业务错误不中断同步 */ }
    }
    return { records, nextCursor };
  }

  if (resource === 'orders') {
    // /orders/get（update_after/update_before 增量、状态过滤）→ /order/items/get 取明细
    const end = nowTs();
    const start = cursor ? Number(cursor) : end - 24 * 3600;
    const pageSize = 100;
    let offset = 0;
    const orderIds = [];
    for (;;) {
      const q = { update_after: start, update_before: end, offset, limit: pageSize };
      const r = await ctx.request(`${base}/rest/orders/get`, { method: 'GET', query: q });
      if (r.error || !r.json) break;
      let resp;
      try { resp = unwrap(r.json); } catch { break; }
      const orders = pickList(resp, ['Orders', 'orders']);
      for (const o of orders) {
        const oid = pick(o, ['OrderId', 'order_id']);
        if (oid) orderIds.push(String(oid));
      }
      if (!orders.length || orders.length < pageSize) break;
      offset += orders.length;
    }
    // 逐单取明细（/order/items/get）
    for (const oid of orderIds) {
      const ir = await ctx.request(`${base}/rest/order/items/get`, { method: 'GET', query: { order_id: oid } });
      if (ir.error || !ir.json) continue;
      let iresp;
      try { iresp = unwrap(ir.json); } catch { continue; }
      const items = pickList(iresp, ['OrderItems', 'order_items']);
      // 订单头用 orders/get 返回里的对应项兜底（此处明细行级展开，订单级金额取 0 直到 L1 汇总）
      records.push(...normalizeOrder({ OrderId: oid, Currency: currency }, items, shopName));
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
  apiBase,
  currencyFor,
  countryOf,
  qs,
};
