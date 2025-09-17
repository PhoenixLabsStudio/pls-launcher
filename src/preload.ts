import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // игры
  getGames: () => ipcRenderer.invoke('games:get'),
  launchGame: (game: { exePath: string; args?: string[]; workDir?: string }) =>
    ipcRenderer.invoke('game:launch', game),
  openFolder: (folderPath: string) => ipcRenderer.invoke('open:folder', folderPath),
  openUrl: (url: string) => ipcRenderer.invoke('open:url', url),

  // обновления
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdate: (cb: (evt: { type: string; payload?: any }) => void) => {
    const handler = (_: any, payload: any) => cb(payload);
    ipcRenderer.on('update:status', (_e, p) => cb({ type: 'status', payload: p }));
    ipcRenderer.on('update:available', (_e, p) => cb({ type: 'available', payload: p }));
    ipcRenderer.on('update:not-available', (_e, p) => cb({ type: 'not-available', payload: p }));
    ipcRenderer.on('update:error', (_e, p) => cb({ type: 'error', payload: p }));
    ipcRenderer.on('update:progress', (_e, p) => cb({ type: 'progress', payload: p }));
    ipcRenderer.on('update:downloaded', (_e, p) => cb({ type: 'downloaded', payload: p }));
    return () => {
      ipcRenderer.removeListener('update:status', handler);
      ipcRenderer.removeListener('update:available', handler);
      ipcRenderer.removeListener('update:not-available', handler);
      ipcRenderer.removeListener('update:error', handler);
      ipcRenderer.removeListener('update:progress', handler);
      ipcRenderer.removeListener('update:downloaded', handler);
    };
  },
});

declare global {
  interface Window {
    api: {
      getGames: () => Promise<any>;
      launchGame: (game: { exePath: string; args?: string[]; workDir?: string }) => Promise<any>;
      openFolder: (folderPath: string) => Promise<any>;
      openUrl: (url: string) => Promise<any>;

      checkForUpdates: () => Promise<any>;
      installUpdate: () => Promise<any>;
      onUpdate: (cb: (evt: { type: string; payload?: any }) => void) => () => void;
    };
  }
}