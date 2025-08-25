import { expect } from 'chai';
import { cast } from 'electron/main';

describe('Cast API', () => {
  afterEach(() => {
    cast.stopDiscovery();
  });

  describe('cast.startDiscovery()', () => {
    it('should start device discovery', () => {
      expect(() => cast.startDiscovery()).to.not.throw();
    });

    it('should throw error if discovery already active', () => {
      cast.startDiscovery();
      expect(() => cast.startDiscovery()).to.throw('Cast discovery is already active');
    });
  });

  describe('cast.stopDiscovery()', () => {
    it('should stop device discovery', () => {
      cast.startDiscovery();
      expect(() => cast.stopDiscovery()).to.not.throw();
    });

    it('should not throw if discovery not active', () => {
      expect(() => cast.stopDiscovery()).to.not.throw();
    });
  });

  describe('cast.getDevices()', () => {
    it('should return empty array initially', () => {
      const devices = cast.getDevices();
      expect(devices).to.be.an('array');
    });

    it('should return devices after discovery', (done) => {
      cast.on('device-discovered', () => {
        const devices = cast.getDevices();
        expect(devices).to.be.an('array');
        expect(devices.length).to.be.greaterThan(0);
        
        // Check device structure
        const device = devices[0];
        expect(device).to.have.property('id');
        expect(device).to.have.property('name');
        expect(device).to.have.property('type');
        expect(device).to.have.property('status');
        done();
      });
      cast.startDiscovery();
    });
  });

  describe('cast.castMedia()', () => {
    it('should throw error for empty device ID', () => {
      expect(() => cast.castMedia('', 'http://example.com/video.mp4')).to.throw();
    });

    it('should throw error for empty media URL', () => {
      expect(() => cast.castMedia('device_id', '')).to.throw();
    });

    it('should emit session-started event on successful cast', (done) => {
      cast.on('session-started', (session) => {
        expect(session).to.have.property('sessionId');
        expect(session).to.have.property('deviceId');
        expect(session.deviceId).to.equal('test_device');
        done();
      });
      cast.castMedia('test_device', 'http://example.com/video.mp4');
    });

    it('should support various media URLs', (done) => {
      const mediaUrls = [
        'http://example.com/video.mp4',
        'https://example.com/audio.mp3',
        'https://stream.example.com/playlist.m3u8'
      ];
      
      let sessionCount = 0;
      cast.on('session-started', (session) => {
        sessionCount++;
        if (sessionCount === mediaUrls.length) {
          done();
        }
      });
      
      mediaUrls.forEach((url, index) => {
        cast.castMedia(`device_${index}`, url);
      });
    });
  });

  describe('cast.stopCasting()', () => {
    it('should not throw for empty session ID', () => {
      expect(() => cast.stopCasting('')).to.not.throw();
    });

    it('should emit session-ended event', (done) => {
      cast.on('session-ended', (session) => {
        expect(session).to.have.property('sessionId');
        expect(session.sessionId).to.equal('test_session');
        done();
      });
      cast.stopCasting('test_session');
    });
  });

  describe('events', () => {
    it('should emit device-discovered event during discovery', (done) => {
      cast.on('device-discovered', (device) => {
        expect(device).to.have.property('deviceId');
        expect(device).to.have.property('deviceName');
        expect(device).to.have.property('deviceType');
        expect(device.deviceType).to.equal('chromecast');
        done();
      });
      cast.startDiscovery();
    });

    it('should handle multiple event listeners', (done) => {
      let listener1Called = false;
      let listener2Called = false;
      
      cast.on('device-discovered', () => {
        listener1Called = true;
        checkBothCalled();
      });
      
      cast.on('device-discovered', () => {
        listener2Called = true;
        checkBothCalled();
      });
      
      function checkBothCalled() {
        if (listener1Called && listener2Called) {
          done();
        }
      }
      
      cast.startDiscovery();
    });
  });

  describe('integration tests', () => {
    it('should handle complete cast workflow', (done) => {
      let deviceDiscovered = false;
      let sessionStarted = false;
      let sessionEnded = false;
      
      function checkWorkflowComplete() {
        if (deviceDiscovered && sessionStarted && sessionEnded) {
          done();
        }
      }
      
      cast.on('device-discovered', (device) => {
        deviceDiscovered = true;
        checkWorkflowComplete();
        
        // Cast media to discovered device
        cast.castMedia(device.deviceId, 'http://example.com/test.mp4');
      });
      
      cast.on('session-started', (session) => {
        sessionStarted = true;
        checkWorkflowComplete();
        
        // Stop the session
        cast.stopCasting(session.sessionId);
      });
      
      cast.on('session-ended', () => {
        sessionEnded = true;
        checkWorkflowComplete();
      });
      
      cast.startDiscovery();
    });
  });
});