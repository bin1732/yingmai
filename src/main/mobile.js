// 局域网手机访问 · 灵感引擎工坊 · bin1732
const http = require('http');
const os = require('os');
const crypto = require('crypto');
const QRCode = require('qrcode');

const MOBILE_PORT = 8788;
let server = null;
const secret = crypto.randomBytes(24).toString('hex');
let pin = '';

const VIRTUAL = /vEthernet|VMware|VirtualBox|Hyper-V|WSL|Default Switch|Docker|Virtual|Loopback|Bluetooth|Tailscale|ZeroTier/i;
const PHYSICAL = /Wi-Fi|WiFi|WLAN|无线|Ethernet|以太网|Local Area/i;
function lanCandidates() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) {
        out.push({ name, address: ni.address, virt: VIRTUAL.test(name), phys: PHYSICAL.test(name) });
      }
    }
  }
  return out;
}
function getLanIp() {
  const cs = lanCandidates();
  const priv = (c) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(c.address);
  const score = (c) => (c.phys ? 4 : 0) + (priv(c) ? 2 : 0) + (c.virt ? -10 : 0);
  cs.sort((a, b) => score(b) -score(a));
  return cs.length ? cs[0].address : null;
}
function baseUrl() { const ip = getLanIp(); return ip ? `http://${ip}:${MOBILE_PORT}` : null; }
function tokenFor(p) { return crypto.createHash('sha256').update(secret + '|' + p).digest('hex'); }

function gatePage(note) {
  return `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>盈脉</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f6fa;}
.box{background:#fff;padding:28px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);width:300px;text-align:center;}
input{width:100%;padding:12px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px;box-sizing:border-box;margin:14px 0;}
button{width:100%;padding:12px;background:#4f46e5;color:#fff;border:none;border-radius:10px;font-size:15px;}
.note{color:#ef4444;font-size:12px;margin-bottom:6px;}</style>
<div class=box><div style="font-size:30px;">🛒</div><h3 style="margin:8px 0 4px">盈脉</h3>
<div style="color:#6b7280;font-size:13px;margin-bottom:6px">请输入访问码</div>
<div class=note>${note || ''}</div>
<form method=post action=/__auth>
<input name=pin inputmode=numeric autofocus placeholder="访问码">
<button type=submit>进入</button></form></div>`;
}

function readCookies(req) {
  const c = {};
  (req.headers.cookie || '').split(';').forEach((x) => {
    const i = x.indexOf('=');
    if (i > -1) c[x.slice(0, i).trim()] = decodeURIComponent(x.slice(i + 1).trim());
  });
  return c;
}
function collectBody(req) {
  return new Promise((r) => { let d = ''; req.on('data', (c) => { d += c; }); req.on('end', () => r(d)); });
}
function parseForm(s) {
  const o = {};
  s.split('&').forEach((x) => {
    const i = x.indexOf('=');
    if (i > -1) o[decodeURIComponent(x.slice(0, i))] = decodeURIComponent(x.slice(i + 1).replace(/\+/g, ' '));
  });
  return o;
}

function makeHandler(router) {
  return async function (req, res) {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/__auth' && req.method === 'POST') {
      const b = parseForm(await collectBody(req));
      if (pin && b.pin === pin) {
        res.writeHead(302, {
          'Set-Cookie': `ewb_auth=${tokenFor(pin)}; Path=/; HttpOnly; SameSite=Lax`,
          Location: '/',
        });
        return res.end();
      }
      res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(gatePage('访问码不正确，请重试'));
    }
    const authed = !pin || readCookies(req).ewb_auth === tokenFor(pin);
    if (!authed) {
      if (u.pathname.startsWith('/api/')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ detail: '请先输入访问码' }));
      }
      res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(gatePage());
    }
    return router(req, res);
  };
}

function start(router, opts) {
  if (server) return Promise.resolve(true);
  pin = (opts && opts.pin) || '';
  if (!getLanIp()) return Promise.resolve(false);
  server = http.createServer(makeHandler(router));
  return new Promise((resolve) => {
    server.on('error', () => { server = null; resolve(false); });
    server.listen(MOBILE_PORT, '0.0.0.0', () => resolve(true));
  });
}
function stop() { if (server) { server.close(); server = null; } pin = ''; }
function isRunning() { return !!server; }
async function qrPng() { const url = baseUrl(); if (!url) return null; return QRCode.toBuffer(url, { width: 320, margin: 1 }); }
function info() {
  const url = baseUrl();
  return { enabled: isRunning(), ip: getLanIp(), port: MOBILE_PORT, url, hasPin: !!pin };
}
module.exports = { start, stop, isRunning, info, qrPng, baseUrl, getLanIp, MOBILE_PORT };
