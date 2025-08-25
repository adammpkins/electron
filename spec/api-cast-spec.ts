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
        done();
      });
      cast.castMedia('test_device', 'http://example.com/video.mp4');
    });
  });

  describe('cast.stopCasting()', () => {
    it('should not throw for empty session ID', () => {
      expect(() => cast.stopCasting('')).to.not.throw();
    });

    it('should emit session-ended event', (done) => {
      cast.on('session-ended', (session) => {
        expect(session).to.have.property('sessionId');
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
        done();
      });
      cast.startDiscovery();
    });
  });
});