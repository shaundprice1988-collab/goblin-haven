# Goblin Haven — "do it all" build plan (started 2026-10-11 18:11 AEDT)

Source: /home/claude/goblin-haven. Backup of v3 source: $SP/src-v3. Live v3 = dpl_E8eSSLVpSApdLCJLkqyr44gAJUHf.
Report: /home/claude/reports/Incremental game feature gaps.md (16 ranked items).

## Architecture
- New files: meta.js (pure logic + event bus GH.on/emit/ask, GH.Meta), more.js (UI for new systems, registers GH.on handlers), more.css.
- Load order: core.js, town.js, meta.js, art.js, more.js, app.js. app.js emits 'init'(App) before first render; App = internal API.
- Events from app.js: init, tick(dt,now), sec, render(force), kill(e), raidWon(e), raidLost(e,lost), conquer(r,first), bossFail(e), tap(dmg,crit),
  beforeRollback(gain), rollback(entry), away(sec,rows), evolve(id), buyUnit(i,k), buyUpgrade(u), feast, build(id), research(id), victory (ask), menu, tab(t),
  raidSpawn(e), bossSpawn(e), spawnSpecial (ask -> enemy|null).
- Deploy: inline changed files in create_deployment (no teamId); unchanged by sha+size. Verify uids with list_deployment_files.

## Waves
1. Save export/import + rolling backup + backup prompt; rollback forecast + run log (Raid Log); Patch Notes milestones (bots); Exploit Tree (EP); Feats (+titles, shadow); notation; rename.
2. Dirty Tricks (Gank, Ninja Loot, Zerg Rush, Macro); raid variety (party types, legendary leaders w/ shards, whale w/ hearth timer via regionbar);
   World Chat lines + clickable whisper; Recovered Data Logs; ending choice; Hardcore Servers (challenges); audio (WebAudio, off by default).
3. Town edicts + seasons + rollback-unlocked buildings + expeditions; Corruption track (+ data leeches); Heirloom relics; date events (Halloween Oct 20-Nov 3 etc);
   Server Wipe (Root Access); return-loop polish (cap-full time, app badge, first-boss-of-day bonus).

## Milestones (by rollbacks)
1 auto-recruit bot · 2 seed money 1% of last run's shinies · 3 auto-upgrade bot + Hardcore Servers · 5 bind slot 1 · 7 start with Mudhollow conquered ·
10 seed money 5% · 15 bind slot 2 · 20 autocast tricks · 25 auto-rollback · 40 bind slot 3.
Rollback requires conquered>=3 AND >=2 regions conquered this run.

## Status
- [x] wave 1 code  - [x] wave 1 tests  - [x] wave 1 deploy (dpl_FBUCK9mymL8Kkz7XsNiXqyGU8tEE, READY, uids verified, sw v4 live)
- [x] wave 2 code (play.js, sound.js; meta/app/art/more edits)  - [x] wave 2 tests (w2/t2.py, t3.py; w1 regression) on src + minified  - [x] wave 2 deploy (prod dpl_4ciCfg4ses4wjSupK9SnGHCdTV4F READY, uids = gh5shas, sw v5 live). Uploaded in 3 preview deploys first (app; art+core; meta+more) then prod with the rest.
- [x] wave 3 code (world.js new; town/meta/core/app/art/more/play/sound edits)  - [x] wave 3 tests (w3/t1.py, t2.py, w3smoke.cjs; w1+w2 regression) on src + minified  - [x] wave 3 deploy (prod dpl_27R2DT6N7rwZjmj9BeFWBv1uUZMk READY, uids = gh6shas except app.js = 1830f5d8ab96ccf9a4864fac79b170f6ca0b85a9/64900 which is the minified file + one trailing newline, harmless). Uploaded via 5 preview deploys then prod.

## Deploy tip
Payload too big for one call: upload changed files via preview deploys (no target) referencing older shas, verify uids, then final production deploy referencing all by sha.
