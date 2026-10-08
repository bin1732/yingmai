// 数据类问题的确定性答复（直接查询真实经营数据，保证不空、不慢）· 灵感引擎工坊 · bin1732
const dom = require('./domain');

function n2(x) { return Number(x || 0).toFixed(2).replace(/\.00$/, ''); }
function money(x) { return '¥' + n2(x); }

function kind(message) {
  const q = String(message || '').toLowerCase();
  if (/待发货|要发|没发货|漏发|发货超时|pending|waiting|shipp/.test(q)) return 'pending';
  if (/佣金|费率|手续费|抽成|抽佣|扣点|referral|commission|fee rate|payment fee|transaction fee/.test(q)) return 'fees';
  if (/净利润|赚了多少|营业额|收入多少|损益|net profit|revenue/.test(q)) return 'pnl';
  if (/预警|要处理|有什么问题|alert/.test(q)) return 'alerts';
  if (/卖得好|爆款|热销|滞销|卖不动|best seller|top product|slow moving/.test(q)) return 'top';
  if (/库存|缺货|补货|剩多少|还有多少|stock|inventory|restock/.test(q)) return 'stock';
  if (/新手|第一次|第一步|怎么开.{0,6}店|开店流程|开店步骤|开店的流程|开店的步骤|准备什么|如何入行|怎么入行|怎么开始|如何开始|怎么入手|如何入手|从零|没做过电商|how (do|to) i (start|open|begin)|first step|get started|new to (e-?commerce|selling)|beginner|steps to (open|start|sell)/.test(q)) return 'guide';
  return null;
}

const CROSSBORDER_IDS = ['amazon', 'shopee', 'tiktokshop', 'shopify', 'ebay', 'aliexpress', 'lazada'];
function detectTrack(q) {
  if (/跨境|外贸|海外|cross-border|overseas/.test(q)) return 'crossborder';
  const id = detectPlatform(q);
  if (id && CROSSBORDER_IDS.includes(id)) return 'crossborder';
  if (id) return 'domestic';
  return 'domestic';
}

const PL_ALIASES = {
  taobao: ['淘宝', 'taobao'], tmall: ['天猫', 'tmall'], jd: ['京东', 'jd.com', 'jd '],
  pdd: ['拼多多', 'pdd', 'pinduoduo'], douyin: ['抖音', 'douyin'], kuaishou: ['快手', 'kuaishou'],
  xiaohongshu: ['小红书', 'xiaohongshu'], amazon: ['亚马逊', 'amazon'],
  shopee: ['虾皮', 'shopee'], tiktokshop: ['tiktok shop', 'tiktokshop', 'tiktok'],
  shopify: ['shopify'], ebay: ['ebay'], aliexpress: ['速卖通', 'aliexpress'], lazada: ['lazada', '来赞达'],
};
function detectPlatform(q) {
  for (const id of Object.keys(PL_ALIASES)) {
    if (PL_ALIASES[id].some((a) => q.includes(a))) return id;
  }
  return null;
}

function feesAnswer(en, id) {
  if (!id) {
    return en
      ? 'Platform fees differ by platform and category. Tell me which platform (e.g. Amazon, Shopee, Taobao) and I’ll give its reference referral and payment fees. You can also find them in the Platform Rules section.'
      : '各平台、各类目的费用不同。请告诉我具体平台（如亚马逊、虾皮、淘宝），我为您说明参考佣金与支付手续费；也可在“平台规范”中查看。';
  }
  const f = dom.getFees(id);
  const name = dom.platformName(id, en ? 'en' : 'zh');
  const rp = Number(f.referral_pct) || 0;
  const pp = Number(f.payment_pct) || 0;
  const rangeR = en ? f.referral_range_en : f.referral_range;
  const rangeP = en ? f.payment_range_en : f.payment_range;
  if (en) {
    let s = `${name} reference fees: platform commission about ${rp}%`;
    if (rangeR) s += ` (${rangeR})`;
    s += `; payment processing fee about ${pp}%`;
    if (rangeP) s += ` (${rangeP})`;
    s += '. These are reference figures for common categories; actual charges vary by category and are subject to the platform settlement statement.';
    if (f.official) s += ` Official source: ${f.official}`;
    return s;
  }
  let s = `${name}参考费率：平台佣金约 ${rp}%`;
  if (rangeR) s += `（${rangeR}）`;
  s += `；支付/收款手续费约 ${pp}%`;
  if (rangeP) s += `（${rangeP}）`;
  s += '。以上为常见类目的参考口径，具体因类目而异，实际扣费以平台结算单为准。';
  if (f.official) s += `官方入口：${f.official}`;
  return s;
}

function stockAnswer(en) {
  const rows = dom.stockTable();
  if (!rows.length) {
    return en ? 'No inventory records yet. Add a product under Products & Supply Chain, then register stock through purchase receiving.'
      : '目前还没有库存记录。您可以先在“商品与供应链”中添加商品，再通过采购入库登记库存。';
  }
  const head = en ? 'Here is your current inventory:' : '为您查询到当前库存情况：';
  const lines = rows.map((r) => {
    let base;
    if (en) base = `${r.product_name} (${r.sku}), ${r.warehouse}: ${r.qty} units`;
    else base = `${r.product_name}（${r.sku}）${r.warehouse}：${r.qty} 件`;
    if (r.status === 'stockout') return base + (en ? ' — out of stock, please restock soon.' : '，已缺货，建议尽快补货。');
    if (r.status === 'low') return base + (en ? ` — low stock (safety level ${r.safety_stock}), consider restocking.` : `，库存偏低（安全库存 ${r.safety_stock} 件），建议补货。`);
    return base + (en ? '.' : '。');
  });
  return [head, ...lines].join('\n');
}

function pendingAnswer(en) {
  const today = new Date();
  const orders = require('./store').list('orders').filter((o) => ['pending', 'paid', 'confirmed'].includes(o.status));
  if (!orders.length) return en ? 'You have no orders waiting to be shipped.' : '目前没有待发货订单。';
  const head = en ? `You have ${orders.length} order(s) to ship:` : `您有 ${orders.length} 笔订单待发货：`;
  const lines = orders.map((o) => {
    let age = 0;
    const d = new Date(String(o.created_at || '').replace(' ', 'T'));
    if (!Number.isNaN(d.getTime())) age = Math.floor((today - d) / 86400000);
    let line;
    if (en) line = `${o.order_no} (${o.platform || ''}, buyer ${o.buyer || '-'}, ${o.qty} unit(s), waiting ${age} day(s))`;
    else line = `${o.order_no}（${o.platform || ''}，买家 ${o.buyer || '-'}，${o.qty} 件，已等待 ${age} 天）`;
    if (age >= 2) line += en ? ' — please ship soon to avoid being late.' : '，建议尽快发货，避免超时。';
    else line += en ? '.' : '。';
    return line;
  });
  return [head, ...lines].join('\n');
}

function pnlAnswer(en) {
  const s = dom.pnlSummary('platform');
  const t = s.totals || {};
  if (!t.orders) return en ? 'There are no shipped orders yet, so profit cannot be calculated. Ship orders first.'
    : '目前还没有已发货订单，暂无法核算利润。完成发货后会自动统计。';
  if (en) {
    return `Based on shipped orders, order-by-order: revenue ${money(t.revenue)}, product cost ${money(t.cogs)}, platform fees ${money((t.referral || 0) + (t.payment || 0))}, fulfillment ${money(t.fulfillment)}, advertising ${money(t.ad)}, refunds ${money(t.refund_amount)}, net profit ${money(t.net)} (net margin ${n2(t.net_pct)}%).`;
  }
  return `按已发货订单逐单核算：营业收入 ${money(t.revenue)}，商品成本 ${money(t.cogs)}，平台费用 ${money((t.referral || 0) + (t.payment || 0))}，物流履约 ${money(t.fulfillment)}，广告投放 ${money(t.ad)}，退款 ${money(t.refund_amount)}，净利润 ${money(t.net)}，净利率 ${n2(t.net_pct)}%。`;
}

async function alertsAnswer(en) {
  // 预警刷新失败不应让整个请求报错；退回读取已落库的预警即可
  try { await dom.runMonitors(en ? 'en' : 'zh'); } catch {}
  const alerts = require('./store').list('alerts').filter((a) => a.status === 'open');
  if (!alerts.length) return en ? 'You currently have no alerts to handle.' : '当前没有需要处理的预警。';
  const head = en ? `You have ${alerts.length} alert(s):` : `您有 ${alerts.length} 条待处理预警：`;
  const lv = { critical: en ? 'Critical' : '严重', warning: en ? 'Warning' : '警告', info: en ? 'Info' : '提示' };
  const lines = alerts.map((a) => `${lv[a.level] || ''} ${a.title}：${a.detail || ''}`);
  return [head, ...lines].join('\n');
}

function topAnswer(en) {
  const abc = dom.abcAnalysis(30);
  const dead = dom.deadStock(30);
  const parts = [];
  const aItems = abc.slice(0, 5);
  if (en) {
    if (abc.length) {
      parts.push('Top sellers (last 30 days): ' +
        aItems.map((r) => `${r.product_name} (sales ${money(r.revenue)})`).join('; ') + '.');
    } else parts.push('No sales recorded in the last 30 days yet.');
    if (dead.length) {
      parts.push('Slow-moving items: ' +
        dead.slice(0, 5).map((r) => `${r.product_name} (no sales for ${r.idle_days} days, tied-up capital ${money(r.stock_value)})`).join('; ') +
        '. Consider a promotion or clearance.');
    }
  } else {
    if (abc.length) {
      parts.push('近 30 天热销商品：' +
        aItems.map((r) => `${r.product_name}（销售额 ${money(r.revenue)}）`).join('；') + '。');
    } else parts.push('近 30 天暂无销售记录。');
    if (dead.length) {
      parts.push('以下商品滞销：' +
        dead.slice(0, 5).map((r) => `${r.product_name}（已 ${r.idle_days} 天无销售，占用资金 ${money(r.stock_value)}）`).join('；') +
        '，建议促销或清仓。');
    }
  }
  return parts.join('\n');
}

function guideAnswer(en, q) {
  const track = detectTrack(q);
  const firstOnly = /第一步|准备什么|first step|prepare/.test(q);
  const steps = dom.onboardingSteps(track, en ? 'en' : 'zh', firstOnly);
  if (!steps.length) return null;
  let head;
  if (en) {
    head = firstOnly
      ? (track === 'crossborder' ? 'Before opening a cross-border store, prepare these first:' : 'Before opening a store, prepare these first:')
      : 'Here is the process from preparation to profit, in order:';
  } else {
    head = firstOnly
      ? (track === 'crossborder' ? '开跨境店之前，先准备好这些：' : '开店之前，先准备好这些：')
      : '为您整理了从准备到盈利的步骤，按顺序进行即可：';
  }
  const blocks = steps.map((s, i) => {
    const title = `${i + 1}. ${s.title}`;
    const details = s.details.map((d) => '· ' + d).join('\n');
    return title + '\n' + details;
  });
  let tail = '';
  if (!en) tail = '\n具体要求可能调整，办理时以平台官方页面或卖家后台为准；完整图文步骤可在“入行指南”中查看。';
  else tail = '\nRequirements may change; follow the platform’s official seller pages. The full illustrated guide is in the Onboarding section.';
  return [head, ...blocks].join('\n') + tail;
}

async function answerDataQuestion(message, lang) {
  const en = lang === 'en';
  const q = String(message || '').toLowerCase();
  const k = kind(message);
  if (!k) return null;
  if (k === 'stock') return stockAnswer(en);
  if (k === 'pending') return pendingAnswer(en);
  if (k === 'fees') return feesAnswer(en, detectPlatform(q));
  if (k === 'pnl') return pnlAnswer(en);
  if (k === 'alerts') return alertsAnswer(en);
  if (k === 'top') return topAnswer(en);
  if (k === 'guide') return guideAnswer(en, q);
  return null;
}

module.exports = { answerDataQuestion };
