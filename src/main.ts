import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 740,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => (mainWindow = null));
}

app.whenReady().then(() => {
  createWindow();

  // Автообновления: простой вариант. Работает с публичными релизами GitHub.
  // Для автоматической загрузки latest.yml и .exe — публикуй релизы обычным способом.
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }, 1500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==== IPC ====

ipcMain.handle('open-folder', async (_e, dir: string) => {
  try {
    await shell.openPath(dir);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
});

ipcMain.handle('run-game', async (_e, payload: {
  exePath: string;
  cwd?: string;
  args?: string[];
}) => {
  try {
    const { exePath, cwd, args = [] } = payload;
    const child = spawn(exePath, args, {
      cwd: cwd || path.dirname(exePath),
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
});