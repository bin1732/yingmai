// 快手电商（快手小店）店铺适配器：用卖家自己的 App Key/Secret + OAuth access_token 在本机直连快手电商开放网关。
// 鉴权 = OAuth2 授权码（code 约 2 分钟一次性）换 access_token（约 48h）/ refresh_token（约 180 天）+ 业务签名（HMAC_SHA256 推荐 / MD5），纯本机、零服务器。
// 注意：商家开发者入驻须企业营业执照 + 电商产品销售与技术开发资质，审核约 1–3 个工作日；个人不可注册，个体户是否被认定为“企业”以审核为准。
//       本适配器按官方文档预先实现 OAuth/签名/端点，但 META.status 定 restricted，绝不承诺能从本机打通经营接口。
// 灵感引擎工坊 · bin1732

const crypto = require('crypto');

// ── 快手电商开放平台（2026-10-07 实时核验 research/domestic-b-research.md §2） ──
// 注意：电商开放平台独立于 open.kuaishou.com（通用小程序）；电商 API 在 open.kwaixiaodian.com / openapi.kwaixiaodian.com。
const OAUTH_AUTHORIZE = 'https://open.kwaixiaodian.com/oauth/authorize';
const GATEWAY = 'https://openapi.kwaixiaodian.com';
const TOKEN_ACCESS = GATEWAY + '/oauth2/access_token';
const TOKEN_REFRESH = GATEWAY + '/oauth2/refresh_token';

const META = {
  id: 'kuaishou',
  name: { zh: '快手电商（快手小店）', en: 'Kuaishou (Kwaixiaodian)' },
  category: 'domestic',
  // 代码按官方文档预实现（OAuth2 + HMAC_SHA256/MD5 签名 + open.order.*/open.item.* 端点）；但商家开发者入驻须企业营业执照 + 电商销售与技术开发资质，
  // 个人不可注册，个体工商户是否被认定为“企业”以实际审核为准。故严格定 restricted（不标 gated/self），needs 与教程如实写明资质门槛，绝不承诺能连上。
  status: 'restricted',
  authType: 'kwaixiaodian-oauth2',
  // 测试用户每用户每天 2000 次调用；正式应用有日额度，超限报 Exceed quota limit。逐接口 QPS 无总表。
  // 桌面自用场景保守取 1s 间隔，遇限流由 ctx.request 按 Retry-After/5xx 退避，不写死未证实配额。
  requestGapMs: 1000,
  resources: ['products', 'orders', 'inventory'],
  credentialFields: [
    {
      key: 'appId', required: true, secret: false,
      label: { zh: 'App ID（appkey）', en: 'App ID (appkey)' },
      placeholder: { zh: '商家开发者应用审核通过后分配的 appkey（app_id）', en: 'appkey (app_id) from your approved merchant-developer app' },
    },
    {
      key: 'appSecret', required: true, secret: true,
      label: { zh: 'App Secret（密钥）', en: 'App Secret (secret)' },
      placeholder: { zh: '用于 OAuth 换 token 的 app_secret，仅在本机使用，不会上传', en: 'app_secret used for OAuth token exchange, local only, never uploaded' },
    },
    {
      key: 'signSecret', required: false, secret: true,
      label: { zh: 'Sign Secret（业务签名密钥，可空）', en: 'Sign Secret (business signing key, optional)' },
      placeholder: { zh: '业务接口签名密钥 signSecret；若与 App Secret 相同可留空，留空则用 App Secret 签名', en: 'signSecret for business API signing; leave blank to reuse App Secret if identical' },
    },
    {
      key: 'accessToken', required: true, secret: true,
      label: { zh: 'Access Token', en: 'Access Token' },
      placeholder: { zh: 'OAuth 授权后换取的 access_token（约 48 小时有效）', en: 'access_token from OAuth (valid ~48h)' },
    },
    {
      key: 'refreshToken', required: false, secret: true,
      label: { zh: 'Refresh Token（可空）', en: 'Refresh Token (optional)' },
      placeholder: { zh: 'OAuth 返回的 refresh_token（约 180 天）；用于 access_token 过期后换新，可空', en: 'refresh_token from OAuth (valid ~180d); used to refresh the access token, optional' },
    },
  ],
  official: {
    docs: 'https://open.kwaixiaodian.com/',
    signup: 'https://open.kwaixiaodian.com/',
    devapps: 'https://open.kwaixiaodian.com/zone/new/docs/dev?pageSign=a068e6b0409a9ee55f5b6f5760ff9d391614263559910',
  },
  scopes: [
    'merchant_item（商品数据读写）',
    'merchant_order（订单信息读写）',
    'merchant_refund（售后信息读写）',
    'merchant_logistics（物流信息）',
  ],
  needs: [
    '商家开发者入驻须上传企业营业执照，法人信息与营业执照法人一致，经营范围需具备“电商产品销售和技术开发”相关资质；审核约 1–3 个工作日邮件通知。个人（无营业执照）不可注册；个体工商户营业执照是否被认定为“企业”需以平台实际审核为准。',
    '创建应用需填写回调地址（redirect_uri），授权成功后跳转并携带 code（约 2 分钟、一次性）；应用上线前需通过系统安全扫描（约 4–6 小时）。测试用户最多 5 名，授权关系默认 10 天后自动取消。',
    'access_token 约 48 小时（expires_in=172800 秒），refresh_token 约 180 天；每次刷新返回新 refresh_token，旧 refresh_token 5 分钟内失效，新 refresh_token 过期时间继承自上一个（总量递减）。',
    '买家 PII（姓名/电话/地址）受平台数据权限约束，未申请相应权限时拿不到明文；这些 PII 字段留空，不中断同步。',
    'method 取值与 param 精确字段名以登录控制台 API 文档为准；本适配器按官方字段形状预先实现，接入前建议在“在线测试工具”核对真实报文。',
  ],
  regions: ['中国大陆（快手小店，人民币 CNY）'],
};

// ── 工具 ──
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function epochMs() { return String(Date.now()); }

// ── 快手业务签名（research §2.2 系统参数说明：appkey/timestamp(ms)/access_token/version/param/method/sign/signMethod） ──
// 参与签名：所有系统参数剔除 sign 与空值，按参数名 ASCII 升序，key+value 直拼；
// signMethod=HMAC_SHA256（推荐）：以 signSecret 为 HMAC 密钥；signMethod=MD5：MD5 拼接结果。
// 注：signSecret 与 appSecret 的精确分工、是否首尾拼接未在本次抓取的正文逐字确认；默认用 signSecret||appSecret 作 HMAC key，接入前用真实 appkey 在在线测试工具核对。
function buildSignBase(params) {
  return Object.keys(params)
    .filter((k) => k !== 'sign' && params[k] !== '' && params[k] != null)
    .sort()
    .map((k) => k + String(params[k]))
    .join('');
}
function digestBase(secret, base, signMethod) {
  if (signMethod === 'MD5') {
    return crypto.createHash('md5').update(base, 'utf8').digest('hex');
  }
  return crypto.createHmac('sha256', String(secret)).update(base, 'utf8').digest('hex');
}
function signRequest(secret, params, signMethod) {
  return digestBase(secret, buildSignBase(params), signMethod || 'HMAC_SHA256');
}
function signKey(creds) { return creds.signSecret || creds.appSecret; }

// form 编码
function formEncode(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== '' && obj[k] != null)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
    .join('&');
}

// 成功：result === 1；失败：result != 1，看 error/error_msg 或业务码
// 非 JSON / 空响统一视为错误，绝不误判成功（防假阳性）。
function unwrapEnvelope(json) {
  if (!json || typeof json !== 'object') return { error: 'empty or non-JSON response from kuaishou gateway' };
  if (Number(json.result) === 1) return { data: json.data != null ? json.data : json };
  return { error: json };
}
function friendlyError(er) {
  if (!er) return '';
  if (typeof er === 'string') return er.slice(0, 160);
  return String(er.error_msg || er.message || er.error || er.err_no || er.error_code || er.err_no || er.result || 'kuaishou error').slice(0, 160);
}

// 调一次快手电商网关：组装系统参数 + param(JSON)，HMAC_SHA256 签名，form POST
async function callKuaishou(creds, ctx, method, biz) {
  const params = {
    appkey: creds.appId,
    timestamp: epochMs(),
    access_token: creds.accessToken,
    version: '1',
    method,
    signMethod: 'HMAC_SHA256',
    param: JSON.stringify(biz || {}),
  };
  params.sign = signRequest(signKey(creds), params, 'HMAC_SHA256');
  const r = await ctx.request(GATEWAY, {
    method: 'POST',
    body: formEncode(params),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (r.error) return { error: r.error };
  const env = unwrapEnvelope(r.json);
  if (env.error) return { error: friendlyError(env.error) };
  return { data: env.data };
}

// ── OAuth（research §2.2 完整流程） ──
// 授权页：https://open.kwaixiaodian.com/oauth/authorize?app_id=&redirect_uri=&scope=merchant_order,merchant_item&response_type=code&state=
function buildAuthUrl(creds, redirect, state) {
  const u = new URL(OAUTH_AUTHORIZE);
  u.searchParams.set('app_id', String(creds.appId || ''));
  u.searchParams.set('redirect_uri', String(redirect || ''));
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'merchant_item,merchant_order,merchant_refund,merchant_logistics');
  if (state) u.searchParams.set('state', String(state));
  return u.toString();
}
// code 换 access_token（GET /oauth2/access_token，code 约 2 分钟一次性）。返回原始 json。
async function exchangeCode(creds, code, redirect) {
  void redirect;
  const url = TOKEN_ACCESS + '?' + formEncode({
    app_id: creds.appId,
    grant_type: 'code',
    code: String(code || ''),
    app_secret: creds.appSecret,
  });
  const res = await fetch(url, { method: 'GET' });
  let json = null;
  try { json = await res.clone().json(); } catch { /* 非 JSON */ }
  if (!res.ok || !json || Number(json.result) !== 1 || !json.access_token) {
    const e = new Error(`kuaishou_token_${res.status}:${(json && (json.error_msg || json.error)) || ''}`);
    e.status = res.status;
    throw e;
  }
  return json;
}
// refresh_token 换新（POST /oauth2/refresh_token）。返回原始 json。
async function refreshCredentials(creds, ctx) {
  const body = formEncode({
    grant_type: 'refresh_token',
    refresh_token: creds.refreshToken,
    app_id: creds.appId,
    app_secret: creds.appSecret,
  });
  const res = await fetch(TOKEN_REFRESH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* 非 JSON */ }
  if (!res.ok || !json || Number(json.result) !== 1) {
    throw new Error(`kuaishou_refresh_${res.status}:${(json && (json.error_msg || json.error)) || ''}`);
  }
  const patch = { accessToken: json.access_token, refreshToken: json.refresh_token || creds.refreshToken };
  if (ctx && typeof ctx.persistCredentials === 'function') await ctx.persistCredentials(patch);
  return patch;
}

// ── 订单状态映射（快手 order_status -> 统一五态；具体枚举以控制台为准，此处按常见口径防御映射） ──
function orderStatus(s) {
  switch (String(s)) {
    case 'WAIT_BUYER_PAY':
    case 'PENDING_PAY':
    case '10':
      return 'pending';
    case 'WAIT_SELLER_SEND':
    case 'WAIT_SHIP':
    case '20':
      return 'paid';
    case 'SHIPPED':
    case 'IN_DELIVERY':
    case '30':
      return 'shipped';
    case 'SUCCESS':
    case 'COMPLETED':
    case '40':
      return 'completed';
    case 'CANCEL':
    case 'CLOSED':
    case '50':
      return 'cancelled';
    default:
      return 'pending';
  }
}

// 防御式取 SKU 数组
function skusOf(item) {
  if (!item) return [];
  const skus = item.skus || item.sku_list || item.sku;
  if (Array.isArray(skus)) return skus;
  if (skus && Array.isArray(skus.list)) return skus.list;
  return [];
}
function firstImage(item) {
  if (!item) return '';
  if (item.thumbnail_url) return String(item.thumbnail_url);
  if (item.img) return String(item.img);
  const imgs = item.img_list || item.images;
  if (Array.isArray(imgs)) return String((imgs[0] && (imgs[0].url || imgs[0])) || '');
  return '';
}

// ── 商品归一化：item = open.item.get / 商品列表项（按官方字段形状防御取值） ──
function normalizeListing(item, shopName, currency) {
  const out = [];
  const group = String(item.item_id || item.product_id || item.id || '');
  const cur = currency || 'CNY';
  const title = item.name || item.title || group;
  const img = firstImage(item);
  const skus = skusOf(item);
  if (!skus.length) {
    out.push({
      _coll: 'listings',
      ext_key: `kuaishou:p${group}v0`,
      platform: 'kuaishou',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: '0',
      platform_inventory_item_id: `i${group}`,
      platform_sku: item.sku_code || item.outer_sku_id || '',
      title,
      listing_price: num(item.price != null ? item.price : item.origin_price),
      currency: cur,
      url: '',
      image: img,
      vendor: '',
      platform_available: Number.isFinite(num(item.stock)) ? num(item.stock) : null,
      status: item.status === 1 || item.status === 'ON_SALE' ? 'active' : 'inactive',
      platform_updated_at: item.update_time || '',
    });
    return out;
  }
  for (const sku of skus) {
    const sid = String(sku.sku_id || sku.spec_id || sku.id || '');
    out.push({
      _coll: 'listings',
      ext_key: `kuaishou:p${group}v${sid}`,
      platform: 'kuaishou',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: sid,
      platform_inventory_item_id: sid,
      platform_sku: sku.sku_code || sku.outer_sku_id || sid,
      title: title,
      listing_price: num(sku.price != null ? sku.price : item.price),
      currency: cur,
      url: '',
      image: img,
      vendor: '',
      platform_available: Number.isFinite(num(sku.stock != null ? sku.stock : item.stock))
        ? num(sku.stock != null ? sku.stock : item.stock) : null,
      status: 'active',
      platform_updated_at: item.update_time || '',
    });
  }
  return out;
}

function normalizeInventory(item) {
  const out = [];
  const group = String(item.item_id || item.product_id || item.id || '');
  const skus = skusOf(item);
  if (!skus.length) {
    out.push({ _coll: '_inventory', platform_inventory_item_id: `i${group}`, platform_available: Number.isFinite(num(item.stock)) ? num(item.stock) : null });
    return out;
  }
  for (const sku of skus) {
    out.push({
      _coll: '_inventory',
      platform_inventory_item_id: String(sku.sku_id || sku.spec_id || sku.id || ''),
      platform_available: Number.isFinite(num(sku.stock != null ? sku.stock : item.stock)) ? num(sku.stock != null ? sku.stock : item.stock) : null,
    });
  }
  return out;
}

// ── 订单归一化：order = open.order.* 的单个订单 ──
function orderLines(order) {
  const d = order && (order.item_list || order.order_items || order.sku_list);
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.list)) return d.list;
  return [];
}
function normalizeOrder(order, shopName) {
  const out = [];
  const status = orderStatus(order.order_status != null ? order.order_status : order.status);
  const oid = String(order.order_id || order.id || '');
  const cur = 'CNY';
  // 买家/收货 PII 受平台数据权限约束，未授权时拿不到明文；如实取字段、取不到留空，不中断同步。
  const receiverName = order.receiver_name || order.post_receiver || order.buyer_name || '';
  const receiverPhone = order.receiver_tel || order.receiver_phone || order.post_tel || '';
  const lines = orderLines(order);
  lines.forEach((line, i) => {
    const qty = num(itemNum(line)) || 1;
    const unit = num(line.price != null ? line.price : line.unit_price);
    const isFirst = i === 0;
    out.push({
      _coll: 'orders',
      ext_key: `kuaishou:order${oid}L${i + 1}`,
      order_no: oid,
      parent_order_no: oid,
      platform: 'kuaishou',
      shop_name: shopName,
      platform_order_id: oid,
      platform_product_id: String(line.item_id || line.product_id || ''),
      platform_variant_id: String(line.sku_id || line.spec_id || ''),
      platform_sku: line.outer_sku_id || line.sku_code || '',
      product_name: line.item_name || line.title || '',
      qty,
      unit_price: unit,
      total_amount: num(line.pay_amount != null ? line.pay_amount : line.amount) || qty * unit,
      currency: cur,
      status,
      buyer: order.buyer_id || order.buyer_name || '',
      buyer_name: receiverName,
      buyer_email: '',
      buyer_phone: receiverPhone,
      ship_country: 'CN',
      ship_province: order.province || '',
      ship_city: order.city || '',
      ship_zip: '',
      ship_address: [order.town, order.address].filter(Boolean).join(' '),
      order_shipping: isFirst ? num(order.post_amount) : 0,
      order_tax: 0,
      order_discount: 0,
      order_total: isFirst ? num(order.order_total != null ? order.order_total : order.pay_amount) : 0,
      platform_created_at: order.create_time || '',
      platform_updated_at: order.update_time || '',
    });
  });
  if (!out.length) {
    out.push({
      _coll: 'orders',
      ext_key: `kuaishou:order${oid}L1`,
      order_no: oid, parent_order_no: oid,
      platform: 'kuaishou', shop_name: shopName, platform_order_id: oid,
      platform_product_id: '', platform_variant_id: '', platform_sku: '', product_name: '',
      qty: 1, unit_price: num(order.order_total), total_amount: num(order.order_total),
      currency: cur, status, buyer: order.buyer_id || '',
      buyer_name: receiverName, buyer_email: '', buyer_phone: receiverPhone,
      ship_country: 'CN', ship_province: order.province || '', ship_city: order.city || '',
      ship_zip: '', ship_address: order.address || '',
      order_shipping: 0, order_tax: 0, order_discount: 0, order_total: num(order.order_total),
      platform_created_at: order.create_time || '', platform_updated_at: order.update_time || '',
    });
  }
  return out;
}
function itemNum(line) { return line.item_num || line.num || line.count || line.quantity; }

function orderListArr(data) {
  if (!data) return [];
  const list = data.order_list || data.list || data.orders || data;
  if (Array.isArray(list)) return list;
  if (list && Array.isArray(list.order)) return list.order;
  return [];
}
function productListArr(data) {
  if (!data) return [];
  const list = data.item_list || data.list || data.products || data;
  if (Array.isArray(list)) return list;
  return [];
}

// ── 连接测试：先校验必填凭证；再对真实网关做一次轻量只读调用（订单列表第 1 页 1 条）。
// 任何失败（无效凭证/资质或 IP 不满足）一律 ok:false 并给可读信息，绝不假阳性。 ──
async function test(creds, ctx) {
  if (!String(creds.appId || '').trim() || !String(creds.appSecret || '').trim() || !String(creds.accessToken || '').trim()) {
    return { ok: false, error: ctx.t('conn_cred_required') };
  }
  const r = await callKuaishou(creds, ctx, 'open.order.list', { page: 1, page_size: 1 });
  if (r.error) return { ok: false, error: r.error };
  return {
    ok: true,
    shop_name: `快手小店（${creds.appId}）`,
    shop_domain: String(creds.appId),
    currency: 'CNY',
    plan: '',
  };
}

// ── fetchResource ──
async function fetchResource(creds, resource, cursor, ctx) {
  const records = [];
  let nextCursor = cursor || '';
  const shopName = `快手小店（${creds.appId || 'shop'}）`;
  const currency = ctx.shopCurrency || 'CNY';

  if (resource === 'products' || resource === 'inventory') {
    let page = 1;
    const size = 50;
    const maxPage = 200;
    for (; page <= maxPage; page += 1) {
      const biz = { page, page_size: size };
      const r = await callKuaishou(creds, ctx, 'open.item.list', biz);
      if (r.error || !r.data) break;
      const items = productListArr(r.data);
      if (!items.length) break;
      for (const it of items) {
        if (resource === 'products') records.push(...normalizeListing(it, shopName, currency));
        else records.push(...normalizeInventory(it));
      }
      if (items.length < size) break;
    }
    return { records, nextCursor };
  }

  if (resource === 'orders') {
    const size = 50;
    let page = 1;
    for (; page <= 40; page += 1) {
      const biz = { page, page_size: size };
      if (nextCursor) biz.update_time = nextCursor;
      const r = await callKuaishou(creds, ctx, 'open.order.list', biz);
      if (r.error || !r.data) break;
      const list = orderListArr(r.data);
      for (const o of list) {
        records.push(...normalizeOrder(o, shopName));
        if (o.update_time && String(o.update_time) > String(nextCursor || '')) nextCursor = String(o.update_time);
      }
      if (!list.length || list.length < size) break;
    }
    return { records, nextCursor };
  }

  return { records, nextCursor };
}

module.exports = {
  META,
  test,
  fetchResource,
  buildAuthUrl,
  exchangeCode,
  refreshCredentials,
  buildSignBase,
  digestBase,
  signRequest,
  signKey,
  formEncode,
  callKuaishou,
  unwrapEnvelope,
  friendlyError,
  orderStatus,
  normalizeOrder,
  normalizeListing,
  normalizeInventory,
  orderListArr,
  productListArr,
  skusOf,
};
