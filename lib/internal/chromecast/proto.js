'use strict';

const PROTOCOL_VERSION = 0; // CASTV2_1_0
const PAYLOAD_TYPE_STRING = 0; // STRING
const TAG = (fieldNumber, wireType) => (fieldNumber << 3) | wireType;

function encodeVarint(num) {
  const parts = [];
  let n = num >>> 0;
  while (n >= 0x80) {
    parts.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  parts.push(n);
  return Buffer.from(parts);
}

function encodeString(fieldNumber, str) {
  const strBuf = Buffer.from(str, 'utf8');
  const tag = Buffer.from([TAG(fieldNumber, 2)]); // 2 = length-delimited
  const len = encodeVarint(strBuf.length);
  return Buffer.concat([tag, len, strBuf]);
}

function encodeEnum(fieldNumber, value) {
  const tag = Buffer.from([TAG(fieldNumber, 0)]); // 0 = varint
  const val = encodeVarint(value);
  return Buffer.concat([tag, val]);
}

function encodeCastMessage({ sourceId, destinationId, namespace, payloadUtf8 }) {
  const payloadType = PAYLOAD_TYPE_STRING;

  const chunks = [];
  chunks.push(encodeEnum(1, PROTOCOL_VERSION));
  chunks.push(encodeString(2, sourceId));
  chunks.push(encodeString(3, destinationId));
  chunks.push(encodeString(4, namespace));
  chunks.push(encodeEnum(5, payloadType));
  chunks.push(encodeString(6, payloadUtf8));

  const body = Buffer.concat(chunks);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(body.length, 0);
  return Buffer.concat([lenBuf, body]);
}

function decodeVarint(buf, offset) {
  let res = 0;
  let shift = 0;
  let pos = offset;
  while (pos < buf.length) {
    const b = buf[pos++];
    res |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return { value: res >>> 0, bytes: pos - offset };
}

function decodeString(buf, offset) {
  const { value: len, bytes: lenBytes } = decodeVarint(buf, offset);
  const start = offset + lenBytes;
  const end = start + len;
  return { value: buf.slice(start, end).toString('utf8'), bytes: lenBytes + len };
}

function decodeCastMessage(buffer) {
  let pos = 0;
  const out = { protocolVersion: 0, sourceId: '', destinationId: '', namespace: '', payloadUtf8: '' };

  while (pos < buffer.length) {
    const tag = buffer[pos++];
    const field = tag >> 3;
    const wire = tag & 0x7;

    if (wire === 0) {
      const { value, bytes } = decodeVarint(buffer, pos);
      pos += bytes;
      if (field === 1) out.protocolVersion = value;
    } else if (wire === 2) {
      if (field === 2) {
        const { value, bytes } = decodeString(buffer, pos);
        out.sourceId = value;
        pos += bytes;
      } else if (field === 3) {
        const { value, bytes } = decodeString(buffer, pos);
        out.destinationId = value;
        pos += bytes;
      } else if (field === 4) {
        const { value, bytes } = decodeString(buffer, pos);
        out.namespace = value;
        pos += bytes;
      } else if (field === 6) {
        const { value, bytes } = decodeString(buffer, pos);
        out.payloadUtf8 = value;
        pos += bytes;
      } else {
        const { value: len, bytes: lenBytes } = decodeVarint(buffer, pos);
        pos += lenBytes + len;
      }
    } else {
      break;
    }
  }

  return out;
}

module.exports = {
  encodeCastMessage,
  decodeCastMessage
};
