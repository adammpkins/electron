# chromecast

> Discover and connect to Chromecast devices from your Electron app.

Process: [Main](../glossary.md#main-process)

:::warning EXPERIMENTAL

This module is experimental and the API might change in future versions.

:::

The `chromecast` module provides the ability to discover and connect to Google Cast (Chromecast) devices on the local network. This module is only available in the main process.

## Events

### Event: 'device'

Returns:

* `device` ChromecastDevice - Information about the discovered device

Emitted when a new Chromecast device is discovered on the network or when an existing device's information is updated.

### Event: 'device-removed'

Returns:

* `device` ChromecastDevice - Information about the removed device  

Emitted when a Chromecast device is no longer available on the network.

## Methods

### `chromecast.startDiscovery()`

Starts discovering Chromecast devices on the local network using mDNS. Device discovery events will be emitted as devices are found.

### `chromecast.stopDiscovery()`

Stops the Chromecast device discovery process.

### `chromecast.getDevices()`

Returns `ChromecastDevice[]` - An array of currently discovered Chromecast devices.

### `chromecast.connect(deviceId)`

* `deviceId` string - The unique identifier of the device to connect to

Returns `Promise<void>` - Resolves when the connection is established.

Establishes a connection to the specified Chromecast device. This is required before attempting to cast media.

## Object Types

### ChromecastDevice

* `id` string - Unique identifier for the device
* `name` string - Human-readable name of the device
* `host` string - IP address of the device
* `port` number - Port number for the Cast protocol (typically 8009)
* `type` string - Type of Cast device (e.g., "Chromecast", "Chromecast Audio")

## Example

```javascript
const { chromecast } = require('electron')

// Listen for device discovery
chromecast.on('device', (device) => {
  console.log('Found Chromecast device:', device.name)
  console.log('Device details:', device)
})

// Start discovery
chromecast.startDiscovery()

// Get all discovered devices  
setTimeout(() => {
  const devices = chromecast.getDevices()
  console.log('All devices:', devices)
  
  // Connect to the first device
  if (devices.length > 0) {
    chromecast.connect(devices[0].id)
      .then(() => console.log('Connected successfully'))
      .catch(err => console.error('Connection failed:', err))
  }
}, 5000)

// Stop discovery when done
setTimeout(() => {
  chromecast.stopDiscovery()
}, 30000)
```

## Usage in Renderer Process

To use the chromecast API in a renderer process, you need to expose it through a preload script using the `contextBridge`:

**Preload script:**

```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  chromecast: {
    startDiscovery: () => ipcRenderer.invoke('chromecast:start-discovery'),
    stopDiscovery: () => ipcRenderer.invoke('chromecast:stop-discovery'),
    getDevices: () => ipcRenderer.invoke('chromecast:get-devices'),
    connect: (deviceId) => ipcRenderer.invoke('chromecast:connect', deviceId),
    onDevice: (callback) => ipcRenderer.on('chromecast:device', callback),
    removeAllListeners: () => ipcRenderer.removeAllListeners('chromecast:device')
  }
})
```

**Main process:**

```javascript
const { ipcMain, chromecast } = require('electron')

ipcMain.handle('chromecast:start-discovery', () => {
  chromecast.startDiscovery()
})

ipcMain.handle('chromecast:stop-discovery', () => {
  chromecast.stopDiscovery()
})

ipcMain.handle('chromecast:get-devices', () => {
  return chromecast.getDevices()
})

ipcMain.handle('chromecast:connect', (event, deviceId) => {
  return chromecast.connect(deviceId)
})

chromecast.on('device', (device) => {
  // Send to all renderer processes
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('chromecast:device', device)
  })
})
```

**Renderer process:**

```javascript
// Use the exposed API
window.electronAPI.chromecast.onDevice((event, device) => {
  console.log('Found device:', device)
})

window.electronAPI.chromecast.startDiscovery()
```

## Implementation Notes

This is an experimental implementation that provides basic Chromecast device discovery and connection establishment. For a complete media streaming solution, you would need to:

1. Implement the Cast protocol for media control
2. Handle authentication and session management  
3. Implement media streaming capabilities
4. Add support for different media types and formats

The current implementation focuses on device discovery and basic connection establishment as a foundation for building more advanced Cast functionality.