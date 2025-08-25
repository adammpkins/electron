import { expect } from 'chai';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';

describe('chromecast', () => {
  describe('module', () => {
    it('should be defined', () => {
      const { chromecast } = require('electron');
      expect(chromecast).to.not.be.undefined();
    });

    it('should have required methods', () => {
      const { chromecast } = require('electron');
      expect(chromecast.startDiscovery).to.be.a('function');
      expect(chromecast.stopDiscovery).to.be.a('function');
      expect(chromecast.getDevices).to.be.a('function');
      expect(chromecast.connect).to.be.a('function');
    });

    it('should discover devices when startDiscovery is called', async function () {
      this.timeout(5000);
      const { chromecast } = require('electron');
      
      // Start discovery
      chromecast.startDiscovery();
      
      // Wait for a device to be discovered
      const [device] = await once(chromecast, 'device');
      
      expect(device).to.have.property('id');
      expect(device).to.have.property('name');
      expect(device).to.have.property('host');
      expect(device).to.have.property('port');
      expect(device).to.have.property('type');
      
      // Stop discovery
      chromecast.stopDiscovery();
    });

    it('should return discovered devices via getDevices', async function () {
      this.timeout(5000);
      const { chromecast } = require('electron');
      
      chromecast.startDiscovery();
      
      // Wait for device discovery
      await once(chromecast, 'device');
      
      const devices = chromecast.getDevices();
      expect(devices).to.be.an('array');
      expect(devices.length).to.be.greaterThan(0);
      
      chromecast.stopDiscovery();
    });

    it('should connect to a discovered device', async function () {
      this.timeout(5000);
      const { chromecast } = require('electron');
      
      chromecast.startDiscovery();
      
      const [device] = await once(chromecast, 'device');
      
      // Should not throw
      await chromecast.connect(device.id);
      
      chromecast.stopDiscovery();
    });
  });
});