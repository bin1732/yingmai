// 确定性经营引擎：选品评分 / 补货预测 / 广告竞价 / 到岸成本 / 供应商评估 / 达人计划 / 知识产权快判
// 灵感引擎工坊 · bin1732
// 所有结果由用户输入经固定公式计算，不生成任何未经输入的市场数字。

const R = (v, d = 2) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
};
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const num = (v, dft = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : dft;
};

// ─────────────────────────────────────────────────────────────
// 1) 选品机会评分（8 因子）
// 输入：demand 需求(1-5)、reviews 头部评论数、rating 头部评分、cost 成本、price 售价、
//       season 全年可售度(1-5)、ip_risk 侵权风险(1-5)、logi 物流便利(1-5)、barrier 进入容易度(1-5)
function scoreOpportunity(b) {
  const demand = clamp(num(b.demand, 3), 1, 5);
  const reviews = Math.max(0, num(b.reviews, 0));
  const rating = num(b.rating, 4.3);
  const cost = num(b.cost, 0);
  const price = num(b.price, 0);
  const season = clamp(num(b.season, 3), 1, 5);
  const ipRisk = clamp(num(b.ip_risk, 3), 1, 5);
  const logi = clamp(num(b.logi, 3), 1, 5);
  const barrier = clamp(num(b.barrier, 3), 1, 5);

  const marginPct = price > 0 ? clamp((price - cost) / price * 100) : 0;
  const subs = {
    demand: R(demand / 5 * 100, 1),
    competition: R(clamp(100 - reviews / 500 * 100), 1),
    improve: R(clamp((4.7 - rating) / 1.2 * 100), 1),
    margin: R(clamp(marginPct / 50 * 100), 1),
    season: R(season / 5 * 100, 1),
    ip_safe: R((6 - ipRisk) / 5 * 100, 1),
    logi: R(logi / 5 * 100, 1),
    barrier: R(barrier / 5 * 100, 1),
  };
  const weights = {
    demand: 20, competition: 15, margin: 20, ip_safe: 12,
    season: 8, logi: 10, barrier: 8, improve: 7,
  };
  let total = 0;
  for (const k of Object.keys(weights)) total += subs[k] * weights[k];
  total = R(total / 100, 1);
  let tier, tierKey;
  if (total >= 75) { tierKey = 'priority'; tier = '优先考虑'; }
  else if (total >= 60) { tierKey = 'try'; tier = '可以尝试'; }
  else if (total >= 45) { tierKey = 'caution'; tier = '谨慎评估'; }
  else { tierKey = 'avoid'; tier = '暂不建议'; }
  return {
    total, tier, tier_key: tierKey,
    margin_pct: R(marginPct, 1),
    weights, sub_scores: subs,
    radar_indicators: [
      ['demand', '需求强度'], ['competition', '竞争空间'], ['margin', '利润空间'],
      ['ip_safe', '侵权安全'], ['season', '全年可售'], ['logi', '物流便利'],
      ['barrier', '进入难度'], ['improve', '改进空间'],
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// 2) 销量预测与补货建议
// 输入：avg_daily 日均销量、lead_days 到货周期、service_level 服务水平(%)、
//       demand_cv 销量波动系数(常用0.3-0.5)、current_stock 当前库存、
//       moq 起订量、cover_days 期望覆盖天数
function forecastReplenishment(b) {
  const avgDaily = Math.max(0, num(b.avg_daily, 0));
  const leadDays = Math.max(0, num(b.lead_days, 15));
  const sl = num(b.service_level, 95);
  const cv = Math.max(0, num(b.demand_cv, 0.4));
  const currentStock = Math.max(0, num(b.current_stock, 0));
  const moq = Math.max(0, num(b.moq, 0));
  const coverDays = Math.max(0, num(b.cover_days, 30));

  const zTable = { 90: 1.28, 95: 1.65, 97.5: 1.96, 98: 2.05, 99: 2.33 };
  let z = 1.65;
  let nearest = null;
  for (const k of Object.keys(zTable)) {
    const d = Math.abs(Number(k) - sl);
    if (nearest === null || d < nearest) { nearest = d; z = zTable[k]; }
  }
  const sigmaDaily = avgDaily * cv;
  const safetyStock = Math.ceil(z * sigmaDaily * Math.sqrt(Math.max(1, leadDays)));
  const leadDemand = Math.ceil(avgDaily * leadDays);
  const reorderPoint = leadDemand + safetyStock;
  const targetPosition = Math.ceil(avgDaily * (leadDays + coverDays)) + safetyStock;
  const suggestedQty = Math.max(moq, Math.ceil(targetPosition - currentStock));
  const coverNow = avgDaily > 0 ? currentStock / avgDaily : 0;

  const horizon = Math.ceil(leadDays + coverDays + 10);
  const days = [], without = [], withOrder = [];
  for (let d = 0; d <= horizon; d++) {
    days.push(d);
    const w = Math.max(0, currentStock - avgDaily * d);
    without.push(R(w, 1));
    let v = Math.max(0, currentStock - avgDaily * d);
    if (d >= leadDays) v += suggestedQty;
    withOrder.push(R(v, 1));
  }
  const stockoutDate = coverNow > 0
    ? new Date(Date.now() + Math.round(coverNow) * 86400000).toISOString().slice(0, 10)
    : null;
  return {
    z: R(z, 2),
    sigma_daily: R(sigmaDaily, 2),
    safety_stock: safetyStock,
    lead_demand: leadDemand,
    reorder_point: reorderPoint,
    suggested_qty: suggestedQty,
    cover_days_now: R(coverNow, 1),
    stockout_date: stockoutDate,
    need_reorder: currentStock <= reorderPoint,
    series: { days, without, with_order: withOrder, lead_days: leadDays, reorder_point: reorderPoint },
  };
}

// ─────────────────────────────────────────────────────────────
// 3) TACoS 与目标花费
// 输入：ad_spend 广告花费、total_sales 总销售额、ad_sales 广告销售额、
//       projected_sales 下期预计总销售额、target_tacos 目标TACoS(%)、margin_pct 毛利率(可选)
function calcTacos(b) {
  const adSpend = num(b.ad_spend, 0);
  const totalSales = num(b.total_sales, 0);
  const adSales = num(b.ad_sales, 0);
  const projected = num(b.projected_sales, totalSales);
  const target = num(b.target_tacos, 15);
  const margin = b.margin_pct === '' || b.margin_pct == null ? null : num(b.margin_pct, null);

  const acos = adSales > 0 ? adSpend / adSales * 100 : null;
  const tacos = totalSales > 0 ? adSpend / totalSales * 100 : null;
  const organicSales = Math.max(0, totalSales - adSales);
  const organicRatio = totalSales > 0 ? organicSales / totalSales * 100 : null;
  const targetSpend = projected * target / 100;
  let relation = null, relationKey = null;
  if (margin !== null && tacos !== null) {
    if (tacos <= margin * 0.8) { relationKey = 'safe'; relation = '广告占比低于毛利率，整体仍有空间'; }
    else if (tacos <= margin) { relationKey = 'watch'; relation = '广告占比接近毛利率，注意控制'; }
    else { relationKey = 'over'; relation = '广告占比高于毛利率，需要优化'; }
  }
  return {
    acos: acos === null ? null : R(acos, 1),
    tacos: tacos === null ? null : R(tacos, 1),
    organic_sales: R(organicSales, 2),
    organic_ratio: organicRatio === null ? null : R(organicRatio, 1),
    target_spend: R(targetSpend, 2),
    margin_pct: margin === null ? null : R(margin, 1),
    relation, relation_key: relationKey,
  };
}

// ─────────────────────────────────────────────────────────────
// 4) 竞价规则（确定性）
// 输入：cpc 当前出价、cvr 转化率(%)、price 售价、cost 成本、other_fees_pct 其他费用(%)、
//       cur_acos 当前ACOS(%)、target_acos 目标ACOS(%)、clicks 点击数、orders 订单数
function bidRule(b) {
  const cpc = num(b.cpc, 0);
  const cvr = num(b.cvr, 0);
  const price = num(b.price, 0);
  const cost = num(b.cost, 0);
  const other = num(b.other_fees_pct, 0);
  const curAcos = b.cur_acos === '' || b.cur_acos == null ? null : num(b.cur_acos, null);
  const target = num(b.target_acos, 30);
  const clicks = num(b.clicks, 0);
  const orders = num(b.orders, 0);

  const breakeven = price > 0 ? clamp((1 - cost / price - other / 100) * 100) : null;
  const targetCpc = cvr > 0 && price > 0 ? price * (target / 100) * (cvr / 100) : null;

  let actionKey = 'hold', action = '维持当前出价，继续积累数据', suggested = cpc;
  if (orders === 0 && clicks >= 12) {
    actionKey = 'pause'; action = '点击较多但没有订单，建议降低出价或暂停，先优化主图、价格与评价';
    suggested = cpc * 0.7;
  } else if (orders >= 2 && curAcos !== null) {
    if (curAcos > target * 1.15) {
      actionKey = 'lower'; action = 'ACOS 明显高于目标，建议降低出价，优先保留转化好的词';
      suggested = cpc * 0.8;
    } else if (curAcos < target * 0.8) {
      actionKey = 'raise'; action = 'ACOS 低于目标且已有订单，可适当提高出价争取更多流量';
      suggested = cpc * 1.12;
    }
  }
  return {
    breakeven_acos: breakeven === null ? null : R(breakeven, 1),
    target_cpc: targetCpc === null ? null : R(targetCpc, 2),
    suggested_cpc: R(suggested, 2),
    action, action_key: actionKey,
  };
}

// ─────────────────────────────────────────────────────────────
// 5) 搜索词批量分类
// rows: [{keyword, clicks, spend, orders, sales}]；target_acos 目标ACOS(%)
function classifySearchTerms(b) {
  const rows = Array.isArray(b.rows) ? b.rows : [];
  const target = num(b.target_acos, 30);
  const groups = { winner: [], keep: [], optimize: [], pause: [], observe: [] };
  let spend = 0, sales = 0, orders = 0, clicks = 0;
  for (const r0 of rows) {
    const r = {
      keyword: String(r0.keyword || '').trim(),
      clicks: num(r0.clicks, 0), spend: num(r0.spend, 0),
      orders: num(r0.orders, 0), sales: num(r0.sales, 0),
    };
    if (!r.keyword) continue;
    spend += r.spend; sales += r.sales; orders += r.orders; clicks += r.clicks;
    let acos = null, key;
    if (r.orders > 0) {
      acos = r.sales > 0 ? r.spend / r.sales * 100 : 999;
      if (acos <= target * 0.8) key = 'winner';
      else if (acos <= target * 1.1) key = 'keep';
      else key = 'optimize';
    } else if (r.clicks >= 12) key = 'pause';
    else key = 'observe';
    groups[key].push(Object.assign(r, { acos: acos === null ? null : R(acos, 1) }));
  }
  return {
    groups,
    totals: {
      clicks, orders,
      spend: R(spend, 2), sales: R(sales, 2),
      blended_acos: sales > 0 ? R(spend / sales * 100, 1) : null,
    },
    group_names: {
      winner: '优质词（可加预算/提价）', keep: '达标词（维持）',
      optimize: '待优化（降价）', pause: '建议暂停/否定', observe: '继续观察',
    },
  };
}

// ─────────────────────────────────────────────────────────────
// 6) 进口税费与到岸成本
// 输入：unit_cost 单件成本、inbound_freight 头程运费/件、duty_pct 关税(%)、
//       vat_pct 增值税(%)、customs_fee 清关费/件、last_mile 尾程/件、price 售价(可选)
function calcLandedCost(b) {
  const unitCost = num(b.unit_cost, 0);
  const inbound = num(b.inbound_freight, 0);
  const dutyPct = num(b.duty_pct, 0);
  const vatPct = num(b.vat_pct, 0);
  const customsFee = num(b.customs_fee, 0);
  const lastMile = num(b.last_mile, 0);
  const price = b.price === '' || b.price == null ? null : num(b.price, null);

  const customsValue = unitCost + inbound;
  const duty = customsValue * dutyPct / 100;
  const vatBase = customsValue + duty;
  const vat = vatBase * vatPct / 100;
  const landed = customsValue + duty + vat + customsFee + lastMile;
  return {
    customs_value: R(customsValue, 2),
    duty: R(duty, 2),
    vat: R(vat, 2),
    customs_fee: R(customsFee, 2),
    last_mile: R(lastMile, 2),
    landed_cost: R(landed, 2),
    price: price === null ? null : R(price, 2),
    landed_ratio: price ? R(landed / price * 100, 1) : null,
  };
}

// ─────────────────────────────────────────────────────────────
// 7) 供应商评估（7 因子，1-5）
function scoreSupplier(b) {
  const fields = {
    quality: ['质量稳定', 22], price: ['价格优势', 18], lead: ['交期保障', 14],
    moq: ['起订灵活', 10], cert: ['资质认证', 14], comm: ['沟通响应', 10], after: ['售后配合', 12],
  };
  const subs = {};
  for (const k of Object.keys(fields)) subs[k] = R(clamp(num(b[k], 3), 1, 5) / 5 * 100, 1);
  let total = 0;
  for (const k of Object.keys(fields)) total += subs[k] * fields[k][1];
  total = R(total / 100, 1);
  let tierKey, tier;
  if (total >= 80) { tierKey = 'priority'; tier = '优先合作'; }
  else if (total >= 65) { tierKey = 'ok'; tier = '可以合作'; }
  else if (total >= 50) { tierKey = 'review'; tier = '需要进一步考察'; }
  else { tierKey = 'caution'; tier = '谨慎选择'; }
  return {
    total, tier, tier_key: tierKey, sub_scores: subs,
    radar_indicators: Object.keys(fields).map((k) => [k, fields[k][0]]),
  };
}

// ─────────────────────────────────────────────────────────────
// 8) 达人合作计划
// 输入：creators 计划联系人数、reply_rate 回复率(%)、collab_rate 合作率(%)、
//       sample_cost 样品+运费/人、avg_views 达人平均播放、view_conv 播放转化率(%)、
//       aov 客单价、commission_pct 佣金(%)、margin_pct 商品毛利率(可选)
function planAffiliate(b) {
  const creators = num(b.creators, 0);
  const replyRate = num(b.reply_rate, 20);
  const collabRate = num(b.collab_rate, 30);
  const sampleCost = num(b.sample_cost, 0);
  const avgViews = num(b.avg_views, 0);
  const viewConv = num(b.view_conv, 0.2);
  const aov = num(b.aov, 0);
  const commissionPct = num(b.commission_pct, 15);
  const margin = b.margin_pct === '' || b.margin_pct == null ? null : num(b.margin_pct, null);

  const replies = creators * replyRate / 100;
  const collabs = replies * collabRate / 100;
  const sampleTotal = collabs * sampleCost;
  const views = collabs * avgViews;
  const orders = views * viewConv / 100;
  const gmv = orders * aov;
  const commission = gmv * commissionPct / 100;
  let gross = null, net = null;
  if (margin !== null) {
    gross = gmv * margin / 100;
    net = gross - commission - sampleTotal;
  }
  return {
    replies: R(replies, 1), collabs: R(collabs, 1),
    sample_cost: R(sampleTotal, 2), views: Math.round(views),
    orders: R(orders, 1), gmv: R(gmv, 2),
    commission: R(commission, 2),
    gross_profit: gross === null ? null : R(gross, 2),
    net: net === null ? null : R(net, 2),
    funnel: [
      ['creators', '联系达人', Math.round(creators)],
      ['replies', '获得回复', R(replies, 1)],
      ['collabs', '达成合作', R(collabs, 1)],
      ['orders', '带来订单', R(orders, 1)],
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// 9) 知识产权 / 合规风险快判（布尔回答）
function ipRiskVerdict(b) {
  const en = !!(b && (b.lang === 'en' || b.language === 'en'));
  const flags = [
    { key: 'brand', risk: '高', section: 'trademark', text: '使用了非自有品牌名称或他人商标', text_en: 'Uses a brand name or trademark you do not own' },
    { key: 'lookalike', risk: '高', section: 'patent', text: '外观或功能模仿知名产品，可能涉及外观或专利风险', text_en: 'Look or functions imitate a well-known product; design or patent risk is possible' },
    { key: 'character', risk: '高', section: 'copyright', text: '包含动漫、影视、游戏等形象或周边元素', text_en: 'Contains anime, film, TV, game characters or related licensed elements' },
    { key: 'patent', risk: '中', section: 'patent', text: '产品具有独特结构或功能，且未确认是否有在先专利', text_en: 'Unique structure or function; prior patents have not yet been confirmed' },
    { key: 'hazmat', risk: '中', section: 'hazmat', text: '含电池、液体、粉末、强磁等，可能属于需要审核的品类', text_en: 'Contains batteries, liquids, powders or magnets; may need category review' },
    { key: 'cert', risk: '中', section: 'cert', text: '带电、儿童、化妆品等品类缺少相应认证', text_en: 'Electrical, children’s or cosmetics categories lack the required certification' },
  ];
  const triggered = flags.filter((f) => b[f.key]).map((f) => ({
    key: f.key, risk: f.risk, text: en ? f.text_en : f.text, section: f.section,
  }));
  const high = triggered.filter((t) => t.risk === '高').length;
  let levelKey, level, advice;
  if (high > 0) {
    levelKey = 'high';
    level = en ? 'Higher risk' : '风险较高';
    advice = en ? 'Complete the relevant search and certification, and confirm no infringement before listing'
      : '建议先完成对应检索与认证，确认无侵权后再上架';
  } else if (triggered.length) {
    levelKey = 'mid';
    level = en ? 'Points to confirm' : '存在需要确认的事项';
    advice = en ? 'Confirm each item against the checklist and keep the search and certification records'
      : '建议对照清单逐项确认，保留检索与认证记录';
  } else {
    levelKey = 'low';
    level = en ? 'No obvious risk signals' : '未发现明显风险信号';
    advice = en ? 'Still run one IP and category-requirements check before listing'
      : '仍建议在上架前完成一次知识产权与品类要求核对';
  }
  return { triggered, level, level_key: levelKey, advice };
}

// ─────────────────────────────────────────────────────────────
// 10) 定价建议（目标利润 + 竞品价格带）
// 输入：cost 成本、referral_pct/payment_pct 平台费率(%)、other_unit 单件其他成本（包材/已分摊广告/运费）、
//       target_margin_pct 目标净利率(%)、comp_low/comp_mid/comp_high 竞品价格带（可空）
function priceAdvice(b) {
  const cost = num(b.cost);
  const rp = num(b.referral_pct);
  const pp = num(b.payment_pct);
  const other = num(b.other_unit);
  const tm = clamp(num(b.target_margin_pct, 30), 0, 95) / 100;
  const feeRate = (rp + pp) / 100;
  const base = cost + other;

  const at = (P) => {
    const fees = P * feeRate;
    const net = P - cost - fees - other;
    return { price: R(P), fees: R(fees), net: R(net), net_pct: P > 0 ? R((net / P) * 100) : 0 };
  };
  // 达到目标净利率所需价格：P*(1 - feeRate - tm)=base
  let targetPrice = 0;
  const denomT = 1 - feeRate - tm;
  if (denomT > 0) targetPrice = R(base / denomT);
  // 保本价（净利为0）：P*(1-feeRate)=base
  let breakEven = 0;
  const denomB = 1 - feeRate;
  if (denomB > 0) breakEven = R(base / denomB);

  const compLow = num(b.comp_low), compMid = b.comp_mid != null && b.comp_mid !== '' ? num(b.comp_mid) : 0, compHigh = num(b.comp_high);
  const hasComp = compLow > 0;

  // 利润曲线：以目标价（或竞品中位）为中心 ±30%
  const center = targetPrice > 0 ? targetPrice : (compMid || breakEven || cost * 1.5);
  const curve = [];
  const steps = 13;
  for (let i = 0; i < steps; i += 1) {
    const P = center * (0.7 + (0.6 * i) / (steps - 1));
    const r = at(P);
    curve.push({ price: r.price, net: r.net, net_pct: r.net_pct });
  }

  let positionKey = 'no_comp';
  let suggested = targetPrice;
  if (hasComp) {
    if (targetPrice < compLow) {
      positionKey = 'below_band';
      // 既能达成目标又有提价空间：建议贴近竞品低位（获得更多利润），但不超过
      suggested = R(Math.max(targetPrice, compLow));
    } else if (compHigh > 0 && targetPrice > compHigh) {
      positionKey = 'above_band';
      suggested = R(compHigh); // 跟到竞品上沿；仍达不到目标则需降本或差异化
    } else {
      positionKey = 'in_band';
      suggested = targetPrice;
    }
  }
  const suggestedRow = at(suggested);

  return {
    fee_rate_pct: R((rp + pp)),
    target_price: targetPrice,
    break_even: breakEven,
    target_margin_pct: R(tm * 100),
    comp_low: compLow || 0, comp_mid: compMid || 0, comp_high: compHigh || 0,
    position_key: positionKey,
    suggested_price: R(suggested),
    suggested_net: suggestedRow.net,
    suggested_net_pct: suggestedRow.net_pct,
    curve,
  };
}

module.exports = {
  scoreOpportunity, forecastReplenishment, calcTacos, bidRule,
  classifySearchTerms, calcLandedCost, scoreSupplier, planAffiliate, ipRiskVerdict,
  priceAdvice,
};
