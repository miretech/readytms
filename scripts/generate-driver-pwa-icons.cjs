#!/usr/bin/env node
/**
 * Generates the ReadyTMS Driver PWA icon set with no external deps.
 * Renders a white box-truck glyph on the app's brand-blue background,
 * supersampled 4x for antialiasing, then encodes PNG via built-in zlib.
 *
 * Run:  node scripts/generate-driver-pwa-icons.cjs
 */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const BLUE = [9, 80, 195]; // hsl(217 91% 40%) — app primary
const NAVY = [4, 28, 84]; // wheels
const WHITE = [255, 255, 255];

const OUT_DIR = path.resolve(__dirname, "..", "client", "public");

function rrectContains(px, py, x0, y0, x1, y1, r) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const cx = px < x0 + r ? x0 + r : px > x1 - r ? x1 - r : px;
  const cy = py < y0 + r ? y0 + r : py > y1 - r ? y1 - r : py;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}
function circ(px, py, cx, cy, rad) {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= rad * rad;
}

// Returns [r,g,b,a] for a normalized coordinate (0..1), or null (transparent).
function sample(u, v, opts) {
  const { bgRadius, scale } = opts;
  // background rounded square
  const inBg = rrectContains(u, v, 0, 0, 1, 1, bgRadius);

  // glyph coords: scale around center so maskable variants stay in safe zone
  const gu = (u - 0.5) / scale + 0.5;
  const gv = (v - 0.5) / scale + 0.5;

  // truck body = cargo box (left) + cab (right) + hood (lower right)
  const body =
    rrectContains(gu, gv, 0.17, 0.33, 0.55, 0.60, 0.025) || // cargo box
    rrectContains(gu, gv, 0.55, 0.41, 0.69, 0.60, 0.02) || // cab
    rrectContains(gu, gv, 0.69, 0.49, 0.77, 0.60, 0.02); // hood
  // cab window (cut back to blue)
  const window = rrectContains(gu, gv, 0.575, 0.435, 0.655, 0.505, 0.012);
  // wheels
  const wheelR = 0.058;
  const w1 = circ(gu, gv, 0.30, 0.615, wheelR);
  const w2 = circ(gu, gv, 0.66, 0.615, wheelR);
  const hubR = 0.022;
  const h1 = circ(gu, gv, 0.30, 0.615, hubR);
  const h2 = circ(gu, gv, 0.66, 0.615, hubR);

  if (h1 || h2) return [...WHITE, 255];
  if (w1 || w2) return [...NAVY, 255];
  if (body && !window) return [...WHITE, 255];
  if (inBg) return [...BLUE, 255];
  return null; // transparent corners
}

function renderPNG(size, opts) {
  const ss = 4; // supersample factor
  const S = size * ss;
  // accumulate downsampled RGBA
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (x * ss + sx + 0.5) / S;
          const v = (y * ss + sy + 0.5) / S;
          const c = sample(u, v, opts);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += c[3];
          }
        }
      }
      const n = ss * ss;
      const i = (y * size + x) * 4;
      // premultiplied-correct enough for opaque interior; edges blend to transparent
      out[i] = Math.round(r / n);
      out[i + 1] = Math.round(g / n);
      out[i + 2] = Math.round(b / n);
      out[i + 3] = Math.round(a / n);
    }
  }
  return encodePNG(size, size, out);
}

// --- minimal PNG encoder (RGBA, filter 0) ---
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const chunks = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr(w, h)),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ];
  return Buffer.concat(chunks);
}
function ihdr(w, h) {
  const b = Buffer.alloc(13);
  b.writeUInt32BE(w, 0);
  b.writeUInt32BE(h, 4);
  b[8] = 8; // bit depth
  b[9] = 6; // color type RGBA
  b[10] = 0;
  b[11] = 0;
  b[12] = 0;
  return b;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

const targets = [
  { file: "icon-192.png", size: 192, bgRadius: 0.22, scale: 1 },
  { file: "icon-512.png", size: 512, bgRadius: 0.22, scale: 1 },
  { file: "icon-maskable-512.png", size: 512, bgRadius: 0, scale: 0.78 },
  { file: "apple-touch-icon.png", size: 180, bgRadius: 0, scale: 1 }, // iOS masks corners itself
  { file: "favicon-32.png", size: 32, bgRadius: 0.22, scale: 1 },
  { file: "favicon-16.png", size: 16, bgRadius: 0.22, scale: 1 },
];

for (const t of targets) {
  const png = renderPNG(t.size, { bgRadius: t.bgRadius, scale: t.scale });
  fs.writeFileSync(path.join(OUT_DIR, t.file), png);
  console.log(`wrote ${t.file} (${t.size}x${t.size}, ${png.length} bytes)`);
}
console.log("done.");
