// 拼多多店铺适配器：用卖家自己的 client_id(client_id=AppKey)/client_secret(AppSecret) + OAuth access_token 在本机直连 POP 网关。
// 鉴权 = OAuth2 授权码 + POP MD5 业务签名（首尾拼 client_secret，大写 hex），纯本机、零服务器。
// 注意：商家自研应用上线须部署入多多云；订单解密接口云外仅 1 次/10 秒、单次≤100 条。
//       盈脉是本机直连 Electron，即使企业店铺获批也无法在生产环境从本机打通这些接口。
//       OAuth authorize/token 端点官方文档为 JS 渲染，本次未抓到正文（research §3.2/§9-5），按通用授权码流实现并标注待实测。
// 灵感引擎工坊 · bin1732

const crypto = require('crypto');

// ── POP 网关（2026-10-07 实时核验 research/domestic-a-research.md §3.2，仅允许 POST） ──
const GATEWAY = 'https://gw-api.pinduoduo.com/api/router';
// 授权说明页 idStr=BD3A776A4D41D5F5 为 JS 渲染，authorize/token 端点 URL 未抓到正文（待登录后实测）。
// 下列授权/换 token 端点按通用授权码流 + 社区一致引用填写，拿到真实 client_id 后须在控制台核对。
const OAUTH_AUTHORIZE = 'https://open.pinduoduo.com/oauth/authorize';
const OAUTH_TOKEN = 'https://open.pinduoduo.com/oauth/token';

const META = {
  id: 'pdd',
  name: { zh: '拼多多', en: 'Pinduoduo' },
  category: 'domestic',
  // 代码按官方文档预实现（gw-api 网关 + MD5 签名 + pdd.* 接口）；但商家自研应用上线须部署入多多云，
  // 订单解密云外仅 1 次/10 秒测试配额，且“拼多多商家（自研）”角色要求经招商小二认证的品牌商/大商家，普通中小店可能被驳回。
  // 盈脉是本机直连 Electron，生产环境无法从本机打通；故严格定 restricted（不标 gated/self），needs 与教程如实写明。
  status: 'restricted',
  authType: 'top-sign',
  // 订单解密云外 1 次/10 秒；正式环境限流与类目有关、内测见 API 文档，无逐接口精确总表。
  // 桌面自用场景保守取 1s 间隔，遇限流由 ctx.request 退避，不写死未证实配额。
  requestGapMs: 1000,
  resources: ['products', 'orders', 'inventory'],
  credentialFields: [
    {
      key: 'sellerName', required: false, secret: false,
      label: { zh: '店铺名（可空）', en: 'Shop name (optional)' },
      placeholder: { zh: '授权店铺名，可空，仅用于展示', en: 'Your shop name (optional, display only)' },
    },
    {
      key: 'clientId', required: true, secret: false,
      label: { zh: 'Client ID（AppKey）', en: 'Client ID (AppKey)' },
      placeholder: { zh: '自研应用通过审核后，开放平台应用详情里的 client_id', en: 'client_id from your approved in-house app' },
    },
    {
      key: 'clientSecret', required: true, secret: true,
      label: { zh: 'Client Secret（密钥）', en: 'Client Secret (secret)' },
      placeholder: { zh: '自研应用的 client_secret，仅用于本机 MD5 签名，不会上传', en: 'client_secret of your app, used for local MD5 signing only, never uploaded' },
    },
    {
      key: 'accessToken', required: true, secret: true,
      label: { zh: 'Access Token', en: 'Access Token' },
      placeholder: { zh: 'OAuth 授权后换取的 access_token；以返回 expires_in 为准，失效后重新授权', en: 'access_token from OAuth; follow the returned expires_in; re-authorize when it fails' },
    },
  ],
  official: {
    docs: 'https://open.pinduoduo.com/',
    signup: 'https://open.pinduoduo.com/',
    devapps: 'https://open.pinduoduo.com/application/business/list?activeKey=1&alias=application_mallsystem&role=business',
  },
  scopes: [
    'pdd.goods.list.get（商品列表）',
    'pdd.goods.detail.get（商品详情）',
    'pdd.order.list.get（订单列表，最多 90 天）',
    'pdd.order.number.list.increment.get（增量订单号）',
    'pdd.order.information.get（订单详情）',
  ],
  needs: [
    '“拼多多商家（自研）”角色要求经招商小二认证的品牌商/大商家；普通中小店铺可能收到“店铺资质不满足商家自研入驻条件”的驳回，不保证可自助开通本店订单 API。纯个人仅可注册“多多进宝推手（CPS 导购）”，不能读自己店铺订单。',
    '商家自研应用上线须部署入多多云（open.pinduoduo.com/paas/self-apply）；订单解密接口云外仅 1 次/10 秒、单次≤100 条（约 33 单），云内无此限制。盈脉是本机直连 Electron，生产环境无法从本机打通。',
    '应用信息审核通过后须在 30 天内提交上线，否则应用被驳回、无法调接口。',
    '收件人姓名/手机/地址默认密文，需 pdd.open.decrypt.batch 解密；云外解密限流 1 次/10 秒，本机不做批量解密，这些 PII 字段留空，不中断同步。',
    '商品/订单价格接口返回单位为“分”，本适配器换算为“元”展示；订单最多回溯 90 天。',
  ],
  regions: ['中国大陆（拼多多，人民币 CNY）'],
};

// ── 工具 ──
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function epochSec() { return String(Math.floor(Date.now() / 1000)); }
// PDD 价格单位为分，换算为元
function centsToYuan(v) { const n = Number(v); return Number.isFinite(n) ? Math.round(n) / 100 : 0; }

// ── POP MD5 签名（2026-10-07 实时核验 research §3.2 + mai.pinduoduo.com API 调用方法详解） ──
// 1) 取所有参数（公共+业务），剔除 sign 与空值；2) 按 key 首字母升序；3) keyvalue 直拼；
// 4) MD5(client_secret + 拼接串 + client_secret)；5) 32 位大写 hex。
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

// 成功：{ "<type>_response": {...} }；失败：{ error_response: { error_code, error_msg } }
function unwrapEnvelope(json, type) {
  if (!json || typeof json !== 'object') return { data: null };
  if (json.error_response) return { error: json.error_response };
  const key = `${type}_response`;
  if (json[key]) return { data: json[key] };
  for (const k of Object.keys(json)) {
    if (k.endsWith('_response')) return { data: json[k] };
  }
  return { data: json };
}
function friendlyError(er) {
  if (!er) return '';
  return String(er.error_msg || er.sub_msg || er.error_code || er.code || 'PDD error').slice(0, 160);
}

// 调一次 POP 网关：公共参数 + 业务参数全在一个 form body，MD5 签名，POST（网关仅允许 POST）
async function callPdd(creds, ctx, type, biz) {
  const params = {
    type,
    client_id: creds.clientId,
    access_token: creds.accessToken,
    timestamp: epochSec(),
    data_type: 'JSON',
    version: 'V1',
  };
  if (biz) Object.assign(params, biz);
  params.sign = signRequest(creds.clientSecret, params);
  const r = await ctx.request(GATEWAY, {
    method: 'POST',
    body: formEncode(params),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (r.error) return { error: r.error };
  const env = unwrapEnvelope(r.json, type);
  if (env.error) return { error: friendlyError(env.error) };
  return { data: env.data };
}

// ── OAuth（端点 JS 渲染未抓到正文，待登录后实测，research §3.2） ──
function buildAuthUrl(creds, redirect, state) {
  const u = new URL(OAUTH_AUTHORIZE);
  u.searchParams.set('client_id', String(creds.clientId || ''));
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', String(redirect || ''));
  if (state) u.searchParams.set('state', String(state));
  return u.toString();
}
// 裸 POST form：code 换 access_token。端点为通用授权码流、未在官方正文逐字确认（待实测）。
async function exchangeCode(creds, code, redirect) {
  const body = formEncode({
    grant_type: 'authorization_code',
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
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
    const e = new Error(`pdd_token_${res.status}:${(json && (json.error_msg || json.error_description)) || ''}`);
    e.status = res.status;
    throw e;
  }
  return json;
}

// ── 订单状态映射（pdd 订单 order_status 数值）-> 统一五态 ──
// 7 待付款；6 待成团；1 待发货；2 已发货；3 已成团；4 已完成；5 已关闭
function orderStatus(s) {
  const n = Number(s);
  if (!Number.isFinite(n)) return 'pending';
  switch (n) {
    case 1:
      return 'paid';     // 待发货
    case 2:
    case 3:
      return 'shipped';  // 已发货 / 已成团待收货
    case 4:
      return 'completed';
    case 5:
      return 'cancelled';
    case 7:
    case 6:
    default:
      return 'pending';  // 待付款 / 待成团
  }
}

// ── 商品归一化：goods = pdd.goods.list.get 列表项（价格单位分，换算为元） ──
// goods: { goods_id, goods_name, min_group_price, market_price, quantity, goods_thumb_url, on_sale, is_lock }
function normalizeListing(goods, shopName, currency) {
  const group = String(goods.goods_id || goods.goodsId || '');
  const cur = currency || 'CNY';
  const title = goods.goods_name || group;
  const onSale = goods.on_sale != null ? !!goods.on_sale : true;
  const price = centsToYuan(goods.min_group_price != null ? goods.min_group_price : goods.market_price);
  const rec = {
    _coll: 'listings',
    ext_key: `pdd:p${group}v0`,
    platform: 'pdd',
    shop_name: shopName,
    platform_product_id: group,
    platform_product_group: group,
    platform_variant_id: '0',
    platform_inventory_item_id: group,
    platform_sku: goods.external_goods_id || goods.outer_id || '',
    title,
    listing_price: price,
    currency: cur,
    url: `https://mobile.yangkeduo.com/goods.html?goods_id=${group}`,
    image: goods.goods_thumb_url || goods.image_url || '',
    vendor: '',
    platform_available: Number.isFinite(num(goods.quantity)) ? num(goods.quantity) : null,
    status: onSale ? 'active' : 'inactive',
    platform_updated_at: goods.updated_at || goods.modified || '',
  };
  return [rec];
}

function normalizeInventory(goods) {
  return [{
    _coll: '_inventory',
    platform_inventory_item_id: String(goods.goods_id || goods.goodsId || ''),
    platform_available: Number.isFinite(num(goods.quantity)) ? num(goods.quantity) : null,
  }];
}

// ── 订单归一化：order = pdd.order.information.get 单个订单（价格单位分） ──
// order: { order_sn, order_status, pay_amount, postage, receiver_name, receiver_mobile, receiver_province/city/town/address,
//          item_list:[{goods_id, goods_name, goods_price, goods_count, sku_id, sku_number}] }
function orderLines(order) {
  const items = order.item_list || order.order_items || [];
  if (Array.isArray(items)) return items;
  if (items) return [items];
  return [];
}
function normalizeOrder(order, shopName) {
  const out = [];
  const status = orderStatus(order.order_status);
  const osn = String(order.order_sn || order.orderSn || order.order_id || '');
  const cur = 'CNY';
  // 收件人 PII 默认密文，需解密接口；云外解密限流 1 次/10 秒，本机不做批量解密，PII 留空不中断同步。
  const buyerName = order.receiver_name || '';
  const buyerPhone = order.receiver_mobile || order.receiver_phone || '';
  const lines = orderLines(order);
  lines.forEach((line, i) => {
    const qty = num(line.goods_count) || 1;
    const unit = centsToYuan(line.goods_price);
    const isFirst = i === 0;
    out.push({
      _coll: 'orders',
      ext_key: `pdd:order${osn}L${i + 1}`,
      order_no: osn,
      parent_order_no: osn,
      platform: 'pdd',
      shop_name: shopName,
      platform_order_id: osn,
      platform_product_id: String(line.goods_id || ''),
      platform_variant_id: String(line.sku_id || ''),
      platform_sku: line.sku_number || '',
      product_name: line.goods_name || '',
      qty,
      unit_price: unit,
      total_amount: unit * qty,
      currency: cur,
      status,
      buyer: order.tenant_src || order.buyer_user_id || '',
      buyer_name: buyerName,
      buyer_email: '',
      buyer_phone: buyerPhone,
      ship_country: 'CN',
      ship_province: order.receiver_province || '',
      ship_city: order.receiver_city || '',
      ship_zip: order.receiver_zip || '',
      ship_address: [order.receiver_town, order.receiver_address].filter(Boolean).join(' '),
      order_shipping: isFirst ? centsToYuan(order.postage) : 0,
      order_tax: 0,
      order_discount: 0,
      order_total: isFirst ? centsToYuan(order.pay_amount) : 0,
      platform_created_at: order.created_time || order.create_time || '',
      platform_updated_at: order.last_updated_time || order.updated_time || '',
    });
  });
  if (!out.length) {
    out.push({
      _coll: 'orders',
      ext_key: `pdd:order${osn}L1`,
      order_no: osn, parent_order_no: osn,
      platform: 'pdd', shop_name: shopName, platform_order_id: osn,
      platform_product_id: '', platform_variant_id: '', platform_sku: '', product_name: '',
      qty: 1, unit_price: centsToYuan(order.pay_amount), total_amount: centsToYuan(order.pay_amount),
      currency: cur, status, buyer: order.tenant_src || '',
      buyer_name: buyerName, buyer_email: '', buyer_phone: buyerPhone,
      ship_country: 'CN', ship_province: order.receiver_province || '', ship_city: order.receiver_city || '',
      ship_zip: '', ship_address: order.receiver_address || '',
      order_shipping: 0, order_tax: 0, order_discount: 0, order_total: centsToYuan(order.pay_amount),
      platform_created_at: order.created_time || '', platform_updated_at: order.last_updated_time || '',
    });
  }
  return out;
}

// 从商品列表响应取 goods 数组
function goodsListArr(data) {
  if (!data) return [];
  const list = data.goods_list || data.list || data;
  if (Array.isArray(list)) return list;
  return [];
}
// 从订单列表响应取订单数组（pdd.order.list.get 返回 order_list；防御式兼容直数组）
function orderListArr(data) {
  if (!data) return [];
  const list = data.order_list || data.list || data;
  if (Array.isArray(list)) return list;
  return [];
}

// ── 连接测试：先校验必填凭证；再对真实网关做一次轻量只读调用（商品列表第 1 页 1 条）。
// 任何失败（含多多云外拦截、无效凭证、client_id 不存在）一律 ok:false 并给可读信息，绝不假阳性。 ──
async function test(creds, ctx) {
  if (!String(creds.clientId || '').trim() || !String(creds.clientSecret || '').trim() || !String(creds.accessToken || '').trim()) {
    return { ok: false, error: ctx.t('conn_cred_required') };
  }
  const r = await callPdd(creds, ctx, 'pdd.goods.list.get', { page: 1, page_size: 1 });
  if (r.error) return { ok: false, error: r.error };
  const seller = String(creds.sellerName || 'shop');
  return {
    ok: true,
    shop_name: `拼多多（${seller}）`,
    shop_domain: seller,
    currency: 'CNY',
    plan: '',
  };
}

// ── fetchResource ──
async function fetchResource(creds, resource, cursor, ctx) {
  const records = [];
  let nextCursor = cursor || '';
  const seller = String(creds.sellerName || 'shop');
  const shopName = `拼多多（${seller}）`;
  const currency = ctx.shopCurrency || 'CNY';

  if (resource === 'products' || resource === 'inventory') {
    // pdd.goods.list.get：page 从 1、page_size 10–100（建议 40–50）
    const pageSize = 50;
    let page = Number(nextCursor) || 1;
    const maxPage = 200;
    for (; page <= maxPage; page += 1) {
      const r = await callPdd(creds, ctx, 'pdd.goods.list.get', { page, page_size: pageSize });
      if (r.error || !r.data) break;
      const list = goodsListArr(r.data);
      if (!list.length) break;
      for (const g of list) {
        if (resource === 'products') records.push(...normalizeListing(g, shopName, currency));
        else records.push(...normalizeInventory(g));
      }
      nextCursor = String(page + 1);
      if (list.length < pageSize) break;
    }
    return { records, nextCursor };
  }

  if (resource === 'orders') {
    // pdd.order.list.get：历史订单最多 90 天，page 从 1；倒序分页防漏单
    const pageSize = 50;
    let page = Number(nextCursor) || 1;
    for (; page <= 40; page += 1) {
      const r = await callPdd(creds, ctx, 'pdd.order.list.get', { page, page_size: pageSize });
      if (r.error || !r.data) break;
      const orders = orderListArr(r.data);
      for (const o of orders) records.push(...normalizeOrder(o, shopName));
      nextCursor = String(page + 1);
      if (orders.length < pageSize) break;
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
  callPdd,
  orderStatus,
  normalizeOrder,
  normalizeListing,
  normalizeInventory,
  goodsListArr,
  orderListArr,
  centsToYuan,
};
