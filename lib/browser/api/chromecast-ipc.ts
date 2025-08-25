import { ipcMain, webContents } from 'electron';
import { chromecast } from './chromecast';

let wired = false;

export function wireChromecastIPC() {
  if (wired) return; wired = true;
  ipcMain.handle('chromecast:enable', () => chromecast.enable());
  ipcMain.handle('chromecast:startDiscovery', () => chromecast.startDiscovery());
  ipcMain.handle('chromecast:stopDiscovery', () => chromecast.stopDiscovery());
  ipcMain.handle('chromecast:getDevices', () => chromecast.getDevices());
  ipcMain.handle('chromecast:connect', async (_e, deviceId: string) => { const session = await chromecast.connect(deviceId); return session.id; });
  ipcMain.handle('chromecast:castMedia', (_e, sessionId: string, params: any) => chromecast.castMedia(sessionId, params));
  ipcMain.handle('chromecast:play', (_e, sessionId: string) => chromecast.play(sessionId));
  ipcMain.handle('chromecast:pause', (_e, sessionId: string) => chromecast.pause(sessionId));
  ipcMain.handle('chromecast:stop', (_e, sessionId: string) => chromecast.stop(sessionId));
  ipcMain.handle('chromecast:seek', (_e, sessionId: string, seconds: number) => chromecast.seek(sessionId, seconds));
  ipcMain.handle('chromecast:disconnect', (_e, sessionId: string) => chromecast.disconnect(sessionId));

  chromecast.on('device', (device) => { for (const wc of webContents.getAllWebContents()) { wc.send('chromecast:device', device); } });
  chromecast.on('media', (payload) => { for (const wc of webContents.getAllWebContents()) { wc.send('chromecast:media', payload); } });
}
