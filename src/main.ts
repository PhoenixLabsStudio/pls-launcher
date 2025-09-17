import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { autoUpdater } from 'electron-updater';
import type { UpdateInfo, ProgressInfo, UpdateDownloadedEvent } from 'electron-updater';

let win: BrowserWindow | null = null;

function getGamesJsonPath(): string {
  const base = app.isPackaged ? process.resourcesPath : app.getAppPath();
  return path.join(base, 'resources', 'games.json');
}

function createWindow() {
  win = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0b0b10',
    title: 'Phoenix Labs Launcher',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // win.webContents.openDevTools();
}

/** ====== Автообновления ====== */
function initAutoUpdater() {
  if (!app.isPackaged) return; // в dev не проверяем

  autoUpdater.autoDownload = true;      // автоматически скачивать
  autoUpdater.autoInstallOnAppQuit = true;

  const send = (event: string, payload?: any) => {
    if (win && !win.isDestroyed()) win.webContents.send(`update:${event}`, payload);
  };

  autoUpdater.on('checking-for-update', () => send('status', { state: 'checking' }));
  autoUpdater.on('update-available', (info: UpdateInfo) => send('available', info));
  autoUpdater.on('update-not-available', (info: UpdateInfo) => send('not-available', info));
  autoUpdater.on('error', (err: Error) => send('error', { message: (err as any)?.message || String(err) }));
  autoUpdater.on('download-progress', (p: ProgressInfo) => send('progress', p));
  autoUpdater.on('update-downloaded', (info: UpdateDownloadedEvent) => send('downloaded', info));

  // IPC из UI
  ipcMain.handle('update:check', async () => {
    try {
      const res = await autoUpdater.checkForUpdates();
      return { ok: true, res };
    } catch (e: any) {
      send('error', { message: e?.message || String(e) });
      return { ok: false, error: String(e) };
    }
  });

  ipcMain.handle('update:install', async () => {
    try {
      // закроет приложение и применит патч
      autoUpdater.quitAndInstall(false, true);
      return { ok: true };
    } catch (e: any) {
      send('error', { message: e?.message || String(e) });
      return { ok: false, error: String(e) };
    }
  });

  // первая авто-проверка через пару секунд после старта
  setTimeout(() => autoUpdater.checkForUpdates(), 3000);
}

/** ====== App lifecycle ====== */
app.whenReady().then(() => {
  app.setAppUserModelId('com.phoenixlabs.launcher');
  createWindow();
  initAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/** ====== IPC: каталог/запуск игр ====== */
ipcMain.handle('games:get', async () => {
  try {
    const p = getGamesJsonPath();
    const raw = fs.readFileSync(p, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return { error: String(err), items: [] };
  }
});

ipcMain.handle('game:launch', async (_evt, payload: { exePath: string; args?: string[]; workDir?: string }) => {
  try {
    const exe = payload?.exePath;
    if (!exe || !fs.existsSync(exe)) throw new Error(`Файл не найден: ${exe}`);
    const args = payload?.args ?? [];
    const cwd = payload?.workDir && fs.existsSync(payload.workDir) ? payload.workDir : path.dirname(exe);

    const child = spawn(exe, args, {
      cwd,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('open:folder', async (_evt, folderPath: string) => {
  try {
    if (!folderPath || !fs.existsSync(folderPath)) throw new Error('Папка не найдена');
    await shell.openPath(folderPath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('open:url', async (_evt, url: string) => {
  try {
    if (!url) throw new Error('URL пустой');
    await shell.openExternal(url);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});