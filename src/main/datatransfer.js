// 数据导入导出与备份恢复 · 灵感引擎工坊 · bin1732
// 纯函数式数据处理，不含任何示例之外的虚构数据；解析逐行校验并返回错误报告。

// 每个集合的字段顺序：[字段名, 中文表头, 是否数值]
const SCHEMAS = {
  products: [
    ['name', '商品名称', false], ['platform', '平台', false],
    ['cost', '成本', true], ['price', '售价', true], ['notes', '备注', false],
  ],
  orders: [
    ['order_no', '订单编号', false], ['platform', '平台', false], ['product_name', '商品名称', false],
    ['qty', '数量', true], ['unit_price', '单价', true], ['total_amount', '订单金额', true],
    ['buyer', '买家', false], ['status', '状态', false],
    ['shipping_company', '物流公司', false], ['shipping_no', '物流单号', false],
  ],
  inventory: [
    ['product_name', '商品名称', false], ['sku', 'SKU', false], ['warehouse', '仓库', false],
    ['stock_qty', '库存数量', true], ['safety_stock', '安全库存', true],
  ],
  purchases: [
    ['po_no', '采购单号', false], ['supplier', '供应商', false], ['product_name', '商品名称', false],
    ['qty', '数量', true], ['unit_cost', '采购单价', true], ['total_cost', '采购总额', true],
    ['status', '状态', false],
  ],
  suppliers: [
    ['name', '供应商名称', false], ['contact', '联系人', false], ['phone', '电话', false],
    ['address', '地址', false], ['products', '供货商品', false],
  ],
  aftersales: [
    ['order_no', '订单编号', false], ['platform', '平台', false], ['type', '类型', false],
    ['reason', '原因', false], ['amount', '金额', true], ['status', '状态', false],
  ],
  history: [
    ['type', '类型', false], ['input_text', '输入内容', false], ['result_text', '结果内容', false],
  ],
};

const COLLECTION_LABELS = {
  products: '商品库', orders: '订单', inventory: '库存', purchases: '采购',
  suppliers: '供应商', aftersales: '售后', history: '分析历史',
};

// ── CSV 序列化 ──
function csvCell(v) {
  v = v == null ? '' : String(v);
  if (/[",\n\r]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
  return v;
}
function toCsv(coll, rows) {
  const schema = SCHEMAS[coll];
  const header = schema.map((f) => f[1]);
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push(schema.map(([key]) => csvCell(r[key])).join(','));
  }
  return '\ufeff' + lines.join('\r\n');
}

// ── CSV 解析（支持引号、转义引号、字段内换行）──
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // 去 BOM
  const rows = [];
  let row = [], field = '', inQ = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\n') {
      pushRow();
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      pushRow();
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows;
}

// 表头 -> 字段索引（兼容中文表头与字段名）
function mapHeader(coll, headerCells) {
  const schema = SCHEMAS[coll];
  const idx = {};
  headerCells.forEach((h, i) => {
    const t = String(h).trim();
    for (const [key, label] of schema) {
      if (t === label || t === key) { idx[key] = i; }
    }
  });
  return idx;
}

// CSV -> 记录（逐行校验）
function csvToRecords(coll, text) {
  if (!SCHEMAS[coll]) throw new Error('未知数据类型');
  const rows = parseCsv(text);
  const errors = [];
  const records = [];
  if (rows.length === 0) return { coll, total_rows: 0, valid_rows: 0, errors: [{ row: 0, msg: '文件为空' }], records: [] };
  const idx = mapHeader(coll, rows[0]);
  const schema = SCHEMAS[coll];
  if (Object.keys(idx).length === 0) {
    return { coll, total_rows: rows.length - 1, valid_rows: 0, errors: [{ row: 1, msg: '表头无法识别，请使用导出的模板' }], records: [] };
  }
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.length === 1 && cells[0].trim() === '') continue; // 空行
    const rec = {};
    let rowErr = null;
    for (const [key, , isNum] of schema) {
      if (!(key in idx)) continue;
      let v = (cells[idx[key]] ?? '').trim();
      if (isNum) {
        if (v === '') { v = null; }
        else if (!isFinite(Number(v))) { rowErr = `“${SCHEMAS[coll].find((f) => f[0] === key)[1]}”不是有效数字：${v}`; break; }
        else v = Number(v);
      }
      rec[key] = v;
    }
    if (rowErr) { errors.push({ row: r + 1, msg: rowErr }); continue; }
    // 至少有一个非空字段才导入
    const hasData = Object.values(rec).some((v) => v !== null && v !== '' && v !== undefined);
    if (!hasData) { errors.push({ row: r + 1, msg: '空行，已跳过' }); continue; }
    records.push(rec);
  }
  return { coll, total_rows: rows.length - 1, valid_rows: records.length, errors, records };
}

// ── 整库备份（覆盖全部业务集合与费率自定义）──
function buildBackup(raw, collectionNames) {
  const names = collectionNames || Object.keys(SCHEMAS);
  const data = {};
  for (const c of names) {
    data[c] = (raw[c] || []).map(stripSystem);
  }
  return {
    app: 'yingmai',
    kind: 'backup',
    version: 4,
    exported_at: new Date().toISOString(),
    data,
    fee_overrides: raw._feeOverrides || {},
  };
}
// 去掉系统自增 id；保留 created_at（若有）
function stripSystem(r) {
  const o = Object.assign({}, r);
  delete o.id;
  return o;
}

// 备份文件校验（预览）
function previewBackup(json) {
  const errors = [];
  if (!json || json.kind !== 'backup' || !json.data || typeof json.data !== 'object') {
    return { ok: false, errors: [{ row: 0, msg: '不是有效的备份文件' }], collections: {}, data: null };
  }
  const cleanData = {};
  const counts = {};
  for (const coll of Object.keys(json.data)) {
    const arr = json.data[coll];
    const label = COLLECTION_LABELS[coll] || coll;
    if (arr == null) { cleanData[coll] = []; counts[coll] = 0; continue; }
    if (!Array.isArray(arr)) { errors.push({ row: 0, msg: `${label}数据格式不正确` }); continue; }
    const okRows = [];
    arr.forEach((r, i) => {
      if (r === null || typeof r !== 'object') { errors.push({ row: i + 1, msg: `${label}第 ${i + 1} 条格式不正确` }); return; }
      okRows.push(stripSystem(r));
    });
    cleanData[coll] = okRows;
    counts[coll] = okRows.length;
  }
  return { ok: errors.length === 0, errors, collections: counts, data: cleanData, fee_overrides: json.fee_overrides || {} };
}

module.exports = {
  SCHEMAS, COLLECTION_LABELS,
  toCsv, parseCsv, csvToRecords,
  buildBackup, previewBackup, stripSystem,
};
