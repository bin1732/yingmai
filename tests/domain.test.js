// 领域层端到端测试 · 灵感引擎工坊 · bin1732
const os = require('os');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const store = require('../src/main/store');
const dom = require('../src/main/domain');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ewbtest-'));
store.init(tmp);
dom.init(path.join(__dirname, '..', 'data'));

let failures = 0;
const pending = [];
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      pending.push(r.then(() => console.log('PASS', name)).catch((e) => { failures += 1; console.log('FAIL', name, '->', e.message); }));
    } else {
      console.log('PASS', name);
    }
  }
  catch (e) { failures += 1; console.log('FAIL', name, '->', e.message); }
}

// 1. 商品
const prod = dom.createProduct({ name: '便携蓝牙音箱', sku: 'BT-SPK-01', cost: 20, price: 59, safety_stock: 10 });
check('商品创建并可按 SKU 查询', () => assert.equal(dom.getProductBySku('BT-SPK-01').id, prod.id));

// 2. 采购：下单 → 收货（库存增加）
const po = store.insert('purchases', {
  po_no: 'PO1001', product_name: '便携蓝牙音箱', sku: 'BT-SPK-01', supplier: '深圳电子厂',
  qty: 100, unit_cost: 20, total_cost: 2000, status: 'draft',
});
dom.confirmPurchase(po.id);
check('采购确认后状态为 ordered', () => assert.equal(store.list('purchases')[0].status, 'ordered'));
dom.receivePurchase(po.id, { qty: 100 });
check('采购收货 100 件，默认仓库存为 100', () =>
  assert.equal(store.getStock('BT-SPK-01', '默认仓'), 100));

// 3. 订单：创建 → 审核 → 发货（库存扣减）
const order = store.insert('orders', {
  order_no: 'ORD2001', product_name: '便携蓝牙音箱', sku: 'BT-SPK-01', platform: '淘宝',
  qty: 2, unit_price: 59, total_amount: 118, buyer: '张三', status: 'pending',
});
dom.confirmOrder(order.id);
dom.shipOrder(order.id, { shipping_company: '顺丰', shipping_no: 'SF123' });
check('发货后库存扣减为 98，订单为 shipped', () => {
  assert.equal(store.getStock('BT-SPK-01', '默认仓'), 98);
  assert.equal(store.list('orders')[0].status, 'shipped');
});

// 4. 售后：退货退款 1 件（商品回库）
const af = store.insert('aftersales', {
  order_no: 'ORD2001', platform: '淘宝', sku: 'BT-SPK-01', qty: 1, amount: 59,
  type: 'refund', reason: '七天无理由', status: 'open',
});
dom.processAftersale(af.id, { resolution: 'return_refund', warehouse: '默认仓' });
check('退货 1 件后回库，库存为 99', () =>
  assert.equal(store.getStock('BT-SPK-01', '默认仓'), 99));

// 5. 流水校验
check('库存流水重算与当前结存一致', () => assert.equal(dom.verifyStock().ok, true));

// 6. 损益
const sum = dom.pnlSummary('platform');
check('损益汇总净利润为正', () => assert.ok(sum.totals.net > 0, `net=${sum.totals.net}`));
console.log('  损益：收入%s 商品成本%s 支付费%s 退款%s 退回成本%s 净利%s 净利率%s%',
  sum.totals.revenue, sum.totals.cogs, sum.totals.payment, sum.totals.refund_amount,
  sum.totals.returned_cogs, sum.totals.net, sum.totals.net_pct);

// 7. 客户
const customers = dom.buildCustomers();
check('客户 RFM 已计算', () => assert.ok(customers.length === 1 && customers[0].ltv === 118));

// 8. 预警
const monitors = dom.runMonitors();
check('预警巡检执行', () => assert.ok(monitors.open >= 0));

// 9. 库存不足拦截
const o2 = store.insert('orders', {
  order_no: 'ORD2002', product_name: '便携蓝牙音箱', sku: 'BT-SPK-01', platform: '淘宝',
  qty: 999, unit_price: 59, total_amount: 999 * 59, buyer: '李四', status: 'confirmed',
});
check('库存不足时发货被拦截', () => {
  let blocked = false;
  try { dom.shipOrder(o2.id, {}); } catch { blocked = true; }
  assert.ok(blocked);
});

// 10. Amazon 连接器离线断言（META 形状、catalog 一致、官方示例报文驱动 normalize）
const amazon = require('../src/main/shopconn/amazon');
const { CATALOG } = require('../src/main/shopconn/catalog');
const fxDir = path.join(__dirname, 'fixtures', 'amazon');

check('Amazon META 形状合规', () => {
  const m = amazon.META;
  assert.equal(m.id, 'amazon');
  assert.ok(m.name.zh && m.name.en, '双语名');
  assert.equal(m.category, 'crossborder');
  assert.ok(['available', 'self', 'gated', 'restricted'].includes(m.status), '档位合法');
  assert.equal(m.authType, 'oauth2-aws');
  assert.ok(m.requestGapMs > 0, 'requestGapMs');
  assert.deepEqual(m.resources, ['products', 'orders', 'inventory']);
  for (const f of m.credentialFields) {
    assert.ok(f.key && f.label && f.label.zh && f.label.en, `字段 ${f.key} 有双语 label`);
    assert.ok(typeof f.required === 'boolean' && typeof f.secret === 'boolean');
  }
  const keys = m.credentialFields.map((f) => f.key);
  for (const need of ['region', 'marketplaceId', 'sellerId', 'clientId', 'clientSecret', 'refreshToken', 'awsAccessKeyId', 'awsSecretAccessKey']) {
    assert.ok(keys.includes(need), '缺字段 ' + need);
  }
  assert.ok(m.official.docs && m.official.signup && m.official.devapps, '官方三链接');
  assert.ok(Array.isArray(m.regions) && m.regions.length === 3, '三区域');
});

check('Amazon catalog 与 META 一致', () => {
  const entry = CATALOG.find((c) => c.id === 'amazon');
  assert.ok(entry, 'catalog 存在 amazon');
  assert.equal(entry.connect, amazon.META.status, 'catalog 档位 == META.status');
  assert.equal(entry.category, amazon.META.category);
});

check('Amazon Orders normalize（官方示例报文）字段齐全', () => {
  const orders = JSON.parse(fs.readFileSync(path.join(fxDir, 'getOrders.json'), 'utf8')).payload.Orders;
  const items = JSON.parse(fs.readFileSync(path.join(fxDir, 'getOrderItems.json'), 'utf8')).payload.OrderItems;
  const recs = amazon.normalizeOrder(orders[0], items, 'Amazon（US）');
  assert.equal(recs.length, items.length);
  const r0 = recs[0];
  assert.equal(r0._coll, 'orders');
  assert.ok(r0.ext_key.startsWith('amazon:order'));
  assert.equal(r0.platform_order_id, '902-3159896-1390916');
  assert.equal(r0.platform_product_id, 'BT0093TELA'); // ASIN
  assert.equal(r0.platform_variant_id, '68828574383266'); // OrderItemId
  assert.equal(r0.platform_sku, 'SKU-EARBUD-01');
  assert.equal(r0.qty, 1);
  assert.equal(r0.unit_price, 25.99);
  assert.equal(r0.currency, 'USD');
  assert.equal(r0.status, 'paid'); // Unshipped -> paid
  // PII 留空（无 RDT）
  assert.equal(r0.buyer, ''); assert.equal(r0.ship_address, '');
  // 汇总金额只在第一行
  assert.ok(r0.order_total > 0);
  assert.equal(recs[1].order_total, 0);
  // Shipped -> shipped（订单已发，非 completed）
  const shipped = amazon.normalizeOrder(orders[1], [{
    ASIN: 'B0X', OrderItemId: 'LI-1', SellerSKU: 'SKU-X', Title: 'x',
    QuantityOrdered: 2, ItemPrice: { CurrencyCode: 'USD', Amount: '29.50' },
  }], 'Amazon（US）');
  assert.equal(shipped.length, 1);
  assert.equal(shipped[0].status, 'shipped');
  assert.equal(shipped[0].platform_variant_id, 'LI-1');
  // InvoiceUnconfirmed -> pending
  const inv = amazon.normalizeOrder(
    { AmazonOrderId: 'X', OrderStatus: 'InvoiceUnconfirmed', OrderTotal: { Amount: '1' } },
    [{ ASIN: 'B0Y', OrderItemId: 'LI-2', SellerSKU: 'SKU-Y', QuantityOrdered: 1, ItemPrice: { Amount: '1' } }],
    'Amazon（US）');
  assert.equal(inv[0].status, 'pending');
});

check('Amazon SigV4 canonicalQueryString 规范化', () => {
  // 按键名排序
  assert.equal(amazon.canonicalQueryString('b=2&a=1'), 'a=1&b=2');
  // 同名参数按值排序
  assert.equal(amazon.canonicalQueryString('b=2&a=1&a=0'), 'a=0&a=1&b=2');
  // 特殊字符 AWS UriEncode（! * ' ( )）
  assert.equal(amazon.canonicalQueryString('a=x*y'), 'a=x%2Ay');
  assert.equal(amazon.canonicalQueryString('b=p!q'), 'b=p%21q');
  // 空格 -> %20（传入已编码的 %20，解码后再编码仍为 %20）
  assert.equal(amazon.canonicalQueryString('c=1%202'), 'c=1%202');
  // 空值保留 key=
  assert.equal(amazon.canonicalQueryString('a=&b=2'), 'a=&b=2');
  // 前导 ? 容错
  assert.equal(amazon.canonicalQueryString('?b=2&a=1'), 'a=1&b=2');
});

check('Amazon Listings TSV normalize 字段齐全', () => {
  const tsv = fs.readFileSync(path.join(fxDir, 'listings-report.tsv'), 'utf8');
  const recs = amazon.normalizeListingsTsv(tsv, 'Amazon（US）', 'USD');
  assert.equal(recs.length, 3);
  const r = recs[0];
  assert.equal(r._coll, 'listings');
  assert.equal(r.platform_sku, 'SKU-EARBUD-01');
  assert.equal(r.listing_price, 25.99);
  assert.equal(r.platform_available, 25);
  assert.equal(r.status, 'active');
  assert.equal(recs[1].status, 'inactive'); // closed
  assert.equal(r.platform_inventory_item_id, 'SKU-EARBUD-01');
});

check('Amazon FBA Inventory normalize 输出 _inventory', () => {
  const data = JSON.parse(fs.readFileSync(path.join(fxDir, 'getInventorySummaries.json'), 'utf8'));
  const recs = amazon.normalizeInventory(data.payload.inventorySummaries);
  assert.equal(recs.length, 2);
  assert.equal(recs[0]._coll, '_inventory');
  assert.equal(recs[0].platform_inventory_item_id, 'SKU-EARBUD-01');
  assert.equal(recs[0].platform_available, 20);
});

// 11. eBay 连接器离线断言（META 形状、catalog 一致、官方示例报文驱动三类 normalize）
const ebay = require('../src/main/shopconn/ebay');
const ebFx = path.join(__dirname, 'fixtures', 'ebay');

check('eBay META 形状合规', () => {
  const m = ebay.META;
  assert.equal(m.id, 'ebay');
  assert.ok(m.name.zh && m.name.en, '双语名');
  assert.equal(m.category, 'crossborder');
  assert.ok(['available', 'self', 'gated', 'restricted'].includes(m.status), '档位合法');
  assert.equal(m.authType, 'oauth2');
  assert.ok(m.requestGapMs > 0, 'requestGapMs');
  assert.deepEqual(m.resources, ['products', 'orders', 'inventory']);
  for (const f of m.credentialFields) {
    assert.ok(f.key && f.label && f.label.zh && f.label.en, `字段 ${f.key} 有双语 label`);
    assert.ok(typeof f.required === 'boolean' && typeof f.secret === 'boolean');
  }
  const keys = m.credentialFields.map((f) => f.key);
  for (const need of ['env', 'marketplaceId', 'clientId', 'clientSecret', 'refreshToken']) {
    assert.ok(keys.includes(need), '缺字段 ' + need);
  }
  // secret 字段：clientSecret / refreshToken
  const secretKeys = m.credentialFields.filter((f) => f.secret).map((f) => f.key);
  assert.ok(secretKeys.includes('clientSecret') && secretKeys.includes('refreshToken'), '密钥类字段 secret:true');
  assert.ok(m.official.docs && m.official.signup && m.official.devapps, '官方三链接');
  assert.ok(Array.isArray(m.scopes) && m.scopes.length >= 3, 'scopes');
  assert.ok(Array.isArray(m.regions) && m.regions.includes('EBAY_US') && m.regions.includes('EBAY_GB'), 'regions 含主要站点');
});

check('eBay catalog 与 META 一致', () => {
  const entry = CATALOG.find((c) => c.id === 'ebay');
  assert.ok(entry, 'catalog 存在 ebay');
  assert.equal(entry.connect, ebay.META.status, 'catalog 档位 == META.status');
  assert.equal(entry.category, ebay.META.category);
});

check('eBay Orders normalize（官方示例报文）字段齐全', () => {
  const order = JSON.parse(fs.readFileSync(path.join(ebFx, 'getOrders.json'), 'utf8')).orders[0];
  const recs = ebay.normalizeOrder(order, 'eBay（EBAY_US）');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r._coll, 'orders');
  assert.ok(r.ext_key.startsWith('ebay:order'));
  assert.equal(r.platform_order_id, '20-1234567-90200');
  assert.equal(r.platform_product_id, '123456789012'); // legacyItemId
  assert.equal(r.platform_variant_id, 'L1'); // lineItemId
  assert.equal(r.platform_sku, 'EARBUD-01');
  assert.equal(r.product_name, 'Wireless Earbuds Pro');
  assert.equal(r.qty, 1);
  assert.equal(r.unit_price, 25.99);
  assert.equal(r.total_amount, 25.99);
  assert.equal(r.currency, 'USD');
  // FULFILLMENT_STARTED + PAID -> shipped
  assert.equal(r.status, 'shipped');
  // 买家 username 与收货地址如实映射；邮箱/电话 API 不提供，留空
  assert.equal(r.buyer, 'buyer_john');
  assert.equal(r.buyer_name, 'John Buyer');
  assert.equal(r.ship_country, 'US');
  assert.equal(r.ship_city, 'Erlanger');
  assert.equal(r.ship_zip, '41025');
  assert.ok(r.ship_address.includes('1850 Airport Exchange Blvd'));
  assert.equal(r.buyer_email, '');
  assert.equal(r.buyer_phone, '');
  // 汇总金额只在 L1
  assert.equal(r.order_shipping, 5.00);
  assert.equal(r.order_tax, 2.10);
  assert.equal(r.order_total, 33.09);
  assert.equal(r.platform_created_at, '2026-10-01T12:00:00.000Z');
});

check('eBay 订单状态映射口径', () => {
  assert.equal(ebay.orderStatus({ orderFulfillmentStatus: 'FULFILLMENT_COMPLETE' }), 'completed');
  assert.equal(ebay.orderStatus({ orderFulfillmentStatus: 'FULFILLMENT_STARTED' }), 'shipped');
  assert.equal(ebay.orderStatus({ orderFulfillmentStatus: 'PENDING', orderPaymentStatus: 'PAID' }), 'paid');
  assert.equal(ebay.orderStatus({ orderFulfillmentStatus: 'PENDING', orderPaymentStatus: 'PENDING' }), 'pending');
  assert.equal(ebay.orderStatus({ cancelStatus: { cancelState: 'CANCEL_CLOSED' } }), 'cancelled');
});

check('eBay Listings normalize（inventoryItem + offer）字段齐全', () => {
  const inv = JSON.parse(fs.readFileSync(path.join(ebFx, 'getInventoryItems.json'), 'utf8')).inventoryItems;
  const offer = JSON.parse(fs.readFileSync(path.join(ebFx, 'getOffers.json'), 'utf8')).offers[0];
  // 单规格：无 inventoryItemGroupKeys -> group = sku
  const r0 = ebay.normalizeListing(inv[0], offer, 'eBay（EBAY_US）', 'USD');
  assert.equal(r0._coll, 'listings');
  assert.equal(r0.platform_sku, 'EARBUD-01');
  assert.equal(r0.platform_product_id, 'EARBUD-01');
  assert.equal(r0.platform_product_group, 'EARBUD-01');
  assert.equal(r0.ext_key, 'ebay:pEARBUD-01vEARBUD-01');
  assert.equal(r0.title, 'Wireless Earbuds Pro');
  assert.equal(r0.listing_price, 25.99);
  assert.equal(r0.currency, 'USD');
  assert.equal(r0.platform_available, 25);
  assert.equal(r0.status, 'active'); // PUBLISHED
  assert.ok(r0.url.includes('123456789012'));
  assert.ok(r0.image.includes('i.ebayimg.com'));
  // 多规格：inventoryItemGroupKeys[0] 作为 group
  const r1 = ebay.normalizeListing(inv[1], null, 'eBay（EBAY_US）', 'USD');
  assert.equal(r1.platform_product_group, 'TSHIRT-GROUP-01');
  assert.equal(r1.ext_key, 'ebay:pTSHIRT-GROUP-01vTSHIRT-M-RED');
  assert.equal(r1.status, 'inactive'); // 无 offer
  assert.equal(r1.platform_available, 10);
});

check('eBay Inventory normalize 输出 _inventory', () => {
  const inv = JSON.parse(fs.readFileSync(path.join(ebFx, 'getInventoryItems.json'), 'utf8')).inventoryItems;
  const recs = ebay.normalizeInventory(inv);
  assert.equal(recs.length, 2);
  assert.equal(recs[0]._coll, '_inventory');
  assert.equal(recs[0].platform_inventory_item_id, 'EARBUD-01');
  assert.equal(recs[0].platform_available, 25);
  assert.equal(recs[1].platform_available, 10);
});

check('eBay marketplace->currency 映射', () => {
  assert.equal(ebay.currencyFor('EBAY_US'), 'USD');
  assert.equal(ebay.currencyFor('EBAY_GB'), 'GBP');
  assert.equal(ebay.currencyFor('EBAY_DE'), 'EUR');
  assert.equal(ebay.currencyFor('EBAY_CH'), 'CHF');
});

check('eBay qs 查询串值编码（回归：曾误把键名当值）', () => {
  assert.equal(ebay.qs({ a: 1, b: 'x y' }), 'a=1&b=x%20y');
  const f = ebay.qs({
    filter: 'lastmodifieddate:[2026-01-01T00:00:00Z..2026-01-02T00:00:00Z]',
    limit: 50, offset: 0,
  });
  // filter 值完整编码：[ ] -> %5B %5D，: -> %3A，空格(此处无空格但确认规则)，.. 保留
  assert.ok(f.startsWith('filter=lastmodifieddate%3A%5B2026-01-01T00%3A00%3A00Z..2026-01-02T00%3A00%3A00Z%5D'), 'filter 值被编码: ' + f);
  assert.ok(f.includes('&limit=50'), 'limit=50');
  assert.ok(f.includes('&offset=0'), 'offset=0');
  // 空值过滤
  assert.equal(ebay.qs({ a: '', b: null, c: 1 }), 'c=1');
});

// 12. Shopee 连接器离线断言（META 形状、catalog 一致、官方示例报文驱动三类 normalize、共享层 persistCredentials 存在）
const shopee = require('../src/main/shopconn/shopee');
const spFx = path.join(__dirname, 'fixtures', 'shopee');

check('Shopee META 形状合规', () => {
  const m = shopee.META;
  assert.equal(m.id, 'shopee');
  assert.ok(m.name.zh && m.name.en, '双语名');
  assert.equal(m.category, 'crossborder');
  assert.ok(['available', 'self', 'gated', 'restricted'].includes(m.status), '档位合法');
  assert.equal(m.status, 'gated', 'Shopee 定档 gated（需开发者审核+Go Live）');
  assert.equal(m.authType, 'oauth2-hmac');
  assert.ok(m.requestGapMs > 0, 'requestGapMs');
  assert.deepEqual(m.resources, ['products', 'orders', 'inventory']);
  for (const f of m.credentialFields) {
    assert.ok(f.key && f.label && f.label.zh && f.label.en, `字段 ${f.key} 有双语 label`);
    assert.ok(typeof f.required === 'boolean' && typeof f.secret === 'boolean');
  }
  const keys = m.credentialFields.map((f) => f.key);
  for (const need of ['env', 'location', 'partnerId', 'partnerKey', 'shopId', 'accessToken', 'refreshToken']) {
    assert.ok(keys.includes(need), '缺字段 ' + need);
  }
  // secret 字段：partnerKey / accessToken / refreshToken
  const secretKeys = m.credentialFields.filter((f) => f.secret).map((f) => f.key);
  for (const s of ['partnerKey', 'accessToken', 'refreshToken']) {
    assert.ok(secretKeys.includes(s), '密钥类字段应 secret:true -> ' + s);
  }
  assert.ok(m.official.docs && m.official.signup && m.official.devapps, '官方三链接');
  assert.ok(Array.isArray(m.scopes) && m.scopes.length >= 3, 'scopes');
  assert.ok(Array.isArray(m.regions) && m.regions.includes('global') && m.regions.includes('cn') && m.regions.includes('br'), 'regions 矩阵');
});

check('Shopee catalog 与 META 一致', () => {
  const entry = CATALOG.find((c) => c.id === 'shopee');
  assert.ok(entry, 'catalog 存在 shopee');
  assert.equal(entry.connect, shopee.META.status, 'catalog 档位 == META.status');
  assert.equal(entry.category, shopee.META.category);
});

check('Shopee 共享层 persistCredentials 存在（凭证轮换持久化）', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'shopconn', 'index.js'), 'utf8');
  assert.ok(src.includes('persistCredentials'), 'index.js 应定义 ctx.persistCredentials');
  assert.ok(src.includes('makeRequester(adapter, creds, ctx)'), 'makeRequester 应透传 ctx');
});

check('Shopee Products normalize（官方示例报文）字段齐全', () => {
  const base = JSON.parse(fs.readFileSync(path.join(spFx, 'get_item_base_info.json'), 'utf8')).item_list;
  const models = JSON.parse(fs.readFileSync(path.join(spFx, 'get_model_list.json'), 'utf8')).model_list;
  // 无规格商品
  const noModel = shopee.normalizeListing(base[0], [], 'Shopee（SG）', 'SGD');
  assert.equal(noModel.length, 1);
  const r0 = noModel[0];
  assert.equal(r0._coll, 'listings');
  assert.equal(r0.ext_key, 'shopee:p2500139861vEARBUD-01');
  assert.equal(r0.platform_product_id, '2500139861');
  assert.equal(r0.platform_variant_id, '0');
  assert.equal(r0.platform_inventory_item_id, 'i2500139861');
  assert.equal(r0.platform_sku, 'EARBUD-01');
  assert.equal(r0.title, 'Wireless Earbuds Pro');
  assert.equal(r0.listing_price, 25.99);
  assert.equal(r0.currency, 'SGD');
  assert.equal(r0.platform_available, 25);
  assert.equal(r0.status, 'active');
  // 有规格商品
  const modelGroup = models.find((x) => x.item_id === base[1].item_id);
  const withModel = shopee.normalizeListing(base[1], modelGroup.model, 'Shopee（SG）', 'SGD');
  assert.equal(withModel.length, 2);
  const m0 = withModel[0];
  assert.equal(m0.ext_key, 'shopee:p2500139862v90001');
  assert.equal(m0.platform_variant_id, '90001');
  assert.equal(m0.platform_inventory_item_id, 'm90001');
  assert.equal(m0.platform_sku, 'TSHIRT-M-RED');
  assert.equal(m0.listing_price, 12.5);
  assert.equal(m0.platform_available, 10);
  assert.equal(withModel[1].platform_available, 20);
});

check('Shopee Inventory normalize 输出 _inventory', () => {
  const base = JSON.parse(fs.readFileSync(path.join(spFx, 'get_item_base_info.json'), 'utf8')).item_list;
  const models = JSON.parse(fs.readFileSync(path.join(spFx, 'get_model_list.json'), 'utf8')).model_list;
  const inv1 = shopee.normalizeInventory(base[0], []);
  assert.equal(inv1.length, 1);
  assert.equal(inv1[0]._coll, '_inventory');
  assert.equal(inv1[0].platform_inventory_item_id, 'i2500139861');
  assert.equal(inv1[0].platform_available, 25);
  const mg = models.find((x) => x.item_id === base[1].item_id);
  const inv2 = shopee.normalizeInventory(base[1], mg.model);
  assert.equal(inv2.length, 2);
  assert.equal(inv2[0].platform_inventory_item_id, 'm90001');
  assert.equal(inv2[1].platform_available, 20);
});

check('Shopee Orders normalize（官方示例报文）字段齐全', () => {
  const orders = JSON.parse(fs.readFileSync(path.join(spFx, 'get_order_detail.json'), 'utf8')).response.order_list;
  const recs = shopee.normalizeOrder(orders[0], 'Shopee（TW）');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r._coll, 'orders');
  assert.ok(r.ext_key.startsWith('shopee:order'));
  assert.equal(r.platform_order_id, '201218V2Y6E59M');
  assert.equal(r.platform_product_id, '2500139861');
  assert.equal(r.platform_variant_id, '0');
  assert.equal(r.platform_sku, 'EARBUD-01');
  assert.equal(r.product_name, 'Wireless Earbuds Pro');
  assert.equal(r.qty, 1);
  assert.equal(r.unit_price, 765);
  assert.equal(r.total_amount, 765);
  assert.equal(r.currency, 'TWD');
  assert.equal(r.status, 'paid'); // READY_TO_SHIP -> paid
  // 买家/收货：Shopee order_detail 提供 buyer_username 与 recipient_address；邮箱不提供留空
  assert.equal(r.buyer, 'buyer_john');
  assert.equal(r.buyer_name, 'John Buyer');
  assert.equal(r.buyer_phone, '0912345678');
  assert.equal(r.buyer_email, '');
  assert.equal(r.ship_country, 'TW');
  assert.equal(r.ship_province, 'Taipei City');
  assert.equal(r.ship_city, "Da'an District");
  assert.equal(r.ship_zip, '106');
  assert.ok(r.ship_address.includes('Zhongxiao'));
  // 汇总金额只在 L1
  assert.equal(r.order_shipping, 60);
  assert.equal(r.order_total, 825);
  // 第二行（多数量）
  const recs2 = shopee.normalizeOrder(orders[1], 'Shopee（TW）');
  assert.equal(recs2[0].qty, 2);
  assert.equal(recs2[0].unit_price, 187.5);
  assert.equal(recs2[0].total_amount, 375);
  assert.equal(recs2[0].status, 'shipped'); // SHIPPED -> shipped
});

check('Shopee 订单状态映射口径', () => {
  assert.equal(shopee.orderStatus('UNPAID'), 'pending');
  assert.equal(shopee.orderStatus('READY_TO_SHIP'), 'paid');
  assert.equal(shopee.orderStatus('RETRY_SHIP'), 'paid');
  assert.equal(shopee.orderStatus('PROCESSED'), 'shipped');
  assert.equal(shopee.orderStatus('SHIPPED'), 'shipped');
  assert.equal(shopee.orderStatus('TO_CONFIRM_RECEIVE'), 'completed');
  assert.equal(shopee.orderStatus('COMPLETED'), 'completed');
  assert.equal(shopee.orderStatus('IN_CANCEL'), 'cancelled');
  assert.equal(shopee.orderStatus('CANCELLED'), 'cancelled');
  assert.equal(shopee.orderStatus('TO_RETURN'), 'cancelled');
});

check('Shopee host 矩阵与币种映射', () => {
  assert.equal(shopee.apiBase({ env: 'production', location: 'global' }), 'https://partner.shopeemobile.com');
  assert.equal(shopee.apiBase({ env: 'production', location: 'cn' }), 'https://openplatform.shopee.cn');
  assert.equal(shopee.apiBase({ env: 'production', location: 'br' }), 'https://openplatform.shopee.com.br');
  assert.equal(shopee.apiBase({ env: 'sandbox', location: 'global' }), 'https://openplatform.sandbox.test-stable.shopee.sg');
  assert.equal(shopee.currencyFor('TW'), 'TWD');
  assert.equal(shopee.currencyFor('SG'), 'SGD');
  assert.equal(shopee.currencyFor('VN'), 'VND');
  assert.equal(shopee.currencyFor('XX'), '');
});

check('Shopee 签名/授权链接构成', () => {
  const url = shopee.buildAuthUrl(
    { partnerId: '1001141', partnerKey: 'testkey', env: 'production', location: 'global' },
    'https://www.baidu.com/'
  );
  assert.ok(url.startsWith('https://partner.shopeemobile.com/api/v2/shop/auth_partner?'));
  assert.ok(url.includes('partner_id=1001141'));
  assert.ok(url.includes('response_type=code'));
  assert.ok(url.includes('timestamp='));
  assert.ok(url.includes('sign='));
  // qs 值编码
  assert.equal(shopee.qs({ a: 1, b: 'x y' }), 'a=1&b=x%20y');
});

// 13. AliExpress 连接器离线断言（META 形状、catalog 一致、签名官方向量、三类 normalize 字段齐全）
const aliexpress = require('../src/main/shopconn/aliexpress');
const aeFx = path.join(__dirname, 'fixtures', 'aliexpress');

check('AliExpress META 形状合规', () => {
  const m = aliexpress.META;
  assert.equal(m.id, 'aliexpress');
  assert.ok(m.name.zh && m.name.en, '双语名');
  assert.equal(m.category, 'crossborder');
  assert.ok(['available', 'self', 'gated', 'restricted'].includes(m.status), '档位合法');
  assert.equal(m.status, 'gated', 'AliExpress 定档 gated（企业自研资质+聚石塔审核）');
  assert.equal(m.authType, 'oauth2-top');
  assert.ok(m.requestGapMs > 0, 'requestGapMs');
  assert.deepEqual(m.resources, ['products', 'orders', 'inventory']);
  for (const f of m.credentialFields) {
    assert.ok(f.key && f.label && f.label.zh && f.label.en, `字段 ${f.key} 有双语 label`);
    assert.ok(typeof f.required === 'boolean' && typeof f.secret === 'boolean');
  }
  const keys = m.credentialFields.map((f) => f.key);
  for (const need of ['gateway', 'sellerId', 'appKey', 'appSecret', 'accessToken']) {
    assert.ok(keys.includes(need), '缺字段 ' + need);
  }
  const secretKeys = m.credentialFields.filter((f) => f.secret).map((f) => f.key);
  assert.ok(secretKeys.includes('appSecret') && secretKeys.includes('accessToken'), '密钥类字段 secret:true');
  assert.ok(m.official.docs && m.official.signup && m.official.devapps, '官方三链接');
  assert.ok(Array.isArray(m.scopes) && m.scopes.length >= 4, 'scopes');
  assert.ok(Array.isArray(m.regions) && m.regions.length === 1 && m.regions[0] === 'global', '单一全球站点');
});

check('AliExpress catalog 与 META 一致', () => {
  const entry = CATALOG.find((c) => c.id === 'aliexpress');
  assert.ok(entry, 'catalog 存在 aliexpress');
  assert.equal(entry.connect, aliexpress.META.status, 'catalog 档位 == META.status');
  assert.equal(entry.category, aliexpress.META.category);
});

check('AliExpress TOP 签名（官方拼接示例 + MD5 向量）', () => {
  // 官方 How to Invoke API 示例参数（service_name 用正确 key 名）
  const params = {
    app_key: '12345678', format: 'json', logisitics_no: 'ES2019COM0000123456',
    method: 'aliexpress.solution.order.fulfill', out_ref: '1000006270175804',
    send_type: 'all', service_name: 'SPAIN_LOCAL_CORREOS', session: 'test',
    sign_method: 'md5', timestamp: '2019-01-01 12:00:00', v: '2.0',
  };
  // 1) buildSignBase：ASCII 排序 + key+value 直拼
  assert.equal(aliexpress.buildSignBase(params),
    'app_key12345678formatjsonlogisitics_noES2019COM0000123456methodaliexpress.solution.order.fulfillout_ref1000006270175804send_typeallservice_nameSPAIN_LOCAL_CORREOSsessiontestsign_methodmd5timestamp2019-01-01 12:00:00v2.0');
  // 2) 官方向量：md5(helloworld + 官方逐字拼接串 + helloworld) = F7A5...（文档 prose 串含 service_name 笔误，以文档逐字串为准）
  const LITERAL = 'app_key12345678formatjsonlogisitics_noES2019COM0000123456methodaliexpress.solution.order.fulfillout_ref1000006270175804send_typeallservice_namSPAIN_LOCAL_CORREOSesessiontestsign_methodmd5timestamp2019-01-01 12:00:00v2.0';
  assert.equal(aliexpress.digestBase('helloworld', LITERAL, 'md5'), 'F7A5E0B28DEFFE9E1E6E5C0E8B0530EC');
  // 3) hmac 模式（本适配器实际使用）确定性快照
  assert.equal(aliexpress.signRequest('helloworld', params, 'hmac'), '6EE5E4EAE292DF0707C69858127B3218');
  // sign 不参与签名
  assert.ok(!aliexpress.buildSignBase(Object.assign({ sign: 'XXXX' }, params)).includes('signXXXX'));
});

check('AliExpress 网关与授权链接构成', () => {
  assert.equal(aliexpress.gatewayUrl({ gateway: 'eco' }), 'https://eco.taobao.com/router/rest');
  assert.equal(aliexpress.gatewayUrl({ gateway: 'api' }), 'https://api.taobao.com/router/rest');
  const url = aliexpress.buildAuthUrl({ appKey: '12345678' }, 'https://www.baidu.com/', '1212');
  assert.ok(url.startsWith('https://oauth.aliexpress.com/authorize?'));
  assert.ok(url.includes('response_type=code'));
  assert.ok(url.includes('client_id=12345678'));
  assert.ok(url.includes('sp=ae'));
  assert.ok(url.includes('view=web'));
  assert.ok(url.includes('redirect_uri='));
});

check('AliExpress 订单状态映射口径', () => {
  assert.equal(aliexpress.orderStatus('PLACE_ORDER_SUCCESS'), 'pending');
  assert.equal(aliexpress.orderStatus('WAIT_SELLER_SEND_GOODS'), 'paid');
  assert.equal(aliexpress.orderStatus('SELLER_PART_SEND_GOODS'), 'shipped');
  assert.equal(aliexpress.orderStatus('WAIT_BUYER_ACCEPT_GOODS'), 'shipped');
  assert.equal(aliexpress.orderStatus('FUND_PROCESSING'), 'paid');
  assert.equal(aliexpress.orderStatus('IN_ISSUE'), 'pending');
  assert.equal(aliexpress.orderStatus('IN_FROZEN'), 'pending');
  assert.equal(aliexpress.orderStatus('FINISH'), 'completed');
  assert.equal(aliexpress.orderStatus('IN_CANCEL'), 'cancelled');
});

check('AliExpress Orders normalize（官方示例报文）字段齐全', () => {
  const listEnv = JSON.parse(fs.readFileSync(path.join(aeFx, 'orderlist.get.json'), 'utf8'));
  const detailEnv = JSON.parse(fs.readFileSync(path.join(aeFx, 'solution.order.info.get.json'), 'utf8'));
  const orders = listEnv.aliexpress_trade_seller_orderlist_get_response.result.target_list.aeop_order_item_dto;
  const detail = detailEnv.aliexpress_solution_order_info_get_response.result.data;
  const recs = aliexpress.normalizeOrder(orders[0], detail, 'AliExpress（cn10001234）');
  assert.equal(recs.length, 2);
  const r0 = recs[0];
  assert.equal(r0._coll, 'orders');
  assert.equal(r0.ext_key, 'aliexpress:order1160045860056286L1');
  assert.equal(r0.order_no, '1160045860056286');
  assert.equal(r0.platform_order_id, '1160045860056286');
  assert.equal(r0.platform_product_id, '2356980');
  assert.equal(r0.platform_sku, 'EARBUD-01');
  assert.equal(r0.product_name, 'Wireless Earbuds Pro');
  assert.equal(r0.qty, 1);
  assert.equal(r0.unit_price, 25.99);
  assert.equal(r0.total_amount, 25.99);
  assert.equal(r0.currency, 'USD');
  assert.equal(r0.status, 'paid'); // WAIT_SELLER_SEND_GOODS -> paid
  assert.equal(r0.buyer, 'buyer_john');
  assert.equal(r0.buyer_name, 'John Buyer');
  assert.equal(r0.buyer_email, '');
  assert.equal(r0.buyer_phone, '2135550100');
  assert.equal(r0.ship_country, 'US');
  assert.equal(r0.ship_province, 'California');
  assert.equal(r0.ship_city, 'Los Angeles');
  assert.equal(r0.ship_zip, '90001');
  assert.ok(r0.ship_address.includes('Airport Exchange'));
  // 汇总金额只在 L1
  assert.equal(r0.order_shipping, 6.00);
  assert.equal(r0.order_total, 51.99);
  // 第二行（多数量）
  const r1 = recs[1];
  assert.equal(r1.qty, 2);
  assert.equal(r1.unit_price, 10.00);
  assert.equal(r1.total_amount, 20.00);
  assert.equal(r1.order_shipping, 0);
  assert.equal(r1.order_total, 0);
  // FINISH 订单 -> completed
  const done = aliexpress.normalizeOrder(orders[1], {}, 'AliExpress（cn10001234）');
  assert.equal(done[0].status, 'completed');
});

check('AliExpress Products normalize（官方示例报文）字段齐全', () => {
  const listEnv = JSON.parse(fs.readFileSync(path.join(aeFx, 'findproductinfolistquery.json'), 'utf8'));
  const detailEnv = JSON.parse(fs.readFileSync(path.join(aeFx, 'findaeproductbyid.json'), 'utf8'));
  const items = listEnv.aliexpress_postproduct_redefining_findproductinfolistquery_response.result.aeop_a_e_product_display_d_t_o_list.aeop_ae_product_display_sample_dto;
  const detail = detailEnv.aliexpress_postproduct_redefining_findaeproductbyid_response.result;
  // 多规格商品：展开 2 个 SKU
  const recs = aliexpress.normalizeListing(items[0], detail, 'AliExpress（cn10001234）', 'USD');
  assert.equal(recs.length, 2);
  const r0 = recs[0];
  assert.equal(r0._coll, 'listings');
  assert.equal(r0.ext_key, 'aliexpress:p32972979985v14:200003699;5:100014064');
  assert.equal(r0.platform_product_id, '32972979985');
  assert.equal(r0.platform_product_group, '32972979985');
  assert.equal(r0.platform_inventory_item_id, '14:200003699;5:100014064');
  assert.equal(r0.platform_sku, 'VEST-M-RED');
  assert.ok(r0.title.includes('Man') && r0.title.includes('Color:Red'), '标题含规格');
  assert.equal(r0.listing_price, 25.99);
  assert.equal(r0.currency, 'USD');
  assert.equal(r0.platform_available, 25);
  assert.equal(r0.status, 'active');
  assert.ok(r0.image.includes('alicdn.com'));
  assert.equal(recs[1].platform_inventory_item_id, '14:200003699;5:100014065');
  assert.equal(recs[1].platform_available, 10);
  // 无详情（无 SKU）-> 单品兜底
  const single = aliexpress.normalizeListing(items[1], {}, 'AliExpress（cn10001234）', 'USD');
  assert.equal(single.length, 1);
  assert.equal(single[0].ext_key, 'aliexpress:p32972979986v0');
  assert.equal(single[0].listing_price, 12.50);
});

check('AliExpress Inventory normalize 输出 _inventory', () => {
  const listEnv = JSON.parse(fs.readFileSync(path.join(aeFx, 'findproductinfolistquery.json'), 'utf8'));
  const detailEnv = JSON.parse(fs.readFileSync(path.join(aeFx, 'findaeproductbyid.json'), 'utf8'));
  const items = listEnv.aliexpress_postproduct_redefining_findproductinfolistquery_response.result.aeop_a_e_product_display_d_t_o_list.aeop_ae_product_display_sample_dto;
  const detail = detailEnv.aliexpress_postproduct_redefining_findaeproductbyid_response.result;
  const inv = aliexpress.normalizeInventory(items[0], detail);
  assert.equal(inv.length, 2);
  assert.equal(inv[0]._coll, '_inventory');
  assert.equal(inv[0].platform_inventory_item_id, '14:200003699;5:100014064');
  assert.equal(inv[0].platform_available, 25);
  assert.equal(inv[1].platform_available, 10);
});

// 14. TikTok Shop 连接器离线断言（META 形状、catalog 一致、签名官方拼接规则、三类 normalize 字段齐全）
const tiktokshop = require('../src/main/shopconn/tiktokshop');
const ttFx = path.join(__dirname, 'fixtures', 'tiktokshop');

check('TikTok Shop META 形状合规', () => {
  const m = tiktokshop.META;
  assert.equal(m.id, 'tiktokshop');
  assert.ok(m.name.zh && m.name.en, '双语名');
  assert.equal(m.category, 'crossborder');
  assert.ok(['available', 'self', 'gated', 'restricted'].includes(m.status), '档位合法');
  assert.equal(m.status, 'gated', 'TikTok Shop 定档 gated（卖家自用 security/合规审核强制 ≥3 周）');
  assert.equal(m.authType, 'oauth2-hmac256');
  assert.ok(m.requestGapMs > 0, 'requestGapMs');
  assert.deepEqual(m.resources, ['products', 'orders', 'inventory']);
  for (const f of m.credentialFields) {
    assert.ok(f.key && f.label && f.label.zh && f.label.en, `字段 ${f.key} 有双语 label`);
    assert.ok(typeof f.required === 'boolean' && typeof f.secret === 'boolean');
  }
  const keys = m.credentialFields.map((f) => f.key);
  for (const need of ['authRegion', 'appKey', 'appSecret', 'accessToken', 'refreshToken', 'shopCipher', 'accessTokenExpireAt', 'refreshTokenExpireAt']) {
    assert.ok(keys.includes(need), '缺字段 ' + need);
  }
  // secret 字段：appSecret / accessToken / refreshToken
  const secretKeys = m.credentialFields.filter((f) => f.secret).map((f) => f.key);
  for (const s of ['appSecret', 'accessToken', 'refreshToken']) {
    assert.ok(secretKeys.includes(s), '密钥类字段应 secret:true -> ' + s);
  }
  assert.ok(m.official.docs && m.official.signup && m.official.devapps, '官方三链接');
  assert.ok(Array.isArray(m.scopes) && m.scopes.length >= 3, 'scopes');
  assert.ok(Array.isArray(m.regions) && m.regions.length >= 1 && m.regions[0].includes('open-api.tiktokglobalshop.com'), '统一 host 说明');
});

check('TikTok Shop catalog 与 META 一致', () => {
  const entry = CATALOG.find((c) => c.id === 'tiktokshop');
  assert.ok(entry, 'catalog 存在 tiktokshop');
  assert.equal(entry.connect, tiktokshop.META.status, 'catalog 档位 == META.status');
  assert.equal(entry.category, tiktokshop.META.category);
});

check('TikTok Shop HMAC-SHA256 签名（官方拼接规则）', () => {
  // 官方 sign-your-api-request 示例形状：path + 排序后 query(key+value 直拼)，首尾 app_secret
  const appSecret = 'testappsecret';
  const path = '/authorization/202309/shops';
  const query = { app_key: '29a39d', timestamp: '1623812664' };
  // signParamString：按键排序 + key+value 直拼（剔除 sign/access_token）
  assert.equal(tiktokshop.signParamString(query), 'app_key29a39dtimestamp1623812664');
  // signBase：app_secret + path + paramString + body + app_secret
  assert.equal(
    tiktokshop.signBase(appSecret, path, query, ''),
    `${appSecret}${path}app_key29a39dtimestamp1623812664${appSecret}`
  );
  // 带 body 时把实际 body 字节串原样追加
  const body = JSON.stringify({ status: 'ALL' });
  assert.ok(tiktokshop.signBase(appSecret, path, query, body).includes(body), 'body 原样拼入');
  // sign 与 access_token 不参与签名
  const withExtras = Object.assign({ sign: 'XXXX', access_token: 'tok' }, query);
  assert.ok(!tiktokshop.signParamString(withExtras).includes('signXXXX'), 'sign 被剔除');
  assert.ok(!tiktokshop.signParamString(withExtras).includes('access_tokentok'), 'access_token 被剔除');
  // 确定性快照：HMAC-SHA256(appSecret, base) = 小写 hex
  const expect = require('crypto').createHmac('sha256', appSecret)
    .update(tiktokshop.signBase(appSecret, path, query, ''), 'utf8').digest('hex');
  assert.equal(tiktokshop.signRequest(appSecret, path, query, ''), expect);
  assert.match(tiktokshop.signRequest(appSecret, path, query, ''), /^[0-9a-f]{64}$/);
});

check('TikTok Shop 授权页域名（us/row）', () => {
  assert.equal(tiktokshop.authPageBase({ authRegion: 'us' }), 'https://services.us.tiktokshop.com/open/authorize');
  assert.equal(tiktokshop.authPageBase({ authRegion: 'row' }), 'https://services.tiktokshop.com/open/authorize');
  assert.equal(tiktokshop.authPageBase({}), 'https://services.tiktokshop.com/open/authorize');
  const url = tiktokshop.buildAuthUrl({ authRegion: 'us' }, 'svc123');
  assert.ok(url.startsWith('https://services.us.tiktokshop.com/open/authorize?service_id=svc123'));
});

check('TikTok Shop Products normalize（官方字段形状报文）字段齐全', () => {
  const product = JSON.parse(fs.readFileSync(path.join(ttFx, 'get-product.json'), 'utf8')).data.product;
  const recs = tiktokshop.normalizeListing(product, 'TikTok Shop（US）', 'USD');
  assert.equal(recs.length, 2);
  const r0 = recs[0];
  assert.equal(r0._coll, 'listings');
  assert.equal(r0.ext_key, 'tiktokshop:p1729432087292775345v1729388324987897824');
  assert.equal(r0.platform_product_id, '1729432087292775345');
  assert.equal(r0.platform_product_group, '1729432087292775345');
  assert.equal(r0.platform_variant_id, '1729388324987897824');
  assert.equal(r0.platform_inventory_item_id, '1729388324987897824');
  assert.equal(r0.platform_sku, 'TSHIRT-M-RED');
  assert.ok(r0.title.includes('Cotton T-Shirt') && r0.title.includes('Red') && r0.title.includes('M'), '标题含规格');
  assert.equal(r0.listing_price, 12.50);
  assert.equal(r0.currency, 'USD');
  assert.equal(r0.status, 'active'); // LIVE
  assert.ok(r0.image.includes('tshirt-main.jpg'));
  assert.equal(recs[1].platform_sku, 'TSHIRT-L-BLUE');
  assert.equal(recs[1].platform_variant_id, '1729388324987897825');
});

check('TikTok Shop Inventory normalize 输出 _inventory', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ttFx, 'inventory-search.json'), 'utf8')).data;
  const recs = tiktokshop.normalizeInventory(data.inventory);
  assert.equal(recs.length, 2);
  assert.equal(recs[0]._coll, '_inventory');
  assert.equal(recs[0].platform_inventory_item_id, '1729388324987897824');
  assert.equal(recs[0].platform_available, 10);
  assert.equal(recs[1].platform_inventory_item_id, '1729388324987897825');
  assert.equal(recs[1].platform_available, 20);
});

check('TikTok Shop Orders normalize（官方字段形状报文）字段齐全', () => {
  const order = JSON.parse(fs.readFileSync(path.join(ttFx, 'order-detail.json'), 'utf8')).data.order;
  const recs = tiktokshop.normalizeOrder(order, 'TikTok Shop（US）');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r._coll, 'orders');
  assert.equal(r.ext_key, 'tiktokshop:order567812345678901234L1');
  assert.equal(r.order_no, '567812345678901234');
  assert.equal(r.platform_order_id, '567812345678901234');
  assert.equal(r.platform_product_id, 'LI-1001');
  assert.equal(r.platform_variant_id, '1729388324987897824');
  assert.equal(r.platform_sku, 'TSHIRT-M-RED');
  assert.equal(r.product_name, 'Cotton T-Shirt');
  assert.equal(r.qty, 2);
  assert.equal(r.unit_price, 12.50);
  assert.equal(r.total_amount, 25.00);
  assert.equal(r.currency, 'USD');
  assert.equal(r.status, 'paid'); // AWAITING_SHIPMENT -> paid
  // 买家/收货如实映射
  assert.equal(r.buyer, 'John Buyer');
  assert.equal(r.buyer_name, 'John Buyer');
  assert.equal(r.buyer_email, 'buyer.john@example.com');
  assert.equal(r.buyer_phone, '+12135550100');
  assert.equal(r.ship_country, 'US');
  assert.equal(r.ship_province, 'CA');
  assert.equal(r.ship_city, 'Los Angeles');
  assert.equal(r.ship_zip, '90001');
  assert.ok(r.ship_address.includes('Airport Exchange'));
  // 汇总金额只在 L1
  assert.equal(r.order_shipping, 5.00);
  assert.equal(r.order_tax, 2.10);
  assert.equal(r.order_total, 32.10);
  assert.equal(r.platform_created_at, new Date(1760000000 * 1000).toISOString());
});

check('TikTok Shop 订单状态映射口径', () => {
  assert.equal(tiktokshop.orderStatus('UNPAID'), 'pending');
  assert.equal(tiktokshop.orderStatus('ON_HOLD'), 'pending');
  assert.equal(tiktokshop.orderStatus('AWAITING_SHIPMENT'), 'paid');
  assert.equal(tiktokshop.orderStatus('AWAITING_COLLECTION'), 'paid');
  assert.equal(tiktokshop.orderStatus('IN_TRANSIT'), 'shipped');
  assert.equal(tiktokshop.orderStatus('DELIVERED'), 'shipped');
  assert.equal(tiktokshop.orderStatus('COMPLETED'), 'completed');
  assert.equal(tiktokshop.orderStatus('CANCELLED'), 'cancelled');
});

check('TikTok Shop region->currency 映射', () => {
  assert.equal(tiktokshop.currencyFor('US'), 'USD');
  assert.equal(tiktokshop.currencyFor('GB'), 'GBP');
  assert.equal(tiktokshop.currencyFor('ID'), 'IDR');
  assert.equal(tiktokshop.currencyFor('MY'), 'MYR');
  assert.equal(tiktokshop.currencyFor('PH'), 'PHP');
  assert.equal(tiktokshop.currencyFor('TH'), 'THB');
  assert.equal(tiktokshop.currencyFor('VN'), 'VND');
  assert.equal(tiktokshop.currencyFor('SG'), 'SGD');
  assert.equal(tiktokshop.currencyFor('BR'), 'BRL');
  assert.equal(tiktokshop.currencyFor('MX'), 'MXN');
  assert.equal(tiktokshop.currencyFor('XX'), '');
});

// 15. Lazada 连接器离线断言（META 形状、catalog 一致、签名固定向量、国家 host/币种、三类 normalize 字段齐全）
const lazada = require('../src/main/shopconn/lazada');
const lzFx = path.join(__dirname, 'fixtures', 'lazada');

check('Lazada META 形状合规', () => {
  const m = lazada.META;
  assert.equal(m.id, 'lazada');
  assert.ok(m.name.zh && m.name.en, '双语名');
  assert.equal(m.category, 'crossborder');
  assert.ok(['available', 'self', 'gated', 'restricted'].includes(m.status), '档位合法');
  assert.equal(m.status, 'gated', 'Lazada 定档 gated（建应用需 Lazada 人工审核）');
  assert.equal(m.authType, 'oauth2-hmac256');
  assert.ok(m.requestGapMs > 0, 'requestGapMs');
  assert.deepEqual(m.resources, ['products', 'orders', 'inventory']);
  for (const f of m.credentialFields) {
    assert.ok(f.key && f.label && f.label.zh && f.label.en, `字段 ${f.key} 有双语 label`);
    assert.ok(typeof f.required === 'boolean' && typeof f.secret === 'boolean');
  }
  const keys = m.credentialFields.map((f) => f.key);
  for (const need of ['country', 'appKey', 'appSecret', 'accessToken', 'refreshToken', 'accessTokenExpireAt', 'refreshTokenExpireAt']) {
    assert.ok(keys.includes(need), '缺字段 ' + need);
  }
  // secret 字段：appSecret / accessToken / refreshToken
  const secretKeys = m.credentialFields.filter((f) => f.secret).map((f) => f.key);
  for (const s of ['appSecret', 'accessToken', 'refreshToken']) {
    assert.ok(secretKeys.includes(s), '密钥类字段应 secret:true -> ' + s);
  }
  assert.ok(m.official.docs && m.official.signup && m.official.devapps, '官方三链接');
  assert.ok(Array.isArray(m.scopes) && m.scopes.length >= 4, 'scopes');
  assert.ok(Array.isArray(m.regions) && m.regions.length === 6, 'regions 国家矩阵 sg/my/th/ph/id/vn');
});

check('Lazada catalog 与 META 一致', () => {
  const entry = CATALOG.find((c) => c.id === 'lazada');
  assert.ok(entry, 'catalog 存在 lazada');
  assert.equal(entry.connect, lazada.META.status, 'catalog 档位 == META.status');
  assert.equal(entry.category, lazada.META.category);
});

check('Lazada HMAC-SHA256 签名（固定向量）', () => {
  const appSecret = 'testappsecret';
  const apiPath = '/products/get';
  const query = { app_key: '123456', format: 'json', timestamp: '1760000000', sign_method: 'hmac', access_token: 'tok' };
  // signParamString：ASCII 升序 key+value 直拼（剔除 sign）
  const paramString = 'access_tokentokapp_key123456formatjsonsign_methodhmmactimestamp1760000000'.replace('hmmac', 'hmac');
  assert.equal(lazada.signParamString(query), paramString);
  // signBase：API 路径名在前 + 拼接串
  assert.equal(lazada.signBase(apiPath, query), '/products/get' + paramString);
  // sign = HMAC-SHA256(appSecret, base) 大写 hex
  const expect = require('crypto').createHmac('sha256', appSecret)
    .update(lazada.signBase(apiPath, query), 'utf8').digest('hex').toUpperCase();
  assert.equal(lazada.signRequest(appSecret, apiPath, query), expect);
  assert.match(lazada.signRequest(appSecret, apiPath, query), /^[0-9A-F]{64}$/, '大写 hex');
  // sign 不参与签名
  assert.ok(!lazada.signParamString(Object.assign({ sign: 'XXXX' }, query)).includes('signXXXX'));
});

check('Lazada 国家 host / 币种映射', () => {
  assert.equal(lazada.apiBase({ country: 'sg' }), 'https://api.lazada.sg');
  assert.equal(lazada.apiBase({ country: 'my' }), 'https://api.lazada.com.my');
  assert.equal(lazada.apiBase({ country: 'th' }), 'https://api.lazada.co.th');
  assert.equal(lazada.apiBase({ country: 'ph' }), 'https://api.lazada.com.ph');
  assert.equal(lazada.apiBase({ country: 'id' }), 'https://api.lazada.co.id');
  assert.equal(lazada.apiBase({ country: 'vn' }), 'https://api.lazada.vn');
  assert.equal(lazada.apiBase({ country: 'xx' }), 'https://api.lazada.sg', '未知国家默认 sg');
  assert.equal(lazada.currencyFor('SG'), 'SGD');
  assert.equal(lazada.currencyFor('MY'), 'MYR');
  assert.equal(lazada.currencyFor('TH'), 'THB');
  assert.equal(lazada.currencyFor('PH'), 'PHP');
  assert.equal(lazada.currencyFor('ID'), 'IDR');
  assert.equal(lazada.currencyFor('VN'), 'VND');
  assert.equal(lazada.currencyFor('XX'), '');
});

check('Lazada Products normalize（按官方字段形状报文）字段齐全', () => {
  const item = JSON.parse(fs.readFileSync(path.join(lzFx, 'product.get.json'), 'utf8')).Response.Item;
  const recs = lazada.normalizeListing(item, 'Lazada（SG）', 'SGD');
  assert.equal(recs.length, 2);
  const r0 = recs[0];
  assert.equal(r0._coll, 'listings');
  assert.equal(r0.ext_key, 'lazada:p2500139861v0');
  assert.equal(r0.platform_product_id, '2500139861');
  assert.equal(r0.platform_product_group, '2500139861');
  assert.equal(r0.platform_inventory_item_id, 'EARBUD-01');
  assert.equal(r0.platform_sku, 'EARBUD-01');
  assert.ok(r0.title.includes('Wireless Earbuds Pro') && r0.title.includes('EARBUD-01'), '标题含 SKU 区分');
  assert.equal(r0.listing_price, 25.99);
  assert.equal(r0.currency, 'SGD');
  assert.equal(r0.platform_available, 25);
  assert.equal(r0.status, 'active');
  assert.ok(r0.image.includes('earbuds-main.jpg'));
  const r1 = recs[1];
  assert.equal(r1.ext_key, 'lazada:p2500139861v90001');
  assert.equal(r1.platform_variant_id, '90001');
  assert.equal(r1.platform_sku, 'TSHIRT-M-RED');
  assert.equal(r1.listing_price, 12.50);
  assert.equal(r1.platform_available, 10);
});

check('Lazada Inventory normalize 输出 _inventory', () => {
  const rows = JSON.parse(fs.readFileSync(path.join(lzFx, 'inventory.get.json'), 'utf8')).Response.Products;
  const recs = lazada.normalizeInventory(rows);
  assert.equal(recs.length, 2);
  assert.equal(recs[0]._coll, '_inventory');
  assert.equal(recs[0].platform_inventory_item_id, 'EARBUD-01');
  assert.equal(recs[0].platform_available, 25);
  assert.equal(recs[1].platform_inventory_item_id, 'TSHIRT-M-RED');
  assert.equal(recs[1].platform_available, 10);
});

check('Lazada Orders normalize（按官方字段形状报文）字段齐全', () => {
  const order = JSON.parse(fs.readFileSync(path.join(lzFx, 'orders.get.json'), 'utf8')).Response.Orders[0];
  const items = JSON.parse(fs.readFileSync(path.join(lzFx, 'order.items.get.json'), 'utf8')).Response.OrderItems;
  const recs = lazada.normalizeOrder(order, items, 'Lazada（SG）');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r._coll, 'orders');
  assert.equal(r.ext_key, 'lazada:orderG112001234567890L1');
  assert.equal(r.order_no, 'G112001234567890');
  assert.equal(r.platform_order_id, 'G112001234567890');
  assert.equal(r.platform_product_id, '2500139861');
  assert.equal(r.platform_variant_id, '260422900298363');
  assert.equal(r.platform_sku, 'EARBUD-01');
  assert.equal(r.product_name, 'Wireless Earbuds Pro');
  assert.equal(r.qty, 1);
  assert.equal(r.unit_price, 25.99);
  assert.equal(r.total_amount, 25.99);
  assert.equal(r.currency, 'SGD');
  assert.equal(r.status, 'paid'); // ready_to_ship -> paid
  assert.equal(r.buyer, 'buyer_john');
  assert.equal(r.buyer_email, '');
  // 汇总金额只在 L1
  assert.equal(r.order_shipping, 2.00);
  assert.equal(r.order_total, 25.99);
  assert.equal(r.platform_created_at, new Date(1760000000 * 1000).toISOString());
});

check('Lazada 订单状态映射口径', () => {
  assert.equal(lazada.orderStatus('unpaid'), 'pending');
  assert.equal(lazada.orderStatus('pending'), 'pending');
  assert.equal(lazada.orderStatus('ready_to_ship'), 'paid');
  assert.equal(lazada.orderStatus('shipped'), 'shipped');
  assert.equal(lazada.orderStatus('toconfirmreceive'), 'shipped');
  assert.equal(lazada.orderStatus('delivered'), 'completed');
  assert.equal(lazada.orderStatus('closed'), 'completed');
  assert.equal(lazada.orderStatus('canceled'), 'cancelled');
  assert.equal(lazada.orderStatus('returned'), 'cancelled');
  assert.equal(lazada.orderStatus('unknown_xyz'), 'pending');
});

check('Lazada 授权链接构成', () => {
  const url = lazada.buildAuthUrl({ appKey: '123456' }, 'https://www.baidu.com/', 'state123');
  assert.ok(url.startsWith('https://auth.lazada.com/oauth/authorize?'));
  assert.ok(url.includes('response_type=code'));
  assert.ok(url.includes('client_id=123456'));
  assert.ok(url.includes('redirect_uri='));
  assert.ok(url.includes('state=state123'));
  assert.ok(url.includes('force_auth=true'));
});

check('Lazada unwrap 成功/错误信封', () => {
  const ok = { Response: { Name: 'x' } };
  assert.equal(lazada.unwrap(ok).Name, 'x');
  let threw = false;
  try { lazada.unwrap({ type: 'ISV', code: 'InvalidAccessToken', message: 'bad token' }); } catch { threw = true; }
  assert.ok(threw, 'HTTP200 但 JSON code 非成功应抛业务错误（不误判 ok）');
});

// 16. 1688 货源连接器离线断言（META 形状、catalog 一致、AOP 签名固定向量、normalize 字段、fetchResource 定时同步为空）
const c1688 = require('../src/main/shopconn/c1688');
const fx1688 = path.join(__dirname, 'fixtures', '1688');

check('1688 META 形状合规', () => {
  const m = c1688.META;
  assert.equal(m.id, '1688');
  assert.ok(m.name.zh && m.name.en, '双语名');
  assert.equal(m.category, 'sourcing');
  assert.ok(['available', 'self', 'gated', 'restricted'].includes(m.status), '档位合法');
  assert.equal(m.status, 'gated', '1688 定档 gated（企业实名+解决方案白名单，纯个人无法自助）');
  assert.equal(m.authType, 'oauth2-aop');
  assert.ok(m.requestGapMs > 0, 'requestGapMs');
  assert.deepEqual(m.resources, ['products'], '货源选品关键词驱动，只放 products');
  for (const f of m.credentialFields) {
    assert.ok(f.key && f.label && f.label.zh && f.label.en, `字段 ${f.key} 有双语 label`);
    assert.ok(typeof f.required === 'boolean' && typeof f.secret === 'boolean');
  }
  const keys = m.credentialFields.map((f) => f.key);
  for (const need of ['appKey', 'appSecret', 'accessToken', 'memberId']) {
    assert.ok(keys.includes(need), '缺字段 ' + need);
  }
  const secretKeys = m.credentialFields.filter((f) => f.secret).map((f) => f.key);
  assert.ok(secretKeys.includes('appSecret') && secretKeys.includes('accessToken'), '密钥类字段 secret:true');
  assert.ok(m.official.docs && m.official.signup && m.official.devapps, '官方三链接');
  assert.ok(Array.isArray(m.scopes) && m.scopes.length >= 2, 'scopes');
  assert.ok(Array.isArray(m.regions) && m.regions.length >= 1 && /CNY/.test(m.regions[0]), 'CN 内贸 / CNY');
});

check('1688 catalog 与 META 一致', () => {
  const entry = CATALOG.find((c) => c.id === '1688');
  assert.ok(entry, 'catalog 存在 1688');
  assert.equal(entry.connect, c1688.META.status, 'catalog 档位 == META.status');
  assert.equal(entry.category, c1688.META.category);
});

check('1688 AOP 签名（固定向量：排序直拼 + HMAC_MD5/MD5 双模式大写 hex）', () => {
  const secret = 'testappsecret';
  const params = { _aop_timestamp: '1760000000', access_token: 'tok', keyword: '耳机', page: 1 };
  // buildSignBase：ASCII 升序 key+value 直拼（_ 95 < a 97，故 _aop_timestamp 在前）
  assert.equal(c1688.buildSignBase(params),
    '_aop_timestamp1760000000access_tokentokkeyword耳机page1');
  // hmac 模式（本适配器默认使用）：HMAC_MD5(secret, base) 大写 hex
  const expectHmac = require('crypto').createHmac('md5', secret)
    .update(c1688.buildSignBase(params), 'utf8').digest('hex').toUpperCase();
  assert.equal(c1688.signRequest(secret, params, 'hmac'), expectHmac);
  assert.match(c1688.signRequest(secret, params, 'hmac'), /^[0-9A-F]{32}$/, '32 位大写 hex');
  // md5 模式：md5(secret + base + secret) 大写 hex
  const expectMd5 = require('crypto').createHash('md5')
    .update(secret + c1688.buildSignBase(params) + secret, 'utf8').digest('hex').toUpperCase();
  assert.equal(c1688.digestBase(secret, c1688.buildSignBase(params), 'md5'), expectMd5);
  assert.match(c1688.digestBase(secret, c1688.buildSignBase(params), 'md5'), /^[0-9A-F]{32}$/);
  // _aop_signature 不参与签名
  assert.ok(!c1688.buildSignBase(Object.assign({ _aop_signature: 'XXXX' }, params)).includes('_aop_signatureXXXX'));
});

check('1688 网关路径与授权链接构成', () => {
  assert.equal(c1688.gatewayUrl({ appKey: '123456' }, 'product.search.keywordQuery'),
    'https://gw.open.1688.com/openapi/param2/1/com.alibaba.fenxiao.crossborder/product.search.keywordQuery/123456');
  const url = c1688.buildAuthUrl({ appKey: '123456' }, 'https://www.baidu.com/', 'st1');
  assert.ok(url.startsWith('https://auth.1688.com/oauth/authorize?'));
  assert.ok(url.includes('client_id=123456'));
  assert.ok(url.includes('site=1688'));
  assert.ok(url.includes('redirect_uri='));
  assert.ok(url.includes('state=st1'));
});

check('1688 keywordSearch normalize（按官方字段形状报文）字段齐全', () => {
  const env = JSON.parse(fs.readFileSync(path.join(fx1688, 'keywordQuery.json'), 'utf8'));
  // callAop 解包后 data = json.result；offerListArr 从 data 取 offerList
  const offers = c1688.offerListArr(env.result);
  assert.equal(offers.length, 2);
  const recs = offers.map((o) => c1688.normalizeSearchOffer(o, '1688 货源'));
  const r0 = recs[0];
  assert.equal(r0._coll, 'listings');
  assert.equal(r0.ext_key, '1688:offer701234567890');
  assert.equal(r0.platform_product_id, '701234567890');
  assert.equal(r0.platform_product_group, '701234567890');
  assert.ok(r0.title.includes('蓝牙耳机'), '标题');
  assert.equal(r0.shop_name, '深圳市优品电子有限公司'); // 供应商名作 shop_name
  assert.equal(r0.vendor, '深圳市优品电子有限公司');
  assert.equal(r0.listing_price, 25.9); // 价格区间上限
  assert.equal(r0._price_min, 12.5);
  assert.equal(r0._price_max, 25.9);
  assert.equal(r0._moq, 2);
  assert.equal(r0._one_psale, '一件代发');
  assert.equal(r0.currency, 'CNY');
  assert.equal(r0.url, 'https://detail.1688.com/offer/701234567890.html');
  assert.ok(r0.image.includes('alicdn.com'));
  assert.equal(r0.platform_available, null); // 搜索列表不透实时库存
  // 第二个：非一件代发（_one_psale 为空），价格区间单点
  const r1 = recs[1];
  assert.equal(r1.ext_key, '1688:offer709876543210');
  assert.equal(r1._one_psale, '');
  assert.equal(r1._moq, 1);
  assert.equal(r1.listing_price, 35.0);
});

check('1688 productDetail normalize 展开 SKU（ext_key=offer<id>v<skuId>）', () => {
  const env = JSON.parse(fs.readFileSync(path.join(fx1688, 'queryProductDetail.json'), 'utf8'));
  const recs = c1688.normalizeDetailOffer(env.result, '1688 货源');
  assert.equal(recs.length, 2);
  const r0 = recs[0];
  assert.equal(r0._coll, 'listings');
  assert.equal(r0.ext_key, '1688:offer701234567890vS1001');
  assert.equal(r0.platform_product_id, '701234567890');
  assert.equal(r0.platform_product_group, '701234567890');
  assert.equal(r0.platform_variant_id, 'S1001');
  assert.equal(r0.platform_inventory_item_id, 'S1001');
  assert.equal(r0.platform_sku, 'EB-WHITE');
  assert.ok(r0.title.includes('颜色:白色'), '标题含规格');
  assert.equal(r0.listing_price, 12.5);
  assert.equal(r0.currency, 'CNY');
  assert.equal(r0.platform_available, 100); // 库存字段有则映射
  assert.equal(r0.status, 'active');
  const r1 = recs[1];
  assert.equal(r1.ext_key, '1688:offer701234567890vS1002');
  assert.equal(r1.platform_variant_id, 'S1002');
  assert.equal(r1.platform_sku, 'EB-BLACK');
  assert.equal(r1.platform_available, 50);
});

check('1688 fetchResource(products) 定时同步返回空（货源选品关键词驱动，定时不拉取）', async () => {
  const out = await c1688.fetchResource({}, 'products', '', { t: (k) => k });
  assert.ok(Array.isArray(out.records), 'records 为数组');
  assert.equal(out.records.length, 0, '无关键词的定时同步恒为空记录，绝不伪造全量');
  assert.equal(out.nextCursor, '');
});

// 17. 国内三平台（淘宝/京东/拼多多）离线断言（2026-10-07：META 形状、catalog 一致、签名固定向量、
//     三类 normalize 字段、状态映射；三平台一律 restricted——敏感接口须在各自专属云内调用，本机直连无法打通）
const taobao = require('../src/main/shopconn/taobao');
const jd = require('../src/main/shopconn/jd');
const pdd = require('../src/main/shopconn/pdd');
const domFxRoot = path.join(__dirname, 'fixtures');
function loadDomFix(plat, name) {
  return JSON.parse(fs.readFileSync(path.join(domFxRoot, plat, name), 'utf8'));
}
function assertDomesticMeta(ad, id, authType) {
  const m = ad.META;
  assert.equal(m.id, id);
  assert.ok(m.name.zh && m.name.en, `${id} 双语名`);
  assert.equal(m.category, 'domestic', `${id} category=domestic`);
  // 定档关键：三平台一律 restricted，绝不拔高到 gated/self
  assert.equal(m.status, 'restricted', `${id} 定档 restricted`);
  assert.equal(m.authType, authType, `${id} authType`);
  assert.ok(Number.isFinite(m.requestGapMs) && m.requestGapMs > 0, `${id} requestGapMs`);
  for (const r of m.resources) assert.ok(['products', 'orders', 'inventory'].includes(r), `${id} resource ${r}`);
  for (const f of m.credentialFields) {
    assert.ok(f.key && f.label && f.label.zh && f.label.en, `${id} 字段 ${f.key} 双语 label`);
    assert.strictEqual(typeof f.secret, 'boolean', `${id} 字段 ${f.key} secret 布尔`);
  }
  assert.ok(m.official.docs && m.official.signup && m.official.devapps, `${id} 官方三链接`);
  assert.ok(Array.isArray(m.scopes) && m.scopes.length, `${id} scopes`);
  assert.ok(Array.isArray(m.needs) && m.needs.length, `${id} needs`);
  assert.ok(Array.isArray(m.regions) && m.regions.length, `${id} regions`);
}
function credHas(ad, key, secret) {
  const f = ad.META.credentialFields.find((x) => x.key === key);
  assert.ok(f, `${ad.META.id} 有凭证字段 ${key}`);
  assert.strictEqual(f.secret, secret, `${ad.META.id} ${key} secret 标志`);
}

check('国内三平台 META 形状合规（均 restricted / domestic）', () => {
  assertDomesticMeta(taobao, 'taobao', 'top-sign');
  assertDomesticMeta(jd, 'jd', 'jd-sign');
  assertDomesticMeta(pdd, 'pdd', 'top-sign');
  credHas(taobao, 'appSecret', true);
  credHas(taobao, 'accessToken', true);
  credHas(taobao, 'appKey', false);
  credHas(jd, 'appSecret', true);
  credHas(jd, 'accessToken', true);
  credHas(jd, 'refreshToken', true);
  credHas(jd, 'appKey', false);
  credHas(pdd, 'clientSecret', true);
  credHas(pdd, 'accessToken', true);
  credHas(pdd, 'clientId', false);
});

check('国内三平台 catalog 与 META 一致（connect=restricted）', () => {
  for (const ad of [taobao, jd, pdd]) {
    const e = CATALOG.find((c) => c.id === ad.META.id);
    assert.ok(e, `catalog 存在 ${ad.META.id}`);
    assert.equal(e.connect, ad.META.status, `${ad.META.id} catalog 档位 == META.status`);
    assert.equal(e.category, ad.META.category, `${ad.META.id} catalog category`);
  }
});

check('国内三平台签名固定向量（排序直拼 + 首尾 secret + MD5 大写）', () => {
  // 淘宝 TOP MD5
  const tp = { method: 'taobao.items.onsale.get', app_key: 'testkey', timestamp: '2026-10-07 10:00:00', v: '2.0', sign_method: 'md5' };
  assert.equal(taobao.buildSignBase(tp),
    'app_keytestkeymethodtaobao.items.onsale.getsign_methodmd5timestamp2026-10-07 10:00:00v2.0');
  assert.equal(taobao.signRequest('testsecret', tp, 'md5'), '72C7DE2513D21413FA37C10F451FDAF7');
  // sign 不参与
  assert.ok(!taobao.buildSignBase(Object.assign({ sign: 'XXXX' }, tp)).includes('signXXXX'));
  // 京东 JOS：360buy_param_json 作为单个参数参与签名
  const jp = { method: 'jingdong.item.list.get', app_key: 'jdkey', access_token: 'jdtok', timestamp: '1728000000', format: 'json', v: '2.0', sign_method: 'md5', '360buy_param_json': '{"page":1}' };
  assert.equal(jd.signRequest('jdsecret', jp), 'EBA5B4B34B04D0AD9CDF4E99480F4E57');
  // 拼多多 POP
  const pp = { type: 'pdd.goods.list.get', client_id: 'pddkey', access_token: 'pddtok', timestamp: '1728000000', data_type: 'JSON', version: 'V1', page: 1, page_size: 1 };
  assert.equal(pdd.signRequest('pddsecret', pp), '1336CCC72AA02FCF71BDBCCF61053CA7');
});

check('淘宝 normalize 三类记录（多 SKU/单 SKU 商品、库存、订单）', () => {
  const itemsEnv = loadDomFix('taobao', 'items.onsale.get.json').items_onsale_get_response;
  const items = taobao.itemListArr(itemsEnv);
  assert.equal(items.length, 2);
  const l1 = taobao.normalizeListing(items[0], '淘宝/天猫（测试店）', 'CNY');
  assert.equal(l1.length, 2, '多 SKU 商品出 2 条 listing');
  assert.equal(l1[0].ext_key, 'taobao:p520000000001v900001');
  assert.equal(l1[0].platform_inventory_item_id, '900001');
  assert.equal(l1[0].listing_price, 125);
  assert.equal(l1[0].currency, 'CNY');
  assert.equal(l1[0].status, 'active');
  const l2 = taobao.normalizeListing(items[1], '淘宝/天猫（测试店）', 'CNY');
  assert.equal(l2.length, 1, '单 SKU 商品出 1 条 listing');
  assert.equal(l2[0].ext_key, 'taobao:p520000000002v0');
  assert.equal(l2[0].platform_inventory_item_id, 'i520000000002');
  const inv = taobao.normalizeInventory(items[0]);
  assert.equal(inv.length, 2);
  assert.equal(inv[0]._coll, '_inventory');
  assert.equal(inv[0].platform_inventory_item_id, '900001');
  assert.equal(inv[0].platform_available, 25);

  const tradesEnv = loadDomFix('taobao', 'trades.sold.get.json').trades_sold_get_response;
  const trades = taobao.tradeListArr(tradesEnv);
  assert.equal(trades.length, 2);
  const o1 = taobao.normalizeOrder(trades[0], '淘宝/天猫（测试店）');
  assert.equal(o1.length, 1);
  assert.equal(o1[0].ext_key, 'taobao:order380000000000123456L1');
  assert.equal(o1[0].platform_order_id, '380000000000123456');
  assert.equal(o1[0].status, 'paid');
  assert.equal(o1[0].currency, 'CNY');
  assert.equal(o1[0].qty, 2);
  assert.equal(o1[0].order_total, 250);
  const o2 = taobao.normalizeOrder(trades[1], '淘宝/天猫（测试店）');
  assert.equal(o2[0].status, 'completed');
  assert.equal(o2[0].order_shipping, 6);
});

check('京东 normalize 三类记录与状态映射', () => {
  const itemsEnv = loadDomFix('jd', 'item.list.get.json').jingdong_item_list_get_responce;
  const items = jd.itemListArr(itemsEnv);
  assert.equal(items.length, 2);
  const l1 = jd.normalizeListing(items[0], '京东（测试店）', 'CNY');
  assert.equal(l1.length, 2);
  assert.equal(l1[0].ext_key, 'jd:p10000001v200001');
  assert.equal(l1[0].listing_price, 125);
  const inv = jd.normalizeInventory(items[0]);
  assert.equal(inv.length, 2);
  assert.equal(inv[0].platform_available, 25);

  const orderEnv = loadDomFix('jd', 'order.list.get.json').jingdong_order_list_get_responce;
  const orders = orderEnv.orderList.order;
  const o1 = jd.normalizeOrder(orders[0], '京东（测试店）');
  assert.equal(o1[0].ext_key, 'jd:orderJD1000000000001L1');
  assert.equal(o1[0].status, 'paid'); // orderState=2
  assert.equal(o1[0].qty, 2);
  const o2 = jd.normalizeOrder(orders[1], '京东（测试店）');
  assert.equal(o2[0].status, 'completed'); // orderState=4
});

check('拼多多 normalize 三类记录（分→元换算）与状态映射', () => {
  const goodsEnv = loadDomFix('pdd', 'goods.list.get.json').pdd_goods_list_get_response;
  const list = pdd.goodsListArr(goodsEnv);
  assert.equal(list.length, 2);
  const l1 = pdd.normalizeListing(list[0], '拼多多（测试店）', 'CNY');
  assert.equal(l1.length, 1);
  assert.equal(l1[0].ext_key, 'pdd:p710000000001v0');
  assert.equal(l1[0].listing_price, 125, '12500 分 = 125 元');
  assert.equal(l1[0].currency, 'CNY');
  const inv = pdd.normalizeInventory(list[0]);
  assert.equal(inv[0].platform_available, 100);

  const orderEnv = loadDomFix('pdd', 'order.list.get.json').pdd_order_list_get_response;
  const orders = pdd.orderListArr(orderEnv);
  assert.equal(orders.length, 2);
  const o1 = pdd.normalizeOrder(orders[0], '拼多多（测试店）');
  assert.equal(o1[0].ext_key, 'pdd:order26100112345678L1');
  assert.equal(o1[0].status, 'paid'); // order_status=1 待发货
  assert.equal(o1[0].unit_price, 125, '商品价 12500 分=125 元');
  assert.equal(o1[0].order_total, 250, '订单额 25000 分=250 元');
  const o2 = pdd.normalizeOrder(orders[1], '拼多多（测试店）');
  assert.equal(o2[0].status, 'completed'); // order_status=4
  assert.equal(o2[0].order_shipping, 6, '运费 600 分=6 元');
});

check('国内三平台订单状态映射到统一五态', () => {
  assert.equal(taobao.orderStatus('WAIT_SELLER_SEND_GOODS'), 'paid');
  assert.equal(taobao.orderStatus('WAIT_BUYER_CONFIRM_GOODS'), 'shipped');
  assert.equal(taobao.orderStatus('TRADE_FINISHED'), 'completed');
  assert.equal(taobao.orderStatus('TRADE_CLOSED'), 'cancelled');
  assert.equal(taobao.orderStatus('WAIT_BUYER_PAY'), 'pending');
  assert.equal(jd.orderStatus(2), 'paid');
  assert.equal(jd.orderStatus(3), 'shipped');
  assert.equal(jd.orderStatus(4), 'completed');
  assert.equal(jd.orderStatus(5), 'cancelled');
  assert.equal(jd.orderStatus(1), 'pending');
  assert.equal(pdd.orderStatus(1), 'paid');
  assert.equal(pdd.orderStatus(2), 'shipped');
  assert.equal(pdd.orderStatus(4), 'completed');
  assert.equal(pdd.orderStatus(5), 'cancelled');
  assert.equal(pdd.orderStatus(7), 'pending');
  assert.equal(pdd.orderStatus(6), 'pending');
});

// 18. 国内第二批（抖店/快手/小红书）离线断言（2026-10-07：META 形状、catalog 一致、签名固定向量、
//     三类 normalize 字段、状态映射；三平台一律 restricted——须企业主体+资质/审核/IP 白名单，个人与个体通常无法自助）
const douyin = require('../src/main/shopconn/douyin');
const kuaishou = require('../src/main/shopconn/kuaishou');
const xiaohongshu = require('../src/main/shopconn/xiaohongshu');

check('国内第二批 META 形状合规（均 restricted / domestic）', () => {
  assertDomesticMeta(douyin, 'douyin', 'douyin-sign');
  assertDomesticMeta(kuaishou, 'kuaishou', 'kwaixiaodian-oauth2');
  assertDomesticMeta(xiaohongshu, 'xiaohongshu', 'xhs-md5');
  // secret 字段
  credHas(douyin, 'appSecret', true);
  credHas(douyin, 'accessToken', true);
  credHas(douyin, 'appKey', false);
  credHas(douyin, 'shopId', false);
  credHas(kuaishou, 'appSecret', true);
  credHas(kuaishou, 'signSecret', true);
  credHas(kuaishou, 'accessToken', true);
  credHas(kuaishou, 'refreshToken', true);
  credHas(kuaishou, 'appId', false);
  credHas(xiaohongshu, 'appSecret', true);
  credHas(xiaohongshu, 'accessToken', true);
  credHas(xiaohongshu, 'refreshToken', true);
  credHas(xiaohongshu, 'appId', false);
});

check('国内第二批 catalog 与 META 一致（connect=restricted）', () => {
  for (const ad of [douyin, kuaishou, xiaohongshu]) {
    const e = CATALOG.find((c) => c.id === ad.META.id);
    assert.ok(e, `catalog 存在 ${ad.META.id}`);
    assert.equal(e.connect, ad.META.status, `${ad.META.id} catalog 档位 == META.status`);
    assert.equal(e.category, ad.META.category, `${ad.META.id} catalog category`);
  }
});

check('index.js 已注册三平台（ADAPTERS 共 14 个）', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'shopconn', 'index.js'), 'utf8');
  for (const id of ['douyin', 'kuaishou', 'xiaohongshu']) {
    assert.ok(src.includes(`require('./${id}')`), `index.js require ${id}`);
    assert.ok(new RegExp(`\\b${id}\\b`).test(src.split('ADAPTERS = {')[1].split('};')[0]), `ADAPTERS 映射含 ${id}`);
  }
});

check('抖店签名固定向量（param_json 排序 + 剔除 access_token/sign_method + MD5/HMAC）', () => {
  // param_json 内部 key 按字母排序
  assert.equal(douyin.buildParamJson({ size: 1, page: 1 }), '{"page":1,"size":1}');
  // 公共参数（不含 access_token/sign_method）按 key 升序 key+value 直拼
  const dp = {
    method: 'order.searchList', app_key: 'testkey',
    param_json: '{"page":1,"size":1}', timestamp: '2026-10-07 10:00:00', v: '2',
  };
  assert.equal(douyin.buildSignBase(dp),
    'app_keytestkeymethodorder.searchListparam_json{"page":1,"size":1}timestamp2026-10-07 10:00:00v2');
  // MD5 模式（首尾拼 app_secret）
  assert.equal(douyin.signRequest('testsecret', dp, 'md5'), 'bcbe4f6368301b55d50341541e746126');
  // HMAC-SHA256 模式
  assert.equal(douyin.signRequest('testsecret', dp, 'hmac-sha256'),
    '7e1e042feaf6ad5c790b25ee6113fe6a92baab20ed49ad7f8e9040fb5872908d');
  // access_token 与 sign_method 不参与签名
  const withExtras = Object.assign({ access_token: 'tok', sign_method: 'md5', sign: 'XXXX' }, dp);
  assert.ok(!douyin.buildSignBase(withExtras).includes('access_tokentok'), 'access_token 被剔除');
  assert.ok(!douyin.buildSignBase(withExtras).includes('sign_methodmd5'), 'sign_method 被剔除');
});

check('快手签名固定向量（系统参数排序直拼 + HMAC-SHA256）与授权链接', () => {
  const kp = {
    appkey: 'testkey', timestamp: '1760000000000', access_token: 'kto', version: '1',
    method: 'open.order.list', signMethod: 'HMAC_SHA256', param: '{"page":1}',
  };
  assert.equal(kuaishou.buildSignBase(kp),
    'access_tokenktoappkeytestkeymethodopen.order.listparam{"page":1}signMethodHMAC_SHA256timestamp1760000000000version1');
  assert.equal(kuaishou.signRequest('kssecret', kp, 'HMAC_SHA256'),
    '87fba2d8ef3cf6eee01038d2b49a26b266db282f4fb725dc1a579b78f1b77620');
  // sign 不参与
  assert.ok(!kuaishou.buildSignBase(Object.assign({ sign: 'XXXX' }, kp)).includes('signXXXX'));
  // 授权链接构成
  const url = kuaishou.buildAuthUrl({ appId: 'testkey' }, 'https://www.baidu.com/', 'st1');
  assert.ok(url.startsWith('https://open.kwaixiaodian.com/oauth/authorize?'));
  assert.ok(url.includes('app_id=testkey'));
  assert.ok(url.includes('response_type=code'));
  assert.ok(url.includes('scope='));
  assert.ok(url.includes('state=st1'));
});

check('小红书签名固定向量（method?appId=..&timestamp=..&version=2.0 + appSecret，MD5）', () => {
  const creds = { appId: 'xhsapp', appSecret: 'xhssecret' };
  assert.equal(xiaohongshu.buildSignBase(creds, 'order.list', '1760000000'),
    'order.list?appId=xhsapp&timestamp=1760000000&version=2.0xhssecret');
  assert.equal(xiaohongshu.signRequest(creds, 'order.list', '1760000000'),
    '885fab5fa144291ea1de72f4dba5e1b5');
  // 成功/错误信封：code=0 成功；带 error_no 视为错误
  assert.equal(xiaohongshu.unwrapEnvelope({ code: 0, data: { a: 1 } }).data.a, 1);
  let threw = false;
  try { xiaohongshu.unwrapEnvelope({ code: 30001, error_no: 30001, error_msg: 'bad sign' }); } catch { threw = true; }
  const errEnv = xiaohongshu.unwrapEnvelope({ code: 30001, error_no: 30001, error_msg: 'bad sign' });
  assert.ok(errEnv.error, 'code 非 0/200 应视为错误（不误判 ok）');
  void threw;
});

check('国内第二批空/非 JSON 信封一律视为错误（绝不假阳性）', () => {
  // 网关返回纯文本/空体（如快手根路径返回 "ok"）时，绝不能当成成功
  assert.ok(douyin.unwrapEnvelope(null).error, '抖店 null 信封 -> 错误');
  assert.ok(douyin.unwrapEnvelope('').error, '抖店空串信封 -> 错误');
  assert.ok(kuaishou.unwrapEnvelope(null).error, '快手 null 信封 -> 错误');
  assert.ok(kuaishou.unwrapEnvelope('ok').error, '快手纯文本 "ok" -> 错误');
  assert.ok(xiaohongshu.unwrapEnvelope(null).error, '小红书 null 信封 -> 错误');
  assert.ok(xiaohongshu.unwrapEnvelope('').error, '小红书空串信封 -> 错误');
  // xhs error_code 信封 -> 错误且有可读信息
  const xe = xiaohongshu.unwrapEnvelope({ error_code: -1 });
  assert.ok(xe.error, '小红书 error_code=-1 -> 错误');
});

check('抖店 normalize 三类记录（多 SKU/单 SKU 商品、库存、订单）与状态映射', () => {
  const skuEnv = loadDomFix('douyin', 'sku.list.json');
  const items = douyin.productListArr(skuEnv.data);
  assert.equal(items.length, 2);
  const l1 = douyin.normalizeListing(items[0], '抖店（测试店）', 'CNY');
  assert.equal(l1.length, 2, '多 SKU 商品出 2 条 listing');
  assert.equal(l1[0].ext_key, 'douyin:p700000000001v900001');
  assert.equal(l1[0].platform_inventory_item_id, '900001');
  assert.equal(l1[0].listing_price, 125);
  assert.equal(l1[0].currency, 'CNY');
  assert.equal(l1[0].status, 'active');
  assert.ok(l1[0].image.includes('douyinpic.com'));
  const l2 = douyin.normalizeListing(items[1], '抖店（测试店）', 'CNY');
  assert.equal(l2.length, 1, '单 SKU 商品出 1 条 listing');
  assert.equal(l2[0].ext_key, 'douyin:p700000000002v0');
  assert.equal(l2[0].platform_inventory_item_id, 'i700000000002');
  const inv = douyin.normalizeInventory(items[0]);
  assert.equal(inv.length, 2);
  assert.equal(inv[0]._coll, '_inventory');
  assert.equal(inv[0].platform_inventory_item_id, '900001');
  assert.equal(inv[0].platform_available, 25);

  const orderEnv = loadDomFix('douyin', 'order.searchList.json');
  const orders = douyin.orderListArr(orderEnv.data);
  assert.equal(orders.length, 2);
  const o1 = douyin.normalizeOrder(orders[0], '抖店（测试店）');
  assert.equal(o1.length, 1);
  assert.equal(o1[0].ext_key, 'douyin:order39000000000012345L1');
  assert.equal(o1[0].platform_order_id, '39000000000012345');
  assert.equal(o1[0].status, 'paid'); // order_status=2 待发货
  assert.equal(o1[0].qty, 2);
  assert.equal(o1[0].unit_price, 125);
  assert.equal(o1[0].order_total, 250);
  assert.equal(o1[0].order_shipping, 6);
  assert.equal(o1[0].buyer_name, '张三');
  assert.equal(o1[0].buyer_phone, '13800000000');
  assert.equal(o1[0].ship_province, '广东省');
  const o2 = douyin.normalizeOrder(orders[1], '抖店（测试店）');
  assert.equal(o2[0].status, 'completed'); // order_status=4
});

check('快手 normalize 三类记录与状态映射', () => {
  const itemEnv = loadDomFix('kuaishou', 'open.item.list.json');
  const items = kuaishou.productListArr(itemEnv.data);
  assert.equal(items.length, 1);
  const l1 = kuaishou.normalizeListing(items[0], '快手小店（测试店）', 'CNY');
  assert.equal(l1.length, 2);
  assert.equal(l1[0].ext_key, 'kuaishou:p600001v800001');
  assert.equal(l1[0].listing_price, 125);
  assert.equal(l1[0].platform_available, 25);
  const inv = kuaishou.normalizeInventory(items[0]);
  assert.equal(inv.length, 2);
  assert.equal(inv[0].platform_inventory_item_id, '800001');
  assert.equal(inv[0].platform_available, 25);

  const orderEnv = loadDomFix('kuaishou', 'open.order.list.json');
  const orders = kuaishou.orderListArr(orderEnv.data);
  assert.equal(orders.length, 1);
  const o1 = kuaishou.normalizeOrder(orders[0], '快手小店（测试店）');
  assert.equal(o1[0].ext_key, 'kuaishou:orderKS20261001001L1');
  assert.equal(o1[0].status, 'paid'); // order_status=20
  assert.equal(o1[0].qty, 2);
  assert.equal(o1[0].unit_price, 125);
  assert.equal(o1[0].order_total, 250);
  assert.equal(o1[0].order_shipping, 6);
  assert.equal(o1[0].buyer_name, '张三');
});

check('小红书 normalize 三类记录与状态映射', () => {
  const prodEnv = loadDomFix('xiaohongshu', 'product.list.json');
  const items = xiaohongshu.productListArr(prodEnv.data);
  assert.equal(items.length, 1);
  const l1 = xiaohongshu.normalizeListing(items[0], '小红书千帆（测试店）', 'CNY');
  assert.equal(l1.length, 1);
  assert.equal(l1[0].ext_key, 'xiaohongshu:p500001v700001');
  assert.equal(l1[0].listing_price, 125);
  assert.equal(l1[0].platform_available, 25);
  const inv = xiaohongshu.normalizeInventory(items[0]);
  assert.equal(inv.length, 1);
  assert.equal(inv[0].platform_inventory_item_id, '700001');
  assert.equal(inv[0].platform_available, 25);

  const orderEnv = loadDomFix('xiaohongshu', 'order.list.json');
  const orders = xiaohongshu.orderListArr(orderEnv.data);
  assert.equal(orders.length, 1);
  const o1 = xiaohongshu.normalizeOrder(orders[0], '小红书千帆（测试店）');
  assert.equal(o1[0].ext_key, 'xiaohongshu:orderXHS20261001001L1');
  assert.equal(o1[0].status, 'paid'); // PAID
  assert.equal(o1[0].qty, 2);
  assert.equal(o1[0].unit_price, 125);
  assert.equal(o1[0].order_total, 250);
  assert.equal(o1[0].buyer_name, '张三');
});

check('国内第二批订单状态映射到统一五态', () => {
  assert.equal(douyin.orderStatus(1), 'pending');
  assert.equal(douyin.orderStatus(2), 'paid');
  assert.equal(douyin.orderStatus(3), 'shipped');
  assert.equal(douyin.orderStatus(4), 'completed');
  assert.equal(douyin.orderStatus(5), 'cancelled');
  assert.equal(kuaishou.orderStatus('10'), 'pending');
  assert.equal(kuaishou.orderStatus('20'), 'paid');
  assert.equal(kuaishou.orderStatus('30'), 'shipped');
  assert.equal(kuaishou.orderStatus('40'), 'completed');
  assert.equal(kuaishou.orderStatus('50'), 'cancelled');
  assert.equal(xiaohongshu.orderStatus('UNPAID'), 'pending');
  assert.equal(xiaohongshu.orderStatus('PAID'), 'paid');
  assert.equal(xiaohongshu.orderStatus('SHIPPED'), 'shipped');
  assert.equal(xiaohongshu.orderStatus('COMPLETED'), 'completed');
  assert.equal(xiaohongshu.orderStatus('CANCELED'), 'cancelled');
});

// ════════════════════════════════════════════════════════════════════
// 开发者轮新增：AI 引擎 / 预设 / 语音（确定性、离线、无 Key）
// 用本机临时 HTTP mock + 临时目录，禁止外网、禁止写 Key。
// ════════════════════════════════════════════════════════════════════
const http = require('http');
const engine = require('../src/main/engine');
const { PRESETS } = require('../src/main/presets');
const voice = require('../src/main/voice');

const engTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ewb-engine-'));
const engModelsDir = path.join(engTmp, 'models');
fs.mkdirSync(path.join(engModelsDir, 'stt'), { recursive: true });
engine.init({ userDir: engTmp, modelsDir: engModelsDir });

const engineServers = [];
function startMock(handler) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let body = '';
      req.on('data', (d) => { body += d; });
      req.on('end', () => handler(req, res, body));
    });
    srv.listen(0, '127.0.0.1', () => {
      engineServers.push(srv);
      resolve({ port: srv.address().port });
    });
  });
}
function writeJson(res, status, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(s);
}
function writeSse(res, text) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\n');
  res.end('data: [DONE]\n\n');
}
async function collectStream(gen) {
  let out = '';
  for await (const ch of gen) if (typeof ch === 'string') out += ch;
  return out;
}
const CHAT_MSGS = [{ role: 'user', content: '你好' }];

// ── presets 完整性 ──
check('presets：每个服务商必填字段齐全', () => {
  for (const [id, p] of Object.entries(PRESETS)) {
    assert.ok(p.label, `${id} 缺 label`);
    if (p.local) continue; // builtin/lmstudio/ollama 无需 check/known
    assert.ok(p.base_url && /^https?:\/\//.test(p.base_url), `${id} base_url 非法`);
    assert.ok(p.check, `${id} 缺 check`);
    assert.ok(Array.isArray(p.known) && p.known.length >= 1, `${id} known 为空`);
    assert.ok(p.known.includes(p.check), `${id} check 未收录进 known`);
  }
});
check('presets：现役模型已更新（DeepSeek / Moonshot）', () => {
  assert.equal(PRESETS.deepseek.check, 'deepseek-flash');
  assert.deepEqual(PRESETS.deepseek.known, ['deepseek-flash', 'deepseek-v4-pro']);
  assert.equal(PRESETS.moonshot.check, 'kimi-k2.6');
  assert.deepEqual(PRESETS.moonshot.known, ['kimi-k2.6', 'kimi-k2.7-code']);
});

// ── setConfig → getConfig 临时目录往返一致 ──
check('引擎配置：setConfig→getConfig 在临时目录往返一致', () => {
  engine.setConfig({ provider: 'deepseek', base_url: 'http://127.0.0.1:9/v1', api_key: '', model: 'deepseek-flash' });
  const g = engine.getConfig();
  assert.equal(g.provider, 'deepseek');
  assert.equal(g.base_url, 'http://127.0.0.1:9/v1');
  assert.equal(g.model, 'deepseek-flash');
  assert.ok(g.presets && g.presets.deepseek, 'getConfig 带出 presets');
});

// ── 错误分类：400 invalid-temperature 必须透出真实参数原因，不被误判为模型不存在 ──
check('错误分类：400 invalid-temperature 透出真实原因（不判为模型不存在）', () => (async () => {
  const { port } = await startMock((req, res) => {
    writeJson(res, 400, { error: { message: 'invalid temperature: only 1 is allowed for this model' } });
  });
  engine.setConfig({ provider: 'deepseek', base_url: 'http://127.0.0.1:' + port + '/v1', api_key: '', model: 'kimi-k2.6' });
  const out = await collectStream(engine.chatStream(CHAT_MSGS, 0.6, false));
  assert.ok(out.includes('invalid temperature'), '应透出服务商真实原因，实际：' + out);
  assert.ok(!out.includes('不存在'), '400 参数错误不得报“模型不存在”，实际：' + out);
})());

// ── 错误分类：404 model not found → 模型不存在 ──
check('错误分类：404 model-not-founded → 提示模型不存在', () => (async () => {
  const { port } = await startMock((req, res) => {
    writeJson(res, 404, { error: { message: 'The model `nope-x` does not exist' } });
  });
  engine.setConfig({ provider: 'deepseek', base_url: 'http://127.0.0.1:' + port + '/v1', api_key: '', model: 'nope-x' });
  const out = await collectStream(engine.chatStream(CHAT_MSGS, 0.6, false));
  assert.ok(out.includes('不存在'), '404 应提示模型不存在，实际：' + out);
})());

// ── 温度重试：首次 temperature≠1 返回该 400，temperature=1 返回成功流 → 自动重试并产出内容 ──
check('温度重试：非1温度遇 400 自动以 temperature=1 重试并产出内容', () => (async () => {
  let hitTemp = null;
  const { port } = await startMock((req, res, body) => {
    const b = JSON.parse(body);
    hitTemp = b.temperature;
    if (Number(b.temperature) === 1) return writeSse(res, '你好，我是Kimi，已就绪');
    writeJson(res, 400, { error: { message: 'invalid temperature: only 1 is allowed for this model' } });
  });
  engine.setConfig({ provider: 'deepseek', base_url: 'http://127.0.0.1:' + port + '/v1', api_key: '', model: 'kimi-k2.6' });
  const out = await collectStream(engine.chatStream(CHAT_MSGS, 0.6, false));
  assert.ok(out.includes('已就绪'), '自动重试后应产出正常内容，实际：' + out);
  assert.equal(hitTemp, 1, '第二次请求应以 temperature=1 发出，实际收到 ' + hitTemp);
})());

// ── 引擎路由：builtin/cloud/local 三类 modelStatus 的 engine_kind / engine_label ──
check('引擎路由：cloud 类 engine_kind=cloud、engine_label=服务商名、cloud_ok=true', () => (async () => {
  engine.setConfig({ provider: 'deepseek', base_url: 'https://x/v1', api_key: 'k', model: 'deepseek-flash' });
  const st = await engine.modelStatus();
  assert.equal(st.engine_kind, 'cloud');
  assert.equal(st.engine_label, 'DeepSeek');
  assert.equal(st.cloud_ok, true);
  assert.equal(st.model_available, true);
})());
check('引擎路由：local(ollama) 类 engine_kind=local、engine_label=Ollama', () => (async () => {
  engine.setConfig({ provider: 'ollama', base_url: 'http://127.0.0.1:11434', api_key: '', model: 'qwen' });
  const st = await engine.modelStatus();
  assert.equal(st.engine_kind, 'local');
  assert.equal(st.engine_label, 'Ollama 本地模型');
  assert.equal(st.cloud_ok, false);
})());
check('引擎路由：builtin 类 engine_kind=builtin、engine_label=内置模型', () => (async () => {
  engine.setConfig({ provider: 'builtin', base_url: '', api_key: '', model: '' });
  const st = await engine.modelStatus();
  assert.equal(st.engine_kind, 'builtin');
  assert.equal(st.engine_label, '内置模型');
})());

// ── 语音：组件可加载、available/status 行为、空样本应抛错 ──
check('语音：sherpa-onnx-node/non-streaming-asr.js 可加载', () => {
  let mod = null;
  try { mod = require('sherpa-onnx-node/non-streaming-asr.js'); }
  catch (e) { console.log('SKIP 语音原生运行库未安装，安装项目依赖后此项自动校验'); return; }
  assert.ok(mod && mod.OfflineRecognizer, '应导出 OfflineRecognizer');
});
check('语音：未内置/未下载时 available=false', () => {
  const vTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ewb-voice-'));
  voice.init({ modelsDir: path.join(vTmp, 'models'), userDataDir: path.join(vTmp, 'userdata') });
  const st = voice.status();
  assert.equal(st.available, false);
  assert.equal(voice.available(), false);
});
check('语音：放置模型文件后 available=true / bundled=true', () => {
  const vTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ewb-voice-'));
  const sttDir = path.join(vTmp, 'models', 'stt');
  fs.mkdirSync(sttDir, { recursive: true });
  fs.writeFileSync(path.join(sttDir, 'model.int8.onnx'), 'x');
  fs.writeFileSync(path.join(sttDir, 'tokens.txt'), 'x');
  voice.init({ modelsDir: path.join(vTmp, 'models'), userDataDir: path.join(vTmp, 'userdata') });
  const st = voice.status();
  assert.equal(st.available, true);
  assert.equal(st.bundled, true);
});
check('语音：transcribe 空样本应抛错', () => (async () => {
  await assert.rejects(voice.transcribe(new Float32Array(0)), /未检测到语音内容/);
})());

process.on('beforeExit', () => { engineServers.forEach((s) => { try { s.close(); } catch {} }); });

// ── 可选本地模型管理器（离线，不下载大文件）──
const modelmanager = require('../src/main/modelmanager');
const lmTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ymlm-'));
modelmanager.init({ modelsDir: lmTmp, refDataDir: path.join(__dirname, '..', 'data') });
const lmCat = modelmanager.loadCatalog().models;

function sparseFile(dir, name, size) {
  const p = path.join(dir, name);
  const fd = fs.openSync(p, 'w');
  fs.ftruncateSync(fd, size);
  fs.closeSync(fd);
  return p;
}

check('本地模型目录：共 6 个、每档 2 个', () => {
  assert.equal(lmCat.length, 6);
  for (const tier of ['low', 'mid', 'high'])
    assert.equal(lmCat.filter((m) => m.tier === tier).length, 2);
});
check('本地模型目录：文件字段与体积口径完整', () => {
  for (const e of lmCat) {
    assert.ok(e.files.length >= 1);
    assert.ok(e.files.some((f) => f.name === e.select_file));
    let sum = 0;
    for (const f of e.files) {
      assert.ok(/^https:\/\//.test(f.url));
      assert.ok(f.size > 0);
      sum += f.size;
    }
    assert.equal(sum, e.total_size);
    assert.ok(e.label.zh && e.label.en && e.desc.zh && e.desc.en);
  }
});
check('推荐档位：按显存与内存正确分档', () => {
  assert.equal(modelmanager.recommendTier({ vram_total: 12288 }, 16 * 1024 ** 3), 'high');
  assert.equal(modelmanager.recommendTier({ vram_total: 6144 }, 16 * 1024 ** 3), 'mid');
  assert.equal(modelmanager.recommendTier({ vram_total: 2048 }, 8 * 1024 ** 3), 'low');
  assert.equal(modelmanager.recommendTier({ vram_total: 0 }, 32 * 1024 ** 3), 'high');
  assert.equal(modelmanager.recommendTier({ vram_total: 0 }, 8 * 1024 ** 3), 'low');
});
check('本地模型：按文件体积判定是否就绪', () => {
  const e = lmCat.find((m) => m.id === 'qwen25-1b5-q4km');
  assert.equal(modelmanager.entryPresent(e), false);
  sparseFile(lmTmp, e.files[0].name, e.files[0].size);
  assert.equal(modelmanager.entryPresent(e), true);
});
check('本地模型：可删除非内置模型且内置模型不可删', () => {
  const e = lmCat.find((m) => m.id === 'qwen25-3b-q4km');
  e.files.forEach((f) => sparseFile(lmTmp, f.name, f.size));
  assert.equal(modelmanager.entryPresent(e), true);
  modelmanager.remove(e.id);
  assert.equal(modelmanager.entryPresent(e), false);
  assert.throws(() => modelmanager.remove('qwen25-1b5-q4km'), /默认内置模型/);
});
check('本地模型：扫描已就绪模型并识别外来与分片文件', () => {
  sparseFile(lmTmp, 'my-own-model.gguf', 500);
  sparseFile(lmTmp, 'split-00002-of-00002.gguf', 500);
  const found = modelmanager.scanDownloaded();
  assert.ok(found.some((m) => m.id === 'qwen25-1b5-q4km'));
  assert.ok(found.some((m) => m.id === 'custom:my-own-model.gguf'));
  assert.ok(!found.some((m) => m.id === 'custom:split-00002-of-00002.gguf'));
});

(async () => {
  await Promise.all(pending);
  try { fs.rmSync(lmTmp, { recursive: true, force: true }); } catch {}
  console.log(failures === 0 ? '\n全部测试通过' : `\n${failures} 项失败`);
  process.exit(failures === 0 ? 0 : 1);
})();