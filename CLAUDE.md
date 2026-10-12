# Goblin Haven

An incremental (idle) phone game, built as an installable web app (PWA). Shaun's project.

**Premise:** an MMO player gets corrupted into a starter-zone goblin. You defend your village (Mudhollow) from adventurers, grow a warband and a goblin town, evolve along a D&D-style monster tree (goblin → hobgoblin, bugbear, orc, ogre, troll and more), conquer regions, and eventually take the whole MMO. "Rollbacks" are the prestige loop. The game's UI talks like an MMO "System" window, and the humour is MMO satire.

- Live: https://shaundprice1988-collab.github.io/goblin-haven/ (GitHub Pages, repo `shaundprice1988-collab/goblin-haven`, deploys on every push to `main`)
- Also live: https://goblin-haven.vercel.app (Vercel project `goblin-haven`, id `prj_6LDrZ56kIFtJtarcweuh3JbzGFAM`). Saves are per site, so players move between the two with save export/import
- Last Vercel deploy: wave 3 (service worker `goblinhaven-v6`), 11 Oct 2026, prod deployment `dpl_27R2DT6N7rwZjmj9BeFWBv1uUZMk`. GitHub Pages runs `goblinhaven-v9`
- History: `docs/build-log.md`. Feature research that drove waves 1–3: `docs/feature-gaps-report.md` (all 16 items are built)
- This folder was handed over from a Claude chat session that built waves 1–3. Commits use the GitHub noreply email (set in this repo's git config).

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

## Layouts

There are three layouts, all in `style.css`. The battle scene adapts to whichever box it gets:

- **Phone** (default): a single column, max 560px wide. The scene is about 100 units wide.
- **Desktop** (`min-width: 960px`): the battle on the left and the panels on the right.
- **Browser landscape** (`min-width: 1100px`, aspect at least 3:2, `min-height: 620px`; the last block in style.css):
  - The battle is a full-width panoramic band (`clamp(320px, 52vh, 600px)` tall), with the region bar and tabs under it.
  - Panel lists flow into ~440px columns, and the hero tab uses two columns.
  - The town view is capped at 720×232.
- Keyboard play on desktop: Space/F attacks and 1–5 switch tabs.
- In art.js, `resize()` switches the scene into **WIDE** mode when the canvas is more than 1.5× wider than it is tall. Pixel size then comes from the height (about 100 units tall), and the field uses fixed anchors instead of proportions:
  - `HX` is the hero, at 60% across.
  - `SX = HX + 26` is where enemies stand; they walk in from the right edge (`ENTER`).
  - `VX = HX − 12` is the village edge, so the extra width becomes village on the left and landscape on the right.
- In WIDE mode, backgrounds use the region's 512×256 panorama `sprites/bg/<r>-wide.png` (its horizon is in `horizons.json` under `"<r>-wide"`) when it exists. Any remaining width is filled by mirroring the image outward.

## Rules that keep players' saves safe

- The save lives in localStorage as `goblinhaven.save.v1`, with a rolling backup `goblinhaven.backup.v1`.
- Any new state field must be filled in for old saves: `fixMeta` (meta.js), `fixTown` (town.js), or the load path in app.js. Never rename or repurpose an existing field.
- Every deploy: bump `VERSION` in `sw.js` (next is `goblinhaven-v10`), and add any new file to **both** `FILES` in sw.js and the copy list in build.mjs. Otherwise installed players get stale or missing files. The `sprites/` folder is the exception: build.mjs copies it whole, and sw.js caches sprite files at runtime instead of pre-caching them, so the VERSION bump is what refreshes them.

## Deploy

**GitHub Pages (main host):** push to `main`. `.github/workflows/pages.yml` runs `npm ci`, the build and both smoke tests, then publishes `dist/`. The site lives in a subfolder (`/goblin-haven/`), so keep every path relative: no leading `/` in `sw.js` FILES, the web manifest, or fetches.

**Vercel (older host):**

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

The art is a mix: PixelLab sprites and backgrounds (PNG files in `sprites/`) where they exist, and procedural pixel art drawn in code in `art.js` for everything else. Every sprite has a procedural fallback, so the game works with any subset of PNGs.

- **Battle scene** (`createScene`): positions are in *scene units*, about 100 per scene width (`SCALE` = CSS px per unit, always even: `2 * round(cssWidth / 200)`). The canvases underneath are on a **fine grid of 2 pixels per unit** (`FX = 2`):
  - Procedural art draws in scene units through a 2× transform, so it keeps its chunky look. Each person is drawn by `humanoid(g, centreX, feetY, look, anim)` from a `look` object (`h` = height in units, `skin`, `hat`, `weapon`, `robe`, `glow`, ...). `outlined()` adds a 1-unit dark outline.
  - PixelLab sprites draw **1:1 on the fine grid** with `drawSprite(s, cx, feetY, {flash, glow})`. Use `fine(g, fn)` for any direct fine-pixel drawing.
  - Sizes: the goblin hero sprite is 33 fine px tall, adventurers about 49, region bosses about 66, the GM about 74, the whale about 58. Procedural heights in units: forms 11 (goblin) up to 24, adventurers 16, bosses 22, the GM 24, warband units about 8.
  - Animation: procedural bob/swing/walk for code-drawn people. Sprites hop a unit while walking, breathe while idle, and lean in when they swing. No frame animations yet.
  - Event hats (party, pumpkin, santa, flower) are drawn on sprite heads by `spriteHat`, and corruption glitch bars are layered on top.
- **Sprite registry**: `sprites/manifest.json` is **generated** by `tools/manifest.mjs`, which `npm run build` runs, from the folder layout. Don't edit it by hand; drop files in the right place:
  - `sprites/<id>/east.png | west.png | south.png` are character facings. The hero and warband use `east`, enemies use `west`, and portraits use `south`.
  - `sprites/<id>/<anim>-<n>.png` are animation frames, e.g. `goblin/attack-0.png` gives `"attack": [...]`. The hero plays `attack` after each swing and loops `idle` otherwise. Frames share one crop so they don't jitter.
  - `sprites/bg/<region>.png` (or `shard.png`) plus `sprites/bg/horizons.json` (`{"3": 180}`) make up a background. `horizon` is the image row where the walkable ground starts; it is placed on the scene horizon, and edge bands are mirrored to fill taller or wider scenes. A sprite background replaces the procedural sky, hills, props and animated props. Weather, the village and the warband still draw on top.
  - `sprites/bg/village.json` places the village per background, so it stands on the painted ground instead of the skyline. Each entry is `{"v": units below the horizon for the back line (huts, tower), "f": units below the fighters' feet for the front limit}`. The defaults are v 6, f 6; thin-ground art like the Sky Citadel deck needs its own values. In art.js the band is `VY` (back) to `VF` (front):
    - The tower, huts, palisade, campfire and crowd stand from the back line forward.
    - The warband has two rows inside the band, and flyers hover 16 units above the back line.
    - Huts cluster into a settlement at the left, 15 units apart. Phone-shaped scenes show at most 3 huts, 4 villagers, the 5 newest ground unit types and 2 flyers.
    - Check a change with the lab approach: render every region into one canvas and look at it at full size.
  - `sprites/fx/<name>/manifest.json + whole.png` are VFX (see below).
  - Lookup rules in art.js:
    - Adventurer class variants are `adv-<class>-<n>` (warrior, mage, ranger, cleric, rogue, gm), and each adventurer picks one from `look.seed`.
    - Named sprites win: `boss-<slug of the boss name>` (e.g. `boss-gmaldric`) and `whale`.
    - Warband units are `unit-<index>-<tier>`, with tier 0 for ranks 0–1, tier 1 for ranks 2–3 and tier 2 for ranks 4–5; rank 5 adds a cyan glow.
    - The village uses `hut`, `hut-banner` (one per conquered region), `palisade`, `tower`, and `crowd-0`/`crowd-1` for villagers. Evolution forms use their `FORM` id.
  - `GHArt.onArt(fn)` fires when sprite images finish loading; app.js uses it to redraw the cached portrait and unit icons.
- **VFX** (PixelLab VFX Creator, the `vfx_workbench` MCP tool; renders are free):
  - Export each effect with `--game-pack` and keep only its `manifest.json` and `whole.png` in `sprites/fx/<name>/`. The "whole" clip is drawn at an anchor (a character's feet) plus the pack's offset, 1:1 on the fine grid.
  - In art.js, `playFx(name, x, feetY)` queues one-shots (capped at 14) and `loopFx` draws loops (the campfire). Nothing plays under reduced motion.
  - Effects in use: `hit`, `crit`, `kill` (one per raid member) + `coins`, `swing` (hero tap), `rankup`, `corrupt`, `evolve`, `bossin`/`gmin` (boss spawn), `conquer`, `campfire`, and shot impacts `rock`/`boom`/`hex` (`SHOT_FX`). The Dirty Tricks use `trick-<id>` (`gank` at the enemy, the rest at the hero). Game code calls `scene.fx(name, 'hero' | 'enemy' | 'stand' | 'center')`.
  - The originals are in Shaun's PixelLab "My effects", named "Goblin Haven - <name>", and can be tweaked there with sliders and re-exported.
- **Making art** (PixelLab MCP, user scope). These recipes match the existing set:
  - Characters: `create_character` with `view: "side"`, `n_directions: 4`, chibi proportions, `detail: "low detail"`, standard mode (1 generation). The size parameter is about the content height you'll get, minus 1. Use 48 for adventurers, 64 for bosses, 72 for the head GM, and 3× `look.h` for evolution forms. Download the facings you need to `sprites/<id>/`.
  - Objects and mounts: `create_image_pixen` with `no_background: true`, side view, "facing right", and a small canvas (32–56 px). Mirror wrong-facing results with `tools/png.mjs flip`.
  - Backgrounds: `create_image_pixen` 256×256, `view: "side"`, with this prompt: "wide side-view 2D platformer game background, <scene>, the lower 30 percent of the image is <ground> seen from the side, empty foreground, no buildings in the foreground, no characters, no people, no text, no letters, no title, no logo". Pixen invents title text if you don't forbid it.
  - `tools/png.mjs` (no dependencies) has `bbox`, `horizon`, `flip`, `sheet` (contact sheet) and `scene` (mocks the in-game layout with a background, the hero and an enemy). Check every new asset in a mock-up before shipping it.
- **Town view** (`createTownView`): its own low-res canvas about **130 px wide**, still fully procedural. Buildings are in `BUILD_ART`, positions in `TOWN_SPOTS`, and the seasons have their own visuals.
- **UI images** are cached data URLs: `portrait(form, size)` uses the form's `south` sprite when there is one, and `unitIcon(i, size, rank)` uses the unit's tier sprite. `bldIcon(id)`, `resIcon(id)` and `jobIcon(id)` are still procedural.
- Palette anchors: goblin green `#7FA650` / dark `#4E6E30`, gold `#F2C14E`, glitch pink `#FF4F8B`, system cyan `#7FE0F5`, night background `#16130F`.

## Combat animation

- Every evolution form, adventurer variant, boss and the whale has a 7-frame `attack` animation. Frame 0 is the rest pose, and frames are anchored on its body so they don't jitter.
- Adventurers attack every couple of seconds; your hero attacks on each tap.
- The blow lands at `RELEASE` (55% through), or on the frame given in `STRIKE_FRAME` (art.js) for animations that strike late. On the hero side, a tap during a swing lands the pending blow at once.
- How each fighter attacks is in `COMBAT_CLASS` / `COMBAT_SPRITE` (melee trail, projectile, or strike). The matching VFX are `slash`, `slash-heavy`, `stab`, `claw`, `smash`, `swing`, `proj-*`, `cast-*`, `impact-*`, `smite` and `gm-bolt`.
- PixelLab's copies of a few animations differ from the files in `sprites/`: the local files are the better attempt. Trust the repo, and don't re-download from PixelLab.

## Art still to do

- The town view (`BUILD_ART`) and the remaining UI icons (`bldIcon`, `resIcon`, `jobIcon`).
- Weather is still procedural particles on top of the backgrounds; VFX Creator has rain/snow/leaf/ember loops that could replace it.
