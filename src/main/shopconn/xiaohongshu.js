// 小红书（千帆 / 开放平台）店铺适配器：用卖家自己的 appId/appSecret + 商家 accessToken 在本机直连 common_controller 统一入口。
// 鉴权 = accessToken（OAuth2 code 授权 / 自研控制台加店铺后获取，约 7 天）+ MD5 业务签名，纯本机、零服务器。
// 注意：商家自研明确排除个人/个体工商户（须企业店）；软件服务商须中国大陆注册企业、成立 1 年以上、经营范围含技术开发。
//       本适配器按官方文档预先实现签名/OAuth/端点，但 META.status 定 restricted，绝不承诺能从本机打通经营接口。
// 灵感引擎工坊 · bin1732

const crypto = require('crypto');

// ── 小红书开放平台（2026-10-07 实时核验 research/domestic-b-research.md §3.2） ──
// 统一入口：所有业务接口都走 common_controller，用 method 参数区分具体接口。
const GATEWAY = 'https://ark.xiaohongshu.com/ark/open_api/v3/common_controller';
// OAuth2 code 授权流程（软件服务商）：授权页与换 token 端点以控制台为准（主站为 SPA，本次未直读正文）。
const OAUTH_AUTHORIZE = 'https://open.xiaohongshu.com/';

const META = {
  id: 'xiaohongshu',
  name: { zh: '小红书电商（千帆）', en: 'Xiaohongshu (Qianfan)' },
  category: 'domestic',
  // 代码按官方文档预实现（common_controller + MD5 签名 + method 调用）；但商家自研明确要求“自有店铺类型非个人/个体工商户”（须企业店），
  // 软件服务商须中国大陆注册企业、成立 1 年以上、经营范围含技术开发。个人与个体工商户在千帆均无自助接入路径。
  // 故严格定 restricted（不标 gated/self），needs 与教程如实写明主体门槛，绝不承诺能连上。
  status: 'restricted',
  authType: 'xhs-md5',
  // 统一限流阈值本次抓取的官方文档未明确列出；逐接口限流以控制台为准。
  // 桌面自用场景保守取 1s 间隔，遇限流由 ctx.request 按 Retry-After/5xx 退避，不写死未证实配额。
  requestGapMs: 1000,
  resources: ['products', 'orders', 'inventory'],
  credentialFields: [
    {
      key: 'shopId', required: false, secret: false,
      label: { zh: '店铺 ID（可空）', en: 'Shop ID (optional)' },
      placeholder: { zh: '自研授权的店铺 id，可空，仅用于展示', en: 'Authorized shop id (optional, display only)' },
    },
    {
      key: 'appId', required: true, secret: false,
      label: { zh: 'App ID', en: 'App ID' },
      placeholder: { zh: '资质审核通过后开放平台分配的 appId', en: 'appId assigned after qualification review' },
    },
    {
      key: 'appSecret', required: true, secret: true,
      label: { zh: 'App Secret（密钥）', en: 'App Secret (secret)' },
      placeholder: { zh: '应用的 appSecret，仅用于本机 MD5 签名，不会上传', en: 'appSecret of your app, used for local MD5 signing only, never uploaded' },
    },
    {
      key: 'accessToken', required: true, secret: true,
      label: { zh: 'Access Token', en: 'Access Token' },
      placeholder: { zh: '商家授权后的 accessToken（约 7 天有效；refreshToken 约 14 天）', en: 'accessToken from shop authorization (valid ~7d; refreshToken ~14d)' },
    },
    {
      key: 'refreshToken', required: false, secret: true,
      label: { zh: 'Refresh Token（可空）', en: 'Refresh Token (optional)' },
      placeholder: { zh: '授权返回的 refreshToken（约 14 天），用于换新 accessToken，可空', en: 'refreshToken from authorization (valid ~14d); used to refresh accessToken, optional' },
    },
  ],
  official: {
    docs: 'https://open.xiaohongshu.com/',
    signup: 'https://open.xiaohongshu.com/',
    devapps: 'https://xiaohongshu.apifox.cn/doc-2811119',
  },
  scopes: [
    'ProductClient（商品读取）',
    'PackageClient / 订单轮询（订单读取）',
    'InventoryClient（库存读取）',
    'AfterSaleClient（售后读取）',
  ],
  needs: [
    '商家自研明确要求“自有店铺类型非个人/个体工商户”，即必须是企业店才能使用自研应用；软件服务商须中国大陆注册企业、存续状态、成立 1 年以上、经营范围含计算机系统集成/技术开发且未在经营异常名录。个人卖家与个体工商户在小红书千帆均无自助接入路径。',
    '自研商家授权：在控制台应用管理 → 授权管理添加店铺 id → 复制授权链接给商家（须店铺主账号）→ 商家授权后获取 token；软件服务商为标准 OAuth2 code 流程，应用需上架服务市场后供商家订购。',
    'accessToken 约 7 天，refreshToken 约 14 天；刷新规则：accessToken 剩余 >30 分钟刷新不更新，剩余 <30 分钟返回新 token 对，过期后刷新得到全新 token 对。',
    '买家 PII（收件人姓名/电话/地址）受平台数据权限约束，订单详情需另调收件人详细地址接口；未授权时拿不到明文，这些 PII 字段留空，不中断同步。',
    'open.xiaohongshu.com 主站为 SPA，正文通过官方 Apifox 镜像获取；method 取值与分页精确字段名以控制台在线调试为准，本适配器按官方字段形状预先实现。',
  ],
  regions: ['中国大陆（小红书千帆，人民币 CNY）'],
};

// ── 工具 ──
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function epochSec() { return String(Math.floor(Date.now() / 1000)); }

// ── 小红书 MD5 签名（research §3.2 签名算法） ──
// 参与验签的系统参数：appId、timestamp、version、method（accessToken 不参与验签）。
// 拼接：`method?appId=xxx&timestamp=xxx&version=xxx` 后直接拼接 appSecret；对整体做 MD5 得到 sign。
function buildSignBase(creds, method, timestamp) {
  return `${method}?appId=${creds.appId}&timestamp=${timestamp}&version=2.0` + String(creds.appSecret);
}
function signRequest(creds, method, timestamp) {
  return crypto.createHash('md5').update(buildSignBase(creds, method, timestamp), 'utf8').digest('hex');
}

// 成功/失败：统一 common_controller 返回 JSON，成功判断依据业务 code；错误信封通常带 error_no/err_no/error_msg 等字段。
// 防御式：出现可识别错误标志即视为失败；非 JSON / 空响一律视为错误，绝不误判成功（防假阳性）。
function unwrapEnvelope(json) {
  if (!json || typeof json !== 'object') return { error: 'empty or non-JSON response from xiaohongshu gateway' };
  if (json.success === false) return { error: json };
  if (json.error_no != null || json.err_no != null || json.error_code != null
    || json.sub_code != null || json.error_msg != null || json.err_msg != null) {
    // code=0/200 视为成功，其余视为错误
    if (json.code != null && [0, 200].includes(Number(json.code))) return { data: json.data != null ? json.data : json };
    if (json.code == null) return { error: json };
  }
  if (json.code != null && ![0, 200].includes(Number(json.code))) return { error: json };
  return { data: json.data != null ? json.data : json };
}
function friendlyError(er) {
  if (!er) return '';
  if (typeof er === 'string') return er.slice(0, 160);
  return String(er.error_msg || er.err_msg || er.message || er.error_no || er.err_no || er.error_code || er.code || 'xiaohongshu error').slice(0, 160);
}

// 调一次 common_controller：JSON body 携带系统参数 + 业务参数，MD5 签名
async function callXhs(creds, ctx, method, biz) {
  const timestamp = epochSec();
  const body = Object.assign({
    appId: creds.appId,
    version: '2.0',
    method,
    timestamp,
    sign: signRequest(creds, method, timestamp),
  }, biz || {});
  // accessToken 放 body，不参与验签
  if (creds.accessToken) body.accessToken = creds.accessToken;
  const r = await ctx.request(GATEWAY, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  if (r.error) return { error: r.error };
  const env = unwrapEnvelope(r.json);
  if (env.error) return { error: friendlyError(env.error) };
  return { data: env.data };
}

// ── 订单状态映射（千帆 order_status -> 统一五态；具体枚举以控制台为准，此处按常见口径防御映射） ──
function orderStatus(s) {
  switch (String(s)) {
    case 'WAIT_BUYER_PAY':
    case 'UNPAID':
    case 'PENDING':
      return 'pending';
    case 'WAIT_SELLER_DELIVER':
    case 'WAIT_DELIVER':
    case 'PAID':
      return 'paid';
    case 'DELIVERED':
    case 'SHIPPED':
      return 'shipped';
    case 'FINISHED':
    case 'COMPLETED':
      return 'completed';
    case 'CANCELED':
    case 'CLOSED':
    case 'CANCELLED':
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
  return [];
}
function firstImage(item) {
  if (!item) return '';
  if (item.cover_url) return String(item.cover_url);
  if (item.img) return String(item.img);
  const imgs = item.image_list || item.images;
  if (Array.isArray(imgs)) return String((imgs[0] && (imgs[0].url || imgs[0])) || '');
  return '';
}

// ── 商品归一化：item = ProductClient 列表项（按官方字段形状防御取值） ──
function normalizeListing(item, shopName, currency) {
  const out = [];
  const group = String(item.product_id || item.item_id || item.id || '');
  const cur = currency || 'CNY';
  const title = item.name || item.title || group;
  const img = firstImage(item);
  const skus = skusOf(item);
  if (!skus.length) {
    out.push({
      _coll: 'listings',
      ext_key: `xiaohongshu:p${group}v0`,
      platform: 'xiaohongshu',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: '0',
      platform_inventory_item_id: `i${group}`,
      platform_sku: item.out_sku_id || item.code || '',
      title,
      listing_price: num(item.price != null ? item.price : item.sale_price),
      currency: cur,
      url: '',
      image: img,
      vendor: '',
      platform_available: Number.isFinite(num(item.stock)) ? num(item.stock) : null,
      status: 'active',
      platform_updated_at: item.update_time || '',
    });
    return out;
  }
  for (const sku of skus) {
    const sid = String(sku.sku_id || sku.id || '');
    out.push({
      _coll: 'listings',
      ext_key: `xiaohongshu:p${group}v${sid}`,
      platform: 'xiaohongshu',
      shop_name: shopName,
      platform_product_id: group,
      platform_product_group: group,
      platform_variant_id: sid,
      platform_inventory_item_id: sid,
      platform_sku: sku.out_sku_id || sid,
      title,
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
  const group = String(item.product_id || item.item_id || item.id || '');
  const skus = skusOf(item);
  if (!skus.length) {
    out.push({ _coll: '_inventory', platform_inventory_item_id: `i${group}`, platform_available: Number.isFinite(num(item.stock)) ? num(item.stock) : null });
    return out;
  }
  for (const sku of skus) {
    out.push({
      _coll: '_inventory',
      platform_inventory_item_id: String(sku.sku_id || sku.id || ''),
      platform_available: Number.isFinite(num(sku.stock != null ? sku.stock : item.stock)) ? num(sku.stock != null ? sku.stock : item.stock) : null,
    });
  }
  return out;
}

// ── 订单归一化：order = PackageClient 订单 ──
function orderLines(order) {
  const d = order && (order.product_list || order.item_list || order.order_items);
  if (Array.isArray(d)) return d;
  return [];
}
function normalizeOrder(order, shopName) {
  const out = [];
  const status = orderStatus(order.order_status != null ? order.order_status : order.status);
  const oid = String(order.order_id || order.package_id || order.id || '');
  const cur = 'CNY';
  // 收件人 PII 需另调收件人详细地址接口；未授权时拿不到明文，留空不中断同步。
  const receiverName = order.receiver_name || order.address_name || '';
  const receiverPhone = order.receiver_phone || order.address_phone || '';
  const lines = orderLines(order);
  lines.forEach((line, i) => {
    const qty = num(line.quantity != null ? line.quantity : line.count) || 1;
    const unit = num(line.price != null ? line.price : line.unit_price);
    const isFirst = i === 0;
    out.push({
      _coll: 'orders',
      ext_key: `xiaohongshu:order${oid}L${i + 1}`,
      order_no: oid,
      parent_order_no: oid,
      platform: 'xiaohongshu',
      shop_name: shopName,
      platform_order_id: oid,
      platform_product_id: String(line.product_id || line.item_id || ''),
      platform_variant_id: String(line.sku_id || ''),
      platform_sku: line.out_sku_id || '',
      product_name: line.product_name || line.title || '',
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
      ship_address: [order.town, order.address_detail].filter(Boolean).join(' '),
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
      ext_key: `xiaohongshu:order${oid}L1`,
      order_no: oid, parent_order_no: oid,
      platform: 'xiaohongshu', shop_name: shopName, platform_order_id: oid,
      platform_product_id: '', platform_variant_id: '', platform_sku: '', product_name: '',
      qty: 1, unit_price: num(order.order_total), total_amount: num(order.order_total),
      currency: cur, status, buyer: order.buyer_id || '',
      buyer_name: receiverName, buyer_email: '', buyer_phone: receiverPhone,
      ship_country: 'CN', ship_province: order.province || '', ship_city: order.city || '',
      ship_zip: '', ship_address: order.address_detail || '',
      order_shipping: 0, order_tax: 0, order_discount: 0, order_total: num(order.order_total),
      platform_created_at: order.create_time || '', platform_updated_at: order.update_time || '',
    });
  }
  return out;
}

function orderListArr(data) {
  if (!data) return [];
  const list = data.order_list || data.list || data.orders || data;
  if (Array.isArray(list)) return list;
  return [];
}
function productListArr(data) {
  if (!data) return [];
  const list = data.product_list || data.list || data.products || data;
  if (Array.isArray(list)) return list;
  return [];
}

// ── 连接测试：先校验必填凭证；再对真实网关做一次轻量只读调用（订单轮询第 1 页 1 条）。
// 任何失败（无效凭证/资质不满足）一律 ok:false 并给可读信息，绝不假阳性。 ──
async function test(creds, ctx) {
  if (!String(creds.appId || '').trim() || !String(creds.appSecret || '').trim() || !String(creds.accessToken || '').trim()) {
    return { ok: false, error: ctx.t('conn_cred_required') };
  }
  const r = await callXhs(creds, ctx, 'order.list', { page_no: 1, page_size: 1 });
  if (r.error) return { ok: false, error: r.error };
  return {
    ok: true,
    shop_name: `小红书千帆（${creds.shopId || creds.appId}）`,
    shop_domain: String(creds.shopId || creds.appId || ''),
    currency: 'CNY',
    plan: '',
  };
}

// ── fetchResource ──
async function fetchResource(creds, resource, cursor, ctx) {
  const records = [];
  let nextCursor = cursor || '';
  const shopName = `小红书千帆（${creds.shopId || creds.appId || 'shop'}）`;
  const currency = ctx.shopCurrency || 'CNY';

  if (resource === 'products' || resource === 'inventory') {
    let pageNo = 1;
    const pageSize = 50;
    const maxPage = 200;
    for (; pageNo <= maxPage; pageNo += 1) {
      const biz = { page_no: pageNo, page_size: pageSize };
      const r = await callXhs(creds, ctx, 'product.list', biz);
      if (r.error || !r.data) break;
      const items = productListArr(r.data);
      if (!items.length) break;
      for (const it of items) {
        if (resource === 'products') records.push(...normalizeListing(it, shopName, currency));
        else records.push(...normalizeInventory(it));
      }
      if (items.length < pageSize) break;
    }
    return { records, nextCursor };
  }

  if (resource === 'orders') {
    const pageSize = 50;
    let pageNo = 1;
    for (; pageNo <= 40; pageNo += 1) {
      const biz = { page_no: pageNo, page_size: pageSize };
      if (nextCursor) biz.update_time = nextCursor;
      const r = await callXhs(creds, ctx, 'order.list', biz);
      if (r.error || !r.data) break;
      const list = orderListArr(r.data);
      for (const o of list) {
        records.push(...normalizeOrder(o, shopName));
        if (o.update_time && String(o.update_time) > String(nextCursor || '')) nextCursor = String(o.update_time);
      }
      if (!list.length || list.length < pageSize) break;
    }
    return { records, nextCursor };
  }

  return { records, nextCursor };
}

module.exports = {
  META,
  test,
  fetchResource,
  buildSignBase,
  signRequest,
  callXhs,
  unwrapEnvelope,
  orderStatus,
  normalizeOrder,
  normalizeListing,
  normalizeInventory,
  orderListArr,
  productListArr,
  skusOf,
};
