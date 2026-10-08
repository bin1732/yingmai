// Shopify 店铺适配器：使用自定义应用的 Admin API 访问令牌，在用户本机直连。
// 灵感引擎工坊 · bin1732

const API_VERSION = '2026-10';

const META = {
  id: 'shopify',
  name: { zh: 'Shopify', en: 'Shopify' },
  category: 'crossborder',
  status: 'available',
  requestGapMs: 500,
  resources: ['products', 'orders', 'inventory'],
  credentialFields: [
    {
      key: 'shop', required: true, secret: false,
      label: { zh: '店铺域名', en: 'Store domain' },
      placeholder: { zh: '例如 your-store（无需 .myshopify.com）', en: 'e.g. your-store (no .myshopify.com)' },
    },
    {
      key: 'token', required: true, secret: true,
      label: { zh: 'Admin API 访问令牌', en: 'Admin API access token' },
      placeholder: { zh: '以 shpat_ 开头', en: 'Starts with shpat_' },
    },
  ],
  official: {
    docs: 'https://shopify.dev/docs/api/admin-rest',
    signup: 'https://www.shopify.com/',
    devapps: 'https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin',
  },
};

function normalizeShop(input) {
  let shop = String(input.shop || '').trim().toLowerCase();
  shop = shop.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  shop = shop.replace(/\.myshopify\.com$/, '');
  return shop;
}

function buildBase(creds) {
  const shop = normalizeShop(creds);
  return `https://${shop}.myshopify.com/admin/api/${API_VERSION}`;
}

function authHeaders(creds) {
  return { 'X-Shopify-Access-Token': String(creds.token || '') };
}

function qs(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] !== '' && obj[k] != null)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`).join('&');
}

// 依据响应头给出额外等待（Shopify 调用量接近上限时主动放慢）
function paceFromHeaders(headers) {
  try {
    const raw = headers.get('x-shopify-shop-api-call-limit');
    if (raw) {
      const [used, bucket] = raw.split('/').map((x) => parseInt(x.trim(), 10));
      if (bucket && used / bucket >= 0.8) return 2000;
      if (bucket && used / bucket >= 0.6) return 900;
    }
  } catch { /* 忽略 */ }
  return 0;
}

async function test(creds, ctx) {
  const shop = normalizeShop(creds);
  if (!shop) return { ok: false, error: ctx.t('conn_shop_required') };
  if (!String(creds.token || '').trim()) return { ok: false, error: ctx.t('conn_token_required') };
  const url = `${buildBase(creds)}/shop.json`;
  const r = await ctx.request(url);
  if (!r.json || !r.json.shop) return { ok: false, error: r.error || ctx.t('conn_test_failed') };
  const s = r.json.shop;
  return {
    ok: true,
    shop_name: s.name,
    shop_domain: s.myshopify_domain || `${shop}.myshopify.com`,
    currency: s.currency,
    plan: s.plan_name || '',
  };
}

function variantTitle(product, variant) {
  const t = String(variant.title || '').trim();
  if (!t || t === 'Default Title') return product.title;
  return `${product.title} (${t})`;
}

function normalizeProduct(product, currency, shopHost) {
  const out = [];
  const image = Array.isArray(product.images) && product.images[0] ? product.images[0].src : '';
  for (const variant of product.variants || []) {
    out.push({
      _coll: 'listings',
      ext_key: `shopify:p${product.id}v${variant.id}`,
      platform: 'shopify',
      shop_name: shopHost,
      platform_product_id: String(variant.id),
      platform_product_group: String(product.id),
      platform_variant_id: String(variant.id),
      platform_inventory_item_id: String(variant.inventory_item_id || ''),
      platform_sku: variant.sku || '',
      title: variantTitle(product, variant),
      listing_price: Number(variant.price) || 0,
      currency: currency || '',
      url: `https://${shopHost}/products/${product.handle}`,
      image,
      vendor: product.vendor || '',
      platform_available: Number.isFinite(Number(variant.inventory_quantity)) ? Number(variant.inventory_quantity) : null,
      status: product.status === 'active' ? (variant.available ? 'active' : 'inactive')
        : product.status === 'archived' ? 'archived' : 'inactive',
      platform_updated_at: product.updated_at || '',
    });
  }
  return out;
}

function orderStatus(order) {
  if (order.cancelled_at || order.financial_status === 'voided') return 'cancelled';
  if (order.fulfillment_status === 'fulfilled') return 'shipped';
  const fs = order.financial_status;
  if (['paid', 'partially_paid', 'refunded', 'partially_refunded'].includes(fs)) return 'paid';
  return 'pending';
}

function shippingAmount(order) {
  try {
    const set = order.total_shipping_price_set;
    if (set && set.shop_money && Number(set.shop_money.amount)) return Number(set.shop_money.amount);
  } catch { /* 继续 */ }
  try {
    return (order.shipping_lines || []).reduce((s, l) => s + Number(l.price || 0), 0);
  } catch { return 0; }
}

function normalizeOrder(order, shopHost) {
  const out = [];
  const status = orderStatus(order);
  const addr = order.shipping_address || {};
  const customer = order.customer || {};
  const buyer = order.email || customer.email
    || [customer.first_name, customer.last_name].filter(Boolean).join(' ')
    || addr.name || '';
  const shipping = shippingAmount(order);
  const lines = order.line_items || [];
  lines.forEach((line, i) => {
    const qty = Number(line.quantity) || 1;
    const unit = Number(line.price) || 0;
    const lineDiscount = Number(line.total_discount || 0);
    const isFirst = i === 0;
    out.push({
      _coll: 'orders',
      ext_key: `shopify:order${order.id}L${i + 1}`,
      order_no: `${order.name}-L${i + 1}`,
      parent_order_no: order.name,
      platform: 'shopify',
      shop_name: shopHost,
      platform_product_id: String(line.variant_id || line.product_id || ''),
      platform_order_id: String(order.id),
      platform_sku: line.sku || '',
      product_name: line.title || line.name || '',
      qty,
      unit_price: unit,
      total_amount: qty * unit - lineDiscount,
      currency: order.currency || '',
      status,
      buyer,
      buyer_name: [customer.first_name, customer.last_name].filter(Boolean).join(' ') || addr.name || '',
      buyer_email: order.email || customer.email || '',
      buyer_phone: order.phone || customer.phone || addr.phone || '',
      ship_country: addr.country || '', ship_province: addr.province || '',
      ship_city: addr.city || '', ship_zip: addr.zip || '',
      ship_address: [addr.address1, addr.address2].filter(Boolean).join(' '),
      order_shipping: isFirst ? shipping : 0,
      order_tax: isFirst ? Number(order.total_tax || 0) : 0,
      order_discount: isFirst ? Number(order.total_discounts || 0) : 0,
      order_total: isFirst ? Number(order.total_price || 0) : 0,
      platform_created_at: order.created_at || '',
      platform_updated_at: order.updated_at || '',
    });
  });
  return out;
}

async function fetchResource(creds, resource, cursor, ctx) {
  const base = buildBase(creds);
  const since = cursor ? new Date(cursor).toISOString() : '';
  const records = [];
  let nextCursor = cursor || '';

  if (resource === 'products') {
    const shopHost = normalizeShop(creds) + '.myshopify.com';
    let url = `${base}/products.json?${qs({ limit: 250, updated_at_min: since })}`;
    while (url) {
      const r = await ctx.request(url);
      const items = (r.json && r.json.products) || [];
      for (const p of items) {
        records.push(...normalizeProduct(p, ctx.shopCurrency, shopHost));
        if (p.updated_at && p.updated_at > nextCursor) nextCursor = p.updated_at;
      }
      url = r.nextUrl;
    }
    return { records, nextCursor };
  }

  if (resource === 'orders') {
    const shopHost = normalizeShop(creds) + '.myshopify.com';
    let url = `${base}/orders.json?${qs({ status: 'any', limit: 250, updated_at_min: since })}`;
    while (url) {
      const r = await ctx.request(url);
      const items = (r.json && r.json.orders) || [];
      for (const o of items) {
        records.push(...normalizeOrder(o, shopHost));
        if (o.updated_at && o.updated_at > nextCursor) nextCursor = o.updated_at;
      }
      url = r.nextUrl;
    }
    return { records, nextCursor };
  }

  if (resource === 'inventory') {
    const locRes = await ctx.request(`${base}/locations.json`);
    const locations = (locRes.json && locRes.json.locations) || [];
    const activeIds = locations.filter((l) => l.active !== false).map((l) => l.id);
    if (!activeIds.length) return { records, nextCursor };
    const totals = {};
    let url = `${base}/inventory_levels.json?${qs({ location_ids: activeIds.join(','), limit: 100 })}`;
    while (url) {
      const r = await ctx.request(url);
      const levels = (r.json && r.json.inventory_levels) || [];
      for (const lv of levels) {
        totals[lv.inventory_item_id] = (totals[lv.inventory_item_id] || 0) + Number(lv.available || 0);
      }
      url = r.nextUrl;
    }
    for (const id of Object.keys(totals)) {
      records.push({ _coll: '_inventory', platform_inventory_item_id: String(id), platform_available: totals[id] });
    }
    return { records, nextCursor };
  }

  return { records, nextCursor };
}

module.exports = { META, normalizeShop, test, fetchResource, paceFromHeaders, authHeaders };
