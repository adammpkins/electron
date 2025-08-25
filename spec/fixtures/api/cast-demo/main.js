const { app, BrowserWindow, ipcMain } = require('electron');
const { cast } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Cast event handlers
cast.on('device-discovered', (device) => {
  console.log('Cast device discovered:', device);
  if (mainWindow) {
    mainWindow.webContents.send('cast-device-discovered', device);
  }
});

cast.on('device-lost', (device) => {
  console.log('Cast device lost:', device);
  if (mainWindow) {
    mainWindow.webContents.send('cast-device-lost', device);
  }
});

cast.on('session-started', (session) => {
  console.log('Cast session started:', session);
  if (mainWindow) {
    mainWindow.webContents.send('cast-session-started', session);
  }
});

cast.on('session-ended', (session) => {
  console.log('Cast session ended:', session);
  if (mainWindow) {
    mainWindow.webContents.send('cast-session-ended', session);
  }
});

cast.on('error', (error) => {
  console.error('Cast error:', error);
  if (mainWindow) {
    mainWindow.webContents.send('cast-error', error);
  }
});

// IPC handlers for cast functionality
ipcMain.handle('cast-start-discovery', () => {
  cast.startDiscovery();
});

ipcMain.handle('cast-stop-discovery', () => {
  cast.stopDiscovery();
});

ipcMain.handle('cast-get-devices', () => {
  return cast.getDevices();
});

ipcMain.handle('cast-media', (event, deviceId, mediaUrl) => {
  cast.castMedia(deviceId, mediaUrl);
});

ipcMain.handle('cast-stop-casting', (event, sessionId) => {
  cast.stopCasting(sessionId);
});