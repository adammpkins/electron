// Electron main-process API shim for Chromecast.
import { EventEmitter } from 'events';
import { ChromecastMDNSBrowser } from '../../internal/chromecast/mdns';
import { CastV2Client } from '../../internal/chromecast/castv2';

type Device = { id: string; name: string; host: string; port: number; addresses: string[]; txt: Record<string, string>; };
type CastSession = { id: string; deviceId: string; client: any; sessionId?: string; transportId?: string; mediaSessionId?: number; };

class ChromecastAPI extends EventEmitter {
  private enabled = false;
  private browser: ChromecastMDNSBrowser | null = null;
  private devices = new Map<string, Device>();
  private sessions = new Map<string, CastSession>();

  enable() { if (this.enabled) return; this.enabled = true; }

  startDiscovery() {
    if (!this.enabled) throw new Error('chromecast not enabled. Call chromecast.enable() first.');
    if (this.browser) return;
    this.browser = new ChromecastMDNSBrowser();
    this.browser.on('device', (d: Device) => { this.devices.set(d.id, d); this.emit('device', d); });
    this.browser.on('error', (e: Error) => this.emit('error', e));
    this.browser.start();
  }

  stopDiscovery() { if (this.browser) { this.browser.stop(); this.browser = null; } }

  getDevices(): Device[] { return Array.from(this.devices.values()); }

  async connect(deviceId: string): Promise<CastSession> {
    if (!this.enabled) throw new Error('chromecast not enabled');
    const device = this.devices.get(deviceId);
    if (!device) throw new Error(`Device not found: ${deviceId}`);
    const host = device.addresses[0] || device.host;
    const client = new CastV2Client(host, device.port || 8009);
    await client.connect();
    await client.launchDefaultMediaReceiver();
    const session: CastSession = { id: `${deviceId}:${Date.now()}`, deviceId, client };
    client.on('media', (msg: any) => { if (msg.type === 'MEDIA_STATUS' && Array.isArray(msg.status) && msg.status[0]) { session.mediaSessionId = msg.status[0].mediaSessionId; } this.emit('media', { sessionId: session.id, message: msg }); });
    this.sessions.set(session.id, session);
    return session;
  }

  async castMedia(session: CastSession | string, params: { contentId: string; contentType: string; streamType?: 'BUFFERED' | 'LIVE' | 'OTHER'; metadata?: any; autoplay?: boolean; }): Promise<void> {
    const s = this._getSession(session); await s.client.loadMedia(params);
  }

  play(session: CastSession | string) { const s = this._getSession(session); if (s.mediaSessionId) s.client.play(s.mediaSessionId); }
  pause(session: CastSession | string) { const s = this._getSession(session); if (s.mediaSessionId) s.client.pause(s.mediaSessionId); }
  stop(session: CastSession | string) { const s = this._getSession(session); if (s.mediaSessionId) s.client.stop(s.mediaSessionId); }
  seek(session: CastSession | string, seconds: number) { const s = this._getSession(session); if (s.mediaSessionId) s.client.seek(s.mediaSessionId, seconds); }
  disconnect(session: CastSession | string) { const s = this._getSession(session); try { s.client.close(); } catch {} this.sessions.delete(s.id); }

  private _getSession(s: CastSession | string): CastSession { const id = typeof s === 'string' ? s : s.id; const found = this.sessions.get(id); if (!found) throw new Error(`Unknown session: ${id}`); return found; }
}

export const chromecast = new ChromecastAPI();
