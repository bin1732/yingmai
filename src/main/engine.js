// AI 引擎：内置本地推理 + 云端 / 本地模型接入 · 灵感引擎工坊 · bin1732
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { PRESETS, DEFAULT_CONFIG } = require('./presets');
const calc = require('./calc');
const dom = require('./domain');
const store = require('./store');

let paths = null;
let configFile = null;
let cfg = { ...DEFAULT_CONFIG };

let modelPromise = null;
let modelInfo = null;
let chain = Promise.resolve();

function withLock(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

function loadCfg() {
  try { cfg = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configFile, 'utf-8')) }; }
  catch { cfg = { ...DEFAULT_CONFIG }; }
  return cfg;
}
function saveCfg(c) { cfg = { ...c }; try { fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2), 'utf-8'); } catch {} }

// ── 硬件检测 ──
function detectHardware() {
  return new Promise((resolve) => {
    execFile('nvidia-smi',
      ['--query-gpu=name,memory.total,memory.used', '--format=csv,noheader,nounits'],
      { timeout: 5000, windowsHide: true },
      (err, stdout) => {
        const base = { gpu_name: '', vram_total: 0, vram_free: 0, mode: 'cpu', contextSize: 4096, gpuLayers: 0 };
        if (err || !stdout || !stdout.trim()) return resolve(base);
        const p = stdout.trim().split('\n')[0].split(',').map((x) => x.trim());
        const out = { gpu_name: p[0], vram_total: parseInt(p[1], 10), vram_free: parseInt(p[1], 10) - parseInt(p[2], 10) };
        if (out.vram_total >= 8192) Object.assign(out, { mode: 'full_gpu', contextSize: 8192, gpuLayers: 'max' });
        else if (out.vram_total >= 4096) Object.assign(out, { mode: 'hybrid', contextSize: 4096, gpuLayers: 'max' });
        else if (out.vram_total >= 2048) Object.assign(out, { mode: 'light', contextSize: 2048, gpuLayers: 16 });
        else Object.assign(out, { mode: 'cpu', contextSize: 2048, gpuLayers: 0 });
        resolve(out);
      });
  });
}

function pickGguf() {
  const cfg = loadCfg();
  if (cfg.builtin_model) {
    const explicit = path.join(paths.modelsDir, cfg.builtin_model);
    if (fs.existsSync(explicit)) return explicit;
  }
  const pref = [
    'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    'qwen2.5-1.5b-instruct-q5_k_m.gguf',
    'qwen2.5-3b-instruct-q3_k_m.gguf',
    'qwen2.5-3b-instruct-q4_k_m.gguf',
  ];
  for (const n of pref) {
    const c = path.join(paths.modelsDir, n);
    if (fs.existsSync(c)) return c;
  }
  try {
    const all = fs.readdirSync(paths.modelsDir).filter((f) => f.endsWith('.gguf')).sort();
    if (all.length) return path.join(paths.modelsDir, all[0]);
  } catch {}
  return path.join(paths.modelsDir, pref[0]);
}

// 新一代模型（Qwen3.5）默认会先思考；本地使用时通过其内置模板参数直接作答，避免额外耗时
function isDirectModel(file) {
  return /qwen3\.5/i.test(path.basename(file));
}

function friendlyBuiltinName(file) {
  if (!file) return '';
  const b = path.basename(file);
  const is35 = /qwen3\.5/i.test(b);
  const size = (b.match(/(\d+(?:\.\d+)?)b/i) || [])[1];
  if (size) return (is35 ? 'Qwen3.5-' : 'Qwen2.5-') + size + 'B';
  return b.replace(/\.gguf$/i, '');
}

async function buildDirectWrapper(nlc, model, file) {
  let template = '';
  try {
    const info = await nlc.readGgufFileInfo(file);
    template = info && info.metadata && info.metadata.tokenizer ? info.metadata.tokenizer.chat_template : '';
  } catch {}
  if (template) {
    return new nlc.JinjaTemplateChatWrapper({
      template,
      reasoning: false,
      additionalRenderParameters: { enable_thinking: false },
      tokenizer: model.tokenizer,
    });
  }
  return new nlc.QwenChatWrapper({ variation: '3.5', thoughts: 'modelInitiated' });
}

async function getBuiltin() {
  if (modelInfo) return modelInfo;
  if (!modelPromise) {
    modelPromise = (async () => {
      const nlc = await import('node-llama-cpp');
      const llama = await nlc.getLlama({ logLevel: 'error' });
      const hw = await detectHardware();
      if (!hw.gpu_name && llama.gpu) { hw.contextSize = 4096; hw.gpuLayers = 'max'; hw.mode = 'gpu'; }
      const modelPath = pickGguf();
      let model, context;
      try {
        model = await llama.loadModel({ modelPath, gpuLayers: hw.gpuLayers });
        context = await model.createContext({ contextSize: hw.contextSize });
      } catch {
        model = await llama.loadModel({ modelPath, gpuLayers: 0 });
        context = await model.createContext({ contextSize: hw.contextSize });
      }
      const sequence = context.getSequence();
      const sessionOpts = { contextSequence: sequence, chatWrapper: 'auto' };
      if (isDirectModel(modelPath)) {
        try { sessionOpts.chatWrapper = await buildDirectWrapper(nlc, model, modelPath); } catch {}
      }
      const session = new nlc.LlamaChatSession(sessionOpts);
      const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
      let cardSink = null;
      const profitProps = {
        selling_price: { type: 'number', description: '售价' },
        product_cost: { type: 'number', description: '商品采购成本' },
        platform_fee_pct: { type: 'number', description: '平台佣金率，百分数数字，如5表示5%' },
        payment_fee_pct: { type: 'number', description: '支付手续费率，百分数数字' },
        domestic_shipping: { type: 'number', description: '国内运费' },
        international_shipping: { type: 'number', description: '国际或头程运费' },
        ad_cost: { type: 'number', description: '广告花费' },
        packaging_cost: { type: 'number', description: '包装成本' },
        refund_rate_pct: { type: 'number', description: '退款率，百分数数字' }
      };
      const acosProps = {
        cpc: { type: 'number', description: '单次点击花费' },
        cvr: { type: 'number', description: '转化率，百分数数字，如8表示8%' },
        selling_price: { type: 'number', description: '售价' },
        product_cost: { type: 'number', description: '商品成本' },
        other_fees_pct: { type: 'number', description: '其他费率，百分数数字' },
        target_acos: { type: 'number', description: '目标ACOS，百分数数字' }
      };
      const cleanVals = (p, props) => {
        const out = {};
        for (const k of Object.keys(props)) {
          if (p && p[k] !== undefined && p[k] !== null) {
            let v = num(p[k]);
            v = Math.round(v * 100) / 100;
            if (k.endsWith('_pct') && Math.abs(v) < 0.1) v = 0;
            out[k] = v;
          }
        }
        return out;
      };
      const functions = {
        open_profit_calculator: nlc.defineChatSessionFunction({
          description: '打开利润计算器卡片。凡是利润、成本、毛利、盈亏、定价是否赚钱的问题，都必须调用本工具，不要自己报数字。只把用户明确说出的项目填进去，用户没提到的项目不要填；计算器会自动算出利润、利润率和盈亏平衡价，用户可随时修改。',
          params: { type: 'object', properties: profitProps },
          async handler(p) {
            if (cardSink) cardSink('profit', cleanVals(p, profitProps));
            return 'OK';
          }
        }),
        open_acos_calculator: nlc.defineChatSessionFunction({
          description: '打开广告ACOS计算器卡片。凡是广告投入产出、ACOS、单次点击花费、转化率、广告是否盈利的问题，都必须调用本工具，不要自己报数字。只把用户明确说出的项目填进去，没提到的不要填。',
          params: { type: 'object', properties: acosProps },
          async handler(p) {
            if (cardSink) cardSink('acos', cleanVals(p, acosProps));
            return 'OK';
          }
        }),
        // —— 真实经营数据查询（只读）——
        query_stock: nlc.defineChatSessionFunction({
          description: '查询工作台里的真实库存。问到库存、缺货、补货、某个商品还剩多少时调用。可填 SKU 或商品名做过滤，留空返回全部。',
          params: { type: 'object', properties: { keyword: { type: 'string', description: 'SKU 或商品名，可留空' } } },
          async handler(p) {
            let rows = dom.stockTable();
            const kw = String((p && p.keyword) || '').trim().toLowerCase();
            if (kw) rows = rows.filter((r) => String(r.sku).toLowerCase().includes(kw) || String(r.product_name).toLowerCase().includes(kw));
            return JSON.stringify(rows.slice(0, 50).map((r) => ({
              sku: r.sku, name: r.product_name, warehouse: r.warehouse, qty: r.qty, safety: r.safety_stock, status: r.status,
            })));
          }
        }),
        query_pending_shipments: nlc.defineChatSessionFunction({
          description: '查询还没发货、需要尽快处理的订单。问到今天要发哪些货、有没有漏发或发货超时时调用。',
          params: { type: 'object', properties: {} },
          async handler() {
            const today = new Date();
            const rows = store.list('orders').filter((o) => ['pending', 'paid', 'confirmed'].includes(o.status)).map((o) => {
              let age = 0;
              const c = String(o.created_at || '');
              const d = new Date(c.replace(' ', 'T'));
              if (!Number.isNaN(d.getTime())) age = Math.floor((today - d) / 86400000);
              return { order_no: o.order_no, platform: o.platform, buyer: o.buyer, qty: o.qty, status: o.status, age_days: age };
            });
            return JSON.stringify(rows);
          }
        }),
        query_profit_summary: nlc.defineChatSessionFunction({
          description: '查询按真实订单逐单核算的经营损益。问赚了多少、净利润、收入、成本、平台费用、广告花费、退款时调用。可按 platform（平台）、product（商品）、month（月份）汇总。',
          params: { type: 'object', properties: { group: { type: 'string', enum: ['platform', 'product', 'month'], description: '汇总方式，默认 platform' } } },
          async handler(p) {
            const group = (p && ['platform', 'product', 'month'].includes(p.group)) ? p.group : 'platform';
            const data = dom.pnlSummary(group);
            return JSON.stringify({
              totals: data.totals,
              rows: data.rows.slice(0, 20).map((r) => ({
                key: r.key, orders: r.orders, revenue: r.revenue, net: r.net, net_pct: r.net_pct,
              })),
            });
          }
        }),
        query_alerts: nlc.defineChatSessionFunction({
          description: '查询当前需要处理的预警，例如缺货、发货超时、退款偏高、滞销。问有什么要处理、最近有什么问题时调用。',
          params: { type: 'object', properties: {} },
          async handler() {
            const rows = store.list('alerts').filter((a) => a.status === 'open')
              .map((a) => ({ level: a.level, type: a.type, title: a.title, detail: a.detail }));
            return JSON.stringify(rows);
          }
        }),
        query_top_products: nlc.defineChatSessionFunction({
          description: '查询哪些商品卖得好、ABC 分级与滞销情况。问爆款、热销、哪个商品贡献最多、哪些货卖不动时调用。可填统计天数，默认30天。',
          params: { type: 'object', properties: { days: { type: 'number', description: '统计天数，默认30' } } },
          async handler(p) {
            const days = Number(p && p.days) > 0 ? Number(p.days) : 30;
            const abc = dom.abcAnalysis(days);
            const dead = dom.deadStock(days);
            return JSON.stringify({
              abc: abc.slice(0, 20).map((r) => ({ sku: r.sku, name: r.product_name, revenue: r.revenue, class: r.abc })),
              dead: dead.slice(0, 20).map((r) => ({ sku: r.sku, name: r.product_name, qty: r.qty, idle_days: r.idle_days, stock_value: r.stock_value })),
            });
          }
        })
      };
      modelInfo = { model, context, session, functions, llama, nlc, hw, setCardSink: (fn) => { cardSink = fn; } };
      return modelInfo;
    })();
    modelPromise.catch(() => { modelPromise = null; });
  }
  return modelPromise;
}

function stripThink(s) { return s.replace(/<think[\s\S]*?(<\/think>|$)/g, ''); }

// 代理对安全拼接：避免把 emoji（占两个 UTF-16 码元）切到两个分块，
// 否则前端会出现替换字符（�）。
function makeSafeJoiner() {
  let hold = '';
  return {
    add(s) {
      s = hold + s; hold = '';
      const last = s.charCodeAt(s.length - 1);
      if (last >= 0xd800 && last <= 0xdbff) { hold = s.slice(-1); s = s.slice(0, -1); }
      return s;
    },
    flush() { hold = ''; return ''; } // 结尾仍是孤立半字符则丢弃
  };
}

// OpenAI 消息 → 会话历史（含系统）+ 最新用户输入
function toSession(messages) {
  let systemPrompt = '';
  const sys = messages.find((m) => m.role === 'system');
  if (sys) systemPrompt = sys.content;
  const convo = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
  let lastUser = '';
  if (convo.length && convo[convo.length - 1].role === 'user') lastUser = convo.pop().content;
  const history = [];
  if (systemPrompt) history.push({ type: 'system', text: systemPrompt });
  for (const m of convo) {
    if (m.role === 'user') history.push({ type: 'user', text: m.content });
    else history.push({ type: 'model', response: [m.content] });
  }
  return { history, lastUser };
}

async function* builtinStream(messages, temperature, useTools, opts = {}) {
  const mi = await getBuiltin();
  const { history, lastUser } = toSession(messages);
  const lang = opts && opts.lang === 'en' ? 'en' : 'zh';
  const calcRoute = !!(opts && opts.calcRoute);
  let completionTokens = 0;
  let promptTokens = 0;
  try {
    const blob = history.map((h) => h.text || ((h.response || []).join(''))).join('\n') + '\n' + lastUser;
    const tk = await mi.model.tokenize(blob);
    promptTokens = Array.isArray(tk) ? tk.length : 0;
  } catch {}
  const INTRO = {
    profit: { zh: '已为您计算利润，结果如下，可直接修改数值查看变化。',
              en: 'Here is the profit calculation. Edit any value below to see it update.' },
    acos: { zh: '已为您计算广告投入产出，结果如下，可直接修改数值查看变化。',
            en: 'Here is the ad efficiency calculation. Edit any value below to see it update.' },
  };
  const FALLBACK = {
    zh: '请告诉我售价、成本和相关费用，我来为您计算。',
    en: 'Please provide the selling price, cost and any fees, and I will calculate it for you.'
  };
  const queue = [];
  let wait = null;
  let done = false;
  let cardShown = false;
  let cardKind = '';
  const wake = () => { if (wait) { wait(); wait = null; } };
  const pushText = (s) => { if (calcRoute) return; if (!cardShown) { queue.push(s); wake(); } };
  const pushCard = (kind, vals) => {
    cardShown = true; cardKind = kind;
    if (calcRoute) queue.push(INTRO[kind][lang]);
    queue.push({ __card: { kind, vals } }); wake();
  };
  const joiner = makeSafeJoiner();
  const parseFromText = (ut) => {
    const isAcos = /acos|投产|投入产出|cpc|单次点击|每次点击/.test(String(ut).toLowerCase());
    return isAcos ? calc.parseAcosCard(ut) : (calc.parseProfitCard(ut) || calc.parseAcosCard(ut));
  };
  // 确定性解析优先：常见表述直接精确生成卡片，无需等待模型
  const immediate = calcRoute ? parseFromText((opts && opts.userText) || lastUser) : null;

  const run = withLock(async () => {
    try {
      if (immediate) {
        pushCard(immediate.kind, immediate.vals);
        return;
      }
      mi.setCardSink(pushCard);
      mi.session.resetChatHistory();
      mi.session.setChatHistory(history);
      await mi.session.prompt(lastUser, {
        functions: useTools ? mi.functions : undefined,
        temperature,
        topP: 0.9,
        topK: 40,
        repeatPenalty: { penalty: 1.12, frequencyPenalty: 0.1, presencePenalty: 0.1, lastTokens: 128 },
        maxTokens: 900,
        onToken: (tokens) => { if (tokens && tokens.length) completionTokens += tokens.length; },
        onTextChunk: (s) => {
          s = stripThink(s);
          if (!s || cardShown) return;
          const out = joiner.add(s);
          if (out) pushText(out);
        }
      });
    } catch (e) {
      queue.push(calcRoute ? FALLBACK[lang] : '抱歉，处理时出现问题，请稍后再试。');
    } finally {
      const tail = joiner.flush();
      if (tail && !cardShown && !calcRoute) pushText(tail);
      if (calcRoute && !cardShown) {
        const parsed = parseFromText((opts && opts.userText) || lastUser);
        if (parsed) {
          queue.push(INTRO[parsed.kind][lang]);
          queue.push({ __card: parsed });
        } else queue.push(FALLBACK[lang]);
      }
      mi.setCardSink(null);
      done = true;
      wake();
    }
  });

  let buffer = '';
  const flush = () => {
    const r = drainBuffer(buffer);
    buffer = r.rest;
    return r.out;
  };
  while (!done || queue.length) {
    if (queue.length) {
      const item = queue.shift();
      if (item && typeof item === 'object') {
        if (buffer) { const t = flush(); if (t) yield t; }
        yield item;
      } else {
        buffer += item;
        const t = flush();
        if (t) yield t;
      }
    } else await new Promise((r) => { wait = r; });
  }
  if (buffer) { const t = flush(); if (t) yield t; }
  await run;
  if (cardShown && !calcRoute) {
    const S = {
      profit: {
        zh: '已为您打开利润计算器，请核对或修改下方数据，结果会自动更新。',
        en: 'I have opened the profit calculator. Please review or edit the values below; results update automatically.'
      },
      acos: {
        zh: '已为您打开广告 ACOS 计算器，请核对或修改下方数据，结果会自动更新。',
        en: 'I have opened the ACOS calculator. Please review or edit the values below; results update automatically.'
      }
    };
    yield (S[cardKind] || S.profit)[lang];
  }
  yield { __usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens } };
}

function drainBuffer(buf) {
  let cut = buf.length;
  for (const tag of ['<think', '</think', '<']) {
    const i = buf.lastIndexOf(tag);
    if (i !== -1) cut = Math.min(cut, i);
  }
  return { out: buf.slice(0, cut), rest: buf.slice(cut) };
}

// 流式空闲超时：云端或本地服务长时间无响应时主动断开，避免对话永久挂起
function idleSignal(idleMs) {
  const ctrl = new AbortController();
  let timer = setTimeout(() => ctrl.abort(), idleMs);
  const poke = () => { clearTimeout(timer); timer = setTimeout(() => ctrl.abort(), idleMs); };
  const done = () => clearTimeout(timer);
  return { signal: ctrl.signal, poke, done };
}

// 从错误体里尽量抠出服务商给出的真实原因（优先 OpenAI 风格 {error:{message}}）
function extractReason(detail) {
  let d = String(detail || '').replace(/^HTTP\s+\d{3}\s*/, '').trim();
  if (!d) return '';
  try {
    const j = JSON.parse(d);
    const m = (j && j.error && (j.error.message || j.error.code)) || (j && j.message) || '';
    if (m) return String(m);
  } catch {}
  return d;
}

// 判断错误体是否“明确声明模型不存在”（不能仅凭文案里出现 model 字样）
function looksLikeModelNotFound(detail) {
  return /model[_\s-]?not[_\s-]?found|no\s+such\s+model|model\s+.{0,20}\s+(not\s+found|不存在)|does\s+not\s+exist/i.test(String(detail || ''));
}

// 把底层网络/鉴权错误翻译成用户能看懂的一句话，绝不把原始堆栈或 HTTP 状态码外露。
// 分类以【真实 HTTP 状态码】为准：只有 404、或错误体明确为 model not found 时才报“模型不存在”；
// 其余 4xx（如参数/温度不合法）干净透出服务商真实原因，不因文案含 "model" 字样误判。
function friendlyNetError(e, lang) {
  const en = lang === 'en';
  const msg = String((e && e.message) || e);
  const status = (e && Number(e.httpStatus)) || parseInt((msg.match(/^HTTP\s+(\d{3})/) || [])[1], 10) || 0;
  const detail = String((e && e.detail) || msg);
  if (/abort|timeout|超时/i.test(msg)) return en
    ? 'The request timed out. Please check your network or local model service and try again.'
    : '请求超时了。请检查网络，或确认本地模型服务已启动后再试。';
  if (status === 401 || status === 403 || /401|403|unauthor|invalid.?key|expired/i.test(msg)) return en
    ? 'The API key is invalid or expired. Please check it in Settings - AI Engine, or switch back to the built-in assistant.'
    : 'API Key 无效或已过期。请在“设置 - AI 引擎配置”中核对，或切回内置助手。';
  // 模型不存在：仅 404，或错误体明确声明 model not found
  if (status === 404 || looksLikeModelNotFound(detail)) return en
    ? 'The selected model was not found. Please check the model name in Settings - AI Engine.'
    : '所选模型不存在。请在“设置 - AI 引擎配置”中确认模型名称是否正确。';
  // 其余 4xx：透出服务商真实参数原因
  if (status >= 400 && status < 500) {
    const reason = extractReason(detail).slice(0, 160) || (en ? 'Bad request' : '请求参数有误');
    return en
      ? 'The AI service rejected the request: ' + reason
      : 'AI 服务返回了参数错误：' + reason;
  }
  if (/fetch|network|ENOTFOUND|ECONNREFUSED|EHOSTUNREACH|ECONNRESET|Failed to fetch|socket hang up/i.test(msg)) return en
    ? 'Cannot reach the AI service. Please check your network, or make sure the cloud service or local model server is running.'
    : '连不上 AI 服务。请检查网络，或确认云端服务可访问、本地模型服务已启动。';
  return en
    ? 'The AI service returned an error. Please try again later, or check your engine configuration.'
    : 'AI 服务返回了错误。请稍后重试，或检查 AI 引擎配置。';
}

// 云/本地流式：出错时以一句友好提示收尾，而不是把原始错误抛给前端
async function* withNetGuard(gen, lang) {
  try { yield* gen; } catch (e) { yield friendlyNetError(e, lang); }
}

// 取最后一条用户输入（opts.userText 缺失时从消息历史兜底）
function lastUserText(messages) {
  for (let i = (messages || []).length - 1; i >= 0; i--) {
    if (messages[i] && messages[i].role === 'user') return messages[i].content || '';
  }
  return '';
}

// 内置弱模型的能力增强兜底：用户想要联网/实时/大批量时，在流尾确定性追加一句接入引导，
// 不靠模型自觉。判定：wantsMore 且未自带引导，且（非知识教程类 或 模型已拒答）。
function capabilityHintAppend(userText, answerText, lang) {
  const en = lang === 'en';
  const u = String(userText || '').toLowerCase();
  const a = String(answerText || '');
  // 1) 意图门：联网 / 实时 / 今天 / 网页 / 全量批量 / 数字行量
  const wantsMore = en
    ? /search the web|online|live|real[- ]?time|latest|bulk|scrape|hundreds|thousands of rows|\d+\s*rows?/i.test(u)
    : /联网|上网|在线|实时|最新|今天的|搜索网|网页|全量|批量|大量|几百|上千行|\d+\s*(?:百|千|万)?\s*行/.test(u);
  if (!wantsMore) return '';
  // 2) 模型已自带接入引导则不重复追加
  if (en ? /AI Engine/i.test(a) : /AI 引擎配置/.test(a)) return '';
  // 3) 知识/教程类（怎么/如何/what is/how to...）默认不追加，除非模型明确拒答
  const howTo = /怎么|如何|怎样|方法|教程|是什么|什么意思|哪些条件|how\s?to|how do i|how can i|what is|what are|guide|tutorial|steps/i.test(u);
  // 4) 宽拒答：弱模型未必说窄拒答词，可能反问细节、说 I can't assist 或直接给通用建议
  const refused = en
    ? /can'?t\s*(?:assist|help|search|access|browse|do)|i don'?t have (?:access|internet|the ability|capability)|unable to|no internet/i.test(a)
    : /无法|不能|很抱歉|抱歉/.test(a);
  if (howTo && !refused) return '';
  return en
    ? 'For this kind of task, you can add a cloud API key or connect a locally deployed model under "Settings - AI Engine". The built-in assistant works without it.'
    : '如需这类能力，可在“设置 - AI 引擎配置”接入云端 API Key，或接入本地部署的模型；不接入也能正常使用内置助手。';
}

// 识别“温度只允许特定值”类 400（典型：kimi-k2.6 只接受 temperature=1）
function isTempConstraintError(status, detail) {
  return status === 400 && /temperature/i.test(detail) &&
    (/only\s*1\b|not\s*support|unsupported|invalid\s*temperature/i.test(detail));
}

// ── 云端 / LM Studio（OpenAI 兼容） ──
async function* openaiStream(base, key, model, messages, temperature) {
  const headers = { 'Content-Type': 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;
  let idle = idleSignal(45000);
  const post = (temp) => fetch(base.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST', headers, signal: idle.signal,
    body: JSON.stringify({ model, messages, stream: true, temperature: temp, stream_options: { include_usage: true } }),
  });
  let resp;
  let retriedTemp = false;
  try {
    resp = await post(temperature);
    // 仅接受固定温度的模型（如 kimi-k2.6 只允许 1）：以非 1 温度收到该 400 时，自动以 temperature=1 重试一次
    if (resp.status === 400 && !retriedTemp && Number(temperature) !== 1) {
      let d = '';
      try { d = (await resp.text()).slice(0, 300); } catch {}
      if (isTempConstraintError(400, d)) {
        retriedTemp = true;
        idle.done();
        idle = idleSignal(45000);
        resp = await post(1);
      }
    }
  } catch (e) { idle.done(); throw e; }
  if (resp.status === 401 || resp.status === 403) {
    idle.done();
    const err = new Error('HTTP ' + resp.status + ' Key invalid'); err.httpStatus = resp.status; throw err;
  }
  if (resp.status !== 200) {
    idle.done();
    let detail = '';
    try { detail = (await resp.text()).slice(0, 240); } catch {}
    const err = new Error('HTTP ' + resp.status + (detail ? ' ' + detail.trim() : ''));
    err.httpStatus = resp.status; err.detail = detail.trim();
    throw err;
  }
  if (!resp.body) { idle.done(); throw new Error('empty response'); }
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let pending = '';
  let cloudUsage = null;
  const feed = (chunk) => {
    pending += chunk;
    const outs = [];
    let idx;
    while ((idx = pending.indexOf('\n')) !== -1) {
      const line = pending.slice(0, idx).trim();
      pending = pending.slice(idx + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const j = JSON.parse(data);
        const t = j.choices?.[0]?.delta?.content;
        if (t) outs.push(t);
        if (j.usage) cloudUsage = j.usage;
      } catch {}
    }
    return outs;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      idle.poke();
      for (const t of feed(dec.decode(value, { stream: true }))) yield t;
    }
    if (cloudUsage) {
      const p = Number(cloudUsage.prompt_tokens) || 0;
      const cm = Number(cloudUsage.completion_tokens) || 0;
      if (p || cm) yield { __usage: { prompt_tokens: p, completion_tokens: cm, total_tokens: Number(cloudUsage.total_tokens) || (p + cm) } };
    }
  } finally { idle.done(); }
}

async function* ollamaStream(model, messages, temperature) {
  const idle = idleSignal(45000);
  let resp;
  try {
    resp = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: idle.signal,
      body: JSON.stringify({ model, messages, stream: true, think: false, options: { temperature, num_ctx: 8192 } }),
    });
  } catch (e) { idle.done(); throw e; }
  if (resp.status !== 200) { idle.done(); throw new Error('HTTP ' + resp.status); }
  if (!resp.body) { idle.done(); throw new Error('empty response'); }
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      idle.poke();
      pending += dec.decode(value, { stream: true });
      let idx;
      while ((idx = pending.indexOf('\n')) !== -1) {
        const line = pending.slice(0, idx);
        pending = pending.slice(idx + 1);
        if (!line.trim()) continue;
        let j;
        try { j = JSON.parse(line); } catch { continue; }
        if (j.error) { idle.done(); throw new Error(String(j.error)); }
        if (j.message?.content) yield j.message.content;
        if (j.done) {
          idle.done();
          const p = Number(j.prompt_eval_count) || 0;
          const cm = Number(j.eval_count) || 0;
          if (p || cm) yield { __usage: { prompt_tokens: p, completion_tokens: cm, total_tokens: p + cm } };
          return;
        }
      }
    }
  } finally { idle.done(); }
}

async function* chatStream(messages, temperature = 0.6, useTools = true, opts = {}) {
  const c = loadCfg();
  const provider = c.provider || 'builtin';
  const lang = opts && opts.lang === 'en' ? 'en' : 'zh';
  try {
    if (provider === 'builtin') {
      // 内置助手：随软件、可离线、默认，无需任何 Key
      const collected = [];
      for await (const chunk of builtinStream(messages, temperature, useTools, opts)) {
        if (typeof chunk === 'string') collected.push(chunk);
        yield chunk;
      }
      // 确定性兜底：命中联网/实时/大批量且模型已拒答时，在流尾补一句接入引导
      const extra = capabilityHintAppend((opts && opts.userText) || lastUserText(messages), collected.join(''), lang);
      if (extra) yield extra;
    } else if (provider === 'ollama') {
      if (!c.model) {
        yield lang === 'en'
          ? 'No local Ollama model is selected. Please start Ollama and pick a model in Settings - AI Engine, or switch back to the built-in assistant.'
          : '尚未选择本地 Ollama 模型。请先启动 Ollama，并在“设置 - AI 引擎配置”中选择模型，或切回内置助手。';
        return;
      }
      yield* withNetGuard(ollamaStream(c.model, messages, temperature), lang);
    } else {
      // OpenAI 兼容：云端 API Key，或 LM Studio 等本地 OpenAI 兼容服务
      if (!c.base_url || !c.model) {
        yield lang === 'en'
          ? 'The AI engine is not fully configured. Please complete the API address and model in Settings - AI Engine, or switch back to the built-in assistant.'
          : 'AI 引擎尚未配置完整。请在“设置 - AI 引擎配置”中补全接口地址和模型，或切回内置助手。';
        return;
      }
      const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)/.test(c.base_url);
      if (!c.api_key && !isLocal) {
        yield lang === 'en'
          ? 'This cloud provider needs an API key. Please add it in Settings - AI Engine, or switch back to the built-in assistant.'
          : '该云端服务需要 API Key。请在“设置 - AI 引擎配置”中填写，或切回内置助手。';
        return;
      }
      yield* withNetGuard(openaiStream(c.base_url, c.api_key, c.model, messages, temperature), lang);
    }
  } catch (e) {
    yield friendlyNetError(e, lang);
  }
}

// ── 服务商检测 ──
async function chatValidate(base, api_key, model) {
  // 用一次最小对话请求真实校验 Key（仅 1 个 token）
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api_key}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1, stream: false }),
      signal: ctrl.signal,
    });
    if (r.status === 401 || r.status === 403) return { auth: false };
    if (r.status === 200) return { auth: true };
    // 400/404 多为模型名问题，鉴权通常已通过
    return { auth: r.status !== 401 && r.status !== 403, status: r.status };
  } catch { return { auth: false, network: true }; }
  finally { clearTimeout(to); }
}

async function testProvider({ provider, base_url, api_key }) {
  const base = (base_url || '').replace(/\/$/, '');
  const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)/.test(base);
  if (!base) return { ok: false, error: '请填写API地址' };
  if (!api_key && !isLocal) return { ok: false, error: '请填写API Key' };
  const headers = { 'Content-Type': 'application/json' };
  if (api_key) headers.Authorization = `Bearer ${api_key}`;
  const preset = PRESETS[provider] || {};
  try {
    let url = base + '/models';
    if (/11434/.test(base)) url = 'http://127.0.0.1:11434/api/tags';
    const r = await fetch(url, { headers });
    if (r.status === 401 || r.status === 403) return { ok: false, error: 'Key无效或已过期，请确认这是该服务商的正确Key' };
    let models = [];
    if (r.status === 200) {
      const data = await r.json();
      if (Array.isArray(data.data)) models = data.data.map((m) => m.id).filter(Boolean);
      else if (Array.isArray(data.models)) models = data.models.map((m) => m.name || m.id).filter(Boolean);
      models = [...new Set(models)].sort();
    }
    if (models.length > 0) {
      return { ok: true, models: models.slice(0, 100), count: models.length, source: 'live' };
    }
    // 该服务商不开放模型列表：真实校验 Key 后提供常用模型
    if (!isLocal && api_key && preset.check) {
      const v = await chatValidate(base, api_key, preset.check);
      if (v.network) return { ok: false, error: '无法连接服务器，请检查网络或本地服务是否启动' };
      if (!v.auth) return { ok: false, error: 'Key无效或已过期，请确认这是该服务商的正确Key' };
      const known = preset.known || [];
      return { ok: true, models: known, count: known.length, source: 'catalog' };
    }
    if (isLocal) return { ok: false, error: '未检测到本地模型，请确认本地服务已启动并已加载模型' };
    return { ok: false, error: `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, error: /ENOTFOUND|ECONNREFUSED|network|Failed|fetch|abort/i.test(String(e.message)) ? '无法连接服务器，请检查网络或本地服务是否启动' : '连接失败：' + String(e.message).slice(0, 120) };
  }
}

async function getJson(url, ms = 3000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await (await fetch(url, { signal: ctrl.signal })).json(); }
  catch { return null; } finally { clearTimeout(t); }
}
async function localModels() {
  const found = [];
  const tags = await getJson('http://127.0.0.1:11434/api/tags');
  if (tags && Array.isArray(tags.models))
    for (const m of tags.models)
      found.push({ name: m.name, size: Math.round((m.size || 0) / (1024 * 1024)) + 'MB', engine: 'Ollama' });
  const lms = await getJson('http://127.0.0.1:1234/v1/models');
  if (lms && Array.isArray(lms.data))
    for (const m of lms.data) found.push({ name: m.id, size: '-', engine: 'LM Studio' });
  return { models: found };
}

async function modelStatus() {
  const c = loadCfg();
  const provider = c.provider || 'builtin';
  const hw = await detectHardware();
  let gpuInfo = '未检测到独立GPU';
  if (hw.gpu_name) gpuInfo = `${hw.gpu_name} · 总显存${hw.vram_total}MB · 可用${hw.vram_free}MB`;
  else {
    try {
      const mi = await Promise.race([getBuiltin(), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 2500))]);
      if (mi.llama.gpu) gpuInfo = '已启用图形加速（' + String(mi.llama.gpu) + '）';
    } catch {}
  }
  // 对外分类：内置模型（默认/离线）、本地模型（Ollama/LM Studio 自建）、云端模型（API Key）
  const engineKind =
    provider === 'builtin' ? 'builtin' :
    (provider === 'ollama' || provider === 'lmstudio') ? 'local' : 'cloud';
  const engineLabel =
    provider === 'builtin' ? '内置模型' :
    provider === 'ollama' ? 'Ollama 本地模型' :
    provider === 'lmstudio' ? 'LM Studio 本地模型' :
    (PRESETS[provider] && PRESETS[provider].label) || '云端 API';
  const status = {
    engine: provider, engine_kind: engineKind, engine_label: engineLabel,
    model_available: false,
    model_name: provider === 'builtin' ? (c.builtin_model ? friendlyBuiltinName(c.builtin_model) : '内置助手') : (c.model || ''),
    gpu_available: !!hw.gpu_name, gpu_info: gpuInfo, recommendation: '', cloud_ok: false,
    active_config: { num_ctx: hw.contextSize, mode: hw.mode, vram_total: hw.vram_total, vram_free: hw.vram_free, gpu_name: hw.gpu_name },
  };
  if (provider === 'builtin') {
    status.model_available = fs.existsSync(pickGguf());
    status.warm = warmReady;
    status.recommendation = '本地运行，无需联网，隐私安全';
  } else if (provider === 'ollama' || provider === 'lmstudio') {
    const lm = await localModels();
    const mine = lm.models.filter((m) => (provider === 'ollama' ? m.engine === 'Ollama' : m.engine === 'LM Studio'));
    status.model_available = mine.length > 0;
    if (!c.model && mine[0]) status.model_name = mine[0].name;
    status.recommendation = '本地模型运行中';
  } else {
    status.model_available = !!(c.api_key && c.model);
    status.cloud_ok = status.model_available;
    status.recommendation = '云端推理，无需本地GPU';
  }
  return status;
}

let warmed = false;
let warmReady = false;
async function prewarm() {
  if ((loadCfg().provider || 'builtin') !== 'builtin') return;
  if (warmed) return;
  await withLock(async () => {
    try {
      const mi = await getBuiltin();
      mi.session.resetChatHistory();
      await mi.session.setChatHistory([
        { type: 'system', text: '你是电商助手，帮助用户处理开店准备、商品选择、定价、库存、物流与日常运营等问题。' },
      ]);
      await mi.session.prompt('你好', { maxTokens: 8, temperature: 0 });
      warmed = true;
      warmReady = true;
    } catch {}
  });
}

function init(p) {
  paths = p;
  configFile = path.join(paths.userDir, 'model_config.json');
  loadCfg();
}

// 释放已加载的内置模型，便于切换到其它本地模型
async function disposeBuiltin() {
  try { if (modelInfo && modelInfo.context && modelInfo.context.dispose) modelInfo.context.dispose(); } catch {}
  try { if (modelInfo && modelInfo.model && modelInfo.model.dispose) await modelInfo.model.dispose(); } catch {}
  modelInfo = null;
  modelPromise = null;
  warmed = false;
  warmReady = false;
}

// 选择并切换到指定本地模型（传入空字符串则回到默认内置模型）
async function selectBuiltin(file) {
  const c = loadCfg();
  c.provider = 'builtin';
  c.builtin_model = file || '';
  c.base_url = '';
  c.model = '';
  delete c.api_key;
  saveCfg(c);
  await disposeBuiltin();
  prewarm();
  return { ok: true, message: '已切换本地模型' };
}

module.exports = {
  init, prewarm, chatStream, testProvider, localModels, modelStatus,
  detectHardware, selectBuiltin,
  getConfig: () => ({ ...loadCfg(), presets: PRESETS, has_key: !!loadCfg().api_key }),
  isWarm: () => warmReady,
  setConfig: (c) => { saveCfg(c); return { ok: true, message: '模型配置已保存' }; },
};
