// eBay 店铺适配器：用卖家自己的 App ID / Cert ID / User Refresh Token 在本机直连。
// 鉴权 = OAuth2 refresh_token grant 换 User access token（Basic 认证、form 编码），纯本机、零服务器。
// 灵感引擎工坊 · bin1732

// 各环境 API 主机（2026-10-07 实时核验 edp.ebay.com/develop/guides/sell/authorization）
const HOSTS = {
  production: 'api.ebay.com',
  sandbox: 'api.sandbox.ebay.com',
};

// marketplace id -> 默认结算币种（ISO 4217；按卖家站点如实映射，未列出的留空）
const CURRENCY = {
  EBAY_US: 'USD', EBAY_CA: 'CAD', EBAY_GB: 'GBP', EBAY_AU: 'AUD',
  EBAY_FR: 'EUR', EBAY_DE: 'EUR', EBAY_IT: 'EUR', EBAY_ES: 'EUR',
  EBAY_NL: 'EUR', EBAY_AT: 'EUR', EBAY_IE: 'EUR', EBAY_BE: 'EUR',
  EBAY_GR: 'EUR', EBAY_CH: 'CHF', EBAY_DK: 'DKK', EBAY_SE: 'SEK',
  EBAY_NO: 'NOK', EBAY_PL: 'PLN', EBAY_JP: 'JPY', EBAY_HK: 'HKD',
  EBAY_SG: 'SGD', EBAY_MY: 'MYR', EBAY_PH: 'PHP', EBAY_TW: 'TWD',
  EBAY_NZ: 'NZD', EBAY_ZA: 'ZAR', EBAY_IL: 'ILS', EBAY_CZ: 'CZK',
};

// 确切 OAuth scope 字面串（2026-10-07 见 eBay 官方 OAuth scope 总表 ebay.cn/newcms/d_devdocs_apis/4
// 与 inventory_api 文档；均为只读 scope）
const SCOPE_BASE = 'https://api.ebay.com/oauth/api_scope';
const SCOPES = [
  `${SCOPE_BASE}/sell.inventory.readonly`,
  `${SCOPE_BASE}/sell.fulfillment.readonly`,
  `${SCOPE_BASE}/sell.account.readonly`,
].join(' ');

const META = {
  id: 'ebay',
  name: { zh: 'eBay', en: 'eBay' },
  category: 'crossborder',
  // 代码就绪、失败路径已对真实端点验证、normalize 用官方示例报文验证；无真实卖家凭证，正向未用真实店铺验证
  status: 'self',
  authType: 'oauth2',
  // 默认日配额极宽（Inventory 200 万、Fulfillment Order 10 万、Account 2.5 万）；500ms 保守间隔，429 由 ctx.request 退避
  requestGapMs: 500,
  resources: ['products', 'orders', 'inventory'],
  credentialFields: [
    {
      key: 'env', required: true, secret: false,
      label: { zh: '环境', en: 'Environment' },
      placeholder: { zh: 'production / sandbox，默认 production', en: 'production / sandbox, production by default' },
    },
    {
      key: 'marketplaceId', required: true, secret: false,
      label: { zh: 'Marketplace ID', en: 'Marketplace ID' },
      placeholder: { zh: '默认 EBAY_US，如 EBAY_GB / EBAY_DE', en: 'Default EBAY_US, e.g. EBAY_GB / EBAY_DE' },
    },
    {
      key: 'clientId', required: true, secret: false,
      label: { zh: 'App ID（Client ID）', en: 'App ID (Client ID)' },
      placeholder: { zh: 'Developer Portal 里 Production keyset 的 App ID', en: 'App ID of your Production keyset in the Developer Portal' },
    },
    {
      key: 'clientSecret', required: true, secret: true,
      label: { zh: 'Cert ID（Client Secret）', en: 'Cert ID (Client Secret)' },
      placeholder: { zh: 'keyset 的 Cert ID（REST 不需要 Dev ID）', en: 'Cert ID of the keyset (Dev ID is not needed for REST)' },
    },
    {
      key: 'refreshToken', required: true, secret: true,
      label: { zh: 'User Refresh Token', en: 'User Refresh Token' },
      placeholder: { zh: '在 Developer Portal 完成一次 OAuth 授权后取得的刷新令牌', en: 'Refresh token obtained after completing OAuth consent in the Developer Portal' },
    },
  ],
  official: {
    docs: 'https://www.edp.ebay.com/develop/guides/sell/authorization',
    signup: 'https://developer.ebay.com/',
    devapps: 'https://www.edp.ebay.com/develop/guides-v2/get-started-with-ebay-apis',
  },
  scopes: [
    'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
    'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
    'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
  ],
  needs: [
    '需加入 eBay Developers Program（约 1 个工作日审批），生成 Production keyset，并在 Developer Portal 网页完成一次授权取得 User Refresh Token。',
    '本机无公网回调地址：用 Portal 网页授权即可，盈脉之后用 Refresh Token 直连，不需要 localhost 回调。',
    '个人、个体工商户、企业与工作室均可注册开发者；Buy 类 API 才需额外 Growth Check，本适配器只用 Sell 只读接口。',
  ],
  regions: [
    'EBAY_US', 'EBAY_GB', 'EBAY_DE', 'EBAY_AU', 'EBAY_CA', 'EBAY_FR',
    'EBAY_IT', 'EBAY_ES', 'EBAY_NL', 'EBAY_CH', 'EBAY_AT', 'EBAY_IE',
    'EBAY_HK', 'EBAY_MY', 'EBAY_PH', 'EBAY_PL', 'EBAY_SG', 'EBAY_TW',
  ],
};

// ── 内存态：User access token 缓存（绝不落盘） ──
const tokenCache = new Map(); // refreshToken -> { accessToken, expiresAt }

function host(creds) {
  return HOSTS[String(creds.env || 'production').toLowerCase()] || HOSTS.production;
}
function tokenUrl(creds) {
  return `https://${host(creds)}/identity/v1/oauth2/token`;
}
function apiBase(creds) {
  return `https://${host(creds)}`;
}
function marketplaceId(creds) {
  return String(creds.marketplaceId || 'EBAY_US').trim() || 'EBAY_US';
}
function currencyFor(mid) {
  return CURRENCY[mid] || '';
}

// 用 refresh_token grant 裸 POST 令牌端点（Basic 认证、form 编码），换取/复用 User access token
async function getAccessToken(creds, force) {
  const key = String(creds.refreshToken || '');
  if (!key) throw new Error('missing refresh token');
  if (!force) {
    const hit = tokenCache.get(key);
    if (hit && Date.now() < hit.expiresAt) return hit.accessToken;
  }
  const basic = Buffer.from(`${String(creds.clientId || '')}:${String(creds.clientSecret || '')}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: key,
    // scope 不传则沿用授权时授予的 scope（官方：可选；传则须为子集）
  });
  const res = await fetch(tokenUrl(creds), {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: body.toString(),
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* 非 JSON */ }
  if (!res.ok) {
    const msg = (json && (json.error || json.error_description)) ? String(json.error || json.error_description) : `oauth ${res.status}`;
    const e = new Error(`ebay_oauth_${res.status}:${msg}`);
    e.status = res.status;
    throw e;
  }
  const accessToken = String(json.access_token || '');
  if (!accessToken) throw new Error('ebay_no_access_token');
  const ttlSec = Number(json.expires_in) || 7200;
  // 2h 时效，提前 120s 刷新
  tokenCache.set(key, { accessToken, expiresAt: Date.now() + Math.max(60, ttlSec - 120) * 1000 });
  return accessToken;
}

// 供共享层 401 时调用：丢弃内存中的访问令牌缓存，下次请求自动换新
async function refreshCredentials(creds) {
  if (creds && creds.refreshToken) tokenCache.delete(String(creds.refreshToken));
  return {};
}

// 每次 API 请求注入：Authorization Bearer、X-EBAY-C-MARKETPLACE-ID、Accept
async function buildInit(creds, url, init) {
  const token = await getAccessToken(creds, false);
  const headers = Object.assign({}, (init && init.headers) || {});
  headers['Authorization'] = `Bearer ${token}`;
  headers['X-EBAY-C-MARKETPLACE-ID'] = marketplaceId(creds);
  headers['Accept'] = 'application/json';
  return Object.assign({}, init, { headers });
}

function qs(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== '' && obj[k] != null)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`).join('&');
}
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// ── 连接测试 ──
async function test(creds, ctx) {
  const need = ['marketplaceId', 'clientId', 'clientSecret', 'refreshToken'];
  if (need.some((k) => !String(creds[k] || '').trim())) {
    return { ok: false, error: ctx.t('conn_cred_required') };
  }
  // 1) 先用 refresh_token 换 User access token；失败即视为凭证无效（401）
  try {
    await getAccessToken(creds, true);
  } catch {
    return { ok: false, error: ctx.t('conn_invalid_token') };
  }
  // 2) 请求真实轻量端点 Sell Account getPrivilege，验证令牌与站点
  const r = await ctx.request(`${apiBase(creds)}/sell/account/v1/privilege`);
  if (r.error) return { ok: false, error: r.error };
  if (!r.json || (r.json.sellerRegistrationCompleted !== true && !r.json.sellingLimit)) {
    return { ok: false, error: ctx.t('conn_shop_not_found') };
  }
  const mid = marketplaceId(creds);
  return {
    ok: true,
    // getPrivilege 响应仅含 sellerRegistrationCompleted / sellingLimit，不返回用户名；shop_name 按站点拼接
    shop_name: `eBay（${mid}）`,
    shop_domain: mid,
    currency: currencyFor(mid),
    plan: '',
  };
}

// ── 订单状态映射（eBay order.fulfillmentStatus / paymentStatus -> 统一五态） ──
// 口径：FULFILLMENT_COMPLETE->completed；FULFILLMENT_STARTED->shipped；
//       paymentStatus=PAID 且未发货->paid；PENDING/资金待处理->pending；cancelState=CANCEL_CLOSED->cancelled
function orderStatus(order) {
  const cs = order.cancelStatus && order.cancelStatus.cancelState;
  if (cs === 'CANCEL_CLOSED' || cs === 'CANCELLED') return 'cancelled';
  const fs = order.orderFulfillmentStatus;
  if (fs === 'FULFILLMENT_COMPLETE') return 'completed';
  if (fs === 'FULFILLMENT_STARTED') return 'shipped';
  const ps = order.orderPaymentStatus;
  if (ps === 'PAID') return 'paid';
  if (ps === 'PENDING' || ps === 'FAILED_PENDING_FUNDS') return 'pending';
  return 'pending';
}

// ── Orders 归一化：展开 lineItems 为明细行 ──
function normalizeOrder(order, shopName) {
  const out = [];
  const status = orderStatus(order);
  // 收货地址：Fulfillment API 在 fulfillmentStartInstructions[0].shippingStep.shipTo 返回
  const inst = (order.fulfillmentStartInstructions || [])[0] || {};
  const shipTo = inst.shippingStep && inst.shippingStep.shipTo ? inst.shippingStep.shipTo : {};
  const contact = shipTo.contactAddress || {};
  // 买家：仅返回 eBay username（2025-09-26 起部分 US 用户返回不可变 user id）；邮箱/电话 API 不提供，留空
  const buyerUser = (order.buyer && order.buyer.username) || '';
  const pricing = order.pricingSummary || {};
  const shipSum = num(pricing.delivery && pricing.delivery.value);
  const taxSum = num(pricing.tax && pricing.tax.value);
  const discSum = num(pricing.discount && pricing.discount.value);
  const totalSum = num(pricing.amountPaid && pricing.amountPaid.value) || num(pricing.total && pricing.total.value);
  const lines = order.lineItems || [];
  lines.forEach((line, i) => {
    const qty = Number(line.quantity) || 1;
    const unit = num(line.price && line.price.value);
    const currency = (line.price && line.price.currency)
      || (pricing.subtotal && pricing.subtotal.currency) || '';
    const isFirst = i === 0;
    out.push({
      _coll: 'orders',
      ext_key: `ebay:order${order.orderId}L${i + 1}`,
      order_no: order.orderId,
      parent_order_no: order.orderId,
      platform: 'ebay',
      shop_name: shopName,
      platform_order_id: order.orderId,
      platform_product_id: line.legacyItemId || '',
      platform_variant_id: line.lineItemId || '',
      platform_sku: line.sku || '',
      product_name: line.title || '',
      qty,
      unit_price: unit,
      total_amount: qty * unit,
      currency,
      status,
      // Fulfillment API 提供 buyer username 与收货地址；邮箱/电话不提供，如实留空
      buyer: buyerUser,
      buyer_name: shipTo.fullName || '',
      buyer_email: '',
      buyer_phone: '',
      ship_country: contact.countryCode || '',
      ship_province: contact.stateOrProvince || '',
      ship_city: contact.city || '',
      ship_zip: contact.postalCode || '',
      ship_address: [contact.addressLine1, contact.addressLine2].filter(Boolean).join(' '),
      order_shipping: isFirst ? shipSum : 0,
      order_tax: isFirst ? taxSum : 0,
      order_discount: isFirst ? discSum : 0,
      order_total: isFirst ? totalSum : 0,
      platform_created_at: order.creationDate || '',
      platform_updated_at: order.lastModifiedDate || '',
    });
  });
  return out;
}

// ── 商品归一化：inventoryItem + offer 合并 ──
// inventoryItem: { sku, product{title,images{images[{imageUrl}]}}, availability{shipToLocationAvailability{quantity}}, inventoryItemGroupKeys[] }
// offer: { offerId, sku, marketplaceId, status(PUBLISHED/UNPUBLISHED/ENDED), price{value,currency}, listingId, availableQuantity }
function normalizeListing(item, offer, shopName, currency) {
  const sku = item.sku || '';
  const groupKeys = item.inventoryItemGroupKeys || [];
  const groupId = groupKeys[0] || sku;
  const product = item.product || {};
  const imgs = product.images && product.images.images ? product.images.images : [];
  const avail = item.availability
    && item.availability.shipToLocationAvailability
    ? item.availability.shipToLocationAvailability.quantity
    : null;
  const offerPrice = offer && offer.price ? num(offer.price.value) : 0;
  const offerCurrency = offer && offer.price && offer.price.currency ? offer.price.currency : (currency || '');
  // 刊登状态：有 PUBLISHED offer 为 active；否则为 inactive（无 offer / ENDED / UNPUBLISHED）
  const status = offer && offer.status === 'PUBLISHED' ? 'active' : 'inactive';
  return {
    _coll: 'listings',
    ext_key: `ebay:p${groupId}v${sku}`,
    platform: 'ebay',
    shop_name: shopName,
    platform_product_id: sku,
    platform_product_group: groupId,
    platform_variant_id: sku,
    platform_inventory_item_id: sku,
    platform_sku: sku,
    title: product.title || sku,
    listing_price: offerPrice,
    currency: offerCurrency,
    url: offer && offer.listingId ? `https://www.ebay.com/itm/${offer.listingId}` : '',
    image: imgs[0] && imgs[0].imageUrl ? imgs[0].imageUrl : '',
    vendor: '',
    platform_available: Number.isFinite(Number(avail)) ? Number(avail) : null,
    status,
    platform_updated_at: '',
  };
}

// ── 库存归一化：getInventoryItems 的 availability.shipToLocationAvailability.quantity ──
function normalizeInventory(items) {
  const out = [];
  for (const it of items || []) {
    const sku = it.sku || '';
    if (!sku) continue;
    const avail = it.availability && it.availability.shipToLocationAvailability
      ? it.availability.shipToLocationAvailability.quantity : 0;
    out.push({
      _coll: '_inventory',
      platform_inventory_item_id: sku,
      platform_available: Number.isFinite(Number(avail)) ? Number(avail) : 0,
    });
  }
  return out;
}

async function fetchResource(creds, resource, cursor, ctx) {
  const base = apiBase(creds);
  const mid = marketplaceId(creds);
  const shopName = `eBay（${mid}）`;
  const cur = currencyFor(mid) || ctx.shopCurrency || '';
  const records = [];
  let nextCursor = cursor || '';

  if (resource === 'orders') {
    // 增量：filter=lastmodifieddate:[start..now]；首次无游标时回看 90 天
    const since = cursor ? new Date(cursor).toISOString()
      : new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const until = new Date().toISOString();
    let offset = 0;
    const limit = 50; // Fulfillment getOrders limit 默认 50
    for (;;) {
      const q = qs({ filter: `lastmodifieddate:[${since}..${until}]`, order: 'lastmodifieddate', limit, offset });
      const r = await ctx.request(`${base}/sell/fulfillment/v1/order?${q}`);
      if (r.error || !r.json) break;
      const orders = r.json.orders || [];
      for (const o of orders) {
        records.push(...normalizeOrder(o, shopName));
        if (o.lastModifiedDate && o.lastModifiedDate > nextCursor) nextCursor = o.lastModifiedDate;
      }
      offset += orders.length;
      const total = Number(r.json.total) || 0;
      if (!orders.length || offset >= total) break;
    }
    return { records, nextCursor };
  }

  if (resource === 'products') {
    // getInventoryItems 翻页取 SKU/产品/可用数量；再按 SKU getOffers 合并 listing 价格与刊登状态
    let offset = 0;
    const limit = 200; // getInventoryItems limit 1-200
    for (;;) {
      const q = qs({ limit, offset });
      const r = await ctx.request(`${base}/sell/inventory/v1/inventory_item?${q}`);
      if (r.error || !r.json) break;
      const items = r.json.inventoryItems || [];
      for (const it of items) {
        // 按 SKU 取 offer（getOffers 必需 sku）；同一 SKU 可能有固定价+拍卖两条，取第一条 PUBLISHED
        const oq = qs({ sku: it.sku, limit: 100, offset: 0 });
        const orr = await ctx.request(`${base}/sell/inventory/v1/offer?${oq}`);
        const offers = (orr.json && orr.json.offers) || [];
        const offer = offers.find((o) => o.status === 'PUBLISHED') || offers[0] || null;
        records.push(normalizeListing(it, offer, shopName, cur));
      }
      offset += items.length;
      const total = Number(r.json.total) || 0;
      if (!items.length || offset >= total) break;
    }
    return { records, nextCursor };
  }

  if (resource === 'inventory') {
    let offset = 0;
    const limit = 200;
    for (;;) {
      const q = qs({ limit, offset });
      const r = await ctx.request(`${base}/sell/inventory/v1/inventory_item?${q}`);
      if (r.error || !r.json) break;
      const items = r.json.inventoryItems || [];
      records.push(...normalizeInventory(items));
      offset += items.length;
      const total = Number(r.json.total) || 0;
      if (!items.length || offset >= total) break;
    }
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
  getAccessToken,
  orderStatus,
  normalizeOrder,
  normalizeListing,
  normalizeInventory,
  marketplaceId,
  currencyFor,
  qs,
};
