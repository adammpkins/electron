# Electron Cast Demo

This demo application showcases the Electron Cast API functionality for discovering and casting media to Chromecast devices.

## Features

- **Device Discovery**: Start and stop Cast device discovery on the local network
- **Device List**: View available Cast devices with details (name, ID, type, status)
- **Media Casting**: Cast media URLs to selected devices
- **Session Management**: Monitor and control active Cast sessions
- **Event Logging**: Real-time logging of Cast events and operations

## Running the Demo

To run this demo application:

1. Make sure you have built Electron with Cast support
2. Navigate to this directory
3. Run: `electron .`

## Usage

1. **Start Discovery**: Click "Start Discovery" to begin searching for Cast devices on your network
2. **View Devices**: Available devices will appear in the device list
3. **Cast Media**: Enter a media URL and click "Cast to Device" for any discovered device
4. **Monitor Sessions**: Active Cast sessions will appear in the sessions section
5. **Stop Casting**: Use the "Stop Casting" button to end active sessions

## Supported Media Types

- **Video**: MP4, WebM
- **Audio**: MP3, AAC, WAV
- **Streaming**: HLS, DASH

## Example Media URLs

The demo includes some pre-configured test URLs:
- Big Buck Bunny (MP4): https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
- Sample Audio: https://www.soundjay.com/misc/beep-07.wav

## Cast API Usage

This demo demonstrates the main Cast API methods:

```javascript
const { cast } = require('electron');

// Start device discovery
cast.startDiscovery();

// Listen for events
cast.on('device-discovered', (device) => {
  console.log('Found device:', device.name);
});

cast.on('session-started', (session) => {
  console.log('Cast session started:', session.sessionId);
});

// Cast media
cast.castMedia(deviceId, mediaUrl);
```

## Current Implementation

Note: This demo currently uses a mock implementation that simulates Cast device discovery and session management. In a production implementation, this would integrate with Chromium's actual Cast infrastructure.