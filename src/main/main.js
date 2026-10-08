// 盈脉 · 电商工作台桌面应用入口 · 灵感引擎工坊 · bin1732
const { app, BrowserWindow, Tray, Menu, MenuItem, shell, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const backend = require('./backend');
const appsettings = require('./appsettings');

// 便携模式：将用户数据保存在程序所在文件夹，便于随 U 盘携带、不写入系统目录
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  try {
    const portableDataDir = path.join(process.env.PORTABLE_EXECUTABLE_DIR, '盈脉数据');
    fs.mkdirSync(portableDataDir, { recursive: true });
    app.setPath('userData', portableDataDir);
  } catch {}
}

// 运行日志统一保存到用户数据目录下的 logs 文件夹，避免在程序所在目录生成调试文件
try {
  const logDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  app.commandLine.appendSwitch('log-file', path.join(logDir, 'yingmai.log'));
} catch {}

// 将进程工作目录切换到用户数据目录：Chromium 子进程在无控制台时会在工作目录生成调试文件，
// 切换后该文件位于用户数据目录，程序所在目录保持整洁
try { process.chdir(app.getPath('userData')); } catch {}

// 程序目录下可能出现的调试文件（Chromium 在 Windows 上的已知良性启动文件）
function debugLogPath() {
  return path.join(path.dirname(app.getPath('exe')), 'debug.log');
}

// 将退出清理所需的批处理与脚本写入用户数据目录（均不经过 Chromium，不会占用调试文件）
function writeCleanupAssets() {
  const ud = app.getPath('userData');
  const bat = path.join(ud, 'cleanup.bat');
  const ps1 = path.join(ud, 'kill-handler.ps1');
  const batBody = [
    '@echo off',
    'set "T=%~1"',
    'set "U=%~2"',
    'set /a tries=90',
    'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kill-handler.ps1" -UserData "%U%" >nul 2>nul',
    ':loop',
    'del /f /q "%T%" 2>nul',
    'if not exist "%T%" exit /b 0',
    'set /a tries-=1',
    'if %tries% leq 0 exit /b 1',
    'ping 127.0.0.1 -n 3 >nul 2>nul',
    'goto loop',
    ''
  ].join('\r\n');
  const psBody = `param([string]$UserData)
Get-CimInstance Win32_Process -Filter "Name='crashpad_handler.exe'" |
  Where-Object { $_.CommandLine -like "*$UserData*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
`;
  try {
    fs.writeFileSync(bat, batBody, { encoding: 'latin1' });
    fs.writeFileSync(ps1, psBody, { encoding: 'latin1' });
  } catch {}
  return bat;
}

// 启动时清理上一次会话残留（此时文件已解锁）
function cleanStaleDebugLog() {
  try { fs.rmSync(debugLogPath(), { force: true }); } catch {}
}

// 退出时启动一个隐藏的独立批处理：结束本应用的崩溃报告处理进程，待文件解锁后将其删除
function scheduleDebugLogRemoval() {
  try {
    const target = debugLogPath();
    if (!fs.existsSync(target)) return;
    const bat = writeCleanupAssets();
    const child = spawn('cmd.exe', ['/c', bat, target, app.getPath('userData')], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      cwd: app.getPath('userData')
    });
    child.unref();
  } catch {}
}
cleanStaleDebugLog();


let mainWindow = null;
let tray = null;
let isQuitting = false;
const PREFERRED_PORT = 8787;
let activePort = PREFERRED_PORT;
let baseUrl = `http://127.0.0.1:${activePort}`;

// 单实例：再次启动时聚焦已有窗口
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    cleanStaleDebugLog();
    if (mainWindow) { if (!mainWindow.isVisible()) mainWindow.show(); mainWindow.focus(); }
  });
  boot();
}

function resolvePaths() {
  const userDir = app.getPath('userData');
  try { fs.mkdirSync(userDir, { recursive: true }); } catch {}
  if (app.isPackaged) {
    const res = process.resourcesPath;
    return {
      userDir,
      modelsDir: path.join(res, 'models'),
      refDataDir: path.join(res, 'data'),
      webDir: path.join(__dirname, '..', '..', 'web'),
    };
  }
  const root = path.join(__dirname, '..', '..');
  return {
    userDir,
    modelsDir: path.join(root, 'models'),
    refDataDir: path.join(root, 'data'),
    webDir: path.join(root, 'web'),
  };
}

function waitForBackend(retries = 40) {
  return new Promise((resolve) => {
    const attempt = (n) => {
      http.get(baseUrl + '/api/model/status', (r) => { r.resume(); resolve(); })
        .on('error', () => {
          if (n <= 0) return resolve();
          setTimeout(() => attempt(n - 1), 300);
        });
    };
    attempt(retries);
  });
}

function findIcon() {
  const candidates = [
    path.join(process.resourcesPath || '', 'build', 'icon.ico'),
    path.join(__dirname, '..', '..', 'build', 'icon.ico'),
    path.join(__dirname, 'icon.ico'),
  ];
  for (const c of candidates) { try { if (c && fs.existsSync(c)) return c; } catch {} }
  return undefined;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1040,
    minHeight: 720,
    title: '盈脉 · 电商工作台',
    icon: findIcon(),
    backgroundColor: '#fafafa',
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  mainWindow.setMenuBarVisibility(false);
  let loadAttempts = 0;
  const loadApp = () => mainWindow.loadURL(baseUrl);
  mainWindow.webContents.on('did-fail-load', (e, code, desc, validated, isMain) => {
    if (isMain && loadAttempts < 5) { loadAttempts += 1; setTimeout(loadApp, 600); }
  });
  loadApp();

  // 外部链接用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });

  mainWindow.on('close', async (e) => {
    if (isQuitting) return;
    const action = appsettings.get().closeAction || 'ask';
    if (action === 'quit') { isQuitting = true; return; }
    if (action === 'minimize') { e.preventDefault(); mainWindow.hide(); return; }
    e.preventDefault();
    const r = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: '关闭盈脉',
      message: '关闭窗口时，您希望：',
      checkboxLabel: '记住我的选择',
      checkboxChecked: false,
      buttons: ['最小化到托盘', '直接退出', '取消'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });
    if (r.response === 2) return;
    if (r.checkboxChecked) appsettings.set({ closeAction: r.response === 0 ? 'minimize' : 'quit' });
    if (r.response === 0) { mainWindow.hide(); }
    else { isQuitting = true; app.quit(); }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray(icon) {
  if (!icon) return;
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: '打开盈脉', click: () => { if (mainWindow) mainWindow.show(); } },
    { type: 'separator' },
    {
      label: '退出',
      click: () => { isQuitting = true; app.quit(); },
    },
  ]);
  tray.setToolTip('盈脉 · 电商工作台');
  tray.setContextMenu(menu);
  tray.on('click', () => {
    if (!mainWindow) return createWindow();
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

async function boot() {
  await app.whenReady();
  // 本地来源允许使用麦克风，避免额外弹窗；其他权限默认关闭
  const isLocal = (wc) => {
    try { return String(wc.getURL()).startsWith('http://127.0.0.1'); } catch { return false; }
  };
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    callback(permission === 'media' && isLocal(wc));
  });
  session.defaultSession.setPermissionCheckHandler((wc, permission) => permission === 'media' && isLocal(wc));
  // 导出文件：统一保存到“下载”目录，自动避免重名，确保文件正确写入并完成
  session.defaultSession.on('will-download', (event, item) => {
    try {
      const dir = app.getPath('downloads');
      const suggested = item.getFilename() || 'download';
      const ext = path.extname(suggested);
      const stem = suggested.slice(0, suggested.length - ext.length);
      let fp = path.join(dir, suggested);
      let n = 1;
      while (fs.existsSync(fp)) { fp = path.join(dir, `${stem} (${n})${ext}`); n += 1; }
      item.setSavePath(fp);
    } catch {}
  });
  const paths = resolvePaths();
  const srv = await backend.start(paths);
  activePort = srv.port;
  baseUrl = `http://127.0.0.1:${activePort}`;
  await waitForBackend();
  createWindow();
  createTray(findIcon());

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); else mainWindow.show(); });
  app.on('before-quit', () => { isQuitting = true; });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      // 用户选择退出（或无托盘）时结束程序；选择最小化驻留时保持在托盘运行
      if (isQuitting || !tray) app.quit();
    }
  });
  // 退出兜底：若原生资源释放阻塞，短暂等待后强制结束，避免进程残留
  app.on('will-quit', (e) => {
    if (!app._forceExitTimer) {
      app._forceExitTimer = setTimeout(() => { app.exit(0); }, 6000);
    }
    scheduleDebugLogRemoval();
  });
}
