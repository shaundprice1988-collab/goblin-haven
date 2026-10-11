# Goblin Haven

An incremental (idle) phone game, built as an installable web app (PWA). Shaun's project.

**Premise:** an MMO player gets corrupted into a starter-zone goblin. You defend your village (Mudhollow) from adventurers, grow a warband and a goblin town, evolve along a D&D-style monster tree (goblin → hobgoblin, bugbear, orc, ogre, troll and more), conquer regions, and eventually take the whole MMO. "Rollbacks" are the prestige loop. The game's UI talks like an MMO "System" window, and the humour is MMO satire.

- Live: https://goblin-haven.vercel.app (Vercel project `goblin-haven`, id `prj_6LDrZ56kIFtJtarcweuh3JbzGFAM`)
- Last deploy: wave 3 (service worker `goblinhaven-v6`), 11 Oct 2026, prod deployment `dpl_27R2DT6N7rwZjmj9BeFWBv1uUZMk`
- History: `docs/build-log.md`. Feature research that drove waves 1–3: `docs/feature-gaps-report.md` (all 16 items are built)
- This folder was handed over from a Claude chat session that built waves 1–3. It is not a git repo yet: run `git init` and commit before making big changes.

## Run it locally

```
npm install
npm run build          # copies the source into dist/, generates icons, copies fonts
npx serve dist -l 8770 # or: python -m http.server 8770 -d dist
```

`dist/` is a copy. Rebuild after every edit. If you're testing with the service worker active, hard-reload or clear site data, because it caches aggressively.

## Code map

Vanilla JS with no framework and no bundler. Plain `<script>` tags in `index.html`, and **the order matters**:
`core.js → town.js → meta.js → art.js → more.js → play.js → sound.js → world.js → app.js`

| File | What it holds |
|---|---|
| core.js | Game data and formulas: `FORM` (evolution forms + their `look`), `UNITS`, `UPGRADES`, regions, `K` balance constants, shard/rollback math (`runGain`, `shardPct`) |
| town.js | Town sim: jobs, buildings (`BUILD`), research, seasons, edicts, expeditions, `fixTown` save migration |
| meta.js | Event bus (`GH.on`, `GH.emit`, `GH.ask`) and meta systems: feats, exploit tree (EP), relics, corruption, date events, server wipe, `fixMeta` migration |
| art.js | **All the art.** Procedural pixel art drawn with canvas code. Exports `window.GHArt` |
| more.js | UI for wave 1 systems (save export/import, raid log, patch notes, exploit tree, feats) |
| play.js | Wave 2: dirty tricks, raid variety, world chat, data logs, endings, hardcore servers |
| sound.js | WebAudio sfx and a chiptune loop (off by default) |
| world.js | Wave 3 UI: Town Hall tab (seasons, edicts, expeditions), data leeches, relic cache, events, portal, server wipe, daily boss bonus |
| app.js | State, game loop, rendering of panels, save/load, offline earnings. Emits `'init'` with the internal API object. `window.__gh` is a test hook |
| sw.js | Service worker (cache-first). `VERSION` string + `FILES` list |
| build.mjs | Build script: copies files to `dist/`, renders icons with resvg |
| sim/ | Balance simulators, e.g. `node sim/sim.mjs 40 casual` |

Event bus notes: `GH.emit(ev, a, b, c)` passes at most 3 args. `GH.ask(ev, …)` returns the first listener result that isn't null or false. Features hook in through events instead of editing app.js where possible.

## Rules that keep players' saves safe

- The save lives in localStorage as `goblinhaven.save.v1`, with a rolling backup `goblinhaven.backup.v1`.
- Any new state field must be filled in for old saves: `fixMeta` (meta.js), `fixTown` (town.js), or the load path in app.js. Never rename or repurpose an existing field.
- Every deploy: bump `VERSION` in `sw.js` (next is `goblinhaven-v7`), and add any new file to **both** `FILES` in sw.js and the copy list in build.mjs. Otherwise installed players get stale or missing files.

## Deploy

With the Vercel CLI from this folder:

```
npm i -g vercel
vercel login
vercel link      # choose the existing project "goblin-haven"
vercel           # preview deploy. Previews are behind Vercel login (SSO protection)
vercel --prod    # production → goblin-haven.vercel.app
```

The project's build settings on Vercel already run the build into `dist/`. `.vercelignore` keeps tests, docs and sims out of the upload.

## Tests

- **Logic (Node):** `node tests/w3/w3smoke.cjs` and `node tests/w2/smoke.cjs`. They load core/town/meta into Node and check migrations, relics, events and similar. Look for `FAIL` lines.
- **Browser (Python Playwright):** `pip install playwright` then `python -m playwright install chromium`. Build, serve `dist` on a port, then run e.g. `python tests/w3/t1.py 8770 393 851` (args: port, width, height). Screenshots land in `tests/<wave>/shots/`. Test at phone sizes **393×851** and **360×640**. `tests/w3/t2.py` fakes the date with Playwright's clock to test events and the portal.
- Tests seed a save, then stub `Storage.prototype.setItem` before `reload()` so the old page can't overwrite the seeded save. Keep that trick if you write new ones.

## Art: how it works now

Everything is drawn in code in `art.js`. There are no image files apart from the app icons.

- **Battle scene** (`createScene`): drawn on a low-res canvas about **100 px wide** (`SCALE = round(cssWidth / 100)`), then scaled up with smoothing off. Each person is drawn by `humanoid(g, centreX, feetY, look, anim)` from a `look` object (`h` = height in low-res pixels, `skin`, `hat`, `weapon`, `robe`, `glow`, ...). `outlined()` adds a 1px dark outline.
  - Sizes in low-res pixels: evolution forms (`FORM[id].look.h` in core.js) run from 11 (goblin) up to 24 for the biggest late forms. Adventurers are 16, raid leaders 22, the GM 24. Warband units are about 8.
  - Animation is procedural (bob, swing, walk), driven by `anim`.
  - Event hats (party, pumpkin, santa, flower) and corruption glitch bars are layered on top.
- **Town view** (`createTownView`): its own low-res canvas about **130 px wide**. Buildings are in `BUILD_ART`, positions in `TOWN_SPOTS`, and the seasons have their own visuals.
- **UI images** are generated as data URLs and cached: `portrait(form, size)`, `unitIcon(i, size, rank)`, `bldIcon(id)`, `resIcon(id)`, `jobIcon(id)`.
- Palette anchors: goblin green `#7FA650` / dark `#4E6E30`, gold `#F2C14E`, glitch pink `#FF4F8B`, system cyan `#7FE0F5`, night background `#16130F`.

## Next job: PixelLab sprites

Shaun wants real sprites made with PixelLab. The `pixellab` MCP server should be set up in Claude Code at user scope (`claude mcp list` should show it as connected). It provides `create_character` (4/8 directions), `animate_character`, tilesets, map objects and raw image tools.

Suggested approach (agree it with Shaun before generating lots, since generations use his PixelLab account):

1. **One test sprite first.** Make the base goblin hero, put it in the game, and look at it at phone size before doing the roster. The big open question is **scale**: the scene's characters are only about 8–24 low-res pixels tall, and PixelLab characters are usually much larger. Options:
   - generate small sprites
   - raise the scene's resolution (change the `/100` divisor) and scale the procedural parts to match
   - draw sprites on the high-res layer

   Show Shaun the options side by side.
2. **Replace one sprite at a time, with a fallback.** Add a small sprite registry, e.g. `sprites/manifest.json` listing which PNGs exist. Each draw call uses the PNG if the manifest has it and the procedural drawing if not. The game always works, and art can land gradually. Keep `imageSmoothingEnabled = false` and integer scaling so pixels stay crisp.
3. **Easy wins:** portraits and UI icons (`portrait`, `unitIcon`, `bldIcon`, `resIcon`, `jobIcon`) are just images in the DOM, so they swap cleanly.
4. **Animation:** PixelLab's `animate_character` gives frames (idle, walk, attack). The scene needs a frame-based draw path that replaces the procedural bob/swing for sprites that have frames.
5. Sprites are new files, so remember to update `build.mjs` (copy the `sprites/` folder into `dist/`) and decide whether `sw.js` should pre-cache them. Its fetch handler already caches same-origin GETs at runtime.

Evolution form ids, for naming sprite files: goblin, nilbog, mephit, boss, barghest, bugbear, bugchief, yeti, abominable, hobgoblin, hobcaptain, warlord, ironshadow, devastator, orc, nurtured, orog, eye, hand, claw, redfang, blade, warchief, tanarukk, ogre, chainbrute, oni, troll, diretroll. Check `FORM` in core.js for the full list and each form's look.
