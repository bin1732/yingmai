// 评论痛点挖掘 → 改进闭环（确定性，离线可用）· 灵感引擎工坊 · bin1732
(function () {
  'use strict';
  var CATS = [
    { id: 'battery', zh: '续航/电池', en: 'Battery life', kw: /续航|电池|电量|耗电|充电|battery|charg/,
      az: '优化电池与功耗，明确标注真实续航时长；必要时更换更大容量电池或低功耗方案。',
      ae: 'Improve battery/power efficiency and state true battery life; consider a larger cell or lower-power design.' },
    { id: 'comfort', zh: '佩戴舒适度', en: 'Comfort / fit', kw: /佩戴|夹头|不舒服|戴着|磨|耳疼|耳朵痛|耳痛|comfortable|uncomfortable|\bfit\b/,
      az: '改进结构与耳罩/耳塞材质，减轻夹持力，提供不同尺寸耳塞。',
      ae: 'Refine the shape and ear-tip/ear-cup materials, reduce clamping force, and offer multiple tip sizes.' },
    { id: 'quality', zh: '做工质量', en: 'Build quality', kw: /质量|坏了|坏掉|断裂|裂开|破损|做工|瑕疵|松动|defect|broke|broken|flimsy|quality/,
      az: '加强来料检验与结构强度，更换更耐用的材料和连接方式，降低返修率。',
      ae: 'Strengthen QC and structural durability, use sturdier materials and joints, and reduce defects.' },
    { id: 'sound', zh: '音质', en: 'Sound quality', kw: /音质|杂音|噪音|破音|电流声|sound|audio|\bbass\b|treble/,
      az: '调校声学方案，减少底噪与电流声，优化单元与密封。',
      ae: 'Tune the acoustic design, reduce background and electrical noise, and improve drivers and sealing.' },
    { id: 'connect', zh: '连接稳定', en: 'Connectivity', kw: /连接|蓝牙|断连|配对|connect|pair|bluetooth|disconnect/,
      az: '升级蓝牙模组/固件与天线设计，改善兼容性与配对稳定性。',
      ae: 'Upgrade the Bluetooth module, firmware and antenna; improve compatibility and pairing stability.' },
    { id: 'logistics', zh: '物流包装', en: 'Delivery / packaging', kw: /物流|快递|包装|发货|delivery|shipping|package|packaging/,
      az: '加固缓冲包装，更换更稳定的物流渠道，缩短发货时效。',
      ae: 'Reinforce protective packaging, use a more reliable carrier, and shorten handling time.' },
    { id: 'price', zh: '价格性价比', en: 'Price / value', kw: /价格|太贵|偏贵|便宜|性价比|price|expensive|cheap|value/,
      az: '通过供应链降本或增加附加价值来匹配价格预期，设置合理的促销与套装。',
      ae: 'Reduce supply-chain cost or add value to match expectations; use well-judged promotions and bundles.' },
    { id: 'service', zh: '客服售后', en: 'Service / support', kw: /客服|售后|退货|退款|service|support|refund/,
      az: '完善售后话术与处理时效，明确退换政策，主动跟进问题订单。',
      ae: 'Improve support response time, clarify return policy, and proactively follow up problem orders.' },
  ];
  var COMP = /太短|太少|太差|不行|不满|失望|难受|难用|不舒服|夹|坏|破|断|裂|卡|慢|漏|掉|问题|无法|不能|经常|频繁|烦|吵|疼|痛|too |short|bad|poor|terrible|awful|won't|doesn't|issue|problem|defect|slow|weak|flimsy|uncomfortable/;
  var POS = /不错|很好|挺好|喜欢|满意|稳定|清晰|值得|推荐|好评|棒|耐用|方便|好看|good|great|love|stable|worth|recommend|nice|happy|comfortable|easy/;

  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'zh'; }
  function L(zh, en) { return lang() === 'en' ? en : zh; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function parseReviews(text) {
    return String(text || '').split(/\r?\n[ \t]*\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  function mine(reviews) {
    var counts = {}, praise = {}, examples = {};
    reviews.forEach((r) => {
      var seenI = {}, seenP = {};
      // 按标点/转折词拆成分句，分别判定正负面，正确处理“先扬后抑”的混合评价
      var clauses = r.split(/[，。；、,.!！?？；]|\bbut\b|\bhowever\b/).map((s) => s.trim()).filter(Boolean);
      clauses.forEach((cl) => {
        var matched = CATS.filter((c) => c.kw.test(cl));
        var cComp = COMP.test(cl), cPos = POS.test(cl);
        if (cComp) {
          if (!matched.length) { if (!seenI.other) { counts.other = (counts.other || 0) + 1; seenI.other = 1; } }
          matched.forEach((c) => {
            if (seenI[c.id]) return;
            seenI[c.id] = 1; counts[c.id] = (counts[c.id] || 0) + 1;
            if (!examples[c.id]) examples[c.id] = r.replace(/\s+/g, ' ').slice(0, 80);
          });
        } else if (cPos) {
          if (!matched.length) { if (!seenP.general) { praise.general = (praise.general || 0) + 1; seenP.general = 1; } }
          matched.forEach((c) => { if (!seenP[c.id] && !seenI[c.id]) { seenP[c.id] = 1; praise[c.id] = (praise[c.id] || 0) + 1; } });
        }
      });
    });
    var issues = CATS.filter((c) => counts[c.id]).map((c) => ({
      id: c.id, label: L(c.zh, c.en), count: counts[c.id],
      pct: Math.round((counts[c.id] / reviews.length) * 100), example: examples[c.id],
      suggestion: L(c.az, c.ae),
    })).sort((a, b) => b.count - a.count);
    var good = CATS.filter((c) => praise[c.id]).map((c) => L(c.zh, c.en));
    if (praise.general) good.push(L('整体体验', 'Overall experience'));
    return { total: reviews.length, issues: issues, good: good };
  }

  var lastResult = null;
  function renderAnalysis() {
    var product = (document.getElementById('revProduct').value || '').trim();
    var reviews = parseReviews(document.getElementById('revText').value);
    var host = document.getElementById('revResult');
    host.style.whiteSpace = 'normal';
    if (!reviews.length) {
      host.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💬</div>' + L('粘贴评论后即可提炼痛点与机会', 'Paste reviews to extract pain points and opportunities') + '</div>';
      return;
    }
    var r = mine(reviews); lastResult = r;
    var html = '<div style="margin-bottom:12px;color:var(--text-secondary);font-size:13px;">' +
      L('共分析 ', 'Analyzed ') + r.total + L(' 条评论', ' reviews') + '</div>';
    html += '<div id="revChart" style="width:100%;height:240px;margin-bottom:16px;"></div>';
    if (r.issues.length) {
      html += '<div class="card-title" style="margin:8px 0;">' + L('优先改进（按提及频次）', 'Prioritized improvements (by frequency)') + '</div>';
      r.issues.forEach((is2) => {
        html += '<div class="card" style="margin-bottom:10px;padding:12px;">' +
          '<div style="display:flex;justify-content:space-between;gap:8px;"><strong>' + esc(is2.label) +
          '</strong><span class="badge">' + is2.count + L(' 条 · ', ' · ') + is2.pct + '%</span></div>' +
          (is2.example ? '<div style="color:var(--text-secondary);font-size:12px;margin:6px 0;">“' + esc(is2.example) + '”</div>' : '') +
          '<div style="font-size:13px;margin:6px 0;">' + esc(is2.suggestion) + '</div>' +
          '<button class="btn btn-sm" data-add="' + is2.id + '">' + L('加入改进清单', 'Add to improvement list') + '</button></div>';
      });
    } else {
      html += '<div class="empty-state">' + L('未发现明显的集中抱怨', 'No concentrated complaints found') + '</div>';
    }
    if (r.good.length) {
      html += '<div class="card-title" style="margin:14px 0 8px;">' + L('可用于文案的好评点', 'Positive points for your copy') + '</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:8px;">' + r.good.map((g) => '<span class="badge" style="background:rgba(16,185,129,.12);color:#10b981;">' + esc(g) + '</span>').join('') + '</div>';
    }
    html += '<div style="margin-top:16px;"><button class="btn btn-primary" id="revAddAll">' + L('把高频问题加入改进清单', 'Add top issues to the list') + '</button></div>';
    html += '<div class="card-title" style="margin:18px 0 8px;">' + L('我的改进清单', 'My improvement list') + '</div><div id="revSaved"></div>';
    host.innerHTML = html;
    drawChart(r);
    host.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => addOne(b.getAttribute('data-add'), product)));
    var all = document.getElementById('revAddAll');
    if (all) all.addEventListener('click', () => addAll(product));
    loadSaved();
  }

  function drawChart(r) {
    var el = document.getElementById('revChart');
    if (!el || !window.echarts) return;
    var chart = echarts.init(el);
    var cats = r.issues.map((i) => i.label).reverse();
    var vals = r.issues.map((i) => i.count).reverse();
    chart.setOption({
      grid: { left: 110, right: 30, top: 10, bottom: 24 },
      xAxis: { type: 'value', minInterval: 1 },
      yAxis: { type: 'category', data: cats, axisLabel: { fontSize: 12 } },
      series: [{ type: 'bar', data: vals, itemStyle: { color: '#6366f1', borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right' } }],
    });
  }

  function api(path, method, body) {
    return fetch(path, {
      method: method || 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => r.json());
  }
  function issueOf(id) { return (lastResult && lastResult.issues || []).find((x) => x.id === id); }

  function addOne(id, product) {
    var is2 = issueOf(id); if (!is2) return;
    return api('/api/improvements', 'POST', {
      product: product, category: is2.id, issue_label: is2.label, suggestion: is2.suggestion, status: 'open',
    }).then(() => { if (window.toast) toast(L('已加入改进清单', 'Added to improvement list')); loadSaved(); });
  }
  function addAll(product) {
    if (!lastResult) return;
    var top = lastResult.issues.slice(0, 3);
    return Promise.all(top.map((is2) => api('/api/improvements', 'POST', {
      product: product, category: is2.id, issue_label: is2.label, suggestion: is2.suggestion, status: 'open',
    }))).then(() => { if (window.toast) toast(L('已加入改进清单', 'Added to improvement list')); loadSaved(); });
  }

  function loadSaved() {
    var host = document.getElementById('revSaved');
    if (!host) return;
    api('/api/improvements').then((rows) => {
      if (!rows || !rows.length) {
        host.innerHTML = '<div class="empty-state">' + L('还没有保存的改进项', 'No saved improvements yet') + '</div>';
        return;
      }
      host.innerHTML = rows.map((r) =>
        '<div class="card" style="margin-bottom:8px;padding:10px 12px;display:flex;justify-content:space-between;gap:10px;align-items:center;' +
        (r.status === 'done' ? 'opacity:.55;' : '') + '">' +
        '<div><div><strong>' + esc(r.issue_label) + '</strong>' + (r.product ? ' · ' + esc(r.product) : '') + '</div>' +
        '<div style="font-size:12px;color:var(--text-secondary);">' + esc(r.suggestion) + '</div></div>' +
        '<div class="row-actions" style="flex:0 0 auto;">' +
        '<button class="btn btn-xs" data-toggle="' + r.id + '">' + (r.status === 'done' ? L('标记未完成', 'Reopen') : L('标记完成', 'Done')) + '</button>' +
        '<button class="btn btn-xs btn-danger-text" data-del="' + r.id + '">' + L('删除', 'Delete') + '</button></div></div>').join('');
      host.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
        var row = rows.find((x) => String(x.id) === b.getAttribute('data-toggle'));
        api('/api/improvements/' + row.id, 'PUT', { status: row.status === 'done' ? 'open' : 'done' }).then(loadSaved);
      }));
      host.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
        api('/api/improvements/' + b.getAttribute('data-del'), 'DELETE').then(loadSaved);
      }));
    });
  }

  function init() {
    var btn = document.getElementById('revBtn');
    if (btn) btn.addEventListener('click', renderAnalysis);
    document.addEventListener('ewb:page', (e) => { if (e.detail === 'reviews') loadSaved(); });
    loadSaved();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
