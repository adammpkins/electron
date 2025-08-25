# cast

> Google Cast (Chromecast) API for Electron applications

Process: [Main](../glossary.md#main-process)

The `cast` module provides an interface for discovering and casting media to Google Cast devices (Chromecast) on the local network.

```javascript
const { cast } = require('electron')
```

## Events

The `cast` object emits the following events:

### Event: 'device-discovered'

Returns:

* `device` Object
  * `deviceId` string - Unique identifier for the Cast device
  * `deviceName` string - Human-readable name of the device
  * `deviceType` string - Type of the device (e.g., 'chromecast')

Emitted when a new Cast device is discovered on the network during device discovery.

### Event: 'device-lost'

Returns:

* `device` Object
  * `deviceId` string - Unique identifier for the Cast device that was lost

Emitted when a previously discovered Cast device is no longer available on the network.

### Event: 'session-started'

Returns:

* `session` Object
  * `sessionId` string - Unique identifier for the Cast session
  * `deviceId` string - Device ID where the session was started

Emitted when a Cast session is successfully started on a device.

### Event: 'session-ended'

Returns:

* `session` Object
  * `sessionId` string - Unique identifier for the Cast session that ended

Emitted when a Cast session ends (either stopped manually or due to an error).

### Event: 'error'

Returns:

* `error` Object
  * `message` string - Error description

Emitted when an error occurs during casting operations.

## Methods

### `cast.startDiscovery()`

Starts discovering Cast devices on the local network. This will emit `device-discovered` events as devices are found.

**Note:** Only one discovery session can be active at a time. Calling this method while discovery is already active will throw an error.

### `cast.stopDiscovery()`

Stops the active device discovery session. No more `device-discovered` events will be emitted until discovery is started again.

### `cast.getDevices()`

Returns `CastDevice[]` - An array of currently discovered Cast devices.

Each `CastDevice` object has the following structure:

* `id` string - Unique device identifier
* `name` string - Device display name
* `type` string - Device type (e.g., 'chromecast')
* `status` string - Current device status ('available', 'busy', etc.)

### `cast.castMedia(deviceId, mediaUrl)`

* `deviceId` string - The ID of the target Cast device
* `mediaUrl` string - URL of the media to cast

Starts casting the specified media URL to the target device. This will emit a `session-started` event if successful.

**Supported Media Types:**
* Video: MP4, WebM
* Audio: MP3, AAC, WAV
* Streaming: HLS, DASH

### `cast.stopCasting(sessionId)`

* `sessionId` string - The ID of the Cast session to stop

Stops the specified Cast session. This will emit a `session-ended` event.

## Usage Example

```javascript
const { app, BrowserWindow, ipcMain } = require('electron')
const { cast } = require('electron')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(createWindow)

// Listen for Cast events
cast.on('device-discovered', (device) => {
  console.log('Found Cast device:', device.deviceName)
  // Notify renderer process
  mainWindow.webContents.send('cast-device-found', device)
})

cast.on('session-started', (session) => {
  console.log('Cast session started:', session.sessionId)
})

cast.on('error', (error) => {
  console.error('Cast error:', error.message)
})

// IPC handlers for renderer process
ipcMain.handle('start-cast-discovery', () => {
  cast.startDiscovery()
})

ipcMain.handle('cast-video', async (event, deviceId, videoUrl) => {
  cast.castMedia(deviceId, videoUrl)
})

// Start discovery when app is ready
app.whenReady().then(() => {
  cast.startDiscovery()
})
```

## Platform Support

| Platform | Support | Notes |
|----------|---------|-------|
| Windows  | ✅      | Full support |
| macOS    | ✅      | Full support |
| Linux    | ✅      | Full support |

## Security Considerations

* Cast discovery uses mDNS/DNS-SD which broadcasts on the local network
* Media URLs are sent directly to Cast devices and may be visible in network traffic
* Ensure media URLs are accessible from the Cast device's network location
* Consider using HTTPS URLs for secure media delivery

## Limitations

* Only supports casting media URLs, not local files directly
* Cast device must be on the same local network as the Electron app
* Some advanced Cast features (like custom receiver apps) are not yet supported
* Media format support depends on the target Cast device capabilities

## Related APIs

* [webContents.executeJavaScript()](web-contents.md#contentsexecutejavascriptcode-usergesture) - For web-based Cast sender APIs
* [dialog.showOpenDialog()](dialog.md#dialogshowopendialogbrowserwindow-options) - For selecting local media files
* [net.request()](net.md#netrequest) - For validating media URLs before casting