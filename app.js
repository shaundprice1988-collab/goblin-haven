'use strict';
(function () {
  const GH = window.GH, Art = window.GHArt;
  const { K, FORMS, FORM, FAMILY, UNITS } = GH;
  const $ = (s) => document.querySelector(s);
  const SAVE_KEY = 'goblinhaven.save.v1';
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ------------------------------------------------------------------ words
  const FIXED_NAMES = ['Sir_Lagsalot', 'HealzPlz', 'AFK_Andy', 'MomSaysBedtime', 'NotABot_1287', 'DPSorDie', 'TankYouVeryMuch',
    'CasualCarl', 'StabbyMcStab', 'CritHappens', 'LootGoblinLOL', 'Respawnerd', 'ManaPotionMarv', 'GankLord', 'PixelPaladin',
    'KyleTheFighter', 'NoobPwner2010', 'QuestSkipper', 'EarCollector', 'OneMoreLevel'];
  const NAME_A = ['Dark', 'Shadow', 'Crit', 'Loot', 'Tank', 'Pixel', 'Dragon', 'Mana', 'Stab', 'Lag', 'Grind', 'Speed', 'Blade', 'Zap', 'Bonk', 'Farm', 'Epic', 'Rage', 'Silent', 'Frost'];
  const NAME_B = ['Slayer', 'Lord', 'Master', 'Hunter', 'Knight', 'Queen', 'Boi', 'Wizard', 'Ninja', 'Gamer', 'Paladin', 'Reaper'];
  const NAME_C = ['', '', '', '99', '420', '_TTV', 'x', '2010', '_OG', '7', 'XD'];
  function randomName(r) {
    if (r() < 0.35) return FIXED_NAMES[Math.floor(r() * FIXED_NAMES.length)];
    const n = NAME_A[Math.floor(r() * NAME_A.length)] + NAME_B[Math.floor(r() * NAME_B.length)] + NAME_C[Math.floor(r() * NAME_C.length)];
    return r() < 0.15 ? `xX_${n}_Xx` : n;
  }
  const CLASSES = ['warrior', 'mage', 'ranger', 'cleric', 'rogue'];
  const SPAWN_LINES = ['free xp lol', 'goblin farm time', 'need 3 more goblin ears for the quest', 'why is this goblin staring at me',
    'is this mob bugged?', 'ez xp', 'afk farming brb', 'just one more level', 'do these even drop anything', 'who keeps clearing this spawn',
    'mudhollow still best xp/hr', 'goblins don’t fight back right?', 'lfg goblin grind', 'that goblin has a NAMEPLATE??'];
  const DEATH_LINES = ['wtf', 'REPORTED', 'that goblin crit me??', 'lag!!', 'my durability!!', 'since when do goblins do that',
    'bugged mob, filing a ticket', 'gg i guess', 'devs pls nerf goblins', 'uh guys?', 'not again', 'respawning…',
    'how is it that strong', 'I’m uninstalling', 'it dodged??'];
  const BOSS_LINES = [
    ['ok who broke my farm', 'my whole farming route!!'],
    ['Leaf Wardens, take positions.', 'Fall back to the treeline!'],
    ['By order of Brightvale, disperse!', 'Tell… the mayor…'],
    ['welcome to MY swamp', 'the bog… betrayed me'],
    ['my skeletons outnumber your goblins', 'that’s not how aggro works!'],
    ['it’s too cold for this', 'brrr… brb'],
    ['everything burns. even goblins.', 'my build was perfect!!'],
    ['No green thing passes these walls.', 'The keep… has fallen.'],
    ['I own half this server’s economy', 'my auction house listings…'],
    ['Silver Wing, smite the corruption!', 'This isn’t in the patch notes…'],
    ['Rank one doesn’t lose to a starter mob.', '…gg. Well played, goblin.'],
    ['Unauthorized entity detected. Initiating deletion.', 'You can’t… delete… the admin…'],
  ];
  const RAID_GUILDS = ['Mob Grinders', 'Ear Collectors', 'Weekend Warriors', 'Daily Quest Club', 'Loot Goblins', 'Speedrun Squad', 'Casual Chaos', 'Night Owls'];
  const RAID_SHOUTS = ['raid night! clear the goblin camp', 'everyone stack on the goblin', 'pull the whole village, go go go', 'tank, grab aggro!'];

  // ------------------------------------------------------------------ number formatting
  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc'];
  let notation = 'letters';
  function fmt(x, decimals) {
    if (!isFinite(x)) return '∞';
    if (x < 0) return '-' + fmt(-x, decimals);
    if (x < 100 && decimals) { const v = Math.floor(x * 10) / 10; return Number.isInteger(v) ? String(v) : v.toFixed(1); }
    if (x < 1000) return String(Math.floor(x));
    if (notation !== 'letters' && x >= 1e6) {
      const e = notation === 'eng' ? Math.floor(Math.log10(x) / 3) * 3 : Math.floor(Math.log10(x));
      const v = Math.floor((x / Math.pow(10, e)) * 100 + 1e-9) / 100;
      return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + 'e' + e;
    }
    const tier = Math.floor(Math.log10(x) / 3);
    if (tier >= SUFFIX.length) return x.toExponential(2).replace('e+', 'e');
    const v = x / Math.pow(10, tier * 3);
    let s;
    if (v < 10) s = (Math.floor(v * 100) / 100).toFixed(2);
    else if (v < 100) s = (Math.floor(v * 10) / 10).toFixed(1);
    else s = String(Math.floor(v));
    if (s.includes('.')) s = s.replace(/\.?0+$/, '');
    return s + SUFFIX[tier];
  }
  function fmtTime(sec) {
    sec = Math.floor(sec);
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ${m % 60}m`;
    return `${Math.floor(h / 24)}d ${h % 24}h`;
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ------------------------------------------------------------------ state
  const BACKUP_KEY = 'goblinhaven.backup.v1';
  let restoredFromBackup = false;
  // Turns saved JSON into a full state, filling in anything an older version didn't have. Throws if it isn't a save.
  function parseSave(raw) {
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object' || !Array.isArray(o.owned) || !o.codex || typeof o.codex !== 'object') throw new Error('not a save');
    const s = Object.assign(GH.fresh(), o);
    s.owned = UNITS.map((_, i) => Math.max(0, Number(o.owned && o.owned[i]) || 0));
    s.ups = o.ups && typeof o.ups === 'object' ? o.ups : {};
    s.codex = o.codex;
    if (!FORM[s.form]) s.form = 'goblin';
    s.town = GH.Town.fixTown(o.town);
    s.meta = GH.Meta.fixMeta(o.meta);
    // saves from before run tracking: assume the run has been going for up to an hour
    if (!isFinite(o.runStart) || !o.runStart) s.runStart = Date.now() - Math.min(Number(o.played) || 0, 3600) * 1000;
    if (!Array.isArray(s.regionAt)) s.regionAt = [];
    if (!isFinite(s.runConq0)) s.runConq0 = 0;
    for (const k of ['gold', 'goldRun', 'goldEver', 'xp', 'shards', 'kills', 'killsEver', 'taps', 'played']) if (!isFinite(s[k])) s[k] = 0;
    return s;
  }
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try { return parseSave(raw); } catch (e) { /* damaged: try the backup */ }
    try {
      const b = JSON.parse(localStorage.getItem(BACKUP_KEY));
      if (b && b.data) { const s = parseSave(b.data); restoredFromBackup = true; return s; }
    } catch (e) { /* no usable backup */ }
    return null;
  }
  function save() {
    S.saved = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ }
  }
  let S = load() || GH.fresh();
  notation = S.meta.notation || 'letters';
  let D = GH.derive(S);
  function derive() { D = GH.derive(S); }
  const NO_LIVE = { dps: 1, tap: 1, gold: 1 };
  // short-lived buffs such as Dirty Tricks come from meta.js when it has them
  const live = () => (GH.Meta.live ? GH.Meta.live(S) : NO_LIVE);
  const rallied = () => Date.now() < (S.rallyUntil || 0);
  const rallyM = () => (rallied() ? (S.rallyM || 2) : 1);
  const dpsNow = () => D.dps * rallyM() * (fight ? D.guardFight : 1) * live().dps;
  const raidGap = () => (300 + Math.random() * 240) * 1000 * (GH.ask('raidGapScale') || 1);

  // ------------------------------------------------------------------ scene
  const cv = $('#cv');
  const scene = Art.createScene(cv);
  new ResizeObserver(() => scene.resize()).observe(cv);
  scene.resize();

  let enemy = null;
  let nextSpawnAt = 0;
  let fight = null;              // { kind: 'boss' | 'raid', end, dur }
  let raidPending = false;
  let bossBlockPower = 0;        // after a failed leader fight, wait until you're 25% stronger
  let lastNow = performance.now();

  function heroView() {
    return {
      region: Math.min(S.region, GH.FINAL_REGION),
      regionData: GH.region(S.region),
      heroLook: Art.formLook(FORM[S.form]),
      heroForm: S.form,
      owned: S.owned,
      ranks: S.owned.map(GH.rankOf),
      goblins: GH.goblinCount(S),
      conquered: S.conquered,
      palisade: !!S.ups.d1,
      tower: !!S.ups.d3,
      glitch: GH.Meta.corruptLvl(S),
    };
  }

  function spawn(now) {
    if (raidPending) { raidPending = false; spawnRaid(now); return; }
    if (S.threat >= 10 && S.autoBoss && dpsNow() + D.heroTap > bossBlockPower * 1.25) { spawnBoss(now); return; }
    const special = GH.ask('spawnSpecial', now);
    if (special) { enemy = special; scene.setEnemy(enemy); return; }
    const s = GH.stageOf(S.region, S.threat);
    const seed = (Math.random() * 1e9) | 0;
    const r = Art.mulberry(seed);
    const cls = CLASSES[Math.floor(r() * CLASSES.length)];
    const hp = GH.hp(s) * D.hpM;
    enemy = { name: randomName(r), cls, level: s + 1, hp, maxHp: hp, born: now, walk: 0.45, look: Art.adventurerLook(cls, seed, false), stage: s };
    GH.emit('enemySpawn', enemy);
    scene.setEnemy(enemy);
    if (Math.random() < 0.22) chat(enemy.name, pick(SPAWN_LINES));
  }
  function spawnBoss(now) {
    const r = S.region, R = GH.region(r);
    const s = GH.stageOf(r, 9);
    const hp = GH.hp(s) * K.BOSS_HP * D.hpM;
    enemy = { name: R.boss, guild: R.guild, npc: !!R.npc, cls: R.bossCls, level: s + 2, hp, maxHp: hp, born: now, walk: 0.9,
      look: Art.adventurerLook(R.bossCls, 9000 + r, true), stage: s, boss: true };
    GH.emit('bossSpawn', enemy);
    GH.emit('enemySpawn', enemy);
    scene.setEnemy(enemy);
    const t = Math.max(5, Math.round((D.bossTime + (enemy.extraTime || 0)) * (enemy.timeM || 1)));
    fight = { kind: 'boss', end: now + 900 + t * 1000, dur: t };
    const lines = BOSS_LINES[r] || ['Patch incoming.', 'Rollback… failed…'];
    chat(R.boss, enemy.line || lines[0], R.bossCls === 'gm' ? 'gm' : (R.npc ? 'npc' : 'lead'));
    sys(enemy.intro || `Raid leader ${R.boss} has entered ${R.name}. Defeat them in ${t} seconds to take the region.`, 'gold', 'boss');
  }
  function spawnRaid(now) {
    const s = GH.stageOf(S.region, S.threat);
    const hp = GH.hp(s) * K.RAID_HP * D.hpM;
    const guild = pick(RAID_GUILDS);
    const looks = [0, 1, 2].map((k) => Art.adventurerLook(CLASSES[(k * 2 + Math.floor(Math.random() * 5)) % 5], (Math.random() * 1e9) | 0, false));
    enemy = { name: guild, guild, cls: 'warrior', level: s + 3, hp, maxHp: hp, born: now, walk: 0.8, looks, look: looks[1], stage: s, raid: true };
    GH.emit('raidSpawn', enemy);
    GH.emit('enemySpawn', enemy);
    scene.setEnemy(enemy);
    const t = Math.max(5, Math.round((D.raidTime + (enemy.extraTime || 0)) * (enemy.timeM || 1)));
    fight = { kind: 'raid', end: now + 800 + t * 1000, dur: t };
    chat(randomName(Math.random), enemy.shout || pick(RAID_SHOUTS));
  }

  function onKill(now) {
    const e = enemy;
    if (!e || e.dead) return;
    if (e.raid) {
      const g = GH.goldAt(e.stage) * K.RAID_GOLD * D.goldM * D.raidGoldM * (e.goldM || 1) * live().gold;
      earn(g);
      S.raidsWon++;
      const rt = D.rallyTime + (e.rallyBonus || 0);
      S.rallyM = e.rallyM || 2;
      S.rallyUntil = Date.now() + rt * 1000;
      scene.kill(12);
      scene.float('+' + fmt(g), '#F2C14E', true);
      sys(`Raid repelled. <${e.guild}> dropped ${fmt(g)} shinies, and your goblins are rallied: ${S.rallyM === 2 ? 'double' : S.rallyM === 3 ? 'triple' : '×' + S.rallyM} damage for ${rt} seconds.`, 'gold');
      chat(randomName(Math.random), 'raid wipe. who pulled the whole village??');
      fight = null;
      S.nextRaid = Date.now() + raidGap();
      GH.emit('raidWon', e, g);
    } else if (e.boss) {
      scene.kill(12);
      fight = null;
      conquer(e);
    } else if (e.special) {
      scene.kill(10);
      fight = null;
      GH.emit('specialKill', e);
    } else {
      const g = GH.goldAt(e.stage) * D.goldM * live().gold;
      earn(g);
      gainXp(GH.xpAt(e.stage) * D.xpM);
      S.kills++; S.killsEver++;
      scene.kill(3);
      if (S.threat < 10) {
        S.threat++;
        if (S.threat === 10 && !S.autoBoss) sys(`${GH.region(S.region).name} is ready. Fight the raid leader when you’re ready.`, '', 'ready');
      }
      S.best = Math.max(S.best, GH.stageOf(S.region, S.threat));
      if (Math.random() < 0.3) chat(e.name, pick(DEATH_LINES));
      GH.emit('kill', e, g);
    }
    nextSpawnAt = now + 250;
  }

  function fightFailed(now) {
    const e = enemy;
    if (!fight || !e) return;
    const kind = fight.kind;
    if (kind === 'boss') {
      bossBlockPower = dpsNow() + D.heroTap;
      chat(e.name, 'lol nice try', e.npc ? 'npc' : 'lead');
      sys(`${e.name} held out. Grow your warband, then fight them again.`, 'warn');
    } else if (kind === 'raid') {
      const lost = S.gold * D.raidSteal * (e.stealM || 1);
      S.gold -= lost;
      S.raidsLost++;
      if (lost > 0) sys(`<${e.guild}> looted ${fmt(lost)} shinies and left. Guards and defenses help next time.`, 'warn');
      else sys(`<${e.guild}> gave up. Mudhollow is a safe zone, so they couldn’t loot a thing.`, 'gold');
      S.nextRaid = Date.now() + raidGap();
    }
    fight = null;
    GH.emit(kind === 'boss' ? 'bossFail' : kind === 'raid' ? 'raidLost' : 'fightFailed', e, kind);
    e.dead = true; e.deadT = 0.2;
    nextSpawnAt = now + 500;
    render(true);
  }

  function earn(g) { S.gold += g; S.goldRun += g; S.goldEver += g; }

  function conquer(e) {
    const r = S.region, R = GH.region(r);
    const s = GH.stageOf(r, 9);
    const g = GH.goldAt(s) * K.BOSS_GOLD * D.goldM * live().gold;
    earn(g);
    gainXp(GH.xpAt(s) * K.BOSS_XP * D.xpM);
    scene.float('+' + fmt(g), '#F2C14E', true);
    const lines = BOSS_LINES[r] || ['Patch incoming.', 'Rollback… failed…'];
    chat(R.boss, lines[1], R.bossCls === 'gm' ? 'gm' : (R.npc ? 'npc' : 'lead'));
    const first = S.conquered < r + 1;
    S.conquered = Math.max(S.conquered, r + 1);
    S.bestRegionEver = Math.max(S.bestRegionEver || 0, S.conquered);
    S.region = r + 1;
    S.threat = 0;
    S.regionAt.push(Math.round(GH.Meta.runSeconds(S)));
    bossBlockPower = 0;
    derive();
    sys(`Region conquered: ${R.name} is now goblin territory.`, 'gold');
    afterConquest(r);
    GH.emit('conquer', r, first, e || null);
    // evolutions that open up when this region falls
    if (first) for (const f of FORMS) if (f.req && f.req.region === r && formVisible(f)) sys(`New evolution path open: ${f.name}.`, 'glitch');
    if (S.conquered === GH.ROLLBACK_AT && !S.rollbacks) sys('Server rollbacks are now possible. Check the World tab when your progress slows.', '', 'rb');
    if (r === GH.FINAL_REGION && !S.runWon) { const firstWin = !S.won; S.won = true; S.runWon = true; save(); if (firstWin || GH.ask('victoryAgain')) setTimeout(showVictory, 1200); }
    render(true);
  }

  // ------------------------------------------------------------------ hero
  function gainXp(x, quiet) {
    const f = FORM[S.form];
    S.xp += x;
    let ups = 0;
    while (S.level < f.maxLv) {
      const need = GH.xpNeed(f.tier, S.level);
      if (S.xp < need) break;
      S.xp -= need; S.level++; ups++;
    }
    if (S.level >= f.maxLv) S.xp = Math.min(S.xp, GH.xpNeed(f.tier, S.level));
    if (ups) {
      if (S.level > (S.meta.c.maxLv || 1)) S.meta.c.maxLv = S.level;
      derive();
      GH.emit('levelUp', S.level, quiet);
      if (!quiet) {
        sys(`Level up! ${f.name} Lv ${S.level}${f.maxLv !== Infinity ? ` of ${f.maxLv}` : ''}.`, '', 'lvl');
        if (S.level >= f.maxLv && !f.final) sys(`Maximum level reached. Evolution available: open the Hero tab.`, 'glitch', 'evo');
      }
    }
    return ups;
  }
  function evoReady() { const f = FORM[S.form]; return !f.final && S.level >= f.maxLv; }
  function canEvolveTo(id) { const c = FORM[id]; return evoReady() && FORM[S.form].children.includes(id) && GH.reqMet(c.req, S); }
  function formVisible(f) {
    if (S.codex[f.id] || f.id === S.form) return true;
    const parentKnown = f.parents.some((p) => S.codex[p] || p === S.form);
    if (!parentKnown) return false;
    if (f.secret) return GH.reqMet(f.req, S);
    return true;
  }
  function evolve(id) {
    if (!canEvolveTo(id)) return;
    const f = FORM[id];
    S.form = id; S.level = 1; S.xp = 0;
    const isNew = !S.codex[id];
    S.codex[id] = 1;
    derive();
    scene.corruptFlash();
    buzz(60);
    sys(`Evolution complete. You are now ${/^[AEIOU]/.test(f.name) ? 'an' : 'a'} ${f.name}.`, 'glitch');
    if (isNew) sys(`Form remembered. Each remembered form makes everything 10% stronger, even after a rollback.`, '', 'codex');
    updatePortrait();
    GH.emit('evolve', id, isNew);
    save();
    render(true);
  }

  // ------------------------------------------------------------------ village and upgrades
  function buyQty(i) {
    if (S.buyMode === 'max') return Math.max(1, GH.maxAfford(i, S.owned[i], S.gold));
    if (S.buyMode === 'next') return GH.nextMilestone(S.owned[i]) - S.owned[i];
    return S.buyMode;
  }
  function buyUnit(i, qty, quiet) {
    const block = GH.ask('blockRecruit', i);
    if (block) { if (!quiet) sys(block, 'warn', 'block'); return false; }
    const k = qty || buyQty(i);
    const c = GH.costFor(i, S.owned[i], k);
    if (S.gold < c) return false;
    const before = GH.milestones(S.owned[i]);
    S.gold -= c;
    S.owned[i] += k;
    derive();
    if (!quiet) buzz(10);
    const gained = GH.milestones(S.owned[i]) - before;
    if (gained > 0) {
      const R = GH.RANKS[GH.rankOf(S.owned[i])];
      if (!quiet) sys(`${UNITS[i].name} ranked up: ${GH.rankName(S.owned[i])}! They hit ${gained > 1 ? `${Math.pow(2, gained)} times` : 'twice'} as hard.`, 'gold', 'ms' + i);
      scene.rankUp(i, `${GH.rankName(S.owned[i])}!`);
      if (!quiet) buzz(40);
      if (R && S.tab === 'village') { const r = unitRows[i]; if (r) { r.li.classList.remove('ranked'); void r.li.offsetWidth; r.li.classList.add('ranked'); } }
    }
    if (S.owned[i] === k && k > 0 && i > 0) sys(`${UNITS[i].name} joined your warband.`, '', 'join');
    GH.emit('buyUnit', i, k, quiet);
    if (!quiet) render(true);
    return true;
  }
  function buyUpgrade(u, quiet) {
    if (S.ups[u.id] || S.gold < u.cost || !GH.reqMet(u.req, S)) return false;
    const block = GH.ask('blockUpgrade', u);
    if (block) { if (!quiet) sys(block, 'warn', 'block'); return false; }
    S.gold -= u.cost;
    S.ups[u.id] = 1;
    derive();
    if (!quiet) buzz(10);
    sys(`${u.name}: ${u.desc}`, '', 'up');
    GH.emit('buyUpgrade', u, quiet);
    if (!quiet) render(true);
    return true;
  }

  // ------------------------------------------------------------------ rollback
  // opts.challenge: start the next run on a Hardcore Server. opts.transfer: allow it even when a rollback isn't possible yet (no data, no rollback counted).
  // opts.wipe: a server wipe. This run's data goes into root access instead, and corrupted data, exploits and exploit points reset.
  function rollback(opts) {
    opts = opts || {};
    const M = GH.Meta;
    const real = M.canRollback(S) && GH.runGain(S, S.conquered) >= 1;
    if (!real && !opts.transfer) return false;
    const gain = real ? GH.runGain(S, S.conquered) : 0;
    const wipe = !!opts.wipe && M.canWipe(S, gain);
    if (opts.wipe && !wipe) return false;
    GH.emit('beforeRollback', gain);
    const ep = real && !wipe ? Math.round(gain * M.epScale(S)) : 0;
    if (real) { M.logRun(S, gain, ep); S.meta.ep += ep; S.meta.epEver += ep; }
    let ra = 0;
    if (wipe) {
      ra = M.raGain(S, gain);
      S.meta.ra += ra; S.meta.wipes += 1;
      S.meta.ex = {}; S.meta.ep = 0; S.meta.binds = [];
    }
    const lastGold = S.goldRun;
    const keep = {
      name: S.name, introDone: true, codex: S.codex, shards: wipe ? 0 : S.shards + gain, rollbacks: S.rollbacks + (real ? 1 : 0), won: S.won,
      killsEver: S.killsEver, goldEver: S.goldEver, taps: S.taps, raidsWon: S.raidsWon, raidsLost: S.raidsLost, played: S.played,
      vibrate: S.vibrate, autoBoss: S.autoBoss, buyMode: S.buyMode, bestRegionEver: S.bestRegionEver, started: S.started, town: S.town,
      meta: S.meta,
    };
    GH.emit('keep', keep, S);
    S = Object.assign(GH.fresh(), keep);
    // Hardcore Servers start from nothing: no bound upgrades, no tutorial skip, no seed money
    const hard = !!(opts.challenge && M.CH[opts.challenge]);
    if (hard) S.challenge = opts.challenge;
    // what the patch notes let you keep
    S.meta.binds = S.meta.binds.filter((id) => GH.UPGRADES.some((u) => u.id === id)).slice(0, M.bindSlots(S));
    if (!hard) for (const id of S.meta.binds) S.ups[id] = 1;
    if (!hard && M.ms(S, 'skipTut') && !GH.ask('noSkip')) { S.conquered = 1; S.region = 1; S.runConq0 = 1; S.best = GH.stageOf(1, 0); }
    const seed = hard || wipe ? 0 : lastGold * M.seedFrac(S);
    if (seed > 0 && !GH.ask('noSeed')) S.gold = seed;
    derive();
    fight = null; raidPending = false; bossBlockPower = 0;
    enemy = null; scene.setEnemy(null); nextSpawnAt = performance.now() + 800;
    scene.corruptFlash();
    updatePortrait();
    save();
    setTab('hero');
    if (wipe) {
      sys('Server wipe complete. Every backup is gone, except the ones that are you.', 'glitch');
      sys(`Root access +${ra} (now ${S.meta.ra}). Each piece of corrupted data now counts ${fmt(GH.shardPct(S) * 100)}%, rollbacks give ${fmt(25 * S.meta.ra)}% more, and everything is ×${+M.raAll(S).toFixed(2)}.`, 'glitch', 'rb2');
    } else if (real) {
      sys('Server rollback complete. The world forgot you. Your data, and your town, didn’t.', 'glitch');
      sys(`Corrupted data: ${fmt(S.shards)}. Everything is ${fmt(S.shards * GH.shardPct(S) * 100)}% stronger. +${fmt(ep)} exploit points.`, 'glitch', 'rb2');
      const m = M.MILESTONES.find((x) => x.n === S.rollbacks);
      if (m) sys(`Patch ${m.patch} failed to remove you. ${m.gift}`, 'gold', 'patch');
    } else sys('Server transfer complete. The world forgot you; nothing was gained this time.', 'glitch');
    if (hard) sys(`Hardcore Server: ${M.CH[S.challenge].name}. ${M.CH[S.challenge].rule}`, 'warn', 'hc');
    if (seed > 0 && S.gold > 0) sys(`Seed money: you start with ${fmt(S.gold)} shinies.`, '', 'seed');
    GH.emit('rollback', gain, ep, real);
    return true;
  }

  // ------------------------------------------------------------------ messages
  const systack = $('#systack');
  const sysQueue = [];
  const sysByKey = {};
  function sys(text, kind, key) {
    if (!S.introDone) return;
    if (key && sysByKey[key] && sysByKey[key].isConnected) {
      const el = sysByKey[key];
      el.querySelector('.sm').textContent = text;
      clearTimeout(el._t);
      el._t = setTimeout(() => dropSys(el), 2600);
      return;
    }
    // a waiting message with the same key is replaced, and a long queue drops its oldest plain messages
    const q = key ? sysQueue.find((m) => m.key === key) : null;
    if (q) { q.text = text; q.kind = kind; return; }
    sysQueue.push({ text, kind, key });
    while (sysQueue.length > 4) {
      const k = sysQueue.findIndex((m) => !m.kind);
      sysQueue.splice(k >= 0 ? k : 0, 1);
    }
    pumpSys();
  }
  function pumpSys() {
    while (sysQueue.length && systack.children.length < 2) {
      const m = sysQueue.shift();
      const el = document.createElement('div');
      el.className = 'sysmsg' + (m.kind ? ' ' + m.kind : '');
      el.innerHTML = `<span class="st">${m.kind === 'warn' ? 'Warning' : m.kind === 'glitch' ? 'Sys█em' : 'System'}</span><span class="sm"></span>`;
      el.querySelector('.sm').textContent = m.text;
      systack.appendChild(el);
      if (m.key) sysByKey[m.key] = el;
      el._t = setTimeout(() => dropSys(el), (m.kind === 'glitch' || m.kind === 'warn' ? 3800 : 2800) * (sysQueue.length > 1 ? 0.65 : 1));
    }
  }
  function dropSys(el) {
    el.classList.add('out');
    setTimeout(() => { el.remove(); pumpSys(); }, 300);
  }

  const chatEl = $('#chat');
  function chat(name, text, kind) {
    const d = document.createElement('div');
    if (kind) d.className = kind;
    d.innerHTML = `<b>${esc(name)}:</b> ${esc(text)}`;
    chatEl.appendChild(d);
    while (chatEl.children.length > 2) chatEl.firstChild.remove();
    setTimeout(() => d.remove(), 6500);
    return d;
  }

  function buzz(ms) { if (S.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } }

  // ------------------------------------------------------------------ rendering
  function set(el, prop, val) {
    const key = '_' + prop;
    if (el[key] === val) return;
    el[key] = val;
    if (prop === 'text') el.textContent = val;
    else if (prop === 'html') el.innerHTML = val;
    else if (prop === 'width') el.style.width = val;
  }
  function setClass(el, cls, on) { if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on); }

  function updatePortrait() { $('#portrait').src = Art.portrait(FORM[S.form], 88); }

  // corrupted name: a letter glitches now and then
  let glitchAt = 0, glitchIdx = -1;
  function displayName() {
    const n = S.name || 'Goblin';
    if (glitchIdx < 0 || glitchIdx >= n.length) return n;
    return n.slice(0, glitchIdx) + pick(['█', '▒', '#', '%', '0']) + n.slice(glitchIdx + 1);
  }

  function renderHud() {
    const now = Date.now();
    set($('#gold'), 'text', fmt(S.gold, true));
    set($('#dps'), 'text', fmt(dpsNow(), true));
    if (now > glitchAt) {
      glitchIdx = glitchIdx >= 0 ? -1 : Math.floor(Math.random() * Math.max(1, (S.name || 'x').length));
      glitchAt = now + (glitchIdx >= 0 ? 140 : 2500 + Math.random() * 4000);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) glitchIdx = -1;
    }
    set($('#ufName'), 'text', displayName());
    const f = FORM[S.form];
    set($('#ufForm'), 'text', f.name);
    set($('#ufLv'), 'text', f.final ? `Lv ${S.level}` : `Lv ${S.level}/${f.maxLv}`);
    const need = GH.xpNeed(f.tier, S.level);
    set($('#xpFill'), 'width', `${(evoReady() ? 100 : Math.min(100, (S.xp / need) * 100)).toFixed(1)}%`);
    setClass($('#unitframe'), 'evolve', evoReady());
    const buff = $('#buff');
    if (rallied()) { const m = S.rallyM || 2; buff.hidden = false; set(buff, 'text', `Rallied: ${m === 2 ? 'double' : m === 3 ? 'triple' : '×' + m} damage, ${Math.ceil((S.rallyUntil - now) / 1000)}s`); }
    else buff.hidden = true;
  }

  function renderRegionBar() {
    const R = GH.region(S.region);
    const lo = S.region * 10 + 1;
    set($('#rbName'), 'text', R.name);
    const sub = fight && fight.label ? fight.label : fight && fight.kind === 'raid' ? `Raid on your village: <${enemy && enemy.guild}>` :
      (S.threat >= 10 ? `Raid leader: ${R.boss} <${R.guild}>` : `Adventurers Lv ${lo}–${lo + 9}`);
    set($('#rbSub'), 'text', sub);
    const prog = $('#rbProgress');
    if (!prog.children.length) for (let k = 0; k < 10; k++) prog.appendChild(document.createElement('i'));
    for (let k = 0; k < 10; k++) setClass(prog.children[k], 'on', k < S.threat);
    setClass(prog, 'ready', S.threat >= 10);
    const timer = $('#rbTimer'), btn = $('#rbBtn');
    if (fight) {
      timer.hidden = false; btn.hidden = true;
      setClass(timer, 'leader', fight.kind === 'boss');
      const left = Math.max(0, (fight.end - performance.now()) / 1000);
      set($('#rbTimerFill'), 'width', `${Math.min(100, (left / fight.dur) * 100).toFixed(1)}%`);
      set($('#rbTimerText'), 'text', `${Math.ceil(Math.min(left, fight.dur))}s`);
    } else {
      timer.hidden = true;
      btn.hidden = !(S.threat >= 10);
    }
  }

  // ---- hero tab
  let heroSig = '';
  function renderHero(force) {
    const f = FORM[S.form];
    const ready = evoReady();
    const reqSig = ready ? f.children.map((c) => (GH.reqMet(FORM[c].req, S) ? 1 : 0) + (formVisible(FORM[c]) ? 2 : 0)).join('') : '';
    const sig = [S.form, S.level, ready, reqSig, Object.keys(S.codex).length, S.shards, S.name, S.conquered, S.meta && S.meta.ra].join('|');
    // the status numbers change often; rebuild the window when anything that shapes it changes
    if (sig !== heroSig || force) {
      heroSig = sig;
      buildEvoBox(f, ready);
    }
    const need = GH.xpNeed(f.tier, S.level);
    const tapBase = D.heroTap + D.dps * D.tapPct;
    const xpTxt = f.final ? `${fmt(S.xp)} / ${fmt(need)}` : (ready ? 'Max level' : `${fmt(S.xp)} / ${fmt(need)}`);
    const famColor = FAMILY[f.fam].color;
    const html = `<h3>Status</h3>
      <dl class="statgrid">
        <dt>Name</dt><dd><span class="corrupt name">${esc(S.name || 'Goblin')}</span></dd>
        <dt>Form</dt><dd><b style="color:${famColor}">${esc(f.name)}</b> <span class="muted">(${FAMILY[f.fam].name}, CR ${f.cr})</span></dd>
        <dt>Level</dt><dd class="v">${S.level}${f.final ? '' : ' / ' + f.maxLv}</dd>
        <dt>XP</dt><dd class="v">${xpTxt}</dd>
      </dl>
      <div class="bigxp"><span style="width:${(ready ? 100 : Math.min(100, (S.xp / need) * 100)).toFixed(1)}%"></span></div>
      <dl class="statgrid" style="margin-top:12px">
        <dt>Tap damage</dt><dd class="v">${fmt(tapBase, true)}</dd>
        ${D.crit ? `<dt>Critical hits</dt><dd class="v">${Math.round(D.crit * 100)}% for ×${D.critX}</dd>` : ''}
        <dt>Command</dt><dd class="v">Warband ×${fmt(D.command, true)}</dd>
        ${D.hpM < 1 ? `<dt>Plague</dt><dd class="v">Adventurers −${Math.round((1 - D.hpM) * 100)}% health</dd>` : ''}
        <dt>Remembered forms</dt><dd class="v">${D.codex} / ${FORMS.length} (+${D.codex * 10}%)</dd>
        ${S.shards ? `<dt>Corrupted data</dt><dd class="v corrupt">${fmt(S.shards)} (+${fmt(S.shards * GH.shardPct(S) * 100)}%)</dd>` : ''}
        ${S.meta && S.meta.ra ? `<dt>Root access</dt><dd class="v corrupt">${S.meta.ra} (everything ×${+GH.Meta.raAll(S).toFixed(2)})</dd>` : ''}
      </dl>
      <p class="perk"><b>${esc(f.name)}.</b> ${esc(f.perk)}${f.final ? ' This is a final form: it has no level cap.' : ''}</p>`;
    set($('#statusWin'), 'html', html);
  }

  function buildEvoBox(f, ready) {
    const box = $('#evoBox');
    if (!ready) { box.innerHTML = ''; return; }
    const cards = f.children.map((cid) => {
      const c = FORM[cid];
      const vis = formVisible(c);
      const met = GH.reqMet(c.req, S);
      const fam = FAMILY[c.fam];
      return `<div class="evo-card" style="--fam:${fam.color}">
        <img src="${Art.portrait(c, 96, !vis)}" alt="">
        <div>
          <div class="ename">${vis ? esc(c.name) : '???'}<small>${fam.name} · CR ${c.cr}</small></div>
          <p>${vis ? esc(c.perk) : 'An evolution you haven’t discovered yet.'}</p>
          ${c.req ? `<p class="${met ? '' : 'req'}">${met ? 'Requirement met: ' : 'Requires you to '}${esc(GH.reqText(c.req))}.</p>` : ''}
        </div>
        <div class="actions">
          <button type="button" class="primary evo" data-evo="${cid}" ${met ? '' : 'disabled'}>Evolve</button>
          <button type="button" class="secondary" data-info="${cid}">Details</button>
        </div>
      </div>`;
    }).join('');
    box.innerHTML = `<div class="sysw glitch"><h3>Evolution available</h3>
      <p class="muted small" style="margin:0 0 10px">Choose your next form. Your level goes back to 1. Until your next server rollback, there is no going back.</p>
      <div class="evo-cards">${cards}</div></div>`;
  }
  $('#evoBox').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.info) openForm(b.dataset.info);
    if (b.dataset.evo) confirmEvolve(b.dataset.evo);
  });
  function confirmEvolve(id) {
    const c = FORM[id];
    confirmAsk(`Evolve into ${c.name}?`, `${c.perk} Your level resets to 1, and you can’t change back until the next server rollback.`, 'Evolve', () => evolve(id));
  }

  // ---- village tab
  const unitRows = [];
  let lockedRow = null;
  function buildUnitRows() {
    const ul = $('#unitList');
    UNITS.forEach((u, i) => {
      const li = document.createElement('li');
      li.className = 'row';
      li.innerHTML = `<button type="button" class="unit-icon" aria-label="See the ranks of ${esc(u.name)}"><img alt="" src="${Art.unitIcon(i, 80, 0)}"><span class="owned">0</span></button>
        <div class="info"><div class="name">${esc(u.name)}</div><div class="detail"></div><div class="next"></div></div>
        <button class="buy" type="button"><span class="fill"></span><span class="lbl">Recruit 1</span><span class="cost">0</span></button>`;
      const r = { li, icon: li.querySelector('.unit-icon'), img: li.querySelector('.unit-icon img'), rank: -1, owned: li.querySelector('.owned'), detail: li.querySelector('.detail'), next: li.querySelector('.next'),
        btn: li.querySelector('.buy'), fill: li.querySelector('.fill'), lbl: li.querySelector('.lbl'), cost: li.querySelector('.cost') };
      r.btn.addEventListener('click', () => buyUnit(i));
      r.icon.addEventListener('click', () => openRanks(i));
      ul.appendChild(li);
      unitRows.push(r);
    });
    lockedRow = document.createElement('li');
    lockedRow.className = 'row locked';
    lockedRow.innerHTML = `<div class="unit-icon"><img alt=""></div><div class="info"><div class="name">Unknown recruits</div><div class="detail"></div></div><div></div>`;
    ul.appendChild(lockedRow);
  }
  function renderVillage(force) {
    if (S.tab !== 'village' && !force) return;
    set($('#villageHead'), 'html', `<b>${fmt(GH.goblinCount(S))}</b> goblins in your warband`);
    let firstHidden = -1;
    for (let i = 0; i < UNITS.length; i++) {
      const r = unitRows[i];
      const revealed = i === 0 || S.owned[i] > 0 || S.owned[i - 1] > 0;
      r.li.hidden = !revealed;
      if (!revealed) { if (firstHidden < 0) firstHidden = i; continue; }
      const own = S.owned[i];
      set(r.owned, 'text', fmt(own));
      const rk = GH.rankOf(own), R = GH.RANKS[rk];
      if (r.rank !== rk) { r.rank = rk; r.img.src = Art.unitIcon(i, 80, rk); r.icon.style.setProperty('--rk', R.color); setClass(r.icon, 'ranked', rk > 0); }
      const each = D.unitDps[i] * rallyM() * live().dps;
      set(r.detail, 'html', own > 0 ? `<span class="rank" style="color:${R.color}">${esc(GH.rankName(own))}</span> · <span class="num">${fmt(each * own, true)}</span> damage/s`
        : `<span class="num">${fmt(each, true)}</span> damage per second each`);
      const nxt = GH.nextMilestone(own);
      const nextName = rk < GH.RANKS.length - 1 ? GH.RANKS[rk + 1].name : 'Legends +' + (GH.milestones(nxt) - rk);
      set(r.next, 'text', own > 0 ? `Next: ${nextName} at ${fmt(nxt)} (×2)` : UNITS[i].blurb);
      const q = buyQty(i);
      const c = GH.costFor(i, own, q);
      const can = S.gold >= c;
      set(r.lbl, 'text', S.buyMode === 'next' ? `${nextName} (+${fmt(q)})` : `Recruit ${fmt(q)}`);
      set(r.cost, 'text', fmt(c));
      setClass(r.btn, 'can', can);
      r.btn.disabled = !can;
      r.btn.setAttribute('aria-label', S.buyMode === 'next' ? `Recruit ${q} more ${UNITS[i].name} to reach ${nxt} and rank up to ${nextName}, for ${fmt(c)} shinies`
        : `Recruit ${q} ${q === 1 ? UNITS[i].one : UNITS[i].name} for ${fmt(c)} shinies`);
      set(r.fill, 'width', `${Math.min(100, (S.gold / c) * 100).toFixed(1)}%`);
    }
    lockedRow.hidden = firstHidden < 0;
    if (firstHidden > 0) {
      const img = lockedRow.querySelector('img');
      if (img._i !== firstHidden) { img._i = firstHidden; img.src = Art.unitIcon(firstHidden, 80, 0); }
      set(lockedRow.querySelector('.detail'), 'text', `Recruit your first ${UNITS[firstHidden - 1].one.toLowerCase()} to discover them.`);
    }
  }

  // ---- upgrades tab
  let upSig = '', upRows = [];
  function renderUps(force) {
    const avail = GH.UPGRADES.filter((u) => !S.ups[u.id] && GH.reqMet(u.req, S));
    const sig = avail.map((u) => u.id).join(',');
    if (sig !== upSig || force) { upSig = sig; buildUpRows(avail); }
    let any = false;
    for (const r of upRows) {
      const can = S.gold >= r.u.cost;
      if (can) any = true;
      setClass(r.btn, 'can', can);
      r.btn.disabled = !can;
      set(r.fill, 'width', `${Math.min(100, (S.gold / r.u.cost) * 100).toFixed(1)}%`);
    }
    $('#dotUps').hidden = !any || S.tab === 'ups';
  }
  function buildUpRows(avail) {
    const ul = $('#upList');
    ul.textContent = '';
    upRows = avail.map((u) => {
      const li = document.createElement('li');
      li.className = 'row up-row';
      li.innerHTML = `<div class="info"><div class="name"></div><div class="detail"></div></div>
        <button class="buy" type="button"><span class="fill"></span><span class="lbl">Buy</span><span class="cost"></span></button>`;
      li.querySelector('.name').textContent = u.name;
      li.querySelector('.detail').textContent = u.desc;
      li.querySelector('.cost').textContent = fmt(u.cost);
      const btn = li.querySelector('.buy');
      btn.setAttribute('aria-label', `Buy ${u.name} for ${fmt(u.cost)} shinies`);
      btn.addEventListener('click', () => buyUpgrade(u));
      ul.appendChild(li);
      return { u, btn, fill: li.querySelector('.fill') };
    });
    const empty = $('#upEmpty');
    empty.hidden = avail.length > 0;
    if (!avail.length) {
      const next = GH.UPGRADES.find((u) => !S.ups[u.id] && !GH.reqMet(u.req, S));
      empty.textContent = next ? `New upgrades appear as you push further. The next one unlocks when you ${GH.reqText(next.req)}.` : 'You own every upgrade there is.';
    }
    const bought = GH.UPGRADES.filter((u) => S.ups[u.id]);
    $('#boughtWrap').hidden = bought.length === 0;
    $('#boughtSummary').textContent = `Bought (${bought.length})`;
    const bl = $('#boughtList');
    bl.textContent = '';
    for (const u of bought) { const li = document.createElement('li'); li.textContent = u.name; bl.appendChild(li); }
  }

  // ---- world tab
  const FLAG_WON = '<svg class="flag" viewBox="0 0 22 22" aria-hidden="true"><rect x="4" y="2" width="2" height="18" fill="#8B6A40"/><path d="M6 3h12l-3 4 3 4H6z" fill="#9BC46A"/><circle cx="11" cy="7" r="1.6" fill="#1E1A15"/></svg>';
  const FLAG_HERE = '<svg class="flag" viewBox="0 0 22 22" aria-hidden="true"><path d="M4 18L17 5M5 5l13 13" stroke="#7FE0F5" stroke-width="2.2" stroke-linecap="square"/></svg>';
  const FLAG_LOCK = '<svg class="flag" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="4" fill="none" stroke="rgba(239,230,210,.4)" stroke-width="1.6"/></svg>';
  let worldSig = '';
  function renderWorld(force) {
    const M = GH.Meta;
    const can = M.canRollback(S);
    const gain = GH.runGain(S, S.conquered);
    const fc = M.forecast(S);
    const sig = [S.region, S.threat, S.conquered, S.shards, S.rollbacks, Math.floor(fc.dur / 60), S.meta.bots.rollback, S.meta.bots.rollbackAt].join('|');
    $('#dotWorld').hidden = !(can && gain >= Math.max(1, S.shards)) || S.tab === 'world';
    if (S.tab !== 'world' && !force) return;
    if (sig === worldSig && !force) return;
    worldSig = sig;
    const last = Math.max(GH.FINAL_REGION, S.region);
    let html = '';
    for (let r = 0; r <= last; r++) {
      const R = GH.region(r);
      const won = r < S.conquered && r < S.region;
      const here = r === S.region;
      const cls = won ? 'won' : here ? 'here' : 'locked';
      const state = won ? 'Goblin territory' : here ? (S.threat >= 10 ? 'Leader ready' : `${S.threat}/10`) : 'Locked';
      html += `<li class="region ${cls}">${won ? FLAG_WON : here ? FLAG_HERE : FLAG_LOCK}
        <div><div class="rname">${esc(R.name)}</div><div class="rsub">${esc(R.sub)} Lv ${r * 10 + 1}–${r * 10 + 10}.</div></div>
        <div class="rstate">${state}</div></li>`;
    }
    $('#regionList').innerHTML = html;
    const rb = $('#rollbackWin');
    if (can) {
      const nextName = GH.region(S.region).name;
      const best = fc.best ? `${fmt(fc.bestRate, true)}/h <span class="muted">(run ${fc.best.n})</span>` : '—';
      const advice = fc.slowing ? `<p class="advice">Progress is slowing: ${esc(nextName)} has taken ${fmtTime(fc.sinceLast)} so far, and the last region took ${fmtTime(fc.lastTook)}. A good time to roll back.</p>` : '';
      const bot = M.ms(S, 'botRollback') ? `<label class="setting inset botrow"><span>Auto-rollback bot<span class="muted small block">Rolls back by itself once a run reaches ${fmt(S.meta.bots.rollbackAt || gain)} corrupted data.</span></span>
          <input type="checkbox" class="switch" id="botRollback" ${S.meta.bots.rollback ? 'checked' : ''}></label>
          <div class="botset"><button type="button" class="secondary small-btn" id="botRollbackSet">Use ${fmt(gain)} as the target</button></div>` : '';
      rb.className = 'sysw glitch rollback';
      rb.innerHTML = `<h3>Server rollback</h3>
        <p>The admins can’t delete you, so they keep rolling the server back. Your warband, regions, upgrades and form reset. Your town, corrupted data, exploits and remembered forms survive.</p>
        <dl class="statgrid fc">
          <dt>This run</dt><dd class="v">${fmtTime(fc.dur)} · ${S.conquered} regions</dd>
          <dt>Roll back now</dt><dd class="v corrupt">+${fmt(gain)} data · ${fmt(fc.rate, true)}/h</dd>
          <dt>${esc(nextName)} adds</dt><dd class="v">+${fmt(fc.next)} data</dd>
          <dt>Your best rate</dt><dd class="v">${best}</dd>
        </dl>
        ${advice}
        <p class="small muted">Each piece of corrupted data makes everything ${fmt(GH.shardPct(S) * 100)}% stronger${S.shards ? `; you have ${fmt(S.shards)}` : ''}. You also get ${fmt(Math.round(gain * M.epScale(S)))} exploit points to spend.</p>
        <button type="button" class="glitchbtn" id="rollbackBtn">Roll back the server</button>${bot}`;
    } else {
      const need = M.rollbackNeed(S);
      rb.className = 'sysw rollback';
      rb.innerHTML = S.rollbacks || S.conquered >= GH.ROLLBACK_AT ? `<h3>Server rollback</h3><p>Conquer ${need} more region${need === 1 ? '' : 's'} this run to roll back again.</p>`
        : `<h3>Server rollback</h3><p>Conquer ${GH.ROLLBACK_AT} regions to unlock server rollbacks. You’ve conquered ${S.conquered}.</p>`;
    }
    GH.emit('renderWorld');
  }
  $('#rollbackWin').addEventListener('change', (e) => {
    if (e.target.id === 'botRollback') { S.meta.bots.rollback = e.target.checked; if (!S.meta.bots.rollbackAt) S.meta.bots.rollbackAt = GH.runGain(S, S.conquered); save(); renderWorld(true); }
  });
  $('#rollbackWin').addEventListener('click', (e) => {
    if (e.target.closest('#botRollbackSet')) { S.meta.bots.rollbackAt = GH.runGain(S, S.conquered); save(); renderWorld(true); return; }
    if (!e.target.closest('#rollbackBtn')) return;
    const gain = GH.runGain(S, S.conquered);
    confirmAsk('Roll back the server?', `Everything in this run resets: shinies, warband, upgrades, regions and your form. You keep your town, exploits and remembered forms, and gain ${fmt(gain)} corrupted data (total ${fmt(S.shards + gain)}), making everything ${fmt((S.shards + gain) * GH.shardPct(S) * 100)}% stronger.`, 'Roll back', () => rollback(),
      () => { S.rbCancel = (S.rbCancel || 0) + 1; GH.emit('rollbackCancel', S.rbCancel); });
  });

  function renderDots() {
    let evo = false;
    if (evoReady()) evo = FORM[S.form].children.some((c) => GH.reqMet(FORM[c].req, S));
    $('#dotHero').hidden = !evo || S.tab === 'hero';
    let newUnit = false;
    for (let i = 1; i < UNITS.length; i++) if (S.owned[i] === 0 && S.owned[i - 1] > 0 && S.gold >= GH.unitCost(i, 0)) newUnit = true;
    $('#dotVillage').hidden = !newUnit || S.tab === 'village';
  }

  function render(force) {
    renderHud();
    renderRegionBar();
    renderDots();
    if (S.tab === 'hero' || force) renderHero(force);
    renderVillage(force);
    renderUps(force);
    renderWorld(force);
    renderTown(force);
    GH.emit('render', force);
  }

  function setTab(t) {
    S.tab = t;
    document.querySelectorAll('.tabs [role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    for (const id of ['hero', 'village', 'town', 'ups', 'world']) $('#tab-' + id).hidden = t !== id;
    $('#panel').scrollTop = 0;
    GH.emit('tab', t);
    render(true);
  }
  const modeOf = (v) => (v === 'max' || v === 'next' ? v : Number(v) || 1);
  function setBuyMode(m) {
    S.buyMode = modeOf(m);
    document.querySelectorAll('#buymode button').forEach((b) => b.setAttribute('aria-pressed', String(modeOf(b.dataset.mode) === S.buyMode)));
    render(true);
  }
  document.querySelectorAll('.tabs [role="tab"]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  document.querySelectorAll('#buymode button').forEach((b) => b.addEventListener('click', () => setBuyMode(b.dataset.mode)));
  $('#unitframe').addEventListener('click', () => { setTab('hero'); GH.emit('portraitTap'); });
  $('#rbBtn').addEventListener('click', () => {
    if (fight || S.threat < 10) return;
    bossBlockPower = 0;
    if (enemy && !enemy.dead) { enemy.dead = true; enemy.deadT = 0.2; }
    nextSpawnAt = 0;
    spawnBoss(performance.now());
    render(true);
  });

  // ------------------------------------------------------------------ town
  const Town = GH.Town;
  const townCv = $('#townCv');
  const townView = Art.createTownView(townCv);
  new ResizeObserver(() => townView.resize()).observe(townCv);
  const MOOD_CLASS = { Miserable: 'm0', Grumpy: 'm1', Content: 'm2', Happy: 'm3', Joyful: 'm4' };
  const resOf = (id) => Town.RES.find((r) => r.id === id);
  const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;

  function rescueLine(r, n) {
    return r === 0 ? `${n} goblins who hid from the farmers have come home to Mudhollow.`
      : `You freed ${n} goblins from the spawn camps in ${GH.region(r).name}. They’re moving to Mudhollow.`;
  }
  function unlockTown() {
    if (S.town.unlocked) return;
    S.town.unlocked = true;
    S.town.seen = false;
    const n = Town.rescue(S, S.bestRegionEver || 0);
    derive();
    sys('Mudhollow is safe, for now. Your goblins can finally build something. Open the Town tab.', 'gold', 'town');
    if (n) sys(`${n} goblins came out of hiding to join you.`, 'gold', 'rescue');
    chat('Elder Mossgrin', 'We’ve never had a tomorrow before. Let’s build one.', 'npc');
    save();
  }
  function afterConquest(r) {
    if (!S.town.unlocked) { unlockTown(); return; }
    const n = Town.rescue(S, S.bestRegionEver || 0);
    if (n) { derive(); sys(rescueLine(r, n), 'gold', 'rescue'); }
  }

  // What a goblin says when you tap them. Hints first, then small talk.
  const SMALLTALK = ['I used to respawn every 30 seconds. Now I have a bed!', 'Nobody farmed me all day. Is this what peace feels like?',
    'Is it true you used to be one of them?', 'I named my rock Steve.', 'More grubs, please!', 'The tall ones look scared of us now. I like it.',
    'My ears aren’t loot any more!', 'We’re safe. Actually safe.', 'I found a quest log. It says “kill 10 goblins”. Rude.',
    'Elder Mossgrin says you blinked first.', 'Can we build a bigger fire? For warmth. Not for burning farms. Mostly.'];
  function townLine() {
    const t = S.town, m = Town.mood(S);
    const lines = [];
    if (Town.idle(t) > 0) lines.push('Boss, I’ve got nothing to do. Give me a job?');
    if (t.pop >= Town.housing(S)) lines.push(Town.lvl(S, 'huts') < 3 ? 'There’s no room for any more of us. More huts?' : 'It’s getting crowded. We need more huts!');
    if (m.work < 0.95) {
      if (Town.bldOpen(S, 'feast') && !Town.lvl(S, 'feast')) lines.push('It’s cold and boring here. A Feast Hall would cheer us up.');
      else if (!Town.has(S, 'fire')) lines.push('It’s so cold. Can the tinkerers work out fire?');
      else lines.push('Everyone’s grumpy. We need more comfort: feasts, healers, baths…');
    }
    if (!(t.jobs.tinkerer > 0)) lines.push('Nobody’s tinkering. No tinkerers, no new ideas!');
    if (Town.TECHS.some((x) => Town.techState(S, x.id) === 'open' && Town.canPay(S, x.cost))) lines.push('The tinkerers have an idea! Check Research.');
    if (Town.feasting(S)) lines.push(pick(['Best. Feast. Ever.', 'Pass the grubs!', 'I love you, boss!']));
    if (lines.length && Math.random() < 0.8) return lines[0];
    if (m.label === 'Joyful' || m.label === 'Happy') return pick(SMALLTALK);
    return lines[0] || pick(SMALLTALK);
  }
  townCv.addEventListener('pointerdown', (e) => {
    const r = townCv.getBoundingClientRect();
    townView.say(townLine(), e.clientX - r.left);
  });

  function townViewState() {
    const t = S.town, open = {};
    for (const b of Town.BUILDINGS) open[b.id] = Town.bldOpen(S, b.id);
    return { bld: t.bld, tech: t.tech, open, pop: Town.home(t), jobs: t.jobs, mood: Town.mood(S).label, feast: Town.feasting(S), haven: Town.has(S, 'haven'),
      season: Town.season().id, away: (t.exp || []).length, corrupt: GH.Meta.corruptLvl(S) };
  }

  // costs as small icon + number pairs; marks the ones you can't afford yet
  function costHTML(cost) {
    return Object.keys(cost).map((r) => `<span class="c" data-r="${r}"><img src="${Art.resIcon(r, 16)}" alt="${resOf(r).name}">${fmt(cost[r])}</span>`).join('');
  }
  function costText(cost) { return Object.keys(cost).map((r) => `${fmt(cost[r])} ${resOf(r).name.toLowerCase()}`).join(', '); }
  function markCost(el, cost) {
    el.querySelectorAll('.c').forEach((c) => setClass(c, 'short', (S.town.res[c.dataset.r] || 0) < cost[c.dataset.r]));
  }

  // ---- resource bar
  const resChips = {};
  function buildResBar() {
    const bar = $('#resBar');
    for (const r of Town.RES) {
      const d = document.createElement('div');
      d.className = 'rchip';
      d.innerHTML = `<img src="${Art.resIcon(r.id, 16)}" alt=""><span class="rv"></span><span class="rr"></span>`;
      d.setAttribute('role', 'group');
      d.setAttribute('aria-label', r.name);
      bar.appendChild(d);
      resChips[r.id] = { d, v: d.querySelector('.rv'), r: d.querySelector('.rr') };
    }
  }
  function renderResBar() {
    const rates = Town.rates(S);
    for (const r of Town.RES) {
      const c = resChips[r.id];
      const vis = Town.resOpen(S, r.id);
      c.d.hidden = !vis;
      if (!vis) continue;
      set(c.v, 'text', fmt(S.town.res[r.id], true));
      set(c.r, 'text', rates[r.id] > 0 ? `+${fmt(rates[r.id], rates[r.id] < 10)}/s` : '—');
    }
  }

  // ---- goblins (jobs)
  const jobRows = {};
  function buildJobRows() {
    const ul = $('#jobList');
    for (const j of Town.JOBS) {
      const li = document.createElement('li');
      li.className = 'row job-row';
      li.innerHTML = `<img class="job-icon" alt="" src="${Art.jobIcon(j.id, 56)}">
        <div class="info"><div class="name">${esc(j.name)}</div><div class="detail"></div></div>
        <div class="stepper"><button type="button" class="step" data-d="-1" aria-label="Fewer ${esc(j.name.toLowerCase())}">−</button><span class="cnt">0</span><button type="button" class="step" data-d="1" aria-label="More ${esc(j.name.toLowerCase())}">+</button></div>`;
      li.querySelectorAll('.step').forEach((b) => b.addEventListener('click', () => moveJob(j.id, Number(b.dataset.d))));
      ul.appendChild(li);
      jobRows[j.id] = { li, detail: li.querySelector('.detail'), cnt: li.querySelector('.cnt'), minus: li.querySelector('[data-d="-1"]'), plus: li.querySelector('[data-d="1"]') };
    }
  }
  function moveJob(id, dir) {
    const t = S.town;
    const step = t.step === 'all' ? (dir > 0 ? Town.idle(t) : t.jobs[id]) : t.step;
    if (Town.setJob(S, id, dir * step)) { derive(); buzz(8); renderTown(true); }
  }
  function guardText(n) {
    const g = n * Town.guardMul(S);
    const T = Town.T;
    if (!n) return 'Each guard: warband +3% in raids and leader fights, and raiders steal 3% less.';
    return `Warband +${fmt(g * T.GUARD_FIGHT * 100)}% in raids and leader fights. Raiders steal ${fmt(Math.min(80, g * T.GUARD_STEAL * 100))}% less.`;
  }
  function renderJobs() {
    const t = S.town;
    const m = Town.mood(S);
    const cap = Town.housing(S);
    const idleN = Town.idle(t);
    const full = t.pop >= cap;
    const next = full ? 'No room for more. Build huts to grow.' :
      (t.res.food < Town.hatchFood(S) && t.hatchT >= Town.hatchTime(S) - 0.01 ? `Waiting for ${fmt(Town.hatchFood(S))} food to hatch the next goblin.` :
        `Next goblin hatches in ${fmtTime(Math.max(0, (Town.hatchTime(S) - t.hatchT) / m.work) + 1)}.`);
    const fight = Math.round((m.fight - 1) * 100);
    const out = Town.away(t);
    set($('#pcPop'), 'html', `<b>${fmt(t.pop)}</b> / ${fmt(cap)} goblins${out ? `<span class="pc-away">${fmt(out)} on expeditions</span>` : ''}`);
    set($('#pcNext'), 'text', next);
    const mood = $('#pcMood');
    if (mood._m !== m.label) { mood._m = m.label; mood.className = 'mood ' + MOOD_CLASS[m.label]; }
    set($('#pcMoodLbl'), 'text', m.label);
    set($('#pcMoodSub'), 'text', `Work ×${m.work.toFixed(2)}${fight > 0 ? ` · warband +${fight}%` : ''}`);
    set($('#pcComfort'), 'width', `${Math.min(100, (m.ratio / 2) * 100).toFixed(1)}%`);
    set($('#pcComfortTxt'), 'text', `Comfort ${fmt(Town.comfort(S))} for ${fmt(t.pop)} goblins. More comfort makes them work faster and hatch sooner, up to twice as much comfort as goblins.`);
    const hall = Town.lvl(S, 'feast') > 0, feastOn = Town.feasting(S);
    $('#pcFeastOn').hidden = !feastOn;
    if (feastOn) set($('#pcFeastOn'), 'text', `Feast in full swing: comfort +50% for another ${fmtTime((t.feastUntil - Date.now()) / 1000 + 1)}.`);
    const fb = $('#feastBtn');
    fb.hidden = !hall || feastOn;
    if (hall && !feastOn) {
      const c = Town.feastCost(S);
      const can = t.res.food >= c;
      set($('#feastCost'), 'html', costHTML({ food: c }));
      setClass(fb, 'can', can);
      fb.disabled = !can;
      set($('#feastFill'), 'width', `${Math.min(100, (t.res.food / c) * 100).toFixed(1)}%`);
    }
    set($('#jobsHead'), 'html', idleN ? `<b class="warn">${fmt(idleN)} idle</b>, waiting for a job` : 'Everyone has a job');
    for (const j of Town.JOBS) {
      const r = jobRows[j.id];
      const open = Town.jobOpen(S, j.id);
      r.li.hidden = !open;
      if (!open) continue;
      const n = t.jobs[j.id] || 0;
      set(r.cnt, 'text', fmt(n));
      if (j.res) {
        const each = Town.perWorker(S, j.id);
        set(r.detail, 'html', `<span class="num">${fmt(each, true)}</span> ${resOf(j.res).name.toLowerCase()}/s each${n ? ` · <span class="num">${fmt(each * n, true)}</span>/s in all` : ''}`);
      } else set(r.detail, 'text', guardText(n));
      r.minus.disabled = n <= 0;
      r.plus.disabled = idleN <= 0;
    }
    $('#autoJobs').checked = !!t.auto;
  }
  $('#popCard').innerHTML = `<div class="pc-row">
      <div><div class="pc-big" id="pcPop"></div><div class="pc-sub" id="pcNext"></div></div>
      <div class="mood" id="pcMood"><div class="pc-big" id="pcMoodLbl"></div><div class="pc-sub" id="pcMoodSub"></div></div>
    </div>
    <div class="comfort" aria-hidden="true"><span id="pcComfort"></span><i></i></div>
    <div class="pc-sub" id="pcComfortTxt"></div>
    <div class="feast" id="pcFeastOn" hidden></div>
    <button type="button" class="buy feastbtn" id="feastBtn" hidden><span class="fill" id="feastFill"></span><span class="lbl">Throw a feast: comfort +50% for 10 minutes</span><span class="cost" id="feastCost"></span></button>`;
  $('#feastBtn').addEventListener('click', () => {
    if (Town.feast(S)) {
      derive(); buzz(30);
      GH.emit('feast');
      sys('Feast! Everyone’s comfort is up by half for the next 10 minutes.', 'gold', 'feast');
      townView.say('Best. Feast. Ever.');
      renderTown(true);
    }
  });
  $('#autoJobs').addEventListener('change', (e) => { S.town.auto = e.target.checked; save(); });
  function setStep(v) {
    S.town.step = v;
    document.querySelectorAll('#stepmode button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.step === 'all' ? 'all' : Number(b.dataset.step)) === v)));
  }
  document.querySelectorAll('#stepmode button').forEach((b) => b.addEventListener('click', () => setStep(b.dataset.step === 'all' ? 'all' : Number(b.dataset.step))));

  // ---- buildings
  function bldEffect(b, L) {
    const T = Town.T;
    const per = (x) => `${fmt(x * 100)}%`;
    switch (b.fx) {
      case 'housing': { const each = T.HOUSE_PER_HUT * Town.techMul(S, 'housingM'); return `+${fmt(each, true)} homes per level. ${fmt(Town.housing(S))} homes in all.`; }
      case 'job': return `${Town.JOB[b.job].name} +${per(T.BLD_STEP)} per level${L ? ` (now +${per(T.BLD_STEP * L)})` : ''}.`;
      case 'comfort': return `Comfort +${b.v} per level${L ? ` (now +${b.v * L})` : ''}.`;
      case 'warband': return `Warband +${per(b.v)} damage per level${L ? ` (now +${per(b.v * L)})` : ''}.`;
      case 'gold': return `+${per(b.v)} shinies per level${L ? ` (now +${per(b.v * L)})` : ''}.`;
      case 'xp': return `+${per(b.v)} XP per level${L ? ` (now +${per(b.v * L)})` : ''}.`;
      case 'ideas': return `Tinkerers +${per(b.v)} per level${L ? ` (now +${per(b.v * L)})` : ''}.`;
      case 'forge': return `Warband and taps +${per(b.v)} per level${L ? ` (now +${per(b.v * L)})` : ''}.`;
      case 'shrine': return `+8 homes and everything +${per(b.v)} per level${L ? ` (now +${per(b.v * L)})` : ''}.`;
      case 'hall': return `Gathering +${per(b.v)} per level${L ? ` (now +${per(b.v * L)})` : ''}. One edict at a time, two from level 5.`;
      case 'camp': return `Send goblins on expeditions. Loot +${per(b.v)} per level after the first${L > 1 ? ` (now +${per(b.v * (L - 1))})` : ''}; two parties from level 3.`;
      case 'vault': return `Rollbacks give +${per(b.v)} exploit points per level${L ? ` (now +${per(b.v * L)})` : ''}.`;
      default: return '';
    }
  }
  let bldSig = '', bldRows = [];
  function renderBuild(force) {
    const open = Town.BUILDINGS.filter((b) => Town.bldOpen(S, b.id));
    const sig = open.map((b) => b.id + Town.lvl(S, b.id)).join(',') + '|' + Object.keys(S.town.tech).length;
    if (sig !== bldSig || force) {
      bldSig = sig;
      const ul = $('#bldList');
      ul.textContent = '';
      bldRows = open.map((b) => {
        const L = Town.lvl(S, b.id);
        const cost = Town.bldCost(b.id, L);
        const li = document.createElement('li');
        li.className = 'row bld-row';
        li.innerHTML = `<img class="bld-icon" alt="" src="${Art.bldIcon(b.id, 60)}">
          <div class="info"><div class="name">${esc(b.name)} <span class="lv">${L ? 'Lv ' + L : 'New'}</span></div>
            <div class="detail">${esc(bldEffect(b, L))}</div><div class="next">${esc(b.blurb)}</div></div>
          <button class="buy" type="button"><span class="fill"></span><span class="lbl">${L ? 'Upgrade' : 'Build'}</span><span class="cost">${costHTML(cost)}</span></button>`;
        const btn = li.querySelector('.buy');
        btn.setAttribute('aria-label', `${L ? 'Upgrade' : 'Build'} ${b.name} for ${costText(cost)}`);
        btn.addEventListener('click', () => buildIt(b.id));
        ul.appendChild(li);
        return { b, cost, btn, fill: li.querySelector('.fill') };
      });
      const next = Town.TECHS.filter((x) => !Town.has(S, x.id)).map((x) => ({ x, blds: Town.BUILDINGS.filter((b) => b.tech === x.id && !b.rb) })).find((o) => o.blds.length);
      const rbNext = Town.BUILDINGS.filter((b) => b.rb && !Town.bldOpen(S, b.id)).sort((a, b) => a.rb - b.rb)[0];
      const hints = [];
      if (next) hints.push(`Research ${next.x.name} to build the ${next.blds.map((b) => b.name).join(' and the ')}.`);
      if (rbNext && (S.rollbacks || 0) >= 1) hints.push((S.rollbacks || 0) >= rbNext.rb ? `Research ${Town.TECH[rbNext.tech].name} to build the ${rbNext.name}.` : `The ${rbNext.name} opens after ${rbNext.rb} server rollbacks.`);
      const p = $('#bldNext');
      p.hidden = !hints.length;
      p.textContent = hints.join(' ');
    }
    for (const r of bldRows) {
      const can = Town.canPay(S, r.cost);
      setClass(r.btn, 'can', can);
      r.btn.disabled = !can;
      set(r.fill, 'width', `${(Town.progress(S, r.cost) * 100).toFixed(1)}%`);
      markCost(r.btn, r.cost);
    }
    const F = Town.fx(S);
    const bits = [];
    if (F.warband > 1.001) bits.push(['Warband damage', `×${fmt(F.warband, true)}`]);
    if (F.tap > 1.001) bits.push(['Tap damage', `×${fmt(F.tap, true)}`]);
    if (F.gold > 1.001) bits.push(['Shinies', `×${fmt(F.gold, true)}`]);
    if (F.xp > 1.001) bits.push(['XP', `×${fmt(F.xp, true)}`]);
    if (F.all > 1.001) bits.push(['Everything', `×${fmt(F.all, true)}`]);
    if (F.guardFight > 1.001) bits.push(['Guards in fights', `+${fmt((F.guardFight - 1) * 100)}%`]);
    if (F.steal < 0.999) bits.push(['Raid losses', F.steal === 0 ? 'none' : `−${fmt((1 - F.steal) * 100)}%`]);
    set($('#townFx'), 'html', `<h3>What your town does for the fight</h3>${bits.length ? `<dl class="statgrid">${bits.map(([k, v]) => `<dt>${k}</dt><dd class="v">${v}</dd>`).join('')}</dl>`
      : '<p class="muted small" style="margin:0">Nothing yet. Stone Walls, the Forge, happy goblins and new technology all make your warband stronger.</p>'}`);
  }
  function buildIt(id) {
    const b = Town.BLD[id];
    if (!Town.build(S, id)) return;
    const L = Town.lvl(S, id);
    derive(); buzz(12);
    GH.emit('build', id, L);
    sys(L === 1 ? `${b.name} built.` : `${b.name} upgraded to level ${L}.`, '', 'bld');
    if (L === 1 || Math.random() < 0.25) townView.say(pick({
      huts: ['A roof! A real roof!', 'Dibs on the top bunk.'], farm: ['Grubs for everyone!'], lumber: ['TIMBER!'], shed: ['I’m going to invent… something.'],
      feast: ['Is that… roast mushroom?', 'Feast hall! Feast hall!'], healer: ['No more waiting for respawns.'], quarry: ['Rocks! Organised rocks!'],
      walls: ['Let them try to farm us now.'], market: ['Shiny for a grub? Two grubs?'], mine: ['Deeper! Deeper!'], pit: ['I can beat a dummy. Probably.'],
      library: ['I can read four words now!'], forge: ['Real swords! The sticks can retire.'], bath: ['Ahhhh. Warm water.'], shrine: ['Someone just respawned as one of us!'],
    }[id] || ['Nice!']));
    save();
    renderTown(true);
  }

  // ---- research
  let techSig = '', techRows = [];
  function renderTech(force) {
    const states = Town.TECHS.map((x) => Town.techState(S, x.id));
    const sig = states.join(',');
    if (sig !== techSig || force) {
      techSig = sig;
      const wrap = $('#techList');
      wrap.textContent = '';
      techRows = [];
      // show every age up to the first one you haven't started
      let lastEra = 0;
      Town.TECHS.forEach((x, i) => { if (states[i] !== 'locked') lastEra = Math.max(lastEra, x.era); });
      for (let era = 0; era <= Math.min(Town.ERAS.length - 1, lastEra + 1); era++) {
        const list = Town.TECHS.filter((x) => x.era === era && !Town.has(S, x.id));
        if (!list.length) continue;
        const h = document.createElement('h3');
        h.className = 'era';
        h.textContent = Town.ERAS[era];
        wrap.appendChild(h);
        const ul = document.createElement('ul');
        ul.className = 'list';
        for (const x of list) {
          const st = Town.techState(S, x.id);
          const li = document.createElement('li');
          li.className = `row tech-row ${st}`;
          const needs = st === 'locked' ? `Needs ${x.req.filter((r) => !Town.has(S, r)).map((r) => Town.TECH[r].name).join(' and ')}.`
            : st === 'gated' ? `First ${Town.techGate(x)}.` : '';
          li.innerHTML = `<div class="info"><div class="name">${esc(x.name)}</div><div class="detail">${esc(x.desc)}</div>${needs ? `<div class="next">${esc(needs)}</div>` : ''}</div>
            ${st === 'open' ? `<button class="buy" type="button"><span class="fill"></span><span class="lbl">Research</span><span class="cost">${costHTML(x.cost)}</span></button>` : `<div class="tcost">${costHTML(x.cost)}</div>`}`;
          const btn = li.querySelector('.buy');
          if (btn) {
            btn.setAttribute('aria-label', `Research ${x.name} for ${costText(x.cost)}`);
            btn.addEventListener('click', () => researchIt(x.id));
            techRows.push({ x, btn, fill: li.querySelector('.fill') });
          }
          ul.appendChild(li);
        }
        wrap.appendChild(ul);
      }
      const done = Town.TECHS.filter((x) => Town.has(S, x.id));
      $('#techDoneWrap').hidden = !done.length;
      $('#techDoneSummary').textContent = `Researched (${done.length} of ${Town.TECHS.length})`;
      const dl = $('#techDoneList');
      dl.textContent = '';
      for (const x of done) { const li = document.createElement('li'); li.textContent = x.name; dl.appendChild(li); }
    }
    for (const r of techRows) {
      const can = Town.canPay(S, r.x.cost);
      setClass(r.btn, 'can', can);
      r.btn.disabled = !can;
      set(r.fill, 'width', `${(Town.progress(S, r.x.cost) * 100).toFixed(1)}%`);
      markCost(r.btn, r.x.cost);
    }
  }
  function researchIt(id) {
    const x = Town.TECH[id];
    if (!Town.research(S, id)) return;
    derive(); buzz(25);
    GH.emit('research', id);
    sys(`Research complete: ${x.name}. ${x.desc}`, 'gold', 'tech');
    townView.say(pick(['Eureka! Or however you say it.', 'We did science!', 'The tinkerers are very pleased with themselves.']));
    if (id === 'haven') chat('System', 'Mudhollow is now a protected zone. PvP and looting disabled.', 'gm');
    save();
    renderTown(true);
  }

  // ---- the tab
  function techAffordable() { return Town.TECHS.some((x) => Town.techState(S, x.id) === 'open' && Town.canPay(S, x.cost)); }
  function renderTownDots() {
    const t = S.town;
    if (!t.unlocked) { $('#dotTown').hidden = true; return; }
    const idleN = Town.idle(t) > 0;
    const tech = techAffordable();
    const back = Town.expReady(S) > 0;
    $('#dotTown').hidden = S.tab === 'town' || !(idleN || tech || back || t.seen === false);
    $('#dotJobs').hidden = !idleN || t.sub === 'jobs';
    $('#dotTech').hidden = !tech || t.sub === 'tech';
    $('#dotHall').hidden = !back || t.sub === 'hall';
    $('#dotBuild').hidden = true;
  }
  const hallOpen = () => (S.rollbacks || 0) >= Town.BLD.hall.rb || Town.lvl(S, 'hall') > 0 || Town.lvl(S, 'camp') > 0;
  function setSub(v) {
    if (v === 'hall' && !hallOpen()) v = 'jobs';
    S.town.sub = v;
    $('#subHall').hidden = !hallOpen();
    document.querySelectorAll('.subtabs [role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.sub === v)));
    for (const id of ['jobs', 'build', 'tech', 'hall']) $('#sub-' + id).hidden = v !== id;
    const head = document.querySelector('.town-head');
    if (head && $('#panel').scrollTop > head.offsetTop) $('#panel').scrollTop = head.offsetTop;
    renderTown(true);
  }
  document.querySelectorAll('.subtabs [role="tab"]').forEach((b) => b.addEventListener('click', () => setSub(b.dataset.sub)));

  function renderTown(force) {
    renderTownDots();
    if (S.tab !== 'town') return;
    const t = S.town;
    $('#townLocked').hidden = t.unlocked;
    $('#townMain').hidden = !t.unlocked;
    if (!t.unlocked) {
      const R = GH.region(0);
      set($('#townLocked'), 'html', `<h3>Town</h3><p>Mudhollow is still a farming spot for players. Beat the raid leader, ${esc(R.boss)}, to make it safe enough to build.</p>
        <p class="muted small" style="margin:0">Then your goblins can gather food, wood, stone and iron, build homes and workshops, and research new technology.</p>`);
      return;
    }
    t.seen = true;
    if ($('#subHall').hidden === hallOpen()) $('#subHall').hidden = !hallOpen();
    renderResBar();
    if (t.sub === 'jobs') renderJobs();
    else if (t.sub === 'build') renderBuild(force);
    else if (t.sub === 'hall') GH.emit('renderHall', force);
    else renderTech(force);
  }
  function onHatch(n) {
    if (S.tab === 'town' && Math.random() < 0.5) townView.say(pick(['I’m new! Hi!', 'Where am I? Oh, home.', 'Do I get a job?', '*hatches noisily*']));
    if (!S.town.auto && Town.idle(S.town) === n) sys(`${n === 1 ? 'A new goblin has' : `${n} new goblins have`} hatched. Give them jobs in the Town tab.`, '', 'hatch');
  }

  // ------------------------------------------------------------------ dialogs
  function openDlg(d) { if (!d.open) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } } }
  function closeDlg(d) { if (d.open) d.close(); }
  document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d && d.id !== 'awayDlg' && d.id !== 'victoryDlg') closeDlg(d); }));

  let confirmFn = null, confirmNoFn = null;
  function confirmAsk(title, body, yes, fn, no) {
    $('#confirmTitle').textContent = title;
    $('#confirmBody').textContent = body;
    $('#confirmYes').textContent = yes;
    confirmFn = fn; confirmNoFn = no || null;
    openDlg($('#confirmDlg'));
  }
  $('#confirmNo').addEventListener('click', () => { closeDlg($('#confirmDlg')); const f = confirmNoFn; confirmFn = null; confirmNoFn = null; if (f) f(); });
  $('#confirmYes').addEventListener('click', () => { closeDlg($('#confirmDlg')); const f = confirmFn; confirmFn = null; confirmNoFn = null; if (f) f(); });

  // the ranks of one force: what each checkpoint looks like
  function openRanks(i) {
    const u = UNITS[i], own = S.owned[i], cur = GH.rankOf(own);
    const rows = GH.RANKS.map((R, k) => {
      const cls = k < cur ? 'done' : k === cur ? 'here' : 'later';
      const at = k === 0 ? 'From your first' : `At ${R.at}`;
      return `<li class="${cls}" style="--rk:${R.color}"><img src="${Art.unitIcon(i, 80, k)}" alt="">
        <div><b style="color:${R.color}">${R.name}</b><small>${at}</small></div>
        <div class="mult">×${Math.pow(2, k)}</div></li>`;
    }).join('');
    $('#rankDlg').innerHTML = `<div class="sys-title">Ranks</div><h2>${esc(u.name)}</h2>
      <p class="muted">Every rank doubles their damage and gives them better gear. You have <b>${fmt(own)}</b>${own ? `, so they’re <b style="color:${GH.RANKS[cur].color}">${esc(GH.rankName(own))}</b>` : ''}.</p>
      <ol class="ranklist">${rows}</ol>
      <p class="muted small">After Legends, every further 100 doubles their damage again. Tip: the Next button buys exactly enough to reach the next rank.</p>
      <div class="dlg-actions"><button type="button" class="primary" id="rankClose">Close</button></div>`;
    openDlg($('#rankDlg'));
    $('#rankClose').addEventListener('click', () => closeDlg($('#rankDlg')));
  }

  // form details
  function openForm(id) {
    const f = FORM[id];
    const vis = formVisible(f);
    const fam = FAMILY[f.fam];
    const known = !!S.codex[id];
    const status = id === S.form ? 'This is your current form.' : known ? 'Remembered: you’ve been this form before.' : vis ? 'Discovered, not yet reached.' : 'Undiscovered.';
    const from = f.parents.length ? f.parents.map((p) => formVisible(FORM[p]) ? FORM[p].name : '???').join(' or ') : 'Where every corrupted player starts.';
    const into = f.children.length ? f.children.map((c) => formVisible(FORM[c]) ? FORM[c].name : '???').join(', ') : 'Nothing. This is a final form, with no level cap.';
    const can = canEvolveTo(id);
    $('#formDlg').innerHTML = `
      <div class="form-head" style="--fam:${fam.color}">
        <img src="${Art.portrait(f, 128, !vis)}" alt="">
        <div><h2>${vis ? esc(f.name) : '???'}</h2><div class="fam">${fam.name} family · CR ${f.cr} · tier ${f.tier}</div></div>
      </div>
      ${vis ? `<p>${esc(f.perk)}</p>` : '<p class="muted">You haven’t discovered this form. Reach a form next to it on the tree to learn more.</p>'}
      <dl class="stats">
        <dt>Max level</dt><dd>${f.final ? 'None' : f.maxLv}</dd>
        <dt>Evolves from</dt><dd style="font-family:var(--sans)">${esc(from)}</dd>
        <dt>Evolves into</dt><dd style="font-family:var(--sans)">${esc(into)}</dd>
        ${f.req && vis ? `<dt>Needs</dt><dd style="font-family:var(--sans)">${esc(GH.reqText(f.req))}</dd>` : ''}
      </dl>
      <p class="muted small" style="margin-top:12px">${status}</p>
      <div class="dlg-actions">
        <button type="button" class="secondary" id="formClose">Close</button>
        ${can ? `<button type="button" class="primary evo" id="formEvolve">Evolve</button>` : ''}
      </div>`;
    openDlg($('#formDlg'));
    $('#formClose').addEventListener('click', () => closeDlg($('#formDlg')));
    const ev = $('#formEvolve');
    if (ev) ev.addEventListener('click', () => { closeDlg($('#formDlg')); closeDlg($('#treeDlg')); confirmEvolve(id); });
  }

  // evolution tree, laid out like the reference chart
  function openTree() {
    const CW = 140, RH = 86, NW = 124, NH = 56, M = 16;
    const X = (f) => M + f.col * CW, Y = (f) => M + f.row * RH;
    const maxCol = Math.max(...FORMS.map((f) => f.col)), maxRow = Math.max(...FORMS.map((f) => f.row));
    const W = M * 2 + maxCol * CW + NW, H = M * 2 + maxRow * RH + NH;
    const vRoute = new Set(['orc', 'orog']);
    let edges = '';
    for (const f of FORMS) {
      for (const pid of f.parents) {
        const p = FORM[pid];
        const known = (S.codex[pid] || pid === S.form) && (S.codex[f.id] || f.id === S.form);
        const dashed = f.dashed && f.dashed.includes(pid);
        let d;
        const pcx = X(p) + NW / 2, pcy = Y(p) + NH / 2, ccx = X(f) + NW / 2, ccy = Y(f) + NH / 2;
        if (p.col === f.col) d = f.row > p.row ? `M${pcx} ${Y(p) + NH}V${Y(f)}` : `M${pcx} ${Y(p)}V${Y(f) + NH}`;
        else if (p.row === f.row) d = f.col > p.col ? `M${X(p) + NW} ${pcy}H${X(f)}` : `M${X(p)} ${pcy}H${X(f) + NW}`;
        else if (vRoute.has(pid)) { const my = (Y(p) + NH + Y(f)) / 2; d = `M${pcx} ${Y(p) + NH}V${my}H${ccx}V${Y(f)}`; }
        else if (f.col > p.col) { const mx = X(p) + NW + 8; d = `M${X(p) + NW} ${pcy}H${mx}V${ccy}H${X(f)}`; }
        else { const mx = X(p) - 8; d = `M${X(p)} ${pcy}H${mx}V${ccy}H${X(f) + NW}`; }
        edges += `<path d="${d}" fill="none" stroke="${known ? 'rgba(239,230,210,.75)' : 'rgba(239,230,210,.28)'}" stroke-width="${known ? 2 : 1.5}" ${dashed ? 'stroke-dasharray="5 4"' : ''}/>`;
      }
    }
    let nodes = '';
    for (const f of FORMS) {
      const vis = formVisible(f);
      const known = !!S.codex[f.id];
      const cur = f.id === S.form;
      const fam = FAMILY[f.fam].color;
      const x = X(f), y = Y(f);
      const can = canEvolveTo(f.id);
      const stroke = cur ? '#F2C14E' : can ? '#FF4F8B' : known ? fam : 'rgba(239,230,210,.3)';
      const sw = cur || can ? 2.5 : known ? 1.5 : 1;
      const label = cur ? 'You' : can ? 'Evolve' : known ? 'Known' : vis ? (f.req && !GH.reqMet(f.req, S) ? 'Locked' : '') : '';
      nodes += `<g class="tnode" data-id="${f.id}" tabindex="0" role="button" aria-label="${vis ? esc(f.name) : 'Undiscovered form'}">
        <rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="5" fill="#2B241B" stroke="${stroke}" stroke-width="${sw}" ${!vis ? 'stroke-dasharray="4 3"' : ''}/>
        <rect x="${x + 1}" y="${y + 1}" width="${NW - 2}" height="22" rx="4" fill="${fam}" opacity="${vis ? 1 : 0.28}"/>
        <text class="tn-name" x="${x + NW / 2}" y="${y + 16}" text-anchor="middle" fill="${vis ? '#16130F' : 'rgba(239,230,210,.7)'}">${vis ? esc(f.name) : '???'}</text>
        <text class="tn-cr" x="${x + 8}" y="${y + 43}" fill="rgba(239,230,210,.75)">CR ${f.cr}</text>
        <text class="tn-cr" x="${x + NW - 8}" y="${y + 43}" text-anchor="end" fill="${cur ? '#F2C14E' : can ? '#FF4F8B' : 'rgba(239,230,210,.6)'}">${label}</text>
      </g>`;
    }
    const start = `<text x="${X(FORM.goblin) + NW / 2}" y="${M - 4}" text-anchor="middle" fill="rgba(239,230,210,.5)" font-family="Pixelify Sans" font-size="11">start</text>`;
    $('#treeScroll').innerHTML = `<svg width="${W}" height="${H + 6}" viewBox="0 -6 ${W} ${H + 6}" xmlns="http://www.w3.org/2000/svg">${start}${edges}${nodes}</svg>`;
    openDlg($('#treeDlg'));
    // centre the current form
    const cf = FORM[S.form];
    const sc = $('#treeScroll');
    sc.scrollLeft = Math.max(0, X(cf) + NW / 2 - sc.clientWidth / 2);
    sc.scrollTop = Math.max(0, Y(cf) + NH / 2 - sc.clientHeight / 2);
  }
  $('#treeScroll').addEventListener('click', (e) => { const n = e.target.closest('.tnode'); if (n) openForm(n.dataset.id); });
  $('#treeScroll').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const n = e.target.closest('.tnode'); if (n) { e.preventDefault(); openForm(n.dataset.id); } } });
  $('#treeBtn').addEventListener('click', openTree);
  $('#treeClose').addEventListener('click', () => closeDlg($('#treeDlg')));

  // settings
  function fillStats() {
    const rows = [
      ['Adventurers defeated', fmt(S.killsEver)],
      ['Taps', fmt(S.taps)],
      ['Raids repelled', `${fmt(S.raidsWon)} of ${fmt(S.raidsWon + S.raidsLost)}`],
      ['Regions conquered (best)', `${S.bestRegionEver || 0} of ${GH.FINAL_REGION + 1}`],
      ['Server rollbacks', fmt(S.rollbacks)],
      ['Goblins in your town', S.town.unlocked ? fmt(S.town.pop) : '—'],
      ['Technologies', `${Object.keys(S.town.tech).length} of ${Town.TECHS.length}`],
      ['Remembered forms', `${Object.keys(S.codex).length} of ${FORMS.length}`],
      ['Feats', `${GH.Meta.featCount(S)} of ${GH.Meta.FEATS.filter((f) => !f.shadow).length}`],
      ['Exploit points, all time', fmt(S.meta.epEver)],
      ...(S.meta.relicOpens ? [['Relics', `${GH.Meta.relicCount(S)} of ${GH.Meta.RELICS.length}`]] : []),
      ...(S.meta.wipes ? [['Server wipes', `${fmt(S.meta.wipes)} · root access ${S.meta.ra}`]] : []),
      ['Shinies, all time', fmt(S.goldEver)],
      ['Time played', fmtTime(S.played)],
    ];
    $('#stats').innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  }
  let deferredPrompt = null;
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
  function updateInstallRow() {
    const btn = $('#installBtn'), note = $('#installNote');
    if (isStandalone()) { btn.hidden = true; note.textContent = 'You’re playing the installed app.'; }
    else if (deferredPrompt) { btn.hidden = false; note.textContent = 'Adds Goblin Haven to your home screen and app drawer.'; }
    else { btn.hidden = true; note.textContent = 'In Chrome, tap the ⋮ menu, then “Install app” or “Add to home screen”.'; }
  }
  $('#menuBtn').addEventListener('click', () => {
    fillStats(); updateInstallRow();
    $('#vibrateToggle').checked = !!S.vibrate;
    $('#autoToggle').checked = !!S.autoBoss;
    GH.emit('menu');
    openDlg($('#menuDlg'));
  });
  $('#menuClose').addEventListener('click', () => closeDlg($('#menuDlg')));
  $('#vibrateToggle').addEventListener('change', (e) => { S.vibrate = e.target.checked; buzz(15); save(); });
  $('#autoToggle').addEventListener('change', (e) => { S.autoBoss = e.target.checked; bossBlockPower = 0; save(); });
  $('#resetBtn').addEventListener('click', () => {
    closeDlg($('#menuDlg'));
    confirmAsk('Delete your save?', 'This erases everything, including corrupted data and remembered forms, and starts the story over. It can’t be undone.', 'Delete save', () => {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
      location.reload();
    });
  });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; updateInstallRow(); });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; updateInstallRow(); sys('Installed. Goblin Haven is now in your app drawer.', 'gold'); });
  $('#installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    const p = deferredPrompt; deferredPrompt = null;
    p.prompt();
    try { await p.userChoice; } catch (e) { /* ignore */ }
    updateInstallRow();
  });

  // away
  function awayGain(sec) {
    if (!(sec > 1)) return;
    const capped = Math.min(sec, D.offCap || K.OFFLINE_CAP);
    let kills = 0, g = 0, xp = 0;
    const lv0 = S.level;
    const s = GH.stageOf(S.region, S.threat);
    if (sec >= 30 && D.dps > 0) {
      const tpk = K.SPAWN_DELAY + (GH.hp(s) * D.hpM) / D.dps;
      kills = Math.floor(capped / tpk);
      if (kills >= 1) {
        g = kills * GH.goldAt(s) * D.goldM * D.offM;
        xp = kills * GH.xpAt(s) * D.xpM * D.offM;
        earn(g);
        S.kills += kills; S.killsEver += kills;
        S.threat = Math.min(10, S.threat + kills);
        S.best = Math.max(S.best, GH.stageOf(S.region, S.threat));
        gainXp(xp, true);
      }
    }
    const town = S.town.unlocked ? Town.advance(S, capped) : null;
    if (town) derive();
    if (sec < 60 || (kills < 1 && !town)) return;
    $('#awayTime').textContent = fmtTime(sec);
    const rows = [];
    if (kills >= 1) {
      rows.push(['Adventurers defeated', fmt(kills)], ['Shinies looted', fmt(g)], ['XP gained', fmt(xp)]);
      if (S.level > lv0) rows.push(['Levels gained', String(S.level - lv0)]);
    }
    if (town) {
      if (town.born) rows.push(['Goblins hatched', fmt(town.born)]);
      for (const r of Town.RES) if (town.gained[r.id] >= 1) rows.push([`${r.name} gathered`, fmt(town.gained[r.id])]);
    }
    if (sec > capped) rows.push(['Earnings cap', fmtTime(capped)], ['Cap reached', `${fmtTime(sec - capped)} ago`]);
    else rows.push(['Earnings cap', fmtTime(D.offCap || K.OFFLINE_CAP)]);
    GH.emit('away', sec, rows, capped);
    $('#awayStats').innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    openDlg($('#awayDlg'));
  }
  $('#awayOk').addEventListener('click', () => { closeDlg($('#awayDlg')); buzz(20); if (evoReady()) sys('Maximum level reached. Evolution available: open the Hero tab.', 'glitch', 'evo'); });

  // victory
  function showVictory() {
    if (GH.ask('victory')) return;
    const lines = [
      ['System', `${GH.REGIONS[GH.FINAL_REGION].boss} has been defeated.`, ''],
      ['Sys█em', 'Emergency patch 6.6.6 deployed by unknown user.', 'glitch'],
      ['System', 'Character creation updated. Available races: Goblin.', 'gold'],
      ['System', 'Aethermoor Online is now Goblin Haven. New players are joining as goblins.', 'gold'],
    ];
    $('#victoryBody').innerHTML = `<h2 style="margin:0">The world is yours</h2>` +
      lines.map(([t, m, k]) => `<div class="sysmsg ${k}"><span class="st">${t}</span>${esc(m)}</div>`).join('') +
      `<p class="muted small">Beyond the Admin Spire lie unfinished server shards. Keep pushing, and keep collecting forms: ${Object.keys(S.codex).length} of ${FORMS.length} remembered.</p>` +
      (S.town.unlocked && !Town.has(S, 'haven') ? '<p class="muted small">Back home, your tinkerers can now research the Haven Protocol and make Mudhollow a permanent safe zone.</p>' : '');
    openDlg($('#victoryDlg'));
  }
  $('#victoryOk').addEventListener('click', () => closeDlg($('#victoryDlg')));

  // ------------------------------------------------------------------ first launch story
  function runIntro() {
    const intro = $('#intro'), body = $('#introBody');
    intro.hidden = false;
    const elder = Art.portrait({ id: 'elder', fam: 'goblin', look: { h: 11, skin: '#6E9446', ears: 3, hood: '#4A3B2C', weapon: 'none' } }, 104);
    const steps = [
      () => `<div class="logo">AETHERMOOR<small>ONLINE</small></div>
        <div class="sysmsg"><span class="st">System</span>Full-dive link established. Welcome, adventurer.<div class="bar"><span id="introBar"></span></div></div>
        <button type="button" class="primary go" data-next>Continue</button>`,
      () => `<div class="sysmsg"><span class="st">System</span>Loading character data…<br><span class="err">ERROR 0x6B: character record corrupted.</span></div>
        <div class="sysmsg glitch"><span class="st">Sys█em</span>Attempting recovery… Fallback template found: <b>MOB_GOBLIN_STARTER_03</b>.</div>
        <button type="button" class="primary go" data-next>Continue</button>`,
      () => `<div class="sysmsg"><span class="st">System</span>Please confirm your character name.
          <input id="nameInput" maxlength="16" autocomplete="off" autocapitalize="words" placeholder="Your name" aria-label="Character name"></div>
        <button type="button" class="primary go" data-name>Confirm name</button>`,
      () => `<div class="sysmsg"><span class="st">System</span>Name: <b class="glitchtext">${esc(S.name)}</b><br>Race: Goblin. Level 1.<br>Location: Mudhollow (starter zone, designated XP farming area).<br>Respawn timer: 30 seconds.</div>
        <button type="button" class="primary go" data-next>Continue</button>`,
      () => `<div class="speech"><img src="${elder}" alt=""><div><b>Elder Mossgrin</b>You blinked at me. Mobs don’t blink. You’re one of <i>them</i>, aren’t you? …No. Not any more.<br><br>The tall ones come every morning to kill us for their numbers. Please. Make them stop.</div></div>
        <button type="button" class="primary go" data-done>Defend Mudhollow</button>`,
    ];
    let k = 0;
    function show() {
      body.innerHTML = steps[k]();
      const bar = $('#introBar');
      if (bar) requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = '100%'; }));
      const inp = $('#nameInput');
      if (inp) { inp.value = S.name || ''; setTimeout(() => inp.focus(), 50); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitName(); }); }
    }
    function commitName() {
      const v = ($('#nameInput').value || '').replace(/[^\p{L}\p{N} _.'-]/gu, '').trim().slice(0, 16);
      S.name = v || 'Nameless';
      k++; show();
    }
    function finish() {
      intro.hidden = true;
      S.introDone = true;
      if (!S.name) S.name = 'Nameless';
      save();
      render(true);
      setTimeout(() => sys('Tap the adventurer to fight back.', ''), 600);
    }
    body.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-next')) { k++; show(); }
      else if (b.hasAttribute('data-name')) commitName();
      else if (b.hasAttribute('data-done')) finish();
    };
    $('#introSkip').onclick = () => { if (!S.name) S.name = 'Nameless'; finish(); };
    show();
  }

  // ------------------------------------------------------------------ input
  const tapBase = () => (D.heroTap + dpsNow() * D.tapPct) * live().tap;
  // Deals damage to whoever you're fighting. Returns false if there's nobody to hit yet.
  function hitEnemy(dmg, crit, label, now, quiet) {
    now = now || performance.now();
    if (!enemy || enemy.dead || !scene.enemyArrived(now)) return false;
    enemy.hp -= dmg;
    scene.hit(dmg, crit, label || fmt(dmg, true), quiet);
    GH.emit('hit', enemy, dmg, crit);
    if (enemy.hp <= 0) onKill(now);
    return true;
  }
  function tap(now, auto) {
    if (!auto || Math.random() < 0.35) scene.heroAttack();
    if (!auto) { S.taps++; if (S.taps >= 4) $('#hint').hidden = true; }
    if (!enemy || enemy.dead || !scene.enemyArrived(now)) return;
    const scale = GH.ask('tapScale');
    const crit = D.crit > 0 && Math.random() < D.crit;
    const dmg = tapBase() * (crit ? D.critX : 1) * (scale == null ? 1 : scale);
    if (!auto) buzz(crit ? 18 : 6);
    GH.emit('tap', dmg, crit, auto);
    hitEnemy(dmg, crit, (crit ? 'CRIT ' : '') + fmt(dmg, true), now, auto);
  }
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const now = performance.now();
    if (GH.ask('sceneTap', e, now)) return;
    tap(now, false);
  });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  // desktop: keyboard play. Space or F attacks (held keys don't repeat), 1-5 switch tabs.
  const TAB_KEYS = ['hero', 'village', 'town', 'ups', 'world'];
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    const el = e.target;
    if (el.closest && el.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (e.code === 'Space' || e.code === 'KeyF') {
      if (e.code === 'Space' && el.closest && el.closest('button, a, [tabindex]')) return; // let Space press the focused button
      e.preventDefault();
      if (e.repeat) return;
      const now = performance.now();
      if (!GH.ask('sceneTap', null, now)) tap(now, false);
    } else if (/^Digit[1-5]$/.test(e.code)) {
      setTab(TAB_KEYS[Number(e.code[5]) - 1]);
    }
  });
  if (matchMedia('(pointer: fine)').matches) $('#hint').innerHTML = 'Click or press <span class="kbd">Space</span> to fight';

  // ------------------------------------------------------------------ time
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      if (fight) { fight = null; if (enemy) { enemy.dead = true; enemy.deadT = 1; } }
      GH.emit('hide');
      save();
    } else if (hiddenAt) {
      GH.emit('show');
      awayGain((Date.now() - hiddenAt) / 1000);
      hiddenAt = 0;
      lastNow = performance.now();
      nextSpawnAt = lastNow + 300;
      render(true);
    }
  });
  window.addEventListener('pagehide', save);

  let uiAcc = 0, saveAcc = 0, townAcc = 0, deriveAcc = 0, secAcc = 0;
  function loop(now) {
    let dt = (now - lastNow) / 1000;
    lastNow = now;
    if (!(dt > 0)) dt = 0;
    if (dt > 1) dt = 1;
    if (S.introDone) {
      if ((!enemy || enemy.dead) && now >= nextSpawnAt) spawn(now);
      if (enemy && !enemy.dead && scene.enemyArrived(now)) {
        enemy.hp -= dpsNow() * dt;
        if (enemy.hp <= 0) onKill(now);
      }
      if (fight && enemy && !enemy.dead && now >= fight.end) fightFailed(now);
      GH.emit('tick', dt, now);
      secAcc += dt;
      if (secAcc >= 1) { secAcc = 0; GH.emit('sec', now); }
      if (!fight && !raidPending && S.conquered >= 1 && Date.now() >= S.nextRaid && !GH.ask('noRaids')) {
        raidPending = true;
        if (enemy && !enemy.dead && !enemy.boss) { enemy.dead = true; enemy.deadT = 0.2; nextSpawnAt = now + 1200; }
        sys(`Raid incoming! A party is attacking Mudhollow. Beat them before the timer runs out, or they’ll loot your shinies.`, 'warn', 'raid');
        buzz(80);
      }
      S.played += dt;
      if (S.town.unlocked) {
        townAcc += dt;
        if (townAcc >= 0.25) { const born = Town.tick(S, townAcc); townAcc = 0; if (born) onHatch(born); }
        deriveAcc += dt;
        if (deriveAcc >= 1) { deriveAcc = 0; derive(); }
      }
    }
    scene.frame(dt, now, heroView());
    if (S.tab === 'town' && S.town.unlocked) townView.frame(dt, now, townViewState());
    uiAcc += dt;
    if (uiAcc >= 0.12) { uiAcc = 0; render(false); }
    saveAcc += dt;
    if (saveAcc >= 5) { saveAcc = 0; if (S.introDone) save(); }
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------ the internal API for more.js
  const App = {
    get S() { return S; }, set S(v) { S = v; notation = S.meta.notation || 'letters'; derive(); },
    get D() { return D; }, get enemy() { return enemy; }, get fight() { return fight; },
    setFight(f) { fight = f; }, setEnemy(e) { enemy = e; scene.setEnemy(e); }, spawnAt(t) { nextSpawnAt = t; },
    raidNow() { raidPending = true; }, raidGap,
    derive, render, save, sys, chat, buzz, fmt, fmtTime, esc, set, setClass, pick, randomName,
    openDlg, closeDlg, confirmAsk, setTab, setSub, scene, townView, earn, gainXp, dpsNow, rallyM, live, tap, tapBase, hitEnemy,
    buyUnit, buyUpgrade, rollback, conquer, evolve, updatePortrait, parseSave, renderWorld,
    setNotation(n) { notation = n; S.meta.notation = n; render(true); },
    SAVE_KEY, BACKUP_KEY, CLASSES, FIXED_NAMES, chatEl,
  };
  GH.App = App;

  // ------------------------------------------------------------------ start
  buildUnitRows();
  buildResBar();
  buildJobRows();
  GH.emit('init', App);
  setStep(S.town.step || 1);
  setSub(S.town.sub || 'jobs');
  updatePortrait();
  setTab(S.tab || 'hero');
  setBuyMode(S.buyMode || 1);
  if (S.taps >= 4) $('#hint').hidden = true;
  if (!S.introDone) runIntro();
  else awayGain((Date.now() - S.saved) / 1000);
  if (restoredFromBackup) setTimeout(() => sys('Your save was damaged, so Goblin Haven loaded your last backup.', 'warn', 'restored'), 900);
  GH.emit('ready');
  if (S.nextRaid < Date.now()) S.nextRaid = Date.now() + 120e3;
  if (S.introDone && (S.bestRegionEver || 0) >= 1 && !S.town.unlocked) unlockTown();
  render(true);
  requestAnimationFrame((t) => { lastNow = t; requestAnimationFrame(loop); });

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    let had = !!navigator.serviceWorker.controller;
    const bootAt = Date.now();
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!had) { had = true; return; }
      save();
      // an update that lands right after opening the app is applied straight away
      if (Date.now() - bootAt < 20000 && !document.querySelector('dialog[open]')) { location.reload(); return; }
      sys('A new version of Goblin Haven is ready. Close and reopen the app to update.', 'gold');
    });
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // for testing from the console
  window.__gh = { get state() { return S; }, set state(v) { S = v; derive(); }, derive, render, save, evolve, rollback, conquer,
    get enemy() { return enemy; }, spawnRaid: () => { raidPending = true; }, showVictory, unlockTown, Town, setTab, setSub, App };
})();
