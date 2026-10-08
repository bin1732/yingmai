// 1688（阿里巴巴中国站/内贸批发）货源连接器：用采购商自己的 AppKey/AppSecret + OAuth access_token 在本机直连 AOP 网关。
// 鉴权 = OAuth2 授权码（授权页 auth.1688.com，两步换 token 流程官方正文未逐字确认，见下方注释）+ AOP HMAC_MD5 业务签名，纯本机、零服务器。
// 定位：买家侧跨店选品只读（com.alibaba.fenxiao.crossborder），关键词驱动；不做下单/支付/物流。
// 灵感引擎工坊 · bin1732

const crypto = require('crypto');

// ── AOP 网关（2026-10-07 实时核验 research/1688-research.md + developer.alibaba.com 签名文档） ──
// POST https://gw.open.1688.com/openapi/param2/1/{命名空间}/{API名}/{appKey}
// 命名空间（买家侧跨境/代发选品只读）：com.alibaba.fenxiao.crossborder
const GW_BASE = 'https://gw.open.1688.com/openapi/param2/1';
const NS_CROSSBORDER = 'com.alibaba.fenxiao.crossborder';
const OAUTH_AUTHORIZE = 'https://auth.1688.com/oauth/authorize';
// token 端点精确 URL：官方文档站 open.1688.com 为 SPA，本次未抓到正文（research §2.2 / §9-2）。
// 两步式 code→refresh_token→access_token 仅见于非官方 SDK（npm 1688-open-sdk），官方正文未确认；
// 下方 exchangeCode / refreshAccessToken 按该流程实现并在此显式标注，拿到真实 AppKey 后必须在控制台核对真实端点与字段。
const OAUTH_TOKEN_CODE = 'https://gw.open.1688.com/openapi/http/1/system.oauth2/getAuthorizationCode'; // 未在官方正文确认，待实测
const OAUTH_TOKEN_REFRESH = 'https://gw.open.1688.com/openapi/http/1/system.oauth2/getAccessTokenByRefreshToken'; // 未在官方正文确认，待实测

const META = {
  id: '1688',
  name: { zh: '1688 采购批发', en: '1688 Wholesale' },
  category: 'sourcing',
  // 代码就绪、失败路径已对真实网关验证、normalize 用按官方字段形状构造的报文验证；
  // 但生产连接必须企业/个体工商户主体 + 企业实名 + 代发/跨境选品解决方案白名单，纯个人（仅身份证）无法自助，故定 gated
  status: 'gated',
  authType: 'oauth2-aop',
  // 官方逐接口 QPS/QPM 无总表（SPA 内未抓到）；第三方实测约 10 QPS 仅供参考，桌面自用场景保守取 1.5s 间隔，
  // 遇限流由 ctx.request 按 Retry-After/5xx 退避，不写死未证实配额
  requestGapMs: 1500,
  // 货源选品是关键词驱动、没有“我的全量商品”；定时同步不拉取，故 resources 只放 products，
  // fetchResource('products') 在无关键词场景恒返回空记录（见该函数注释与台账口径）
  resources: ['products'],
  credentialFields: [
    {
      key: 'appKey', required: true, secret: false,
      label: { zh: 'App Key', en: 'App Key' },
      placeholder: { zh: '自用型应用通过解决方案白名单后，开发者后台概览里的 AppKey', en: 'AppKey from your approved in-house app overview' },
    },
    {
      key: 'appSecret', required: true, secret: true,
      label: { zh: 'App Secret（密钥）', en: 'App Secret (secret)' },
      placeholder: { zh: '自用型应用的 AppSecret，仅用于本机 AOP 签名，不会上传', en: 'AppSecret of your app, used for local AOP signing only, never uploaded' },
    },
    {
      key: 'accessToken', required: true, secret: true,
      label: { zh: 'Access Token（授权后填写）', en: 'Access Token (fill after OAuth)' },
      placeholder: { zh: '完成 OAuth 授权后换取的 access_token；失效/过期请重新授权', en: 'access_token obtained after OAuth; re-authorize when it expires or is rejected' },
    },
    {
      key: 'memberId', required: false, secret: false,
      label: { zh: 'Member ID（可空）', en: 'Member ID (optional)' },
      placeholder: { zh: '采购商登录会员 ID，形如 b2b-xxxx（可空，仅用于展示店铺名）', en: 'Buyer member id, e.g. b2b-xxxx (optional, display only)' },
    },
  ],
  official: {
    docs: 'https://open.1688.com/',
    signup: 'https://aop.alibaba.com/',
    devapps: 'https://auth.1688.com/',
  },
  scopes: [
    'com.alibaba.fenxiao.crossborder.product.search.keywordQuery',
    'com.alibaba.fenxiao.crossborder.product.search.queryProductDetail',
  ],
  needs: [
    '买家侧跨店选品/商详只读 API 归属 com.alibaba.fenxiao.crossborder，需“跨境 ERP/代发解决方案”白名单 + 企业实名认证；纯个人（仅身份证）无法自助。',
    '自用型应用不强制聚石塔（聚石塔仅对对外售卖的 ISV 强制），但需在开发者后台登记本机出口 IP 白名单；家庭动态 IP 变了要补报。',
    'OAuth 授权码两步换 token 的精确端点未在官方文档站正文逐字确认（SPA 抓不到正文），以登录后控制台“开发指南→授权”页为准。',
    '阶梯批发价/实时库存是否对买家侧商详透出未确认；有则映射、无则留空，不臆造。',
  ],
  // 1688 是中国大陆内贸站，商品标价与交易币种均为 CNY；无海外仓/多币种
  regions: ['CN（内贸站，人民币 CNY）'],
};

// ── 工具 ──
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function str(v) { return v == null ? '' : String(v); }
function epochSec() { return String(Math.floor(Date.now() / 1000)); }
function firstImage(urls) {
  if (!urls) return '';
  if (typeof urls === 'string') return urls.split(/[;,]/).map((s) => s.trim()).filter(Boolean)[0] || '';
  if (Array.isArray(urls)) return String(urls[0] || '').trim();
  return '';
}

// ── AOP 签名（2026-10-07 实时核验 developer.alibaba.com How to Invoke API / Overall Flow，与 TOP 同宗） ──
// 1) 取所有请求参数（系统+业务），剔除 _aop_signature 与空值；2) 按参数名 ASCII 升序；3) key 与 value 直接拼接；
// 4) hmac 模式（默认）：HMAC_MD5(appSecret, 串)；md5 模式：MD5(appSecret+串+appSecret)；5) 转 32 位大写 hex。
function buildSignBase(params) {
  return Object.keys(params)
    .filter((k) => k !== '_aop_signature' && params[k] !== '' && params[k] != null)
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
// application/x-www-form-urlencoded 编码
function formEncode(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== '' && obj[k] != null)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
    .join('&');
}

// 网关路径：/openapi/param2/1/{namespace}/{api}/{appKey}
function gatewayUrl(creds, api) {
  return `${GW_BASE}/${NS_CROSSBORDER}/${api}/${encodeURIComponent(creds.appKey || '')}`;
}

// 响应信封：AOP param2 成功通常直接返回业务 JSON（可能包一层 result/data）；失败为 {error_response:{code,msg,sub_code,sub_msg}}
function unwrapEnvelope(json) {
  if (!json || typeof json !== 'object') return { data: null };
  if (json.error_response) return { error: json.error_response };
  if (json.error) return { error: json.error };
  // 常见成功包裹：{ success:true, result:{...} } 或 { data:{...} }
  return { data: json.result != null ? json.result : (json.data != null ? json.data : json) };
}
function friendlyError(er) {
  if (!er) return '';
  return String(er.sub_msg || er.message || er.sub_code || er.msg || er.code || er.error_msg || '1688 error').slice(0, 160);
}

// 调一次 AOP 网关：组装系统参数 + 业务参数，HMAC_MD5 签名，form POST
async function callAop(creds, ctx, api, biz) {
  const params = {
    _aop_timestamp: epochSec(),
    access_token: creds.accessToken || '',
  };
  if (biz) Object.assign(params, biz);
  params._aop_signature = signRequest(creds.appSecret, params, 'hmac');
  const r = await ctx.request(gatewayUrl(creds, api), {
    method: 'POST',
    body: formEncode(params),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (r.error) return { error: r.error };
  const env = unwrapEnvelope(r.json);
  if (env.error) return { error: friendlyError(env.error) };
  return { data: env.data };
}

// ── OAuth（2026-10-07 多源交叉确认授权页；换 token 两步式未在官方正文确认，见文件头注释） ──
// 授权链接：https://auth.1688.com/oauth/authorize?client_id={appKey}&site=1688&redirect_uri={回调}&state={自定义态}
function buildAuthUrl(creds, redirect, state) {
  const u = new URL(OAUTH_AUTHORIZE);
  u.searchParams.set('client_id', String(creds.appKey || ''));
  u.searchParams.set('site', '1688');
  u.searchParams.set('redirect_uri', String(redirect || ''));
  if (state) u.searchParams.set('state', String(state));
  return u.toString();
}
// [未在官方正文确认] 第一步：code 换 refresh_token（端点与字段名以登录后官方控制台为准）
async function exchangeCode(creds, code, redirect) {
  const body = formEncode({
    app_key: creds.appKey,
    app_secret: creds.appSecret,
    grant_type: 'authorization_code',
    code: String(code || ''),
    redirect_uri: String(redirect || ''),
  });
  const res = await fetch(OAUTH_TOKEN_CODE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* 非 JSON */ }
  if (!res.ok || !json || !json.refresh_token) {
    const e = new Error(`c1688_token_${res.status}:${(json && (json.sub_msg || json.msg || json.error)) || ''}`);
    e.status = res.status;
    throw e;
  }
  return json;
}
// [未在官方正文确认] 第二步：refresh_token 换 access_token
async function refreshAccessToken(creds, refreshToken) {
  const body = formEncode({
    app_key: creds.appKey,
    app_secret: creds.appSecret,
    grant_type: 'refresh_token',
    refresh_token: String(refreshToken || ''),
  });
  const res = await fetch(OAUTH_TOKEN_REFRESH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* 非 JSON */ }
  if (!res.ok || !json || !json.access_token) throw new Error('c1688_refresh_failed');
  return json;
}

// ── 归一化工具（字段嵌套未在登录态逐字核对，做防御式取值；拿到真实报文后补全） ──
function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) { if (obj[k] != null && obj[k] !== '') return obj[k]; }
  return undefined;
}
// 在一层对象里宽松找 offerId
function offerIdOf(o) { return str(pick(o, ['offerId', 'offer_id', 'id', 'productID', 'productId'])); }
function titleOf(o) { return str(pick(o, ['subject', 'title', 'name', 'offerTitle', 'displaySubject'])) || '1688 offer'; }
function imgOf(o) { return firstImage(pick(o, ['imgUrl', 'imageUrl', 'image', 'imageUrlList', 'imgUrlList', 'img'])) || ''; }
function shopNameOf(o) {
  return str(pick(o, ['sellerCompanyName', 'companyName', 'sellerName', 'memberName', 'sellerNick', 'supplierName'])) || '1688 货源';
}
// 价格区间：优先 priceRange{priceFloor,priceCeiling}，退而取 priceFloor/priceCeiling/price/minPrice/maxPrice/consignPrice
function priceRangeOf(o) {
  const pr = o.priceRange || o.priceInfo || {};
  const lo = pick(pr, ['priceFloor', 'beginPrice', 'minPrice', 'price']) ?? pick(o, ['priceFloor', 'beginPrice', 'minPrice', 'consignPrice', 'price']);
  const hi = pick(pr, ['priceCeiling', 'endPrice', 'maxPrice']) ?? pick(o, ['priceCeiling', 'endPrice', 'maxPrice']);
  return { lo: num(lo), hi: num(hi) };
}
function moqOf(o) {
  return num(pick(o, ['moq', 'minOrderQuantity', 'amount', 'minOrder', 'startQuantity']));
}
function onePsaleOf(o) {
  const v = pick(o, ['isOnePsale', 'onePsale', 'isOnePSale']);
  if (v == null) return '';
  return (v === true || v === 'true' || v === 1 || v === '1') ? '一件代发' : '';
}

// 从搜索结果 data 里取 offer 数组（兼容多种包裹形状）
function offerListArr(data) {
  if (!data) return [];
  const candidates = [
    data.offerList, data.offers, data.result,
    (data.data && data.data.offerList), (data.result && data.result.offerList),
    (data.result && data.result.offers), data.list,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length) return c;
    if (c && Array.isArray(c.offer)) return c.offer;
    if (c && Array.isArray(c.list)) return c.list;
  }
  if (Array.isArray(data)) return data;
  return [];
}

// 搜索结果 → listings 记录（单品，ext_key=1688:offer<offerId>）
function normalizeSearchOffer(offer, shopName) {
  const oid = offerIdOf(offer);
  const pr = priceRangeOf(offer);
  const name = shopNameOf(offer);
  return {
    _coll: 'listings',
    ext_key: `1688:offer${oid}`,
    platform: '1688',
    shop_name: name || shopName,
    platform_product_id: oid,
    platform_product_group: oid,
    platform_variant_id: '0',
    platform_inventory_item_id: `offer${oid}`,
    platform_sku: '',
    title: titleOf(offer),
    listing_price: pr.hi > 0 ? pr.hi : pr.lo, // 价格区间取上限作展示价；区间字段另记在下方备注字段
    currency: 'CNY',
    url: `https://detail.1688.com/offer/${oid}.html`,
    image: imgOf(offer),
    vendor: name,
    platform_available: null, // 买家侧搜索列表不透实时库存，留空
    status: 'active',
    platform_updated_at: str(pick(offer, ['gmtModified', 'gmt_modified', 'modifiedTime'])),
    // 选品辅助字段（契约主字段之外，如实保留价格区间/起订量/代发标识）
    _moq: moqOf(offer),
    _price_min: pr.lo,
    _price_max: pr.hi,
    _one_psale: onePsaleOf(offer),
  };
}

// 商详 SKU 数组（防御式扫描：只把“首元素含 skuId/skuCode 的数组”当 SKU 列表，
// 避免把 priceRangeList 等其它数组误判；字段嵌套未在登录态逐字核对，拿到真实报文后补全）
function isSkuArr(v) {
  return Array.isArray(v) && v.length && v[0]
    && (v[0].skuId != null || v[0].sku_id != null || v[0].skuCode != null);
}
function extractSkus(detail) {
  const root = detail || {};
  const scan = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    for (const k of Object.keys(obj)) {
      if (isSkuArr(obj[k])) return obj[k];
    }
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v && typeof v === 'object') { const f = scan(v); if (f) return f; }
    }
    return null;
  };
  return scan(root) || [];
}
function skuIdOf(sku) { return str(pick(sku, ['skuId', 'sku_id', 'id'])) || '0'; }
function skuPriceOf(sku) {
  const v = pick(sku, ['price', 'consignPrice', 'discountPrice', 'salePrice']);
  return num(v);
}
function skuStockOf(sku) {
  const v = pick(sku, ['channelInventoryQuantity', 'quantity', 'inventory', 'amount']);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function skuAttrText(sku) {
  const arr = sku.attributes || sku.skuAttributes || sku.attrs || [];
  if (!Array.isArray(arr)) return '';
  return arr.map((a) => str(a.attrName || a.name) + (a.attrValue || a.value ? `:${a.attrValue || a.value}` : '')).filter(Boolean).join(' / ');
}

// 商详 → listings 记录（展开 SKU，ext_key=1688:offer<offerId>v<skuId>）
function normalizeDetailOffer(detail, shopName) {
  const out = [];
  const d = detail || {};
  const oid = offerIdOf(d) || offerIdOf(d.offer || d.product || {});
  const title = titleOf(d.offer || d.product || d);
  const img = imgOf(d.offer || d.product || d) || imgOf(d);
  const name = shopNameOf(d.offer || d.product || d) || shopName;
  const skus = extractSkus(d);
  if (!skus.length) {
    out.push({
      _coll: 'listings',
      ext_key: `1688:offer${oid}v0`,
      platform: '1688',
      shop_name: name,
      platform_product_id: oid,
      platform_product_group: oid,
      platform_variant_id: '0',
      platform_inventory_item_id: `offer${oid}`,
      platform_sku: '',
      title,
      listing_price: priceRangeOf(d.offer || d.product || d).hi || priceRangeOf(d.offer || d.product || d).lo,
      currency: 'CNY',
      url: `https://detail.1688.com/offer/${oid}.html`,
      image: img,
      vendor: name,
      platform_available: null, // 实时库存是否对买家侧透出未确认，无则留空
      status: 'active',
      platform_updated_at: str(pick(d, ['gmtModified', 'gmt_modified'])),
    });
    return out;
  }
  for (const sku of skus) {
    const sid = skuIdOf(sku);
    const attr = skuAttrText(sku);
    out.push({
      _coll: 'listings',
      ext_key: `1688:offer${oid}v${sid}`,
      platform: '1688',
      shop_name: name,
      platform_product_id: oid,
      platform_product_group: oid,
      platform_variant_id: sid,
      platform_inventory_item_id: sid,
      platform_sku: str(pick(sku, ['skuCode', 'skuCodeStr', 'outerId'])),
      title: attr ? `${title} · ${attr}` : title,
      listing_price: skuPriceOf(sku),
      currency: 'CNY',
      url: `https://detail.1688.com/offer/${oid}.html`,
      image: img,
      vendor: name,
      platform_available: skuStockOf(sku), // 库存字段有则映射，无则 null
      status: 'active',
      platform_updated_at: str(pick(d, ['gmtModified', 'gmt_modified'])),
    });
  }
  return out;
}

// ── 关键词搜品（导出给选品 UI 复用）：page 从 1 起 ──
async function keywordSearch(creds, keyword, page, ctx) {
  const r = await callAop(creds, ctx, 'product.search.keywordQuery', {
    keyword: String(keyword || ''),
    page: Number(page) >= 1 ? Number(page) : 1,
  });
  if (r.error) return { error: r.error, records: [] };
  const offers = offerListArr(r.data);
  const shopName = creds.memberId ? `1688 货源（${creds.memberId}）` : '1688 货源';
  return { records: offers.map((o) => normalizeSearchOffer(o, shopName)), raw: r.data };
}

// ── 商详（导出）：展开 SKU ──
async function productDetail(creds, offerId, ctx) {
  const r = await callAop(creds, ctx, 'product.search.queryProductDetail', {
    offerId: String(offerId || ''),
  });
  if (r.error) return { error: r.error, records: [] };
  const shopName = creds.memberId ? `1688 货源（${creds.memberId}）` : '1688 货源';
  return { records: normalizeDetailOffer(r.data, shopName), raw: r.data };
}

// ── 连接测试：用真实只读轻量调用（keywordQuery 一个常见词第 1 页）验证 appKey/签名/token ──
async function test(creds, ctx) {
  if (!String(creds.appKey || '').trim() || !String(creds.appSecret || '').trim() || !String(creds.accessToken || '').trim()) {
    return { ok: false, error: ctx.t('conn_cred_required') };
  }
  const r = await keywordSearch(creds, '耳机', 1, ctx);
  if (r.error) return { ok: false, error: r.error };
  return {
    ok: true,
    shop_name: creds.memberId ? `1688 货源（${creds.memberId}）` : '1688 货源',
    shop_domain: 'gw.open.1688.com',
    currency: 'CNY',
    plan: '',
  };
}

// ── fetchResource ──
// 货源选品是关键词驱动、没有“我的全量商品”：定时同步（无关键词上下文）不拉取任何记录。
// 绝不伪造全量拉取；选品请在选品界面用 keywordSearch(creds, 关键词, page, ctx) 主动搜。
async function fetchResource(creds, resource, cursor, ctx) {
  void creds; void ctx;
  if (resource === 'products') {
    // 如实返回空记录，nextCursor 保持；日志/台账口径：“货源选品按关键词搜索，定时同步不拉取”
    return { records: [], nextCursor: cursor || '' };
  }
  return { records: [], nextCursor: cursor || '' };
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
  gatewayUrl,
  callAop,
  keywordSearch,
  productDetail,
  normalizeSearchOffer,
  normalizeDetailOffer,
  offerListArr,
  extractSkus,
  priceRangeOf,
  moqOf,
  onePsaleOf,
};
