// 经营工作台深化模块：真实单据动作、库存流水、资金损益、客户与预警 · 灵感引擎工坊 · bin1732
(function () {
  'use strict';

  var ALL_PLATFORMS = ['taobao', 'tmall', 'jd', 'pdd', 'douyin', 'kuaishou', 'xiaohongshu',
    'amazon', 'shopee', 'tiktokshop', 'shopify', 'ebay', 'aliexpress', 'lazada'];
  function pl(id) { return (typeof window.platformLabel === 'function') ? window.platformLabel(id) : (id == null ? '' : String(id)); }

  var I18N = {
    zh: {
      order_no: '订单号', platform: '平台', product: '商品', qty: '数量', amount: '金额', buyer: '买家',
      status: '状态', actions: '操作', all: '全部', pre: '待处理', shipped: '已发货', completed: '已完成', cancelled: '已取消',
      confirm: '审核', ship: '发货', complete: '完成', cancel: '取消', del: '删除', reject: '拒绝', process: '处理',
      pending: '待处理', paid: '已付款', confirmed: '已审核',
      empty_orders: '还没有订单，可点击右上角“新增订单”，或先载入示例数据熟悉流程。',
      shipping_company: '快递公司', shipping_no: '物流单号', warehouse: '仓库',
      as_type: '处理方式', refund_only: '仅退款', return_refund: '退货退款', reship: '补发', exchange: '换货',
      reason: '原因', as_resolved: '已解决', as_rejected: '已拒绝', open: '处理中',
      item_condition: '退回商品状况', cond_good: '可二次销售（良品）', cond_defective: '残次/不可售（残次品）',
      refund_pending: '待退款', refund_issued: '已退款', register_refund: '登记退款', refund_amount: '实际退款金额',
      empty_after: '还没有售后记录。发生退款、退货、补发或换货时在此登记并处理。',
      sku: 'SKU', safety: '安全库存', stock_qty: '库存数量', stockout: '缺货', low: '偏低', normal: '正常',
      transfer: '调拨', adjust: '盘点/期初', verify: '核对库存', new_transfer: '新增调拨', stock_adjust: '期初/盘点',
      ledger: '库存流水台账', transfers: '调拨单', from_wh: '调出仓', to_wh: '调入仓',
      po_no: '采购单号', supplier: '供应商', unit_cost: '单价', total: '总额', place_order: '下单', receive: '收货',
      draft: '草稿', ordered: '已下单', partially_received: '部分入库', received: '已入库',
      receive_qty: '本次收货数量', empty_purchase: '还没有采购单。向供应商下单后在此跟踪，收货后库存会自动增加。',
      in_transit: '在途', in_transit_amt: '在途金额', month_purchase: '本月采购额',
      listings: '店铺商品', shop: '店铺', platform_sku: '平台商品编码', platform_pid: '平台商品编号',
      title: '商品标题', price: '售价', listing_status: '状态', empty_listing: '把内部商品关联到各平台的在售链接后，订单才能自动匹配商品、库存才能统一扣减。',
      new_listing: '关联店铺商品', warehouses: '仓库', code: '编号', address: '地址', set_default: '设为默认',
      empty_wh: '还没有仓库。系统已为你准备“默认仓”，也可以按实际增加多个仓库。', new_wh: '新增仓库',
      edit: '编辑', edit_wh: '编辑仓库',
      customers: '客户', customer_count: '客户数', repeat_count: '复购客户', avg_ltv: '平均客户价值', avg_aov: '平均客单价',
      orders_count: '订单数', spend: '累计消费', aov: '客单价', ltv: '客户价值', recency: '最近购买(天)', segment: '客户分层', first: '首购', last: '最近',
      cohort: '客户留存（按首购月份）', month_index: '第N月',
      finance: '经营损益', revenue: '营业收入', cogs: '商品成本', fees: '平台费用', ad: '广告费用', refund: '退款', net: '净利润', net_pct: '净利率',
      group_by: '汇总方式', g_platform: '按平台', g_product: '按商品', g_month: '按月份',
      expenses: '费用台账', new_expense: '登记费用', category: '类别', occurred: '日期', note: '备注',
      cat_advertising: '广告推广', cat_shipping: '物流运费', cat_storage: '仓储费', cat_software: '软件服务', cat_service: '服务费', cat_other: '其他',
      reconcile: '平台结算对账', run_reconcile: '开始对账', reconcile_help: '每行一条，格式：订单号,实际到账金额。可从平台结算单复制。',
      matched: '已对上', diff: '有差异', missing_local: '本地无此单', missing_settlement: '结算单缺少',
      fee_table: '平台费率参考（可按你的类目修改，以平台结算单为准）', save: '保存', reset_fee: '恢复默认',
      alerts: '预警中心', run_monitors: '立即巡检', mark_read: '标为已读', dismiss: '忽略', critical: '紧急', warning: '提醒', info: '提示',
      empty_alerts: '暂无未处理预警。点击“立即巡检”可检查缺货、发货超时、退款偏高与滞销等情况。',
      no_data: '暂无数据', datetime: '时间', example_hint: '示例', official: '官方页面',
      movement: '变动类型', direction: '方向', in: '入库', out: '出库', balance: '结存', ref: '关联单据',
    },
    en: {
      order_no: 'Order', platform: 'Platform', product: 'Product', qty: 'Qty', amount: 'Amount', buyer: 'Buyer',
      status: 'Status', actions: 'Actions', all: 'All', pre: 'Open', shipped: 'Shipped', completed: 'Completed', cancelled: 'Cancelled',
      confirm: 'Confirm', ship: 'Ship', complete: 'Complete', cancel: 'Cancel', del: 'Delete', reject: 'Reject', process: 'Process',
      pending: 'Pending', paid: 'Paid', confirmed: 'Confirmed',
      empty_orders: 'No orders yet. Use “New order”, or load sample data to explore.',
      shipping_company: 'Carrier', shipping_no: 'Tracking no.', warehouse: 'Warehouse',
      as_type: 'Resolution', refund_only: 'Refund only', return_refund: 'Return & refund', reship: 'Replacement', exchange: 'Exchange',
      reason: 'Reason', as_resolved: 'Resolved', as_rejected: 'Rejected', open: 'Open',
      item_condition: 'Condition of returned item', cond_good: 'Resellable (good)', cond_defective: 'Defective / not sellable',
      refund_pending: 'Refund pending', refund_issued: 'Refunded', register_refund: 'Record refund', refund_amount: 'Actual refund amount',
      empty_after: 'No after-sales records yet. Register refunds, returns, replacements or exchanges here.',
      sku: 'SKU', safety: 'Safety stock', stock_qty: 'On hand', stockout: 'Out of stock', low: 'Low', normal: 'OK',
      transfer: 'Transfer', adjust: 'Adjust/Opening', verify: 'Verify stock', new_transfer: 'New transfer', stock_adjust: 'Adjust/Opening',
      ledger: 'Stock ledger', transfers: 'Stock transfers', from_wh: 'From', to_wh: 'To',
      po_no: 'PO no.', supplier: 'Supplier', unit_cost: 'Unit cost', total: 'Total', place_order: 'Place', receive: 'Receive',
      draft: 'Draft', ordered: 'Ordered', partially_received: 'Partially received', received: 'Received',
      receive_qty: 'Qty to receive', empty_purchase: 'No purchase orders yet. Track supplier orders here; stock updates on receipt.',
      in_transit: 'In transit', in_transit_amt: 'In-transit value', month_purchase: 'Purchases this month',
      listings: 'Listings', shop: 'Shop', platform_sku: 'Platform SKU', platform_pid: 'Platform item ID',
      title: 'Title', price: 'Price', listing_status: 'Status', empty_listing: 'Link your internal products to listings on each platform so orders match and stock is deducted correctly.',
      new_listing: 'Link listing', warehouses: 'Warehouses', code: 'Code', address: 'Address', set_default: 'Set default',
      empty_wh: 'No warehouses yet. A default warehouse is ready; you can add more as needed.', new_wh: 'New warehouse',
      edit: 'Edit', edit_wh: 'Edit warehouse',
      customers: 'Customers', customer_count: 'Customers', repeat_count: 'Repeat buyers', avg_ltv: 'Avg LTV', avg_aov: 'Avg order value',
      orders_count: 'Orders', spend: 'Total spend', aov: 'AOV', ltv: 'LTV', recency: 'Last purchase (days)', segment: 'Segment', first: 'First', last: 'Last',
      cohort: 'Retention (by first-purchase month)', month_index: 'Month N',
      finance: 'Profit & Loss', revenue: 'Revenue', cogs: 'COGS', fees: 'Platform fees', ad: 'Advertising', refund: 'Refunds', net: 'Net profit', net_pct: 'Net margin',
      group_by: 'Group by', g_platform: 'Platform', g_product: 'Product', g_month: 'Month',
      expenses: 'Expenses', new_expense: 'Add expense', category: 'Category', occurred: 'Date', note: 'Note',
      cat_advertising: 'Advertising', cat_shipping: 'Shipping', cat_storage: 'Storage', cat_software: 'Software', cat_service: 'Service', cat_other: 'Other',
      reconcile: 'Settlement reconciliation', run_reconcile: 'Reconcile', reconcile_help: 'One line per order: order number, amount received. Copy from your settlement report.',
      matched: 'Matched', diff: 'Difference', missing_local: 'Missing locally', missing_settlement: 'Missing in settlement',
      fee_table: 'Platform fee reference (editable; the settlement report prevails)', save: 'Save', reset_fee: 'Reset',
      alerts: 'Alerts', run_monitors: 'Run checks', mark_read: 'Mark read', dismiss: 'Dismiss', critical: 'Critical', warning: 'Warning', info: 'Info',
      empty_alerts: 'No open alerts. Run checks for stockouts, late shipments, high refunds and slow-moving items.',
      no_data: 'No data', datetime: 'Time', example_hint: 'Example', official: 'Official',
      movement: 'Movement', direction: 'Direction', in: 'In', out: 'Out', balance: 'Balance', ref: 'Reference',
    },
  };

  var lang = document.documentElement.lang === 'en' ? 'en' : 'zh';
  function t(k) { return (I18N[lang][k] || k); }
  function money(v, cur) {
    var sym = cur === 'USD' ? '$' : (cur ? cur + ' ' : '¥');
    return sym + (Number(v) || 0).toFixed(2);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function api(url, opts) {
    return fetch(url, opts).then(function (r) {
      if (!r.ok) { return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.detail || ('HTTP ' + r.status)); }); }
      return r.json();
    });
  }
  function post(url, body) { return api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); }
  function put(url, body) { return api(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); }
  function del(url) { return api(url, { method: 'DELETE' }); }

  function emptyState(icon, text, btn) {
    return '<div class="empty-state"><div class="empty-state-icon">' + icon + '</div><div>' + esc(text) + '</div>' +
      (btn ? '<div style="margin-top:12px;">' + btn + '</div>' : '') + '</div>';
  }
  function statusBadge(label, cls) { return '<span class="badge ' + cls + '">' + esc(label) + '</span>'; }
  function orderStatusBadge(s) {
    var map = {
      pending: ['badge-warning', t('pending')], paid: ['badge-warning', t('paid')], confirmed: ['badge-accent', t('confirmed')],
      shipped: ['badge-accent', t('shipped')], completed: ['badge-success', t('completed')], cancelled: ['badge-danger', t('cancelled')],
    };
    var m = map[s] || ['badge-accent', s];
    return statusBadge(m[1], m[0]);
  }
  function chart(el, option) {
    if (!window.echarts || !el || el.clientWidth === 0) return null;
    var inst = echarts.getInstanceByDom(el) || echarts.init(el);
    inst.setOption(option, true);
    return inst;
  }
  // 在 tkHost 之前插入“我的附加区”，避免与既有组件冲突
  function ensureExtra(page) {
    var ex = document.getElementById('wbExtra-' + page);
    if (ex) return ex;
    ex = document.createElement('div');
    ex.id = 'wbExtra-' + page;
    var host = document.getElementById('tkHost-' + page);
    if (host && host.parentNode) host.parentNode.insertBefore(ex, host);
    else {
      var pg = document.getElementById('page-' + page);
      if (pg) pg.appendChild(ex);
    }
    return ex;
  }
  async function warehouseOptions() {
    var ws = await api('/api/dom/warehouses');
    return ws.map(function (w) { return { value: w.name, label: w.name }; });
  }
  async function productOptions() {
    var ps = await api('/api/products');
    return ps.map(function (p) { return { value: p.sku, label: p.sku + ' · ' + p.name }; });
  }

  // ============ 订单 ============
  var orderFilter = 'all';
  async function renderOrders() {
    var body = document.getElementById('ordersBody');
    if (!body) return;
    var list = await api('/api/orders');
    var groups = { all: list, pre: list.filter(function (o) { return ['pending', 'paid', 'confirmed'].indexOf(o.status) >= 0; }),
      shipped: list.filter(function (o) { return o.status === 'shipped'; }), completed: list.filter(function (o) { return o.status === 'completed'; }),
      cancelled: list.filter(function (o) { return o.status === 'cancelled'; }) };
    var shown = groups[orderFilter] || list;
    if (!list.length) { body.innerHTML = '<tr><td colspan="8" style="padding:24px;">' + emptyState('🧾', t('empty_orders')) + '</td></tr>'; }
    else if (!shown.length) { body.innerHTML = '<tr><td colspan="8" style="padding:20px;color:var(--text-tertiary);text-align:center;">' + t('no_data') + '</td></tr>'; }
    else {
      body.innerHTML = shown.map(function (o) {
        var acts = '';
        if (['pending', 'paid'].indexOf(o.status) >= 0) acts += btn('wb.confirmOrder(' + o.id + ')', t('confirm'), 'ghost');
        if (['pending', 'paid', 'confirmed'].indexOf(o.status) >= 0) acts += btn('wb.openShip(' + o.id + ')', t('ship'), 'primary') + btn('wb.cancelOrder(' + o.id + ')', t('cancel'), 'ghost');
        if (o.status === 'shipped') acts += btn('wb.completeOrder(' + o.id + ')', t('complete'), 'ghost');
        acts += btn('wb.deleteOrder(' + o.id + ')', t('del'), 'ghost');
        return '<tr><td>' + esc(o.order_no) + '</td><td>' + pl(o.platform) + '</td><td>' + esc(o.product_name) + '</td><td>' + o.qty +
          '</td><td class="num">' + money(o.total_amount) + '</td><td>' + esc(o.buyer || '-') + '</td><td>' + orderStatusBadge(o.status) + '</td><td><div class="row-actions">' + acts + '</div></td></tr>';
      }).join('');
    }
    renderOrderTabs(groups);
  }
  function renderOrderTabs(groups) {
    var ex = ensureExtra('orders');
    var tabs = [['all', t('all'), groups.all.length], ['pre', t('pre'), groups.pre.length], ['shipped', t('shipped'), groups.shipped.length],
    ['completed', t('completed'), groups.completed.length], ['cancelled', t('cancelled'), groups.cancelled.length]];
    ex.innerHTML = '<div class="filter-tabs">' + tabs.map(function (x) {
      return '<button class="filter-tab ' + (orderFilter === x[0] ? 'active' : '') + '" onclick="wb.setOrderFilter(\'' + x[0] + '\')">' + x[1] + ' <span class="tab-count">' + x[2] + '</span></button>';
    }).join('') + '</div>';
  }
  function btn(onclick, label, cls) {
    return '<button class="btn btn-' + (cls || 'ghost') + ' btn-xs" onclick="' + onclick + '">' + esc(label) + '</button>';
  }
  function setOrderFilter(f) { orderFilter = f; renderOrders(); }

  async function confirmOrder(id) { await post('/api/dom/orders/' + id + '/confirm'); toast(t('confirm')); renderOrders(); renderShipping(); }
  function openShip(id) {
    warehouseOptions().then(function (wopts) {
      openFormModal({
        title: t('ship'), submitText: t('ship'),
        fields: [
          { key: 'warehouse', label: t('warehouse'), type: 'select', options: wopts },
          { key: 'shipping_company', label: t('shipping_company'), placeholder: '顺丰 / 中通 / SF' },
          { key: 'shipping_no', label: t('shipping_no'), required: true, placeholder: 'SF1234567' },
        ],
        onSubmit: function (v) { return post('/api/dom/orders/' + id + '/ship', v).then(function () { toast(t('ship')); renderOrders(); renderShipping(); }); },
      });
    });
  }
  function completeOrder(id) { post('/api/dom/orders/' + id + '/complete').then(function () { toast(t('complete')); renderOrders(); }); }
  function cancelOrder(id) {
    openConfirmModal({
      title: t('cancel'), message: lang === 'en' ? 'Cancel this order?' : '确认取消该订单吗？发货前取消不影响库存。',
      confirmText: t('cancel'), danger: true,
      onConfirm: function () { return post('/api/dom/orders/' + id + '/cancel').then(function () { renderOrders(); renderShipping(); }); },
    });
  }
  function deleteOrder(id) {
    openConfirmModal({
      title: t('del'), message: lang === 'en' ? 'Delete this order?' : '确认删除该订单吗？此操作不可撤销。',
      confirmText: t('del'), danger: true,
      onConfirm: function () { return del('/api/orders/' + id).then(function () { renderOrders(); renderShipping(); }); },
    });
  }

  // ============ 发货 ============
  async function renderShipping() {
    var body = document.getElementById('shippingBody');
    if (!body) return;
    var list = await api('/api/orders');
    list = list.filter(function (o) { return ['pending', 'paid', 'confirmed'].indexOf(o.status) >= 0; });
    if (!list.length) { body.innerHTML = '<tr><td colspan="7" style="padding:24px;">' + emptyState('📮', lang === 'en' ? 'Nothing to ship.' : '暂无待发货订单。') + '</td></tr>'; return; }
    body.innerHTML = list.map(function (o) {
      return '<tr><td>' + esc(o.order_no) + '</td><td>' + pl(o.platform) + '</td><td>' + esc(o.product_name) + '</td><td>' + esc(o.buyer || '-') +
        '</td><td>' + statusBadge(lang === 'en' ? 'To ship' : '待发货', 'badge-warning') + '</td><td>' + esc(o.shipping_no || '-') +
        '</td><td>' + btn('wb.openShip(' + o.id + ')', t('ship'), 'primary') + '</td></tr>';
    }).join('');
  }

  // ============ 售后 ============
  async function renderAftersales() {
    var body = document.getElementById('aftersalesBody');
    if (!body) return;
    var list = await api('/api/aftersales');
    if (!list.length) { body.innerHTML = '<tr><td colspan="7" style="padding:24px;">' + emptyState('↩️', t('empty_after')) + '</td></tr>'; }
    else {
      var resMap = { refund_only: t('refund_only'), return_refund: t('return_refund'), reship: t('reship'), exchange: t('exchange') };
      var stMap = { open: ['badge-warning', t('open')], resolved: ['badge-success', t('as_resolved')], rejected: ['badge-danger', t('as_rejected')], closed: ['badge-success', t('as_resolved')] };
      body.innerHTML = list.map(function (a) {
        var sm = stMap[a.status] || ['badge-accent', a.status];
        var typeLabel = resMap[a.resolution] || (a.type === 'refund' ? t('refund_only') : a.type);
        var acts = '';
        if (a.status === 'open') {
          acts += btn('wb.openAftersale(' + a.id + ')', t('process'), 'primary') + btn('wb.rejectAftersale(' + a.id + ')', t('reject'), 'ghost');
        }
        if (a.status === 'resolved' && a.refund_status === 'pending') {
          acts += btn('wb.openRefund(' + a.id + ')', t('register_refund'), 'primary');
        }
        acts += btn('wb.deleteAftersale(' + a.id + ')', t('del'), 'ghost');
        var refundBadge = '';
        if (a.status === 'resolved' && a.refund_status === 'pending') refundBadge = statusBadge(t('refund_pending'), 'badge-warning');
        else if (a.status === 'resolved' && a.refund_status === 'issued') refundBadge = statusBadge(t('refund_issued'), 'badge-success');
        var defectMark = a.item_condition === 'defective' ? '<span class="badge badge-danger">' + t('cond_defective') + '</span>' : '';
        return '<tr><td>' + esc(a.order_no) + '</td><td>' + pl(a.platform) + '</td><td>' + esc(typeLabel) + '</td><td>' + esc(a.reason || '-') +
          '</td><td class="num">' + money(a.amount) + '</td><td>' + statusBadge(sm[1], sm[0]) + refundBadge + defectMark + '</td><td><div class="row-actions">' + acts + '</div></td></tr>';
      }).join('');
    }
    var ex = ensureExtra('aftersales');
    ex.innerHTML = guideCard(lang === 'en'
      ? 'Tip: Refund only keeps the goods; return & refund brings goods back; replacement sends a new unit; exchange takes the old unit back and sends a new one.'
      : '说明：仅退款不涉及商品回库；退货退款会把商品收回；补发会再发出一件；换货会先收回旧商品、再发出新商品。');
  }
  function openAftersale(id) {
    Promise.all([warehouseOptions()]).then(function (r) {
      var wopts = r[0];
      openFormModal({
        title: t('process'), submitText: t('process'),
        fields: [
          { key: 'resolution', label: t('as_type'), type: 'select', options: [
            { value: 'refund_only', label: t('refund_only') }, { value: 'return_refund', label: t('return_refund') },
            { value: 'reship', label: t('reship') }, { value: 'exchange', label: t('exchange') }] },
          { key: 'warehouse', label: t('warehouse'), type: 'select', options: wopts },
          { key: 'item_condition', label: t('item_condition'), type: 'select', options: [
            { value: 'good', label: t('cond_good') }, { value: 'defective', label: t('cond_defective') }] },
        ],
        onSubmit: function (v) { return post('/api/dom/aftersales/' + id + '/process', v).then(function () { toast(t('process')); renderAftersales(); renderInventory(); }); },
      });
    });
  }
  function rejectAftersale(id) { post('/api/dom/aftersales/' + id + '/process', { action: 'reject' }).then(function () { renderAftersales(); }); }
  function openRefund(id) {
    var a;
    api('/api/aftersales').then(function (list) {
      a = list.find(function (x) { return x.id === id; });
      openFormModal({
        title: t('register_refund'), submitText: t('register_refund'),
        fields: [
          { key: 'amount', label: t('refund_amount'), type: 'number', required: true, value: a ? a.amount : '' },
        ],
        onSubmit: function (v) { return post('/api/dom/aftersales/' + id + '/refund', { amount: Number(v.amount) }).then(function () { toast(t('register_refund')); renderAftersales(); renderFinance(); }); },
      });
    });
  }
  function deleteAftersale(id) {
    openConfirmModal({ title: t('del'), message: lang === 'en' ? 'Delete this record?' : '确认删除该售后记录吗？', confirmText: t('del'), danger: true,
      onConfirm: function () { return del('/api/aftersales/' + id).then(renderAftersales); } });
  }

  // ============ 库存 ============
  var invTab = 'balance';
  async function renderInventory() {
    var body = document.getElementById('inventoryBody');
    if (!body) return;
    var data = await api('/api/dom/stock');
    var rows = data.rows;
    if (!rows.length) { body.innerHTML = '<tr><td colspan="7" style="padding:24px;">' + emptyState('🗃️', lang === 'en' ? 'No stock yet. Receive a purchase or add opening stock.' : '还没有库存。可通过采购收货入库，或登记期初库存。') + '</td></tr>'; }
    else {
      body.innerHTML = rows.map(function (r) {
        var badge = r.status === 'stockout' ? statusBadge(t('stockout'), 'badge-danger')
          : r.status === 'low' ? statusBadge(t('low'), 'badge-warning') : statusBadge(t('normal'), 'badge-success');
        return '<tr><td>' + esc(r.product_name) + '</td><td>' + esc(r.sku) + '</td><td>' + esc(r.warehouse) +
          '</td><td class="num">' + r.qty + '</td><td class="num">' + r.safety_stock + '</td><td>' + badge +
          '</td><td><div class="row-actions">' + btn('wb.openTransfer(' + r.sku + ')', t('transfer'), 'ghost') + btn('wb.openAdjust(\'' + r.sku + '\',\'' + r.warehouse + '\')', t('adjust'), 'ghost') + '</div></td></tr>';
      }).join('');
    }
    renderInventoryExtra();
  }
  async function renderInventoryExtra() {
    var ex = ensureExtra('inventory');
    var verify = await api('/api/dom/stock/verify');
    var vMsg = verify.ok ? (lang === 'en' ? 'Balances match the ledger.' : '结存与流水一致。')
      : (lang === 'en' ? verify.diffs.length + ' mismatches found.' : '发现 ' + verify.diffs.length + ' 处不一致。');
    ex.innerHTML =
      '<div class="card"><div class="card-tools">' +
      '<button class="btn btn-primary btn-sm" onclick="wb.openAdjust()">' + t('stock_adjust') + '</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="wb.openTransfer()">' + t('new_transfer') + '</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="wb.doVerify()">' + t('verify') + '</button>' +
      '<span class="verify-msg ' + (verify.ok ? 'ok' : 'bad') + '" id="invVerifyMsg">' + esc(vMsg) + '</span></div></div>' +
      '<div class="filter-tabs">' +
      tabBtn('balance', t('stock_qty')) + tabBtn('ledger', t('ledger')) + tabBtn('transfers', t('transfers')) + '</div>' +
      '<div id="invTabBody"></div>';
    renderInvTab();
  }
  function tabBtn(key, label) { return '<button class="filter-tab ' + (invTab === key ? 'active' : '') + '" onclick="wb.setInvTab(\'' + key + '\')">' + label + '</button>'; }
  function setInvTab(k) { invTab = k; document.querySelectorAll('#wbExtra-inventory .filter-tab').forEach(function (b, i) {
    var keys = ['balance', 'ledger', 'transfers']; b.classList.toggle('active', keys[i] === k);
  }); renderInvTab(); }
  async function renderInvTab() {
    var host = document.getElementById('invTabBody');
    if (!host) return;
    if (invTab === 'balance') { host.innerHTML = ''; return; }
    if (invTab === 'ledger') {
      var list = await api('/api/dom/ledger');
      if (!list.length) { host.innerHTML = emptyState('🧾', t('no_data')); return; }
      host.innerHTML = '<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>' + t('datetime') +
        '</th><th>' + t('sku') + '</th><th>' + t('warehouse') + '</th><th>' + t('movement') + '</th><th>' + t('direction') +
        '</th><th>' + t('qty') + '</th><th>' + t('balance') + '</th><th>' + t('ref') + '</th><th>' + t('reason') + '</th></tr></thead><tbody>' +
        list.map(function (e) {
          return '<tr><td>' + esc(e.created_at) + '</td><td>' + esc(e.sku) + '</td><td>' + esc(e.warehouse) + '</td><td>' + esc(e.movement_type) +
            '</td><td>' + (e.direction === 'in' ? '<span class="dir-in">' + t('in') + '</span>' : '<span class="dir-out">' + t('out') + '</span>') +
            '</td><td>' + e.qty + '</td><td>' + e.balance_before + ' → ' + e.balance_after + '</td><td>' + esc(e.ref_no || '-') + '</td><td>' + esc(e.reason || '-') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    } else {
      var trs = await api('/api/dom/transfers');
      if (!trs.length) { host.innerHTML = emptyState('🔁', lang === 'en' ? 'No transfers.' : '暂无调拨单。'); return; }
      var tmap = { draft: t('draft'), in_transit: t('in_transit'), done: t('completed') };
      host.innerHTML = '<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>' + t('ref') + '</th><th>' + t('sku') +
        '</th><th>' + t('from_wh') + '</th><th>' + t('to_wh') + '</th><th>' + t('qty') + '</th><th>' + t('status') + '</th><th>' + t('actions') + '</th></tr></thead><tbody>' +
        trs.map(function (x) {
          var acts = x.status === 'draft' ? btn('wb.shipTransfer(' + x.id + ')', lang === 'en' ? 'Send' : '发出', 'ghost')
            : x.status === 'in_transit' ? btn('wb.receiveTransfer(' + x.id + ')', t('receive'), 'primary') : '-';
          return '<tr><td>' + esc(x.transfer_no) + '</td><td>' + esc(x.sku) + '</td><td>' + esc(x.from_warehouse) + '</td><td>' + esc(x.to_warehouse) +
            '</td><td>' + x.qty + '</td><td>' + statusBadge(tmap[x.status], x.status === 'in_transit' ? 'badge-warning' : 'badge-accent') + '</td><td>' + acts + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }
  }
  function doVerify() { renderInventoryExtra(); }
  function openAdjust(sku, wh) {
    Promise.all([productOptions(), warehouseOptions()]).then(function (r) {
      openFormModal({
        title: t('stock_adjust'), submitText: t('save'),
        fields: [
          { key: 'sku', label: t('sku'), type: 'select', options: r[0], value: sku },
          { key: 'warehouse', label: t('warehouse'), type: 'select', options: r[1], value: wh },
          { key: 'qty', label: lang === 'en' ? 'Change (+/-)' : '变动数量（正为入库、负为出库）', type: 'number', value: 0 },
          { key: 'reason', label: t('reason'), placeholder: lang === 'en' ? 'Opening / stocktake' : '期初库存 / 盘点' },
        ],
        onSubmit: function (v) { return post('/api/dom/stock/adjust', v).then(function () { toast(t('save')); renderInventory(); }); },
      });
    });
  }
  function openTransfer(sku) {
    Promise.all([productOptions(), warehouseOptions()]).then(function (r) {
      var prods = r[0], wopts = r[1];
      openFormModal({
        title: t('new_transfer'), submitText: t('save'),
        fields: [
          { key: 'sku', label: t('sku'), type: 'select', options: prods, value: sku },
          { key: 'from_warehouse', label: t('from_wh'), type: 'select', options: wopts },
          { key: 'to_warehouse', label: t('to_wh'), type: 'select', options: wopts },
          { key: 'qty', label: t('qty'), type: 'number', value: 1 },
        ],
        onSubmit: function (v) { return post('/api/dom/transfers', v).then(function () { toast(t('save')); renderInventory(); }); },
      });
    });
  }
  function shipTransfer(id) { post('/api/dom/transfers/' + id + '/ship').then(function () { renderInventory(); }); }
  function receiveTransfer(id) { post('/api/dom/transfers/' + id + '/receive').then(function () { toast(t('receive')); renderInventory(); }); }

  // ============ 采购 ============
  async function renderPurchases() {
    var body = document.getElementById('purchasesBody');
    if (!body) return;
    var list = await api('/api/purchases');
    var smap = { draft: ['badge-warning', t('draft')], ordered: ['badge-accent', t('ordered')], partially_received: ['badge-warning', t('partially_received')], received: ['badge-success', t('received')], cancelled: ['badge-danger', t('cancelled')] };
    if (!list.length) { body.innerHTML = '<tr><td colspan="8" style="padding:24px;">' + emptyState('🛒', t('empty_purchase')) + '</td></tr>'; }
    else {
      body.innerHTML = list.map(function (p) {
        var sm = smap[p.status] || ['badge-accent', p.status];
        var acts = '';
        if (p.status === 'draft') acts += btn('wb.confirmPurchase(' + p.id + ')', t('place_order'), 'ghost');
        if (['ordered', 'partially_received'].indexOf(p.status) >= 0) acts += btn('wb.openReceive(' + p.id + ')', t('receive'), 'primary');
        acts += btn('wb.deletePurchase(' + p.id + ')', t('del'), 'ghost');
        var recv = p.received_qty != null ? ' (' + p.received_qty + '/' + p.qty + ')' : '';
        return '<tr><td>' + esc(p.po_no) + '</td><td>' + esc(p.supplier) + '</td><td>' + esc(p.product_name) + recv + '</td><td>' + p.qty +
          '</td><td class="num">' + money(p.unit_cost) + '</td><td class="num">' + money(p.total_cost) + '</td><td>' + statusBadge(sm[1], sm[0]) +
          '</td><td><div class="row-actions">' + acts + '</div></td></tr>';
      }).join('');
    }
    var inTransit = list.filter(function (p) { return ['ordered', 'partially_received'].indexOf(p.status) >= 0; });
    var transitAmt = inTransit.reduce(function (s, p) {
      var remain = p.qty - (p.received_qty || 0); return s + remain * (Number(p.unit_cost) || 0);
    }, 0);
    var ex = ensureExtra('purchases');
    ex.innerHTML = '<div class="grid grid-3">' +
      miniCard(t('in_transit'), inTransit.length) + miniCard(t('in_transit_amt'), money(transitAmt)) +
      miniCard(t('month_purchase'), money(purchaseMonth(list))) + '</div>';
  }
  function purchaseMonth(list) {
    var mk = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
    return list.filter(function (p) { return (p.created_at || '').slice(0, 7) === mk; })
      .reduce(function (s, p) { return s + (Number(p.total_cost) || 0); }, 0);
  }
  function miniCard(label, val) {
    return '<div class="stat-card"><div class="kpi-label">' + esc(label) + '</div><div class="kpi-value" style="font-size:22px;">' + val + '</div></div>';
  }
  function confirmPurchase(id) { post('/api/dom/purchases/' + id + '/confirm').then(function () { toast(t('place_order')); renderPurchases(); }); }
  function openReceive(id) {
    warehouseOptions().then(function (wopts) {
      openFormModal({
        title: t('receive'), submitText: t('receive'),
        fields: [
          { key: 'qty', label: t('receive_qty'), type: 'number' },
          { key: 'warehouse', label: t('warehouse'), type: 'select', options: wopts },
        ],
        onSubmit: function (v) { return post('/api/dom/purchases/' + id + '/receive', v).then(function () { toast(t('receive')); renderPurchases(); renderInventory(); }); },
      });
    });
  }
  function deletePurchase(id) {
    openConfirmModal({ title: t('del'), message: lang === 'en' ? 'Delete this purchase order?' : '确认删除该采购单吗？', confirmText: t('del'), danger: true,
      onConfirm: function () { return del('/api/purchases/' + id).then(renderPurchases); } });
  }

  // ============ 店铺商品 ============
  async function renderListings() {
    var host = document.getElementById('wbListings');
    if (!host) return;
    var list = await api('/api/dom/listings');
    if (!list.length) {
      host.innerHTML = '<div class="card">' + emptyState('🏷️', t('empty_listing'),
        '<button class="btn btn-primary" onclick="wb.newListing()">' + t('new_listing') + '</button>') + '</div>';
      return;
    }
    host.innerHTML = '<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>' + t('platform') + '</th><th>' + t('shop') +
      '</th><th>' + t('product') + '</th><th>' + t('sku') + '</th><th>' + t('platform_sku') + '</th><th>' + t('title') +
      '</th><th>' + t('price') + '</th><th>' + t('status') + '</th><th>' + t('actions') + '</th></tr></thead><tbody>' +
      list.map(function (l) {
        var p = (window.WB_PRODUCTS || {})[l.sku];
        return '<tr><td>' + pl(l.platform) + '</td><td>' + esc(l.shop) + '</td><td>' + esc(p ? p.name : l.sku) + '</td><td>' + esc(l.sku) +
          '</td><td>' + esc(l.platform_sku) + '</td><td>' + esc(l.title || '-') + '</td><td>' + money(l.listing_price, l.currency) +
          '</td><td>' + statusBadge(l.status === 'active' ? (lang === 'en' ? 'Active' : '在售') : l.status, 'badge-success') +
          '</td><td>' + btn('wb.deleteListing(' + l.id + ')', t('del'), 'ghost') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }
  function newListing() {
    productOptions().then(function (popts) {
      openFormModal({
        title: t('new_listing'), submitText: t('save'),
        fields: [
          { key: 'platform', label: t('platform'), type: 'select', options: ALL_PLATFORMS.map(function (p) { return { value: p, label: pl(p) }; }) },
          { key: 'shop', label: t('shop'), value: '默认店铺' },
          { key: 'sku', label: t('product'), type: 'select', options: popts },
          { key: 'platform_sku', label: t('platform_sku') },
          { key: 'platform_product_id', label: t('platform_pid') },
          { key: 'title', label: t('title') },
          { key: 'listing_price', label: t('price'), type: 'number' },
          { key: 'url', label: 'URL' },
        ],
        onSubmit: function (v) { return post('/api/dom/listings', v).then(function () { toast(t('save')); renderListings(); }); },
      });
    });
  }
  function deleteListing(id) {
    openConfirmModal({ title: t('del'), message: lang === 'en' ? 'Delete this link?' : '确认删除该关联吗？', confirmText: t('del'), danger: true,
      onConfirm: function () { return del('/api/dom/listings/' + id).then(renderListings); } });
  }

  // ============ 仓库 ============
  async function renderWarehouses() {
    var host = document.getElementById('wbWarehouses');
    if (!host) return;
    var ws = await api('/api/dom/warehouses');
    var stock = await api('/api/dom/stock');
    var agg = {};
    stock.rows.forEach(function (r) {
      agg[r.warehouse] = agg[r.warehouse] || { skus: 0, units: 0 };
      agg[r.warehouse].skus += 1; agg[r.warehouse].units += r.qty;
    });
    if (!ws.length) { host.innerHTML = '<div class="card">' + emptyState('🏢', t('empty_wh')) + '</div>'; return; }
    host.innerHTML = '<div class="grid grid-3">' + ws.map(function (w) {
      var a = agg[w.name] || { skus: 0, units: 0 };
      return '<div class="card warehouse-card"><div class="card-title">' + esc(w.name) + (w.is_default ? ' <span class="default-flag">' + (lang === 'en' ? 'Default' : '默认') + '</span>' : '') + '</div>' +
        '<div class="wh-meta"><div>' + t('code') + '：' + esc(w.code || '-') + '</div><div>' + t('address') + '：' + esc(w.address || '-') + '</div>' +
        '<div>' + (lang === 'en' ? 'SKUs / Units' : '品类 / 件数') + '：' + a.skus + ' / ' + a.units + '</div></div>' +
        '<div class="card-tools">' + (!w.is_default ? '<button class="btn btn-ghost btn-xs" onclick="wb.setDefaultWh(' + w.id + ')">' + t('set_default') + '</button>' : '') +
        '<button class="btn btn-ghost btn-xs" onclick="wb.editWarehouse(' + w.id + ')">' + t('edit') + '</button>' +
        '<button class="btn btn-ghost btn-xs" onclick="wb.deleteWarehouse(' + w.id + ')">' + t('del') + '</button></div></div>';
    }).join('') + '</div>';
  }
  function setDefaultWh(id) {
    api('/api/dom/warehouses').then(function (ws) {
      ws.forEach(function (w) { put('/api/dom/warehouses/' + w.id, { is_default: w.id === id }); });
      renderWarehouses();
    });
  }
  function newWarehouse() {
    openFormModal({
      title: t('new_wh'), submitText: t('save'),
      fields: [
        { key: 'name', label: t('warehouses'), required: true },
        { key: 'code', label: t('code') }, { key: 'address', label: t('address') },
      ],
      onSubmit: function (v) { return post('/api/dom/warehouses', v).then(function () { toast(t('save')); renderWarehouses(); }); },
    });
  }
  function editWarehouse(id) {
    api('/api/dom/warehouses').then(function (ws) {
      var w = ws.find(function (x) { return x.id === id; });
      if (!w) return;
      openFormModal({
        title: t('edit_wh'), submitText: t('save'),
        fields: [
          { key: 'name', label: t('warehouses'), required: true },
          { key: 'code', label: t('code') }, { key: 'address', label: t('address') },
        ],
        values: { name: w.name, code: w.code || '', address: w.address || '' },
        onSubmit: function (v) { return put('/api/dom/warehouses/' + id, v).then(function () { toast(t('save')); renderWarehouses(); }); },
      });
    });
  }
  function deleteWarehouse(id) {
    openConfirmModal({ title: t('del'), message: lang === 'en' ? 'Delete this warehouse? Stock in it should be moved first.' : '确认删除该仓库吗？请先把其中库存转出。', confirmText: t('del'), danger: true,
      onConfirm: function () { return del('/api/dom/warehouses/' + id).then(renderWarehouses); } });
  }

  // ============ 客户 ============
  async function renderCustomers() {
    var host = document.getElementById('wbCustomers');
    if (!host) return;
    var list = await api('/api/dom/customers');
    var repeat = list.filter(function (c) { return c.orders > 1; });
    var avgLtv = list.length ? list.reduce(function (s, c) { return s + c.ltv; }, 0) / list.length : 0;
    var avgAov = list.length ? list.reduce(function (s, c) { return s + c.aov; }, 0) / list.length : 0;
    host.innerHTML =
      '<div class="grid grid-4">' +
      kpi(t('customer_count'), list.length) + kpi(t('repeat_count'), repeat.length) +
      kpi(t('avg_ltv'), money(avgLtv)) + kpi(t('avg_aov'), money(avgAov)) + '</div>' +
      '<div class="grid grid-2"><div class="card"><div class="card-title">📊 ' + t('segment') + '</div><div id="custSegChart" style="height:280px;"></div></div>' +
      '<div class="card"><div class="card-title">🏆 ' + (lang === 'en' ? 'Top customers' : '客户价值排行') + '</div><div id="custTopChart" style="height:280px;"></div></div></div>' +
      '<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>' + t('platform') + '</th><th>' + t('buyer') + '</th><th>' + t('orders_count') +
      '</th><th>' + t('spend') + '</th><th>' + t('aov') + '</th><th>' + t('ltv') + '</th><th>' + t('recency') + '</th><th>' + t('segment') + '</th></tr></thead><tbody>' +
      (list.length ? list.map(function (c) {
        return '<tr><td>' + pl(c.platform) + '</td><td>' + esc(c.buyer) + '</td><td>' + c.orders + '</td><td>' + money(c.spend) + '</td><td>' + money(c.aov) +
          '</td><td>' + money(c.ltv) + '</td><td>' + c.recency_days + '</td><td>' + statusBadge(c.segment, c.segment.indexOf('重要') >= 0 ? 'badge-success' : 'badge-accent') + '</td></tr>';
      }).join('') : '<tr><td colspan="8" style="padding:24px;">' + emptyState('👥', t('no_data')) + '</td></tr>') +
      '</tbody></table></div></div>' +
      '<div class="card"><div class="card-title">🧮 ' + t('cohort') + '</div><div id="cohortHeat" style="height:300px;"></div><div id="cohortTable" style="margin-top:12px;"></div></div>';
    // 图表
    var segCount = {};
    list.forEach(function (c) { segCount[c.segment] = (segCount[c.segment] || 0) + 1; });
    chart(document.getElementById('custSegChart'), {
      tooltip: {}, series: [{ type: 'pie', radius: ['40%', '70%'], data: Object.keys(segCount).map(function (k) { return { name: k, value: segCount[k] }; }) }],
    });
    var top = list.slice(0, 10);
    chart(document.getElementById('custTopChart'), {
      grid: { left: 90, right: 20, top: 20, bottom: 20 },
      xAxis: { type: 'value' }, yAxis: { type: 'category', data: top.map(function (c) { return c.buyer; }).reverse() },
      series: [{ type: 'bar', data: top.map(function (c) { return c.ltv; }).reverse() }],
    });
    renderCohort();
  }
  function kpi(label, val) { return '<div class="stat-card"><div class="kpi-label">' + esc(label) + '</div><div class="kpi-value">' + val + '</div></div>'; }
  async function renderCohort() {
    var cohorts = await api('/api/dom/cohort');
    var maxIdx = cohorts.reduce(function (m, c) { return Math.max(m, ...Object.keys(c.months).map(Number)); }, 0);
    var heatData = [];
    cohorts.forEach(function (c, yi) {
      for (var i = 0; i <= maxIdx; i++) {
        var n = c.months[i] || 0;
        heatData.push([i, yi, c.customers ? Math.round(n / c.customers * 100) : 0]);
      }
    });
    chart(document.getElementById('cohortHeat'), {
      tooltip: { formatter: function (p) { return cohorts[p.value[1]].cohort + ' · ' + t('month_index').replace('第N月', 'M') + p.value[0] + ' : ' + p.value[2] + '%'; } },
      grid: { left: 70, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: Array.from({ length: maxIdx + 1 }, function (_, i) { return i; }), name: t('month_index') },
      yAxis: { type: 'category', data: cohorts.map(function (c) { return c.cohort; }) },
      visualMap: { min: 0, max: 100, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#e8eefc', '#5b8def', '#1f5fd0'] } },
      series: [{ type: 'heatmap', data: heatData, label: { show: true, formatter: function (p) { return p.value[2] ? p.value[2] : ''; } } }],
    });
    var tbl = document.getElementById('cohortTable');
    if (tbl) tbl.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>' + (lang === 'en' ? 'Cohort' : '首购月份') + '</th><th>' + t('customer_count') + '</th>' +
      Array.from({ length: Math.min(maxIdx + 1, 7) }, function (_, i) { return '<th>M' + i + '</th>'; }).join('') + '</tr></thead><tbody>' +
      cohorts.map(function (c) {
        return '<tr><td>' + c.cohort + '</td><td>' + c.customers + '</td>' +
          Array.from({ length: Math.min(maxIdx + 1, 7) }, function (_, i) {
            var n = c.months[i] || 0; var pct = c.customers ? Math.round(n / c.customers * 100) : 0;
            return '<td>' + (i === 0 ? '100%' : (pct ? pct + '%' : '-')) + '</td>';
          }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  // ============ 经营损益 ============
  var finGroup = 'platform';
  async function renderFinance() {
    var host = document.getElementById('wbFinance');
    if (!host) return;
    var data = await api('/api/dom/pnl?group=' + finGroup);
    var t2 = data.totals;
    host.innerHTML =
      '<div class="grid grid-4">' +
      kpi(t('revenue'), money(t2.revenue)) + kpi(t('cogs'), money(t2.cogs)) + kpi(t('fees'), money(t2.referral + t2.payment)) +
      kpi(t('ad'), money(t2.ad)) + '</div>' +
      '<div class="grid grid-4">' +
      kpi(t('refund'), money(t2.refund_amount - t2.returned_cogs)) + kpi(t('net'), money(t2.net)) +
      '<div class="stat-card"><div class="kpi-label">' + t('net_pct') + '</div><div class="kpi-value">' + t2.net_pct + '%</div></div>' +
      '<div class="stat-card"><div class="kpi-label">' + t('group_by') + '</div><div class="segmented">' +
      segBtn('platform', t('g_platform')) + segBtn('product', t('g_product')) + segBtn('month', t('g_month')) + '</div></div></div>' +
      '<div class="card"><div id="finTrend" style="height:280px;"></div></div>' +
      '<div class="card"><div class="card-title">📋 ' + t('finance') + '</div><div class="table-wrap"><table class="data-table"><thead><tr><th>' +
      groupLabel() + '</th><th>' + t('orders_count') + '</th><th>' + t('revenue') + '</th><th>' + t('cogs') + '</th><th>' + t('fees') +
      '</th><th>' + t('ad') + '</th><th>' + t('refund') + '</th><th>' + (lang === 'en' ? 'Other' : '其他') + '</th><th>' + t('net') + '</th><th>' + t('net_pct') + '</th></tr></thead><tbody>' +
      data.rows.map(function (r) {
        var refund = r.refund_amount - r.returned_cogs;
        var other = r.fulfillment + r.other;
        var keyCell = finGroup === 'platform' ? pl(r.key) : esc(r.key);
        return '<tr><td>' + keyCell + '</td><td>' + r.orders + '</td><td>' + money(r.revenue) + '</td><td>' + money(r.cogs) + '</td><td>' + money(r.fees) +
          '</td><td>' + money(r.ad) + '</td><td>' + money(refund) + '</td><td>' + money(other) + '</td><td class="' + (r.net >= 0 ? 'num pos' : 'num neg') + '">' + money(r.net) +
          '</td><td>' + r.net_pct + '%</td></tr>';
      }).join('') + '</tbody></table></div></div>';
    // 月度趋势
    var month = await api('/api/dom/pnl?group=month');
    chart(document.getElementById('finTrend'), {
      tooltip: { trigger: 'axis' }, legend: { data: [t('revenue'), t('net')] },
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: month.rows.map(function (r) { return r.key; }) },
      yAxis: { type: 'value' },
      series: [{ name: t('revenue'), type: 'bar', data: month.rows.map(function (r) { return r.revenue; }) },
      { name: t('net'), type: 'line', smooth: true, data: month.rows.map(function (r) { return r.net; }) }],
    });
    renderExpenses();
    renderFeeEditor();
  }
  function groupLabel() { return finGroup === 'product' ? t('product') : finGroup === 'month' ? t('g_month') : t('platform'); }
  function segBtn(key, label) { return '<button class="segmented-btn ' + (finGroup === key ? 'active' : '') + '" onclick="wb.setFinGroup(\'' + key + '\')">' + label + '</button>'; }
  function setFinGroup(g) { finGroup = g; renderFinance(); }

  async function renderExpenses() {
    var host = document.getElementById('wbFinance');
    var list = await api('/api/dom/expenses');
    var catMap = { advertising: t('cat_advertising'), shipping: t('cat_shipping'), storage: t('cat_storage'), software: t('cat_software'), service: t('cat_service'), other: t('cat_other') };
    var div = document.createElement('div');
    div.innerHTML = '<div class="card"><div class="card-title">🧾 ' + t('expenses') + '</div><div class="table-wrap"><table class="data-table"><thead><tr><th>' +
      t('occurred') + '</th><th>' + t('category') + '</th><th>' + t('platform') + '</th><th>' + t('amount') + '</th><th>' + t('note') +
      '</th><th>' + t('actions') + '</th></tr></thead><tbody>' +
      (list.length ? list.map(function (e) {
        return '<tr><td>' + esc(e.occurred_on) + '</td><td>' + esc(catMap[e.category] || e.category) + '</td><td>' + (e.platform ? pl(e.platform) : '-') +
          '</td><td>' + money(e.amount) + '</td><td>' + esc(e.note || '-') + '</td><td>' + btn('wb.deleteExpense(' + e.id + ')', t('del'), 'ghost') + '</td></tr>';
      }).join('') : '<tr><td colspan="6" style="padding:20px;color:var(--text-tertiary);text-align:center;">' + t('no_data') + '</td></tr>') +
      '</tbody></table></div></div>';
    host.appendChild(div.firstChild);
  }
  function newExpense() {
    openFormModal({
      title: t('new_expense'), submitText: t('save'),
      fields: [
        { key: 'occurred_on', label: t('occurred'), value: new Date().toISOString().slice(0, 10) },
        { key: 'category', label: t('category'), type: 'select', options: ['advertising', 'shipping', 'storage', 'software', 'service', 'other'].map(function (c) {
          return { value: c, label: ({ advertising: t('cat_advertising'), shipping: t('cat_shipping'), storage: t('cat_storage'), software: t('cat_software'), service: t('cat_service'), other: t('cat_other') })[c] }; }) },
        { key: 'platform', label: t('platform') },
        { key: 'amount', label: t('amount'), type: 'number', required: true },
        { key: 'note', label: t('note') },
      ],
      onSubmit: function (v) { return post('/api/dom/expenses', v).then(function () { toast(t('save')); renderFinance(); }); },
    });
  }
  function deleteExpense(id) { del('/api/dom/expenses/' + id).then(renderFinance); }

  async function renderFeeEditor() {
    var host = document.getElementById('wbFinance');
    var data = await api('/api/dom/fees');
    var div = document.createElement('div');
    div.innerHTML = '<div class="card"><div class="card-title">⚖️ ' + t('fee_table') + '</div><p class="card-sub2">' + esc(data.meta.note || '') + '</p>' +
      '<div class="table-wrap"><table class="data-table fee-table"><thead><tr><th>' + t('platform') + '</th><th>' + t('fees') + '(%)</th><th>' +
      (lang === 'en' ? 'Payment (%)' : '支付费(%)') + '</th><th>' + (lang === 'en' ? 'Reference' : '参考区间') + '</th><th>' + t('official') + '</th><th>' + t('actions') + '</th></tr></thead><tbody>' +
      Object.keys(data.platforms).map(function (p) {
        var f = data.platforms[p];
        var pname = lang === 'en' ? (f.name_en || p) : (f.name_zh || p);
        var range = lang === 'en' ? (f.referral_range_en || f.referral_range) : f.referral_range;
        return '<tr data-plat="' + encodeURIComponent(p) + '"><td>' + esc(pname) + '</td>' +
          '<td><input class="fee-input" data-f="referral_pct" value="' + f.referral_pct + '" style="width:64px;"></td>' +
          '<td><input class="fee-input" data-f="payment_pct" value="' + f.payment_pct + '" style="width:64px;"></td>' +
          '<td class="fee-range">' + esc(range || '') + '</td>' +
          '<td><a href="' + esc(f.official || '#') + '" target="_blank" rel="noopener">' + t('official') + '</a></td>' +
          '<td><button class="btn btn-primary btn-xs" onclick="wb.saveFee(this)">' + t('save') + '</button> ' +
          '<button class="btn btn-ghost btn-xs" onclick="wb.resetFee(this)">' + t('reset_fee') + '</button></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    host.appendChild(div.firstChild);
  }
  function saveFee(btnEl) {
    var tr = btnEl.closest('tr'); var p = decodeURIComponent(tr.dataset.plat);
    var body = {};
    tr.querySelectorAll('.fee-input').forEach(function (i) { body[i.dataset.f] = Number(i.value); });
    put('/api/dom/fees/' + encodeURIComponent(p), body).then(function () { toast(t('save')); });
  }
  function resetFee(btnEl) {
    var tr = btnEl.closest('tr'); var p = decodeURIComponent(tr.dataset.plat);
    post('/api/dom/fees/' + encodeURIComponent(p) + '/reset').then(function () { renderFinance(); });
  }

  function openReconcile() {
    openFormModal({
      title: t('reconcile'), submitText: t('run_reconcile'),
      fields: [
        { key: 'text', label: t('reconcile_help'), type: 'textarea' },
      ],
      onSubmit: function (v) {
        var rows = String(v.text || '').split(/\r?\n/).map(function (line) {
          var parts = line.split(/[,，\t]/);
          return { order_no: (parts[0] || '').trim(), settlement_amount: Number((parts[1] || '').trim()) };
        }).filter(function (r) { return r.order_no; });
        return post('/api/dom/reconcile', { rows: rows }).then(function (res) {
          var msg = (lang === 'en' ? 'Matched ' : '已对上 ') + res.summary.matched + (lang === 'en' ? ', differences ' : '，差异 ') + res.summary.diff +
            (lang === 'en' ? ', missing ' : '，缺失 ') + (res.summary.missing_local + res.summary.missing_settlement);
          toast(msg);
          renderReconcileResult(res);
        });
      },
    });
  }
  function renderReconcileResult(res) {
    var host = document.getElementById('wbFinance');
    var div = document.createElement('div');
    div.innerHTML = '<div class="card"><div class="card-title">🔍 ' + t('reconcile') + '</div><div class="table-wrap"><table class="data-table"><thead><tr><th>' +
      t('order_no') + '</th><th>' + (lang === 'en' ? 'Expected' : '应到账') + '</th><th>' + (lang === 'en' ? 'Received' : '实际到账') +
      '</th><th>' + (lang === 'en' ? 'Difference' : '差异') + '</th><th>' + t('status') + '</th></tr></thead><tbody>' +
      res.rows.map(function (r) {
        var smap = { matched: ['badge-success', t('matched')], diff: ['badge-warning', t('diff')], missing_local: ['badge-danger', t('missing_local')], missing_settlement: ['badge-warning', t('missing_settlement')] };
        var sm = smap[r.status];
        return '<tr><td>' + esc(r.order_no) + '</td><td>' + (r.expected != null ? money(r.expected) : '-') + '</td><td>' + (r.settlement != null ? money(r.settlement) : '-') +
          '</td><td>' + (r.diff != null ? money(r.diff) : '-') + '</td><td>' + statusBadge(sm[1], sm[0]) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
    host.appendChild(div.firstChild);
  }

  // ============ 预警 ============
  async function renderAlerts() {
    var host = document.getElementById('wbAlerts');
    if (!host) return;
    var list = await api('/api/dom/alerts');
    var open = list.filter(function (a) { return a.status === 'open'; });
    var counts = { critical: 0, warning: 0, info: 0 };
    open.forEach(function (a) { counts[a.level] = (counts[a.level] || 0) + 1; });
    host.innerHTML =
      '<div class="grid grid-3">' +
      alertCard(t('critical'), counts.critical, 'critical') + alertCard(t('warning'), counts.warning, 'warning') + alertCard(t('info'), counts.info, 'info') + '</div>';
    if (!open.length) host.innerHTML += '<div class="card">' + emptyState('🔔', t('empty_alerts')) + '</div>';
    else {
      host.innerHTML += '<div class="card"><div class="alert-list">' + open.map(function (a) {
        var icon = a.level === 'critical' ? '🔴' : a.level === 'warning' ? '🟡' : '🔵';
        return '<div class="alert-item alert-' + a.level + '"><div class="alert-main"><div class="alert-title">' + icon + ' ' + esc(a.title) + '</div>' +
          '<div class="alert-detail">' + esc(a.detail) + '</div><div class="alert-time">' + esc(a.created_at) + '</div></div>' +
          '<div class="alert-actions"><button class="btn btn-ghost btn-xs" onclick="wb.readAlert(' + a.id + ')">' + t('mark_read') + '</button>' +
          '<button class="btn btn-ghost btn-xs" onclick="wb.dismissAlert(' + a.id + ')">' + t('dismiss') + '</button></div></div>';
      }).join('') + '</div></div>';
    }
  }
  function alertCard(label, val, level) {
    return '<div class="stat-card alert-card-kpi ' + level + '"><div class="kpi-label">' + esc(label) + '</div><div class="kpi-value">' + val + '</div></div>';
  }
  function runMonitors() {
    post('/api/dom/alerts/run').then(function (r) {
      toast((lang === 'en' ? 'Checks complete, ' : '巡检完成，') + r.open + (lang === 'en' ? ' open alerts' : ' 条待处理'));
      renderAlerts();
    });
  }
  function readAlert(id) { post('/api/dom/alerts/' + id, { status: 'read' }).then(renderAlerts); }
  function dismissAlert(id) { post('/api/dom/alerts/' + id, { status: 'dismissed' }).then(renderAlerts); }

  // ============ 通用小部件 ============
  function guideCard(text) {
    return '<div class="card guide-card"><div class="guide-body">' + esc(text) + '</div></div>';
  }

  // 缓存产品名
  function cacheProducts() {
    api('/api/products').then(function (ps) {
      window.WB_PRODUCTS = {};
      ps.forEach(function (p) { window.WB_PRODUCTS[p.sku] = p; });
    });
  }

  // 页面切换
  var RENDERERS = {
    orders: renderOrders, shipping: renderShipping, aftersales: renderAftersales, inventory: renderInventory,
    purchases: renderPurchases, listings: renderListings, warehouses: renderWarehouses, customers: renderCustomers,
    finance: renderFinance, alerts: renderAlerts,
  };
  window.addEventListener('ewb:page', function (e) {
    lang = document.documentElement.lang === 'en' ? 'en' : 'zh';
    cacheProducts();
    var p = e.detail.page;
    if (RENDERERS[p]) RENDERERS[p]();
  });

  // 语言/主题变化重绘当前页
  new MutationObserver(function () {
    var newLang = document.documentElement.lang === 'en' ? 'en' : 'zh';
    if (newLang !== lang) { lang = newLang; rerenderActive(); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  function rerenderActive() {
    var pg = document.querySelector('.page.active');
    if (!pg) return;
    var m = pg.id.match(/^page-(.+)$/);
    if (m && RENDERERS[m[1]]) RENDERERS[m[1]]();
  }

  // 顶部按钮接线
  document.addEventListener('DOMContentLoaded', function () {
    cacheProducts();
    bind('btnNewListing', newListing); bind('btnNewWarehouse', newWarehouse);
    bind('btnNewExpense', newExpense); bind('btnReconcile', openReconcile); bind('btnRunMonitors', runMonitors);
    renderOrders(); renderShipping(); renderAftersales(); renderInventory(); renderPurchases();
  });
  function bind(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', fn); }

  // 对外对象（单一命名空间）
  window.WB = {
    renderOrders: renderOrders, renderShipping: renderShipping, renderAftersales: renderAftersales,
    renderInventory: renderInventory, renderPurchases: renderPurchases, renderListings: renderListings,
    renderWarehouses: renderWarehouses, renderCustomers: renderCustomers, renderFinance: renderFinance, renderAlerts: renderAlerts,
    setOrderFilter: setOrderFilter, confirmOrder: confirmOrder, openShip: openShip, completeOrder: completeOrder,
    cancelOrder: cancelOrder, deleteOrder: deleteOrder, openAftersale: openAftersale, rejectAftersale: rejectAftersale,
    openRefund: openRefund,
    deleteAftersale: deleteAftersale, doVerify: doVerify, setInvTab: setInvTab, openAdjust: openAdjust, openTransfer: openTransfer,
    shipTransfer: shipTransfer, receiveTransfer: receiveTransfer, confirmPurchase: confirmPurchase, openReceive: openReceive,
    deletePurchase: deletePurchase, newListing: newListing, deleteListing: deleteListing, setDefaultWh: setDefaultWh,
    newWarehouse: newWarehouse, editWarehouse: editWarehouse, deleteWarehouse: deleteWarehouse, newExpense: newExpense, deleteExpense: deleteExpense,
    saveFee: saveFee, resetFee: resetFee, openReconcile: openReconcile, runMonitors: runMonitors,
    readAlert: readAlert, dismissAlert: dismissAlert, setFinGroup: setFinGroup,
  };
  window.wb = window.WB;
})();
