// Assembles the game into dist/: copies the page files and fonts, and draws the app icons.
import { mkdirSync, copyFileSync, writeFileSync, rmSync, existsSync, cpSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { buildManifest } from './tools/manifest.mjs';

const OUT = 'dist';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/fonts`, { recursive: true });
mkdirSync(`${OUT}/icons`, { recursive: true });
for (const f of ['index.html', 'style.css', 'more.css', 'core.js', 'town.js', 'meta.js', 'art.js', 'more.js', 'play.js', 'sound.js', 'world.js', 'app.js', 'sw.js', 'manifest.webmanifest']) if (existsSync(f)) copyFileSync(f, `${OUT}/${f}`);

// PixelLab sprites: regenerate sprites/manifest.json from the folder, then copy it all
if (existsSync('sprites')) {
  writeFileSync('sprites/manifest.json', JSON.stringify(buildManifest(), null, 1) + '\n');
  cpSync('sprites', `${OUT}/sprites`, { recursive: true });
}

const fs = 'node_modules/@fontsource';
copyFileSync(`${fs}/pixelify-sans/files/pixelify-sans-latin-400-normal.woff2`, `${OUT}/fonts/pixelify-400.woff2`);
copyFileSync(`${fs}/pixelify-sans/files/pixelify-sans-latin-600-normal.woff2`, `${OUT}/fonts/pixelify-600.woff2`);
copyFileSync(`${fs}/barlow-semi-condensed/files/barlow-semi-condensed-latin-500-normal.woff2`, `${OUT}/fonts/barlow-500.woff2`);
copyFileSync(`${fs}/barlow-semi-condensed/files/barlow-semi-condensed-latin-700-normal.woff2`, `${OUT}/fonts/barlow-700.woff2`);

// ---- app icon: a pixel goblin face with a corrupted scanline
const FACE = [
  '................',
  'D..............D',
  'DD...GGGGGG...DD',
  '.DD.GGGGGGGG.DD.',
  '..DGGGGGGGGGGD..',
  '..GGKGGGGGGKGG..',
  '..GGGKGGGGKGGG..',
  '..GGYKGGGGKYGG..',
  '..GGGGGDDGGGGG..',
  '...GGGGGGGGGG...',
  '...GKWKKKKWKG...',
  '....GGGGGGGG....',
  '.....GGGGGG.....',
  '......DDDD......',
  '................',
  '................',
];
const COL = { G: '#7FA650', D: '#4E6E30', Y: '#F5E663', K: '#1C1814', W: '#F2EEDC' };
const P = 24, O = 64;
let rects = '';
FACE.forEach((row, y) => [...row].forEach((ch, x) => {
  if (COL[ch]) rects += `<rect x="${O + x * P}" y="${O + y * P}" width="${P}" height="${P}" fill="${COL[ch]}"/>`;
}));
// glitch: a shifted magenta slice through the eyes and a cyan one through the mouth
const slice = (row, dx, color, op) => [...FACE[row]].map((ch, x) => COL[ch] ? `<rect x="${O + (x + dx) * P}" y="${O + row * P}" width="${P}" height="${P / 2}" fill="${color}" opacity="${op}"/>` : '').join('');
rects += slice(7, 1, '#FF4F8B', 0.55) + slice(10, -1, '#7FE0F5', 0.45);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs><radialGradient id="bg" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#2E2618"/><stop offset="1" stop-color="#16130F"/></radialGradient></defs>
<rect width="512" height="512" fill="url(#bg)"/>${rects}
<rect x="96" y="424" width="80" height="8" fill="#FF4F8B" opacity="0.8"/><rect x="330" y="96" width="56" height="8" fill="#7FE0F5" opacity="0.7"/>
</svg>`;
writeFileSync(`${OUT}/icons/icon.svg`, svg);
for (const size of [512, 192]) writeFileSync(`${OUT}/icons/icon-${size}.png`, new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng());
console.log('Built', OUT);
