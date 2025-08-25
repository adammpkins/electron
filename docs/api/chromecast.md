# Chromecast (Experimental)

Experimental Chromecast sender API for Electron apps. This module enables discovery of Chromecast devices on the local network, connecting to a device, and casting media via the Default Media Receiver.

Status: Experimental. API may change without notice. Disabled by default; you must call `chromecast.enable()` in the main process before using.

## Usage (Main process)

```js
const { app, chromecast } = require('electron');

app.whenReady().then(async () => {
  chromecast.enable();
  chromecast.startDiscovery();

  chromecast.on('device', (device) => {
    console.log('Found device:', device.name, device.id);
  });
});
```

## Usage (Renderer via IPC)

For security, expose a limited API via `contextBridge` in your preload:

```js
// preload.js
const { contextBridge } = require('electron');
const { chromecastRenderer } = require('electron/lib/renderer/api/chromecast');

contextBridge.exposeInMainWorld('chromecast', {
  enable: () => chromecastRenderer.enable(),
  startDiscovery: () => chromecastRenderer.startDiscovery(),
  stopDiscovery: () => chromecastRenderer.stopDiscovery(),
  getDevices: () => chromecastRenderer.getDevices(),
  connect: (deviceId) => chromecastRenderer.connect(deviceId),
  castMedia: (sessionId, params) => chromecastRenderer.castMedia(sessionId, params),
  play: (sessionId) => chromecastRenderer.play(sessionId),
  pause: (sessionId) => chromecastRenderer.pause(sessionId),
  stop: (sessionId) => chromecastRenderer.stop(sessionId),
  seek: (sessionId, seconds) => chromecastRenderer.seek(sessionId, seconds),
  disconnect: (sessionId) => chromecastRenderer.disconnect(sessionId),
  bindEvents: () => chromecastRenderer.bindEvents()
});
```

Then in your webpage:

```js
await window.chromecast.enable();
await window.chromecast.startDiscovery();
const devices = await window.chromecast.getDevices();
const sessionId = await window.chromecast.connect(devices[0].id);
await window.chromecast.castMedia(sessionId, {
  contentId: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  contentType: 'video/mp4'
});
```

## API

- chromecast.enable(): void
- chromecast.startDiscovery(): void
- chromecast.stopDiscovery(): void
- chromecast.getDevices(): Device[]
- chromecast.connect(deviceId): Promise<sessionId>
- chromecast.castMedia(sessionId, { contentId, contentType, streamType?, metadata?, autoplay? }): Promise<void>
- chromecast.play(sessionId): void
- chromecast.pause(sessionId): void
- chromecast.seek(sessionId, seconds): void
- chromecast.stop(sessionId): void
- chromecast.disconnect(sessionId): void
- Events:
  - 'device' (device)
  - 'media' ({ sessionId, message })

## Limitations

- Local network required; firewalls may block discovery or TLS control channel (port 8009).
- DRM-protected content is not supported.
- Supported media formats depend on Chromecast.
- This is a minimal sender; advanced features (queues, tracks, volume control) are out of scope for the initial version.
