'use strict';

const dgram = require('dgram');
const EventEmitter = require('events');

const MDNS_ADDR = '224.0.0.251';
const MDNS_PORT = 5353;
const SERVICE = '_googlecast._tcp.local';

function writeName(name) {
  const parts = name.split('.');
  const bufs = [];
  for (const p of parts) {
    if (!p.length) continue;
    const b = Buffer.from(p, 'utf8');
    bufs.push(Buffer.from([b.length]), b);
  }
  bufs.push(Buffer.from([0]));
  return Buffer.concat(bufs);
}

function buildQuery(name) {
  const header = Buffer.alloc(12);
  header.writeUInt16BE(0, 0);
  header.writeUInt16BE(0, 2);
  header.writeUInt16BE(1, 4);
  header.writeUInt16BE(0, 6);
  header.writeUInt16BE(0, 8);
  header.writeUInt16BE(0, 10);
  const qname = writeName(name);
  const qtype = Buffer.alloc(2); qtype.writeUInt16BE(12, 0);
  const qclass = Buffer.alloc(2); qclass.writeUInt16BE(1, 0);
  return Buffer.concat([header, qname, qtype, qclass]);
}

function readName(buf, offset) {
  const labels = [];
  let pos = offset;
  let jumped = false;
  let jumpEnd = 0;

  while (true) {
    if (pos >= buf.length) return { name: labels.join('.'), bytes: pos - offset };
    const len = buf[pos];
    if (len === 0) { pos += 1; break; }
    if ((len & 0xC0) === 0xC0) {
      const b2 = buf[pos + 1];
      const ptr = ((len & 0x3F) << 8) | b2;
      if (!jumped) { jumpEnd = pos + 2; jumped = true; }
      const r = readName(buf, ptr);
      labels.push(r.name);
      pos = jumpEnd;
      break;
    } else {
      const label = buf.slice(pos + 1, pos + 1 + len).toString('utf8');
      labels.push(label);
      pos += 1 + len;
    }
  }
  return { name: labels.join('.'), bytes: jumped ? (jumpEnd - offset) : (pos - offset) };
}

function parseRR(buf, offset) {
  const nameRes = readName(buf, offset);
  let pos = offset + nameRes.bytes;
  const type = buf.readUInt16BE(pos); pos += 2;
  const cls = buf.readUInt16BE(pos); pos += 2;
  const ttl = buf.readUInt32BE(pos); pos += 4;
  const rdlen = buf.readUInt16BE(pos); pos += 2;
  const rdata = buf.slice(pos, pos + rdlen);
  pos += rdlen;

  let data = null;
  if (type === 12) { data = readName(buf, (pos - rdlen)).name || ''; }
  else if (type === 33) { const p = rdata.readUInt16BE(4); const target = readName(buf, (pos - rdlen + 6)).name; data = { port: p, target }; }
  else if (type === 16) {
    const entries = {};
    let i = 0;
    while (i < rdata.length) {
      const l = rdata[i++];
      const s = rdata.slice(i, i + l).toString('utf8');
      i += l;
      const eq = s.indexOf('=');
      if (eq > -1) entries[s.slice(0, eq)] = s.slice(eq + 1);
      else entries[s] = '';
    }
    data = entries;
  } else if (type === 1) { data = `${rdata[0]}.${rdata[1]}.${rdata[2]}.${rdata[3]}`; }
  else if (type === 28) { const parts = []; for (let i = 0; i < 16; i += 2) parts.push(rdata.readUInt16BE(i).toString(16)); data = parts.join(':'); }

  return { bytes: pos - offset, rr: { name: nameRes.name, type, cls, ttl, data } };
}

class ChromecastMDNSBrowser extends EventEmitter {
  constructor() {
    super();
    this.socket4 = null;
    this.devices = new Map();
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;

    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.socket4 = sock;

    sock.on('error', (err) => this.emit('error', err));

    sock.on('message', (msg) => { try { this._onMessage(msg); } catch (e) { } });

    sock.bind(0, () => {
      try { sock.addMembership(MDNS_ADDR); sock.setMulticastTTL(255); sock.setMulticastLoopback(true); } catch {}
      const sendQuery = () => {
        const query = buildQuery(`${SERVICE}.`);
        sock.send(query, 0, query.length, MDNS_PORT, MDNS_ADDR);
      };
      sendQuery();
      this._interval = setInterval(sendQuery, 5000);
    });
  }

  stop() { this.running = false; if (this._interval) clearInterval(this._interval); if (this.socket4) { try { this.socket4.close(); } catch {} this.socket4 = null; } }

  getDevices() { return Array.from(this.devices.values()); }

  _onMessage(buf) {
    if (buf.length < 12) return;
    const qd = buf.readUInt16BE(4);
    const an = buf.readUInt16BE(6);
    const ns = buf.readUInt16BE(8);
    const ar = buf.readUInt16BE(10);

    let pos = 12;
    for (let i = 0; i < qd; i++) { const qn = readName(buf, pos); pos += qn.bytes + 4; }

    const records = [];
    let total = an + ns + ar;
    for (let i = 0; i < total; i++) { const r = parseRR(buf, pos); pos += r.bytes; records.push(r.rr); }

    const ptrs = records.filter(r => r.type === 12 && r.name === `${SERVICE}.`);
    const srvs = records.filter(r => r.type === 33);
    const txts = records.filter(r => r.type === 16);
    const As = records.filter(r => r.type === 1);
    const AAAAs = records.filter(r => r.type === 28);

    for (const ptr of ptrs) {
      const instance = typeof ptr.data === 'string' ? ptr.data : '';
      if (!instance) continue;
      const srv = srvs.find(s => s.name === instance);
      const txt = txts.find(t => t.name === instance);
      if (!srv || !srv.data) continue;

      const host = srv.data.target.replace(/\.$/, '');
      const port = srv.data.port;
      const addrs = [];
      for (const a of As) if (a.name === `${host}.` && a.data) addrs.push(a.data);
      for (const a6 of AAAAs) if (a6.name === `${host}.` && a6.data) addrs.push(a6.data);

      const attrs = (txt && txt.data) || {};
      const id = attrs.id || instance;
      const name = attrs.fn || instance.replace(`.${SERVICE}.`, '');

      const device = { id, name, host, port, addresses: addrs, txt: attrs };
      this.devices.set(id, device);
      this.emit('device', device);
    }
  }
}

module.exports = { ChromecastMDNSBrowser };
