// 应用偏好设置（关闭行为等）· 灵感引擎工坊 · bin1732
const fs = require('fs');
const path = require('path');

let file = null;
let cache = {};

function init(userDir) {
  try { fs.mkdirSync(userDir, { recursive: true }); } catch {}
  file = path.join(userDir, 'settings.json');
  try { cache = JSON.parse(fs.readFileSync(file, 'utf-8')) || {}; } catch { cache = {}; }
  return cache;
}
function get() { return cache || {}; }
function set(patch) {
  cache = Object.assign({}, cache, patch || {});
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
  return cache;
}
module.exports = { init, get, set };
