// 确定性财务计算 · 灵感引擎工坊 · bin1732
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const r1 = (n) => Math.round((n + Number.EPSILON) * 10) / 10;
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function calcProfit(raw) {
  const q = {
    selling_price: num(raw.selling_price),
    product_cost: num(raw.product_cost),
    domestic_shipping: num(raw.domestic_shipping),
    international_shipping: num(raw.international_shipping),
    platform_fee_pct: num(raw.platform_fee_pct),
    payment_fee_pct: num(raw.payment_fee_pct),
    ad_cost: num(raw.ad_cost),
    refund_rate_pct: num(raw.refund_rate_pct),
    packaging_cost: num(raw.packaging_cost),
  };
  const platformFee = q.selling_price * (q.platform_fee_pct / 100);
  const paymentFee = q.selling_price * (q.payment_fee_pct / 100);
  const refundLoss =
    (q.selling_price - q.product_cost - q.domestic_shipping - q.international_shipping) *
    (q.refund_rate_pct / 100);
  const totalCost =
    q.product_cost + q.domestic_shipping + q.international_shipping +
    platformFee + paymentFee + q.ad_cost + q.packaging_cost + refundLoss;
  const profit = q.selling_price - totalCost;
  const margin = q.selling_price > 0 ? (profit / q.selling_price) * 100 : 0;

  const breakevenCost =
    q.product_cost + q.domestic_shipping + q.international_shipping +
    q.ad_cost + q.packaging_cost;
  const totalFeePct = (q.platform_fee_pct + q.payment_fee_pct) / 100;
  const breakevenPrice = totalFeePct < 1 ? breakevenCost / (1 - totalFeePct) : 0;

  // 盈亏平衡退货率：退货损失把利润吃到 0 时的退货率
  const refundBase =
    q.selling_price - q.product_cost - q.domestic_shipping - q.international_shipping;
  const profitNoRefund =
    q.selling_price - q.product_cost - q.domestic_shipping - q.international_shipping -
    platformFee - paymentFee - q.ad_cost - q.packaging_cost;
  let breakevenRefundRate = null;
  if (refundBase > 0) {
    const r = (profitNoRefund / refundBase) * 100;
    breakevenRefundRate = r1(Math.max(0, Math.min(100, r)));
  }

  return {
    selling_price: r2(q.selling_price),
    total_cost: r2(totalCost),
    profit: r2(profit),
    margin_pct: r1(margin),
    breakeven_price: r2(breakevenPrice),
    breakeven_refund_rate: breakevenRefundRate,
    cost_breakdown: {
      product_cost: r2(q.product_cost),
      domestic_shipping: r2(q.domestic_shipping),
      international_shipping: r2(q.international_shipping),
      platform_fee: r2(platformFee),
      payment_fee: r2(paymentFee),
      ad_cost: r2(q.ad_cost),
      packaging_cost: r2(q.packaging_cost),
      refund_loss: r2(refundLoss),
    },
    is_profitable: profit > 0,
  };
}

function calcAcos(raw) {
  const q = {
    cpc: num(raw.cpc),
    cvr: num(raw.cvr),
    selling_price: num(raw.selling_price),
    product_cost: num(raw.product_cost),
    other_fees_pct: num(raw.other_fees_pct),
    target_acos: num(raw.target_acos) || 30,
  };
  const cvr = q.cvr / 100;
  const costPerOrder = cvr > 0 ? q.cpc / cvr : 9999;
  const acos = q.selling_price > 0 ? (costPerOrder / q.selling_price) * 100 : 0;
  const grossMargin = q.selling_price > 0
    ? (1 - q.product_cost / q.selling_price - q.other_fees_pct / 100) * 100 : 0;
  const target = q.target_acos || 30;
  return {
    cost_per_order: r2(costPerOrder),
    acos_pct: r1(acos),
    gross_margin_pct: r1(grossMargin),
    breakeven_acos: r1(grossMargin),
    target_acos: target,
    ad_profitable: acos < grossMargin,
    suggestion:
      `当前ACOS ${r1(acos)}%，盈亏平衡线 ${r1(grossMargin)}%。` +
      (acos < target ? '广告盈利，可加大投放。' : '广告超标，需优化关键词或降低CPC。'),
  };
}

// ── 从自然语言中确定性提取计算参数（模型未调用工具时的兜底） ──
function findNum(text, regexes) {
  for (const re of regexes) {
    const m = text.match(re);
    if (m) { const n = Number(m[1]); if (Number.isFinite(n)) return r2(n); }
  }
  return null;
}
const GAP = '[^0-9%]{0,8}?';
const N = '(\\d+(?:\\.\\d+)?)';

function parseProfitCard(rawText) {
  const t = String(rawText || '');
  const selling_price = findNum(t, [
    new RegExp('(?:售价|卖价|定价|单价|selling\\s*price|sale?\\s*price|price)' + GAP + N, 'i'),
    new RegExp('卖\\s*' + N),
  ]);
  const product_cost = findNum(t, [
    new RegExp('(?:商品成本|进货价|采购价|拿货价|进价|成本|product\\s*cost|cost)' + GAP + N, 'i'),
  ]);
  const vals = {
    selling_price: selling_price || 0,
    product_cost: product_cost || 0,
    platform_fee_pct: findNum(t, [
      new RegExp('(?:平台佣金|佣金率|平台扣点|平台抽成|佣金|commission\\s*rate|commission)' + GAP + N, 'i')]) || 0,
    payment_fee_pct: findNum(t, [
      new RegExp('(?:支付手续费|支付费率|支付费|payment\\s*fee)' + GAP + N, 'i')]) || 0,
    domestic_shipping: findNum(t, [
      new RegExp('(?:国内运费|国内快递|domestic\\s*shipping)' + GAP + N, 'i')]) || 0,
    international_shipping: findNum(t, [
      new RegExp('(?:国际运费|头程运费|头程|国际快递|international\\s*shipping)' + GAP + N, 'i')]) || 0,
    ad_cost: findNum(t, [
      new RegExp('(?:广告费|广告花费|广告成本|ad\\s*(?:cost|spend))' + GAP + N, 'i')]) || 0,
    packaging_cost: findNum(t, [
      new RegExp('(?:包装费|包装成本|包装|packaging)' + GAP + N, 'i')]) || 0,
    refund_rate_pct: findNum(t, [
      new RegExp('(?:退款率|退货率|refund\\s*rate|return\\s*rate)' + GAP + N, 'i')]) || 0,
  };
  if (!selling_price && !product_cost) return null;
  return { kind: 'profit', vals };
}

function parseAcosCard(rawText) {
  const t = String(rawText || '');
  const selling_price = findNum(t, [
    new RegExp('(?:售价|卖价|定价|单价|selling\\s*price|price)' + GAP + N, 'i')]);
  const product_cost = findNum(t, [
    new RegExp('(?:商品成本|进货价|成本|product\\s*cost|cost)' + GAP + N, 'i')]);
  const vals = {
    cpc: findNum(t, [
      new RegExp('(?:单次点击花费|单次点击费用|单次点击价格|单次点击|每次点击花费|每次点击费用|每次点击|点击花费|点击价格|cpc)' + GAP + N, 'i')]) || 0,
    cvr: findNum(t, [
      new RegExp('(?:转化率|cvr|conversion\\s*rate)' + GAP + N, 'i')]) || 0,
    selling_price: selling_price || 0,
    product_cost: product_cost || 0,
    other_fees_pct: findNum(t, [
      new RegExp('(?:其他费率|其他费用率|other\\s*fees?)' + GAP + N, 'i')]) || 0,
    target_acos: findNum(t, [
      new RegExp('(?:目标\\s*acos|target\\s*acos)' + GAP + N, 'i')]) || 0,
  };
  if (!vals.cpc && !(selling_price && product_cost)) return null;
  return { kind: 'acos', vals };
}

// 退货率—利润敏感性序列
function refundSeries(raw) {
  const rates = [], profits = [], margins = [];
  for (let i = 0; i <= 20; i++) {
    const rate = i * 2; // 0% .. 40%
    const r = calcProfit(Object.assign({}, raw, { refund_rate_pct: rate }));
    rates.push(rate); profits.push(r.profit); margins.push(r.margin_pct);
  }
  const base = calcProfit(raw);
  return { rates, profits, margins, breakeven_refund_rate: base.breakeven_refund_rate };
}

module.exports = { calcProfit, calcAcos, parseProfitCard, parseAcosCard, refundSeries };
