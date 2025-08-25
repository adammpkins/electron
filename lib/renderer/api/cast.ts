import { getIPCRenderer } from '@electron/internal/renderer/ipc-renderer-bindings';

const ipc = getIPCRenderer();

interface CastDevice {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface CastSession {
  sessionId: string;
  deviceId: string;
}

/**
 * Renderer-side Cast API for web content
 * This provides a simplified interface for cast operations from web pages
 */
class RendererCast {
  /**
   * Request to start Cast device discovery
   */
  async startDiscovery(): Promise<void> {
    return ipc.invoke(false, 'ELECTRON_BROWSER_CAST_START_DISCOVERY', []);
  }

  /**
   * Request to stop Cast device discovery
   */
  async stopDiscovery(): Promise<void> {
    return ipc.invoke(false, 'ELECTRON_BROWSER_CAST_STOP_DISCOVERY', []);
  }

  /**
   * Get list of discovered Cast devices
   */
  async getDevices(): Promise<CastDevice[]> {
    return ipc.invoke(false, 'ELECTRON_BROWSER_CAST_GET_DEVICES', []);
  }

  /**
   * Cast media to a specific device
   */
  async castMedia(deviceId: string, mediaUrl: string): Promise<void> {
    return ipc.invoke(false, 'ELECTRON_BROWSER_CAST_MEDIA', [deviceId, mediaUrl]);
  }

  /**
   * Stop a Cast session
   */
  async stopCasting(sessionId: string): Promise<void> {
    return ipc.invoke(false, 'ELECTRON_BROWSER_CAST_STOP', [sessionId]);
  }

  /**
   * Listen for Cast events
   */
  on(event: string, listener: (...args: any[]) => void): void {
    ipc.on(event, listener);
  }

  /**
   * Remove Cast event listener
   */
  off(event: string, listener: (...args: any[]) => void): void {
    ipc.removeListener(event, listener);
  }
}

export default new RendererCast();