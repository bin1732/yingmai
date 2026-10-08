// 抖音电商（抖店）店铺适配器：用卖家自己的 App Key/Secret + 商家授权 access_token 在本机直连抖店开放网关。
// 鉴权 = access_token（自用型应用 /token/create 获取，约 7 天）+ 业务签名（MD5 默认 / HMAC-SHA256 推荐），纯本机、零服务器。
// 注意：第三方工具型应用仅企业可入驻，个人/个体户无法注册；自研自用需企业营业执照 + 电商类软著 + 主体一致；
//       存在 IP 白名单（isv.invalid_ip）。盈脉是本机直连 Electron，出口 IP 可能为家庭动态 IP，需在控制台配置白名单。
//       本适配器按官方文档预先实现签名/token/端点，但 META.status 定 restricted，绝不承诺能从本机打通经营接口。
// 灵感引擎工坊 · bin1732

const crypto = require('crypto');

// ── 抖店网关（2026-10-07 实时核验 research/domestic-b-research.md §1.2） ──
const GATEWAY = 'https://openapi-fxg.jinritemai.com';
// 自用型应用取 token：/token/create（grant_type=authorization_self，需 shop_id）；刷新 /token/refresh。
const TOKEN_CREATE = GATEWAY + '/token/create';
const TOKEN_REFRESH = GATEWAY + '/token/refresh';

const META = {
  id: 'douyin',
  name: { zh: '抖音电商（抖店）', en: 'Douyin (Douyin Shop)' },
  category: 'domestic',
  // 代码按官方文档预实现（网关/签名/token/order+product 端点）；但订单等经营 API 须企业营业执照 + 电商类软著 + 主体一致（自研），
  // 第三方工具型应用个人/个体户明确无法入驻；且有 IP 白名单。盈脉是本机直连 Electron，出口 IP 需在控制台配置。
  // 故严格定 restricted（不标 gated/self），needs 与教程如实写明资质门槛与白名单要求，绝不承诺能连上。
  status: 'restricted',
  authType: 'douyin-sign',
  // 一般接口总限流约 500 次/秒，部分接口（数据推送）更低；逐接口精确 QPS 以各 API 文档页为准。
  // 桌面自用场景保守取 1s 间隔，遇限流（code 9）由 ctx.request 按 Retry-After/5xx 退避，不写死未证实配额。
  requestGapMs: 1000,
  resources: ['products', 'orders', 'inventory'],
  credentialFields: [
    {
      key: 'shopId', required: true, secret: false,
      label: { zh: '店铺 ID（shop_id）', en: 'Shop ID (shop_id)' },
      placeholder: { zh: '自用型应用授权店铺的 shop_id（与 access_token 一一对应）', en: 'shop_id of the authorized shop (one-to-one with the access_token)' },
    },
    {
      key: 'appKey', required: true, secret: false,
      label: { zh: 'App Key', en: 'App Key' },
      placeholder: { zh: '通过审核的自研应用分配的 app_key（19 位纯数字）', en: 'app_key of your approved in-house app (19 digits)' },
    },
    {
      key: 'appSecret', required: true, secret: true,
      label: { zh: 'App Secret（密钥）', en: 'App Secret (secret)' },
      placeholder: { zh: '自研应用的 app_secret，仅用于本机签名，不会上传', en: 'app_secret of your app, used for local signing only, never uploaded' },
    },
    {
      key: 'accessToken', required: true, secret: true,
      label: { zh: 'Access Token', en: 'Access Token' },
      placeholder: { zh: '商家授权后的 access_token（约 7 天有效，过期前 1h 可换取新 token）', en: 'access_token from shop authorization (valid ~7 days; refresh within 1h of expiry)' },
    },
  ],
  official: {
    docs: 'https://op.jinritemai.com/docs',
    signup: 'https://op.jinritemai.com/',
    devapps: 'https://op.jinritemai.com/docs/guide-docs/6/583',
  },
  scopes: [
    'order.searchList（订单列表，最多近 90 天）',
    'order.orderDetail（订单详情）',
    'sku.list（商品 SKU 列表）',
    'product.getGoodsCategory（商品类目）',
  ],
  needs: [
    '第三方工具型应用仅支持企业入驻，个人和个体工商户资质无法入驻；自研自用（商家后台系统）还需企业营业执照 + 电商类国家软件著作权 + 软著主体/开发者主体/授权店铺主体三者一致（或强关联），审核约 1–3 个工作日。',
    '存在 IP 白名单：接口报错 sub_code "isv.invalid_ip" 表示请求来源 IP 不可信。盈脉运行在用户本机，出口 IP 多为家庭宽带动态 IP，需在开放平台控制台配置白名单；动态 IP 变化时需补报。',
    '自用型应用 grant_type=authorization_self 取 token，需传 shop_id；access_token 约 7 天，过期前 1h 调用 create 返回新 token、旧 token 续效 1h，过期后调用返回全新 token、旧 token 立即失效。',
    '收件人姓名/手机/地址等 PII 受平台数据权限与加密规则约束，未申请相应权限时拿不到明文；这些 PII 字段留空，不中断同步。',
    'method 取值与 param_json 精确字段名以登录控制台 API 文档为准；本适配器按官方字段形状预先实现，接入前建议在“在线调试”核对真实报文。',
  ],
  regions: ['中国大陆（抖店，人民币 CNY）'],
};

// ── 时间格式化（签名 timestamp 要求 GMT+8，yyyy-MM-dd HH:mm:ss） ──
function pad(n) { return String(n).padStart(2, '0'); }
function gmt8Now() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date()).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  if (parts.hour === '24') parts.hour = '00';
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

// ── param_json：业务参数 JSON，内部 key 按字母排序（research §1.2） ──
function buildParamJson(biz) {
  if (!biz || typeof biz !== 'object') return '{}';
  const sorted = {};
  for (const k of Object.keys(biz).sort()) sorted[k] = biz[k];
  return JSON.stringify(sorted);
}

// ── 抖店签名（research §1.2：公共参数 method/app_key/access_token/param_json/timestamp/v/sign/sign_method） ──
// 参与签名：所有请求参数中剔除 access_token 与 sign_method（以及 sign 本身）与空值；按参数名 ASCII 升序；
// 参数名+参数值依次直拼；app_secret 分别拼接在拼接串首尾（MD5 模式）或作为 HMAC-SHA256 密钥。
function buildSignBase(params) {
  return Object.keys(params)
    .filter((k) => k !== 'sign' && k !== 'access_token' && k !== 'sign_method'
      && params[k] !== '' && params[k] != null)
    .sort()
    .map((k) => k + String(params[k]))
    .join('');
}
// signMethod: 'md5'（默认）或 'hmac-sha256'（推荐）
function digestBase(secret, base, signMethod) {
  if (signMethod === 'hmac-sha256') {
    return crypto.createHmac('sha256', String(secret)).update(base, 'utf8').digest('hex');
  }
  return crypto.createHash('md5').update(String(secret) + base + String(secret), 'utf8').digest('hex');
}
function signRequest(secret, params, signMethod) {
  return digestBase(secret, buildSignBase(params), signMethod || 'md5');
}

// query 编码（公共参数拼进 URL，参考官方 token/create 示例）
function qs(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== '' && obj[k] != null)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`).join('&');
}

// 成功信封：{ data: {...}, code: 10000, msg: "success", sub_code: "", sub_msg: "" }
// 业务失败：code != 10000（如 11 签名失败、30001 认证失败、30002 token 过期、9 访问太频繁）
// 非 JSON / 空响统一视为错误，绝不误判成功（防假阳性）。
function unwrapEnvelope(json) {
  if (!json || typeof json !== 'object') return { error: 'empty or non-JSON response from douyin gateway' };
  if (Number(json.code) === 10000) return { data: json.data != null ? json.data : json };
  return { error: json };
}
function friendlyError(er) {
  if (!er) return '';
  if (typeof er === 'string') return er.slice(0, 160);
  return String(er.sub_msg || er.sub_code || er.msg || er.code || 'douyin error').slice(0, 160);
}

// 调一次抖店网关：组装公共参数 + param_json，签名后拼进 URL 发起 GET（官方示例为 query 传参）
async function callDouyin(creds, ctx, method, biz, signMethod) {
  const sm = signMethod || creds.signMethod || 'md5';
  const params = {
    method,
    app_key: creds.appKey,
    access_token: creds.accessToken,
    param_json: buildParamJson(biz),
    timestamp: gmt8Now(),
    v: '2',
    sign_method: sm,
  };
  params.sign = signRequest(creds.appSecret, params, sm);
  const url = GATEWAY + '?' + qs(params);
  const r = await ctx.request(url, { method: 'GET' });
  if (r.error) return { error: r.error };
  const env = unwrapEnvelope(r.json);
  if (env.error) return { error: friendlyError(env.error) };
  return { data: env.data };
}

// ── token（自用型应用，research §1.2：/token/create grant_type=authorization_self 需 shop_id） ──
// 这两个端点同样走签名；此处给出构造，未在本机实测（无企业资质）。
function buildTokenParams(creds, grantType, extra) {
  const params = Object.assign({
    method: 'token.create',
    app_key: creds.appKey,
    param_json: buildParamJson(Object.assign({ grant_type: grantType, shop_id: creds.shopId }, extra || {})),
    timestamp: gmt8Now(),
    v: '2',
    sign_method: creds.signMethod || 'md5',
  });
  // token/create 不带 access_token
  params.sign = signRequest(creds.appSecret, params, params.sign_method);
  return params;
}

// ── 订单状态映射（抖店 order_status -> 统一五态；具体枚举以控制台为准，此处按常见口径防御映射） ──
// 1 待付款；2 待发货；3 已发货；4 已完成/已签收；5 已取消/关闭
function orderStatus(s) {
  const n = Number(s);
  if (Number.isFinite(n) && s !== '') {
    switch (n) {
      case 1: return 'pending';
      case 2: return 'paid';
      case 3: return 'shipped';
      case 4: return 'completed';
      case 5: return 'cancelled';
      default: return 'pending';
    }
  }
  switch (String(s)) {
    case 'WAIT_BUYER_PAY': return 'pending';
    case 'WAIT_SELLER_SEND': return 'paid';
    case 'SHIPPED': case 'IN_DELIVERY': return 'shipped';
    case 'SUCCESS': case 'COMPLETED': return 'completed';
    case 'CANCEL': case 'CLOSED': return 'cancelled';
    default: return 'pending';
  }
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// 防御式取 SKU 数组（商品可能为 sku_list / skus / data 多种包裹）
function skusOf(item) {
  if (!item) return [];
  const skus = item.sku_list || item.skus || item.sku || item.specs;
  if (Array.isArray(skus)) return skus;
  if (skus && Array.isArray(skus.list)) return skus.list;
  return [];
}
function firstImage(item) {
  if (!item) return '';
  if (item.img) return String(item.img);
  if (item.img_url) return String(item.img_url);
  if (item.pic) return String(item.pic);
  const imgs = item.img_list || (item.image && item.image.url);
  if (Array.isArray(imgs)) return String((imgs[0] && (imgs[0].url || imgs[0])) || '');
  if (typeof imgs === 'string') return imgs;
  return '';
}

// ── 商品归一化：item = 商品/SKU 列表项（按官方字段形状防御取值） ──
function normalizeListing(item, shopName, currency) {
  const out = [];
  const group = String(item.product_id || item.productId || item.item_id || '');
  const cur = currency || 'CNY';
  const title = item.name || item.title || group;
  const img = firstImage(item);
  const skus = skusOf(item);
  if (!skus.length) {
    out.push({
      _coll: 'listings',
      ext_key: `douyin:p${group}v0`,
      platform: 'douyin',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: '0',
      platform_inventory_item_id: `i${group}`,
      platform_sku: item.out_sku_id || item.code || '',
      title,
      listing_price: num(item.price != null ? item.price : item.min_price),
      currency: cur,
      url: `https://haohuo.jinritemai.com/views/product/item2?id=${group}`,
      image: img,
      vendor: '',
      platform_available: Number.isFinite(num(item.stock != null ? item.stock : item.total_stock))
        ? num(item.stock != null ? item.stock : item.total_stock) : null,
      status: 'active',
      platform_updated_at: item.update_time || item.modify_time || '',
    });
    return out;
  }
  for (const sku of skus) {
    const sid = String(sku.sku_id || sku.spec_id || sku.id || '');
    const attr = sku.sku_spec || sku.spec_detail || '';
    out.push({
      _coll: 'listings',
      ext_key: `douyin:p${group}v${sid}`,
      platform: 'douyin',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: sid,
      platform_inventory_item_id: sid,
      platform_sku: sku.out_sku_id || sku.outer_sku_id || sid,
      title: attr ? `${title} · ${attr}` : title,
      listing_price: num(sku.price != null ? sku.price : item.price),
      currency: cur,
      url: `https://haohuo.jinritemai.com/views/product/item2?id=${group}`,
      image: img,
      vendor: '',
      platform_available: Number.isFinite(num(sku.stock != null ? sku.stock : item.stock))
        ? num(sku.stock != null ? sku.stock : item.stock) : null,
      status: 'active',
      platform_updated_at: item.update_time || item.modify_time || '',
    });
  }
  return out;
}

function normalizeInventory(item) {
  const out = [];
  const group = String(item.product_id || item.productId || item.item_id || '');
  const skus = skusOf(item);
  if (!skus.length) {
    out.push({ _coll: '_inventory', platform_inventory_item_id: `i${group}`, platform_available: Number.isFinite(num(item.stock != null ? item.stock : item.total_stock)) ? num(item.stock != null ? item.stock : item.total_stock) : null });
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

// ── 订单归一化：order = order.searchList / order.orderDetail 的单个订单 ──
// order: { order_id, order_status, pay_amount, post_amount, create_time, update_time,
//          receiver_name, receiver_tel, province_name, city_name, town_name, detail_address,
//          product_order_detail:[{item_id, spec_id, out_sku_id, item_name, price, item_num, pay_amount}] }
function orderLines(order) {
  const d = order && (order.product_order_detail || order.item_list || order.order_items);
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.list)) return d.list;
  return [];
}
function normalizeOrder(order, shopName) {
  const out = [];
  const status = orderStatus(order.order_status);
  const oid = String(order.order_id || order.id || '');
  const cur = 'CNY';
  // 收件人 PII 受平台数据权限/加密约束，未授权时拿不到明文；如实取字段、取不到留空，不中断同步。
  const receiverName = order.receiver_name || order.post_receiver || '';
  const receiverPhone = order.receiver_tel || order.receiver_phone || order.post_tel || '';
  const lines = orderLines(order);
  lines.forEach((line, i) => {
    const qty = num(line.item_num || line.num || line.count) || 1;
    const unit = num(line.price != null ? line.price : line.unit_price);
    const isFirst = i === 0;
    out.push({
      _coll: 'orders',
      ext_key: `douyin:order${oid}L${i + 1}`,
      order_no: oid,
      parent_order_no: oid,
      platform: 'douyin',
      shop_name: shopName,
      platform_order_id: oid,
      platform_product_id: String(line.item_id || line.product_id || ''),
      platform_variant_id: String(line.spec_id || line.sku_id || ''),
      platform_sku: line.out_sku_id || line.outer_sku_id || '',
      product_name: line.item_name || line.title || '',
      qty,
      unit_price: unit,
      total_amount: num(line.pay_amount != null ? line.pay_amount : line.amount) || qty * unit,
      currency: cur,
      status,
      buyer: order.buyer_words || order.buyer_user_id || '',
      buyer_name: receiverName,
      buyer_email: '',
      buyer_phone: receiverPhone,
      ship_country: 'CN',
      ship_province: order.province_name || '',
      ship_city: order.city_name || '',
      ship_zip: '',
      ship_address: [order.town_name, order.detail_address].filter(Boolean).join(' '),
      order_shipping: isFirst ? num(order.post_amount) : 0,
      order_tax: 0,
      order_discount: 0,
      order_total: isFirst ? num(order.pay_amount) : 0,
      platform_created_at: order.create_time || '',
      platform_updated_at: order.update_time || '',
    });
  });
  if (!out.length) {
    out.push({
      _coll: 'orders',
      ext_key: `douyin:order${oid}L1`,
      order_no: oid, parent_order_no: oid,
      platform: 'douyin', shop_name: shopName, platform_order_id: oid,
      platform_product_id: '', platform_variant_id: '', platform_sku: '', product_name: '',
      qty: 1, unit_price: num(order.pay_amount), total_amount: num(order.pay_amount),
      currency: cur, status, buyer: order.buyer_words || '',
      buyer_name: receiverName, buyer_email: '', buyer_phone: receiverPhone,
      ship_country: 'CN', ship_province: order.province_name || '', ship_city: order.city_name || '',
      ship_zip: '', ship_address: order.detail_address || '',
      order_shipping: 0, order_tax: 0, order_discount: 0, order_total: num(order.pay_amount),
      platform_created_at: order.create_time || '', platform_updated_at: order.update_time || '',
    });
  }
  return out;
}

// 从 order.searchList 响应取订单数组（兼容 data.order_list / data.list / data.data 包裹）
function orderListArr(data) {
  if (!data) return [];
  const list = data.order_list || data.list || data.data || data;
  if (Array.isArray(list)) return list;
  if (list && Array.isArray(list.order)) return list.order;
  return [];
}
// 从商品列表响应取商品数组
function productListArr(data) {
  if (!data) return [];
  const list = data.data || data.product_list || data.list || data;
  if (Array.isArray(list)) return list;
  if (list && Array.isArray(list.products)) return list.products;
  return [];
}

// ── 连接测试：先校验必填凭证；再对真实网关做一次轻量只读调用（订单列表第 1 页 1 条）。
// 任何失败（无效凭证/签名失败/IP 白名单不满足/资质不足）一律 ok:false 并给可读信息，绝不假阳性。 ──
async function test(creds, ctx) {
  if (!String(creds.appKey || '').trim() || !String(creds.appSecret || '').trim()
    || !String(creds.accessToken || '').trim() || !String(creds.shopId || '').trim()) {
    return { ok: false, error: ctx.t('conn_cred_required') };
  }
  const r = await callDouyin(creds, ctx, 'order.searchList', { page: 1, size: 1 });
  if (r.error) return { ok: false, error: r.error };
  return {
    ok: true,
    shop_name: `抖店（${creds.shopId}）`,
    shop_domain: String(creds.shopId),
    currency: 'CNY',
    plan: '',
  };
}

// ── fetchResource ──
async function fetchResource(creds, resource, cursor, ctx) {
  const records = [];
  let nextCursor = cursor || '';
  const shopName = `抖店（${creds.shopId || 'shop'}）`;
  const currency = ctx.shopCurrency || 'CNY';

  if (resource === 'products' || resource === 'inventory') {
    // 商品/SKU 列表：page 从 1、size 保守 50；update_time 作水位做增量
    let page = 1;
    const size = 50;
    const maxPage = 200;
    for (; page <= maxPage; page += 1) {
      const biz = { page, size };
      const r = await callDouyin(creds, ctx, 'sku.list', biz);
      if (r.error || !r.data) break;
      const items = productListArr(r.data);
      if (!items.length) break;
      for (const it of items) {
        if (resource === 'products') records.push(...normalizeListing(it, shopName, currency));
        else records.push(...normalizeInventory(it));
        if (it.update_time && String(it.update_time) > String(nextCursor || '')) nextCursor = String(it.update_time);
      }
      if (items.length < size) break;
    }
    return { records, nextCursor };
  }

  if (resource === 'orders') {
    // order.searchList：page/size；支持下单/更新时间排序，最大近 90 天。此处按更新时间增量。
    const size = 50;
    let page = 1;
    for (; page <= 40; page += 1) {
      const biz = { page, size };
      if (nextCursor) biz.update_start_time = nextCursor;
      const r = await callDouyin(creds, ctx, 'order.searchList', biz);
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
  buildParamJson,
  buildSignBase,
  digestBase,
  signRequest,
  qs,
  callDouyin,
  unwrapEnvelope,
  friendlyError,
  buildTokenParams,
  orderStatus,
  normalizeOrder,
  normalizeListing,
  normalizeInventory,
  orderListArr,
  productListArr,
  skusOf,
  gmt8Now,
};
