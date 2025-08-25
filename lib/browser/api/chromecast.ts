import { EventEmitter } from 'events';

const {
  createChromecast
} = process._linkedBinding('electron_browser_chromecast');

interface ChromecastDevice {
  id: string;
  name: string;
  host: string;
  port: number;
  type: string;
}

class Chromecast extends EventEmitter {
  private nativeInstance: any = null;
  private devices: Map<string, ChromecastDevice> = new Map();
  private discovering = false;

  constructor() {
    super();
    
    // Initialize the native chromecast instance when first listener is added
    this.once('newListener', () => {
      this.nativeInstance = createChromecast();
      this.nativeInstance.emit = this.emit.bind(this);
    });
  }

  startDiscovery(): void {
    if (this.discovering) {
      return;
    }
    
    if (!this.nativeInstance) {
      this.nativeInstance = createChromecast();
      this.nativeInstance.emit = this.emit.bind(this);
    }
    
    this.discovering = true;
    this.nativeInstance.startDiscovery();
  }

  stopDiscovery(): void {
    if (!this.discovering || !this.nativeInstance) {
      return;
    }
    
    this.discovering = false;
    this.nativeInstance.stopDiscovery();
  }

  getDevices(): ChromecastDevice[] {
    return Array.from(this.devices.values());
  }

  async connect(deviceId: string): Promise<void> {
    if (!this.nativeInstance) {
      throw new Error('Chromecast not initialized');
    }
    
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device with id ${deviceId} not found`);
    }
    
    return this.nativeInstance.connect(deviceId);
  }

  // Internal method called by native layer when device is discovered
  _addDevice(device: ChromecastDevice): void {
    this.devices.set(device.id, device);
    this.emit('device', device);
  }

  // Internal method called by native layer when device is removed  
  _removeDevice(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      this.devices.delete(deviceId);
      this.emit('device-removed', device);
    }
  }
}

module.exports = new Chromecast();