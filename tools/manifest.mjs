// Writes sprites/manifest.json from what is in sprites/, so new art only has to be dropped into the right folder.
//   sprites/<id>/east.png, west.png, south.png   -> character facings
//   sprites/<id>/<anim>-<n>.png                  -> animation frames, e.g. goblin/attack-0.png ... -> "attack": [...]
//   sprites/bg/<region>.png + sprites/bg/horizons.json -> "bg-<region>": { "bg": ..., "horizon": n }
//   sprites/fx/<name>/manifest.json              -> "fx-<name>": { "pack": ... } (a PixelLab VFX Creator game pack)
// Run by build.mjs; also handy on its own: node tools/manifest.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';

export function buildManifest(dir = 'sprites') {
  const out = {};
  const byNum = (a, b) => a.localeCompare(b, 'en', { numeric: true });
  for (const id of readdirSync(dir).sort(byNum)) {
    const p = `${dir}/${id}`;
    if (!statSync(p).isDirectory()) continue;
    if (id === 'bg') {
      const hz = existsSync(`${p}/horizons.json`) ? JSON.parse(readFileSync(`${p}/horizons.json`, 'utf8')) : {};
      for (const f of readdirSync(p).filter((f) => f.endsWith('.png')).sort(byNum)) {
        const r = f.replace('.png', '');
        out[`bg-${r}`] = { bg: `${p}/${f}` };
        if (hz[r] != null) out[`bg-${r}`].horizon = hz[r];
      }
      continue;
    }
    if (id === 'fx') {
      for (const name of readdirSync(p).sort(byNum)) if (existsSync(`${p}/${name}/manifest.json`)) out[`fx-${name}`] = { pack: `${p}/${name}/manifest.json` };
      continue;
    }
    const entry = {};
    const files = readdirSync(p).filter((f) => f.endsWith('.png')).sort(byNum);
    for (const f of files) {
      const m = /^([a-z]+)-(\d+)\.png$/.exec(f);
      if (m) (entry[m[1]] = entry[m[1]] || []).push(`${p}/${f}`);
      else entry[f.replace('.png', '')] = `${p}/${f}`;
    }
    if (Object.keys(entry).length) out[id] = entry;
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('manifest.mjs')) {
  const m = buildManifest();
  writeFileSync('sprites/manifest.json', JSON.stringify(m, null, 1) + '\n');
  console.log(`sprites/manifest.json: ${Object.keys(m).length} entries`);
}
