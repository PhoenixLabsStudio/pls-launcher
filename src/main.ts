import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

const isDev = !app.isPackaged;
let win: BrowserWindow;

function resolveAppPath(...parts: string[]) {
  // В dev читаем из dist/, в prod — из app.asar
  const base = isDev ? path.join(process.cwd(), 'dist') : app.getAppPath();
  return path.join(base, ...parts);
}

function readJSON<T = any>(filePath: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(filePath: string, data: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/** ------------------ CONFIG ------------------ */
type Paths = { fivem?: string; samp?: string; crmp?: string; arma3?: string };
type Config = { theme?: 'dark' | 'neon'; paths?: Paths };
const defaultConfig: Config = { theme: 'dark', paths: {} };
const configPath = path.join(app.getPath('userData'), 'config.json');

function getConfig(): Config {
  return readJSON<Config>(configPath, defaultConfig);
}
function setConfig(partial: Partial<Config>): Config {
  const merged = { ...defaultConfig, ...getConfig(), ...partial };
  writeJSON(configPath, merged);
  return merged;
}

/** ------------------ AUTODETECT ------------------ */
function tryFile(p: string | undefined) {
  if (!p) return undefined;
  return fs.existsSync(p) ? p : undefined;
}
function getSteamCommonDirs(): string[] {
  const dirs: string[] = [];
  const pf86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  const steamRoot = path.join(pf86, 'Steam');
  const common = path.join(steamRoot, 'steamapps', 'common');
  if (fs.existsSync(common)) dirs.push(common);

  // libraryfolders.vdf — дополнительные библиотеки
  const vdf = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');
  if (fs.existsSync(vdf)) {
    try {
      const text = fs.readFileSync(vdf, 'utf-8');
      // очень простой парсер путей "path"		"D:\\SteamLibrary"
      const re = /"path"\s*"([^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const c = path.join(m[1], 'steamapps', 'common');
        if (fs.existsSync(c)) dirs.push(c);
      }
    } catch { /* ignore */ }
  }
  return Array.from(new Set(dirs));
}
function autodetectPaths(): Paths {
  const res: Paths = {};
  // FiveM — чаще всего в LocalAppData
  const fivem1 = path.join(process.env.LOCALAPPDATA || '', 'FiveM', 'FiveM.exe');
  const fivem2 = path.join(process.env.LOCALAPPDATA || '', 'FiveM', 'FiveM.app', 'FiveM.exe');
  res.fivem = tryFile(fivem1) || tryFile(fivem2);

  // SA:MP / CRMP — обычно рядом с gta_sa.exe
  const common = getSteamCommonDirs();
  const gtaFolders = [
    'Grand Theft Auto San Andreas',
    'GTA San Andreas',
    'GTA-SA',
  ];
  for (const dir of common) {
    for (const g of gtaFolders) {
      const gta = path.join(dir, g, 'gta_sa.exe');
      if (fs.existsSync(gta)) {
        // запустим сам клиент как gta_sa.exe (для сапм/крмп лаунчеры часто цепляются)
        res.samp = res.samp || gta;
        res.crmp = res.crmp || gta;
      }
    }
  }

  // Arma 3 — Steam app 107410
  for (const dir of common) {
    const a1 = path.join(dir, 'Arma 3', 'arma3_x64.exe');
    const a2 = path.join(dir, 'Arma 3', 'arma3.exe');
    const found = tryFile(a1) || tryFile(a2);
    if (found) { res.arma3 = found; break; }
  }
  return res;
}

/** ------------------ GAMES CATALOG ------------------ */
type Game = { id: 'fivem' | 'samp' | 'crmp' | 'arma3'; name: string };
function loadCatalog(): Game[] {
  const file = resolveAppPath('resources', 'games.json');
  const arr = readJSON<Game[]>(file, []);
  return arr;
}

/** ------------------ RUN / OPEN ------------------ */
function openFolderForExe(exePath: string) {
  const dir = path.dirname(exePath);
  shell.openPath(dir);
}
function runExe(exePath: string) {
  try {
    const child = spawn(exePath, [], { detached: true, stdio: 'ignore' });
    child.unref();
    return true;
  } catch (e) {
    return false;
  }
}

/** ------------------ WINDOW ------------------ */
async function createWin() {
  win = new BrowserWindow({
    width: 1080,
    height: 720,
    backgroundColor: '#0b0f17',
	icon: resolveAppPath('assets', 'icon.png'),
    webPreferences: {
      preload: resolveAppPath('preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  win.on('ready-to-show', () => win.show());
  await win.loadFile(resolveAppPath('renderer', 'index.html'));
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
}

app.on('ready', createWin);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWin(); });

/** ------------------ IPC ------------------ */
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('catalog:load', () => loadCatalog());

ipcMain.handle('settings:get', () => getConfig());
ipcMain.handle('settings:set', (_e, partial: Partial<Config>) => setConfig(partial));
ipcMain.handle('settings:autodetect', () => autodetectPaths());

ipcMain.handle('dialog:pickExe', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Выберите исполняемый файл игры',
    properties: ['openFile'],
    filters: [{ name: 'Executables', extensions: ['exe'] }],
  });
  return r.canceled ? undefined : r.filePaths[0];
});

ipcMain.handle('game:run', (_e, id: Game['id']) => {
  const cfg = getConfig();
  const paths = cfg.paths || {};
  const byConfig = paths[id];
  if (byConfig && fs.existsSync(byConfig)) return runExe(byConfig);

  // fallback по каталогу (если заданы дефолты в games.json)
  const cat = loadCatalog();
  const g = cat.find(x => x.id === id) as any;
  const fallback = g?.exePath as string | undefined;
  if (fallback && fs.existsSync(fallback)) return runExe(fallback);

  return false;
});

ipcMain.handle('game:openFolder', (_e, id: Game['id']) => {
  const cfg = getConfig();
  const exe = cfg.paths?.[id];
  if (exe && fs.existsSync(exe)) {
    openFolderForExe(exe);
    return true;
  }
  return false;
});

ipcMain.handle('open:discord', () => {
  shell.openExternal('https://discord.gg/TNV8UDDMEG');
  return true;
});