// Amazon（亚马逊 Selling Partner API）店铺适配器：用卖家自己的凭证在本机直连。
// 鉴权 = LWA 刷新令牌换访问令牌 + AWS SigV4 签名（service=execute-api），纯本机、零服务器。
// 灵感引擎工坊 · bin1732

const crypto = require('crypto');
const zlib = require('zlib');

const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
const SIGN_SERVICE = 'execute-api';

// 区域 host 与 SigV4 签名区域映射（2026-10-07 实时核验 developer-docs.amazon.com/sp-api/docs/sp-api-endpoints）
const REGIONS = {
  NA: {
    label: 'North America',
    host: 'sellingpartnerapi-na.amazon.com',
    awsRegion: 'us-east-1',
    defaultMarketplace: 'ATVPDKIKX0DER', // US
    defaultMarketplaceName: 'US',
  },
  EU: {
    label: 'Europe',
    host: 'sellingpartnerapi-eu.amazon.com',
    awsRegion: 'eu-west-1',
    defaultMarketplace: 'A1F83G8C2ARO7P', // GB（英语区默认，可改为 DE/FR/IT/ES 等）
    defaultMarketplaceName: 'GB',
  },
  FE: {
    label: 'Far East',
    host: 'sellingpartnerapi-fe.amazon.com',
    awsRegion: 'us-west-2',
    defaultMarketplace: 'A1VC38T7YXB528', // JP
    defaultMarketplaceName: 'JP',
  },
};

const META = {
  id: 'amazon',
  name: { zh: 'Amazon（亚马逊）', en: 'Amazon' },
  category: 'crossborder',
  // 代码就绪、失败路径已对真实端点验证、normalize 用官方示例报文验证；无真实卖家凭证，正向未用真实店铺验证
  status: 'self',
  authType: 'oauth2-aws',
  requestGapMs: 2000, // Orders 桶约 0.0167/s、Sellers 0.016/s，其余更宽；2s 保守间隔，429 由 ctx.request 退避
  resources: ['products', 'orders', 'inventory'],
  credentialFields: [
    {
      key: 'region', required: true, secret: false,
      label: { zh: '售卖区域', en: 'Selling region' },
      placeholder: { zh: 'NA / EU / FE', en: 'NA / EU / FE' },
    },
    {
      key: 'marketplaceId', required: false, secret: false,
      label: { zh: 'Marketplace ID（可空）', en: 'Marketplace ID (optional)' },
      placeholder: { zh: '可空，按区域默认；如 US=ATVPDKIKX0DER', en: 'Optional; defaults by region, e.g. US=ATVPDKIKX0DER' },
    },
    {
      key: 'sellerId', required: true, secret: false,
      label: { zh: 'Seller / Merchant ID', en: 'Seller / Merchant ID' },
      placeholder: { zh: '卖家编号（Seller Central 右上角）', en: 'Seller ID (top-right of Seller Central)' },
    },
    {
      key: 'clientId', required: true, secret: false,
      label: { zh: 'LWA Client ID', en: 'LWA Client ID' },
      placeholder: { zh: '应用的 Client ID（以 amzn1.application-oa2-client 开头）', en: 'Your app Client ID' },
    },
    {
      key: 'clientSecret', required: true, secret: true,
      label: { zh: 'LWA Client Secret', en: 'LWA Client Secret' },
      placeholder: { zh: '应用的 Client Secret', en: 'Your app Client Secret' },
    },
    {
      key: 'refreshToken', required: true, secret: true,
      label: { zh: 'LWA Refresh Token', en: 'LWA Refresh Token' },
      placeholder: { zh: '自助授权后获得的刷新令牌（以 Atzr| 开头）', en: 'Refresh token from self-authorization (starts with Atzr|)' },
    },
    {
      key: 'awsAccessKeyId', required: true, secret: false,
      label: { zh: 'AWS Access Key ID', en: 'AWS Access Key ID' },
      placeholder: { zh: '关联 SP-API 应用的 IAM 用户密钥', en: 'IAM user key linked to your SP-API app' },
    },
    {
      key: 'awsSecretAccessKey', required: true, secret: true,
      label: { zh: 'AWS Secret Access Key', en: 'AWS Secret Access Key' },
      placeholder: { zh: 'IAM 用户私有访问密钥', en: 'IAM user secret access key' },
    },
  ],
  official: {
    docs: 'https://developer-docs.amazon.com/sp-api/docs/welcome',
    signup: 'https://developer.amazon.com/',
    devapps: 'https://developer-docs.amazon.com/sp-api/docs/registering-your-application',
  },
  scopes: [
    'getOrders (orders_v0)',
    'getOrderItems',
    'getMarketplaceParticipations (sellers_v1)',
    'getInventorySummaries (fba_inventory_v1)',
    'reports GET_MERCHANT_LISTINGS_ALL_DATA',
  ],
  needs: [
    '需注册为 SP-API 开发者并创建私有应用（Private Developer），个人/个体工商户/企业均可申请，资料审核以 Amazon 为准。',
    '需在 AWS 配置一个具备 SP-API 调用权限的 IAM 用户并把 Access Key 填入应用。',
    '本机无公网回调地址：用 Seller Central「Develop Apps」里的 Authorize app 自助授权，直接拿到 Refresh Token 粘贴即可。',
  ],
  regions: ['NA', 'EU', 'FE'],
};

// ── 内存态：LWA 访问令牌缓存（绝不落盘） ──
const tokenCache = new Map(); // refreshToken -> { accessToken, expiresAt }

function regionConfig(creds) {
  const r = String(creds.region || 'NA').toUpperCase();
  return REGIONS[r] || REGIONS.NA;
}
function marketplaceId(creds) {
  const r = regionConfig(creds);
  return String(creds.marketplaceId || '').trim() || r.defaultMarketplace;
}
function apiBase(creds) {
  return `https://${regionConfig(creds).host}`;
}

// 换取/复用 LWA 访问令牌；force=true 时强制刷新
async function getAccessToken(creds, force) {
  const key = String(creds.refreshToken || '');
  if (!key) throw new Error('missing refresh token');
  if (!force) {
    const hit = tokenCache.get(key);
    if (hit && Date.now() < hit.expiresAt) return hit.accessToken;
  }
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: key,
    client_id: String(creds.clientId || ''),
    client_secret: String(creds.clientSecret || ''),
  });
  const res = await fetch(LWA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: body.toString(),
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* 非 JSON */ }
  if (!res.ok) {
    const msg = (json && json.error) ? String(json.error) : `LWA ${res.status}`;
    const e = new Error(`lwa_${res.status}:${msg}`);
    e.status = res.status;
    throw e;
  }
  const accessToken = String(json.access_token || '');
  if (!accessToken) throw new Error('lwa_no_access_token');
  const ttlSec = Number(json.expires_in) || 3600;
  tokenCache.set(key, { accessToken, expiresAt: Date.now() + Math.max(60, ttlSec - 120) * 1000 });
  return accessToken;
}

// 供共享层 401 时调用：丢弃内存中的访问令牌缓存，下次请求自动换新
async function refreshCredentials(creds) {
  if (creds && creds.refreshToken) tokenCache.delete(String(creds.refreshToken));
  return {};
}

// ── AWS SigV4（纯 Node crypto） ──
function hmac(key, data) { return crypto.createHmac('sha256', key).update(data, 'utf8').digest(); }
function sha256Hex(data) { return crypto.createHash('sha256').update(data, 'utf8').digest('hex'); }
function amzDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

// AWS UriEncode：在 encodeURIComponent 基础上额外编码 ! * ' ( )，空格为 %20
function awsUriEncode(str) {
  return encodeURIComponent(String(str))
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

// SigV4 规范查询串：解析参数→按键名排序（同名按值）→逐个 AWS UriEncode；空值保留 key=。
// 纯函数、不依赖网络/令牌；实际请求 URL 保持不变，仅签名用此规范化结果。
function canonicalQueryString(rawSearch) {
  let s = String(rawSearch || '');
  if (s.startsWith('?')) s = s.slice(1);
  if (!s) return '';
  const pairs = s.split('&').filter(Boolean).map((kv) => {
    const eq = kv.indexOf('=');
    const k = eq >= 0 ? kv.slice(0, eq) : kv;
    const v = eq >= 0 ? kv.slice(eq + 1) : '';
    return [decodeURIComponent(k), decodeURIComponent(v)];
  });
  pairs.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
    if (a[1] !== b[1]) return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
    return 0;
  });
  return pairs.map(([k, v]) => `${awsUriEncode(k)}=${awsUriEncode(v)}`).join('&');
}

// 对一次 SP-API 请求做 SigV4 签名，返回带签名头的 init
async function buildInit(creds, url, init) {
  const token = await getAccessToken(creds, false);
  const r = regionConfig(creds);
  const u = new URL(url);
  const method = (init.method || 'GET').toUpperCase();
  const payload = init.body != null ? String(init.body) : '';

  const amz = amzDate(new Date());
  const headers = Object.assign({}, init.headers || {});
  delete headers.host; // 由 URL 决定
  delete headers.Host;
  headers.host = u.host;
  headers['x-amz-date'] = amz;
  headers['x-amz-access-token'] = token;
  headers['user-agent'] = headers['user-agent'] || 'YingMai/4.6.0 (Language=Node.js; Platform=Windows)';

  const signedNames = Object.keys(headers).map((h) => h.toLowerCase()).sort();
  const canonicalHeaders = signedNames.map((h) => `${h}:${String(headers[h]).trim()}\n`).join('');
  const signedHeaders = signedNames.join(';');
  const canonicalRequest = [
    method,
    u.pathname,
    canonicalQueryString(u.search),
    canonicalHeaders,
    signedHeaders,
    sha256Hex(payload),
  ].join('\n');

  const dateStamp = amz.slice(0, 8);
  const scope = `${dateStamp}/${r.awsRegion}/${SIGN_SERVICE}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amz, scope, sha256Hex(canonicalRequest)].join('\n');

  const kDate = hmac('AWS4' + String(creds.awsSecretAccessKey || ''), dateStamp);
  const kRegion = hmac(kDate, r.awsRegion);
  const kService = hmac(kRegion, SIGN_SERVICE);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  headers.authorization =
    `AWS4-HMAC-SHA256 Credential=${String(creds.awsAccessKeyId || '')}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { method, headers, body: method === 'GET' || method === 'HEAD' ? undefined : payload };
}

function qs(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== '' && obj[k] != null)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
    .join('&');
}

// ── 连接测试 ──
async function test(creds, ctx) {
  const need = ['region', 'sellerId', 'clientId', 'clientSecret', 'refreshToken', 'awsAccessKeyId', 'awsSecretAccessKey'];
  if (need.some((k) => !String(creds[k] || '').trim())) {
    return { ok: false, error: ctx.t('conn_cred_required') };
  }
  // 1) 先用 refresh_token 换 LWA 访问令牌；失败即视为凭证无效
  try {
    await getAccessToken(creds, true);
  } catch {
    return { ok: false, error: ctx.t('conn_invalid_token') };
  }
  // 2) 请求真实轻量端点 Sellers v1，验证签名与授权
  const r = await ctx.request(`${apiBase(creds)}/sellers/v1/marketplaceParticipations`);
  if (r.error) return { ok: false, error: r.error };
  const list = (r.json && Array.isArray(r.json.payload)) ? r.json.payload : [];
  const wantMp = marketplaceId(creds);
  const hit = list.find((p) => p.marketplace && p.marketplace.id === wantMp) || list[0];
  if (!hit || !hit.marketplace) return { ok: false, error: ctx.t('conn_shop_not_found') };
  const mp = hit.marketplace;
  const storeName = hit.storeName || mp.name || mp.countryCode || '';
  return {
    ok: true,
    shop_name: `Amazon（${storeName || mp.name || ''}）`.trim(),
    shop_domain: String(creds.sellerId || ''),
    currency: mp.defaultCurrencyCode || '',
    plan: '',
  };
}

// ── Orders 归一化 ──
function orderStatus(os) {
  switch (os) {
    case 'Pending':
    case 'PendingAvailability':
    case 'InvoiceUnconfirmed': // 欧盟发票未确认/付款未完成，仍属待处理
      return 'pending';
    case 'Unshipped':
      return 'paid';
    case 'PartiallyShipped':
    case 'Shipped': // Orders v0 无妥投/完成事件，Shipped 即发货完成
      return 'shipped';
    case 'Canceled':
    case 'Unfulfillable':
      return 'cancelled';
    default:
      return 'pending';
  }
}
function money(obj) { return Number(obj && obj.Amount) || 0; }

function normalizeOrder(order, items, shopName) {
  const out = [];
  const status = orderStatus(order.OrderStatus);
  const currency = (order.OrderTotal && order.OrderTotal.CurrencyCode) || '';
  const lines = items || [];
  let shipSum = 0; let taxSum = 0; let discSum = 0;
  lines.forEach((it) => {
    shipSum += money(it.ShippingPrice);
    taxSum += money(it.ItemTax);
    discSum += money(it.PromotionDiscount);
  });
  lines.forEach((it, i) => {
    const qty = Number(it.QuantityOrdered) || 1;
    const unit = money(it.ItemPrice);
    const isFirst = i === 0;
    out.push({
      _coll: 'orders',
      ext_key: `amazon:order${order.AmazonOrderId}L${i + 1}`,
      order_no: order.AmazonOrderId,
      parent_order_no: order.AmazonOrderId,
      platform: 'amazon',
      shop_name: shopName,
      platform_order_id: order.AmazonOrderId,
      platform_product_id: it.ASIN || '',
      platform_variant_id: it.OrderItemId || '',
      platform_sku: it.SellerSKU || '',
      product_name: it.Title || '',
      qty,
      unit_price: unit,
      total_amount: qty * unit - money(it.PromotionDiscount),
      currency: (it.ItemPrice && it.ItemPrice.CurrencyCode) || currency,
      status,
      // 买家 PII（姓名/邮箱/地址/电话）需 Restricted Data Token 且可能需审核；本适配器不申请，一律留空
      buyer: '', buyer_name: '', buyer_email: '', buyer_phone: '',
      ship_country: '', ship_province: '', ship_city: '', ship_zip: '', ship_address: '',
      order_shipping: isFirst ? shipSum : 0,
      order_tax: isFirst ? taxSum : 0,
      order_discount: isFirst ? discSum : 0,
      order_total: isFirst ? money(order.OrderTotal) : 0,
      platform_created_at: order.PurchaseDate || '',
      platform_updated_at: order.LastUpdateDate || '',
    });
  });
  return out;
}

// ── 商品报告 TSV 归一化（GET_MERCHANT_LISTINGS_ALL_DATA） ──
function pickCol(headers, keys) {
  for (const want of keys) {
    const idx = headers.findIndex((h) => h && String(h).trim().toLowerCase() === want);
    if (idx >= 0) return idx;
  }
  for (const want of keys) {
    const idx = headers.findIndex((h) => h && String(h).trim().toLowerCase().includes(want));
    if (idx >= 0) return idx;
  }
  return -1;
}

function normalizeListingsTsv(text, shopName, currency) {
  const out = [];
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim() !== '' && !l.startsWith('#'));
  if (!lines.length) return out;
  const headers = lines[0].split('\t').map((h) => h.replace(/^"|"$/g, '').trim());
  const iSku = pickCol(headers, ['sku']);
  const iAsin = pickCol(headers, ['asin1', 'asin']);
  const iTitle = pickCol(headers, ['product-name', 'product name', 'title', 'name']);
  const iPrice = pickCol(headers, ['your-price', 'price', 'our-price']);
  const iQty = pickCol(headers, ['quantity', 'available']);
  const iStatus = pickCol(headers, ['status']);
  for (let li = 1; li < lines.length; li += 1) {
    const cols = lines[li].split('\t').map((c) => c.replace(/^"|"$/g, '').trim());
    const sku = iSku >= 0 ? cols[iSku] : '';
    if (!sku) continue;
    const rawStatus = iStatus >= 0 ? String(cols[iStatus] || '').toLowerCase() : 'open';
    const status = (rawStatus.startsWith('closed') || rawStatus === 'inactive') ? 'inactive' : 'active';
    out.push({
      _coll: 'listings',
      ext_key: `amazon:p${sku}v${sku}`,
      platform: 'amazon',
      shop_name: shopName,
      platform_product_id: iAsin >= 0 ? cols[iAsin] : '',
      platform_product_group: iAsin >= 0 ? cols[iAsin] : '',
      platform_variant_id: sku,
      platform_inventory_item_id: sku,
      platform_sku: sku,
      title: iTitle >= 0 ? cols[iTitle] : sku,
      listing_price: iPrice >= 0 ? Number(cols[iPrice]) || 0 : 0,
      currency: currency || '',
      url: '',
      image: '',
      vendor: '',
      platform_available: iQty >= 0 ? (Number.isFinite(Number(cols[iQty])) ? Number(cols[iQty]) : null) : null,
      status,
      platform_updated_at: '',
    });
  }
  return out;
}

// ── FBA 库存归一化 ──
function normalizeInventory(summaries) {
  const out = [];
  for (const s of summaries || []) {
    const sku = s.sellerSku || '';
    if (!sku) continue;
    const det = s.inventoryDetails || {};
    out.push({
      _coll: '_inventory',
      platform_inventory_item_id: sku,
      platform_available: Number(det.fulfillableQuantity) || 0,
    });
  }
  return out;
}

// ── Reports 管线：createReport → 轮询 → getReportDocument → 下载 TSV ──
async function fetchListingsReport(creds, ctx, shopName, currency) {
  const mid = marketplaceId(creds);
  const base = apiBase(creds);
  const created = await ctx.request(`${base}/reports/2021-06-30/reports`, {
    method: 'POST',
    body: { reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA', marketplaceIds: [mid] },
  });
  if (created.error || !created.json || !created.json.reportId) return [];
  const reportId = created.json.reportId;

  let docId = '';
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 10000));
    const rep = await ctx.request(`${base}/reports/2021-06-30/reports/${encodeURIComponent(reportId)}`);
    const ps = rep.json && rep.json.processingStatus;
    if (ps === 'DONE') { docId = rep.json.reportDocumentId || ''; break; }
    if (ps === 'FATAL' || ps === 'CANCELLED') return [];
  }
  if (!docId) return [];

  const doc = await ctx.request(`${base}/reports/2021-06-30/documents/${encodeURIComponent(docId)}`);
  const url = doc.json && doc.json.documentDownloadUrl;
  if (!url) return [];

  // 文档下载地址是 S3 预签名 URL，不带签名头，直接取
  const res = await fetch(url);
  if (!res.ok) return [];
  const buf = Buffer.from(await res.arrayBuffer());
  const raw = doc.json.compressionAlgorithm === 'GZIP' ? zlib.gunzipSync(buf) : buf;
  return normalizeListingsTsv(raw.toString('utf-8'), shopName, currency);
}

async function fetchResource(creds, resource, cursor, ctx) {
  const mid = marketplaceId(creds);
  const base = apiBase(creds);
  const shopName = `Amazon（${mid}）`;
  const records = [];
  let nextCursor = cursor || '';

  if (resource === 'orders') {
    // 增量：LastUpdatedAfter；首次无游标时回看 90 天
    const since = cursor
      ? new Date(cursor).toISOString()
      : new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    let nextToken = '';
    for (;;) {
      const q = qs({ LastUpdatedAfter: since, MarketplaceIds: mid, MaxResultsPerPage: 100, NextToken: nextToken || undefined });
      const r = await ctx.request(`${base}/orders/v0/orders?${q}`);
      if (r.error || !r.json || !r.json.payload) break;
      const orders = r.json.payload.Orders || [];
      for (const o of orders) {
        const itRes = await ctx.request(`${base}/orders/v0/orders/${encodeURIComponent(o.AmazonOrderId)}/orderItems`);
        const items = (itRes.json && itRes.json.payload && itRes.json.payload.OrderItems) || [];
        records.push(...normalizeOrder(o, items, shopName));
        if (o.LastUpdateDate && o.LastUpdateDate > nextCursor) nextCursor = o.LastUpdateDate;
      }
      nextToken = r.json.payload.NextToken || '';
      if (!nextToken) break;
    }
    return { records, nextCursor };
  }

  if (resource === 'products') {
    const recs = await fetchListingsReport(creds, ctx, shopName, ctx.shopCurrency || '');
    records.push(...recs);
    return { records, nextCursor };
  }

  if (resource === 'inventory') {
    let nextToken = '';
    for (;;) {
      const q = qs({
        details: 'true', granularityType: 'Marketplace', granularityId: mid,
        marketplaceIds: mid, nextToken: nextToken || undefined,
      });
      const r = await ctx.request(`${base}/fba/inventory/v1/summaries?${q}`);
      if (r.error || !r.json || !r.json.payload) break;
      records.push(...normalizeInventory(r.json.payload.inventorySummaries));
      nextToken = (r.json.pagination && r.json.pagination.nextToken) || '';
      if (!nextToken) break;
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
  canonicalQueryString,
  normalizeOrder,
  normalizeListingsTsv,
  normalizeInventory,
  marketplaceId,
};
