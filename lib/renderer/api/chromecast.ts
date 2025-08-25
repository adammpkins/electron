import { ipcRenderer } from 'electron';
import { EventEmitter } from 'events';

type Device = { id: string; name: string; host: string; port: number; addresses: string[]; txt: Record<string, string>; };

class ChromecastRendererAPI extends EventEmitter {
  enable() { return ipcRenderer.invoke('chromecast:enable'); }
  startDiscovery() { return ipcRenderer.invoke('chromecast:startDiscovery'); }
  stopDiscovery() { return ipcRenderer.invoke('chromecast:stopDiscovery'); }
  getDevices(): Promise<Device[]> { return ipcRenderer.invoke('chromecast:getDevices'); }
  connect(deviceId: string): Promise<string> { return ipcRenderer.invoke('chromecast:connect', deviceId); }
  castMedia(sessionId: string, params: any) { return ipcRenderer.invoke('chromecast:castMedia', sessionId, params); }
  play(sessionId: string) { return ipcRenderer.invoke('chromecast:play', sessionId); }
  pause(sessionId: string) { return ipcRenderer.invoke('chromecast:pause', sessionId); }
  stop(sessionId: string) { return ipcRenderer.invoke('chromecast:stop', sessionId); }
  seek(sessionId: string, seconds: number) { return ipcRenderer.invoke('chromecast:seek', sessionId, seconds); }
  disconnect(sessionId: string) { return ipcRenderer.invoke('chromecast:disconnect', sessionId); }
  bindEvents() { ipcRenderer.on('chromecast:device', (_evt, device: Device) => this.emit('device', device)); ipcRenderer.on('chromecast:media', (_evt, payload: any) => this.emit('media', payload)); }
}

export const chromecastRenderer = new ChromecastRendererAPI();
