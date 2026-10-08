// 店铺连接前端：连接管理、同步设置、平台目录与凭证表单。
// 灵感引擎工坊 · bin1732

let SC = null;

function scL(o) {
  return o ? (currentLang === 'en' ? o.en : o.zh) : '';
}

function scEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function api(url, body, method) {
  const opt = { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json' } };
  if (body) opt.body = JSON.stringify(body);
  const r = await fetch(url, opt);
  let json = null;
  try { json = await r.json(); } catch { /* 非 JSON */ }
  if (!r.ok) {
    const msg = (json && json.detail) || (json && json.error) || (currentLang === 'en' ? 'Request failed' : '请求失败');
    throw new Error(msg);
  }
  return json;
}

async function loadShopconn() {
  SC = await api('/api/shopconn/state');
  renderShopconn();
}

function connStatusBadge(status) {
  const map = {
    ok: ['badge-success', currentLang === 'en' ? 'Connected' : '已连接'],
    syncing: ['badge-info', currentLang === 'en' ? 'Syncing' : '同步中'],
    error: ['badge-danger', currentLang === 'en' ? 'Needs attention' : '需处理'],
    new: ['badge-warning', currentLang === 'en' ? 'Not connected' : '待连接'],
  };
  const [cls, txt] = map[status] || map.new;
  return `<span class="badge ${cls}">${txt}</span>`;
}

function connectBadge(connect) {
  const map = {
    available: ['badge-success', currentLang === 'en' ? 'Connectable' : '可接入'],
    self: ['badge-accent', currentLang === 'en' ? 'Self-serve' : '可自助接入'],
    gated: ['badge-warning', currentLang === 'en' ? 'Developer access' : '需开发者资质'],
    restricted: ['sc-badge-muted', currentLang === 'en' ? 'No direct access' : '暂不支持直连'],
  };
  const [cls, txt] = map[connect] || map.restricted;
  return `<span class="badge ${cls}">${txt}</span>`;
}

function renderShopconn() {
  if (!SC) return;
  // 同步设置
  const auto = document.getElementById('scAutoSync');
  const iv = document.getElementById('scInterval');
  auto.checked = !!SC.settings.auto_sync;
  iv.value = String(SC.settings.interval_seconds || 60);

  renderConnections();
  renderCatalog();
}

function renderConnections() {
  const wrap = document.getElementById('scConnections');
  const empty = document.getElementById('scEmpty');
  const conns = SC.connections || [];
  empty.style.display = conns.length ? 'none' : 'block';
  wrap.innerHTML = conns.map((c) => {
    const counts = c.last_counts
      ? (currentLang === 'en'
        ? `added ${c.last_counts.created} · updated ${c.last_counts.updated}`
        : `新增 ${c.last_counts.created} · 更新 ${c.last_counts.updated}`)
      : '';
    const meta = [platformLabel(c.platform), c.nickname, c.shop_name, c.currency, c.plan].filter(Boolean).join(' · ');
    const logs = (c.logs || []).map((l) =>
      `<div class="sc-log sc-log-${l.level}"><span class="sc-log-at">${scEsc(l.at)}</span> ${scEsc(l.msg)}</div>`).join('');
    return `
    <div class="card sc-conn-card">
      <div class="sc-conn-head">
        <div class="sc-conn-name">${scEsc(meta)}</div>
        ${connStatusBadge(c.status)}
      </div>
      <div class="sc-conn-sync">
        <span>${currentLang === 'en' ? 'Last sync' : '上次同步'}：${scEsc(c.last_sync) || (currentLang === 'en' ? 'not yet' : '尚未同步')}</span>
        ${counts ? `<span class="sc-conn-counts">${scEsc(counts)}</span>` : ''}
      </div>
      ${c.last_error ? `<div class="sc-conn-err">${scEsc(c.last_error)}</div>` : ''}
      <div class="sc-conn-actions">
        <button class="btn btn-ghost btn-sm" onclick="scSyncNow(${c.id})">${currentLang === 'en' ? 'Sync now' : '立即同步'}</button>
        <button class="btn btn-ghost btn-sm" onclick="scEnsureProducts(${c.id})">${currentLang === 'en' ? 'Build products' : '建立商品档案'}</button>
        <button class="btn btn-ghost btn-sm" onclick="scOpenTutorial('${c.platform}')">${currentLang === 'en' ? 'Setup guide' : '接入教程'}</button>
        <label class="sc-check-label btn-sm">
          <input type="checkbox" ${c.enabled ? 'checked' : ''} onchange="scSetEnabled(${c.id}, this.checked)">
          ${currentLang === 'en' ? 'Enabled' : '启用'}
        </label>
        <button class="btn btn-ghost btn-sm sc-danger-text" onclick="scRemove(${c.id})">${currentLang === 'en' ? 'Remove' : '删除'}</button>
      </div>
      ${logs ? `<details class="sc-logs"><summary>${currentLang === 'en' ? 'Sync log' : '同步日志'}</summary>${logs}</details>` : ''}
    </div>`;
  }).join('');
}

function renderCatalog() {
  const wrap = document.getElementById('scCatalog');
  const items = SC.catalog || [];
  wrap.innerHTML = items.map((p) => {
    // available / self / gated 三档均开放连接入口（含 sourcing 的 1688）；restricted 国内平台仅教程
    const canConnect = ['available', 'self', 'gated'].includes(p.connect);
    const links = [];
    if (p.docs) links.push(`<a href="${scEsc(p.docs)}" target="_blank" rel="noopener">${currentLang === 'en' ? 'Official docs' : '官方文档'}</a>`);
    if (p.signup && p.signup !== p.docs) links.push(`<a href="${scEsc(p.signup)}" target="_blank" rel="noopener">${currentLang === 'en' ? 'Platform site' : '前往平台'}</a>`);
    const actions = [];
    actions.push(`<button class="btn btn-ghost btn-sm" onclick="scOpenTutorial('${p.id}')">${currentLang === 'en' ? 'Guide' : '教程'}</button>`);
    if (canConnect) actions.unshift(`<button class="btn btn-primary btn-sm" onclick="scOpenConnect('${p.id}')">${currentLang === 'en' ? 'Connect' : '连接'}</button>`);
    return `
    <div class="card sc-cat-card">
      <div class="sc-cat-head">
        <span class="sc-cat-name">${scEsc(scL(p.name))}</span>
        ${connectBadge(p.connect)}
      </div>
      <p class="sc-cat-need">${scEsc(scL(p.need))}</p>
      <div class="sc-cat-links">${links.join(' · ')}</div>
      <div class="sc-cat-actions">${actions.join(' ')}</div>
    </div>`;
  }).join('');
}

// ── 连接弹窗 ──
function scOpenConnect(platformId) {
  const p = SC.catalog.find((x) => x.id === platformId);
  if (!p || !p.credentialFields) return;
  closeModal();
  const backdrop = document.createElement('div');
  backdrop.id = 'modalBackdrop';
  backdrop.className = 'modal-backdrop';
  const fieldsHtml = p.credentialFields.map((f, i) => {
    const inputType = f.secret ? 'password' : 'text';
    return `<div class="modal-field">
      <label class="modal-label" for="scf_${i}">${scEsc(scL(f.label))}<span class="req">*</span></label>
      <input id="scf_${i}" class="modal-input" type="${inputType}" data-key="${scEsc(f.key)}" placeholder="${scEsc(scL(f.placeholder))}">
    </div>`;
  }).join('');
  const devLink = p.official && p.official.devapps ? p.official.devapps : p.docs;
  backdrop.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="${scEsc(scL(p.name))}">
      <div class="modal-head">
        <span class="modal-title">${currentLang === 'en' ? 'Connect ' : '连接 '}${scEsc(scL(p.name))}</span>
        <button class="modal-close" aria-label="close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        ${fieldsHtml}
        <div class="sc-form-links">
          <a href="${scEsc(devLink)}" target="_blank" rel="noopener">${currentLang === 'en' ? 'How to get credentials' : '如何获取凭证'}</a>
          <a href="#" onclick="scOpenTutorial('${p.id}');return false;">${currentLang === 'en' ? 'View setup guide' : '查看接入教程'}</a>
        </div>
        <div class="modal-error" id="scFormMsg"></div>
      </div>
      <div class="modal-foot">
        <button class="modal-btn modal-btn-cancel" onclick="closeModal()">${currentLang === 'en' ? 'Cancel' : '取消'}</button>
        <button class="modal-btn modal-btn-cancel" id="scTestBtn">${currentLang === 'en' ? 'Test connection' : '测试连接'}</button>
        <button class="modal-btn modal-btn-primary" id="scSaveBtn" disabled>${currentLang === 'en' ? 'Save & connect' : '保存并连接'}</button>
      </div>
    </div>`;
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) closeModal(); });
  document.body.appendChild(backdrop);
  const msg = document.getElementById('scFormMsg');
  let tested = false;

  const readCreds = () => {
    const creds = {};
    backdrop.querySelectorAll('.modal-input').forEach((el) => { creds[el.dataset.key] = el.value.trim(); });
    return creds;
  };
  document.getElementById('scTestBtn').onclick = async () => {
    msg.className = 'modal-error';
    msg.textContent = currentLang === 'en' ? 'Testing…' : '正在测试…';
    try {
      const r = await api('/api/shopconn/test', { platform: p.id, credentials: readCreds(), language: currentLang });
      if (r.ok) {
        tested = true;
        msg.className = 'modal-error sc-ok-text';
        msg.textContent = currentLang === 'en'
          ? `Connected: ${r.shop_name} (${r.currency})`
          : `连接成功：${r.shop_name}（${r.currency}）`;
        document.getElementById('scSaveBtn').disabled = false;
      } else {
        tested = false;
        msg.textContent = r.error || (currentLang === 'en' ? 'Connection failed' : '连接失败');
        document.getElementById('scSaveBtn').disabled = true;
      }
    } catch (e) {
      msg.textContent = e.message;
      document.getElementById('scSaveBtn').disabled = true;
    }
  };
  document.getElementById('scSaveBtn').onclick = async () => {
    if (!tested) return;
    const btn = document.getElementById('scSaveBtn');
    btn.disabled = true;
    msg.textContent = currentLang === 'en' ? 'Connecting and running first sync…' : '正在连接并首次同步…';
    try {
      await api('/api/shopconn/connections', {
        platform: p.id, nickname: '', credentials: readCreds(), language: currentLang,
      });
      closeModal();
      await loadShopconn();
    } catch (e) {
      msg.textContent = e.message;
      btn.disabled = false;
    }
  };
}

// ── 动作 ──
async function scSyncNow(id) {
  try { await api(`/api/shopconn/connections/${id}/sync`, {}); await loadShopconn(); }
  catch (e) { alert(e.message); }
}
async function scEnsureProducts(id) {
  try {
    const r = await api(`/api/shopconn/connections/${id}/products`, {});
    await loadShopconn();
    alert(currentLang === 'en' ? `${r.created} product records created` : `已建立 ${r.created} 个商品档案`);
  } catch (e) { alert(e.message); }
}
async function scSetEnabled(id, enabled) {
  try {
    await api(`/api/shopconn/connections/${id}`, { enabled }, 'PUT');
  } catch (e) {
    alert(e.message);
  }
  await loadShopconn();
}
function scRemove(id) {
  openConfirmModal({
    title: currentLang === 'en' ? 'Remove connection' : '删除连接',
    message: currentLang === 'en'
      ? 'Remove this connection and its synced products and orders? Internal product records are kept. This cannot be undone.'
      : '确定删除该连接，并移除其同步的店铺商品与订单吗？内部商品档案会保留。此操作无法撤销。',
    danger: true,
    confirmText: currentLang === 'en' ? 'Remove' : '删除',
    onConfirm: async () => {
      await api(`/api/shopconn/connections/${id}?deleteData=1`, null, 'DELETE');
      await loadShopconn();
    },
  });
}

// ── 教程（内容在教程模块中提供） ──
function scOpenTutorial(platformId) {
  if (window.SCTutorial && window.SCTutorial.open) {
    window.SCTutorial.open(platformId, SC && SC.catalog);
  } else {
    alert(currentLang === 'en' ? 'The setup guide is being prepared.' : '接入教程正在准备中。');
  }
}

// ── 同步设置 ──
function bindShopconnSettings() {
  document.getElementById('scAddBtn').addEventListener('click', () => {
    const first = (SC.catalog || []).find((x) => x.connect === 'available');
    if (first) scOpenConnect(first.id);
  });
  const saveSettings = async () => {
    await api('/api/shopconn/settings', {
      auto_sync: document.getElementById('scAutoSync').checked,
      interval_seconds: Number(document.getElementById('scInterval').value),
      language: currentLang,
    });
    await loadShopconn();
  };
  document.getElementById('scAutoSync').addEventListener('change', saveSettings);
  document.getElementById('scInterval').addEventListener('change', saveSettings);
  document.getElementById('scSyncAll').addEventListener('click', async () => {
    for (const c of SC.connections) {
      if (c.enabled) {
        try { await api(`/api/shopconn/connections/${c.id}/sync`, {}); } catch { /* 单个失败继续 */ }
      }
    }
    await loadShopconn();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  bindShopconnSettings();
});
window.addEventListener('ewb:page', (e) => {
  if (e.detail && e.detail.page === 'shopconn') loadShopconn();
});
