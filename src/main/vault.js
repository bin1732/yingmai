// 店铺凭证保管：优先使用系统提供的加密能力（Windows 为 DPAPI），
// 不可用时使用本机绑定的 AES-256-GCM 加密。凭证仅保存在用户本机。
// 灵感引擎工坊 · bin1732

const crypto = require('crypto');
const os = require('os');

const APP_SECRET = 'yingmai-shop-connector::v1';

function safeStorageApi() {
  try {
    const { safeStorage } = require('electron');
    if (safeStorage && safeStorage.isEncryptionAvailable && safeStorage.isEncryptionAvailable()) {
      return safeStorage;
    }
  } catch { /* 非 Electron 环境，使用备选方案 */ }
  return null;
}

function machineFingerprint() {
  const parts = [os.hostname(), os.platform(), os.arch(), String(os.totalmem())];
  try {
    const ifaces = os.networkInterfaces();
    const macs = [];
    for (const name of Object.keys(ifaces)) {
      for (const ni of ifaces[name] || []) {
        if (!ni.internal && ni.mac && ni.mac !== '00:00:00:00:00:00') macs.push(ni.mac);
      }
    }
    parts.push(macs.sort().join(','));
  } catch { /* 忽略，使用其余部分 */ }
  try { parts.push(os.cpus()[0].model); } catch {}
  return parts.join('|');
}

let fallbackKey = null;
function getFallbackKey() {
  if (!fallbackKey) {
    fallbackKey = crypto.scryptSync(APP_SECRET + '@' + machineFingerprint(), APP_SECRET, 32);
  }
  return fallbackKey;
}

// 输入明文，返回可持久化的对象
function encrypt(plain) {
  const text = String(plain == null ? '' : plain);
  const ss = safeStorageApi();
  if (ss) {
    try {
      return { k: 'os', d: ss.encryptString(text).toString('base64') };
    } catch { /* 落到本机加密 */ }
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getFallbackKey(), iv);
  const ct = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { k: 'gcm', iv: iv.toString('base64'), t: tag.toString('base64'), d: ct.toString('base64') };
}

// 输入 encrypt 返回的对象，还原明文；失败返回空字符串
function decrypt(rec) {
  if (!rec || typeof rec !== 'object') return '';
  try {
    if (rec.k === 'os') {
      const ss = safeStorageApi();
      if (!ss) return '';
      return ss.decryptString(Buffer.from(rec.d, 'base64'));
    }
    if (rec.k === 'gcm') {
      const iv = Buffer.from(rec.iv, 'base64');
      const tag = Buffer.from(rec.t, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', getFallbackKey(), iv);
      decipher.setAuthTag(tag);
      const pt = Buffer.concat([decipher.update(Buffer.from(rec.d, 'base64')), decipher.final()]);
      return pt.toString('utf8');
    }
  } catch { /* 密钥不匹配或数据损坏 */ }
  return '';
}

// 批量加解密凭证字段
function encryptFields(obj, fields) {
  const out = {};
  for (const f of fields) {
    if (obj[f] !== undefined && obj[f] !== null && String(obj[f]) !== '') {
      out[f] = encrypt(String(obj[f]));
    }
  }
  return out;
}
function decryptFields(enc, fields) {
  const out = {};
  for (const f of fields) {
    if (enc && enc[f]) out[f] = decrypt(enc[f]);
  }
  return out;
}

module.exports = { encrypt, decrypt, encryptFields, decryptFields };
