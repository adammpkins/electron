'use strict';

const tls = require('tls');
const EventEmitter = require('events');
const { encodeCastMessage, decodeCastMessage } = require('./proto');

const NS_CONNECTION = 'urn:x-cast:com.google.cast.tp.connection';
const NS_HEARTBEAT = 'urn:x-cast:com.google.cast.tp.heartbeat';
const NS_RECEIVER = 'urn:x-cast:com.google.cast.receiver';
const NS_MEDIA = 'urn:x-cast:com.google.cast.media';

let globalRequestId = 1;
function nextRequestId() {
  return globalRequestId++;
}

class CastV2Client extends EventEmitter {
  constructor(host, port = 8009) {
    super();
    this.host = host;
    this.port = port;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.sourceId = 'sender-0';
    this.receiverId = 'receiver-0';
    this.transportId = null;
    this.heartbeatInterval = null;
    this.connected = false;
    this.sessionId = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const socket = tls.connect({
        host: this.host,
        port: this.port,
        rejectUnauthorized: false
      }, () => {
        this.socket = socket;
        this.connected = true;
        this._wire();
        this._hello();
        resolve();
      });

      socket.on('error', err => {
        this.emit('error', err);
        if (!this.connected) reject(err);
      });

      socket.on('close', () => {
        this.connected = false;
        this._clearHeartbeat();
        this.emit('close');
      });
    });
  }

  _wire() {
    this.socket.on('data', data => {
      this.buffer = Buffer.concat([this.buffer, data]);
      while (this.buffer.length >= 4) {
        const len = this.buffer.readUInt32BE(0);
        if (this.buffer.length < 4 + len) break;
        const messageBody = this.buffer.slice(4, 4 + len);
        this.buffer = this.buffer.slice(4 + len);
        try {
          const decoded = decodeCastMessage(messageBody);
          this._handleMessage(decoded);
        } catch (e) {
          this.emit('error', e);
        }
      }
    });
  }

  _send(namespace, destinationId, payload) {
    if (!this.socket) throw new Error('Not connected');
    const envelope = {
      sourceId: this.sourceId,
      destinationId,
      namespace,
      payloadUtf8: JSON.stringify(payload)
    };
    const buf = encodeCastMessage(envelope);
    this.socket.write(buf);
  }

  _hello() {
    this._send(NS_CONNECTION, this.receiverId, { type: 'CONNECT' });
    this._send(NS_HEARTBEAT, this.receiverId, { type: 'PING' });
    this.heartbeatInterval = setInterval(() => {
      try {
        this._send(NS_HEARTBEAT, this.receiverId, { type: 'PING' });
      } catch {}
    }, 5000);
  }

  _clearHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  _handleMessage({ namespace, payloadUtf8 }) {
    if (!payloadUtf8) return;
    let msg;
    try { msg = JSON.parse(payloadUtf8); } catch { return; }

    if (namespace === NS_HEARTBEAT) {
      if (msg.type === 'PING') {
        this._send(NS_HEARTBEAT, this.receiverId, { type: 'PONG' });
      }
      return;
    }

    if (namespace === NS_RECEIVER) {
      if (msg.type === 'RECEIVER_STATUS' && msg.status) {
        const app = (msg.status.applications || [])[0];
        if (app) {
          this.sessionId = app.sessionId;
          this.transportId = app.transportId || app.sessionId;
          this.emit('receiver-status', msg.status);
        }
      }
      return;
    }

    if (namespace === NS_MEDIA) {
      this.emit('media', msg);
      return;
    }
  }

  async launchDefaultMediaReceiver() {
    const requestId = nextRequestId();
    this._send(NS_RECEIVER, this.receiverId, {
      type: 'LAUNCH',
      requestId,
      appId: 'CC1AD845'
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('LAUNCH timeout')), 8000);
      const onStatus = (status) => {
        clearTimeout(timeout);
        this.off('receiver-status', onStatus);
        resolve();
      };
      this.on('receiver-status', onStatus);
    });

    if (!this.transportId) throw new Error('No transportId after launch');
    this._send(NS_CONNECTION, this.transportId, { type: 'CONNECT' });
  }

  async loadMedia({ contentId, contentType, streamType = 'BUFFERED', autoplay = true, metadata }) {
    if (!this.sessionId || !this.transportId) {
      await this.launchDefaultMediaReceiver();
    }
    const requestId = nextRequestId();
    const payload = {
      type: 'LOAD',
      requestId,
      sessionId: this.sessionId,
      media: { contentId, contentType, streamType, metadata },
      autoplay
    };
    this._send(NS_MEDIA, this.transportId, payload);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('LOAD timeout')), 10000);
      const onMedia = (msg) => {
        if (msg.type === 'MEDIA_STATUS') {
          clearTimeout(timeout);
          this.off('media', onMedia);
          resolve();
        }
      };
      this.on('media', onMedia);
    });
  }

  _mediaCommand(type, params = {}) {
    const requestId = nextRequestId();
    const payload = Object.assign({ type, requestId, mediaSessionId: params.mediaSessionId }, params.extra || {});
    this._send(NS_MEDIA, this.transportId || this.receiverId, payload);
  }

  play(mediaSessionId) { this._mediaCommand('PLAY', { mediaSessionId }); }
  pause(mediaSessionId) { this._mediaCommand('PAUSE', { mediaSessionId }); }
  stop(mediaSessionId) { this._mediaCommand('STOP', { mediaSessionId }); }
  seek(mediaSessionId, seconds) { this._mediaCommand('SEEK', { mediaSessionId, extra: { currentTime: seconds } }); }

  close() {
    try { if (this.transportId) { this._send(NS_CONNECTION, this.transportId, { type: 'CLOSE' }); } this._send(NS_CONNECTION, this.receiverId, { type: 'CLOSE' }); } catch {}
    this._clearHeartbeat();
    if (this.socket) this.socket.end();
  }
}

module.exports = { CastV2Client };
