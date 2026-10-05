import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Minimal PNG writer using pure Node.js zlib
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, pixelFn) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width(4), height(4), bit depth(1=8), color type(1=6 RGBA), compression(1=0), filter(1=0), interlace(1=0)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    scanlines[pos++] = 0; // filter byte: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      scanlines[pos++] = r;
      scanlines[pos++] = g;
      scanlines[pos++] = b;
      scanlines[pos++] = a;
    }
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw Halagel branded app icon:
// Emerald green (#588517) rounded squircle / background, golden-white Halagel ring and checkmark/H emblem
function halagelIconPixel(x, y, width, height, isMaskable = false) {
  const cx = width / 2;
  const cy = height / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background gradient from #64941E (top left) to #436611 (bottom right)
  const gradT = (x + y) / (width + height);
  const rBg = Math.round(100 * (1 - gradT) + 67 * gradT);
  const gBg = Math.round(148 * (1 - gradT) + 102 * gradT);
  const bBg = Math.round(30 * (1 - gradT) + 17 * gradT);

  if (isMaskable) {
    // For maskable, entire canvas has background
    // Inner emblem scaled to safe zone (within 80% circle)
    const scale = width / 512;
    const emblemRadius = 160 * scale;
    if (dist < emblemRadius + 2 && dist > emblemRadius - 16 * scale) {
      // Golden orbit ring
      return [255, 230, 140, 255];
    }
    // Center white rounded box with H letter
    const boxHalf = 70 * scale;
    if (Math.abs(dx) <= boxHalf && Math.abs(dy) <= boxHalf) {
      // Inside white emblem box
      // Let's draw green 'H' inside
      const hScale = scale * 1.2;
      const insideH = (Math.abs(dx) >= 20 * hScale && Math.abs(dx) <= 45 * hScale && Math.abs(dy) <= 45 * hScale) ||
                      (Math.abs(dx) <= 45 * hScale && Math.abs(dy) <= 12 * hScale);
      if (insideH) {
        return [88, 133, 23, 255];
      }
      return [255, 255, 255, 255];
    }
    return [rBg, gBg, bBg, 255];
  }

  // Non-maskable: squircle rounded rectangle
  const cornerRadius = width * 0.22;
  const clampedX = Math.max(Math.abs(dx) - (width / 2 - cornerRadius), 0);
  const clampedY = Math.max(Math.abs(dy) - (height / 2 - cornerRadius), 0);
  const cornerDist = Math.sqrt(clampedX * clampedX + clampedY * clampedY);

  if (cornerDist > cornerRadius) {
    // Outside icon shape (transparent)
    return [0, 0, 0, 0];
  }

  // Inner emblem
  const scale = width / 512;
  const emblemRadius = 150 * scale;
  if (dist < emblemRadius + 2 && dist > emblemRadius - 14 * scale) {
    // Golden orbit ring
    return [255, 235, 150, 255];
  }

  // Center white box
  const boxHalf = 65 * scale;
  if (Math.abs(dx) <= boxHalf && Math.abs(dy) <= boxHalf) {
    const hScale = scale * 1.1;
    const insideH = (Math.abs(dx) >= 18 * hScale && Math.abs(dx) <= 40 * hScale && Math.abs(dy) <= 40 * hScale) ||
                    (Math.abs(dx) <= 40 * hScale && Math.abs(dy) <= 10 * hScale);
    if (insideH) {
      return [88, 133, 23, 255];
    }
    return [255, 255, 255, 255];
  }

  return [rBg, gBg, bBg, 255];
}

const publicDir = path.resolve('public');

// Generate 192x192
const pwa192 = createPng(192, 192, (x, y, w, h) => halagelIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

// Generate 512x512
const pwa512 = createPng(512, 512, (x, y, w, h) => halagelIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

// Generate 512x512 maskable (full bleed safe zone margin)
const pwaMaskable = createPng(512, 512, (x, y, w, h) => halagelIconPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);

// Generate apple-touch-icon 180x180
const appleTouchIcon = createPng(180, 180, (x, y, w, h) => halagelIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);

console.log('PWA PNG icons generated successfully!');
