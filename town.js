// Goblin Haven: the town. Villagers, jobs, resources, buildings and technology. No DOM here either.
(function (root) {
  'use strict';
  const GH = root.GH;

  // ------------------------------------------------------------------ tuning
  const T = {
    START_POP: 4,
    HOUSE_BASE: 4,
    HOUSE_PER_HUT: 3,
    RESCUE: 3,            // goblins rescued per region conquered for the first time; they bring their own tents
    HATCH_TIME: 20,       // seconds for the first new goblin to hatch
    HATCH_SLOW: 1.075,    // each goblin hatched makes the next one take this much longer
    HATCH_FOOD: 6,        // food eaten by the first new goblin
    HATCH_FOOD_G: 1.07,
    BLD_STEP: 0.25,       // production buildings: +25% per level
    COMFORT_BASE: 7,      // the old campfire
    FEAST_TIME: 600,      // seconds
    FEAST_FOOD: 20,       // food per goblin, or ten minutes of food, whichever is more
    FEAST_BONUS: 0.5,     // comfort +50% while the feast lasts
    GUARD_FIGHT: 0.03,    // warband +3% in raids and raid-leader fights, per guard
    GUARD_STEAL: 0.03,    // raiders steal 3% less, per guard
    SEASON_LEN: 2700,     // seconds per season (45 minutes) on the real clock, so every player shares the weather
    EDICT_SWITCH: 300,    // seconds before the edicts can be changed again
    EXP_RES: 0.5,         // expedition loot: half of what the town gathers in that time, for a party of five
  };

  // ------------------------------------------------------------------ resources and jobs
  const RES = [
    { id: 'food', name: 'Food', color: '#E8A65E' },
    { id: 'wood', name: 'Wood', color: '#C08A52' },
    { id: 'stone', name: 'Stone', color: '#B4B4BE', tech: 'masonry' },
    { id: 'iron', name: 'Iron', color: '#9CC0D8', tech: 'mining' },
    { id: 'ideas', name: 'Ideas', color: '#7FE0F5' },
  ];
  const RES_IDS = RES.map((r) => r.id);

  const JOBS = [
    { id: 'forager', name: 'Foragers', one: 'forager', res: 'food', rate: 0.5, bld: 'farm', blurb: 'Grubs, mushrooms and the odd turnip.' },
    { id: 'woodcutter', name: 'Woodcutters', one: 'woodcutter', res: 'wood', rate: 0.35, bld: 'lumber', blurb: 'Chop chop. Mind the fingers.' },
    { id: 'stonecutter', name: 'Stonecutters', one: 'stonecutter', res: 'stone', rate: 0.25, bld: 'quarry', tech: 'masonry', blurb: 'Hit rock with smaller rock.' },
    { id: 'miner', name: 'Miners', one: 'miner', res: 'iron', rate: 0.12, bld: 'mine', tech: 'mining', blurb: 'Deep down, every goblin loves a tunnel.' },
    { id: 'tinkerer', name: 'Tinkerers', one: 'tinkerer', res: 'ideas', rate: 0.2, bld: 'shed', blurb: 'They take things apart. Sometimes they put them back.' },
    { id: 'guard', name: 'Guards', one: 'guard', res: null, rate: 0, blurb: 'Stand on the walls looking fierce.' },
  ];
  const JOB = {};
  JOBS.forEach((j) => { JOB[j.id] = j; });

  // ------------------------------------------------------------------ buildings
  // cost: base cost of the next level; each level costs g times the last. fx is per level.
  const BUILDINGS = [
    { id: 'huts', name: 'Mud Huts', fx: 'housing', cost: { wood: 10 }, g: 1.55,
      blurb: 'Somewhere to sleep that isn’t a spawn point.' },
    { id: 'farm', name: 'Grub Farm', fx: 'job', job: 'forager', cost: { wood: 14, food: 10 }, g: 1.6,
      blurb: 'Mushroom rows and a very proud grub pit.' },
    { id: 'lumber', name: 'Lumber Camp', fx: 'job', job: 'woodcutter', cost: { wood: 18, food: 14 }, g: 1.6,
      blurb: 'A stump, a saw, and a goblin who insists on yelling “timber”.' },
    { id: 'shed', name: 'Tinker Shed', fx: 'job', job: 'tinkerer', cost: { wood: 24 }, g: 1.65,
      blurb: 'Smells of burnt hair. Progress, apparently.' },
    { id: 'feast', name: 'Feast Hall', fx: 'comfort', v: 5, tech: 'fire', cost: { wood: 40, food: 30 }, g: 1.6,
      blurb: 'Long tables, loud songs, and feasts for the whole village.' },
    { id: 'healer', name: 'Healer’s Hut', fx: 'comfort', v: 8, tech: 'herbs', cost: { wood: 60, food: 60 }, g: 1.65,
      blurb: 'Goblins used to just wait for the respawn timer.' },
    { id: 'quarry', name: 'Quarry', fx: 'job', job: 'stonecutter', tech: 'masonry', cost: { wood: 60, stone: 20 }, g: 1.6,
      blurb: 'A big hole that keeps getting bigger.' },
    { id: 'walls', name: 'Stone Walls', fx: 'warband', v: 0.1, tech: 'masonry', cost: { wood: 50, stone: 60 }, g: 1.7,
      blurb: 'Players can’t farm what they can’t reach.' },
    { id: 'market', name: 'Trading Post', fx: 'gold', v: 0.1, tech: 'counting', cost: { wood: 80, food: 60 }, g: 1.7,
      blurb: 'Buys loot from your warband. Sells it to players, at a markup.' },
    { id: 'mine', name: 'Mine', fx: 'job', job: 'miner', tech: 'mining', cost: { wood: 120, stone: 80 }, g: 1.6,
      blurb: 'Iron, and the occasional angry mole.' },
    { id: 'pit', name: 'Training Pit', fx: 'xp', v: 0.1, tech: 'drills', cost: { wood: 150, stone: 100 }, g: 1.7,
      blurb: 'Practice dummies dressed as adventurers.' },
    { id: 'library', name: 'Library', fx: 'ideas', v: 0.25, tech: 'writing', cost: { wood: 300, stone: 300 }, g: 1.7,
      blurb: 'Mostly copied quest logs. Very educational.' },
    { id: 'forge', name: 'Forge', fx: 'forge', v: 0.1, tech: 'smithing', cost: { stone: 400, iron: 120 }, g: 1.7,
      blurb: 'Real weapons, finally. The sticks are retired with honours.' },
    { id: 'bath', name: 'Bathhouse', fx: 'comfort', v: 16, tech: 'plumbing', cost: { stone: 3000, iron: 800 }, g: 1.7,
      blurb: 'Hot springs. Goblins have never been this relaxed.' },
    { id: 'shrine', name: 'Rebirth Shrine', fx: 'shrine', v: 0.1, tech: 'respawn', cost: { stone: 150000, iron: 60000, ideas: 200000 }, g: 1.8,
      blurb: 'Players who fall near Mudhollow respawn here, as goblins.' },
    // rb: server rollbacks before it can be built
    { id: 'hall', name: 'Town Hall', fx: 'hall', v: 0.05, rb: 2, tech: 'masonry', cost: { wood: 600, stone: 300 }, g: 1.9,
      blurb: 'Somewhere to shout new laws from. Issue edicts in the Hall tab.' },
    { id: 'camp', name: 'Expedition Camp', fx: 'camp', v: 0.2, rb: 3, cost: { wood: 400, food: 400 }, g: 1.8,
      blurb: 'Packs, maps, and a goblin who swears he knows the way.' },
    { id: 'vault', name: 'Data Vault', fx: 'vault', v: 0.05, rb: 6, tech: 'mining', cost: { stone: 5000, iron: 2000, ideas: 10000 }, g: 2,
      blurb: 'Corrupted backups stacked to the ceiling. It hums at night.' },
  ];
  const BLD = {};
  BUILDINGS.forEach((b) => { BLD[b.id] = b; });

  // ------------------------------------------------------------------ technology
  const ERAS = ['Mud Age', 'Stone Age', 'Iron Age', 'Glitch Age'];
  const TECHS = [
    { id: 'fire', era: 0, name: 'Fire, on Purpose', cost: { ideas: 25 }, req: [],
      desc: 'Comfort +5. Unlocks the Feast Hall.', fx: { comfort: 5 } },
    { id: 'baskets', era: 0, name: 'Woven Baskets', cost: { ideas: 100 }, req: [],
      desc: 'Foragers and woodcutters gather 50% more.', fx: { job: { forager: 1.5, woodcutter: 1.5 } } },
    { id: 'sticks', era: 0, name: 'Sharper Sticks', cost: { ideas: 600, wood: 400 }, req: [],
      desc: 'Your warband fights 50% harder.', fx: { warband: 1.5 } },
    { id: 'herbs', era: 0, name: 'Herb Lore', cost: { ideas: 800 }, req: ['fire'],
      desc: 'Comfort +5. Unlocks the Healer’s Hut.', fx: { comfort: 5 } },
    { id: 'masonry', era: 0, name: 'Masonry', cost: { ideas: 2000, wood: 1500 }, req: ['baskets'],
      desc: 'Unlocks stonecutters, the Quarry and Stone Walls.' },
    { id: 'counting', era: 0, name: 'Counting Past Ten', cost: { ideas: 3000 }, req: ['fire'],
      desc: 'Unlocks the Trading Post. Adventurers drop 25% more shinies.', fx: { gold: 1.25 } },

    { id: 'mining', era: 1, name: 'Mining', cost: { ideas: 15000, stone: 5000 }, req: ['masonry'],
      desc: 'Unlocks miners and the Mine.' },
    { id: 'songs', era: 1, name: 'Goblin Songs', cost: { ideas: 18000 }, req: ['herbs'],
      desc: 'All comfort +25%.', fx: { comfortM: 1.25 } },
    { id: 'drills', era: 1, name: 'Drill Sergeants', cost: { ideas: 22000, wood: 20000 }, req: ['sticks'],
      desc: 'Unlocks the Training Pit. Each guard counts double.', fx: { guard: 2 } },
    { id: 'longhouses', era: 1, name: 'Longhouses', cost: { ideas: 25000, wood: 30000, stone: 15000 }, req: ['masonry'],
      desc: 'Huts hold 50% more goblins.', fx: { housingM: 1.5 } },
    { id: 'wheelbarrows', era: 1, name: 'Wheelbarrows', cost: { ideas: 28000, wood: 25000, stone: 15000 }, req: ['masonry'],
      desc: 'All gathering +50%.', fx: { gather: 1.5 } },
    { id: 'writing', era: 1, name: 'Writing', cost: { ideas: 90000 }, req: ['counting'],
      desc: 'Tinkerers think 50% faster. Unlocks the Library.', fx: { job: { tinkerer: 1.5 } } },
    { id: 'smithing', era: 1, name: 'Smithing', cost: { ideas: 200000, iron: 15000 }, req: ['mining'],
      desc: 'Unlocks the Forge.' },

    { id: 'plumbing', era: 2, name: 'Plumbing', cost: { ideas: 700000, stone: 150000, iron: 50000 }, req: ['smithing', 'songs'],
      desc: 'Unlocks the Bathhouse.' },
    { id: 'patch', era: 2, name: 'Reading the Patch Notes', cost: { ideas: 500000 }, req: ['writing'],
      desc: 'You gain 50% more XP, and raid leaders give you 5 more seconds.', fx: { xp: 1.5, boss: 5 } },
    { id: 'clockwork', era: 2, name: 'Clockwork', cost: { ideas: 600000, iron: 60000 }, req: ['smithing', 'writing'],
      desc: 'Your warband fights twice as hard.', fx: { warband: 2 } },
    { id: 'loot', era: 2, name: 'Loot-Table Analysis', cost: { ideas: 850000 }, req: ['patch'],
      desc: 'Adventurers drop twice as many shinies.', fx: { gold: 2 } },

    { id: 'glitch', era: 3, name: 'Glitchcraft', cost: { ideas: 2.4e6, iron: 250000 }, req: ['clockwork'],
      desc: 'Your corruption gets into the tools. All gathering doubles.', fx: { gather: 2 } },
    { id: 'console', era: 3, name: 'Debug Console', cost: { ideas: 6e6 }, req: ['loot', 'glitch'],
      desc: 'Double earnings while you’re away, and up to 48 hours count.', fx: { offline: 2, offCap: 2 } },
    { id: 'respawn', era: 3, name: 'Hijacked Respawn Point', cost: { ideas: 6.5e6, stone: 2e6, iron: 1e6 }, req: ['console'], best: 9,
      desc: 'Unlocks the Rebirth Shrine. Fallen players respawn as goblins.' },
    { id: 'haven', era: 3, name: 'Haven Protocol', cost: { ideas: 1.2e7 }, req: ['respawn'], won: true,
      desc: 'Mudhollow becomes a protected safe zone. Raiders can’t steal anything, and everything is twice as strong.', fx: { noSteal: true, all: 2 } },
  ];
  const TECH = {};
  TECHS.forEach((t) => { TECH[t.id] = t; });

  // ------------------------------------------------------------------ seasons: the server's weather cycle
  const SEASONS = [
    { id: 'spring', name: 'Spring', desc: 'Goblins hatch 50% faster.', fx: { hatch: 1.5 } },
    { id: 'summer', name: 'Summer', desc: 'Foragers and woodcutters gather 25% more.', fx: { res: { food: 1.25, wood: 1.25 } } },
    { id: 'autumn', name: 'Autumn', desc: 'Tinkerers think 30% faster.', fx: { res: { ideas: 1.3 } } },
    { id: 'winter', name: 'Winter', desc: 'Comfort −25%, but feasts give twice the boost.', fx: { comfort: 0.75, feast: 2 } },
  ];
  function season(now) {
    now = now == null ? Date.now() : now;
    const len = T.SEASON_LEN * 1000, k = Math.floor(now / len);
    const s = SEASONS[((k % 4) + 4) % 4];
    return Object.assign({ left: (len - (now - k * len)) / 1000, next: SEASONS[(((k + 1) % 4) + 4) % 4] }, s);
  }

  // ------------------------------------------------------------------ edicts: laws from the Town Hall, each with a catch
  const EDICTS = [
    { id: 'songs', name: 'Work Songs', desc: 'Gathering +30%, but comfort −15%.', fx: { gather: 1.3, comfort: 0.85 } },
    { id: 'feastdays', name: 'Feast Days', desc: 'Comfort +30%, but foragers gather 20% less.', fx: { comfort: 1.3, food: 0.8 } },
    { id: 'conscript', name: 'Conscription', desc: 'Guards count double, but gathering −15%.', fx: { guard: 2, gather: 0.85 } },
    { id: 'gates', name: 'Open Gates', desc: 'Goblins hatch 60% faster, but raiders steal 30% more.', fx: { hatch: 1.6, steal: 1.3 } },
    { id: 'school', name: 'Night School', desc: 'Tinkerers think 40% faster, but everyone else gathers 10% less.', fx: { ideas: 1.4, others: 0.9 } },
    { id: 'rites', name: 'Corrupt Rites', desc: 'Warband +20%, but comfort −20%. Works only while you’re corrupted.', fx: { warband: 1.2, comfort: 0.8 }, corrupt: true },
  ];
  const EDICT = {};
  EDICTS.forEach((e) => { EDICT[e.id] = e; });

  // ------------------------------------------------------------------ expeditions: send goblins out, collect them later
  const TRIPS = [
    { id: 'scout', name: 'Scouting trip', sec: 900, party: 3, key: 0.05, desc: 'A quick look over the next hill.' },
    { id: 'raid', name: 'Raiding party', sec: 3600, party: 5, key: 0.2, desc: 'Turn the tables and farm the farmers.' },
    { id: 'delve', name: 'Deep delve', sec: 14400, party: 8, key: 0.6, desc: 'Down into the unfinished parts of the map.' },
  ];
  const TRIP = {};
  TRIPS.forEach((t) => { TRIP[t.id] = t; });

  // ------------------------------------------------------------------ state
  function freshTown() {
    return {
      unlocked: false, pop: T.START_POP, hatched: 0, hatchT: 0, rescued: 0,
      jobs: { forager: 2, woodcutter: 1, stonecutter: 0, miner: 0, tinkerer: 1, guard: 0 },
      split: { forager: 2, woodcutter: 1, stonecutter: 0, miner: 0, tinkerer: 1, guard: 0 },
      auto: true, step: 1, sub: 'jobs',
      res: { food: 0, wood: 0, stone: 0, iron: 0, ideas: 0 },
      made: { food: 0, wood: 0, stone: 0, iron: 0, ideas: 0 },
      bld: { huts: 1 }, tech: {}, feastUntil: 0, feasts: 0,
      edicts: [], edictAt: 0, exp: [], expDone: 0,
    };
  }
  // Fill in anything an older save is missing.
  function fixTown(t) {
    const f = freshTown();
    if (!t || typeof t !== 'object') return f;
    const o = Object.assign(f, t);
    for (const k of ['jobs', 'split', 'res', 'made']) {
      const base = freshTown()[k];
      o[k] = Object.assign(base, t[k] && typeof t[k] === 'object' ? t[k] : {});
      for (const id of Object.keys(o[k])) if (!isFinite(o[k][id]) || o[k][id] < 0) o[k][id] = 0;
    }
    o.bld = t.bld && typeof t.bld === 'object' ? t.bld : { huts: 1 };
    o.tech = t.tech && typeof t.tech === 'object' ? t.tech : {};
    o.edicts = Array.isArray(t.edicts) ? t.edicts.filter((id) => EDICT[id]).slice(0, 2) : [];
    o.exp = Array.isArray(t.exp) ? t.exp.filter((e) => e && TRIP[e.id] && isFinite(e.end) && e.party > 0) : [];
    for (const k of ['edictAt', 'expDone']) if (!isFinite(o[k]) || o[k] < 0) o[k] = 0;
    if (!isFinite(o.pop) || o.pop < 1) o.pop = T.START_POP;
    clampJobs(o);
    return o;
  }

  const has = (S, id) => !!S.town.tech[id];
  const lvl = (S, id) => S.town.bld[id] || 0;
  const assigned = (t) => JOBS.reduce((a, j) => a + (t.jobs[j.id] || 0), 0);
  const away = (t) => (t.exp || []).reduce((a, e) => a + e.party, 0);   // out on expeditions
  const home = (t) => Math.max(0, t.pop - away(t));
  const idle = (t) => Math.max(0, home(t) - assigned(t));
  function clampJobs(t) {
    let over = assigned(t) - home(t);
    for (let k = JOBS.length - 1; k >= 0 && over > 0; k--) {
      const id = JOBS[k].id, take = Math.min(over, t.jobs[id]);
      t.jobs[id] -= take; over -= take;
    }
  }

  function jobOpen(S, id) { const j = JOB[id]; return !j.tech || has(S, j.tech); }
  function resOpen(S, id) { const r = RES.find((x) => x.id === id); return !r.tech || has(S, r.tech) || S.town.res[id] > 0; }
  function bldOpen(S, id) { const b = BLD[id]; return (!b.tech || has(S, b.tech)) && (!b.rb || (S.rollbacks || 0) >= b.rb); }
  function techState(S, id) {
    const t = TECH[id];
    if (has(S, id)) return 'done';
    if (!t.req.every((r) => has(S, r))) return 'locked';
    if (t.best && (S.bestRegionEver || 0) < t.best) return 'gated';
    if (t.won && !S.won) return 'gated';
    return 'open';
  }
  function techGate(t) {
    if (t.best) return `conquer ${GH.REGIONS[t.best - 1].name}`;
    if (t.won) return `beat the Admin Spire`;
    return '';
  }

  // ------------------------------------------------------------------ numbers
  // exploits and other things outside the town can speed it up (meta.js)
  const ext = (S, key) => (GH.Meta && S.meta ? GH.Meta.town(S, key) : 1);
  function techMul(S, key) {
    let m = 1;
    for (const id in S.town.tech) { const f = TECH[id] && TECH[id].fx; if (f && f[key]) m *= f[key]; }
    return m;
  }
  function housing(S) {
    const t = S.town;
    return Math.floor((T.HOUSE_BASE + T.HOUSE_PER_HUT * lvl(S, 'huts')) * techMul(S, 'housingM') + T.RESCUE * t.rescued + 8 * lvl(S, 'shrine'));
  }
  function comfort(S, now) {
    let c = T.COMFORT_BASE;
    for (const b of BUILDINGS) if (b.fx === 'comfort') c += b.v * lvl(S, b.id);
    for (const id in S.town.tech) { const f = TECH[id] && TECH[id].fx; if (f && f.comfort) c += f.comfort; }
    const sn = season(now).fx;
    c *= techMul(S, 'comfortM') * ext(S, 'comfort') * edictMul(S, 'comfort') * (sn.comfort || 1);
    if (feasting(S, now)) c *= 1 + T.FEAST_BONUS * (sn.feast || 1);
    return c;
  }
  // edicts in force (Corrupt Rites sleeps while you aren't corrupted)
  const corrupted = (S) => !!(S.meta && S.meta.corrupt > 0);
  const edictSlots = (S) => (lvl(S, 'hall') >= 5 ? 2 : lvl(S, 'hall') >= 1 ? 1 : 0);
  const edictOn = (S, id) => lvl(S, 'hall') > 0 && (S.town.edicts || []).includes(id) && !!EDICT[id] && (!EDICT[id].corrupt || corrupted(S));
  function edictMul(S, key) {
    let m = 1;
    for (const id of S.town.edicts || []) if (edictOn(S, id) && EDICT[id].fx[key]) m *= EDICT[id].fx[key];
    return m;
  }
  const edictWait = (S, now) => Math.max(0, ((S.town.edictAt || 0) + T.EDICT_SWITCH * 1000 - (now == null ? Date.now() : now)) / 1000);
  // Turns an edict on or off. With every slot full, the newest one replaces the oldest.
  function toggleEdict(S, id, now) {
    now = now == null ? Date.now() : now;
    const t = S.town, slots = edictSlots(S);
    if (!EDICT[id] || !slots || edictWait(S, now) > 0) return false;
    if (EDICT[id].corrupt && !corrupted(S) && !t.edicts.includes(id)) return false;
    if (t.edicts.includes(id)) t.edicts = t.edicts.filter((x) => x !== id);
    else { t.edicts.push(id); while (t.edicts.length > slots) t.edicts.shift(); }
    t.edictAt = now;
    clampJobs(t);
    return true;
  }
  const guardMul = (S) => techMul(S, 'guard') * edictMul(S, 'guard');
  const feasting = (S, now) => (now == null ? Date.now() : now) < (S.town.feastUntil || 0);
  // Mood: comfort per goblin. Sets how fast goblins work (×0.5 to ×1.5).
  function mood(S, now) {
    const ratio = comfort(S, now) / Math.max(1, S.town.pop);
    const work = Math.max(0.5, Math.min(1.5, 0.5 + 0.5 * ratio));
    let label;
    if (work < 0.75) label = 'Miserable';
    else if (work < 0.95) label = 'Grumpy';
    else if (work < 1.1) label = 'Content';
    else if (work < 1.4) label = 'Happy';
    else label = 'Joyful';
    return { ratio, work, label, fight: 1 + 0.5 * Math.max(0, work - 1) };
  }
  function jobMul(S, id, now) {
    const j = JOB[id];
    let m = 1;
    if (j.bld) m += T.BLD_STEP * lvl(S, j.bld);
    if (id === 'tinkerer') m += BLD.library.v * lvl(S, 'library');
    for (const tid in S.town.tech) { const f = TECH[tid] && TECH[tid].fx; if (f && f.job && f.job[id]) m *= f.job[id]; }
    const sres = season(now).fx.res;
    m *= (1 + BLD.hall.v * lvl(S, 'hall')) * edictMul(S, 'gather') * (sres && sres[j.res] ? sres[j.res] : 1);
    if (id === 'tinkerer') m *= edictMul(S, 'ideas'); else m *= edictMul(S, 'others');
    if (id === 'forager') m *= edictMul(S, 'food');
    return m * techMul(S, 'gather') * ext(S, 'gather') * (id === 'tinkerer' ? ext(S, 'ideas') : 1);
  }
  // Output of one worker per second, mood included.
  function perWorker(S, id, now) { return JOB[id].rate * jobMul(S, id, now) * mood(S, now).work; }
  function rates(S, now) {
    const r = { food: 0, wood: 0, stone: 0, iron: 0, ideas: 0 };
    if (!S.town.unlocked) return r;
    const w = mood(S, now).work;
    for (const j of JOBS) if (j.res && S.town.jobs[j.id]) r[j.res] += S.town.jobs[j.id] * j.rate * jobMul(S, j.id, now) * w;
    return r;
  }
  // Hatching: one goblin at a time, slower as the village grows, faster when everyone is happy.
  const hatchTime = (S, now) => T.HATCH_TIME * Math.pow(T.HATCH_SLOW, S.town.hatched) / (ext(S, 'hatch') * (season(now).fx.hatch || 1) * edictMul(S, 'hatch'));
  const hatchFood = (S) => Math.round(T.HATCH_FOOD * Math.pow(T.HATCH_FOOD_G, S.town.hatched));
  function bldCost(id, level) {
    const b = BLD[id], c = {};
    const k = id === 'huts' ? level - 1 : level; // you start with one hut
    for (const r in b.cost) c[r] = Math.round(b.cost[r] * Math.pow(b.g, k));
    return c;
  }
  function canPay(S, cost) { for (const r in cost) if ((S.town.res[r] || 0) < cost[r]) return false; return true; }
  function pay(S, cost) { for (const r in cost) S.town.res[r] -= cost[r]; }
  // How close you are to affording something (0..1), for progress fills.
  function progress(S, cost) {
    let p = 1;
    for (const r in cost) p = Math.min(p, (S.town.res[r] || 0) / cost[r]);
    return Math.max(0, Math.min(1, p));
  }

  // ------------------------------------------------------------------ effects on the fight
  const NEUTRAL = { warband: 1, tap: 1, gold: 1, xp: 1, boss: 0, offline: 1, offCap: 1, all: 1, guardFight: 1, steal: 1, mood: null };
  function fx(S, now) {
    if (!S.town || !S.town.unlocked) return NEUTRAL;
    const m = mood(S, now);
    const forge = 1 + BLD.forge.v * lvl(S, 'forge');
    const guards = (S.town.jobs.guard || 0) * guardMul(S);
    let boss = 0, noSteal = false;
    for (const id in S.town.tech) { const f = TECH[id] && TECH[id].fx; if (f && f.boss) boss += f.boss; if (f && f.noSteal) noSteal = true; }
    return {
      warband: techMul(S, 'warband') * (1 + BLD.walls.v * lvl(S, 'walls')) * forge * m.fight * edictMul(S, 'warband'),
      tap: forge,
      gold: techMul(S, 'gold') * (1 + BLD.market.v * lvl(S, 'market')),
      xp: techMul(S, 'xp') * (1 + BLD.pit.v * lvl(S, 'pit')),
      boss,
      offline: techMul(S, 'offline'),
      offCap: techMul(S, 'offCap'),
      all: techMul(S, 'all') * (1 + BLD.shrine.v * lvl(S, 'shrine')),
      guardFight: 1 + T.GUARD_FIGHT * guards,
      steal: noSteal ? 0 : Math.max(0.2, 1 - T.GUARD_STEAL * guards) * edictMul(S, 'steal'),
      mood: m,
    };
  }

  // ------------------------------------------------------------------ actions
  // New goblins follow the split you last set by hand; with no split, they wait for orders.
  function autoAssign(S) {
    const t = S.town;
    let best = null, bestR = Infinity, bestW = 0;
    for (const j of JOBS) {
      const w = t.split[j.id] || 0;
      if (w <= 0 || !jobOpen(S, j.id)) continue;
      const r = (t.jobs[j.id] || 0) / w;
      if (r < bestR - 1e-9 || (Math.abs(r - bestR) < 1e-9 && w > bestW)) { best = j.id; bestR = r; bestW = w; }
    }
    if (best) t.jobs[best]++;
    return best;
  }
  function setJob(S, id, delta) {
    const t = S.town;
    if (!jobOpen(S, id)) return 0;
    let d = delta;
    if (d > 0) d = Math.min(d, idle(t));
    if (d < 0) d = -Math.min(-d, t.jobs[id]);
    if (!d) return 0;
    t.jobs[id] += d;
    for (const j of JOBS) t.split[j.id] = t.jobs[j.id];
    return d;
  }
  function build(S, id) {
    const level = lvl(S, id);
    const cost = bldCost(id, level);
    if (!bldOpen(S, id) || !canPay(S, cost)) return false;
    pay(S, cost);
    S.town.bld[id] = level + 1;
    return true;
  }
  function research(S, id) {
    const t = TECH[id];
    if (techState(S, id) !== 'open' || !canPay(S, t.cost)) return false;
    pay(S, t.cost);
    S.town.tech[id] = 1;
    return true;
  }
  const feastCost = (S) => Math.round(Math.max(T.FEAST_FOOD * S.town.pop, rates(S).food * T.FEAST_TIME));
  function feast(S, now) {
    now = now == null ? Date.now() : now;
    const c = feastCost(S);
    if (!lvl(S, 'feast') || S.town.res.food < c || feasting(S, now)) return false;
    S.town.res.food -= c;
    S.town.feastUntil = now + T.FEAST_TIME * 1000;
    S.town.feasts = (S.town.feasts || 0) + 1;
    return true;
  }
  // Goblins rescued from conquered regions. Counts each region once, ever.
  function rescue(S, regions) {
    const t = S.town;
    const n = Math.max(0, regions - t.rescued);
    if (!n) return 0;
    t.rescued += n;
    t.pop += T.RESCUE * n;
    if (t.auto) for (let k = 0; k < T.RESCUE * n; k++) autoAssign(S);
    return T.RESCUE * n;
  }

  // ---- expeditions
  const expSlots = (S) => (lvl(S, 'camp') >= 3 ? 2 : lvl(S, 'camp') >= 1 ? 1 : 0);
  const campMul = (S) => 1 + BLD.camp.v * Math.max(0, lvl(S, 'camp') - 1);
  // Why a trip can't leave right now, or '' if it can.
  function expBlock(S, id) {
    const t = S.town, trip = TRIP[id];
    if (!trip) return 'Unknown trip.';
    if (!expSlots(S)) return 'Build the Expedition Camp first.';
    if (t.exp.length >= expSlots(S)) return expSlots(S) === 1 ? 'Your party is still out. Camp level 3 lets two go at once.' : 'Both parties are still out.';
    if (home(t) - trip.party < 2) return `Needs ${trip.party} goblins to spare.`;
    return '';
  }
  // Sends a party. They come from idle goblins first, then from the busiest jobs.
  function sendExp(S, id, now) {
    now = now == null ? Date.now() : now;
    if (expBlock(S, id)) return false;
    const t = S.town, trip = TRIP[id];
    t.exp.push({ id, start: now, end: now + trip.sec * 1000, party: trip.party });
    while (assigned(t) > home(t)) {
      let big = null;
      for (const j of JOBS) if ((t.jobs[j.id] || 0) > 0 && (!big || t.jobs[j.id] > t.jobs[big])) big = j.id;
      if (!big) break;
      t.jobs[big]--;
    }
    return true;
  }
  // Town resources a returning party carries. Gold and keys are added by the caller.
  function expLoot(S, e, now) {
    const trip = TRIP[e.id], r = rates(S, now), out = {};
    const k = trip.sec * T.EXP_RES * (e.party / 5) * campMul(S);
    for (const id of RES_IDS) out[id] = r[id] * k;
    if (!out.food) out.food = e.party * trip.sec * 0.05 * campMul(S); // they forage a little on the way back
    return out;
  }
  // Brings a finished party home. Returns { trip, res } or null.
  function claimExp(S, i, now) {
    now = now == null ? Date.now() : now;
    const t = S.town, e = t.exp[i];
    if (!e || now < e.end) return null;
    const res = expLoot(S, e, now);
    t.exp.splice(i, 1);
    for (const id of RES_IDS) { t.res[id] += res[id]; t.made[id] += res[id]; }
    t.expDone = (t.expDone || 0) + 1;
    if (t.auto) for (let k = 0; k < e.party; k++) autoAssign(S);
    return { trip: TRIP[e.id], e, res };
  }
  const expReady = (S, now) => (S.town.exp || []).filter((e) => (now == null ? Date.now() : now) >= e.end).length;

  // Advance the town by dt seconds. Returns how many goblins hatched.
  function tick(S, dt, now) {
    const t = S.town;
    if (!t.unlocked || !(dt > 0)) return 0;
    const r = rates(S, now);
    for (const id of RES_IDS) { t.res[id] += r[id] * dt; t.made[id] += r[id] * dt; }
    let born = 0;
    const cap = housing(S);
    if (t.pop >= cap) { t.hatchT = 0; return 0; }
    t.hatchT += dt * mood(S, now).work;
    for (let guard = 0; guard < 500 && t.pop < cap; guard++) {
      const need = hatchTime(S, now), food = hatchFood(S);
      if (t.hatchT < need) break;
      if (t.res.food < food) { t.hatchT = need; break; } // waiting for food
      t.res.food -= food;
      t.hatchT -= need;
      t.pop++; t.hatched++; born++;
      if (t.auto) autoAssign(S);
    }
    if (t.pop >= cap) t.hatchT = 0;
    return born;
  }
  // Time away, in chunks so new workers and housing are counted as they arrive.
  function advance(S, sec, now) {
    const t = S.town;
    if (!t.unlocked || sec <= 0) return null;
    const before = Object.assign({}, t.res), made0 = Object.assign({}, t.made), pop0 = t.pop;
    const steps = Math.min(400, Math.max(1, Math.ceil(sec / 30)));
    const dt = sec / steps;
    const start = (now == null ? Date.now() : now) - sec * 1000;
    let born = 0;
    for (let k = 0; k < steps; k++) born += tick(S, dt, start + (k + 1) * dt * 1000);
    const gained = {};
    for (const id of RES_IDS) gained[id] = t.made[id] - made0[id];
    return { gained, born, pop0, before };
  }

  const Town = { T, RES, RES_IDS, JOBS, JOB, BUILDINGS, BLD, TECHS, TECH, ERAS,
    freshTown, fixTown, has, lvl, idle, assigned, away, home, jobOpen, resOpen, bldOpen, techState, techGate,
    housing, comfort, feasting, mood, jobMul, perWorker, rates, hatchTime, hatchFood, bldCost, canPay, progress,
    fx, autoAssign, setJob, build, research, feastCost, feast, rescue, tick, advance, techMul, guardMul,
    SEASONS, season, EDICTS, EDICT, edictSlots, edictOn, edictMul, edictWait, toggleEdict, corrupted,
    TRIPS, TRIP, expSlots, campMul, expBlock, sendExp, expLoot, claimExp, expReady };
  GH.Town = Town;
})(typeof window !== 'undefined' ? window : globalThis);
