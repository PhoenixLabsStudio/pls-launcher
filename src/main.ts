import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // __dirname указывает на dist, поэтому путь такой:
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ===== IPC =====

// Запуск игры/процесса
ipcMain.handle('run:game', async (_evt, payload: { exePath: string; cwd?: string; args?: string[] }) => {
  try {
    if (!payload?.exePath) throw new Error('exePath is required');

    const child = spawn(payload.exePath, payload.args ?? [], {
      cwd: payload.cwd || undefined,
      detached: true,
      stdio: 'ignore'
    });

    child.on('error', (err) => {
      // вернём ошибку в рендер
      throw err;
    });

    // Отвязываем процесс, чтобы окно лаунчера не держало его
    child.unref();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
});

// Открыть папку
ipcMain.handle('open:folder', async (_evt, dir: string) => {
  try {
    if (!dir) throw new Error('dir is required');
    const res = await shell.openPath(dir);
    if (res) return { ok: false, error: res }; // shell.openPath возвращает строку с ошибкой
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
});