// Small PNG toolkit for the sprite pipeline (no dependencies; Node's zlib does the compression).
//   node tools/png.mjs bbox <file.png>                      -> opaque bounding box of a sprite
//   node tools/png.mjs horizon <file.png>                   -> guess the row where sky turns into ground
//   node tools/png.mjs guide <out.png> <w> <h> <horizon> <skyTop> <skyBottom> <hills> <ground>
//                                                           -> flat composition guide for img2img backgrounds
//   node tools/png.mjs sheet <out.png> <scale> <bg #hex> <files...>  -> contact sheet, feet aligned, for review
//   node tools/png.mjs flip <in.png> [out.png]                     -> mirror left-right (fix a sprite facing the wrong way)
//   node tools/png.mjs scene <out.png> <bg.png> <horizon> <hero.png|-> <enemy.png|-> [w h scale] -> battle scene mock-up
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };

export function decode(file) {
  const buf = readFileSync(file);
  let p = 8, w = 0, h = 0, depth = 0, ctype = 0, palette = null, trns = null;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; if (data[12]) throw new Error('interlaced PNG not supported'); }
    else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  if (depth !== 8) throw new Error(`bit depth ${depth} not supported`);
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = Buffer.alloc(w * h * 4), cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    raw.copy(cur, 0, y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      let v = cur[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, i = x * ch;
      if (ctype === 6) { out[o] = cur[i]; out[o + 1] = cur[i + 1]; out[o + 2] = cur[i + 2]; out[o + 3] = cur[i + 3]; }
      else if (ctype === 2) { out[o] = cur[i]; out[o + 1] = cur[i + 1]; out[o + 2] = cur[i + 2]; out[o + 3] = 255; }
      else if (ctype === 0) { out[o] = out[o + 1] = out[o + 2] = cur[i]; out[o + 3] = 255; }
      else if (ctype === 4) { out[o] = out[o + 1] = out[o + 2] = cur[i]; out[o + 3] = cur[i + 1]; }
      else { const k = cur[i]; out[o] = palette[k * 3]; out[o + 1] = palette[k * 3 + 1]; out[o + 2] = palette[k * 3 + 2]; out[o + 3] = trns && k < trns.length ? trns[k] : 255; }
    }
    cur.copy(prev);
  }
  return { w, h, data: out };
}

export function encode(file, w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

export function bbox(img) {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.data[(y * img.w + x) * 4 + 3] > 8) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// The horizon is the row with the biggest jump in average colour between the band above and the band below,
// searched in the middle 40-85% of the image.
export function horizon(img) {
  const rowAvg = [];
  for (let y = 0; y < img.h; y++) {
    let r = 0, g = 0, b = 0;
    for (let x = 0; x < img.w; x++) { const o = (y * img.w + x) * 4; r += img.data[o]; g += img.data[o + 1]; b += img.data[o + 2]; }
    rowAvg.push([r / img.w, g / img.w, b / img.w]);
  }
  const band = (a, b) => { const s = [0, 0, 0]; for (let y = a; y < b; y++) for (let k = 0; k < 3; k++) s[k] += rowAvg[y][k] / (b - a); return s; };
  let best = 0, at = Math.round(img.h * 0.65);
  for (let y = Math.round(img.h * 0.4); y < Math.round(img.h * 0.85); y++) {
    const up = band(Math.max(0, y - 6), y), dn = band(y, Math.min(img.h, y + 6));
    const d = Math.hypot(up[0] - dn[0], up[1] - dn[1], up[2] - dn[2]);
    if (d > best) { best = d; at = y; }
  }
  return { row: at, contrast: Math.round(best) };
}

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

function guide(out, w, h, hz, skyTop, skyBottom, hills, ground) {
  const data = Buffer.alloc(w * h * 4), A = hex(skyTop), B = hex(skyBottom), Hc = hex(hills), Gc = hex(ground);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    const hillTop = hz - 14 - Math.round(Math.sin(x * 0.03) * 8 + Math.sin(x * 0.08 + 1) * 4);
    let c;
    if (y >= hz) c = Gc; else if (y >= hillTop) c = Hc; else { const t = y / hz; c = A.map((v, k) => Math.round(v + (B[k] - v) * t)); }
    data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
  }
  encode(out, w, h, data);
}

function sheet(out, scale, bgc, files) {
  const imgs = files.map((f) => { const i = decode(f); return { i, b: bbox(i) || { x: 0, y: 0, w: i.w, h: i.h } }; });
  const pad = 4, cellW = Math.max(...imgs.map((o) => o.b.w)) + pad * 2, cellH = Math.max(...imgs.map((o) => o.b.h)) + pad * 2;
  const W = cellW * imgs.length * scale, H = cellH * scale, data = Buffer.alloc(W * H * 4), bgv = hex(bgc);
  for (let k = 0; k < W * H; k++) { data[k * 4] = bgv[0]; data[k * 4 + 1] = bgv[1]; data[k * 4 + 2] = bgv[2]; data[k * 4 + 3] = 255; }
  imgs.forEach(({ i, b }, n) => {
    const ox = n * cellW + Math.floor((cellW - b.w) / 2), oy = cellH - pad - b.h; // feet on a shared baseline
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const s = ((b.y + y) * i.w + b.x + x) * 4, a = i.data[s + 3] / 255;
      if (!a) continue;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const d = (((oy + y) * scale + dy) * W + (ox + x) * scale + dx) * 4;
        for (let c = 0; c < 3; c++) data[d + c] = Math.round(i.data[s + c] * a + data[d + c] * (1 - a));
      }
    }
  });
  encode(out, W, H, data);
}

// Mock the battle scene the way art.js lays it out: background ground line on the horizon (64% down),
// feet 42% of the way from the horizon to the bottom, hero at 57% across, enemy at 80%. Scaled up for viewing.
function scene(out, bgFile, hz, heroFile, enemyFile, W2 = 196, H2 = 196, scale = 3) {
  const bgI = decode(bgFile), data = Buffer.alloc(W2 * H2 * 4);
  const G = Math.round(H2 / 2 * 0.64) * 2, FY = G + Math.round((H2 / 2 - G / 2) * 0.42) * 2;
  const dx = Math.round((W2 - bgI.w) / 2), dy = G - hz;
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    let sy = y - dy, sx = x - dx; // mirror past the edges, like the game
    if (sy < 0) sy = -sy - 1; if (sy >= bgI.h) sy = 2 * bgI.h - sy - 1;
    if (sx < 0) sx = -sx - 1; if (sx >= bgI.w) sx = 2 * bgI.w - sx - 1;
    sy = Math.max(0, Math.min(bgI.h - 1, sy)); sx = Math.max(0, Math.min(bgI.w - 1, sx));
    bgI.data.copy(data, (y * W2 + x) * 4, (sy * bgI.w + sx) * 4, (sy * bgI.w + sx) * 4 + 4);
  }
  const put = (file, cx) => {
    if (!file || file === '-') return;
    const i = decode(file), b = bbox(i), ox = Math.round(cx - b.w / 2), oy = FY - b.h;
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const s = ((b.y + y) * i.w + b.x + x) * 4, a = i.data[s + 3] / 255, X = ox + x, Y = oy + y;
      if (!a || X < 0 || Y < 0 || X >= W2 || Y >= H2) continue;
      const d = (Y * W2 + X) * 4;
      for (let c = 0; c < 3; c++) data[d + c] = Math.round(i.data[s + c] * a + data[d + c] * (1 - a));
    }
  };
  put(heroFile, W2 * 0.57); put(enemyFile, W2 * 0.8);
  const big = Buffer.alloc(W2 * scale * H2 * scale * 4);
  for (let y = 0; y < H2 * scale; y++) for (let x = 0; x < W2 * scale; x++) data.copy(big, (y * W2 * scale + x) * 4, (Math.floor(y / scale) * W2 + Math.floor(x / scale)) * 4, (Math.floor(y / scale) * W2 + Math.floor(x / scale)) * 4 + 4);
  encode(out, W2 * scale, H2 * scale, big);
}

function flip(src, out) {
  const i = decode(src), d = Buffer.alloc(i.w * i.h * 4);
  for (let y = 0; y < i.h; y++) for (let x = 0; x < i.w; x++) i.data.copy(d, (y * i.w + x) * 4, (y * i.w + (i.w - 1 - x)) * 4, (y * i.w + (i.w - 1 - x)) * 4 + 4);
  encode(out, i.w, i.h, d);
}

const [cmd, ...a] = process.argv.slice(2);
if (cmd === 'scene') scene(a[0], a[1], +a[2], a[3], a[4], a[5] ? +a[5] : undefined, a[6] ? +a[6] : undefined, a[7] ? +a[7] : undefined);
else if (cmd === 'bbox') console.log(JSON.stringify(bbox(decode(a[0]))));
else if (cmd === 'horizon') { const i = decode(a[0]); console.log(JSON.stringify({ w: i.w, h: i.h, ...horizon(i) })); }
else if (cmd === 'guide') guide(a[0], +a[1], +a[2], +a[3], a[4], a[5], a[6], a[7]);
else if (cmd === 'sheet') sheet(a[0], +a[1], a[2], a.slice(3));
else if (cmd === 'flip') flip(a[0], a[1] || a[0]);
