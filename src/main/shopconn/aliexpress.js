// AliExpress（速卖通）店铺适配器：用卖家自己的 AppKey/AppSecret + OAuth access_token 在本机直连 TOP 网关。
// 鉴权 = OAuth2 授权码换 access_token（自研上线后约 1 年长效）+ TOP HMAC_MD5 业务签名，纯本机、零服务器。
// 灵感引擎工坊 · bin1732

const crypto = require('crypto');

// ── TOP 网关（2026-10-07 实时核验 developer.alibaba.com How to Invoke API） ──
// eco=国内环境 https://eco.taobao.com/router/rest；api=海外环境 https://api.taobao.com/router/rest
const GATEWAYS = {
  eco: 'https://eco.taobao.com/router/rest',
  api: 'https://api.taobao.com/router/rest',
};
const OAUTH_AUTHORIZE = 'https://oauth.aliexpress.com/authorize';
const OAUTH_TOKEN = 'https://oauth.aliexpress.com/token';

const META = {
  id: 'aliexpress',
  name: { zh: 'AliExpress（速卖通）', en: 'AliExpress' },
  category: 'crossborder',
  // 代码就绪、失败路径已对真实端点验证、normalize 用官方示例报文验证；
  // 但生产连接必须企业主体 + 营业执照 + 入驻聚石塔 + 软著/源码并经约 7 个工作日审核，个人无法自助，故定 gated
  status: 'gated',
  authType: 'oauth2-top',
  // 官方仅零散给出 QPS/QPM 示例（部分 80 QPS、个别 30 次/分/appkey），无逐接口精确总表（R7）；
  // 桌面自用场景保守取 1s 间隔，遇限流由 ctx.request 按 Retry-After 退避，不写死未证实配额
  requestGapMs: 1000,
  resources: ['products', 'orders', 'inventory'],
  credentialFields: [
    {
      key: 'gateway', required: true, secret: false,
      label: { zh: 'TOP 网关', en: 'TOP gateway' },
      placeholder: { zh: 'eco（国内环境，默认）/ api（海外环境）', en: 'eco (China env, default) / api (overseas env)' },
    },
    {
      key: 'sellerId', required: false, secret: false,
      label: { zh: 'Seller ID', en: 'Seller ID' },
      placeholder: { zh: '卖家登录 ID，形如 cn10001234（可空，仅用于展示店铺名）', en: 'Seller login id, e.g. cn10001234 (optional, display only)' },
    },
    {
      key: 'appKey', required: true, secret: false,
      label: { zh: 'App Key', en: 'App Key' },
      placeholder: { zh: '自研应用通过审核后，开发者后台概览里的 AppKey', en: 'AppKey from your approved in-house app overview' },
    },
    {
      key: 'appSecret', required: true, secret: true,
      label: { zh: 'App Secret（密钥）', en: 'App Secret (secret)' },
      placeholder: { zh: '自研应用的 AppSecret，仅用于本机签名，不会上传', en: 'AppSecret of your app, used for local signing only, never uploaded' },
    },
    {
      key: 'accessToken', required: true, secret: true,
      label: { zh: 'Access Token（session）', en: 'Access Token (session)' },
      placeholder: { zh: 'OAuth 授权后换取的 access_token（即 session）；自研上线后约 1 年有效，过期需重新授权', en: 'access_token from OAuth (the session); about 1 year for live in-house apps; re-authorize when expired' },
    },
  ],
  official: {
    docs: 'https://developer.alibaba.com/docs/doc.htm?treeId=556&articleId=108974&docType=1',
    signup: 'https://open.aliexpress.com/',
    devapps: 'https://developer.alibaba.com/docs/doc.htm?treeId=444&articleId=107344&docType=1',
  },
  scopes: [
    'aliexpress.postproduct.redefining.findproductinfolistquery',
    'aliexpress.postproduct.redefining.findaeproductbyid',
    'aliexpress.trade.seller.orderlist.get',
    'aliexpress.solution.order.info.get',
  ],
  needs: [
    '自研接入必须为企业主体：上传企业营业执照、入驻聚石塔、提供软著/源码/系统架构，资料审核约 7 个工作日；个人无法自助。',
    '多个经营 API 标注“聚石塔内调用”，本机直连是否放行、是否限制出口 IP 需以测试 AppKey 实测为准（见教程 notes R1）。',
    'OAuth 授权码 code 约 3 分钟一次性；自研 access_token 上线后约 1 年长效，失效需重新走授权。',
    '订单查询时间参数为美国太平洋时间（PST/PDT），与签名 timestamp（GMT+8）是两套时区，勿混。',
  ],
  // 速卖通对卖家是单一全球站点 + 统一卖家中心，不按站点分套授权；订单按买家国家/币种区分
  regions: ['global'],
};

// ── 时间格式化 ──
function pad(n) { return String(n).padStart(2, '0'); }
// GMT+8 墙钟（签名 timestamp 要求，yyyy-MM-dd HH:mm:ss，服务端容忍 ±10 分钟）
function gmt8Now() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date()).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  if (parts.hour === '24') parts.hour = '00';
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
// 美国太平洋时间（订单 create/modified 查询参数要求；Intl 自动处理 PST/PDT）
function pacificTime(d) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  if (parts.hour === '24') parts.hour = '00';
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
// Pacific 墙钟字符串 -> ISO（用于 platform_created_at 展示）
function pacificToIso(s) {
  if (!s) return '';
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return String(s);
  // 用 Intl 把该 Pacific 墙钟换算为 UTC：先取此刻 Pacific 的 offset，再偏移
  const asUTC = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  // 求当前 America/Los_Angeles 相对 UTC 的偏移（分钟）
  const now = new Date();
  const pacStr = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Los_Angeles', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(now).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  const utcStr = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(now).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  const offsetMin = (Date.UTC(+utcStr.year, +utcStr.month - 1, +utcStr.day, +utcStr.hour % 24, +utcStr.minute, +utcStr.second)
    - Date.UTC(+pacStr.year, +pacStr.month - 1, +pacStr.day, +pacStr.hour % 24, +pacStr.minute, +pacStr.second)) / 60000;
  return new Date(asUTC - offsetMin * 60000).toISOString();
}

function gatewayUrl(creds) {
  const g = String(creds.gateway || 'eco').toLowerCase();
  return GATEWAYS[g] || GATEWAYS.eco;
}

// ── TOP 签名（2026-10-07 实时核验 developer.alibaba.com How to Invoke API，MD5 向量已复算通过） ──
// 1) 取所有请求参数（公共+业务），剔除 sign 与空值；2) 按参数名 ASCII 升序；3) key 与 value 直接拼接；
// 4) hmac 模式：hmac_md5(appSecret, 串)；md5 模式：md5(appSecret+串+appSecret)；5) 转 32 位大写 hex。
function buildSignBase(params) {
  return Object.keys(params)
    .filter((k) => k !== 'sign' && params[k] !== '' && params[k] != null)
    .sort()
    .map((k) => k + String(params[k]))
    .join('');
}
function digestBase(secret, base, method) {
  if (method === 'md5') {
    return crypto.createHash('md5').update(String(secret) + base + String(secret), 'utf8').digest('hex').toUpperCase();
  }
  return crypto.createHmac('md5', String(secret)).update(base, 'utf8').digest('hex').toUpperCase();
}
function signRequest(secret, params, method) {
  return digestBase(secret, buildSignBase(params), method || 'hmac');
}
// application/x-www-form-urlencoded 编码（值已含 JSON 串的业务参数也在此整体 URL 编码）
function formEncode(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== '' && obj[k] != null)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
    .join('&');
}

// 成功响应：{ "<method>_response": { result: ... } }；失败响应：{ error_response: { code,msg,sub_code,sub_msg } }
function unwrapEnvelope(json) {
  if (!json || typeof json !== 'object') return { data: null };
  if (json.error_response) return { error: json.error_response };
  for (const k of Object.keys(json)) {
    if (k.endsWith('_response')) return { data: json[k] };
  }
  return { data: json };
}
function friendlyTopError(er) {
  if (!er) return '';
  return String(er.sub_msg || er.sub_code || er.msg || er.code || 'TOP error').slice(0, 160);
}

// 调一次 TOP 网关：组装公共参数 + 业务参数，HMAC_MD5 签名，form POST
async function callTop(creds, ctx, method, biz) {
  const params = {
    method,
    app_key: creds.appKey,
    sign_method: 'hmac',
    session: creds.accessToken,
    timestamp: gmt8Now(),
    format: 'json',
    v: '2.0',
  };
  if (biz) Object.assign(params, biz);
  params.sign = signRequest(creds.appSecret, params, 'hmac');
  const r = await ctx.request(gatewayUrl(creds), {
    method: 'POST',
    body: formEncode(params),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (r.error) return { error: r.error };
  const env = unwrapEnvelope(r.json);
  if (env.error) return { error: friendlyTopError(env.error) };
  return { data: env.data };
}

// ── OAuth（2026-10-07 实时核验 jaq-doc 用户授权介绍） ──
// 授权链接：https://oauth.aliexpress.com/authorize?response_type=code&client_id&redirect_uri&state&view=web&sp=ae
function buildAuthUrl(creds, redirect, state) {
  const u = new URL(OAUTH_AUTHORIZE);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', String(creds.appKey || ''));
  u.searchParams.set('redirect_uri', String(redirect || ''));
  u.searchParams.set('view', 'web');
  u.searchParams.set('sp', 'ae');
  if (state) u.searchParams.set('state', String(state));
  return u.toString();
}
// 裸 POST form：code 换 access_token（约 3 分钟、一次性）。返回原始 json。
async function exchangeCode(creds, code, redirect) {
  const body = formEncode({
    grant_type: 'authorization_code',
    client_id: creds.appKey,
    client_secret: creds.appSecret,
    code: String(code || ''),
    redirect_uri: String(redirect || ''),
    sp: 'ae',
  });
  const res = await fetch(OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* 非 JSON */ }
  if (!res.ok || !json || json.error || !json.access_token) {
    const e = new Error(`aliexpress_token_${res.status}:${(json && (json.error_description || json.error || json.sub_msg)) || ''}`);
    e.status = res.status;
    throw e;
  }
  return json;
}
// 备用：用 refresh_token 换新 access_token（自研长效场景一般不主动刷，401/失效时提示重新授权）
async function refreshAccessToken(creds, refreshToken) {
  const body = formEncode({
    grant_type: 'refresh_token',
    client_id: creds.appKey,
    client_secret: creds.appSecret,
    refresh_token: String(refreshToken || ''),
    sp: 'ae',
  });
  const res = await fetch(OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* 非 JSON */ }
  if (!res.ok || !json || !json.access_token) throw new Error('aliexpress_refresh_failed');
  return json;
}

// ── 订单状态映射（官方状态码，2026-10-07 核验）-> 统一五态 ──
// PLACE_ORDER_SUCCESS 待买家付款；WAIT_SELLER_SEND_GOODS 待发货；SELLER_PART_SEND_GOODS 部分发货；
// WAIT_BUYER_ACCEPT_GOODS 待买家收货；FUND_PROCESSING 资金处理中；IN_ISSUE 纠纷；IN_FROZEN 冻结；FINISH 结束；IN_CANCEL 取消
function orderStatus(os) {
  switch (os) {
    case 'WAIT_SELLER_SEND_GOODS':
    case 'FUND_PROCESSING':
      return 'paid';
    case 'SELLER_PART_SEND_GOODS':
    case 'WAIT_BUYER_ACCEPT_GOODS':
      return 'shipped';
    case 'FINISH':
      return 'completed';
    case 'IN_CANCEL':
      return 'cancelled';
    case 'PLACE_ORDER_SUCCESS':
    case 'IN_ISSUE':
    case 'IN_FROZEN':
    case 'WAIT_SELLER_EXAMINE_MONEY':
    case 'RISK_CONTROL':
    default:
      return 'pending';
  }
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function money(m) { return m ? num(m.amount) : 0; }
function moneyCur(m, fb) { return (m && m.currency_code) || fb || 'USD'; }
function firstImage(urls) {
  if (!urls) return '';
  return String(urls).split(';').map((s) => s.trim()).filter(Boolean)[0] || '';
}

// ── 商品归一化：列表项 + 详情 SKU ──
// listItem: {product_id, subject, currency_code, product_min_price, product_max_price, image_u_r_ls, gmt_modified, src}
// detail: findaeproductbyid 返回（SKU 嵌套未抓全正文，R6；防御式扫描 SKU 数组）
function extractSkus(detail) {
  const root = (detail && detail.result) ? detail.result : (detail || {});
  const scan = (obj) => {
    if (Array.isArray(obj)) return obj;
    if (!obj || typeof obj !== 'object') return null;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (Array.isArray(v) && v.length && v[0] && (v[0].sku_id != null || v[0].sku_quantity != null || v[0].sku_code != null)) return v;
    }
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v && typeof v === 'object') {
        const found = scan(v);
        if (found) return found;
      }
    }
    return null;
  };
  return scan(root) || [];
}
function skuIdOf(sku) { return String(sku.sku_id != null ? sku.sku_id : (sku.sku_code != null ? sku.sku_code : '0')); }
function skuPriceOf(sku, listItem) {
  if (sku.sku_price != null && Number.isFinite(Number(sku.sku_price))) return Number(sku.sku_price);
  return num(listItem.product_min_price);
}
function skuStockOf(sku) {
  const n = Number(sku.sku_quantity != null ? sku.sku_quantity : sku.available_quantity);
  return Number.isFinite(n) ? n : null;
}
function skuAttrText(sku) {
  const arr = sku.sku_attrs || sku.sku_attribute_list || [];
  if (!Array.isArray(arr)) return '';
  return arr.map((a) => (a.attr_name ? `${a.attr_name}:${a.attr_value}` : `${a.pName || ''}:${a.pValue || ''}`)).filter(Boolean).join(' / ');
}

function normalizeListing(listItem, detail, shopName, currency) {
  const out = [];
  const group = String(listItem.product_id || '');
  const cur = listItem.currency_code || currency || 'USD';
  const title = listItem.subject || group;
  const img = firstImage(listItem.image_u_r_ls);
  const skus = extractSkus(detail);
  if (!skus.length) {
    // 无 SKU 结构：单品，以 product_min_price 为价
    out.push({
      _coll: 'listings',
      ext_key: `aliexpress:p${group}v0`,
      platform: 'aliexpress',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: '0',
      platform_inventory_item_id: `p${group}`,
      platform_sku: '',
      title,
      listing_price: num(listItem.product_min_price),
      currency: cur,
      url: `https://www.aliexpress.com/item/${group}.html`,
      image: img,
      vendor: '',
      platform_available: null,
      status: 'active',
      platform_updated_at: listItem.gmt_modified || '',
    });
    return out;
  }
  for (const sku of skus) {
    const sid = skuIdOf(sku);
    const attr = skuAttrText(sku);
    out.push({
      _coll: 'listings',
      ext_key: `aliexpress:p${group}v${sid}`,
      platform: 'aliexpress',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: sid,
      platform_inventory_item_id: sid,
      platform_sku: sku.sku_code || sid,
      title: attr ? `${title} · ${attr}` : title,
      listing_price: skuPriceOf(sku, listItem),
      currency: cur,
      url: `https://www.aliexpress.com/item/${group}.html`,
      image: img,
      vendor: '',
      platform_available: skuStockOf(sku),
      status: 'active',
      platform_updated_at: listItem.gmt_modified || '',
    });
  }
  return out;
}

function normalizeInventory(listItem, detail) {
  const out = [];
  const group = String(listItem.product_id || '');
  const skus = extractSkus(detail);
  if (!skus.length) {
    out.push({ _coll: '_inventory', platform_inventory_item_id: `p${group}`, platform_available: null });
    return out;
  }
  for (const sku of skus) {
    out.push({ _coll: '_inventory', platform_inventory_item_id: skuIdOf(sku), platform_available: skuStockOf(sku) });
  }
  return out;
}

// ── 订单归一化：listOrder（订单列表，含 product_list）+ detail（solution.order.info.get，买家/地址） ──
function normalizeOrder(listOrder, detail, shopName) {
  const out = [];
  const status = orderStatus(listOrder.order_status);
  const cur = moneyCur(listOrder.pay_amount, 'USD');
  const det = detail || {};
  const buyerInfo = det.buyer_info || {};
  const addr = det.receipt_address || {};
  const buyerName = addr.contact_person || [buyerInfo.first_name, buyerInfo.last_name].filter(Boolean).join(' ') || listOrder.buyer_signer_fullname || '';
  const buyerPhone = addr.mobile_no || addr.phone_number || '';
  const lines = (listOrder.product_list && (listOrder.product_list.aeop_order_product_dto || listOrder.product_list)) || [];
  const arr = Array.isArray(lines) ? lines : [lines];
  arr.forEach((line, i) => {
    const qty = Number(line.product_count) || 1;
    const unit = money(line.product_unit_price);
    const isFirst = i === 0;
    out.push({
      _coll: 'orders',
      ext_key: `aliexpress:order${listOrder.order_id}L${i + 1}`,
      order_no: String(listOrder.order_id),
      parent_order_no: String(listOrder.order_id),
      platform: 'aliexpress',
      shop_name: shopName,
      platform_order_id: String(listOrder.order_id),
      platform_product_id: String(line.product_id || ''),
      platform_variant_id: '',
      platform_sku: line.sku_code || '',
      product_name: line.product_name || '',
      qty,
      unit_price: unit,
      total_amount: qty * unit,
      currency: moneyCur(line.product_unit_price, cur),
      status,
      buyer: buyerInfo.login_id || listOrder.buyer_login_id || '',
      buyer_name: buyerName,
      buyer_email: '',
      buyer_phone: buyerPhone,
      ship_country: addr.country || '',
      ship_province: addr.province || '',
      ship_city: addr.city || '',
      ship_zip: addr.zip || '',
      ship_address: addr.detail_address || '',
      order_shipping: isFirst ? money(line.logistics_amount) : 0,
      order_tax: 0,
      order_discount: 0,
      order_total: isFirst ? money(listOrder.pay_amount) : 0,
      platform_created_at: pacificToIso(listOrder.gmt_create),
      platform_updated_at: pacificToIso(listOrder.gmt_update),
    });
  });
  if (!out.length) {
    out.push({
      _coll: 'orders',
      ext_key: `aliexpress:order${listOrder.order_id}L1`,
      order_no: String(listOrder.order_id), parent_order_no: String(listOrder.order_id),
      platform: 'aliexpress', shop_name: shopName, platform_order_id: String(listOrder.order_id),
      platform_product_id: '', platform_variant_id: '', platform_sku: '', product_name: '',
      qty: 1, unit_price: money(listOrder.pay_amount), total_amount: money(listOrder.pay_amount),
      currency: cur, status, buyer: buyerInfo.login_id || listOrder.buyer_login_id || '',
      buyer_name: buyerName, buyer_email: '', buyer_phone: buyerPhone,
      ship_country: addr.country || '', ship_province: addr.province || '', ship_city: addr.city || '',
      ship_zip: addr.zip || '', ship_address: addr.detail_address || '',
      order_shipping: 0, order_tax: 0, order_discount: 0, order_total: money(listOrder.pay_amount),
      platform_created_at: pacificToIso(listOrder.gmt_create), platform_updated_at: pacificToIso(listOrder.gmt_update),
    });
  }
  return out;
}

// 从订单列表 result 中取 target_list 数组（兼容对象包裹与直数组）
function orderListArr(result) {
  if (!result) return [];
  const tl = result.target_list || result;
  if (Array.isArray(tl)) return tl;
  if (tl.aeop_order_item_dto) return Array.isArray(tl.aeop_order_item_dto) ? tl.aeop_order_item_dto : [tl.aeop_order_item_dto];
  return [];
}
// 从商品列表 result 中取 display dto 数组
function productListArr(result) {
  if (!result) return [];
  const wrap = result.aeop_a_e_product_display_d_t_o_list || result.aeop_a_e_product_display_d_t_o_list || result;
  if (Array.isArray(wrap)) return wrap;
  if (wrap.aeop_ae_product_display_sample_dto) {
    return Array.isArray(wrap.aeop_ae_product_display_sample_dto) ? wrap.aeop_ae_product_display_sample_dto : [wrap.aeop_ae_product_display_sample_dto];
  }
  return [];
}

// ── 连接测试：用真实只读轻量 method（findproductinfolistquery 第 1 页 1 条）验证 AppKey/签名/session ──
async function test(creds, ctx) {
  if (!String(creds.appKey || '').trim() || !String(creds.appSecret || '').trim() || !String(creds.accessToken || '').trim()) {
    return { ok: false, error: ctx.t('conn_cred_required') };
  }
  const biz = { aeop_a_e_product_list_query: JSON.stringify({ current_page: 1, page_size: 1 }) };
  const r = await callTop(creds, ctx, 'aliexpress.postproduct.redefining.findproductinfolistquery', biz);
  if (r.error) return { ok: false, error: r.error };
  const seller = String(creds.sellerId || 'shop');
  return {
    ok: true,
    shop_name: `AliExpress（${seller}）`,
    shop_domain: seller,
    currency: 'USD',
    plan: '',
  };
}

// ── fetchResource ──
async function fetchResource(creds, resource, cursor, ctx) {
  const records = [];
  let nextCursor = cursor || '';
  const seller = String(creds.sellerId || 'shop');
  const shopName = `AliExpress（${seller}）`;
  const currency = ctx.shopCurrency || 'USD';

  if (resource === 'products' || resource === 'inventory') {
    // 列表翻页：current_page/page_size；gmt_modified 作水位
    const pageSize = 50;
    let page = 1;
    const maxPage = 200; // 防失控
    let maxMod = nextCursor || '';
    for (; page <= maxPage; page += 1) {
      const biz = { aeop_a_e_product_list_query: JSON.stringify({ current_page: page, page_size: pageSize }) };
      const r = await callTop(creds, ctx, 'aliexpress.postproduct.redefining.findproductinfolistquery', biz);
      if (r.error || !r.data) break;
      const result = r.data.result || {};
      const items = productListArr(result);
      if (!items.length) break;
      for (const it of items) {
        // 增量水位：仅拉 gmt_modified 晚于上次的商品（首次无水位全量）
        if (nextCursor && it.gmt_modified && String(it.gmt_modified) <= String(nextCursor)) continue;
        const d = await callTop(creds, ctx, 'aliexpress.postproduct.redefining.findaeproductbyid', { product_id: it.product_id });
        const detail = d.data || {};
        if (resource === 'products') records.push(...normalizeListing(it, detail, shopName, currency));
        else records.push(...normalizeInventory(it, detail));
        if (it.gmt_modified && String(it.gmt_modified) > String(maxMod)) maxMod = String(it.gmt_modified);
      }
      const totalPage = Number(result.total_page) || page;
      if (page >= totalPage) break;
    }
    if (maxMod) nextCursor = maxMod;
    return { records, nextCursor };
  }

  if (resource === 'orders') {
    // 太平洋时间窗口：modified 增量必须同时带 create 窗口；未结束 ≤180 天、FINISH ≤30 天；FINISH 须显式传
    const now = Date.now();
    const endPst = pacificTime(new Date(now));
    // 起始前移 10 分钟防延迟落库漏单
    const startPst = pacificTime(new Date(now - (nextCursor ? 0 : 180 * 24 * 3600 * 1000) - 10 * 60000));
    const modifiedStart = nextCursor || pacificTime(new Date(now - 180 * 24 * 3600 * 1000));
    const orderMap = new Map(); // orderId -> 列表记录（含 product_list）
    // 分两轮：默认（不含 FINISH）+ 显式 FINISH（create 窗口 ≤30 天）
    const passes = [
      { status: '', createStart: startPst },
      { status: 'FINISH', createStart: pacificTime(new Date(now - 30 * 24 * 3600 * 1000)) },
    ];
    for (const pass of passes) {
      const pageSize = 50;
      let page = 1;
      for (; page <= 40; page += 1) {
        const query = {
          current_page: page,
          page_size: pageSize,
          create_date_start: pass.createStart,
          create_date_end: endPst,
          modified_date_start: modifiedStart,
          modified_date_end: endPst,
        };
        if (pass.status) query.order_status = pass.status;
        const r = await callTop(creds, ctx, 'aliexpress.trade.seller.orderlist.get', { param_aeop_order_query: JSON.stringify(query) });
        if (r.error || !r.data) break;
        const result = r.data.result || {};
        const list = orderListArr(result);
        for (const o of list) if (o.order_id != null) orderMap.set(String(o.order_id), o);
        const totalPage = Number(result.total_page) || page;
        if (page >= totalPage || !list.length) break;
      }
    }
    // 逐条详情（买家/地址）；列表本身已含 product_list 明细行，详情仅补充 buyer_info/receipt_address
    for (const oid of orderMap.keys()) {
      const listOrder = orderMap.get(oid);
      let detail = {};
      const d = await callTop(creds, ctx, 'aliexpress.solution.order.info.get', { param1: JSON.stringify({ order_id: oid, ext_info_bit_flag: 0 }) });
      if (d.data) detail = (d.data.result && d.data.result.data) || d.data.data || {};
      records.push(...normalizeOrder(listOrder, detail, shopName));
      const mod = listOrder.gmt_update || detail.gmt_modified;
      if (mod && String(mod) > String(nextCursor || '')) nextCursor = String(mod);
    }
    if (!nextCursor) nextCursor = modifiedStart;
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
  refreshAccessToken,
  buildSignBase,
  digestBase,
  signRequest,
  formEncode,
  callTop,
  orderStatus,
  normalizeOrder,
  normalizeListing,
  normalizeInventory,
  extractSkus,
  orderListArr,
  productListArr,
  gatewayUrl,
  pacificTime,
  gmt8Now,
  pacificToIso,
};
