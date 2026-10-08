// 京东店铺适配器：用卖家自己的 AppKey/AppSecret + OAuth access_token 在本机直连宙斯（JOS）网关。
// 鉴权 = OAuth2 授权码 + JOS MD5 业务签名（首尾拼 app_secret，大写 hex），纯本机、零服务器。
// 注意：敏感 API 必须在京东云鼎内发起，云鼎外调用报“敏感 api，请将 app 入驻云鼎”；
//       盈脉是本机直连 Electron，即使企业 POP 店铺获批也无法从本机打通这些接口。
//       POP 商家宙斯域的 OAuth 端点/签名细节/错误结构本次未抓到官方登录态正文（research §2.2/§4/§9-4），
//       下列端点与字段按社区/SDK 一致引用与 iopv2 协议参考实现并标注“待登录后实测”，不编造。
// 灵感引擎工坊 · bin1732

const crypto = require('crypto');

// ── 宙斯网关 / OAuth（2026-10-07 实时核验 research/domestic-a-research.md §2，端点待登录后复核） ──
const GATEWAY = 'https://api.jd.com/routerjson';
const OAUTH_AUTHORIZE = 'https://oauth.jd.com/oauth/authorize'; // POP 商家域正文未抓到，按社区一致引用，待登录后复核
const OAUTH_TOKEN = 'https://oauth.jd.com/oauth/token';           // 同上，待登录后复核

const META = {
  id: 'jd',
  name: { zh: '京东', en: 'JD.com' },
  category: 'domestic',
  // 代码按官方文档预实现（OAuth + jingdong.* 网关调用）；但敏感订单/收件人 API 必须在京东云鼎内发起，
  // 盈脉是本机直连 Electron，即使企业 POP 店铺获批也无法从本机打通；个人店/个体店能否过自研审核官方未承诺。
  // 故严格定 restricted（不标 gated/self），needs 与教程如实写明资质门槛与云鼎要求。
  status: 'restricted',
  authType: 'jd-sign',
  // 宙斯网关提供精准流控，但逐接口 QPM/日配额按应用与权限组在控制台展示，公开文档未抓到数值表。
  // 桌面自用场景保守取 1s 间隔，遇限流由 ctx.request 退避，不写死未证实配额。
  requestGapMs: 1000,
  resources: ['products', 'orders', 'inventory'],
  credentialFields: [
    {
      key: 'sellerPin', required: false, secret: false,
      label: { zh: '卖家账号 PIN（可空）', en: 'Seller PIN (optional)' },
      placeholder: { zh: '授权店铺的京东主账号登录名，可空，仅用于展示店铺名', en: 'Your JD seller login PIN (optional, display only)' },
    },
    {
      key: 'appKey', required: true, secret: false,
      label: { zh: 'App Key', en: 'App Key' },
      placeholder: { zh: '商家自研应用通过审核后，宙斯开发者后台的 AppKey', en: 'AppKey from your approved in-house app in the Zeus console' },
    },
    {
      key: 'appSecret', required: true, secret: true,
      label: { zh: 'App Secret（密钥）', en: 'App Secret (secret)' },
      placeholder: { zh: '自研应用的 AppSecret，仅用于本机 MD5 签名，不会上传', en: 'AppSecret of your app, used for local MD5 signing only, never uploaded' },
    },
    {
      key: 'accessToken', required: true, secret: true,
      label: { zh: 'Access Token', en: 'Access Token' },
      placeholder: { zh: 'OAuth 授权后换取的 access_token；参考有效期约 24 小时，以授权返回 expires_in 为准', en: 'access_token from OAuth; reference lifetime about 24h, follow the returned expires_in' },
    },
    {
      key: 'refreshToken', required: false, secret: true,
      label: { zh: 'Refresh Token（可空）', en: 'Refresh Token (optional)' },
      placeholder: { zh: 'OAuth 返回的 refresh_token（参考约 7 天）；失效后需重新授权', en: 'OAuth refresh_token (reference ~7 days); re-authorize when it fails' },
    },
  ],
  official: {
    docs: 'https://open.jd.com/',
    signup: 'https://jos.jd.com/',
    devapps: 'https://yd-doc.jdcloud.com/docs/3-guidebook/',
  },
  scopes: [
    'jingdong.item.list.get（商品列表）',
    'jingdong.item.read.get（商品详情）',
    '订单类：按权限组在控制台申请（待登录后核对接口名）',
  ],
  needs: [
    '敏感订单/收件人 API 必须在京东云鼎（yd.jdcloud.com）内发起；云鼎外调用报“该 api 是敏感 api，请将您的 app 入驻云鼎平台方可调用”。盈脉是本机直连 Electron，即使企业 POP 店铺获批也无法从本机打通这些接口。',
    '商家自研应用需企业 POP 店铺主账号审核（约 1–3 个工作日）+ 云鼎入驻（约 1–2 个工作日）；个人店/个体店主体能否通过自研应用审核，官方公开文档未承诺，需提交后以审核为准。',
    'POP 商家宙斯域的 OAuth 端点、timestamp 格式、错误结构与限流数值本次未抓到登录态官方正文；下列实现按社区/SDK 一致引用与 iopv2 协议参考，接入前必须用真实 app_key 登录控制台复核。',
    'access_token 参考有效期约 24 小时、refresh_token 约 7 天（iopv2 工业采购域数值，非 POP 商家域），以应用实际授权返回的 expires_in 为准。',
    '收件人姓名/手机/地址为加密 pin / 脱敏，云鼎外拿不到明文；这些 PII 字段留空，不中断同步。',
  ],
  regions: ['中国大陆（京东 POP，人民币 CNY）'],
};

// ── 工具 ──
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function epochSec() { return String(Math.floor(Date.now() / 1000)); }

// ── JOS MD5 签名（research §2.2：所有业务参数 + access_token 按 key ASCII 升序 keyvalue 直拼，首尾 app_secret，MD5 大写） ──
// 1) 取所有请求参数（系统+业务，业务参数以 360buy_param_json JSON 串作为单个参数参与签名）；2) 剔除 sign 与空值；
// 3) 按参数名 ASCII 升序；4) key 与 value 直接拼接；5) MD5(app_secret + 拼接串 + app_secret)；6) 32 位大写 hex。
function buildSignBase(params) {
  return Object.keys(params)
    .filter((k) => k !== 'sign' && params[k] !== '' && params[k] != null)
    .sort()
    .map((k) => k + String(params[k]))
    .join('');
}
function signRequest(secret, params) {
  return crypto.createHash('md5')
    .update(String(secret) + buildSignBase(params) + String(secret), 'utf8')
    .digest('hex').toUpperCase();
}
// application/x-www-form-urlencoded 编码
function formEncode(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== '' && obj[k] != null)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
    .join('&');
}

// 成功信封：历史上 JOS 成功为 { "<method>_responce": {...} }（注意宙斯历史拼写 responce）；
// 错误：{ error_response: { code, message/msg } }。POP 域精确结构未抓到正文（见 needs），防御式同时匹配 _response/_responce。
function unwrapEnvelope(json) {
  if (!json || typeof json !== 'object') return { data: null };
  if (json.error_response) return { error: json.error_response };
  for (const k of Object.keys(json)) {
    if (k.endsWith('_response') || k.endsWith('_responce')) return { data: json[k] };
  }
  return { data: json };
}
function friendlyError(er) {
  if (!er) return '';
  return String(er.message || er.msg || er.sub_msg || er.sub_code || er.code || 'JD error').slice(0, 160);
}

// 调一次宙斯网关：组装系统参数 + 360buy_param_json（业务 JSON），MD5 签名，form POST
async function callJos(creds, ctx, method, bizJson) {
  const params = {
    method,
    app_key: creds.appKey,
    access_token: creds.accessToken,
    timestamp: epochSec(),
    format: 'json',
    v: '2.0',
    sign_method: 'md5',
  };
  if (bizJson) params['360buy_param_json'] = bizJson;
  params.sign = signRequest(creds.appSecret, params);
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

// ── OAuth（端点待登录后复核，research §2.2） ──
function buildAuthUrl(creds, redirect, state) {
  const u = new URL(OAUTH_AUTHORIZE);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', String(creds.appKey || ''));
  u.searchParams.set('redirect_uri', String(redirect || ''));
  if (state) u.searchParams.set('state', String(state));
  return u.toString();
}
// 裸 POST form：code 换 access_token。端点为社区一致引用、未在 POP 域官方正文逐字确认（待实测）。
async function exchangeCode(creds, code, redirect) {
  const body = formEncode({
    grant_type: 'authorization_code',
    client_id: creds.appKey,
    client_secret: creds.appSecret,
    code: String(code || ''),
    redirect_uri: String(redirect || ''),
  });
  const res = await fetch(OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  let json = null;
  try { json = await res.clone().json(); } catch { /* 非 JSON */ }
  if (!res.ok || !json || json.error_response || !json.access_token) {
    const e = new Error(`jd_token_${res.status}:${(json && (json.error_description || json.error_msg || json.error)) || ''}`);
    e.status = res.status;
    throw e;
  }
  return json;
}

// ── 订单状态映射（JD POP orderState 数值，2=等待发货/待出库、3=已发货、4=完成、5=取消、1=待付款）-> 统一五态 ──
// 数值映射为常见 POP 口径；精确枚举需登录控制台核对（research §2.3 订单接口名未直读）。
function orderStateNum(s) {
  if (s == null || s === '') return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
function orderStatus(s) {
  const n = orderStateNum(s);
  if (!Number.isNaN(n)) {
    switch (n) {
      case 2:
        return 'paid';     // 等待出库/待发货
      case 3:
        return 'shipped';  // 已发货
      case 4:
        return 'completed';
      case 5:
        return 'cancelled';
      case 1:
      default:
        return 'pending';  // 等待付款 / 未知
    }
  }
  switch (String(s).toUpperCase()) {
    case 'WAITDELIVERY':
    case 'WAIT_SELLER_DELIVERY':
      return 'paid';
    case 'DELIVERED':
    case 'WAITRECEIVER':
      return 'shipped';
    case 'FINISHED':
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
    case 'CLOSED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

// ── 商品归一化：JD 商品模型用 ware（wareId/name/price/stock）；字段名防御式扫描 ──
// item: { wareId/itemId, title/name, price/jdPrice, stockNumber/stock, skus }
function itemIdOf(item) { return String(item.wareId || item.itemId || item.skuId || item.id || ''); }
function itemTitleOf(item) { return item.title || item.name || item.wareName || item.skuName || itemIdOf(item); }
function skusOf(item) {
  const skus = item.skus || item.skuList || item.skuInfos;
  return Array.isArray(skus) ? skus : [];
}
function skuIdOf(sku) { return String(sku.skuId || sku.wareId || sku.id || ''); }

function normalizeListing(item, shopName, currency) {
  const out = [];
  const group = itemIdOf(item);
  const cur = currency || 'CNY';
  const title = itemTitleOf(item);
  const price = num(item.price != null ? item.price : item.jdPrice);
  const stock = num(item.stockNumber != null ? item.stockNumber : item.stock);
  const img = item.img || item.image || (item.imageInfo && item.imageInfo.mainImage) || '';
  const skus = skusOf(item);
  if (!skus.length) {
    out.push({
      _coll: 'listings',
      ext_key: `jd:p${group}v0`,
      platform: 'jd',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: '0',
      platform_inventory_item_id: group,
      platform_sku: item.outerSkuId || item.costCode || '',
      title,
      listing_price: price,
      currency: cur,
      url: `https://item.jd.com/${group}.html`,
      image: img,
      vendor: '',
      platform_available: Number.isFinite(stock) ? stock : null,
      status: 'active',
      platform_updated_at: item.modified || item.modifiedTime || '',
    });
    return out;
  }
  for (const sku of skus) {
    const sid = skuIdOf(sku);
    out.push({
      _coll: 'listings',
      ext_key: `jd:p${group}v${sid}`,
      platform: 'jd',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: sid,
      platform_inventory_item_id: sid,
      platform_sku: sku.outerSkuId || sid,
      title: title,
      listing_price: num(sku.price != null ? sku.price : price),
      currency: cur,
      url: `https://item.jd.com/${group}.html`,
      image: img,
      vendor: '',
      platform_available: Number.isFinite(num(sku.stock != null ? sku.stock : stock))
        ? num(sku.stock != null ? sku.stock : stock) : null,
      status: 'active',
      platform_updated_at: item.modified || item.modifiedTime || '',
    });
  }
  return out;
}

function normalizeInventory(item) {
  const out = [];
  const group = itemIdOf(item);
  const stock = num(item.stockNumber != null ? item.stockNumber : item.stock);
  const skus = skusOf(item);
  if (!skus.length) {
    out.push({ _coll: '_inventory', platform_inventory_item_id: group, platform_available: Number.isFinite(stock) ? stock : null });
    return out;
  }
  for (const sku of skus) {
    out.push({
      _coll: '_inventory',
      platform_inventory_item_id: skuIdOf(sku),
      platform_available: Number.isFinite(num(sku.stock != null ? sku.stock : stock))
        ? num(sku.stock != null ? sku.stock : stock) : null,
    });
  }
  return out;
}

// ── 订单归一化：order = jingdong 订单列表/详情的单个订单（字段形状待登录后实测，防御式取值） ──
// order: { orderId/orderNo, orderState, created/payTime/consignTime, payment, freightPrice,
//          buyerInfo:{nick}, itemList:[{skuId,skuName,skuNum,orderPrice,jdPrice}] }
function orderLines(order) {
  const items = order.itemList || (order.orderInfo && order.orderInfo.itemList) || order.skuList;
  if (Array.isArray(items)) return items;
  if (items) return [items];
  return [];
}
function normalizeOrder(order, shopName) {
  const out = [];
  const status = orderStatus(order.orderState != null ? order.orderState : order.orderStatus);
  const oid = String(order.orderId || order.orderNo || order.id || '');
  const cur = 'CNY';
  // 收件人 PII 为加密 pin / 脱敏，云鼎外拿不到明文；如实取字段、取不到留空，不中断同步。
  const buyerInfo = order.buyerInfo || {};
  const consignee = order.consignee || {};
  const buyerName = consignee.name || order.receiverName || '';
  const buyerPhone = consignee.mobile || order.receiverMobile || '';
  const lines = orderLines(order);
  lines.forEach((line, i) => {
    const qty = num(line.skuNum != null ? line.skuNum : line.num) || 1;
    const unit = num(line.orderPrice != null ? line.orderPrice : line.jdPrice);
    const isFirst = i === 0;
    out.push({
      _coll: 'orders',
      ext_key: `jd:order${oid}L${i + 1}`,
      order_no: oid,
      parent_order_no: oid,
      platform: 'jd',
      shop_name: shopName,
      platform_order_id: oid,
      platform_product_id: String(line.wareId || line.skuId || line.itemId || ''),
      platform_variant_id: String(line.skuId || ''),
      platform_sku: line.outerSkuId || line.costCode || '',
      product_name: line.skuName || line.title || '',
      qty,
      unit_price: unit,
      total_amount: num(line.orderPrice != null ? line.orderPrice : line.jdPrice) * qty,
      currency: cur,
      status,
      buyer: buyerInfo.nick || order.buyerPin || '',
      buyer_name: buyerName,
      buyer_email: '',
      buyer_phone: buyerPhone,
      ship_country: 'CN',
      ship_province: consignee.province || order.receiverState || '',
      ship_city: consignee.city || order.receiverCity || '',
      ship_zip: consignee.zipCode || '',
      ship_address: consignee.address || order.receiverAddress || '',
      order_shipping: isFirst ? num(order.freightPrice) : 0,
      order_tax: 0,
      order_discount: 0,
      order_total: isFirst ? num(order.payment) : 0,
      platform_created_at: order.created || order.createTime || order.payTime || '',
      platform_updated_at: order.consignTime || order.modified || order.endTime || '',
    });
  });
  if (!out.length) {
    out.push({
      _coll: 'orders',
      ext_key: `jd:order${oid}L1`,
      order_no: oid, parent_order_no: oid,
      platform: 'jd', shop_name: shopName, platform_order_id: oid,
      platform_product_id: '', platform_variant_id: '', platform_sku: '', product_name: '',
      qty: 1, unit_price: num(order.payment), total_amount: num(order.payment),
      currency: cur, status, buyer: buyerInfo.nick || order.buyerPin || '',
      buyer_name: buyerName, buyer_email: '', buyer_phone: buyerPhone,
      ship_country: 'CN', ship_province: consignee.province || '', ship_city: consignee.city || '',
      ship_zip: '', ship_address: consignee.address || '',
      order_shipping: 0, order_tax: 0, order_discount: 0, order_total: num(order.payment),
      platform_created_at: order.created || order.payTime || '', platform_updated_at: order.consignTime || '',
    });
  }
  return out;
}

// 从商品列表响应取 ware 数组（防御式：wareList / data / 直数组）
function itemListArr(data) {
  if (!data) return [];
  const list = data.wareList || data.list || data.items || data;
  if (Array.isArray(list)) return list;
  if (list.ware) return Array.isArray(list.ware) ? list.ware : [list.ware];
  return [];
}

// ── 连接测试：先校验必填凭证；再对真实网关做一次轻量只读调用（商品列表第 1 页 1 条）。
// 任何失败（含云鼎外拦截、无效凭证、appkey 不存在）一律 ok:false 并给可读信息，绝不假阳性。 ──
async function test(creds, ctx) {
  if (!String(creds.appKey || '').trim() || !String(creds.appSecret || '').trim() || !String(creds.accessToken || '').trim()) {
    return { ok: false, error: ctx.t('conn_cred_required') };
  }
  const r = await callJos(creds, ctx, 'jingdong.item.list.get', JSON.stringify({ page: 1, page_size: 1 }));
  if (r.error) return { ok: false, error: r.error };
  const seller = String(creds.sellerPin || 'shop');
  return {
    ok: true,
    shop_name: `京东（${seller}）`,
    shop_domain: seller,
    currency: 'CNY',
    plan: '',
  };
}

// ── fetchResource ──
async function fetchResource(creds, resource, cursor, ctx) {
  const records = [];
  let nextCursor = cursor || '';
  const seller = String(creds.sellerPin || 'shop');
  const shopName = `京东（${seller}）`;
  const currency = ctx.shopCurrency || 'CNY';

  if (resource === 'products' || resource === 'inventory') {
    // jingdong.item.list.get：page 从 1、page_size ≤20（单次≤20，官方）
    const pageSize = 20;
    let page = Number(nextCursor) || 1;
    const maxPage = 200;
    for (; page <= maxPage; page += 1) {
      const r = await callJos(creds, ctx, 'jingdong.item.list.get', JSON.stringify({ page, page_size: pageSize }));
      if (r.error || !r.data) break;
      const items = itemListArr(r.data);
      if (!items.length) break;
      for (const it of items) {
        if (resource === 'products') records.push(...normalizeListing(it, shopName, currency));
        else records.push(...normalizeInventory(it));
      }
      nextCursor = String(page + 1);
      if (items.length < pageSize) break;
    }
    return { records, nextCursor };
  }

  if (resource === 'orders') {
    // 订单类接口名与分页参数需登录控制台核对（research §2.3 未直读）；此处按订单号倒序分页防御式拉取。
    const pageSize = 50;
    let page = Number(nextCursor) || 1;
    for (; page <= 40; page += 1) {
      const r = await callJos(creds, ctx, 'jingdong.order.list.get', JSON.stringify({ page, page_size: pageSize }));
      if (r.error || !r.data) break;
      const orders = (r.data.orderList && (r.data.orderList.order || r.data.orderList)) || (r.data.list) || [];
      const arr = Array.isArray(orders) ? orders : [orders];
      for (const o of arr) records.push(...normalizeOrder(o, shopName));
      nextCursor = String(page + 1);
      if (arr.length < pageSize) break;
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
  buildSignBase,
  signRequest,
  formEncode,
  callJos,
  orderStatus,
  normalizeOrder,
  normalizeListing,
  normalizeInventory,
  itemListArr,
  skusOf,
  itemIdOf,
};
