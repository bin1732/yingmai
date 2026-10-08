// 盈脉 · 电商工作台经营工具集（机会评分 / 补货 / 广告 / 到岸成本 / 供应商 / 达人 / 合规 / 数据连接）
// 灵感引擎工坊 · bin1732
(function () {
  'use strict';

  const curLang = () => (typeof currentLang !== 'undefined' ? currentLang : 'zh');

  // ── 双语文案 ──
  const D = {
    opportunity: { zh: '选品机会评分', en: 'Product Opportunity Score' },
    opportunity_intro: { zh: '根据需求、竞争、利润、侵权安全等因素综合评分，结果由您填写的信息计算，用于辅助判断。', en: 'A score built from demand, competition, margin and IP safety using the values you enter, to support your decision.' },
    keepa: { zh: '商品数据查询（Keepa）', en: 'Product Data (Keepa)' },
    keepa_intro: { zh: '输入 Keepa 访问密钥后，可查询商品价格、销售排名、评分与月销量等真实数据。该服务为第三方订阅。', en: 'With a Keepa key you can retrieve real price, sales-rank, rating and monthly-sales data. This is a third-party subscription.' },
    get_keepa: { zh: '获取 Keepa 访问密钥', en: 'Get a Keepa key' },
    replenish: { zh: '销量预测与补货建议', en: 'Demand Forecast & Replenishment' },
    replenish_intro: { zh: '根据日均销量、到货周期与波动，计算安全库存、再订货点与建议采购量。', en: 'Calculates safety stock, reorder point and suggested order quantity from daily sales, lead time and variability.' },
    sourcing: { zh: '1688 寻源与打样', en: 'Sourcing & Sampling on 1688' },
    supplier_score: { zh: '供应商评估', en: 'Supplier Evaluation' },
    supplier_intro: { zh: '从质量、价格、交期、起订量、资质、沟通与售后七个方面评估供应商。', en: 'Evaluate suppliers on quality, price, lead time, MOQ, certification, communication and after-sales.' },
    cloud_image: { zh: '商品配图生成', en: 'Product Image Generation' },
    cloud_image_intro: { zh: '接入支持图像的云端模型后，可按描述生成商品配图。内置助手不支持生成图片。', en: 'Generate product images from a description after connecting a cloud model that supports images. The built-in assistant cannot generate images.' },
    tacos: { zh: 'TACoS 与广告占比', en: 'TACoS & Ad Ratio' },
    tacos_intro: { zh: '计算广告销售成本占比（ACOS）、总广告销售成本占比（TACoS）与自然订单占比。', en: 'Calculates ACOS, TACoS and the share of organic orders.' },
    bid: { zh: '关键词竞价建议', en: 'Keyword Bid Suggestion' },
    bid_intro: { zh: '根据转化、毛利与当前表现，给出维持、提高、降低或暂停的确定性建议。', en: 'Gives a deterministic hold, raise, lower or pause suggestion from conversion, margin and current performance.' },
    searchterms: { zh: '搜索词批量分类', en: 'Search-Term Bulk Classification' },
    searchterms_intro: { zh: '每行一条，格式：关键词,点击,花费,订单,销售额。系统按目标 ACOS 自动分组。', en: 'One per line in the format keyword,clicks,spend,orders,sales. Terms are grouped against your target ACOS.' },
    landed: { zh: '进口税费与到岸成本', en: 'Landed Cost & Import Fees' },
    landed_intro: { zh: '计算单件商品的关税、增值税、清关费与尾程，得到到岸成本。', en: 'Calculates duty, VAT, customs fees and last-mile cost per unit to give the landed cost.' },
    fx: { zh: '实时汇率换算', en: 'Live Exchange Rates' },
    fx_intro: { zh: '免费获取实时汇率；网络不可用时可使用手工汇率。', en: 'Free live rates; you can use a manual rate if the network is unavailable.' },
    ipverdict: { zh: '知识产权与合规自查', en: 'IP & Compliance Self-Check' },
    ipverdict_intro: { zh: '勾选符合的情况，快速识别需要进一步确认的知识产权或品类事项。', en: 'Tick the items that apply to quickly identify IP or category points to verify.' },
    refs: { zh: '官方检索与查询入口', en: 'Official Search & Reference Tools' },
    affiliate_plan: { zh: '达人合作计划测算', en: 'Creator Collaboration Estimator' },
    affiliate_intro: { zh: '根据联系人数、回复与合作比例，估算样品成本、成交、销售额与净贡献。', en: 'Estimates sample cost, orders, sales and net contribution from outreach volume and response rates.' },
    reimbursement: { zh: '平台赔偿与对账', en: 'Reimbursement & Reconciliation' },
    reimbursement_intro: { zh: '定期核对入仓后丢失或残损的库存，并查看平台赔偿报告。', en: 'Regularly reconcile inventory lost or damaged after intake and review platform reimbursement reports.' },

    launch: { zh: '卖前体检', en: 'Pre-Launch Readiness' },
    launch_intro: { zh: '在备货、上架前，按主体资质、类目、品牌、认证、标签与物流逐项核对，提前发现需要补齐的材料或门槛。', en: 'Before stocking or listing, check business entity, category, brand, certification, labeling and logistics to find documents or gates to prepare early.' },
    launch_run: { zh: '生成体检报告', en: 'Generate readiness report' },
    launch_gates: { zh: '逐项核对结果', en: 'Gate-by-gate results' },
    launch_docs: { zh: '需要准备的材料', en: 'Documents to prepare' },
    launch_form: { zh: '信息填写', en: 'Information' },
    launch_result: { zh: '体检报告', en: 'Readiness report' },
    launch_verify_tag: { zh: '需以官方最新规则核实', en: 'Verify against latest official rules' },
    launch_official: { zh: '查看平台官方规则', en: 'View official platform rules' },
    platform: { zh: '经营平台', en: 'Platform' },
    applicant: { zh: '经营主体', en: 'Business entity type' },
    ap_individual: { zh: '个人', en: 'Individual' },
    ap_sole: { zh: '个体工商户', en: 'Sole proprietor' },
    ap_enterprise: { zh: '企业/工作室', en: 'Company / Studio' },
    target_market: { zh: '目标市场', en: 'Target market' },
    mk_US: { zh: '美国', en: 'United States' }, mk_EU: { zh: '欧盟', en: 'European Union' },
    mk_UK: { zh: '英国', en: 'United Kingdom' }, mk_JP: { zh: '日本', en: 'Japan' },
    mk_SEA: { zh: '东南亚', en: 'Southeast Asia' }, mk_Other: { zh: '其他', en: 'Other' },
    f_category: { zh: '商品类目', en: 'Product category' },
    cat_general: { zh: '普通日用', en: 'General goods' }, cat_electronics: { zh: '电子产品', en: 'Electronics' },
    cat_battery: { zh: '纯电池/充电宝', en: 'Standalone battery / power bank' }, cat_food: { zh: '食品', en: 'Food' },
    cat_cosmetics: { zh: '化妆品', en: 'Cosmetics' }, cat_medical: { zh: '医疗器械', en: 'Medical devices' },
    cat_books: { zh: '图书/音像', en: 'Books / media' }, cat_toys: { zh: '玩具', en: 'Toys' },
    cat_clothing: { zh: '服装', en: 'Apparel' },
    f_brand: { zh: '品牌情况', en: 'Brand status' },
    br_none: { zh: '无品牌/白牌', en: 'No brand / white label' },
    br_own: { zh: '自有注册商标', en: 'Own registered trademark' },
    br_authorized: { zh: '他人品牌（有授权）', en: 'Others’ brand (authorized)' },
    cb_conformity: { zh: '已准备符合性认证/检测报告', en: 'Conformity certificate/test report ready' },
    cb_battery: { zh: '含电池或强磁、液体等特殊属性', en: 'Contains battery, strong magnet, liquid or other special attributes' },

    price: { zh: '定价建议', en: 'Pricing Advisor' },
    price_intro: { zh: '结合成本、平台费率、目标利润率与竞品价格带，给出建议售价与利润曲线。', en: 'Suggests a price and shows a profit curve using cost, platform fees, target margin and the competitor price band.' },
    price_run: { zh: '生成定价建议', en: 'Generate pricing advice' },
    f_otherunit: { zh: '单件其他成本（包材/已分摊广告/运费）', en: 'Other cost per unit (packaging / allocated ads / shipping)' },
    f_referral: { zh: '平台佣金费率（%）', en: 'Referral fee (%)' },
    f_payment: { zh: '支付手续费率（%）', en: 'Payment fee (%)' },
    f_targetmargin: { zh: '目标净利率（%）', en: 'Target net margin (%)' },
    f_complow: { zh: '竞品低价', en: 'Competitor low' },
    f_compmid: { zh: '竞品中位价', en: 'Competitor mid' },
    f_comphigh: { zh: '竞品高价', en: 'Competitor high' },
    price_fillfees: { zh: '按所选平台参考费率填充', en: 'Fill from selected platform reference fees' },
    pr_target: { zh: '达到目标净利率的价格', en: 'Price for target net margin' },
    pr_breakeven: { zh: '保本价', en: 'Break-even price' },
    pr_suggested: { zh: '建议售价', en: 'Suggested price' },
    pr_suggested_net: { zh: '建议售价下净利率', en: 'Net margin at suggested price' },
    pr_pos_below: { zh: '目标利润价低于竞品价格带：可在达成目标利润的同时保持价格优势，也可贴近竞品低位以获得更多利润。', en: 'The target-margin price is below the competitor band: you can hit your target margin while staying cheaper, or price near the competitor low for more margin.' },
    pr_pos_in: { zh: '目标利润价处于竞品价格带内，按建议售价可达成目标净利率。', en: 'The target-margin price is within the competitor band; the suggested price achieves your target margin.' },
    pr_pos_above: { zh: '目标利润价高于竞品价格带：仅靠跟价难以达成目标利润，建议降低成本、做出差异化，或重新评估目标利润率。', en: 'The target-margin price is above the competitor band: matching prices will not hit your target. Lower cost, differentiate, or revisit the target margin.' },
    pr_pos_none: { zh: '未填写竞品价格带，建议售价按目标净利率计算；如补充竞品价格可进一步校准。', en: 'No competitor band entered; the suggested price is computed from your target margin. Add competitor prices to refine it.' },
    price_curve: { zh: '价格—利润曲线', en: 'Price–Profit Curve' },
    price_net: { zh: '单件净利', en: 'Net per unit' },
    price_netpct: { zh: '净利率（%）', en: 'Net margin (%)' },
    price_axis: { zh: '售价', en: 'Price' },
    example_tag: { zh: '示例', en: 'Example' },

    // 字段
    f_demand: { zh: '需求强度', en: 'Demand' },
    f_reviews: { zh: '头部商品评论数', en: 'Top listings review count' },
    f_rating: { zh: '头部商品评分', en: 'Top listings rating' },
    f_cost: { zh: '采购成本', en: 'Purchase cost' },
    f_price: { zh: '计划售价', en: 'Planned price' },
    f_season: { zh: '全年可售度', en: 'Year-round sellability' },
    f_ip: { zh: '侵权风险', en: 'Infringement risk' },
    f_logi: { zh: '物流便利度', en: 'Logistics convenience' },
    f_barrier: { zh: '进入容易度', en: 'Ease of entry' },
    f_key: { zh: '访问密钥', en: 'Access key' },
    f_domain: { zh: '站点', en: 'Site' },
    f_asin: { zh: 'ASIN', en: 'ASIN' },
    f_avg: { zh: '日均销量', en: 'Average daily sales' },
    f_lead: { zh: '到货周期（天）', en: 'Lead time (days)' },
    f_sl: { zh: '服务水平', en: 'Service level' },
    f_cv: { zh: '销量波动系数', en: 'Demand variability (CV)' },
    f_stock: { zh: '当前库存', en: 'Current stock' },
    f_moq: { zh: '起订量', en: 'MOQ' },
    f_cover: { zh: '期望覆盖天数', en: 'Desired coverage days' },
    f_prompt: { zh: '图片描述', en: 'Image description' },
    f_size: { zh: '图片尺寸', en: 'Image size' },
    f_imgmodel: { zh: '图像模型名称', en: 'Image model name' },
    f_spend: { zh: '广告花费', en: 'Ad spend' },
    f_total: { zh: '总销售额', en: 'Total sales' },
    f_adsales: { zh: '广告销售额', en: 'Ad-attributed sales' },
    f_proj: { zh: '下期预计总销售额', en: 'Projected total sales' },
    f_target: { zh: '目标 ACOS（%）', en: 'Target ACOS (%)' },
    f_margin: { zh: '毛利率（%，可选）', en: 'Margin (%) optional' },
    f_cpc: { zh: '当前出价', en: 'Current bid' },
    f_cvr: { zh: '转化率（%）', en: 'Conversion rate (%)' },
    f_other: { zh: '其他费用（%）', en: 'Other fees (%)' },
    f_curacos: { zh: '当前 ACOS（%，可选）', en: 'Current ACOS (%) optional' },
    f_clicks: { zh: '点击数', en: 'Clicks' },
    f_orders: { zh: '订单数', en: 'Orders' },
    f_unit: { zh: '单件采购成本', en: 'Unit purchase cost' },
    f_inbound: { zh: '头程运费/件', en: 'Inbound freight per unit' },
    f_duty: { zh: '关税（%）', en: 'Duty (%)' },
    f_vat: { zh: '增值税（%）', en: 'VAT (%)' },
    f_fee: { zh: '清关费/件', en: 'Customs fee per unit' },
    f_last: { zh: '尾程/件', en: 'Last-mile per unit' },
    f_base: { zh: '基准货币', en: 'Base currency' },
    f_creators: { zh: '计划联系人数', en: 'Creators to contact' },
    f_reply: { zh: '回复率（%）', en: 'Reply rate (%)' },
    f_collab: { zh: '合作率（%）', en: 'Collaboration rate (%)' },
    f_sample: { zh: '样品+运费/人', en: 'Sample + shipping per person' },
    f_views: { zh: '达人平均播放', en: 'Average views per creator' },
    f_conv: { zh: '播放转化率（%）', en: 'View-to-order rate (%)' },
    f_aov: { zh: '客单价', en: 'Average order value' },
    f_commission: { zh: '佣金（%）', en: 'Commission (%)' },
    f_sttarget: { zh: '目标 ACOS（%）', en: 'Target ACOS (%)' },
    f_rows: { zh: '搜索词数据', en: 'Search-term data' },

    calc: { zh: '开始计算', en: 'Calculate' },
    query: { zh: '开始查询', en: 'Query' },
    generate: { zh: '开始生成', en: 'Generate' },
    example: { zh: '示例', en: 'Example' },
    total_score: { zh: '综合评分', en: 'Overall score' },
    margin_pct: { zh: '毛利率', en: 'Margin' },
    cur_price: { zh: '当前价格', en: 'Current price' },
    avg30: { zh: '30 天均价', en: '30-day avg price' },
    avg90: { zh: '90 天均价', en: '90-day avg price' },
    avg180: { zh: '180 天均价', en: '180-day avg price' },
    cur_bsr: { zh: '当前销售排名', en: 'Current BSR' },
    bsr30: { zh: '30 天平均排名', en: '30-day avg BSR' },
    bsr90: { zh: '90 天平均排名', en: '90-day avg BSR' },
    bsr180: { zh: '180 天平均排名', en: '180-day avg BSR' },
    monthly: { zh: '月销量估算', en: 'Est. monthly sales' },
    rating: { zh: '评分', en: 'Rating' },
    rcnt: { zh: '评分人数', en: 'Rating count' },
    bsr_curve: { zh: '销售排名走势', en: 'BSR trend' },
    safety: { zh: '安全库存', en: 'Safety stock' },
    lead_demand: { zh: '到货周期需求', en: 'Lead-time demand' },
    reorder: { zh: '再订货点', en: 'Reorder point' },
    suggested: { zh: '建议采购量', en: 'Suggested order qty' },
    cover_now: { zh: '当前库存可售天数', en: 'Days of stock remaining' },
    stockout: { zh: '预计缺货日期', en: 'Estimated stockout date' },
    need_reorder: { zh: '需要补货', en: 'Reorder needed' },
    stock_proj: { zh: '库存投影', en: 'Inventory projection' },
    without: { zh: '不补货', en: 'Without order' },
    withorder: { zh: '本次补货后', en: 'With order' },
    acos: { zh: 'ACOS', en: 'ACOS' },
    tacos: { zh: 'TACoS', en: 'TACoS' },
    organic: { zh: '自然订单占比', en: 'Organic share' },
    target_spend: { zh: '目标广告花费', en: 'Target ad spend' },
    relation: { zh: '与毛利关系', en: 'Relation to margin' },
    breakeven: { zh: '保本 ACOS', en: 'Breakeven ACOS' },
    target_cpc: { zh: '目标出价', en: 'Target CPC' },
    suggested_cpc: { zh: '建议出价', en: 'Suggested CPC' },
    action: { zh: '操作建议', en: 'Recommended action' },
    customs_value: { zh: '完税价格', en: 'Customs value' },
    duty: { zh: '关税', en: 'Duty' },
    vat: { zh: '增值税', en: 'VAT' },
    customs_fee: { zh: '清关费', en: 'Customs fee' },
    last_mile: { zh: '尾程', en: 'Last mile' },
    landed_cost: { zh: '到岸成本', en: 'Landed cost' },
    landed_ratio: { zh: '到岸成本占售价比', en: 'Landed cost / price' },
    replies: { zh: '预计回复', en: 'Expected replies' },
    collabs: { zh: '预计合作', en: 'Expected collaborations' },
    sample_cost: { zh: '样品总成本', en: 'Total sample cost' },
    views: { zh: '预计播放', en: 'Expected views' },
    p_orders: { zh: '预计订单', en: 'Expected orders' },
    gmv: { zh: '预计销售额', en: 'Expected GMV' },
    commission: { zh: '预计佣金', en: 'Expected commission' },
    net: { zh: '预计净贡献', en: 'Expected net contribution' },
    funnel: { zh: '合作漏斗', en: 'Collaboration funnel' },
    updated: { zh: '更新时间', en: 'Updated' },
    groups: {
      winner: { zh: '优质词（可加预算/提价）', en: 'Winners (raise budget/bid)' },
      keep: { zh: '达标词（维持）', en: 'Keep (hold)' },
      optimize: { zh: '待优化（降价）', en: 'Optimize (lower)' },
      pause: { zh: '建议暂停/否定', en: 'Pause / negate' },
      observe: { zh: '继续观察', en: 'Keep observing' },
    },
    blended: { zh: '整体 ACOS', en: 'Blended ACOS' },
    none: { zh: '暂无数据', en: 'No data' },

    // 合规勾选项
    cb_brand: { zh: '使用了非自有品牌名称或他人商标', en: 'Uses a brand name or trademark I do not own' },
    cb_lookalike: { zh: '外观或功能模仿知名产品', en: 'Design or function imitates a known product' },
    cb_character: { zh: '包含动漫、影视、游戏等形象', en: 'Contains anime, film or game characters' },
    cb_patent: { zh: '产品有独特结构或功能，未确认在先专利', en: 'Unique structure/function with no prior-patent check' },
    cb_hazmat: { zh: '含电池、液体、粉末、强磁等', en: 'Contains batteries, liquids, powders or magnets' },
    cb_cert: { zh: '带电、儿童、化妆品等缺少认证', en: 'Missing certification for electronic/child/cosmetic items' },
    level: { zh: '判断结果', en: 'Result' },
    advice: { zh: '建议', en: 'Advice' },
  };

  const t = (k) => {
    const e = D[k];
    if (!e) return k;
    return e[curLang()] || e.zh;
  };

  // ── 工具函数 ──
  function cssVar(n) {
    return getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  }
  function theme() {
    return {
      text: cssVar('--text-secondary') || '#64748b',
      border: cssVar('--border') || '#e2e8f0',
      bg: cssVar('--bg-elevated') || '#ffffff',
      accent: cssVar('--accent') || '#4f46e5',
      green: '#22c55e', orange: '#f59e0b', red: '#ef4444', purple: '#8b5cf6',
    };
  }
  async function post(url, body) {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
    });
    let j = null;
    try { j = await r.json(); } catch {}
    if (!r.ok) {
      const msg = j && (j.detail || j.error) ? (j.detail || j.error) : ('HTTP ' + r.status);
      throw new Error(msg);
    }
    return j;
  }
  function numVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
  function checked(id) {
    const el = document.getElementById(id);
    return !!(el && el.checked);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function opts1to5(labels, dflt) {
    let s = '';
    for (let i = 1; i <= 5; i++) s += `<option value="${i}" ${i === (dflt || 1) ? 'selected' : ''}>${i} · ${esc(labels[i - 1])}</option>`;
    return s;
  }
  // 通用 1-5 档位文案
  Object.assign(D, {
    g5w1: { zh: '很弱', en: 'Very low' }, g5w2: { zh: '较弱', en: 'Low' },
    g5w3: { zh: '一般', en: 'Medium' }, g5w4: { zh: '较强', en: 'High' },
    g5w5: { zh: '很强', en: 'Very high' },
    g5ip1: { zh: '风险高', en: 'High risk' }, g5ip2: { zh: '风险较高', en: 'Fairly high' },
    g5ip3: { zh: '不确定', en: 'Unsure' }, g5ip4: { zh: '较安全', en: 'Fairly safe' },
    g5ip5: { zh: '安全', en: 'Safe' },
  });

  // ── 图表 ──
  const charts = {};      // id -> echarts instance
  const drawers = {};    // id -> closure to redraw with current theme
  function drawChart(id, optionBuilder) {
    const dom = document.getElementById(id);
    if (!dom || typeof echarts === 'undefined') return;
    // 容器可能在页面重渲染后被替换：以当前 DOM 为准，失效则重建实例
    let inst = echarts.getInstanceByDom(dom) || charts[id];
    if (!inst || inst.getDom() !== dom || !dom.isConnected) {
      if (inst && inst !== echarts.getInstanceByDom(dom)) { try { inst.dispose(); } catch {} }
      inst = echarts.init(dom);
    }
    charts[id] = inst;
    inst.setOption(optionBuilder(theme()), true);
    drawers[id] = () => {
      const d = document.getElementById(id);
      if (!d) return;
      let c = echarts.getInstanceByDom(d) || charts[id];
      if (!c || c.getDom() !== d || !d.isConnected) {
        if (c && c !== echarts.getInstanceByDom(d)) { try { c.dispose(); } catch {} }
        c = echarts.init(d); charts[id] = c;
      }
      c.setOption(optionBuilder(theme()), true);
    };
  }
  function restyleCharts() {
    Object.keys(drawers).forEach((id) => {
      if (document.getElementById(id)) { try { drawers[id](); } catch {} }
    });
  }
  const baseGrid = { left: 48, right: 20, top: 36, bottom: 40, containLabel: true };
  function axis(th) {
    return {
      axisLine: { lineStyle: { color: th.border } },
      axisLabel: { color: th.text },
      splitLine: { lineStyle: { color: th.border, type: 'dashed' } },
    };
  }

  // ── 卡片外壳 ──
  function card(title, intro, body, extraClass) {
    return `<div class="card tk-card ${extraClass || ''}">
      <h3>${esc(title)}</h3>
      ${intro ? `<p class="tk-intro">${esc(intro)}</p>` : ''}
      ${body}
    </div>`;
  }
  function field(label, input, example) {
    return `<div class="form-group">
      <label>${esc(label)}</label>${input}
      ${example ? `<div class="tk-example">${esc(t('example'))}：${esc(example)}</div>` : ''}
    </div>`;
  }
  const numIn = (id, dflt) => `<input type="number" step="any" id="${id}" value="${esc(dflt == null ? '' : dflt)}" placeholder="${esc(dflt == null ? '' : dflt)}">`;
  const sel = (id, options) => `<select id="${id}">${options}</select>`;

  function rows2(items) {
    return `<div class="tk-grid2">${items.join('')}</div>`;
  }
  function kv(th, label, value, color) {
    return `<div class="tk-kv"><span>${esc(label)}</span><b style="${color ? `color:${color}` : ''}">${value == null ? '—' : esc(value)}</b></div>`;
  }

  // ── toolkits 数据缓存 ──
  let toolkitsCache = null;
  async function loadToolkits() {
    if (toolkitsCache) return toolkitsCache;
    try { toolkitsCache = await (await fetch('/api/data/toolkits')).json(); }
    catch { toolkitsCache = {}; }
    return toolkitsCache;
  }
  function toolkitSection(key) {
    const s = toolkitsCache[key];
    if (!s) return '';
    const L = curLang();
    const title = L === 'zh' ? s.title_zh : s.title_en;
    const intro = L === 'zh' ? s.intro_zh : s.intro_en;
    const items = (s.items || []).map((it) => {
      const text = L === 'zh' ? it.zh : it.en;
      if (it.url) return `<li><a href="#" data-ext="${esc(it.url)}">${esc(text)}</a></li>`;
      return `<li>${esc(text)}</li>`;
    }).join('');
    return `<div class="tk-refbox"><div class="tk-ref-title">${esc(title)}</div>
      <p class="tk-intro">${esc(intro)}</p><ul class="tk-reflist">${items}</ul></div>`;
  }

  // ═══════════════════════════════════════════════════════════
  // 选品页：机会评分 + Keepa
  // ═══════════════════════════════════════════════════════════
  function renderSelection() {
    const host = document.getElementById('tkHost-selection');
    if (!host) return;
    const labels5 = [t('g5w1'), t('g5w2'), t('g5w3'), t('g5w4'), t('g5w5')];
    const ipLabels = [t('g5ip1'), t('g5ip2'), t('g5ip3'), t('g5ip4'), t('g5ip5')];

    const oppBody = rows2([
      field(t('f_demand'), sel('tk_opp_demand', opts1to5(labels5, 4))),
      field(t('f_reviews'), numIn('tk_opp_reviews', '300'), '300'),
      field(t('f_rating'), numIn('tk_opp_rating', '4.3'), '4.3'),
      field(t('f_cost'), numIn('tk_opp_cost', '20'), '20'),
      field(t('f_price'), numIn('tk_opp_price', '69.9'), '69.9'),
      field(t('f_season'), sel('tk_opp_season', opts1to5(labels5, 4))),
      field(t('f_ip'), sel('tk_opp_ip', opts1to5(ipLabels, 2))),
      field(t('f_logi'), sel('tk_opp_logi', opts1to5(labels5, 4))),
      field(t('f_barrier'), sel('tk_opp_barrier', opts1to5(labels5, 4))),
    ]) + `<button class="btn btn-primary" id="tk_opp_btn">${t('calc')}</button>
      <div id="tk_opp_res" class="tk-result"></div>
      <div id="tk_opp_chart" class="tk-chart"></div>`;

    const domainOpts = Object.keys(keepaDomains()).map((k) =>
      `<option value="${k}">${esc(keepaDomains()[k][curLang() === 'zh' ? 0 : 1] || keepaDomains()[k][0])}</option>`).join('');
    const keepaBody = rows2([
      field(t('f_domain'), sel('tk_keepa_domain', domainOpts)),
      field(t('f_asin'), `<input type="text" id="tk_keepa_asin" placeholder="B0XXXXXXXX" maxlength="10">`, 'B08XYZ1234'),
      field(t('f_key'), `<input type="password" id="tk_keepa_key" placeholder="Keepa key">`),
    ]) + `<button class="btn btn-primary" id="tk_keepa_btn">${t('query')}</button>
      <div class="tk-example"><a href="#" data-ext="https://keepa.com/#!api">${t('get_keepa')}</a></div>
      <div id="tk_keepa_res" class="tk-result"></div>
      <div id="tk_keepa_chart" class="tk-chart"></div>`;

    host.innerHTML = card(t('opportunity'), t('opportunity_intro'), oppBody)
      + card(t('keepa'), t('keepa_intro'), keepaBody);

    document.getElementById('tk_opp_btn').onclick = runOpportunity;
    document.getElementById('tk_keepa_btn').onclick = runKeepa;
  }
  function keepaDomains() {
    // 与后端 connectors KEEPA_DOMAINS 对齐
    return {
      1: ['美国 amazon.com', 'US amazon.com'], 2: ['英国 amazon.co.uk', 'UK amazon.co.uk'],
      3: ['德国 amazon.de', 'DE amazon.de'], 4: ['法国 amazon.fr', 'FR amazon.fr'],
      5: ['日本 amazon.co.jp', 'JP amazon.co.jp'], 6: ['加拿大 amazon.ca', 'CA amazon.ca'],
      8: ['意大利 amazon.it', 'IT amazon.it'], 9: ['西班牙 amazon.es', 'ES amazon.es'],
      10: ['印度 amazon.in', 'IN amazon.in'], 11: ['墨西哥 amazon.com.mx', 'MX amazon.com.mx'],
      12: ['巴西 amazon.com.br', 'BR amazon.com.br'], 13: ['澳大利亚 amazon.com.au', 'AU amazon.com.au'],
    };
  }
  async function runOpportunity() {
    const body = {
      demand: numVal('tk_opp_demand'), reviews: numVal('tk_opp_reviews'), rating: numVal('tk_opp_rating'),
      cost: numVal('tk_opp_cost'), price: numVal('tk_opp_price'), season: numVal('tk_opp_season'),
      ip_risk: numVal('tk_opp_ip'), logi: numVal('tk_opp_logi'), barrier: numVal('tk_opp_barrier'),
    };
    try {
      const r = await post('/api/ins/opportunity', body);
      const color = r.total >= 75 ? 'var(--success)' : r.total >= 60 ? 'var(--accent)' : r.total >= 45 ? 'var(--warning)' : 'var(--danger)';
      document.getElementById('tk_opp_res').innerHTML =
        `<div class="tk-kvrow">
          ${kv(0, t('total_score'), r.total, color)}
          ${kv(0, '', r.tier, color)}
          ${kv(0, t('margin_pct') + ' (%)', r.margin_pct)}
        </div>`;
      const indNames = {
        demand: t('f_demand'), competition: curLang() === 'zh' ? '竞争空间' : 'Competition',
        margin: curLang() === 'zh' ? '利润空间' : 'Margin', ip_safe: curLang() === 'zh' ? '侵权安全' : 'IP safety',
        season: t('f_season'), logi: t('f_logi'), barrier: t('f_barrier'),
        improve: curLang() === 'zh' ? '改进空间' : 'Improvement',
      };
      drawChart('tk_opp_chart', (th) => ({
        tooltip: {},
        radar: {
          indicator: r.radar_indicators.map((x) => ({ name: indNames[x[0]], max: 100 })),
          axisName: { color: th.text }, splitLine: { lineStyle: { color: th.border } },
          splitArea: { show: false }, axisLine: { lineStyle: { color: th.border } },
        },
        series: [{
          type: 'radar', areaStyle: { opacity: 0.18, color: th.accent },
          lineStyle: { color: th.accent }, itemStyle: { color: th.accent },
          data: [{ value: r.radar_indicators.map((x) => r.sub_scores[x[0]]) }],
        }],
      }));
    } catch (e) { document.getElementById('tk_opp_res').innerHTML = errHtml(e.message); }
  }
  async function runKeepa() {
    const body = {
      key: numVal('tk_keepa_key'), domain: numVal('tk_keepa_domain'), asin: numVal('tk_keepa_asin'),
    };
    const res = document.getElementById('tk_keepa_res');
    try {
      const r = await post('/api/conn/keepa', body);
      if (!r.ok) { res.innerHTML = errHtml(r.error); return; }
      res.innerHTML = (r.image ? `<img src="${esc(r.image)}" class="tk-prodimg" alt="">` : '')
        + `<div class="tk-prodtitle">${esc(r.title || '')}</div>`
        + `<div class="tk-kvrow">
          ${kv(0, t('cur_price'), r.current_price)}${kv(0, t('avg30'), r.avg_price_30)}
          ${kv(0, t('avg90'), r.avg_price_90)}${kv(0, t('avg180'), r.avg_price_180)}
          ${kv(0, t('cur_bsr'), r.current_bsr)}${kv(0, t('bsr30'), r.avg_bsr_30)}
          ${kv(0, t('bsr90'), r.avg_bsr_90)}${kv(0, t('bsr180'), r.avg_bsr_180)}
          ${kv(0, t('monthly'), r.monthly_sold)}${kv(0, t('rating'), r.rating)}
          ${kv(0, t('rcnt'), r.rating_count)}
        </div>`;
      const spark = r.bsr_spark || [];
      if (spark.length) {
        drawChart('tk_keepa_chart', (th) => ({
          tooltip: { trigger: 'axis' },
          grid: baseGrid,
          xAxis: Object.assign({ type: 'category', data: spark.map((p) => p.date) }, axis(th)),
          yAxis: Object.assign({ type: 'value', inverse: true }, axis(th)),
          series: [{
            type: 'line', data: spark.map((p) => p.value), smooth: true, showSymbol: false,
            lineStyle: { color: th.accent }, areaStyle: { opacity: 0.12, color: th.accent },
          }],
        }));
      }
    } catch (e) { res.innerHTML = errHtml(e.message); }
  }

  // ═══════════════════════════════════════════════════════════
  // 库存页：补货预测
  // ═══════════════════════════════════════════════════════════
  function renderInventory() {
    const host = document.getElementById('tkHost-inventory');
    if (!host) return;
    const slOpts = [90, 95, 97.5, 98, 99].map((v) => `<option value="${v}" ${v === 95 ? 'selected' : ''}>${v}%</option>`).join('');
    const body = rows2([
      field(t('f_avg'), numIn('tk_rep_avg', '5'), '5'),
      field(t('f_lead'), numIn('tk_rep_lead', '20'), '20'),
      field(t('f_sl'), sel('tk_rep_sl', slOpts)),
      field(t('f_cv'), numIn('tk_rep_cv', '0.4'), '0.4'),
      field(t('f_stock'), numIn('tk_rep_stock', '60'), '60'),
      field(t('f_moq'), numIn('tk_rep_moq', '100'), '100'),
      field(t('f_cover'), numIn('tk_rep_cover', '30'), '30'),
    ]) + `<button class="btn btn-primary" id="tk_rep_btn">${t('calc')}</button>
      <div id="tk_rep_res" class="tk-result"></div>
      <div id="tk_rep_chart" class="tk-chart tk-chart-tall"></div>`;
    host.innerHTML = card(t('replenish'), t('replenish_intro'), body);
    document.getElementById('tk_rep_btn').onclick = runReplenish;
  }
  async function runReplenish() {
    const body = {
      avg_daily: numVal('tk_rep_avg'), lead_days: numVal('tk_rep_lead'), service_level: numVal('tk_rep_sl'),
      demand_cv: numVal('tk_rep_cv'), current_stock: numVal('tk_rep_stock'), moq: numVal('tk_rep_moq'),
      cover_days: numVal('tk_rep_cover'),
    };
    try {
      const r = await post('/api/ins/replenish', body);
      document.getElementById('tk_rep_res').innerHTML =
        `<div class="tk-kvrow">
          ${kv(0, t('safety'), r.safety_stock)}${kv(0, t('lead_demand'), r.lead_demand)}
          ${kv(0, t('reorder'), r.reorder_point, 'var(--accent)')}
          ${kv(0, t('suggested'), r.suggested_qty, 'var(--success)')}
          ${kv(0, t('cover_now'), r.cover_days_now)}${kv(0, t('stockout'), r.stockout_date)}
          ${kv(0, t('need_reorder'), r.need_reorder ? (curLang() === 'zh' ? '是' : 'Yes') : (curLang() === 'zh' ? '否' : 'No'),
            r.need_reorder ? 'var(--warning)' : 'var(--success)')}
        </div>`;
      drawChart('tk_rep_chart', (th) => ({
        tooltip: { trigger: 'axis' },
        legend: { data: [t('without'), t('withorder')], textStyle: { color: th.text }, top: 0 },
        grid: baseGrid,
        xAxis: Object.assign({ type: 'category', name: curLang() === 'zh' ? '天' : 'days', data: r.series.days }, axis(th)),
        yAxis: Object.assign({ type: 'value', name: curLang() === 'zh' ? '库存' : 'stock' }, axis(th)),
        series: [
          { name: t('without'), type: 'line', data: r.series.without, showSymbol: false, smooth: true, lineStyle: { color: th.orange }, areaStyle: { opacity: 0.08, color: th.orange } },
          {
            name: t('withorder'), type: 'line', data: r.series.with_order, showSymbol: false, smooth: true,
            lineStyle: { color: th.accent }, areaStyle: { opacity: 0.12, color: th.accent },
            markLine: {
              symbol: 'none', lineStyle: { color: th.text, type: 'dashed' },
              data: [{ yAxis: r.series.reorder_point, label: { formatter: t('reorder'), color: th.text } }],
            },
          },
        ],
      }));
    } catch (e) { document.getElementById('tk_rep_res').innerHTML = errHtml(e.message); }
  }

  // ═══════════════════════════════════════════════════════════
  // 采购页：1688 寻源
  // ═══════════════════════════════════════════════════════════
  function renderPurchases() {
    const host = document.getElementById('tkHost-purchases');
    if (!host) return;
    const steps = curLang() === 'zh'
      ? ['按关键词或图片搜索货源，优先选择工厂与实力商家', '索取样品，核对材质、做工与包装', '小批量试单，确认交期与稳定性', '确认合作，明确价格、起订量与售后']
      : ['Search by keyword or image; prefer factories and verified suppliers', 'Request samples and check materials, finish and packaging', 'Place a small trial order to confirm lead time and consistency', 'Confirm the partnership with clear price, MOQ and after-sales terms'];
    const body = `<ol class="tk-steps">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <div id="tk_ref_sourcing">${toolkitSection('sourcing1688')}</div>`;
    host.innerHTML = card(t('sourcing'), '', body);
  }

  // ═══════════════════════════════════════════════════════════
  // 供应商页：评估打分
  // ═══════════════════════════════════════════════════════════
  function renderSuppliers() {
    const host = document.getElementById('tkHost-suppliers');
    if (!host) return;
    const labels5 = [t('g5w1'), t('g5w2'), t('g5w3'), t('g5w4'), t('g5w5')];
    const flds = [
      ['quality', 'f_quality'], ['price', 'f_s_price'], ['lead', 'f_s_lead'], ['moq', 'f_s_moq'],
      ['cert', 'f_s_cert'], ['comm', 'f_s_comm'], ['after', 'f_s_after'],
    ];
    Object.assign(D, {
      f_quality: { zh: '质量稳定', en: 'Quality consistency' },
      f_s_price: { zh: '价格优势', en: 'Price advantage' },
      f_s_lead: { zh: '交期保障', en: 'Lead-time reliability' },
      f_s_moq: { zh: '起订灵活', en: 'MOQ flexibility' },
      f_s_cert: { zh: '资质认证', en: 'Certification' },
      f_s_comm: { zh: '沟通响应', en: 'Communication' },
      f_s_after: { zh: '售后配合', en: 'After-sales support' },
    });
    const body = rows2(flds.map(([key, label]) =>
      field(t(label), sel('tk_sup_' + key, opts1to5(labels5, 4)))))
      + `<button class="btn btn-primary" id="tk_sup_btn">${t('calc')}</button>
        <div id="tk_sup_res" class="tk-result"></div>
        <div id="tk_sup_chart" class="tk-chart"></div>`;
    host.innerHTML = card(t('supplier_score'), t('supplier_intro'), body);
    document.getElementById('tk_sup_btn').onclick = runSupplier;
  }
  async function runSupplier() {
    const keys = ['quality', 'price', 'lead', 'moq', 'cert', 'comm', 'after'];
    const body = {};
    keys.forEach((k) => { body[k] = numVal('tk_sup_' + k); });
    try {
      const r = await post('/api/ins/supplier', body);
      const color = r.total >= 80 ? 'var(--success)' : r.total >= 65 ? 'var(--accent)' : r.total >= 50 ? 'var(--warning)' : 'var(--danger)';
      document.getElementById('tk_sup_res').innerHTML =
        `<div class="tk-kvrow">${kv(0, t('total_score'), r.total, color)}${kv(0, '', r.tier, color)}</div>`;
      const nameMap = {
        quality: t('f_quality'), price: t('f_s_price'), lead: t('f_s_lead'), moq: t('f_s_moq'),
        cert: t('f_s_cert'), comm: t('f_s_comm'), after: t('f_s_after'),
      };
      drawChart('tk_sup_chart', (th) => ({
        tooltip: {},
        radar: {
          indicator: r.radar_indicators.map((x) => ({ name: nameMap[x[0]], max: 100 })),
          axisName: { color: th.text }, splitLine: { lineStyle: { color: th.border } },
          splitArea: { show: false }, axisLine: { lineStyle: { color: th.border } },
        },
        series: [{
          type: 'radar', areaStyle: { opacity: 0.18, color: th.purple },
          lineStyle: { color: th.purple }, itemStyle: { color: th.purple },
          data: [{ value: r.radar_indicators.map((x) => r.sub_scores[x[0]]) }],
        }],
      }));
    } catch (e) { document.getElementById('tk_sup_res').innerHTML = errHtml(e.message); }
  }

  // ═══════════════════════════════════════════════════════════
  // Listing 页：云端配图
  // ═══════════════════════════════════════════════════════════
  function renderListing() {
    const host = document.getElementById('tkHost-listing');
    if (!host) return;
    const sizeOpts = ['1024x1024', '1024x1536', '1536x1024'].map((v) => `<option>${v}</option>`).join('');
    const body = rows2([
      field(t('f_prompt'), `<textarea id="tk_img_prompt" rows="3" placeholder="${esc(curLang() === 'zh' ? '白色背景，不锈钢保温杯，产品居中，柔和光影' : 'white background, stainless steel tumbler centered, soft lighting')}"></textarea>`),
      field(t('f_size'), sel('tk_img_size', sizeOpts)),
      field(t('f_imgmodel'), `<input type="text" id="tk_img_model" placeholder="${esc(curLang() === 'zh' ? '如 dall-e-3 / flux 模型名' : 'e.g. dall-e-3 / flux model')}">`),
    ]) + `<button class="btn btn-primary" id="tk_img_btn">${t('generate')}</button>
      <div id="tk_img_res" class="tk-result"></div>`;
    host.innerHTML = card(t('cloud_image'), t('cloud_image_intro'), body);
    document.getElementById('tk_img_btn').onclick = runImage;
  }
  async function runImage() {
    const res = document.getElementById('tk_img_res');
    res.innerHTML = `<div class="tk-loading">${curLang() === 'zh' ? '正在生成…' : 'Generating…'}</div>`;
    try {
      const r = await post('/api/conn/image', {
        prompt: numVal('tk_img_prompt'), size: numVal('tk_img_size'), image_model: numVal('tk_img_model'),
      });
      if (!r.ok) { res.innerHTML = errHtml(r.error); return; }
      const src = r.url || r.b64;
      res.innerHTML = `<img src="${esc(src)}" class="tk-genimg" alt=""><div class="tk-example">${esc(r.model || '')}</div>`;
    } catch (e) { res.innerHTML = errHtml(e.message); }
  }

  // ═══════════════════════════════════════════════════════════
  // 广告页：TACoS + 竞价 + 搜索词分类
  // ═══════════════════════════════════════════════════════════
  function renderAcos() {
    const host = document.getElementById('tkHost-acos');
    if (!host) return;

    const tacosBody = rows2([
      field(t('f_spend'), numIn('tk_tac_spend', '300'), '300'),
      field(t('f_total'), numIn('tk_tac_total', '5000'), '5000'),
      field(t('f_adsales'), numIn('tk_tac_adsales', '1200'), '1200'),
      field(t('f_proj'), numIn('tk_tac_proj', '5500'), '5500'),
      field(t('f_target'), numIn('tk_tac_target', '12'), '12'),
      field(t('f_margin'), numIn('tk_tac_margin', '30'), '30'),
    ]) + `<button class="btn btn-primary" id="tk_tac_btn">${t('calc')}</button><div id="tk_tac_res" class="tk-result"></div>`;

    const bidBody = rows2([
      field(t('f_cpc'), numIn('tk_bid_cpc', '0.8'), '0.8'),
      field(t('f_cvr'), numIn('tk_bid_cvr', '10'), '10'),
      field(t('f_price'), numIn('tk_bid_price', '69.9'), '69.9'),
      field(t('f_cost'), numIn('tk_bid_cost', '20'), '20'),
      field(t('f_other'), numIn('tk_bid_other', '8'), '8'),
      field(t('f_curacos'), numIn('tk_bid_curacos', '40'), '40'),
      field(t('f_target'), numIn('tk_bid_target', '30'), '30'),
      field(t('f_clicks'), numIn('tk_bid_clicks', '20'), '20'),
      field(t('f_orders'), numIn('tk_bid_orders', '2'), '2'),
    ]) + `<button class="btn btn-primary" id="tk_bid_btn">${t('calc')}</button><div id="tk_bid_res" class="tk-result"></div>`;

    const stBody = rows2([
      field(t('f_sttarget'), numIn('tk_st_target', '30'), '30'),
    ]) + `<textarea id="tk_st_rows" rows="6" class="tk-textarea" placeholder="stainless steel tumbler,30,18,3,180&#10;coffee cup,15,12,0,0"></textarea>
      <button class="btn btn-primary" id="tk_st_btn">${t('calc')}</button><div id="tk_st_res" class="tk-result"></div>`;

    host.innerHTML = card(t('tacos'), t('tacos_intro'), tacosBody)
      + card(t('bid'), t('bid_intro'), bidBody)
      + card(t('searchterms'), t('searchterms_intro'), stBody);

    document.getElementById('tk_tac_btn').onclick = runTacos;
    document.getElementById('tk_bid_btn').onclick = runBid;
    document.getElementById('tk_st_btn').onclick = runSearchTerms;
  }
  async function runTacos() {
    const body = {
      ad_spend: numVal('tk_tac_spend'), total_sales: numVal('tk_tac_total'),
      ad_sales: numVal('tk_tac_adsales'), projected_sales: numVal('tk_tac_proj'),
      target_tacos: numVal('tk_tac_target'), margin_pct: numVal('tk_tac_margin'),
    };
    try {
      const r = await post('/api/ins/tacos', body);
      document.getElementById('tk_tac_res').innerHTML =
        `<div class="tk-kvrow">
          ${kv(0, t('acos') + ' (%)', r.acos)}${kv(0, t('tacos') + ' (%)', r.tacos, 'var(--accent)')}
          ${kv(0, t('organic') + ' (%)', r.organic_ratio)}${kv(0, t('target_spend'), r.target_spend)}
          ${kv(0, t('relation'), r.relation)}
        </div>`;
    } catch (e) { document.getElementById('tk_tac_res').innerHTML = errHtml(e.message); }
  }
  async function runBid() {
    const body = {
      cpc: numVal('tk_bid_cpc'), cvr: numVal('tk_bid_cvr'), price: numVal('tk_bid_price'),
      cost: numVal('tk_bid_cost'), other_fees_pct: numVal('tk_bid_other'), cur_acos: numVal('tk_bid_curacos'),
      target_acos: numVal('tk_bid_target'), clicks: numVal('tk_bid_clicks'), orders: numVal('tk_bid_orders'),
    };
    try {
      const r = await post('/api/ins/bid', body);
      const colorMap = { pause: 'var(--danger)', lower: 'var(--warning)', raise: 'var(--success)', hold: 'var(--accent)' };
      document.getElementById('tk_bid_res').innerHTML =
        `<div class="tk-kvrow">
          ${kv(0, t('breakeven') + ' (%)', r.breakeven_acos)}${kv(0, t('target_cpc'), r.target_cpc)}
          ${kv(0, t('suggested_cpc'), r.suggested_cpc, colorMap[r.action_key])}
        </div><div class="tk-action">${esc(r.action)}</div>`;
    } catch (e) { document.getElementById('tk_bid_res').innerHTML = errHtml(e.message); }
  }
  async function runSearchTerms() {
    const target = numVal('tk_st_target');
    const text = (document.getElementById('tk_st_rows').value || '').trim();
    const rows = text.split(/\r?\n/).map((line) => {
      const p = line.split(',').map((x) => x.trim());
      return { keyword: p[0], clicks: p[1], spend: p[2], orders: p[3], sales: p[4] };
    }).filter((r) => r.keyword);
    try {
      const r = await post('/api/ins/searchterms', { rows, target_acos: target });
      const order = ['winner', 'keep', 'optimize', 'pause', 'observe'];
      const html = order.map((g) => {
        const list = r.groups[g] || [];
        const rowsHtml = list.map((it) =>
          `<tr><td>${esc(it.keyword)}</td><td>${it.clicks}</td><td>${it.spend}</td><td>${it.orders}</td><td>${it.sales}</td><td>${it.acos == null ? '—' : it.acos}</td></tr>`).join('');
        return `<div class="tk-group"><div class="tk-group-title" data-g="${g}">${esc((r.group_names && r.group_names[g]) || g)}${curLang() === 'zh' ? '（' : '('}${list.length}${curLang() === 'zh' ? '）' : ')'}</div>
          ${list.length ? `<table class="data-table tk-st-table"><thead><tr>
            <th>${curLang() === 'zh' ? '关键词' : 'Keyword'}</th><th>${curLang() === 'zh' ? '点击' : 'Clicks'}</th>
            <th>${curLang() === 'zh' ? '花费' : 'Spend'}</th><th>${curLang() === 'zh' ? '订单' : 'Orders'}</th>
            <th>${curLang() === 'zh' ? '销售额' : 'Sales'}</th><th>ACOS</th></tr></thead><tbody>${rowsHtml}</tbody></table>` : ''}
        </div>`;
      }).join('');
      document.getElementById('tk_st_res').innerHTML =
        `<div class="tk-kvrow">
          ${kv(0, curLang() === 'zh' ? '点击' : 'Clicks', r.totals.clicks)}
          ${kv(0, curLang() === 'zh' ? '订单' : 'Orders', r.totals.orders)}
          ${kv(0, curLang() === 'zh' ? '花费' : 'Spend', r.totals.spend)}
          ${kv(0, curLang() === 'zh' ? '销售额' : 'Sales', r.totals.sales)}
          ${kv(0, t('blended') + ' (%)', r.totals.blended_acos, 'var(--accent)')}
        </div>` + html;
    } catch (e) { document.getElementById('tk_st_res').innerHTML = errHtml(e.message); }
  }

  // ═══════════════════════════════════════════════════════════
  // 物流页：到岸成本 + 汇率
  // ═══════════════════════════════════════════════════════════
  function renderLogistics() {
    const host = document.getElementById('tkHost-logistics');
    if (!host) return;
    const landedBody = rows2([
      field(t('f_unit'), numIn('tk_lan_unit', '20'), '20'),
      field(t('f_inbound'), numIn('tk_lan_inbound', '3'), '3'),
      field(t('f_duty'), numIn('tk_lan_duty', '5'), '5'),
      field(t('f_vat'), numIn('tk_lan_vat', '20'), '20'),
      field(t('f_fee'), numIn('tk_lan_fee', '1'), '1'),
      field(t('f_last'), numIn('tk_lan_last', '4'), '4'),
      field(t('f_price'), numIn('tk_lan_price', '69.9'), '69.9'),
    ]) + `<button class="btn btn-primary" id="tk_lan_btn">${t('calc')}</button><div id="tk_lan_res" class="tk-result"></div>`;

    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'SGD'];
    const fxBody = rows2([
      field(t('f_base'), sel('tk_fx_base', currencies.map((c) => `<option ${c === 'USD' ? 'selected' : ''}>${c}</option>`).join(''))),
    ]) + `<button class="btn btn-primary" id="tk_fx_btn">${t('query')}</button><div id="tk_fx_res" class="tk-result"></div>`;

    host.innerHTML = card(t('landed'), t('landed_intro'), landedBody)
      + card(t('fx'), t('fx_intro'), fxBody);
    document.getElementById('tk_fx_btn').onclick = runFx;
    document.getElementById('tk_lan_btn').onclick = runLanded;
  }
  async function runLanded() {
    const body = {
      unit_cost: numVal('tk_lan_unit'), inbound_freight: numVal('tk_lan_inbound'),
      duty_pct: numVal('tk_lan_duty'), vat_pct: numVal('tk_lan_vat'),
      customs_fee: numVal('tk_lan_fee'), last_mile: numVal('tk_lan_last'), price: numVal('tk_lan_price'),
    };
    try {
      const r = await post('/api/ins/landed', body);
      document.getElementById('tk_lan_res').innerHTML =
        `<div class="tk-kvrow">
          ${kv(0, t('customs_value'), r.customs_value)}${kv(0, t('duty'), r.duty)}
          ${kv(0, t('vat'), r.vat)}${kv(0, t('customs_fee'), r.customs_fee)}
          ${kv(0, t('last_mile'), r.last_mile)}
          ${kv(0, t('landed_cost'), r.landed_cost, 'var(--accent)')}
          ${kv(0, t('landed_ratio') + ' (%)', r.landed_ratio)}
        </div>`;
    } catch (e) { document.getElementById('tk_lan_res').innerHTML = errHtml(e.message); }
  }
  async function runFx() {
    const base = numVal('tk_fx_base');
    const res = document.getElementById('tk_fx_res');
    try {
      const r = await post('/api/conn/fx', { base });
      if (!r.ok) { res.innerHTML = errHtml(r.error); return; }
      const show = ['CNY', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'HKD'].filter((c) => c !== r.base);
      res.innerHTML = `<div class="tk-example">${t('updated')}：${esc(r.updated || '')}</div>
        <div class="tk-kvrow">${show.map((c) => kv(0, '1 ' + r.base + ' → ' + c, r.rates[c])).join('')}</div>`;
    } catch (e) { res.innerHTML = errHtml(e.message); }
  }

  // ═══════════════════════════════════════════════════════════
  // 合规页：风险快判 + 官方入口
  // ═══════════════════════════════════════════════════════════
  function renderCompliance() {
    const host = document.getElementById('tkHost-compliance');
    if (!host) return;
    const cbs = ['brand', 'lookalike', 'character', 'patent', 'hazmat', 'cert']
      .map((k) => `<label class="tk-check"><input type="checkbox" id="tk_cb_${k}"> ${esc(t('cb_' + k))}</label>`).join('');
    const body = `<div class="tk-checks">${cbs}</div>
      <button class="btn btn-primary" id="tk_cb_btn">${t('calc')}</button><div id="tk_cb_res" class="tk-result"></div>`;
    const refs = ['ip_patent', 'ip_trademark', 'ip_brand', 'hazmat', 'tax_refs']
      .map((k) => `<div id="tk_ref_${k}">${toolkitSection(k)}</div>`).join('');
    host.innerHTML = card(t('ipverdict'), t('ipverdict_intro'), body)
      + card(t('refs'), '', `<div class="tk-refgrid">${refs}</div>`);
    document.getElementById('tk_cb_btn').onclick = runIpVerdict;
  }
  async function runIpVerdict() {
    const body = {};
    ['brand', 'lookalike', 'character', 'patent', 'hazmat', 'cert'].forEach((k) => { body[k] = checked('tk_cb_' + k); });
    body.lang = curLang();
    try {
      const r = await post('/api/ins/ipverdict', body);
      const color = r.level_key === 'high' ? 'var(--danger)' : r.level_key === 'mid' ? 'var(--warning)' : 'var(--success)';
      const items = r.triggered.map((x) =>
        `<li><span class="tk-risk-tag tk-risk-${x.risk === '高' ? 'high' : 'mid'}">${x.risk}</span>${esc(x.text)}</li>`).join('');
      document.getElementById('tk_cb_res').innerHTML =
        `<div class="tk-kvrow">${kv(0, t('level'), r.level, color)}</div>
         ${items ? `<ul class="tk-risklist">${items}</ul>` : ''}
         <div class="tk-action">${esc(r.advice)}</div>`;
    } catch (e) { document.getElementById('tk_cb_res').innerHTML = errHtml(e.message); }
  }

  // ═══════════════════════════════════════════════════════════
  // 入行页：达人计划 + 联盟入口
  // ═══════════════════════════════════════════════════════════
  function renderGuide() {
    const host = document.getElementById('tkHost-guide');
    if (!host) return;
    const body = rows2([
      field(t('f_creators'), numIn('tk_aff_creators', '50'), '50'),
      field(t('f_reply'), numIn('tk_aff_reply', '20'), '20'),
      field(t('f_collab'), numIn('tk_aff_collab', '30'), '30'),
      field(t('f_sample'), numIn('tk_aff_sample', '15'), '15'),
      field(t('f_views'), numIn('tk_aff_views', '20000'), '20000'),
      field(t('f_conv'), numIn('tk_aff_conv', '0.2'), '0.2'),
      field(t('f_aov'), numIn('tk_aff_aov', '30'), '30'),
      field(t('f_commission'), numIn('tk_aff_commission', '15'), '15'),
      field(t('f_margin'), numIn('tk_aff_margin', '35'), '35'),
    ]) + `<button class="btn btn-primary" id="tk_aff_btn">${t('calc')}</button>
      <div id="tk_aff_res" class="tk-result"></div>
      <div id="tk_aff_chart" class="tk-chart"></div>`;
    host.innerHTML = card(t('affiliate_plan'), t('affiliate_intro'), body)
      + card(curLang() === 'zh' ? '达人与联盟入口' : 'Creator & Affiliate Tools', '',
        `<div id="tk_ref_affiliate">${toolkitSection('affiliate')}</div>`);
    document.getElementById('tk_aff_btn').onclick = runAffiliate;
  }
  async function runAffiliate() {
    const body = {
      creators: numVal('tk_aff_creators'), reply_rate: numVal('tk_aff_reply'),
      collab_rate: numVal('tk_aff_collab'), sample_cost: numVal('tk_aff_sample'),
      avg_views: numVal('tk_aff_views'), view_conv: numVal('tk_aff_conv'),
      aov: numVal('tk_aff_aov'), commission_pct: numVal('tk_aff_commission'),
      margin_pct: numVal('tk_aff_margin'),
    };
    try {
      const r = await post('/api/ins/affiliate', body);
      document.getElementById('tk_aff_res').innerHTML =
        `<div class="tk-kvrow">
          ${kv(0, t('replies'), r.replies)}${kv(0, t('collabs'), r.collabs)}
          ${kv(0, t('sample_cost'), r.sample_cost)}${kv(0, t('views'), r.views)}
          ${kv(0, t('p_orders'), r.orders)}${kv(0, t('gmv'), r.gmv)}
          ${kv(0, t('commission'), r.commission)}
          ${kv(0, t('net'), r.net, r.net >= 0 ? 'var(--success)' : 'var(--danger)')}
        </div>`;
      const fdata = r.funnel;
      const nameMap = {
        creators: curLang() === 'zh' ? '联系达人' : 'Contacted',
        replies: curLang() === 'zh' ? '获得回复' : 'Replies',
        collabs: curLang() === 'zh' ? '达成合作' : 'Collaborations',
        orders: curLang() === 'zh' ? '带来订单' : 'Orders',
      };
      drawChart('tk_aff_chart', (th) => ({
        tooltip: { trigger: 'item' },
        series: [{
          type: 'funnel', left: '10%', width: '80%', top: 16, bottom: 16,
          label: { color: th.text, formatter: (p) => `${nameMap[fdata[p.dataIndex][0]]} ${p.value}` },
          data: fdata.map((f, i) => ({
            name: nameMap[f[0]], value: f[2],
            itemStyle: { color: [th.accent, th.purple, th.green, th.orange][i] },
          })),
        }],
      }));
    } catch (e) { document.getElementById('tk_aff_res').innerHTML = errHtml(e.message); }
  }

  // ═══════════════════════════════════════════════════════════
  // 售后页：赔偿与对账
  // ═══════════════════════════════════════════════════════════
  function renderAftersales() {
    const host = document.getElementById('tkHost-aftersales');
    if (!host) return;
    const checklist = curLang() === 'zh'
      ? ['每月查看库存调整报告，核对丢失、残损与盘盈盘亏', '查看赔偿报告，确认应赔项目是否已到账', '将入库、出库与在仓记录和平台数据核对', '对未赔付的丢失或残损，按平台流程提交申请']
      : ['Review inventory adjustments monthly for losses, damage and discrepancies', 'Check reimbursement reports and confirm amounts received', 'Reconcile inbound, outbound and on-hand records with platform data', 'Submit claims for unreimbursed losses or damage following the platform process'];
    const body = `<ul class="tk-steps tk-checklist">${checklist.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <div id="tk_ref_reimbursement">${toolkitSection('reimbursement')}</div>`;
    host.innerHTML = card(t('reimbursement'), t('reimbursement_intro'), body);
  }

  // ── 错误/通用片段 ──
  function errHtml(msg) {
    return `<div class="tk-error">${esc(msg || (curLang() === 'zh' ? '操作失败，请重试' : 'Failed, please retry'))}</div>`;
  }

  // ── 统一渲染 ──
  // ═══════════════════════════════════════════════════════════
  // 卖前体检（上架准备）
  // ═══════════════════════════════════════════════════════════
  let feesCache = null;
  async function loadFees() {
    if (feesCache) return feesCache;
    try { feesCache = await (await fetch('/api/data/fees')).json(); } catch { feesCache = {}; }
    return feesCache;
  }
  const pick = (o) => (o ? (o[curLang()] || o.zh) : '');
  function platformOptions() {
    const fees = (feesCache && feesCache.platforms) || {};
    return Object.keys(fees).map((id) =>
      `<option value="${id}">${esc(curLang() === 'zh' ? fees[id].name_zh : fees[id].name_en)}</option>`).join('');
  }

  function launchReportHtml(r) {
    const vmap = { stop: 'tk-banner-red', prepare: 'tk-banner-amber', go: 'tk-banner-green' };
    const smap = { pass: ['✓', 'green'], action: ['!', 'amber'], block: ['✕', 'red'] };
    const gates = r.gates.map((g) => {
      const s = smap[g.status] || smap.pass;
      return `<tr>
        <td class="tk-gate-st"><span class="tk-pill tk-pill-${s[1]}">${s[0]}</span></td>
        <td class="tk-gate-name">${esc(pick(g.title))}</td>
        <td class="tk-gate-detail">${esc(pick(g.detail))}
          ${g.verify ? `<span class="tk-verifytag">${esc(t('launch_verify_tag'))}</span>` : ''}</td>
      </tr>`;
    }).join('');
    const docs = r.docs.map((d) =>
      `<li><label class="tk-docitem"><input type="checkbox"> <span>${esc(pick(d))}</span></label></li>`).join('');
    const off = ((feesCache && feesCache.platforms && feesCache.platforms[r.platform]) || {}).official;
    return `<div class="tk-verdict ${vmap[r.verdict_key] || ''}">${esc(pick(r.verdict))}</div>
      <div class="card tk-card">
        <h3>${esc(t('launch_gates'))}</h3>
        <table class="tk-gatetable"><tbody>${gates}</tbody></table>
      </div>
      <div class="card tk-card">
        <h3>${esc(t('launch_docs'))}</h3>
        <ul class="tk-doclist">${docs}</ul>
      </div>
      <div class="tk-notebox">
        <span>${esc(pick(r.note))}</span>
        ${off ? `<a href="${esc(off)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">${esc(t('launch_official'))}</a>` : ''}
      </div>`;
  }

  function renderLaunch() {
    const host = document.getElementById('tkHost-launch');
    if (!host) return;
    const intro = document.getElementById('launchIntro');
    if (intro) intro.textContent = t('launch_intro');

    const body = [
      field(t('applicant'), sel('lcApplicant',
        `<option value="individual">${esc(t('ap_individual'))}</option>
         <option value="sole">${esc(t('ap_sole'))}</option>
         <option value="enterprise">${esc(t('ap_enterprise'))}</option>`)),
      field(t('platform'), `<select id="lcPlatform">${platformOptions()}</select>`),
      field(t('target_market'), sel('lcMarket',
        `<option value="US">${esc(t('mk_US'))}</option>
         <option value="EU">${esc(t('mk_EU'))}</option>
         <option value="UK">${esc(t('mk_UK'))}</option>
         <option value="JP">${esc(t('mk_JP'))}</option>
         <option value="SEA">${esc(t('mk_SEA'))}</option>
         <option value="Other">${esc(t('mk_Other'))}</option>`)),
      field(t('f_category'), sel('lcCategory',
        ['general', 'electronics', 'battery', 'food', 'cosmetics', 'medical', 'books', 'toys', 'clothing']
          .map((c) => `<option value="${c}">${esc(t('cat_' + c))}</option>`).join(''))),
      field(t('f_brand'), sel('lcBrand',
        ['none', 'own', 'authorized']
          .map((c) => `<option value="${c}">${esc(t('br_' + c))}</option>`).join(''))),
      `<label class="tk-checkitem"><input type="checkbox" id="lcConformity"> <span>${esc(t('cb_conformity'))}</span></label>
       <label class="tk-checkitem"><input type="checkbox" id="lcBattery"> <span>${esc(t('cb_battery'))}</span></label>
       <button class="btn btn-primary" id="lcRunBtn" type="button">${esc(t('launch_run'))}</button>
       <div id="lcError" class="tk-formerror" style="display:none;"></div>`,
    ].join('');

    host.innerHTML = `<div class="grid grid-2">
      ${card(t('launch_form'), '', body)}
      <div class="card tk-card"><h3>${esc(t('launch_result'))}</h3>
        <div id="lcResult">
          <div class="empty-state"><div class="empty-state-icon">🧭</div>${esc(t('launch_intro'))}</div>
        </div>
      </div>
    </div>`;

    document.getElementById('lcRunBtn').addEventListener('click', async () => {
      const errBox = document.getElementById('lcError'); errBox.style.display = 'none';
      const payload = {
        applicant: numVal('lcApplicant') || 'individual',
        platform: numVal('lcPlatform') || 'taobao',
        market: numVal('lcMarket') || 'US',
        category: numVal('lcCategory') || 'general',
        brand: numVal('lcBrand') || 'none',
        hasConformity: checked('lcConformity'),
        containsBattery: checked('lcBattery'),
      };
      try {
        const r = await post('/api/ins/launch', payload);
        document.getElementById('lcResult').innerHTML = launchReportHtml(r);
      } catch (e) {
        errBox.textContent = e.message; errBox.style.display = 'block';
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 竞品页：定价建议
  // ═══════════════════════════════════════════════════════════
  function priceCurveOption(r) {
    return (th) => ({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: [t('price_net'), t('price_netpct')], textStyle: { color: th.text }, top: 0 },
      grid: baseGrid,
      xAxis: {
        type: 'value', name: t('price_axis'),
        axisLine: { lineStyle: { color: th.border } },
        axisLabel: { color: th.text },
        splitLine: { lineStyle: { color: th.border, type: 'dashed' } },
      },
      yAxis: [
        { type: 'value', name: t('price_net'), ...axis(th) },
        { type: 'value', name: '%', ...axis(th) },
      ],
      series: [
        {
          name: t('price_net'), type: 'bar',
          data: r.curve.map((c) => [c.price, c.net]),
          itemStyle: { color: th.accent },
        },
        {
          name: t('price_netpct'), type: 'line', yAxisIndex: 1, smooth: true,
          data: r.curve.map((c) => [c.price, c.net_pct]),
          itemStyle: { color: th.orange }, lineStyle: { width: 2 },
          markLine: {
            symbol: 'none',
            data: [
              r.comp_low ? { xAxis: r.comp_low, lineStyle: { color: th.green }, label: { formatter: t('f_complow'), color: th.green } } : null,
              r.comp_high ? { xAxis: r.comp_high, lineStyle: { color: th.red }, label: { formatter: t('f_comphigh'), color: th.red } } : null,
              { xAxis: r.suggested_price, lineStyle: { color: th.purple, type: 'dashed' }, label: { formatter: t('pr_suggested'), color: th.purple } },
            ].filter(Boolean),
          },
        },
      ],
    });
  }

  function renderCompetitor() {
    const host = document.getElementById('tkHost-competitor');
    if (!host) return;
    const body = [
      field(t('platform'), `<select id="paPlatform">${platformOptions()}</select>`),
      `<button type="button" class="btn btn-ghost btn-sm" id="paFillFees">${esc(t('price_fillfees'))}</button>`,
      field(t('f_unit'), numIn('paCost', ''), '28'),
      field(t('f_otherunit'), numIn('paOther', 0)),
      field(t('f_referral'), numIn('paReferral', 0)),
      field(t('f_payment'), numIn('paPayment', 0)),
      field(t('f_targetmargin'), numIn('paTarget', 30)),
      rows2([
        field(t('f_complow'), numIn('paCompLow', '')),
        field(t('f_compmid'), numIn('paCompMid', '')),
      ]),
      field(t('f_comphigh'), numIn('paCompHigh', '')),
      `<button class="btn btn-primary" id="paRunBtn" type="button">${esc(t('price_run'))}</button>
       <div id="paError" class="tk-formerror" style="display:none;"></div>`,
    ].join('');

    host.innerHTML = `${card(t('price'), t('price_intro'), body)}
      <div class="card tk-card" id="paResultCard" style="display:none;">
        <div id="paResult"></div>
        <div id="paCurve" style="width:100%;height:340px;"></div>
      </div>`;

    document.getElementById('paFillFees').addEventListener('click', () => {
      const f = ((feesCache && feesCache.platforms) || {})[document.getElementById('paPlatform').value];
      if (f) {
        document.getElementById('paReferral').value = f.referral_pct;
        document.getElementById('paPayment').value = f.payment_pct;
      }
    });

    document.getElementById('paRunBtn').addEventListener('click', async () => {
      const errBox = document.getElementById('paError'); errBox.style.display = 'none';
      const cost = Number(numVal('paCost'));
      if (!(cost > 0)) {
        errBox.textContent = t('f_unit'); errBox.style.display = 'block';
        return;
      }
      const payload = {
        platform: numVal('paPlatform'),
        cost,
        other_unit: numVal('paOther') || 0,
        referral_pct: numVal('paReferral') || 0,
        payment_pct: numVal('paPayment') || 0,
        target_margin_pct: numVal('paTarget') || 30,
        comp_low: numVal('paCompLow') || 0,
        comp_mid: numVal('paCompMid') || 0,
        comp_high: numVal('paCompHigh') || 0,
      };
      try {
        const r = await post('/api/ins/price', payload);
        const posMap = {
          below_band: 'pr_pos_below', in_band: 'pr_pos_in',
          above_band: 'pr_pos_above', no_comp: 'pr_pos_none',
        };
        document.getElementById('paResult').innerHTML = `
          <div class="tk-kvgrid">
            ${kv(0, t('pr_target'), r.target_price)}
            ${kv(0, t('pr_breakeven'), r.break_even)}
            ${kv(0, t('pr_suggested'), r.suggested_price)}
            ${kv(0, t('pr_suggested_net'), r.suggested_net_pct + '%')}
          </div>
          <div class="tk-posnote">${esc(t(posMap[r.position_key] || 'pr_pos_none'))}</div>`;
        document.getElementById('paResultCard').style.display = '';
        requestAnimationFrame(() => drawChart('paCurve', priceCurveOption(r)));
      } catch (e) {
        errBox.textContent = e.message; errBox.style.display = 'block';
      }
    });
  }

  function renderAll() {
    renderSelection();
    renderInventory();
    renderPurchases();
    renderSuppliers();
    renderListing();
    renderAcos();
    renderLogistics();
    renderCompliance();
    renderGuide();
    renderAftersales();
    renderLaunch();
    renderCompetitor();
    bindExternalLinks();
  }
  function bindExternalLinks() {
    document.querySelectorAll('[data-ext]').forEach((a) => {
      const url = a.getAttribute('data-ext');
      a.href = url;
      a.removeAttribute('data-ext');
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
  }

  // ── 监听语言与主题变化 ──
  function observe() {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.attributeName === 'lang') { renderAll(); break; }
        if (m.attributeName === 'data-theme') { restyleCharts(); }
      }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-theme'] });
    window.addEventListener('resize', () => {
      Object.keys(charts).forEach((id) => { if (charts[id]) charts[id].resize(); });
    });
  }

  function boot() {
    Promise.all([loadToolkits(), loadFees()]).then(() => { renderAll(); observe(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
