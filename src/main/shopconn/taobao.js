// 淘宝/天猫店铺适配器：用卖家自己的 AppKey/AppSecret + OAuth access_token（session）在本机直连 TOP 网关。
// 鉴权 = OAuth2 授权码换 access_token（自研商家后台授权一次约 1 年、不支持 refresh）+ TOP MD5 业务签名，纯本机、零服务器。
// 注意：订单/收件人等敏感接口官方要求在聚石塔 ECS 内调用，本机直连会被网络策略拦截；
//       本适配器按官方文档预先实现签名/OAuth/端点，但 META.status 定 restricted，绝不承诺能从本机打通经营接口。
// 灵感引擎工坊 · bin1732

const crypto = require('crypto');

// ── TOP 网关（2026-10-07 实时核验 research/domestic-a-research.md §1.2） ──
const GATEWAY = 'https://eco.taobao.com/router/rest';
const OAUTH_AUTHORIZE = 'https://oauth.taobao.com/authorize';
const OAUTH_TOKEN = 'https://oauth.taobao.com/token';

const META = {
  id: 'taobao',
  name: { zh: '淘宝 / 天猫', en: 'Taobao / Tmall' },
  category: 'domestic',
  // 代码按官方文档预实现（网关/签名/OAuth/端点）；但订单/收件人敏感 API 必须在聚石塔 ECS 内发起，
  // 盈脉是本机直连 Electron，即使企业主体获批也无法从本机打通这些接口；且自研通道仅企业天猫卖家、淘宝 C 店被排除。
  // 故严格定 restricted（不标 gated/self），needs 与教程如实写明资质门槛与专属云要求，绝不承诺能连上。
  status: 'restricted',
  authType: 'top-sign',
  // 官方建议每次返回 <50 条、时间跨度 <30 分钟、避开交易高峰；逐接口精确 QPS/配额无总表。
  // 桌面自用场景保守取 1s 间隔，遇限流由 ctx.request 按 Retry-After/5xx 退避，不写死未证实配额。
  requestGapMs: 1000,
  resources: ['products', 'orders', 'inventory'],
  credentialFields: [
    {
      key: 'sellerNick', required: false, secret: false,
      label: { zh: '卖家昵称（可空）', en: 'Seller nickname (optional)' },
      placeholder: { zh: '授权店铺的淘宝会员名，可空，仅用于展示店铺名', en: 'Your Taobao member name (optional, display only)' },
    },
    {
      key: 'appKey', required: true, secret: false,
      label: { zh: 'App Key', en: 'App Key' },
      placeholder: { zh: '自研应用通过审核后，开放平台应用概览里的 AppKey', en: 'AppKey from your approved in-house app overview' },
    },
    {
      key: 'appSecret', required: true, secret: true,
      label: { zh: 'App Secret（密钥）', en: 'App Secret (secret)' },
      placeholder: { zh: '自研应用的 AppSecret，仅用于本机 MD5 签名，不会上传', en: 'AppSecret of your app, used for local MD5 signing only, never uploaded' },
    },
    {
      key: 'accessToken', required: true, secret: true,
      label: { zh: 'Access Token（session）', en: 'Access Token (session)' },
      placeholder: { zh: 'OAuth 授权后换取的 access_token（即调用时的 session）；自研授权一次约 1 年、不支持刷新，过期需重新授权', en: 'access_token from OAuth (the session); in-house grants last about 1 year with no refresh; re-authorize when expired' },
    },
  ],
  official: {
    docs: 'https://open.taobao.com/',
    signup: 'https://open.taobao.com/',
    devapps: 'https://developer.alibaba.com/docs/doc.htm?treeId=796&articleId=118848&docType=1',
  },
  scopes: [
    'taobao.items.onsale.get（出售中商品）',
    'taobao.items.inventory.get（仓库中商品）',
    'taobao.item.seller.get（商品详情）',
    'taobao.trades.sold.get（已卖出交易）',
    'taobao.trade.fullinfo.get（交易详情）',
  ],
  needs: [
    '自研商家后台系统仅对企业主体（企业支付宝）+ 天猫卖家开放；淘宝集市 C 店卖家被官方明确排除，建议在服务市场订购应用。个体工商户能否按“公司身份”过审以控制台实际提交为准，官方未单列通道。',
    '订单/收件人等敏感接口必须在聚石塔 ECS 内调用，敏感数据不允许拿出聚石塔；盈脉是本机直连 Electron，即使企业主体获批也无法从本机打通这些接口（本机直连会被聚石塔网络策略拦截）。',
    '自研接入需上传产品说明书、OMS/ERP 类国家软件著作权与源代码片段，审核约 3–5 个工作日；一个公司只能创建 1 个商家后台系统应用。',
    '自研型商家后台不支持 refresh_token 刷新授权；授权一次约 1 年，到期只能重新走一次 OAuth 授权。',
    '收件人姓名/手机/地址在聚石塔外为密文/脱敏，本机拿不到明文；这些 PII 字段留空，不中断同步。',
  ],
  regions: ['中国大陆（淘宝/天猫，人民币 CNY）'],
};

// ── 时间格式化（签名 timestamp 要求 GMT+8，yyyy-MM-dd HH:mm:ss，服务端容忍约 6 分钟） ──
// 可选传入一个 Date/毫秒值：订单首同步回看 90 天时用它回推起点；不传则取当前时间。
function pad(n) { return String(n).padStart(2, '0'); }
function gmt8Now(d) {
  const base = d ? new Date(d) : new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(base).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  if (parts.hour === '24') parts.hour = '00';
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

// ── TOP MD5 签名（2026-10-07 实时核验 research §1.2 + tida-doc API 调用说明） ──
// 1) 取所有请求参数（公共+业务），剔除 sign 与空值；2) 按参数名 ASCII 升序；3) key 与 value 直接拼接；
// 4) md5 模式（默认）：MD5(appSecret + 拼接串 + appSecret)；hmac 模式：HMAC-MD5(appSecret, 拼接串)；5) 转 32 位大写 hex。
function buildSignBase(params) {
  return Object.keys(params)
    .filter((k) => k !== 'sign' && params[k] !== '' && params[k] != null)
    .sort()
    .map((k) => k + String(params[k]))
    .join('');
}
function digestBase(secret, base, method) {
  if (method === 'hmac') {
    return crypto.createHmac('md5', String(secret)).update(base, 'utf8').digest('hex').toUpperCase();
  }
  return crypto.createHash('md5').update(String(secret) + base + String(secret), 'utf8').digest('hex').toUpperCase();
}
function signRequest(secret, params, method) {
  return digestBase(secret, buildSignBase(params), method || 'md5');
}
// application/x-www-form-urlencoded 编码
function formEncode(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== '' && obj[k] != null)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
    .join('&');
}

// 成功：{ "<method>_response": {...} }；失败：{ error_response: { code,msg,sub_code,sub_msg } }
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

// 调一次 TOP 网关：组装公共参数 + 业务参数，MD5 签名，form POST
async function callTop(creds, ctx, method, biz) {
  const params = {
    method,
    app_key: creds.appKey,
    session: creds.accessToken,
    timestamp: gmt8Now(),
    format: 'json',
    v: '2.0',
    sign_method: 'md5',
  };
  if (biz) Object.assign(params, biz);
  params.sign = signRequest(creds.appSecret, params, 'md5');
  const r = await ctx.request(GATEWAY, {
    method: 'POST',
    body: formEncode(params),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (r.error) return { error: r.error };
  const env = unwrapEnvelope(r.json);
  if (env.error) return { error: friendlyTopError(env.error) };
  return { data: env.data };
}

// ── OAuth（2026-10-07 实时核验 research §1.2） ──
// 授权链接：https://oauth.taobao.com/authorize?response_type=code&client_id={app_key}&redirect_uri={回调}&state={}&view=web
function buildAuthUrl(creds, redirect, state) {
  const u = new URL(OAUTH_AUTHORIZE);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', String(creds.appKey || ''));
  u.searchParams.set('redirect_uri', String(redirect || ''));
  u.searchParams.set('view', 'web');
  if (state) u.searchParams.set('state', String(state));
  return u.toString();
}
// 裸 POST form：code 换 access_token（约 30 分钟、一次性）。返回原始 json。
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
    const e = new Error(`taobao_token_${res.status}:${(json && (json.sub_msg || json.error_description || json.error || json.sub_msg)) || ''}`);
    e.status = res.status;
    throw e;
  }
  return json;
}

// ── 订单状态映射（taobao.trades.sold.get 的 status）-> 统一五态 ──
// WAIT_BUYER_PAY 待付款；WAIT_SELLER_SEND_GOODS 待发货；WAIT_BUYER_CONFIRM_GOODS 待买家收货；
// TRADE_FINISHED 交易成功结束；TRADE_CLOSED / TRADE_CLOSED_BY_TAOBAO 交易关闭
function orderStatus(s) {
  switch (s) {
    case 'WAIT_SELLER_SEND_GOODS':
      return 'paid';
    case 'WAIT_BUYER_CONFIRM_GOODS':
      return 'shipped';
    case 'TRADE_FINISHED':
      return 'completed';
    case 'TRADE_CLOSED':
    case 'TRADE_CLOSED_BY_TAOBAO':
      return 'cancelled';
    case 'WAIT_BUYER_PAY':
    default:
      return 'pending';
  }
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function firstPic(item) {
  const pics = item && (item.pics || (item.picture_detail && item.picture_detail.urls));
  if (!pics) return '';
  if (typeof pics === 'string') return pics;
  const arr = Array.isArray(pics) ? pics : (pics.pic || []);
  if (Array.isArray(arr)) return String((arr[0] && (arr[0].url || arr[0])) || '');
  return '';
}
// 防御式取 SKU 数组（taobao.items.seller.list.get / taobao.item.seller.get 的 skus.sku）
function skusOf(item) {
  if (!item) return [];
  const skus = item.skus && (item.skus.sku || item.skus);
  return Array.isArray(skus) ? skus : [];
}

// ── 商品归一化：item = taobao.items.onsale.get / taobao.item.seller.get 列表项 ──
// item: { num_iid, title, price, num, pics, created, modified, skus:{sku:[{sku_id,price,quantity,properties_name,outer_sku_id}]} }
function normalizeListing(item, shopName, currency) {
  const out = [];
  const group = String(item.num_iid || item.item_id || '');
  const cur = currency || 'CNY';
  const title = item.title || group;
  const img = firstPic(item);
  const skus = skusOf(item);
  if (!skus.length) {
    out.push({
      _coll: 'listings',
      ext_key: `taobao:p${group}v0`,
      platform: 'taobao',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: '0',
      platform_inventory_item_id: `i${group}`,
      platform_sku: item.outer_id || '',
      title,
      listing_price: num(item.price),
      currency: cur,
      url: `https://item.taobao.com/item.htm?id=${group}`,
      image: img,
      vendor: '',
      platform_available: Number.isFinite(num(item.num)) ? num(item.num) : null,
      status: 'active',
      platform_updated_at: item.modified || item.created || '',
    });
    return out;
  }
  for (const sku of skus) {
    const sid = String(sku.sku_id || sku.skuId || '');
    const attr = sku.properties_name || sku.outer_id || '';
    out.push({
      _coll: 'listings',
      ext_key: `taobao:p${group}v${sid}`,
      platform: 'taobao',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: sid,
      platform_inventory_item_id: sid,
      platform_sku: sku.outer_id || sid,
      title: attr ? `${title} · ${attr}` : title,
      listing_price: num(sku.price != null ? sku.price : item.price),
      currency: cur,
      url: `https://item.taobao.com/item.htm?id=${group}`,
      image: img,
      vendor: '',
      platform_available: Number.isFinite(num(sku.quantity != null ? sku.quantity : item.num))
        ? num(sku.quantity != null ? sku.quantity : item.num) : null,
      status: 'active',
      platform_updated_at: item.modified || item.created || '',
    });
  }
  return out;
}

function normalizeInventory(item) {
  const out = [];
  const group = String(item.num_iid || item.item_id || '');
  const skus = skusOf(item);
  if (!skus.length) {
    out.push({ _coll: '_inventory', platform_inventory_item_id: `i${group}`, platform_available: Number.isFinite(num(item.num)) ? num(item.num) : null });
    return out;
  }
  for (const sku of skus) {
    out.push({
      _coll: '_inventory',
      platform_inventory_item_id: String(sku.sku_id || sku.skuId || ''),
      platform_available: Number.isFinite(num(sku.quantity != null ? sku.quantity : item.num))
        ? num(sku.quantity != null ? sku.quantity : item.num) : null,
    });
  }
  return out;
}

// ── 订单归一化：trade = taobao.trades.sold.get / taobao.trade.fullinfo.get 的单个交易 ──
// trade: { tid, status, created, pay_time, consign_time, end_time, buyer_nick, payment, post_fee,
//          receiver_name/state/city/district/address/mobile/phone, orders:{ order:[{oid,num,title,price,payment,sku_id,outer_sku_id}] } }
function orderLines(trade) {
  const o = trade && trade.orders && (trade.orders.order || trade.orders);
  if (Array.isArray(o)) return o;
  if (o) return [o];
  return [];
}
function normalizeOrder(trade, shopName) {
  const out = [];
  const status = orderStatus(trade.status);
  const tid = String(trade.tid || trade.order_id || '');
  const cur = 'CNY';
  // 收件人 PII 在聚石塔外为密文/脱敏，本机拿不到明文；如实取字段、取不到留空，不中断同步。
  const receiverName = trade.receiver_name || '';
  const receiverPhone = trade.receiver_mobile || trade.receiver_phone || '';
  const lines = orderLines(trade);
  lines.forEach((line, i) => {
    const qty = num(line.num) || 1;
    const unit = num(line.price);
    const isFirst = i === 0;
    out.push({
      _coll: 'orders',
      ext_key: `taobao:order${tid}L${i + 1}`,
      order_no: tid,
      parent_order_no: tid,
      platform: 'taobao',
      shop_name: shopName,
      platform_order_id: tid,
      platform_product_id: String(line.num_iid || line.item_id || ''),
      platform_variant_id: String(line.sku_id || ''),
      platform_sku: line.outer_sku_id || '',
      product_name: line.title || '',
      qty,
      unit_price: unit,
      total_amount: num(line.payment) || qty * unit,
      currency: cur,
      status,
      buyer: trade.buyer_nick || '',
      buyer_name: receiverName,
      buyer_email: '',
      buyer_phone: receiverPhone,
      ship_country: 'CN',
      ship_province: trade.receiver_state || '',
      ship_city: trade.receiver_city || '',
      ship_zip: '',
      ship_address: [trade.receiver_district, trade.receiver_address].filter(Boolean).join(' '),
      order_shipping: isFirst ? num(trade.post_fee) : 0,
      order_tax: 0,
      order_discount: 0,
      order_total: isFirst ? num(trade.payment) : 0,
      platform_created_at: trade.created || trade.create || '',
      platform_updated_at: trade.end_time || trade.modified || trade.pay_time || '',
    });
  });
  if (!out.length) {
    out.push({
      _coll: 'orders',
      ext_key: `taobao:order${tid}L1`,
      order_no: tid, parent_order_no: tid,
      platform: 'taobao', shop_name: shopName, platform_order_id: tid,
      platform_product_id: '', platform_variant_id: '', platform_sku: '', product_name: '',
      qty: 1, unit_price: num(trade.payment), total_amount: num(trade.payment),
      currency: cur, status, buyer: trade.buyer_nick || '',
      buyer_name: receiverName, buyer_email: '', buyer_phone: receiverPhone,
      ship_country: 'CN', ship_province: trade.receiver_state || '', ship_city: trade.receiver_city || '',
      ship_zip: '', ship_address: trade.receiver_address || '',
      order_shipping: 0, order_tax: 0, order_discount: 0, order_total: num(trade.payment),
      platform_created_at: trade.created || '', platform_updated_at: trade.end_time || '',
    });
  }
  return out;
}

// 从 trades.sold.get 响应取 trade 数组（兼容 trades.trade 包裹与直数组）
function tradeListArr(data) {
  if (!data) return [];
  const trades = data.trades || data.trade || data;
  if (Array.isArray(trades)) return trades;
  if (trades.trade) return Array.isArray(trades.trade) ? trades.trade : [trades.trade];
  return [];
}
// 从 items.onsale.get 响应取 item 数组
function itemListArr(data) {
  if (!data) return [];
  const items = data.items || data.items_list || data;
  if (Array.isArray(items)) return items;
  if (items.item) return Array.isArray(items.item) ? items.item : [items.item];
  return [];
}

// ── 连接测试：先校验必填凭证；再对真实网关做一次轻量只读调用（出售中商品第 1 页 1 条）。
// 任何失败（含云外拦截、无效凭证、appkey 不存在）一律 ok:false 并给可读信息，绝不假阳性。 ──
async function test(creds, ctx) {
  if (!String(creds.appKey || '').trim() || !String(creds.appSecret || '').trim() || !String(creds.accessToken || '').trim()) {
    return { ok: false, error: ctx.t('conn_cred_required') };
  }
  const r = await callTop(creds, ctx, 'taobao.items.onsale.get', { page_no: 1, page_size: 1 });
  if (r.error) return { ok: false, error: r.error };
  const seller = String(creds.sellerNick || 'shop');
  return {
    ok: true,
    shop_name: `淘宝/天猫（${seller}）`,
    shop_domain: seller,
    currency: 'CNY',
    plan: '',
  };
}

// ── fetchResource ──
async function fetchResource(creds, resource, cursor, ctx) {
  const records = [];
  let nextCursor = cursor || '';
  const seller = String(creds.sellerNick || 'shop');
  const shopName = `淘宝/天猫（${seller}）`;
  const currency = ctx.shopCurrency || 'CNY';

  if (resource === 'products' || resource === 'inventory') {
    // taobao.items.onsale.get：page_no 从 1、page_size ≤50；modified 时间窗做增量
    const pageSize = 50;
    let page = 1;
    const maxPage = 200;
    for (; page <= maxPage; page += 1) {
      const biz = { page_no: page, page_size: pageSize };
      if (nextCursor) biz.modified_start = nextCursor;
      const r = await callTop(creds, ctx, 'taobao.items.onsale.get', biz);
      if (r.error || !r.data) break;
      const items = itemListArr(r.data);
      if (!items.length) break;
      for (const it of items) {
        if (resource === 'products') records.push(...normalizeListing(it, shopName, currency));
        else records.push(...normalizeInventory(it));
        if (it.modified && String(it.modified) > String(nextCursor || '')) nextCursor = String(it.modified);
      }
      const totalPage = Number(r.data.total_page) || page;
      if (page >= totalPage) break;
    }
    return { records, nextCursor };
  }

  if (resource === 'orders') {
    // taobao.trades.sold.get：三分钟内已卖出交易；start_modified/end_modified 增量（GMT+8）
    const now = Date.now();
    const end = gmt8Now();
    const start = nextCursor || gmt8Now(new Date(now - 90 * 24 * 3600 * 1000));
    const pageSize = 50;
    let page = 1;
    for (; page <= 40; page += 1) {
      const r = await callTop(creds, ctx, 'taobao.trades.sold.get', {
        page_no: page, page_size: pageSize,
        start_modified: start, end_modified: end,
        fields: 'tid,status,created,pay_time,consign_time,end_time,buyer_nick,payment,post_fee,orders',
      });
      if (r.error || !r.data) break;
      const list = tradeListArr(r.data);
      for (const t of list) {
        records.push(...normalizeOrder(t, shopName));
        if (t.end_time || t.modified) nextCursor = String(t.end_time || t.modified);
      }
      const totalPage = Number(r.data.total_page) || page;
      if (page >= totalPage || !list.length) break;
    }
    if (!nextCursor) nextCursor = start;
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
  digestBase,
  signRequest,
  formEncode,
  callTop,
  orderStatus,
  normalizeOrder,
  normalizeListing,
  normalizeInventory,
  tradeListArr,
  itemListArr,
  skusOf,
  gmt8Now,
};
