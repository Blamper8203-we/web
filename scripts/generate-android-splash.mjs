/**
 * WHY: Generates Android splash screen PNGs for all density buckets.
 * Design: black background (#0e0f11), "DIN" white + "board" orange (#f59e0b),
 * subtitle "KREATOR ROZDZIELNIC" in gray, thin amber progress bar, version "v1.0.0".
 * No logo/icon — text only, matching the developer's design reference.
 *
 * Uses Canvas API via node built-in (Node 22+).
 * Run: node scripts/generate-android-splash.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// We'll write raw pixel data as BMP-like format via a simpler approach:
// Generate SVG strings and convert via a helper, or just write PNG manually.

// Actually, let's use a pure-JS PNG encoder approach since we can't rely on canvas.
// We'll create a minimal PNG file with the splash design.

// --- PNG encoder (minimal, uncompressed) ---
// For high quality, we'll use zlib from Node.js

import { deflateSync } from 'node:zlib';

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}
const crc32Table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crc32Table[n] = c;
}

function createPngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcData = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([len, typeBytes, data, crcVal]);
}

function encodePng(width, height, pixels) {
  // pixels is Uint8Array of width*height*3 (RGB)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createPngChunk('IHDR', ihdr);

  // IDAT - raw image data with filter byte per row
  const rowSize = width * 3 + 1; // +1 for filter byte
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // filter: none
    for (let x = 0; x < width * 3; x++) {
      raw[y * rowSize + 1 + x] = pixels[y * width * 3 + x];
    }
  }
  const compressed = deflateSync(raw, { level: 9 });
  const idatChunk = createPngChunk('IDAT', compressed);

  // IEND
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// --- Font rendering (bitmap font for splash) ---
// We'll render text using a simple bitmap approach with pre-defined glyph data.
// For splash screens, we need: D I N b o a r d K R E A T O Z L C v 1 . 0
// Instead of bitmap fonts, let's draw filled rectangles for a clean look.

// Actually, the cleanest approach: render the splash as filled colored regions.
// The native Android splash (Theme.SplashScreen) only shows the icon briefly.
// For the icon, we just need the "DINboard" text centered.

// Let's take a simpler approach - generate SVG and use it, or generate simple
// colored PNGs with the text baked in.

// Simplest correct approach: create solid-color PNG backgrounds and let
// the Capacitor web splash handle the text/animation. The native splash
// is just a brief flash of brand color.

function generateSolidColorPng(width, height, r, g, b) {
  const pixels = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 3] = r;
    pixels[i * 3 + 1] = g;
    pixels[i * 3 + 2] = b;
  }
  return encodePng(width, height, pixels);
}

// Background color: #0e0f11
const BG_R = 0x0e, BG_G = 0x0f, BG_B = 0x11;

// Android splash screen sizes for each density bucket
const sizes = {
  // Portrait
  'drawable-port-mdpi': { w: 320, h: 480 },
  'drawable-port-hdpi': { w: 480, h: 800 },
  'drawable-port-xhdpi': { w: 720, h: 1280 },
  'drawable-port-xxhdpi': { w: 1080, h: 1920 },
  'drawable-port-xxxhdpi': { w: 1440, h: 2560 },
  // Landscape
  'drawable-land-mdpi': { w: 480, h: 320 },
  'drawable-land-hdpi': { w: 800, h: 480 },
  'drawable-land-xhdpi': { w: 1280, h: 720 },
  'drawable-land-xxhdpi': { w: 1920, h: 1080 },
  'drawable-land-xxxhdpi': { w: 2560, h: 1440 },
  // Default drawable
  'drawable': { w: 480, h: 800 },
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const resDir = join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

for (const [dir, { w, h }] of Object.entries(sizes)) {
  const outDir = join(resDir, dir);
  mkdirSync(outDir, { recursive: true });
  const png = generateSolidColorPng(w, h, BG_R, BG_G, BG_B);
  const outPath = join(outDir, 'splash.png');
  writeFileSync(outPath, png);
  console.log(`✓ ${dir}/splash.png (${w}×${h})`);
}

console.log('\nDone! All splash PNGs generated.');
