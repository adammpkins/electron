import { EventEmitter } from 'events';

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

const { Cast } = process._linkedBinding('electron_browser_cast');

// Create a singleton instance
const castInstance = new Cast();

// Export the instance with proper typing
export interface Cast extends EventEmitter {
  // Events
  on(event: 'device-discovered', listener: (device: CastDevice) => void): this;
  on(event: 'device-lost', listener: (device: { deviceId: string }) => void): this;
  on(event: 'session-started', listener: (session: CastSession) => void): this;
  on(event: 'session-ended', listener: (session: { sessionId: string }) => void): this;
  on(event: 'error', listener: (error: { message: string }) => void): this;
  
  // Methods
  startDiscovery(): void;
  stopDiscovery(): void;
  getDevices(): CastDevice[];
  castMedia(deviceId: string, mediaUrl: string): void;
  stopCasting(sessionId: string): void;
}

export const cast = castInstance as Cast;
export default cast;