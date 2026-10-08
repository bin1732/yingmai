/* ============================================
   盈脉 · 电商工作台主应用逻辑 v2.0
   灵感引擎工坊 · bin1732
   ============================================ */

let currentLang = localStorage.getItem('ewb_lang') || 'zh';
let currentTheme = localStorage.getItem('ewb_theme') || 'light';
let chatHistory = [];
let platformsData, promptsData, guidesData, logisticsData, complianceData;

// ── 统一平台标识：值用机器 ID，界面显示本地化名 ──
const PLATFORM_LIST = [
  { id: 'taobao', zh: '淘宝', en: 'Taobao' },
  { id: 'tmall', zh: '天猫', en: 'Tmall' },
  { id: 'jd', zh: '京东', en: 'JD.com' },
  { id: 'pdd', zh: '拼多多', en: 'Pinduoduo' },
  { id: 'douyin', zh: '抖音电商', en: 'Douyin E-commerce' },
  { id: 'kuaishou', zh: '快手电商', en: 'Kuaishou E-commerce' },
  { id: 'xiaohongshu', zh: '小红书', en: 'Xiaohongshu' },
  { id: 'amazon', zh: '亚马逊', en: 'Amazon' },
  { id: 'shopee', zh: '虾皮', en: 'Shopee' },
  { id: 'tiktokshop', zh: 'TikTok Shop', en: 'TikTok Shop' },
  { id: 'shopify', zh: 'Shopify', en: 'Shopify' },
  { id: 'ebay', zh: 'eBay', en: 'eBay' },
  { id: 'aliexpress', zh: '速卖通', en: 'AliExpress' },
  { id: 'lazada', zh: '来赞达', en: 'Lazada' },
];
function platformLabel(id) {
  const p = PLATFORM_LIST.find((x) => x.id === id);
  if (p) return currentLang === 'en' ? p.en : p.zh;
  return id == null ? '' : String(id);
}
function populatePlatformSelects() {
  document.querySelectorAll('select[data-platforms]').forEach((sel) => {
    const prev = sel.value;
    const allowBlank = sel.hasAttribute('data-allow-blank');
    const blank = allowBlank ? `<option value="">${currentLang === 'en' ? 'Not specified' : '不指定'}</option>` : '';
    sel.innerHTML = blank + PLATFORM_LIST.map((p) => {
      const label = currentLang === 'en' ? p.en : p.zh;
      return `<option value="${p.id}">${label}</option>`;
    }).join('');
    if (prev && PLATFORM_LIST.some((p) => p.id === prev)) sel.value = prev;
    else if (allowBlank) sel.value = '';
  });
}
async function refreshFormDatalists() {
  const ensure = (id) => {
    let dl = document.getElementById(id);
    if (!dl) { dl = document.createElement('datalist'); dl.id = id; document.body.appendChild(dl); }
    return dl;
  };
  try {
    const [prods, sups] = await Promise.all([
      fetch('/api/products').then(r => r.json()).catch(() => []),
      fetch('/api/suppliers').then(r => r.json()).catch(() => []),
    ]);
    ensure('ewbProductDl').innerHTML = prods
      .map(p => `<option value="${p.name}">${p.sku || ''}</option>`).join('');
    ensure('ewbSupplierDl').innerHTML = sups
      .map(s => `<option value="${s.name}">${s.contact || ''}</option>`).join('');
  } catch (e) {}
}

// ── 初始化 ──
// ── 响应式导航管理 · 灵感引擎工坊 · bin1732 ──
function applyResponsive() {
  const w = window.innerWidth;
  const root = document.documentElement;
  root.classList.remove('nav-wide', 'nav-rail', 'nav-drawer');
  if (w <= 768) { root.classList.add('nav-drawer'); ensureBackdrop(); }
  else if (w <= 1100) { root.classList.add('nav-rail'); }
  else root.classList.add('nav-wide');
}
function ensureBackdrop() {
  let bd = document.getElementById('drawerBackdrop');
  if (!bd) {
    bd = document.createElement('button');
    bd.id = 'drawerBackdrop'; bd.className = 'drawer-backdrop';
    bd.setAttribute('aria-label', '关闭菜单');
    bd.addEventListener('click', closeDrawer);
    document.body.appendChild(bd);
  }
}
function openDrawer() {
  ensureBackdrop();
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('drawerBackdrop').classList.add('show');
}
function closeDrawer() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('drawerBackdrop')?.classList.remove('show');
}
function onHamburger() {
  const mode = document.documentElement.classList.contains('nav-drawer') ? 'drawer'
    : document.documentElement.classList.contains('nav-rail') ? 'rail' : 'wide';
  const sb = document.getElementById('sidebar');
  if (mode === 'drawer') {
    if (sb.classList.contains('open')) closeDrawer(); else openDrawer();
  } else if (mode === 'rail') {
    sb.classList.toggle('user-open');
  } else {
    sb.classList.toggle('collapsed');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentTheme);
  applyI18n();
  populatePlatformSelects();
  initNavigation();
  enhanceLabels();
  initChat();
  initCalculator();
  initACOS();
  initDeAI();
  initVoice();
  initAnalysisForms();
  enhanceDataPages();
  loadAllData();
  checkModelStatus();
  setInterval(checkModelStatus, 30000);
  // 内置助手首次准备：快速轮询，就绪后停止
  const warmPoll = setInterval(async () => {
    try {
      const st = await (await fetch('/api/model/status')).json();
      if (st.engine === 'builtin' && st.warm === true) {
        clearInterval(warmPoll);
        checkModelStatus();
      } else {
        checkModelStatus();
      }
    } catch { }
  }, 2000);
  if (localStorage.getItem('ewb_onb_v2') !== 'done') showOnboarding();
  const params = new URLSearchParams(location.search);
  const qp = params.get('page');
  if (qp && document.getElementById('page-' + qp)) navigateTo(qp);
  const th = params.get('theme');
  if (th === 'dark' || th === 'light') setTheme(th);
  const la = params.get('lang');
  if (la === 'en' || la === 'zh') setLang(la);
});

// ── 导航 ──
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.page);
      closeDrawer();
    });
  });
  document.getElementById('toggleSidebar').addEventListener('click', onHamburger);
  applyResponsive();
  window.addEventListener('resize', applyResponsive);
  document.getElementById('themeToggle').addEventListener('click', () => setTheme(currentTheme === 'light' ? 'dark' : 'light'));
  document.getElementById('langToggle').addEventListener('click', () => setLang(currentLang === 'zh' ? 'en' : 'zh'));
}

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
  window.dispatchEvent(new CustomEvent('ewb:page', { detail: { page } }));
  const navLabel = document.querySelector(`.nav-item[data-page="${page}"] .nav-label`);
  if (navLabel) document.getElementById('topbarTitle').textContent = navLabel.textContent;
  if (page === 'dashboard') refreshDashboard();
  // 进入计算类页面时主动重绘曲线，确保在页面可见状态下以正确尺寸初始化
  if (page === 'calculator' && typeof renderProfitSensitivity === 'function') {
    renderProfitSensitivity(gatherProfitBody());
  }
  if (page === 'acos' && typeof renderAcosCurve === 'function') {
    renderAcosCurve(gatherAcosBody());
  }
  // 页面显示后，重算该页图表尺寸（图表可能在页面隐藏时已以零宽度初始化）
  requestAnimationFrame(() => {
    const ap = document.getElementById('page-' + page);
    if (ap && window.echarts) {
      ap.querySelectorAll('[_echarts_instance_]').forEach((el) => {
        const inst = echarts.getInstanceByDom(el);
        if (inst) inst.resize();
      });
    }
  });
}

// 进入仪表盘即刷新，保证新增的订单、分析、模型状态如实反映
async function refreshDashboard() {
  try {
    const [prods, hist, st] = await Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/history').then((r) => r.json()),
      fetch('/api/model/status').then((r) => r.json()).catch(() => null),
    ]);
    const kp = document.getElementById('kpiProducts'); if (kp) kp.textContent = prods.length;
    const ka = document.getElementById('kpiAnalyses'); if (ka) ka.textContent = hist.length;
    if (st) {
      const built = st.engine === 'builtin';
      const isLocal = !built && (st.engine === 'ollama' || st.engine === 'lmstudio' || /本地|local/i.test(st.engine_label || ''));
      const ke = document.getElementById('kpiEngine');
      const kes = document.getElementById('kpiEngineSub');
      if (ke) ke.textContent = built ? '内置' : (st.model_name || st.engine_label || (isLocal ? '本地模型' : '云端模型'));
      if (kes) kes.textContent = built ? '本地运行' : st.recommendation || (isLocal ? '本地推理' : '云端推理');
    }
  } catch (e) {}
  renderDashboardCharts();
  renderSalesHeatmap();
}

// ── 无障碍：把已有的视觉标签与表单控件正确关联 ──
let _lblSeq = 0;
function isControlLabeled(c) {
  return !!(c.getAttribute('aria-label') || c.getAttribute('aria-labelledby') ||
    (c.id && document.querySelector(`label[for="${c.id}"]`)) || c.closest('label'));
}
function findVisualLabel(c) {
  const grp = c.closest('.form-group');
  if (grp) { const l = grp.querySelector('.label,label'); if (l) return l; }
  const blk = c.closest('.data-io-block');
  if (blk) { const l = blk.querySelector('.data-io-label'); if (l) return l; }
  return null;
}
function applyControlAria() {
  const en = currentLang === 'en';
  const imp = document.getElementById('importFile');
  if (imp) imp.setAttribute('aria-label', en ? 'Choose a file to import' : '选择要导入的文件');
  ['chatInput', 'floatChatInput', 'promptSearch'].forEach((id) => {
    const e = document.getElementById(id);
    if (e && e.placeholder) e.setAttribute('aria-label', e.placeholder);
  });
}
function enhanceLabels() {
  document.querySelectorAll('input,select,textarea').forEach((c) => {
    if (c.type === 'hidden' || isControlLabeled(c)) return;
    const lab = findVisualLabel(c);
    if (lab) {
      if (lab.tagName === 'LABEL') {
        if (!c.id) { _lblSeq += 1; c.id = 'field-auto-' + _lblSeq; }
        lab.setAttribute('for', c.id);
      } else {
        let lid = lab.id;
        if (!lid) { _lblSeq += 1; lid = 'label-auto-' + _lblSeq; lab.id = lid; }
        c.setAttribute('aria-labelledby', lid);
      }
    } else if (c.placeholder) {
      c.setAttribute('aria-label', c.placeholder);
    }
  });
  applyControlAria();
}

// ── 主题/语言 ──
function setTheme(t) { currentTheme = t; localStorage.setItem('ewb_theme', t); applyTheme(t); }
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('themeToggle').textContent = t === 'light' ? '🌙' : '☀️';
  if (salesHeatmapChart) renderSalesHeatmap();
}
function setLang(l) {
  currentLang = l; localStorage.setItem('ewb_lang', l); applyI18n();
  populatePlatformSelects();
  applyControlAria();
  document.getElementById('welcomeMsg').textContent = t('assistant_greeting');
  loadAllData();
  checkModelStatus();
  enhanceDataPages();
  renderDashboardCharts();
  renderSalesHeatmap();
  // 重新触发当前页面的动态渲染，使语言敏感组件（如店铺连接目录、卡片徽标/按钮）按新语言刷新
  const activeNav = document.querySelector('.nav-item.active');
  const pg = activeNav && activeNav.dataset ? activeNav.dataset.page : null;
  if (pg) window.dispatchEvent(new CustomEvent('ewb:page', { detail: { page: pg } }));
}
function applyI18n() {
  document.documentElement.setAttribute('lang', currentLang === 'zh' ? 'zh-CN' : 'en');
  if (currentLang === 'zh') {
    if (window._restoreAll) _restoreAll(document.body);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n;
      if (I18N.zh[k]) el.textContent = I18N.zh[k];
    });
  } else {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n;
      if (I18N.en[k]) el.textContent = I18N.en[k];
    });
    if (window._applyTranslate) _applyTranslate(document.body);
  }
  const activeNavLabel = document.querySelector('.nav-item.active .nav-label');
  if (activeNavLabel) document.getElementById('topbarTitle').textContent = activeNavLabel.textContent;
  document.getElementById('langToggle').textContent = currentLang === 'zh' ? 'EN' : '中';
}
function t(k) { return I18N[currentLang]?.[k] || k; }

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ── 模型状态 ──
async function checkModelStatus() {
  try {
    const r = await (await fetch('/api/model/status')).json();
    const dot = document.getElementById('modelDot');
    const text = document.getElementById('modelStatusText');
    const online = r.model_available;
    // cloud_ok 仅表示“已填 Key 与模型名”，不代表已验证连通；真实连通以实际对话成功为准
    const isCloud = r.engine_kind === 'cloud';
    const statusWord = online
      ? (isCloud ? L('已配置云端引擎', 'Cloud engine configured') : L('在线', 'Online'))
      : L('未配置', 'Not configured');
    if (online) {
      dot.className = 'status-dot online';
      text.textContent = isCloud ? (r.engine_label || statusWord) : (r.engine_label || L('在线', 'Online'));
    } else {
      dot.className = 'status-dot offline';
      text.textContent = L('未配置', 'Not configured');
    }
    // 聊天页模型栏
    const cmName = document.getElementById('chatModelName');
    const cmDot = document.getElementById('chatModelDot');
    const cmEng = document.getElementById('chatModelEngine');
    if (cmName) {
      cmName.textContent = online ? r.model_name : L('未配置模型', 'No model');
      cmDot.className = 'status-dot ' + (online ? 'online' : 'offline');
      cmEng.textContent = online ? (r.engine_label || '') : L('请到设置页配置', 'Configure in Settings');
    }
    // 悬浮面板模型名
    const fm = document.getElementById('floatChatModel');
    if (fm) {
      const parts = [r.model_name, r.engine_label].filter(Boolean);
      fm.textContent = online ? parts.join(' · ') : L('未配置', 'Not configured');
    }
    const fd = document.getElementById('floatChatDot');
    if (fd) fd.className = 'status-dot ' + (online ? 'online' : 'offline');
    // 内置助手准备状态
    const fw = document.getElementById('floatWarming');
    if (fw) {
      const warming = r.engine === 'builtin' && r.warm === false;
      fw.hidden = !warming;
      if (warming && fd) fd.className = 'status-dot warming';
    }
    const dash = document.getElementById('dashModelStatus');
    if (dash) dash.innerHTML = `
      <p style="margin-bottom:6px;">${online ? '✅ ' + (r.engine_label||'AI') : '⚠️ ' + L('未配置AI引擎', 'AI engine not configured')}</p>
      <p style="font-size:12px;color:var(--text-tertiary);">${r.gpu_info || ''}</p>
      <p style="font-size:12px;color:var(--accent);margin-top:4px;">${r.recommendation || ''}</p>
      ${!online ? '<p style="font-size:12px;color:#f59e0b;margin-top:6px;">' + L('请到设置页配置云端API', 'Configure a cloud API in Settings') + '</p>' : ''}`;
    const set = document.getElementById('settingsModelInfo');
    if (set) set.innerHTML = `
      <div style="margin-bottom:10px;"><span class="badge ${online ? 'badge-success' : 'badge-danger'}">${statusWord}</span></div>
      <p style="font-size:13px;line-height:2;color:var(--text-secondary);">
        ${L('引擎', 'Engine')}：${r.engine_label || ''}<br>${L('模型', 'Model')}：${r.model_name || ''}<br>${r.gpu_info ? 'GPU：' + r.gpu_info : ''}<br>${L('配置', 'Config')}：${r.recommendation || ''}
      </p>`;
  } catch (e) {}
}

// ── 电商助手（聊天） ──
function initChat() {
  document.getElementById('welcomeMsg').textContent = t('assistant_greeting');
  const input = document.getElementById('chatInput');
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  addChatMsg('user', msg);
  chatHistory.push({ role: 'user', content: msg });
  const assistantEl = addChatMsg('assistant', '');
  assistantEl.textContent = '正在为您查询...';
  try {
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: chatHistory.slice(-10), language: currentLang })
    });
    const prose = await streamResponse(res, assistantEl);
    chatHistory.push({ role: 'assistant', content: prose || assistantEl.textContent });
  } catch (e) {
    assistantEl.className = 'chat-msg error';
    assistantEl.textContent = '连接失败: ' + e.message;
  }
}

function addChatMsg(role, text) {
  const el = document.createElement('div');
  el.className = `chat-msg ${role}`; el.textContent = text;
  document.getElementById('chatMessages').appendChild(el);
  el.scrollIntoView({ behavior: 'smooth' });
  return el;
}

// ── 通用SSE流式读取 ──
function stripMd(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

let tokenCount = 0;

async function streamResponse(res, outputEl) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let raw = '';
  outputEl.textContent = '';
  const textSpan = document.createElement('span');
  textSpan.className = 'chat-prose';
  outputEl.appendChild(textSpan);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const d = JSON.parse(line.slice(6));
          if (d.error) { outputEl.className = 'chat-msg error'; outputEl.textContent = d.error; }
          else if (d.card) { renderCalcCard(outputEl, d.card); }
          else if (d.content) {
            raw += d.content;
            textSpan.textContent = stripMd(raw);
            tokenCount = Math.ceil(raw.length / 1.5);
            updateTokenBadge(tokenCount);
          }
        } catch (e) {}
      }
    }
  }
  return raw;
}

// ── 对话内计算卡片（数字由确定性引擎实时计算） ──
const PROFIT_FIELDS = [
  ['selling_price', '售价', 'Selling price'],
  ['product_cost', '商品成本', 'Product cost'],
  ['platform_fee_pct', '平台佣金率 %', 'Commission %'],
  ['payment_fee_pct', '支付费率 %', 'Payment fee %'],
  ['domestic_shipping', '国内运费', 'Domestic shipping'],
  ['international_shipping', '国际运费', 'Intl shipping'],
  ['ad_cost', '广告费', 'Ad cost'],
  ['packaging_cost', '包装成本', 'Packaging'],
  ['refund_rate_pct', '退款率 %', 'Refund rate %']
];
const ACOS_FIELDS = [
  ['cpc', '单次点击花费 CPC', 'CPC'],
  ['cvr', '转化率 %', 'CVR %'],
  ['selling_price', '售价', 'Selling price'],
  ['product_cost', '商品成本', 'Product cost'],
  ['other_fees_pct', '其他费率 %', 'Other fees %'],
  ['target_acos', '目标 ACOS %', 'Target ACOS %']
];
const fieldLabel = (row) => (currentLang === 'en' ? row[2] : row[1]);

function renderCalcCard(container, card) {
  const kind = card.kind === 'acos' ? 'acos' : 'profit';
  const fields = kind === 'acos' ? ACOS_FIELDS : PROFIT_FIELDS;
  const vals = card.vals || {};
  const box = document.createElement('div');
  box.className = 'calc-card';
  const title = document.createElement('div');
  title.className = 'calc-card-title';
  title.textContent = kind === 'acos'
    ? (currentLang === 'en' ? 'ACOS calculator' : '广告 ACOS 计算器')
    : (currentLang === 'en' ? 'Profit calculator' : '利润计算器');
  box.appendChild(title);
  const grid = document.createElement('div');
  grid.className = 'calc-card-grid';
  const inputs = {};
  for (const row of fields) {
    const key = row[0];
    const fg = document.createElement('label');
    fg.className = 'calc-field';
    const lab = document.createElement('span');
    lab.textContent = fieldLabel(row);
    const inp = document.createElement('input');
    inp.type = 'number'; inp.step = 'any'; inp.placeholder = '0';
    if (vals[key] !== undefined) inp.value = vals[key];
    fg.appendChild(lab); fg.appendChild(inp);
    grid.appendChild(fg);
    inputs[key] = inp;
  }
  box.appendChild(grid);
  const result = document.createElement('div');
  result.className = 'calc-card-result';
  box.appendChild(result);
  container.appendChild(box);

  let timer = null;
  const gather = () => {
    const q = {};
    for (const row of fields) {
      const v = inputs[row[0]].value;
      q[row[0]] = v === '' ? 0 : Number(v);
    }
    return q;
  };
  const compute = async () => {
    const url = kind === 'acos' ? '/api/calc/acos' : '/api/calc/profit';
    try {
      const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gather())
      });
      const d = await r.json();
      result.innerHTML = '';
      result.appendChild(kind === 'acos' ? acosResultView(d) : profitResultView(d));
    } catch (e) {}
  };
  for (const row of fields)
    inputs[row[0]].addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(compute, 180); });
  compute();
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return box;
}

function profitResultView(d) {
  const f = document.createDocumentFragment();
  const head = document.createElement('div');
  head.className = 'calc-result-head ' + (d.is_profitable ? 'pos' : 'neg');
  head.textContent = (currentLang === 'en' ? 'Profit' : '利润') + '  ¥' + d.profit
    + '   ' + (currentLang === 'en' ? 'Margin' : '利润率') + ' ' + d.margin_pct + '%';
  f.appendChild(head);
  const be = document.createElement('div');
  be.className = 'calc-result-sub';
  be.textContent = (currentLang === 'en' ? 'Breakeven price' : '盈亏平衡价') + '  ¥' + d.breakeven_price;
  f.appendChild(be);
  if (d.breakeven_refund_rate != null) {
    const rr = document.createElement('div');
    rr.className = 'calc-result-sub';
    rr.textContent = (currentLang === 'en' ? 'Breakeven return rate' : '盈亏平衡退货率') + '  ' + d.breakeven_refund_rate + '%';
    f.appendChild(rr);
  }
  const cb = d.cost_breakdown || {};
  const names = {
    product_cost: ['商品成本', 'Cost'], domestic_shipping: ['国内运费', 'Domestic'],
    international_shipping: ['国际运费', 'Intl'], platform_fee: ['平台佣金', 'Commission'],
    payment_fee: ['支付费', 'Payment'], ad_cost: ['广告', 'Ad'],
    packaging_cost: ['包装', 'Packaging'], refund_loss: ['退款损失', 'Refund loss']
  };
  const parts = [];
  for (const k in names) if (cb[k]) parts.push(names[k][currentLang === 'en' ? 1 : 0] + ' ' + cb[k]);
  const bd = document.createElement('div');
  bd.className = 'calc-result-breakdown';
  bd.textContent = parts.join(' · ');
  f.appendChild(bd);
  return f;
}

function acosResultView(d) {
  const f = document.createDocumentFragment();
  const head = document.createElement('div');
  head.className = 'calc-result-head ' + (d.ad_profitable ? 'pos' : 'neg');
  head.textContent = 'ACOS ' + d.acos_pct + '%   '
    + (currentLang === 'en' ? 'Breakeven' : '盈亏平衡') + ' ' + d.breakeven_acos + '%';
  f.appendChild(head);
  const sub = document.createElement('div');
  sub.className = 'calc-result-sub';
  sub.textContent = (currentLang === 'en' ? 'Cost per order' : '每单广告成本') + ' ¥' + d.cost_per_order;
  f.appendChild(sub);
  const sg = document.createElement('div');
  sg.className = 'calc-result-breakdown';
  if (currentLang === 'en') {
    sg.textContent = d.ad_profitable
      ? 'Ads are profitable; you may increase spend.'
      : 'Ads are above breakeven; refine keywords or lower CPC.';
  } else sg.textContent = d.suggestion || '';
  f.appendChild(sg);
  return f;
}

function updateTokenBadge(n) {
  const el = document.getElementById('chatTokenBadge');
  if (!el) return;
  el.textContent = n + ' tokens';
  const pct = Math.min(100, n / 4096 * 100);
  const color = pct < 50 ? '#22c55e' : pct < 80 ? '#f59e0b' : '#ef4444';
  el.style.color = color;
}

// ── 语音输入 ──
// 离线链路（sherpa，可一次性下载）优先；Web Speech 仅在“离线不可用且浏览器自带该能力”时兜底。
// 全程只给 #voiceBtn 绑定一个生效 handler，离线可用时绝不隐藏按钮（Electron Chromium 通常无 Web Speech）。
async function initVoice() {
  const btn = document.getElementById('voiceBtn');
  if (!btn) return;
  const hasWebSpeech = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
  let offlineAvailable = false;
  try {
    const st = await (window.Voice.getStatus ? window.Voice.getStatus() : { available: false });
    offlineAvailable = !!(st && st.available);
  } catch {}
  // 离线可用、或浏览器无 Web Speech：一律走离线链路（未就绪时点击会引导一次性下载）
  if (offlineAvailable || !hasWebSpeech) {
    if (window.Voice && window.Voice.bindOfflineMic) window.Voice.bindOfflineMic('voiceBtn', 'chatInput');
    return;
  }
  // 兜底：离线不可用且浏览器自带 Web Speech
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.continuous = false; rec.interimResults = false;
  btn.addEventListener('click', () => {
    if (btn.classList.contains('listening')) { rec.stop(); btn.classList.remove('listening'); return; }
    rec.lang = currentLang === 'zh' ? 'zh-CN' : 'en-US';
    rec.start(); btn.classList.add('listening');
  });
  rec.onresult = e => { document.getElementById('chatInput').value = e.results[0][0].transcript; };
  rec.onend = () => btn.classList.remove('listening');
  rec.onerror = () => btn.classList.remove('listening');
}

// ── 深度分析表单（选品/竞品/Listing/评论/客服/关键词） ──
function initAnalysisForms() {
  // 选品
  document.getElementById('selAnalyzeBtn').addEventListener('click', async () => {
    const out = document.getElementById('selResult');
    out.innerHTML = '<p style="color:var(--accent);">🤖 AI正在分析市场需求、竞争度和利润空间...</p>';
    const body = {
      type: 'selection',
      platform: document.getElementById('selPlatform').value,
      product: document.getElementById('selProduct').value,
      cost: parseFloat(document.getElementById('selCost').value) || 0,
      price: parseFloat(document.getElementById('selPrice').value) || 0,
      extra: document.getElementById('selExtra').value,
    };
    await postAnalyze(body, out);
  });

  // 竞品
  document.getElementById('compAnalyzeBtn').addEventListener('click', async () => {
    const out = document.getElementById('compResult');
    out.innerHTML = '<p style="color:var(--accent);">🔍 AI正在拆解竞品Listing和弱点...</p>';
    const body = {
      type: 'competitor',
      platform: document.getElementById('compPlatform').value,
      product: document.getElementById('compProduct').value,
      extra: document.getElementById('compExtra').value,
    };
    await postAnalyze(body, out);
  });

  // Listing生成
  document.getElementById('listBtn').addEventListener('click', async () => {
    const out = document.getElementById('listResult');
    out.innerHTML = '<p style="color:var(--accent);">✨ AI正在生成标题、五点描述和搜索词...</p>';
    const body = {
      type: 'listing',
      platform: document.getElementById('listPlatform').value,
      product: document.getElementById('listProduct').value,
      cost: parseFloat(document.getElementById('listCost').value) || 0,
      price: parseFloat(document.getElementById('listPrice').value) || 0,
      extra: document.getElementById('listExtra').value,
    };
    await postAnalyze(body, out);
  });

  // 评论分析
  // 评论痛点挖掘与改进闭环由 reviews.js 处理

  // 客服话术
  document.getElementById('svcBtn').addEventListener('click', async () => {
    const out = document.getElementById('svcResult');
    out.innerHTML = '<p style="color:var(--accent);">💬 AI正在生成客服回复...</p>';
    const body = {
      type: 'service',
      platform: document.getElementById('svcPlatform').value,
      product: document.getElementById('svcScene').value,
      extra: document.getElementById('svcText').value,
    };
    await postAnalyze(body, out);
  });

  // 关键词检查
  document.getElementById('kwBtn').addEventListener('click', async () => {
    const out = document.getElementById('kwResult');
    out.innerHTML = '<p style="color:var(--accent);">🔑 AI正在分析关键词覆盖...</p>';
    const body = {
      type: 'keywords',
      platform: document.getElementById('kwPlatform').value,
      product: document.getElementById('kwTitle').value,
      extra: document.getElementById('kwExtra').value,
    };
    await postAnalyze(body, out);
  });
}

async function postAnalyze(body, outEl) {
  try {
    body.language = currentLang;
    const res = await fetch('/api/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    outEl.textContent = '';
    await streamResponse(res, outEl);
  } catch (e) {
    outEl.innerHTML = `<p style="color:var(--danger);">请求失败: ${e.message}</p>`;
  }
}

// ── 利润计算器 ──
function gatherProfitBody() {
  return {
    product_cost: parseFloat(document.getElementById('calcProductCost').value) || 0,
    domestic_shipping: parseFloat(document.getElementById('calcDomestic').value) || 0,
    international_shipping: parseFloat(document.getElementById('calcIntl').value) || 0,
    platform_fee_pct: parseFloat(document.getElementById('calcPlatformFee').value) || 0,
    payment_fee_pct: parseFloat(document.getElementById('calcPaymentFee').value) || 0,
    ad_cost: parseFloat(document.getElementById('calcAd').value) || 0,
    refund_rate_pct: parseFloat(document.getElementById('calcRefund').value) || 0,
    packaging_cost: parseFloat(document.getElementById('calcPackaging').value) || 0,
    selling_price: parseFloat(document.getElementById('calcPrice').value) || 0,
  };
}
let profitSensChart = null;
async function renderProfitSensitivity(body) {
  const el = document.getElementById('chartProfitSensitivity');
  if (!el || !window.echarts) return;
  const r = await postJson('/api/calc/profit/series', body);
  if (!profitSensChart) profitSensChart = echarts.init(el);
  profitSensChart.setOption({
    tooltip: { trigger: 'axis', valueFormatter: (v) => (Math.round(v * 100) / 100) },
    legend: { data: ['利润', '利润率 %'], top: 0, textStyle: { fontSize: 11 } },
    grid: { left: 48, right: 48, top: 34, bottom: 30 },
    xAxis: { type: 'category', name: '售价', data: r.prices, axisLabel: { color: '#9ca3af', fontSize: 10, interval: 3 } },
    yAxis: [
      { type: 'value', name: '利润', axisLabel: { color: '#9ca3af', fontSize: 10 }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
      { type: 'value', name: '利润率%', axisLabel: { color: '#9ca3af', fontSize: 10, formatter: '{value}%' } },
    ],
    series: [
      { name: '利润', type: 'line', smooth: true, showSymbol: false, data: r.profits,
        lineStyle: { color: '#4f46e5', width: 2.5 }, itemStyle: { color: '#4f46e5' },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: '#ef4444', type: 'dashed' },
          data: [{ yAxis: 0 }], label: { formatter: '保本', fontSize: 10 } } },
      { name: '利润率 %', type: 'line', smooth: true, showSymbol: false, yAxisIndex: 1, data: r.margins,
        lineStyle: { color: '#0891b2', width: 2, type: 'dashed' }, itemStyle: { color: '#0891b2' } },
    ],
  });
  profitSensChart.resize();
}
let refundSensChart = null;
async function renderRefundSensitivity(body) {
  const el = document.getElementById('chartRefundSensitivity');
  if (!el || !window.echarts) return;
  const r = await postJson('/api/calc/profit/refund-series', body);
  if (!refundSensChart) refundSensChart = echarts.init(el);
  refundSensChart.setOption({
    tooltip: { trigger: 'axis', valueFormatter: (v) => (Math.round(v * 100) / 100) },
    legend: { data: ['利润', '利润率 %'], top: 0, textStyle: { fontSize: 11 } },
    grid: { left: 48, right: 48, top: 34, bottom: 30 },
    xAxis: { type: 'category', name: '退货率', data: r.rates, axisLabel: { color: '#9ca3af', fontSize: 10, interval: 3, formatter: '{value}%' } },
    yAxis: [
      { type: 'value', name: '利润', axisLabel: { color: '#9ca3af', fontSize: 10 }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
      { type: 'value', name: '利润率%', axisLabel: { color: '#9ca3af', fontSize: 10, formatter: '{value}%' } },
    ],
    series: [
      { name: '利润', type: 'line', smooth: true, showSymbol: false, data: r.profits,
        lineStyle: { color: '#4f46e5', width: 2.5 }, itemStyle: { color: '#4f46e5' },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: '#ef4444', type: 'dashed' },
          data: [{ yAxis: 0 }], label: { formatter: '保本', fontSize: 10 } } },
      { name: '利润率 %', type: 'line', smooth: true, showSymbol: false, yAxisIndex: 1, data: r.margins,
        lineStyle: { color: '#0891b2', width: 2, type: 'dashed' }, itemStyle: { color: '#0891b2' } },
    ],
  });
  refundSensChart.resize();
}
function initCalculator() {
  document.getElementById('calcBtn').addEventListener('click', async () => {
    const body = gatherProfitBody();
    renderProfitSensitivity(body);
    renderRefundSensitivity(body);
    try {
      const r = await (await fetch('/api/calc/profit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })).json();
      document.getElementById('calcResultCard').style.display = 'block';
      const pc = r.is_profitable ? 'positive' : 'negative';
      const badge = r.is_profitable ? '<span class="badge badge-success">盈利</span>' : '<span class="badge badge-danger">亏损</span>';
      document.getElementById('calcResult').innerHTML = `
        <div style="margin-bottom:12px;">${badge}</div>
        <div class="profit-number ${pc}">¥${r.profit}</div>
        <p style="color:var(--text-tertiary);margin:8px 0 16px;">利润率: ${r.margin_pct}%</p>
        <div style="text-align:left;font-size:13px;line-height:2;">
          <div style="display:flex;justify-content:space-between;"><span>售价</span><strong>¥${r.selling_price}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>总成本</span><strong>¥${r.total_cost}</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>保本价</span><strong>¥${r.breakeven_price}</strong></div>
        </div>`;
    } catch (e) { toast('计算失败'); }
  });
  renderProfitSensitivity(gatherProfitBody());
  renderRefundSensitivity(gatherProfitBody());
}

// ── ACOS计算器 ──
function gatherAcosBody() {
  return {
    cpc: parseFloat(document.getElementById('acosCpc').value) || 0,
    cvr: parseFloat(document.getElementById('acosCvr').value) || 0,
    selling_price: parseFloat(document.getElementById('acosPrice').value) || 0,
    product_cost: parseFloat(document.getElementById('acosCost').value) || 0,
    other_fees_pct: parseFloat(document.getElementById('acosFees').value) || 0,
    target_acos: parseFloat(document.getElementById('acosTarget').value) || 30,
  };
}
let acosCurveChart = null;
async function renderAcosCurve(body) {
  const el = document.getElementById('chartAcosCurve');
  if (!el || !window.echarts) return;
  const r = await postJson('/api/calc/acos/series', body);
  if (!acosCurveChart) acosCurveChart = echarts.init(el);
  acosCurveChart.setOption({
    tooltip: { trigger: 'axis', valueFormatter: (v) => (Math.round(v * 10) / 10) + '%' },
    legend: { data: ['ACOS'], top: 0, textStyle: { fontSize: 11 } },
    grid: { left: 52, right: 24, top: 34, bottom: 30 },
    xAxis: { type: 'category', name: 'CPC', data: r.cpcs, axisLabel: { color: '#9ca3af', fontSize: 10, interval: 3 } },
    yAxis: { type: 'value', name: 'ACOS %', axisLabel: { color: '#9ca3af', fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
    series: [{
      name: 'ACOS', type: 'line', smooth: true, showSymbol: false, data: r.acos,
      lineStyle: { color: '#4f46e5', width: 2.5 }, itemStyle: { color: '#4f46e5' },
      markLine: { silent: true, symbol: 'none', lineStyle: { color: '#ef4444', type: 'dashed' },
        data: [{ yAxis: r.breakeven_acos }], label: { formatter: '盈亏平衡 ' + r.breakeven_acos + '%', fontSize: 10 } },
      markPoint: { symbol: 'circle', symbolSize: 7,
        data: [{ coord: [String(r.current_cpc), r.current_acos], itemStyle: { color: '#f59e0b' } }], label: { show: false } },
    }],
  });
  acosCurveChart.resize();
}
function initACOS() {
  document.getElementById('acosBtn').addEventListener('click', async () => {
    const body = gatherAcosBody();
    renderAcosCurve(body);
    try {
      const r = await (await fetch('/api/calc/acos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })).json();
      document.getElementById('acosResultCard').style.display = 'block';
      const profitable = r.ad_profitable;
      document.getElementById('acosResult').innerHTML = `
        <div style="text-align:center;margin-bottom:16px;">
          <span class="badge ${profitable ? 'badge-success' : 'badge-danger'}">${profitable ? '广告盈利' : '广告亏损'}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="stat-card"><div class="stat-label">每单广告成本</div><div class="stat-value" style="font-size:20px;">¥${r.cost_per_order}</div></div>
          <div class="stat-card"><div class="stat-label">当前ACOS</div><div class="stat-value" style="font-size:20px;color:${profitable ? 'var(--success)' : 'var(--danger)'}">${r.acos_pct}%</div></div>
          <div class="stat-card"><div class="stat-label">毛利率</div><div class="stat-value" style="font-size:20px;">${r.gross_margin_pct}%</div></div>
          <div class="stat-card"><div class="stat-label">盈亏平衡ACOS</div><div class="stat-value" style="font-size:20px;">${r.breakeven_acos}%</div></div>
        </div>
        <p style="margin-top:16px;padding:12px;background:var(--bg-active);border-radius:8px;font-size:13px;">${r.suggestion}</p>`;
    } catch (e) { toast('计算失败'); }
  });
  renderAcosCurve(gatherAcosBody());
}

// ── 文案润色 ──
function initDeAI() {
  document.getElementById('deaiBtn').addEventListener('click', async () => {
    const text = document.getElementById('deaiInput').value.trim();
    if (!text) { toast('请输入文本'); return; }
    const out = document.getElementById('deaiOutput');
    out.textContent = '润色中...';
    try {
      const res = await fetch('/api/deai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, style: document.getElementById('deaiStyle').value })
      });
      out.textContent = '';
      await streamResponse(res, out);
    } catch (e) { out.textContent = '错误: ' + e.message; }
  });
  document.getElementById('deaiCopyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('deaiOutput').textContent).then(() => toast('已复制'));
  });
}

// ── 数据加载与渲染 ──
async function loadAllData() {
  try {
    const [p, pr, g, l, c] = await Promise.all([
      fetch('/api/data/platforms').then(r => r.json()),
      fetch('/api/data/prompts').then(r => r.json()),
      fetch('/api/data/guides').then(r => r.json()),
      fetch('/api/data/logistics').then(r => r.json()),
      fetch('/api/data/compliance').then(r => r.json()),
    ]);
    platformsData = p; promptsData = pr; guidesData = g; logisticsData = l; complianceData = c;
    renderPlatforms(); renderPrompts(); renderGuides(); renderLogistics(); renderCompliance();
  } catch (e) {}
}

const L = (zh, en) => (currentLang === 'en' ? (en != null ? en : zh) : zh);

function renderPlatforms() {
  if (!platformsData) return;
  const en = currentLang === 'en';
  const lblEntry = en ? 'Entry' : '入驻';
  const lblFee = en ? 'Fees' : '费率';
  const fill = (box, list) => {
    box.innerHTML = '';
    list.forEach(p => {
      const meta = (platformsData.platform_meta || {})[p.id] || {};
      const isEn = currentLang === 'en';
      let metaLine = '';
      if (meta.official_url) {
        const links = [];
        if (meta.official_url) links.push([meta.official_url, isEn ? 'Official site' : '官方入口']);
        if (meta.rule_url) links.push([meta.rule_url, isEn ? 'Rules' : '规则中心']);
        if (meta.help_url) links.push([meta.help_url, isEn ? 'Help' : '帮助中心']);
        if (meta.learn_url) links.push([meta.learn_url, isEn ? 'Seller Academy' : '学习中心']);
        if (meta.china_url) links.push([meta.china_url, isEn ? 'Global Selling' : '全球开店']);
        const linkHtml = '<div class="pm-links">' +
          links.map(([u, l]) => `<a href="${u}" target="_blank" rel="noopener">${l}</a>`).join('<span class="pm-sep">·</span>') + '</div>';
        const phoneHtml = meta.seller_phone
          ? `<div class="pm-line">${isEn ? 'Seller hotline' : '商家热线'}：<b>${meta.seller_phone}</b>${(!isEn && meta.phone_hours_zh) ? '（' + meta.phone_hours_zh + '）' : ''}</div>` : '';
        const support = isEn ? meta.online_support_en : meta.online_support_zh;
        const supportHtml = support ? `<div class="pm-line">${support}</div>` : '';
        const note = isEn ? meta.note_en : meta.note_zh;
        const noteHtml = note ? `<div class="pm-line pm-note">${note}</div>` : '';
        const updatedHtml = `<div class="pm-updated">${isEn ? 'Compiled' : '资料整理'} ${meta.updated} · ${isEn ? 'verify in seller center' : '请以卖家后台为准'}</div>`;
        metaLine = `<div class="platform-meta">${linkHtml}${phoneHtml}${supportHtml}${noteHtml}${updatedHtml}</div>`;
      }
      box.innerHTML += `<div class="platform-card">
        <div class="platform-header"><span class="platform-icon">${p.icon}</span>
          <div><div class="platform-name">${L(p.name_zh, p.name_en)}</div>
          <div class="platform-cat">${p.category || ''}</div></div></div>
        <div class="platform-detail">
          <p><strong>${lblEntry}:</strong> ${L(p.entry_zh, p.entry_en)}</p>
          <p><strong>${lblFee}:</strong> ${L(p.commission, p.commission_en)}</p>
        </div>${metaLine}</div>`;
    });
  };
  fill(document.getElementById('domesticPlatforms'), platformsData.domestic);
  fill(document.getElementById('crossborderPlatforms'), platformsData.crossborder);
}

function renderPrompts() {
  if (!promptsData) return;
  const en = currentLang === 'en';
  const c = document.getElementById('promptsContainer');
  c.innerHTML = '';
  promptsData.categories.forEach(cat => {
    const sec = document.createElement('div');
    sec.style.marginBottom = '20px';
    sec.innerHTML = `<h3 style="font-size:14px;margin-bottom:10px;">${L(cat.name_zh, cat.name_en)}</h3>`;
    const grid = document.createElement('div');
    grid.className = 'grid grid-3';
    cat.prompts.forEach(p => {
      const tpl = L(p.template_zh, p.template_en);
      grid.innerHTML += `<div class="prompt-card" data-prompt="${(tpl || '').replace(/"/g, '&quot;')}">
        <div class="prompt-title">${L(p.title_zh, p.title_en)}</div>
        <div class="prompt-text">${tpl || ''}</div></div>`;
    });
    sec.appendChild(grid); c.appendChild(sec);
  });
  c.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', () => {
      document.getElementById('deaiInput').value = card.dataset.prompt;
      navigateTo('deai');
      toast(en ? 'Prompt template inserted' : '已填入提示词模板');
    });
  });
  const search = document.getElementById('promptSearch');
  if (search) search.oninput = e => {
    const q = e.target.value.toLowerCase();
    c.querySelectorAll('.prompt-card').forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };
}

function renderGuides() {
  if (!guidesData) return;
  document.getElementById('guideDomesticTitle').textContent =
    '🇨🇳 ' + L(guidesData.domestic.title_zh, guidesData.domestic.title_en);
  document.getElementById('guideCrossTitle').textContent =
    '🌏 ' + L(guidesData.crossborder.title_zh, guidesData.crossborder.title_en);
  const render = (id, steps) => {
    const el = document.getElementById(id); el.innerHTML = '';
    steps.forEach(s => {
      const details = L(s.details_zh, s.details_en);
      el.innerHTML += `<div class="step">
        <div class="step-dot">${s.order}</div>
        <div class="step-content">
          <div class="step-title">${L(s.title_zh, s.title_en)}</div>
          <div class="step-desc">${(details || []).join(' · ')}</div>
        </div></div>`;
    });
  };
  render('guideDomesticSteps', guidesData.domestic.steps);
  render('guideCrossSteps', guidesData.crossborder.steps);
  if (guidesData.entity_types) {
    const et = guidesData.entity_types;
    const etTitle = document.getElementById('guideEntityTitle');
    if (etTitle) etTitle.textContent = L(et.title_zh, et.title_en);
    const etIntro = document.getElementById('guideEntityIntro');
    if (etIntro) etIntro.textContent = L(et.intro_zh, et.intro_en);
    const body = document.getElementById('guideEntityBody');
    if (body) {
      const row = (labelZh, labelEn, valZh, valEn) =>
        '<div class="et-row"><dt>' + L(labelZh, labelEn) + '</dt><dd>' + L(valZh, valEn) + '</dd></div>';
      body.innerHTML = et.types.map(t =>
        '<div class="card et-card"><div class="et-name">' + L(t.name_zh, t.name_en) + '</div>' +
        '<dl>' +
        row('所需证照', 'Documents', t.docs_zh, t.docs_en) +
        row('可开店铺', 'Store types', t.stores_zh, t.stores_en) +
        row('发票与税务', 'Invoicing & tax', t.tax_zh, t.tax_en) +
        row('适用平台', 'Platforms', t.platforms_zh, t.platforms_en) +
        row('保证金', 'Deposit', t.deposit_zh, t.deposit_en) +
        row('适合人群', 'Best for', t.fit_zh, t.fit_en) +
        '</dl></div>').join('');
    }
  }
  document.getElementById('guideMistakesList').innerHTML =
    L(guidesData.common_mistakes.items_zh, guidesData.common_mistakes.items_en)
      .map(m => `<li>${m}</li>`).join('');
}

function renderLogistics() {
  if (!logisticsData) return;
  const en = currentLang === 'en';
  const lc = { price: en ? 'Est. price' : '参考价', time: en ? 'Time' : '时效',
    best: en ? 'Best for' : '适合' };
  const intl = document.getElementById('intlLogistics');
  intl.innerHTML = '';
  logisticsData.international_shipping.forEach(s => {
    intl.innerHTML += `<div class="platform-card">
      <div class="platform-header"><div><div class="platform-name">${L(s.name, s.name_en)}</div>
      <div class="platform-cat">${L(s.name, s.name_en)}</div></div></div>
      <div class="platform-detail">
        <p><strong>${lc.price}:</strong> ${s.min_cost}</p>
        <p><strong>${lc.time}:</strong> ${L(s.days, s.days_en)}</p>
        <p><strong>${lc.best}:</strong> ${L(s.best_for, s.best_for_en)}</p>
        <p style="color:var(--success);">✓ ${L(s.pros, s.pros_en)}</p>
        <p style="color:var(--danger);">✗ ${L(s.cons, s.cons_en)}</p>
      </div></div>`;
  });
  const dom = document.getElementById('domLogistics');
  dom.innerHTML = '';
  logisticsData.domestic_shipping.forEach(s => {
    dom.innerHTML += `<div class="stat-card">
      <div class="stat-label">${L(s.name, s.name_en)}</div>
      <div style="font-size:18px;font-weight:700;margin:8px 0;">${s.cost}</div>
      <div style="font-size:12px;color:var(--text-tertiary);">${L(s.best, s.best_en)}</div></div>`;
  });
}

function renderCompliance() {
  if (!complianceData) return;
  const en = currentLang === 'en';
  const c = document.getElementById('complianceContainer');
  c.innerHTML = '';
  const pre = complianceData.pre_listing_checklist;
  c.innerHTML += `<div class="card">
    <div class="card-title">✅ ${L(pre.title, pre.title_en)}</div>
    ${pre.items.map(sec => `
      <div style="margin-bottom:14px;">
        <strong style="color:var(--accent);font-size:13px;">${L(sec.category, sec.category_en)}</strong>
        <ul style="padding-left:20px;margin-top:6px;line-height:2;font-size:13px;color:var(--text-secondary);">
          ${L(sec.items, sec.items_en).map(i => `<li>${i}</li>`).join('')}
        </ul></div>`).join('')}
  </div>`;
  const pro = complianceData.prohibited_items;
  const l1 = en ? 'Restricted on domestic platforms' : '国内平台限售';
  const l2 = en ? 'Restricted on cross-border platforms' : '跨境平台限售';
  c.innerHTML += `<div class="card">
    <div class="card-title">🚫 ${L(pro.title, pro.title_en)}</div>
    <p style="font-size:13px;font-weight:600;margin:10px 0 6px;">${l1}</p>
    <ul style="padding-left:20px;line-height:2;font-size:13px;color:var(--text-secondary);">
      ${L(pro.domestic, pro.domestic_en).map(i => `<li>${i}</li>`).join('')}</ul>
    <p style="font-size:13px;font-weight:600;margin:14px 0 6px;">${l2}</p>
    <ul style="padding-left:20px;line-height:2;font-size:13px;color:var(--text-secondary);">
      ${L(pro.crossborder, pro.crossborder_en).map(i => `<li>${i}</li>`).join('')}</ul>
  </div>`;
  // 每日检查清单（如页面有容器）
  const rc = document.getElementById('reviewChecklistContainer');
  if (rc) {
    const r = complianceData.review_checklist;
    rc.innerHTML = `<div class="card"><div class="card-title">📋 ${L(r.title, r.title_en)}</div>
      <ul style="padding-left:20px;line-height:2;font-size:13px;color:var(--text-secondary);">
        ${L(r.items, r.items_en).map(i => `<li>${i}</li>`).join('')}</ul></div>`;
  }
}

// ── 分步引导（底部小卡片，不遮屏） ──
const TOUR_STEPS = [
  { icon: '🛒', title: '欢迎使用盈脉', text: '您的电商经营助手。接下来带您快速了解核心功能，随时点✕跳过。', page: 'dashboard' },
  { icon: '🤖', title: '电商助手', text: '点右下角圆球，随时问任何电商问题。选品、平台规则、利润测算、客服话术都能答。', page: 'dashboard', action: 'openFloat' },
  { icon: '🎯', title: '选品与竞品', text: '输入产品和成本，AI分析市场需求、竞争度、利润空间。也可拆解竞品弱点。', page: 'selection' },
  { icon: '💰', title: '成本与物流', text: '利润计算器自动算保本价和利润率，ACOS计算器判断广告是否划算。', page: 'calculator' },
  { icon: '🚀', title: '新手入行', text: '从没做过电商？从准备身份证到出单的完整指引，国内店和跨境店都有。', page: 'guide' },
  { icon: '⚙️', title: '设置', text: '默认内置模型，无需联网。有自己的API Key可在这里接入获得更强能力。', page: 'settings' },
];

let tourIdx = 0;

function showOnboarding() {
  tourIdx = 0;
  _renderTour();
}

function _renderTour() {
  document.getElementById('tourOverlay')?.remove();
  const step = TOUR_STEPS[tourIdx];
  navigateTo(step.page);
  if (step.action === 'openFloat') toggleFloatChat();
  else document.getElementById('floatChatPanel')?.classList.remove('open');
  const ov = document.createElement('div');
  ov.id = 'tourOverlay';
  ov.style.cssText = 'position:fixed;inset:0;background:transparent;z-index:2000;pointer-events:none;';
  const card = document.createElement('div');
  card.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--bg-glass);border:1px solid var(--bg-glass-border);border-radius:12px;padding:16px 20px;box-shadow:0 12px 32px rgba(0,0,0,0.16);max-width:440px;z-index:2001;pointer-events:auto;';
  const prevBtn = tourIdx > 0 ? `<button class="btn btn-ghost" style="padding:4px 12px;font-size:12px;" onclick="_prevTour()">上一步</button>` : '';
  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px;">
      <div style="font-size:28px;">${step.icon}</div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${step.title}</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.6;">${step.text}</div>
      </div>
      <button onclick="_closeTour()" style="background:none;border:none;font-size:16px;cursor:pointer;color:var(--text-tertiary);padding:0 4px;">✕</button>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;">
      <span style="font-size:11px;color:var(--text-tertiary);">${tourIdx+1} / ${TOUR_STEPS.length}</span>
      <div style="display:flex;gap:8px;">
        ${prevBtn}
        <button class="btn btn-ghost" style="padding:4px 12px;font-size:12px;" onclick="_closeTour()">跳过</button>
        <button class="btn btn-primary" style="padding:4px 12px;font-size:12px;" onclick="_nextTour()">${tourIdx === TOUR_STEPS.length-1 ? '开始使用' : '下一步'}</button>
      </div>
    </div>`;
  ov.appendChild(card);
  document.body.appendChild(ov);
}

function _prevTour() {
  if (tourIdx > 0) { tourIdx--; _renderTour(); }
}

function _nextTour() {
  tourIdx++;
  if (tourIdx >= TOUR_STEPS.length) { _closeTour(); return; }
  _renderTour();
}

function _closeTour() {
  document.getElementById('tourOverlay')?.remove();
  document.getElementById('floatChatPanel')?.classList.remove('open');
  document.getElementById('floatAssistant').style.display = 'flex';
  localStorage.setItem('ewb_onb_v2', 'done');
  const t = document.getElementById('onboardingToggle');
  if (t) t.checked = false;
}

// 设置里的引导开关：打开时立即播放
document.addEventListener('DOMContentLoaded', () => {
  const t = document.getElementById('onboardingToggle');
  if (t) {
    t.checked = localStorage.getItem('ewb_onb_v2') !== 'done';
    t.onchange = () => {
      if (t.checked) {
        localStorage.removeItem('ewb_onb_v2');
        showOnboarding();
      } else {
        localStorage.setItem('ewb_onb_v2', 'done');
        document.getElementById('tourOverlay')?.remove();
      }
    };
  }
  loadModelConfig();

  // 关闭窗口行为
  const ca = document.getElementById('closeAction');
  if (ca) {
    fetch('/api/settings/app').then((r) => r.json()).then((s) => { ca.value = s.closeAction || 'ask'; }).catch(() => {});
    ca.onchange = () => fetch('/api/settings/app', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ closeAction: ca.value }),
    });
  }
  loadMobileInfo();
});

const PRESETS_MAP = {
  builtin:    {base_url: '', model: '', key_url: '', label: '内置助手'},
  deepseek:   {base_url: 'https://api.deepseek.com/v1', model: '', key_url: 'https://platform.deepseek.com/api_keys', label: 'DeepSeek'},
  qwen:       {base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: '', key_url: 'https://dashscope.aliyuncs.com/apiKey', label: '通义千问'},
  zhipu:      {base_url: 'https://open.bigmodel.cn/api/paas/v4', model: '', key_url: 'https://open.bigmodel.cn/usercenter/apikeys', label: '智谱GLM'},
  moonshot:   {base_url: 'https://api.moonshot.cn/v1', model: '', key_url: 'https://platform.moonshot.cn/console/api-keys', label: '月之暗面'},
  siliconflow:{base_url: 'https://api.siliconflow.cn/v1', model: '', key_url: 'https://cloud.siliconflow.cn/account/ak', label: '硅基流动'},
  openai:     {base_url: 'https://api.openai.com/v1', model: '', key_url: 'https://platform.openai.com/api-keys', label: 'OpenAI'},
  lmstudio:   {base_url: 'http://127.0.0.1:1234/v1', model: '', key_url: '', label: 'LM Studio'},
  ollama:     {base_url: 'http://127.0.0.1:11434', model: '', key_url: '', label: 'Ollama'},
};

function _modelPlaceholder(preset) {
  return preset === 'builtin' ? '内置助手' : '检测后显示模型';
}

function _renderKeyLink(preset) {
  const p = PRESETS_MAP[preset];
  const el = document.getElementById('cfgKeyLink');
  if (p && p.key_url) {
    el.innerHTML = '没有Key？可在 <a href="' + p.key_url + '" target="_blank" style="color:var(--accent);">' + p.label + ' 官方页面</a> 获取';
  } else {
    el.innerHTML = '';
  }
}

async function loadModelConfig() {
  try {
    const r = await fetch('/api/config/model');
    const cfg = await r.json();
    const provider = cfg.provider && PRESETS_MAP[cfg.provider] ? cfg.provider : 'builtin';
    document.getElementById('cfgPreset').value = provider;
    document.getElementById('cfgBaseUrl').value = cfg.base_url || '';
    if (cfg.api_key) document.getElementById('cfgApiKey').value = cfg.api_key;
    const sel = document.getElementById('cfgModel');
    sel.innerHTML = '';
    if (cfg.model) {
      const o = document.createElement('option');
      o.value = cfg.model; o.textContent = cfg.model; sel.appendChild(o);
    } else {
      const o = document.createElement('option');
      o.value = ''; o.disabled = true; o.textContent = _modelPlaceholder(provider);
      sel.appendChild(o);
    }
    _renderKeyLink(provider);
  } catch (e) {}
}

function applyPreset() {
  const preset = document.getElementById('cfgPreset').value;
  const p = PRESETS_MAP[preset];
  document.getElementById('cfgBaseUrl').value = p ? p.base_url : '';
  const sel = document.getElementById('cfgModel');
  sel.innerHTML = '';
  const ph = document.createElement('option');
  ph.value = ''; ph.disabled = true; ph.textContent = _modelPlaceholder(preset);
  sel.appendChild(ph);
  _renderKeyLink(preset);
  if (preset === 'builtin') document.getElementById('cfgApiKey').value = '';
}

async function detectLocalModels() {
  const hint = document.getElementById('localModelsHint');
  hint.textContent = '正在检测...';
  hint.style.color = 'var(--text-tertiary)';
  try {
    const r = await fetch('/api/local/models');
    const res = await r.json();
    if (res.models && res.models.length > 0) {
      hint.innerHTML = '发现 ' + res.models.length + ' 个本地模型：' + res.models.map(m => m.name).join('、');
      hint.style.color = '#22c55e';
      const sel = document.getElementById('cfgModel');
      sel.innerHTML = '';
      res.models.forEach(m => {
        const o = document.createElement('option');
        o.value = m.name; o.textContent = m.name + ' (' + m.size + ')'; sel.appendChild(o);
      });
    } else {
      hint.textContent = '未检测到本地模型。请确认Ollama或LM Studio已启动。';
      hint.style.color = '#f59e0b';
    }
  } catch (e) {
    hint.textContent = '检测失败: ' + e.message;
    hint.style.color = '#ef4444';
  }
}

async function testProvider() {
  const preset = document.getElementById('cfgPreset').value;
  const hint = document.getElementById('cfgModelsHint');
  if (preset === 'builtin') {
    hint.textContent = '内置助手无需检测，开箱即用';
    hint.style.color = '#22c55e';
    return;
  }
  if (preset === 'ollama') { detectLocalModels(); return; }
  const base_url = document.getElementById('cfgBaseUrl').value.trim();
  const api_key = document.getElementById('cfgApiKey').value.trim();
  const isLocal = preset === 'lmstudio';
  if (!base_url) { hint.textContent = '⚠️ 请先填写API地址'; hint.style.color = '#ef4444'; return; }
  if (!api_key && !isLocal) { hint.textContent = '⚠️ 请先填写API Key'; hint.style.color = '#ef4444'; return; }
  hint.textContent = '正在检测...'; hint.style.color = 'var(--text-tertiary)';
  try {
    const r = await fetch('/api/config/test', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({provider: preset, base_url, api_key}),
    });
    const res = await r.json();
    if (res.ok) {
      const sel = document.getElementById('cfgModel');
      sel.innerHTML = '';
      res.models.forEach(m => {
        const o = document.createElement('option');
        o.value = m; o.textContent = m; sel.appendChild(o);
      });
      hint.textContent = `✅ Key有效，发现 ${res.count} 个模型，请选择`;
      hint.style.color = '#22c55e';
    } else {
      hint.textContent = '❌ ' + (res.error || '检测失败');
      hint.style.color = '#ef4444';
    }
  } catch (e) {
    hint.textContent = '❌ ' + e.message; hint.style.color = '#ef4444';
  }
}

async function saveModelConfig() {
  const preset = document.getElementById('cfgPreset').value;
  const cfg = {
    provider: preset,
    base_url: document.getElementById('cfgBaseUrl').value.trim(),
    model: document.getElementById('cfgModel').value,
  };
  const key = document.getElementById('cfgApiKey').value.trim();
  if (key) cfg.api_key = key;
  if (preset === 'builtin') { cfg.base_url = ''; cfg.model = ''; delete cfg.api_key; }
  const st = document.getElementById('cfgStatus');
  st.textContent = '保存中...';
  try {
    const r = await fetch('/api/config/model', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(cfg),
    });
    const res = await r.json();
    st.textContent = '✅ ' + (res.message || '已保存，立即生效');
    st.style.color = '#22c55e';
    checkModelStatus();
  } catch (e) {
    st.textContent = '❌ 保存失败: ' + e.message;
  }
}

// ── 悬浮电商助手 ──
let floatHistory = [];

function toggleFloatChat() {
  const panel = document.getElementById('floatChatPanel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    checkModelStatus();
    document.getElementById('floatChatInput').focus();
  }
}

async function sendFloatMessage() {
  const input = document.getElementById('floatChatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  const msgs = document.getElementById('floatChatMessages');
  const u = document.createElement('div');
  u.className = 'chat-msg user';
  u.style.alignSelf = 'flex-end';
  u.textContent = msg;
  msgs.appendChild(u);
  floatHistory.push({ role: 'user', content: msg });
  const a = document.createElement('div');
  a.className = 'chat-msg assistant';
  a.textContent = '正在为您查询...';
  msgs.appendChild(a);
  msgs.scrollTop = msgs.scrollHeight;
  try {
    const res = await fetch('/api/chat', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ message: msg, history: floatHistory.slice(-10), language: currentLang })
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '', raw = '';
    a.textContent = '';
    const prose = document.createElement('div');
    prose.className = 'chat-prose';
    a.appendChild(prose);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const d = JSON.parse(line.slice(6));
            if (d.error) { a.textContent = d.error; }
            else if (d.card) { renderCalcCard(a, d.card); }
            else if (d.content) {
              raw += d.content;
              prose.textContent = stripMd(raw);
            }
          } catch(e) {}
        }
      }
      msgs.scrollTop = msgs.scrollHeight;
    }
    floatHistory.push({ role: 'assistant', content: raw });
  } catch(e) {
    a.textContent = '连接失败: ' + e.message;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('floatSendBtn');
  if (btn) btn.addEventListener('click', sendFloatMessage);
  const input = document.getElementById('floatChatInput');
  if (input) input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFloatMessage(); }
  });
  initDashboard();
  loadProducts();
  loadHistory();
  loadOrders();
  loadShipping();
  loadAftersales();
  loadInventory();
  loadPurchases();
  loadSuppliers();
});

// ── 订单 ──
async function loadOrders() {
  if (window.WB) return WB.renderOrders();
  try {
    const list = await (await fetch('/api/orders')).json();
    const body = document.getElementById('ordersBody');
    if (!body) return;
    const statusMap = {pending:'待付款',paid:'已付款',shipped:'已发货',completed:'已完成',cancelled:'已取消'};
    if (!list.length) { body.innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--text-tertiary);padding:24px;">暂无订单</td></tr>'; return; }
    body.innerHTML = list.map(o => '<tr><td>'+(o.order_no||'-')+'</td><td>'+(o.platform||'-')+'</td><td>'+(o.product_name||'-')+'</td><td>'+o.qty+'</td><td class="num">¥'+o.total_amount+'</td><td>'+(o.buyer||'-')+'</td><td><span class="badge badge-accent">'+(statusMap[o.status]||o.status)+'</span></td><td><button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;" onclick="deleteOrder('+o.id+')">删除</button></td></tr>').join('');
    renderSalesHeatmap();
  } catch(e){}
}
function closeModal() {
  document.getElementById('modalBackdrop')?.remove();
  document.removeEventListener('keydown', modalKeyHandler);
}
function modalKeyHandler(e) {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && !['SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    document.getElementById('modalSubmitBtn')?.click();
  }
}
function openFormModal(opts) {
  closeModal();
  const fields = opts.fields || [];
  const backdrop = document.createElement('div');
  backdrop.id = 'modalBackdrop';
  backdrop.className = 'modal-backdrop';
  const fieldHtml = fields.map((f, i) => {
    const lab = `<label class="modal-label" for="mf_${i}">${f.label}${f.required ? '<span class="req">*</span>' : ''}</label>`;
    let ctrl;
    if (f.type === 'select') {
      const opts2 = (f.options || []).map(o =>
        `<option value="${o.value}" ${String(f.value) === String(o.value) ? 'selected' : ''}>${o.label}</option>`).join('');
      ctrl = `<select id="mf_${i}" class="modal-input" data-key="${f.key}">${opts2}</select>`;
    } else if (f.type === 'platform') {
      ctrl = `<select id="mf_${i}" class="modal-input" data-key="${f.key}" data-platforms${
        f.allowBlank ? ' data-allow-blank' : ''}>${
        f.value ? `<option value="${f.value}" selected></option>` : ''}</select>`;
    } else if (f.type === 'product') {
      ctrl = `<input id="mf_${i}" class="modal-input" type="text" list="ewbProductDl"
        data-key="${f.key}" placeholder="${f.placeholder || ''}" value="${f.value != null ? f.value : ''}">`;
    } else if (f.type === 'supplier') {
      ctrl = `<input id="mf_${i}" class="modal-input" type="text" list="ewbSupplierDl"
        data-key="${f.key}" placeholder="${f.placeholder || ''}" value="${f.value != null ? f.value : ''}">`;
    } else if (f.type === 'textarea') {
      ctrl = `<textarea id="mf_${i}" class="modal-input" rows="${f.rows || 5}"
        data-key="${f.key}" placeholder="${f.placeholder || ''}">${f.value != null ? f.value : ''}</textarea>`;
    } else {
      ctrl = `<input id="mf_${i}" class="modal-input" type="${f.type === 'number' ? 'number' : 'text'}"
        data-key="${f.key}" placeholder="${f.placeholder || ''}" value="${f.value != null ? f.value : ''}"
        ${f.step != null ? `step="${f.step}"` : ''}>`;
    }
    return `<div class="modal-field">${lab}${ctrl}</div>`;
  }).join('');
  backdrop.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="${opts.title}">
      <div class="modal-head">
        <span class="modal-title">${opts.title}</span>
        <button class="modal-close" aria-label="关闭" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">${fieldHtml}<div class="modal-error" id="modalError"></div></div>
      <div class="modal-foot">
        <button class="modal-btn modal-btn-cancel" onclick="closeModal()">${opts.cancelText || '取消'}</button>
        <button class="modal-btn modal-btn-primary" id="modalSubmitBtn">${opts.submitText || '保存'}</button>
      </div>
    </div>`;
  backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) closeModal(); });
  document.body.appendChild(backdrop);
  populatePlatformSelects();
  refreshFormDatalists();
  const first = backdrop.querySelector('input,select');
  first?.focus();
  document.addEventListener('keydown', modalKeyHandler);
  const submitBtn = document.getElementById('modalSubmitBtn');
  submitBtn.onclick = async () => {
    if (submitBtn.dataset.busy === '1') return; // 防止重复提交
    const values = {};
    let missing = null;
    backdrop.querySelectorAll('.modal-input').forEach((el, i) => {
      const f = fields[i];
      let v = el.value;
      if (f.type === 'number') v = v === '' ? '' : Number(v);
      values[f.key] = v;
      if (f.required && (v === '' || v == null)) missing = f.label;
    });
    if (missing) { document.getElementById('modalError').textContent = `请填写${missing}`; return; }
    const errEl = document.getElementById('modalError');
    submitBtn.dataset.busy = '1';
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    try {
      const r = await opts.onSubmit(values);
      if (r === false) { submitBtn.dataset.busy = '0'; submitBtn.disabled = false; return; }
      closeModal();
    } catch (e) {
      errEl.textContent = e.message || String(e);
      submitBtn.dataset.busy = '0'; submitBtn.disabled = false; submitBtn.textContent = originalText;
    }
  };
}
function openConfirmModal(opts) {
  closeModal();
  const backdrop = document.createElement('div');
  backdrop.id = 'modalBackdrop';
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="${opts.title}">
      <div class="modal-head">
        <span class="modal-title">${opts.title}</span>
        <button class="modal-close" aria-label="关闭" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body"><div class="modal-message">${opts.message}</div></div>
      <div class="modal-foot">
        <button class="modal-btn modal-btn-cancel" id="modalCancelBtn">${opts.cancelText || '取消'}</button>
        <button class="modal-btn ${opts.danger ? 'modal-btn-danger' : 'modal-btn-primary'}" id="modalConfirmBtn">${opts.confirmText || '确认'}</button>
      </div>
    </div>`;
  backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) { if (opts.onCancel) opts.onCancel(); closeModal(); } });
  document.body.appendChild(backdrop);
  document.getElementById('modalCancelBtn').onclick = () => { if (opts.onCancel) opts.onCancel(); closeModal(); };
  document.getElementById('modalConfirmBtn').onclick = async () => {
    await (opts.onConfirm || (() => {}))();
    closeModal();
  };
  document.addEventListener('keydown', modalKeyHandler);
}
function showOrderForm() {
  openFormModal({
    title: '新增订单', submitText: '保存',
    fields: [
      { key: 'product_name', label: '商品名称', required: true, type: 'product', placeholder: '可从列表选择或直接输入' },
      { key: 'platform', label: '销售平台', type: 'platform' },
      { key: 'qty', label: '数量', type: 'number', value: 1, step: 1 },
      { key: 'unit_price', label: '成交单价（元）', type: 'number', value: 0, step: '0.01' },
      { key: 'buyer', label: '买家', placeholder: '可留空' },
    ],
    onSubmit: v => fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_no: 'ORD' + Date.now(), status: 'paid', ...v }),
    }).then(() => { toast('已添加'); loadOrders(); loadShipping(); }),
  });
}
function deleteOrder(id) {
  openConfirmModal({
    title: '删除订单', message: '确认删除该订单吗？此操作不可撤销。',
    confirmText: '删除', danger: true,
    onConfirm: () => fetch('/api/orders/' + id, { method: 'DELETE' }).then(() => loadOrders()),
  });
}

// ── 发货 ──
async function loadShipping() {
  if (window.WB) return WB.renderShipping();
  try {
    const list = await (await fetch('/api/orders?status=paid')).json();
    const body = document.getElementById('shippingBody');
    if (!body) return;
    if (!list.length) { body.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-tertiary);padding:24px;">暂无待发货订单</td></tr>'; return; }
    body.innerHTML = list.map(o => '<tr><td>'+(o.order_no||'-')+'</td><td>'+(o.platform||'-')+'</td><td>'+(o.product_name||'-')+'</td><td>'+(o.buyer||'-')+'</td><td><span class="badge badge-warning">待发货</span></td><td>'+(o.shipping_no||'-')+'</td><td><button class="btn btn-primary" style="padding:4px 10px;font-size:11px;" onclick="shipOrder('+o.id+')">发货</button></td></tr>').join('');
  } catch(e){}
}
function shipOrder(id) {
  openFormModal({
    title: '订单发货', submitText: '确认发货',
    fields: [
      { key: 'shipping_no', label: '物流单号', required: true, placeholder: '请输入物流单号' },
      { key: 'shipping_company', label: '快递公司', placeholder: '如：顺丰速运 / 中通快递' },
    ],
    onSubmit: v => fetch('/api/orders/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'shipped', ...v }),
    }).then(() => { toast('已发货'); loadShipping(); loadOrders(); }),
  });
}

// ── 售后 ──
async function loadAftersales() {
  if (window.WB) return WB.renderAftersales();
  try {
    const list = await (await fetch('/api/aftersales')).json();
    const body = document.getElementById('aftersalesBody');
    if (!body) return;
    const typeMap={refund:'仅退款',return:'退货退款',exchange:'换货'};
    const stMap={open:'处理中',resolved:'已解决',closed:'已关闭'};
    if (!list.length) { body.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-tertiary);padding:24px;">暂无售后单</td></tr>'; return; }
    body.innerHTML = list.map(a => '<tr><td>'+(a.order_no||'-')+'</td><td>'+(a.platform||'-')+'</td><td>'+(typeMap[a.type]||a.type)+'</td><td>'+(a.reason||'-')+'</td><td class="num">¥'+a.amount+'</td><td><span class="badge '+(a.status==='open'?'badge-warning':'badge-success')+'">'+(stMap[a.status]||a.status)+'</span></td><td>'+(a.status==='open'?'<button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;" onclick="resolveAftersale('+a.id+')">解决</button> <button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;" onclick="deleteAftersale('+a.id+')">删除</button>':'')+'</td></tr>').join('');
  } catch(e){}
}
function showAftersaleForm() {
  openFormModal({
    title: '新增售后单', submitText: '保存',
    fields: [
      { key: 'order_no', label: '关联订单号', placeholder: '可留空' },
      { key: 'platform', label: '销售平台', type: 'platform' },
      { key: 'reason', label: '售后原因', placeholder: '如：七天无理由退货' },
      { key: 'amount', label: '退款金额（元）', type: 'number', value: 0, step: '0.01' },
    ],
    onSubmit: v => fetch('/api/aftersales', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'refund', status: 'open', ...v }),
    }).then(() => { toast('已添加'); loadAftersales(); }),
  });
}
async function resolveAftersale(id){ await fetch('/api/aftersales/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'resolved'})}); loadAftersales(); }
function deleteAftersale(id) {
  openConfirmModal({
    title: '删除售后单', message: '确认删除该售后单吗？此操作不可撤销。',
    confirmText: '删除', danger: true,
    onConfirm: () => fetch('/api/aftersales/' + id, { method: 'DELETE' }).then(() => loadAftersales()),
  });
}

// ── 库存 ──
async function loadInventory() {
  if (window.WB) return WB.renderInventory();
  try {
    const list = await (await fetch('/api/inventory')).json();
    const body = document.getElementById('inventoryBody');
    if (!body) return;
    if (!list.length) { body.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-tertiary);padding:24px;">暂无库存记录</td></tr>'; return; }
    body.innerHTML = list.map(i => {
      const low = i.stock_qty <= i.safety_stock;
      return '<tr><td>'+(i.product_name||'-')+'</td><td>'+(i.sku||'-')+'</td><td>'+(i.warehouse||'-')+'</td><td class="num">'+i.stock_qty+'</td><td class="num">'+i.safety_stock+'</td><td><span class="badge '+(low?'badge-danger':'badge-success')+'">'+(low?'库存不足':'正常')+'</span></td><td><button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;" onclick="deleteInventory('+i.id+')">删除</button></td></tr>';
    }).join('');
  } catch(e){}
}
function showInventoryForm() {
  // 统一走“盘点调整”，以库存流水方式真实增加/减少可售库存
  if (window.WB && WB.openAdjust) return WB.openAdjust();
  openFormModal({
    title: '库存调整', submitText: '保存',
    fields: [
      { key: 'product_name', label: '商品名称', required: true, type: 'product', placeholder: '可从列表选择或直接输入' },
      { key: 'sku', label: 'SKU 编码', placeholder: '选择商品后自动带出' },
      { key: 'qty', label: '变动数量（正为入库、负为出库）', type: 'number', value: 0, step: 1 },
      { key: 'reason', label: '原因', placeholder: '期初库存 / 盘点' },
    ],
    onSubmit: v => fetch('/api/dom/stock/adjust', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warehouse: '默认仓', ...v }),
    }).then(() => { toast('已保存'); loadInventory(); }),
  });
}
function deleteInventory(id) {
  openConfirmModal({
    title: '删除库存记录', message: '确认删除该库存记录吗？此操作不可撤销。',
    confirmText: '删除', danger: true,
    onConfirm: () => fetch('/api/inventory/' + id, { method: 'DELETE' }).then(() => loadInventory()),
  });
}

// ── 采购 ──
async function loadPurchases() {
  if (window.WB) return WB.renderPurchases();
  try {
    const list = await (await fetch('/api/purchases')).json();
    const body = document.getElementById('purchasesBody');
    if (!body) return;
    const stMap={draft:'草稿',ordered:'已下单',received:'已入库',cancelled:'已取消'};
    if (!list.length) { body.innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--text-tertiary);padding:24px;">暂无采购单</td></tr>'; return; }
    body.innerHTML = list.map(p => '<tr><td>'+(p.po_no||'-')+'</td><td>'+(p.supplier||'-')+'</td><td>'+(p.product_name||'-')+'</td><td class="num">'+p.qty+'</td><td class="num">¥'+p.unit_cost+'</td><td class="num">¥'+p.total_cost+'</td><td><span class="badge badge-accent">'+(stMap[p.status]||p.status)+'</span></td><td>'+(p.status==='draft'?'<button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;" onclick="confirmPurchase('+p.id+')">下单</button> ':'')+'<button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;" onclick="deletePurchase('+p.id+')">删除</button></td></tr>').join('');
  } catch(e){}
}
function showPurchaseForm() {
  openFormModal({
    title: '新增采购单', submitText: '保存',
    fields: [
      { key: 'product_name', label: '商品名称', required: true, type: 'product', placeholder: '可从列表选择或直接输入' },
      { key: 'supplier', label: '供应商', type: 'supplier', placeholder: '可从列表选择或直接输入' },
      { key: 'qty', label: '采购数量', type: 'number', value: 0, step: 1 },
      { key: 'unit_cost', label: '采购单价（元）', type: 'number', value: 0, step: '0.01' },
    ],
    onSubmit: v => fetch('/api/purchases', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ po_no: 'PO' + Date.now(), status: 'draft', ...v }),
    }).then(() => { toast('已添加'); loadPurchases(); }),
  });
}
async function confirmPurchase(id){ await fetch('/api/purchases/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'ordered'})}); loadPurchases(); }
function deletePurchase(id) {
  openConfirmModal({
    title: '删除采购单', message: '确认删除该采购单吗？此操作不可撤销。',
    confirmText: '删除', danger: true,
    onConfirm: () => fetch('/api/purchases/' + id, { method: 'DELETE' }).then(() => loadPurchases()),
  });
}

// ── 供应商 ──
async function loadSuppliers() {
  try {
    const list = await (await fetch('/api/suppliers')).json();
    const body = document.getElementById('suppliersBody');
    if (!body) return;
    if (!list.length) { body.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-tertiary);padding:24px;">暂无供应商</td></tr>'; return; }
    body.innerHTML = list.map(s => '<tr><td>'+(s.name||'-')+'</td><td>'+(s.contact||'-')+'</td><td>'+(s.phone||'-')+'</td><td>'+(s.address||'-')+'</td><td>'+(s.products||'-')+'</td><td><button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;" onclick="editSupplier('+s.id+')">编辑</button> <button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;" onclick="deleteSupplier('+s.id+')">删除</button></td></tr>').join('');
  } catch(e){}
}
function showSupplierForm(s) {
  const editing = !!(s && s.id);
  openFormModal({
    title: editing ? '编辑供应商' : '新增供应商', submitText: '保存',
    fields: [
      { key: 'name', label: '供应商名称', required: true, value: s ? s.name : '', placeholder: '如：深圳市恒创数码厂' },
      { key: 'contact', label: '联系人', value: s ? s.contact : '', placeholder: '如：王经理' },
      { key: 'phone', label: '联系电话', value: s ? s.phone : '', placeholder: '可留空' },
      { key: 'address', label: '地址', value: s ? s.address : '', placeholder: '可留空' },
      { key: 'products', label: '主营产品', value: s ? s.products : '', placeholder: '如：蓝牙音箱、数码配件' },
    ],
    onSubmit: v => fetch(editing ? '/api/suppliers/' + s.id : '/api/suppliers', {
      method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v),
    }).then(() => { toast(editing ? '已保存' : '已添加'); loadSuppliers(); }),
  });
}
async function editSupplier(id) {
  const list = await fetch('/api/suppliers').then(r => r.json());
  const s = list.find(x => x.id === id);
  if (s) showSupplierForm(s);
}
function deleteSupplier(id) {
  openConfirmModal({
    title: '删除供应商', message: '确认删除该供应商吗？此操作不可撤销。',
    confirmText: '删除', danger: true,
    onConfirm: () => fetch('/api/suppliers/' + id, { method: 'DELETE' }).then(() => loadSuppliers()),
  });
}

// ── 数据页统一工具条：导出 / 导入 / 短示例 ──
const DATA_PAGES = [
  { coll: 'products', page: 'page-products', form: 'showProductForm', reload: 'loadProducts',
    ex: { name: '示例·便携保温杯', platform: '淘宝', cost: 22, price: 59, notes: '示例数据，可删除' },
    line: { zh: '示例：便携保温杯 · 成本 ¥22 · 售价 ¥59', en: 'Example: Insulated Tumbler · Cost ¥22 · Price ¥59' } },
  { coll: 'orders', page: 'page-orders', form: 'showOrderForm', reload: 'loadOrders',
    ex: { product_name: '示例·便携保温杯', platform: '淘宝', qty: 1, unit_price: 59, buyer: '示例买家' },
    line: { zh: '示例：订单 ORD1001 · 淘宝 · 保温杯 · 1件 · ¥59 · 已付款', en: 'Example: Order ORD1001 · Taobao · Tumbler · Qty 1 · ¥59 · Paid' } },
  { coll: 'aftersales', page: 'page-aftersales', form: 'showAftersaleForm', reload: 'loadAftersales',
    ex: { order_no: '', platform: '淘宝', reason: '示例·七天无理由', amount: 59 },
    line: { zh: '示例：七天无理由退货 · 退款 ¥59', en: 'Example: 7-day no-reason return · Refund ¥59' } },
  { coll: 'inventory', page: 'page-inventory', form: 'showInventoryForm', reload: 'loadInventory',
    ex: { qty: 100, reason: '示例·期初库存' },
    line: { zh: '示例：为商品登记期初库存 100 件', en: 'Example: Record 100 units of opening stock' } },
  { coll: 'purchases', page: 'page-purchases', form: 'showPurchaseForm', reload: 'loadPurchases',
    ex: { product_name: '示例·便携保温杯', supplier: '示例供应商', qty: 100, unit_cost: 22 },
    line: { zh: '示例：采购 PO1001 · 100件 · 单价 ¥22', en: 'Example: Purchase PO1001 · Qty 100 · Unit cost ¥22' } },
  { coll: 'suppliers', page: 'page-suppliers', form: 'showSupplierForm', reload: 'loadSuppliers',
    ex: { name: '示例供应商', contact: '王经理', phone: '', address: '', products: '保温杯' },
    line: { zh: '示例：深圳某厂 · 王经理 · 主营保温杯', en: 'Example: A Shenzhen factory · Manager Wang · Tumblers' } },
  { coll: 'history', page: 'page-history', form: null, reload: 'loadHistory', ex: null, line: { zh: '', en: '' } },
];
const DATA_LABEL = {
  products: '商品库', orders: '订单', aftersales: '售后单', inventory: '库存记录',
  purchases: '采购单', suppliers: '供应商', history: '分析记录',
};
function enhanceDataPages() {
  for (const d of DATA_PAGES) {
    const page = document.getElementById(d.page);
    if (!page) continue;
    const header = page.querySelector('.page-header');
    // 移除页头旧的“导出”按钮（统一由工具条提供，避免重复）
    header?.querySelectorAll('button').forEach((b) => {
      if ((b.getAttribute('onclick') || '').indexOf('/api/export/') >= 0) b.remove();
    });
    // 清除旧工具条，便于语言切换时重建
    page.querySelectorAll('.data-toolbar').forEach((el) => el.remove());
    const bar = document.createElement('div');
    bar.className = 'data-toolbar';
    const btns =
      '<button class="dt-btn" onclick="exportColl(\'' + d.coll + '\')">' + L('导出', 'Export') + '</button>' +
      '<button class="dt-btn" onclick="importPick(\'' + d.coll + '\')">' + L('导入', 'Import') + '</button>' +
      (d.form ? '<button class="dt-btn dt-btn-primary" onclick="fillExample(\'' + d.coll + '\')">' + L('示例', 'Example') + '</button>' : '');
    const lineText = (d.line && (currentLang === 'en' ? d.line.en : d.line.zh)) || '';
    bar.innerHTML = (lineText ? '<span class="dt-example">' + lineText + '</span>' : '<span></span>') +
      '<span class="dt-actions">' + btns + '</span>';
    header.after(bar);
  }
  // 发货页：说明其为订单的履约视图
  const ship = document.getElementById('page-shipping');
  if (ship) {
    ship.querySelectorAll('.data-toolbar').forEach((el) => el.remove());
    const bar = document.createElement('div');
    bar.className = 'data-toolbar';
    bar.innerHTML = '<span class="dt-example">' +
      L('这里显示已付款、待发货的订单，发货后可在此跟踪物流，数据来自订单管理',
        'Paid, unshipped orders appear here. Track shipments after dispatch. Data comes from Orders.') +
      '</span><span></span>';
    ship.querySelector('.page-header').after(bar);
  }
}
async function saveAsDownload(url, filename) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(currentLang === 'en' ? 'Download failed' : '下载失败');
  const blob = await r.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 5000);
}
const EXPORT_FILE = { products: 'products.csv', orders: 'orders.csv', purchases: 'purchases.csv', suppliers: 'suppliers.csv', aftersales: 'aftersales.csv', history: 'history.csv', inventory: 'inventory.csv' };
function exportColl(coll) { return saveAsDownload('/api/export/' + coll, EXPORT_FILE[coll] || coll + '.csv').catch((e) => toast(e.message)); }
function fillExample(coll) {
  const d = DATA_PAGES.find((x) => x.coll === coll);
  if (!d || !d.form) return;
  window[d.form]();
  document.querySelectorAll('#modalBackdrop .modal-input').forEach((el) => {
    const k = el.dataset.key;
    if (k in d.ex) {
      const proto = el.tagName === 'SELECT' ? HTMLSelectElement : HTMLInputElement;
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, d.ex[k]);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
}
function importPick(coll) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.csv,text/csv';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let pv;
      try {
        const r = await fetch('/api/import/csv/preview', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coll, csv: reader.result }),
        });
        pv = await r.json();
      } catch (e) { toast('文件读取失败，请重试'); return; }
      showImportPreview(coll, pv);
    };
    reader.readAsText(f, 'utf-8');
  };
  inp.click();
}
function showImportPreview(coll, pv) {
  closeModal();
  const backdrop = document.createElement('div');
  backdrop.id = 'modalBackdrop'; backdrop.className = 'modal-backdrop';
  const errs = (pv.errors || []).slice(0, 5)
    .map((e) => '<div class="imp-err">第 ' + e.row + ' 行：' + e.msg + '</div>').join('');
  backdrop.innerHTML =
    '<div class="modal-card" role="dialog" aria-modal="true">' +
    '<div class="modal-head"><span class="modal-title">导入' + DATA_LABEL[coll] + '</span>' +
    '<button class="modal-close" onclick="closeModal()">✕</button></div>' +
    '<div class="modal-body">' +
    '<div class="imp-summary">共识别 <b>' + pv.total_rows + '</b> 行，有效 <b>' + pv.valid_rows + '</b> 条' +
    (pv.errors && pv.errors.length ? '，问题 <b>' + pv.errors.length + '</b> 条' : '') + '</div>' +
    (errs ? '<div class="imp-errs">' + errs + '</div>' : '') +
    '<label class="imp-mode"><span>导入方式</span>' +
    '<select id="impMode" class="modal-input"><option value="merge">合并：保留现有数据，追加新数据</option>' +
    '<option value="replace">替换：先清空该类数据再导入</option></select></label>' +
    '<div class="modal-error" id="modalError"></div></div>' +
    '<div class="modal-foot"><button class="modal-btn modal-btn-cancel" onclick="closeModal()">取消</button>' +
    '<button class="modal-btn modal-btn-primary" id="modalSubmitBtn">导入 ' + pv.valid_rows + ' 条</button></div>' +
    '</div>';
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) closeModal(); });
  document.body.appendChild(backdrop);
  document.getElementById('modalSubmitBtn').onclick = async () => {
    if (!pv.valid_rows) { closeModal(); return; }
    const mode = document.getElementById('impMode').value;
    const r = await fetch('/api/import/csv/commit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coll, records: pv.records, mode }),
    });
    const j = await r.json();
    closeModal();
    if (j.ok) {
      toast('已导入 ' + j.imported + ' 条');
      const d = DATA_PAGES.find((x) => x.coll === coll);
      if (d && window[d.reload]) window[d.reload]();
    }
  };
}

async function loadHistory() {
  try {
    const list = await (await fetch('/api/history')).json();
    const kpi = document.getElementById('kpiAnalyses');
    if (kpi) kpi.textContent = list.length;
    const el = document.getElementById('historyList');
    if (!el) return;
    const en = currentLang === 'en';
    if (!list.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🕐</div>${en ? 'No analysis records' : '暂无分析记录'}</div>`;
      return;
    }
    const typeMap = en
      ? { selection: 'Selection', competitor: 'Competitor', listing: 'Listing', reviews: 'Reviews', service: 'Service', keywords: 'Keywords' }
      : { selection: '选品', competitor: '竞品', listing: 'Listing', reviews: '评论', service: '客服', keywords: '关键词' };
    el.innerHTML = list.map(h => {
      const typeName = typeMap[h.type] || h.type;
      return '<div style="padding:14px 0;border-bottom:1px solid var(--border-light);">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">' +
        '<span class="badge badge-accent">' + typeName + '</span>' +
        '<span style="font-size:11px;color:var(--text-tertiary);">' + (h.created_at || '') + '</span>' +
        '</div>' +
        '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;">' + (h.input_text || '') + '</div>' +
        '<div style="font-size:12.5px;color:var(--text-tertiary);white-space:pre-wrap;max-height:80px;overflow:hidden;">' + (h.result_text || '') + '</div>' +
        '</div>';
    }).join('');
  } catch (e) {}
}

// 进入商品 / 供应商 / 历史页时刷新（其余数据页由 workbench 的 RENDERERS 处理）
window.addEventListener('ewb:page', (e) => {
  const p = e.detail && e.detail.page;
  if (p === 'products') loadProducts();
  else if (p === 'suppliers') loadSuppliers();
  else if (p === 'history') loadHistory();
});

// ── 仪表盘图表 ──
let trendChart = null, platformChart = null;

function dashboardTrendOption() {
  const en = currentLang === 'en';
  const days = en ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    : ['周一','周二','周三','周四','周五','周六','周日'];
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 20, bottom: 28 },
    xAxis: {
      type: 'category', data: days,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#9ca3af', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { color: '#9ca3af', fontSize: 11 }
    },
    series: [{
      name: en ? 'Analyses' : '分析次数', type: 'line', smooth: true, data: [1,3,2,5,4,7,6],
      lineStyle: { color: '#4f46e5', width: 2.5 },
      itemStyle: { color: '#4f46e5' },
      areaStyle: { color: { type: 'linear', x:0,y:0,x2:0,y2:1, colorStops: [
        { offset: 0, color: 'rgba(79,70,229,0.25)' }, { offset: 1, color: 'rgba(79,70,229,0)' }
      ]}}
    }]
  };
}
function dashboardPlatformOption() {
  const en = currentLang === 'en';
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { fontSize: 11, color: '#9ca3af' } },
    series: [{
      type: 'pie', radius: ['45%','70%'], center: ['50%','45%'],
      label: { show: false },
      data: [
        { value: 6, name: en ? 'Domestic' : '国内平台' },
        { value: 8, name: en ? 'Cross-border' : '跨境平台' },
      ],
      color: ['#4f46e5', '#0891b2']
    }]
  };
}
function renderDashboardCharts() {
  trendChart?.setOption(dashboardTrendOption(), true);
  platformChart?.setOption(dashboardPlatformOption(), true);
}
function initDashboard() {
  const trendEl = document.getElementById('chartTrend');
  if (trendEl && window.echarts) trendChart = echarts.init(trendEl);
  const platEl = document.getElementById('chartPlatform');
  if (platEl && window.echarts) platformChart = echarts.init(platEl);
  renderDashboardCharts();
  renderSalesHeatmap();
}

let salesHeatmapChart = null;
let salesHeatmapLocale = null;
function localDateStr(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}
async function renderSalesHeatmap() {
  const el = document.getElementById('chartSalesHeatmap');
  if (!el || !window.echarts) return;
  let orders = [];
  try { orders = await (await fetch('/api/orders')).json(); } catch {}
  const map = {};
  orders.forEach((o) => {
    const d = String(o.created_at || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) map[d] = (map[d] || 0) + (Number(o.total_amount) || 0);
  });
  const data = Object.entries(map).map(([d, v]) => [d, Math.round(v * 100) / 100]);
  const end = new Date(); const start = new Date(); start.setMonth(start.getMonth() - 5);
  const maxVal = Math.max(1, ...data.map((x) => x[1]));
  const dark = currentTheme === 'dark';
  const en = currentLang === 'en';
  const monthNames = en
    ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    : ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const dayNames = en
    ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    : ['日','一','二','三','四','五','六'];
  const wantLocale = en ? 'EN' : 'ZH';
  if (salesHeatmapChart && salesHeatmapLocale !== wantLocale) {
    salesHeatmapChart.dispose();
    salesHeatmapChart = null;
  }
  if (!salesHeatmapChart) {
    salesHeatmapChart = echarts.init(el);
    salesHeatmapLocale = wantLocale;
  }
  const cellColor = dark ? '#1f2937' : '#f8fafc';
  const cellBorder = dark ? '#111827' : '#ffffff';
  const heatColors = dark
    ? ['#1e1b4b', '#3730a3', '#4f46e5', '#818cf8', '#c7d2fe']
    : ['#eef2ff', '#c7d2fe', '#818cf8', '#4f46e5', '#3730a3'];
  salesHeatmapChart.setOption({
    tooltip: { formatter: (p) => p.data[0] + (en ? ': ¥' : '：¥') + p.data[1] },
    visualMap: {
      min: 0, max: maxVal, calculable: true, orient: 'horizontal', left: 'center', bottom: 0,
      itemWidth: 12, itemHeight: 90, textStyle: { fontSize: 10 },
      inRange: { color: heatColors },
    },
    calendar: {
      top: 36, left: 46, right: 24, bottom: 34, cellSize: ['auto', 15],
      range: [localDateStr(start), localDateStr(end)],
      itemStyle: { color: cellColor, borderColor: cellBorder, borderWidth: 2 },
      splitLine: { show: false },
      yearLabel: { show: false },
      monthLabel: { nameMap: monthNames, color: '#9ca3af' },
      dayLabel: { nameMap: dayNames, color: '#cbd5e1' },
    },
    series: { type: 'heatmap', coordinateSystem: 'calendar', data },
  });
}

window.addEventListener('resize', () => {
  trendChart?.resize(); platformChart?.resize(); salesHeatmapChart?.resize();
  profitSensChart?.resize(); acosCurveChart?.resize();
});

// ── 商品管理 ──
async function loadProducts() {
  try {
    const r = await fetch('/api/products');
    const list = await r.json();
    const body = document.getElementById('productsBody');
    if (!body) return;
    document.getElementById('kpiProducts').textContent = list.length;
    if (list.length === 0) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-tertiary);padding:32px;">暂无商品，点击右上角“新增商品”</td></tr>';
      return;
    }
    body.innerHTML = list.map(p => {
      const profit = (p.price||0) - (p.cost||0);
      const cls = profit >= 0 ? 'profit-pos' : 'profit-neg';
      return '<tr><td>'+p.name+'</td><td>'+(p.platform||'-')+'</td><td class="num">¥'+(p.cost||0)+'</td><td class="num">¥'+(p.price||0)+'</td><td class="num '+cls+'">¥'+profit.toFixed(2)+'</td><td style="color:var(--text-tertiary);">'+(p.notes||'-')+'</td><td><button class="btn btn-ghost" style="padding:4px 10px;font-size:12px;" onclick="editProduct('+p.id+')">编辑</button> <button class="btn btn-ghost" style="padding:4px 10px;font-size:12px;" onclick="deleteProduct('+p.id+')">删除</button></td></tr>';
    }).join('');
  } catch(e) {}
}

function showProductForm(p) {
  const editing = !!(p && p.id);
  openFormModal({
    title: editing ? '编辑商品' : '新增商品', submitText: '保存',
    fields: [
      { key: 'name', label: '商品名称', required: true, value: p ? p.name : '', placeholder: '如：便携蓝牙音箱' },
      { key: 'platform', label: '销售平台', type: 'platform', allowBlank: true, value: p ? p.platform : '' },
      { key: 'cost', label: '采购成本（元）', type: 'number', value: p ? p.cost : 0, step: '0.01' },
      { key: 'price', label: '售价（元）', type: 'number', value: p ? p.price : 0, step: '0.01' },
      { key: 'safety_stock', label: '安全库存', type: 'number', value: p ? p.safety_stock : 10, step: 1 },
      { key: 'notes', label: '备注', value: p ? p.notes : '', placeholder: '可留空' },
    ],
    onSubmit: v => fetch(editing ? '/api/products/' + p.id : '/api/products', {
      method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v),
    }).then(() => { toast(editing ? '已保存' : '已添加'); loadProducts(); }),
  });
}
async function editProduct(id) {
  const list = await fetch('/api/products').then(r => r.json());
  const p = list.find(x => x.id === id);
  if (p) showProductForm(p);
}

function deleteProduct(id) {
  openConfirmModal({
    title: '删除商品', message: '确认删除该商品吗？此操作不可撤销。',
    confirmText: '删除', danger: true,
    onConfirm: () => fetch('/api/products/' + id, { method: 'DELETE' }).then(() => loadProducts()),
  });
}

// ── 示例数据 ──
async function seedDemo() {
  await fetch('/api/demo/seed',{method:'POST'});
  toast('示例数据已加载，可前往订单、库存等页面查看');
  loadProducts(); loadOrders(); loadShipping(); loadAftersales();
  loadInventory(); loadPurchases(); loadSuppliers();
  refreshDashboard();
}
function clearDemo() {
  openConfirmModal({
    title: '清除示例数据', message: '确认清除已加载的示例数据吗？此操作不可撤销。',
    confirmText: '清除', danger: true,
    onConfirm: () => fetch('/api/demo/clear',{method:'POST'}).then(() => {
      toast('示例数据已清除');
      loadProducts(); loadOrders(); loadShipping(); loadAftersales();
      loadInventory(); loadPurchases(); loadSuppliers();
    }),
  });
}

// ── 数据导入导出 · 灵感引擎工坊 · bin1732 ──
const COLLECTION_LABELS = {
  products: '商品库', orders: '订单', inventory: '库存', purchases: '采购',
  suppliers: '供应商', aftersales: '售后', history: '分析历史',
};
async function postJson(url, body) {
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return r.json();
}
function exportCsv() {
  const t = document.getElementById('exportType').value;
  if (t) return exportColl(t);
}
function exportBackup() { return saveAsDownload('/api/export/backup', 'yingmai-backup.json').catch((e) => toast(e.message)); }

let importState = { kind: null, coll: null, records: null, json: null };

async function handleImportFile(input) {
  const f = input.files[0];
  const box = document.getElementById('importPreview');
  if (!f) return;
  const text = await f.text();
  box.style.display = 'block';
  box.innerHTML = '<div style="color:var(--text-tertiary);font-size:13px;">正在校验文件…</div>';
  try {
    if (f.name.toLowerCase().endsWith('.json')) {
      const r = await postJson('/api/import/backup/preview', { json: text });
      importState = { kind: 'backup', json: JSON.parse(text) };
      renderBackupPreview(r);
    } else {
      const coll = document.getElementById('importType').value;
      if (!coll) { box.style.display = 'none'; toast('请先选择要导入的表格类型'); return; }
      const r = await postJson('/api/import/csv/preview', { coll, csv: text });
      importState = { kind: 'csv', coll, records: r.records || [] };
      renderCsvPreview(r);
    }
  } catch (e) {
    box.innerHTML = '<div style="color:var(--danger);font-size:13px;">文件读取失败，请确认文件格式正确。</div>';
  }
}

function errorListHtml(errors, limit) {
  if (!errors || !errors.length) return '';
  const shown = errors.slice(0, limit);
  const more = errors.length > shown.length ? `<div style="color:var(--text-tertiary);font-size:12px;margin-top:4px;">另有 ${errors.length - shown.length} 条问题未列出</div>` : '';
  return '<div style="margin-top:8px;border:1px solid var(--border);border-radius:8px;padding:8px 10px;max-height:150px;overflow:auto;">'
    + shown.map((e) => `<div style="font-size:12px;color:var(--warning);">第 ${e.row} 行：${e.msg}</div>`).join('')
    + more + '</div>';
}
function modeHtml() {
  return '<div style="display:flex;gap:16px;margin:10px 0;">'
    + '<label style="display:flex;gap:6px;font-size:13px;cursor:pointer;"><input type="radio" name="importMode" value="merge" checked> 合并到现有数据</label>'
    + '<label style="display:flex;gap:6px;font-size:13px;cursor:pointer;"><input type="radio" name="importMode" value="replace"> 替换现有数据</label>'
    + '</div>';
}
function chosenMode() {
  const el = document.querySelector('input[name="importMode"]:checked');
  return el ? el.value : 'merge';
}
function renderCsvPreview(r) {
  const box = document.getElementById('importPreview');
  if (r.errors && r.errors.length && !r.valid_rows) {
    box.innerHTML = '<div style="color:var(--danger);font-size:13px;">没有可导入的数据。</div>' + errorListHtml(r.errors, 20);
    importState.records = [];
    return;
  }
  box.innerHTML =
    `<div style="font-size:13px;">共读取 <b>${r.total_rows}</b> 行，其中 <b style="color:var(--success);">${r.valid_rows}</b> 行可导入，<b style="color:var(--warning);">${(r.errors || []).length}</b> 行将跳过。</div>`
    + errorListHtml(r.errors, 8) + modeHtml()
    + '<button class="btn btn-primary" onclick="commitCsvImport()">确认导入</button>';
}
async function commitCsvImport() {
  if (!importState.records || !importState.records.length) { toast('没有可导入的数据'); return; }
  const r = await postJson('/api/import/csv/commit', {
    coll: importState.coll, mode: chosenMode(), records: importState.records,
  });
  finishImport(`成功导入 ${r.imported} 条数据`);
}
function renderBackupPreview(r) {
  const box = document.getElementById('importPreview');
  if (!r || r.ok === false || !r.collections) {
    box.innerHTML = '<div style="color:var(--danger);font-size:13px;">这不是有效的备份文件。</div>' + errorListHtml(r ? r.errors : [], 20);
    return;
  }
  const rows = Object.entries(r.collections).map(([k, n]) =>
    `<tr><td>${COLLECTION_LABELS[k] || k}</td><td style="text-align:right;">${n}</td></tr>`).join('');
  box.innerHTML =
    '<div style="font-size:13px;margin-bottom:8px;">备份文件包含以下数据：</div>'
    + `<table class="data-table" style="max-width:340px;"><tbody>${rows}</tbody></table>`
    + errorListHtml(r.errors, 8) + modeHtml()
    + '<button class="btn btn-primary" onclick="commitBackupImport()">确认导入</button>';
}
async function commitBackupImport() {
  const r = await postJson('/api/import/backup/commit', { data: importState.json, mode: chosenMode() });
  const total = Object.values(r.imported || {}).reduce((a, b) => a + b, 0);
  finishImport(`成功导入 ${total} 条数据`);
}
function finishImport(msg) {
  toast(msg);
  const box = document.getElementById('importPreview'); box.style.display = 'none'; box.innerHTML = '';
  document.getElementById('importFile').value = '';
  loadProducts(); loadOrders(); loadShipping(); loadAftersales();
  loadInventory(); loadPurchases(); loadSuppliers(); loadHistory();
}

// ── 局域网手机访问 · 灵感引擎工坊 · bin1732 ──
async function loadMobileInfo() {
  try { _renderMobile(await (await fetch('/api/mobile/info')).json()); } catch {}
}
function _renderMobile(info) {
  const btn = document.getElementById('mobileToggleBtn');
  const st = document.getElementById('mobileStatus');
  const box = document.getElementById('mobileQrBox');
  if (!btn) return;
  btn.textContent = info.enabled ? '关闭手机访问' : '开启手机访问';
  btn.className = 'btn ' + (info.enabled ? 'btn-ghost' : 'btn-primary');
  if (info.enabled) {
    st.textContent = '已开启'; st.style.color = '#22c55e';
    box.style.display = 'flex';
    document.getElementById('mobileQrImg').src = '/api/mobile/qr?ts=' + Date.now();
    document.getElementById('mobileUrl').textContent = info.url || '';
  } else {
    st.textContent = info.ip ? '未开启' : '未检测到局域网，请确认电脑已连接 Wi‑Fi';
    st.style.color = info.ip ? 'var(--text-tertiary)' : '#f59e0b';
    box.style.display = 'none';
  }
}
async function toggleMobile() {
  const wantEnable = document.getElementById('mobileToggleBtn').textContent.indexOf('开启') === 0;
  const pin = document.getElementById('mobilePin').value.trim();
  const r = await postJson('/api/mobile/toggle', { enabled: wantEnable, pin });
  if (!r.ok) { toast('开启失败，请确认已连接 Wi‑Fi，并在系统提示中选择允许'); return; }
  _renderMobile(r);
}
