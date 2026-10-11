// Goblin Haven: everything that sits on top of a run. Exploits, feats, patch notes, the raid log. No DOM here.
(function (root) {
  'use strict';
  const GH = root.GH;

  // ------------------------------------------------------------------ event bus (app.js emits, more.js listens)
  const bus = {};
  GH.on = (ev, fn) => { (bus[ev] = bus[ev] || []).push(fn); };
  GH.emit = (ev, a, b, c) => {
    const l = bus[ev];
    if (!l) return;
    for (const f of l) { try { f(a, b, c); } catch (e) { if (root.console) console.error('[' + ev + ']', e); } }
  };
  // first listener that returns something wins
  GH.ask = (ev, a, b, c) => {
    const l = bus[ev];
    if (!l) return null;
    for (const f of l) { const r = f(a, b, c); if (r != null && r !== false) return r; }
    return null;
  };

  // ------------------------------------------------------------------ state
  function freshMeta() {
    return {
      ep: 0, epEver: 0, epSpent: 0, ex: {},
      feats: {}, featSeen: 0, title: '',
      runs: [], binds: [],
      bots: { recruit: false, upgrade: false, rollback: false, rollbackAt: 0, tricks: false },
      exportAt: 0, backupNag: 0, notation: 'letters',
      c: { maxLv: 1, tricks: 0, mythic: 0, mythicSeen: 0, whales: 0, whispers: 0, parties: {}, edicts: 0, exp: 0, leeches: 0, shinies: 0, ev: {} },
      logs: {}, logSeen: 0,          // recovered data logs: id -> when found
      ch: {},                        // hardcore servers: id -> { best, done }
      ending: '', endings: {},       // the choice after the Admin Spire
      sound: { sfx: false, music: false },
      trickSeen: 0,
      corrupt: 0,                    // 0 clean, 1 seep, 2 flood
      relics: {}, relicOpens: 0, relicPity: { r: 0, e: 0, l: 0 }, relicKeys: 0,
      ra: 0, wipes: 0,               // root access, from server wipes
      portal: null, portalAt: 0,     // replaying a past event: { id, until }
      dayBoss: '', evSeen: '',
    };
  }
  function fixMeta(m) {
    const f = freshMeta();
    if (!m || typeof m !== 'object') return f;
    const o = Object.assign(f, m);
    for (const k of ['ex', 'feats', 'c', 'bots', 'logs', 'ch', 'endings', 'sound', 'relics', 'relicPity']) o[k] = Object.assign(freshMeta()[k], m[k] && typeof m[k] === 'object' ? m[k] : {});
    if (!o.c.parties || typeof o.c.parties !== 'object') o.c.parties = {};
    if (!o.c.ev || typeof o.c.ev !== 'object') o.c.ev = {};
    for (const id of Object.keys(o.relics)) if (!RELIC[id] || !(o.relics[id] > 0)) delete o.relics[id]; else o.relics[id] = Math.min(RELIC_MAX, Math.floor(o.relics[id]));
    for (const k of ['relicOpens', 'relicKeys', 'ra', 'wipes', 'portalAt']) if (!isFinite(o[k]) || o[k] < 0) o[k] = 0;
    o.corrupt = [0, 1, 2].includes(o.corrupt) ? o.corrupt : 0;
    if (!o.portal || typeof o.portal !== 'object' || !EV[o.portal.id]) o.portal = null;
    if (!Array.isArray(o.runs)) o.runs = [];
    if (!Array.isArray(o.binds)) o.binds = [];
    for (const k of ['ep', 'epEver', 'epSpent', 'exportAt', 'backupNag', 'featSeen', 'logSeen', 'trickSeen', 'relicOpens']) if (!isFinite(o[k]) || o[k] < 0) o[k] = 0;
    if (typeof o.ending !== 'string') o.ending = '';
    return o;
  }

  // ------------------------------------------------------------------ patch notes: what each server rollback leaves behind
  const MILESTONES = [
    { n: 1, id: 'botRecruit', patch: '1.0.1', title: 'Hotfix: goblin aggro', gift: 'Bot script: auto-recruit. Find the switch in the Warband tab.' },
    { n: 2, id: 'seed1', patch: '1.0.2', title: 'Economy rebalance', gift: 'Seed money: start each run with 1% of the shinies you earned last run. Your goblins can also build a Town Hall.' },
    { n: 3, id: 'botUpgrade', patch: '1.1', title: 'Mob AI cleanup', gift: 'Bot script: auto-upgrade, in the Upgrades tab. Hardcore Servers open in the World tab, and your goblins can build an Expedition Camp.' },
    { n: 4, id: 'corruption', patch: '1.1.1', title: 'Data integrity check', gift: 'Corruption: let the glitch in for more power, from the World tab. The Replay Portal opens too.' },
    { n: 5, id: 'bind1', patch: '1.2', title: 'Inventory wipe', gift: 'Bind-on-Account: one upgrade of your choice stays bought through rollbacks.' },
    { n: 6, id: 'vault', patch: '1.2.1', title: 'Backup policy', gift: 'Your goblins can build a Data Vault: more exploit points from every rollback.' },
    { n: 7, id: 'skipTut', patch: '1.3', title: 'Starter zone rework', gift: 'Skip the tutorial: start each run with Mudhollow already conquered.' },
    { n: 10, id: 'seed2', patch: '1.4', title: 'Gold sink pass', gift: 'Seed money rises to 5% of last run’s shinies.' },
    { n: 15, id: 'bind2', patch: '1.5', title: 'Account-wide progress', gift: 'A second Bind-on-Account slot.' },
    { n: 20, id: 'botTricks', patch: '2.0', title: 'Skill rotation', gift: 'Bot script: autocast Dirty Tricks. Switch it on in the Hero tab; cooldowns are 50% longer while it runs.' },
    { n: 25, id: 'botRollback', patch: '2.1', title: 'Automated recovery', gift: 'Bot script: auto-rollback once a run reaches the corrupted data you choose.' },
    { n: 40, id: 'bind3', patch: '2.5', title: 'Legacy systems', gift: 'A third Bind-on-Account slot.' },
  ];
  const MS = {};
  MILESTONES.forEach((m) => { MS[m.id] = m; });
  const ms = (S, id) => !!MS[id] && (S.rollbacks || 0) >= MS[id].n;
  const bindSlots = (S) => ['bind1', 'bind2', 'bind3'].filter((id) => ms(S, id)).length + (chDone(S, 'ironman') ? 1 : 0);
  const nextMilestone = (S) => MILESTONES.find((m) => (S.rollbacks || 0) < m.n) || null;

  // ------------------------------------------------------------------ exploit tree, bought with exploit points (EP)
  // fx values are per level and add up: +20% per level is 1 + 0.2 × level.
  const BRANCHES = [
    { id: 'afk', name: 'AFK', blurb: 'Idle tricks for a goblin who isn’t watching.', color: '#9BC46A' },
    { id: 'hack', name: 'Hacks', blurb: 'For goblins who like to tap.', color: '#FF4F8B' },
    { id: 'mod', name: 'Mods', blurb: 'Client mods for your town.', color: '#7FE0F5' },
  ];
  const EXPLOITS = [
    { id: 'dupe', br: 'afk', name: 'Gold Dupe Glitch', max: 25, base: 2, g: 1.45, fx: { gold: 0.2 }, per: 'Shinies +20% per level.' },
    { id: 'bots', br: 'afk', name: 'Bot Army', req: 'dupe', max: 25, base: 2, g: 1.45, fx: { warband: 0.2 }, per: 'Warband damage +20% per level.' },
    { id: 'farm', br: 'afk', name: 'XP Farm Route', req: 'dupe', max: 15, base: 5, g: 1.5, fx: { xp: 0.25 }, per: 'XP +25% per level.' },
    { id: 'afk', br: 'afk', name: 'AFK Macro', req: 'bots', max: 12, base: 5, g: 1.6, fx: { offline: 0.25, offCapH: 2 }, per: 'Earnings while away +25% and 2 more hours count, per level.' },
    { id: 'seed', br: 'afk', name: 'Inherited Wallet', req: 'afk', max: 10, base: 10, g: 1.7, fx: { seed: 0.01 }, per: 'Start each run with another 1% of last run’s shinies, per level.' },
    { id: 'hitbox', br: 'hack', name: 'Hitbox Exploit', max: 25, base: 2, g: 1.45, fx: { tap: 0.3 }, per: 'Tap damage +30% per level.' },
    { id: 'desync', br: 'hack', name: 'Desync Crits', req: 'hitbox', max: 10, base: 4, g: 1.6, fx: { crit: 0.02 }, per: '+2% crit chance per level. Crits hit at least 3× as hard.' },
    { id: 'cdr', br: 'hack', name: 'Cooldown Exploit', req: 'hitbox', max: 10, base: 5, g: 1.6, fx: { cdr: 0.04 }, per: 'Dirty Tricks recharge 4% faster per level.' },
    { id: 'cheese', br: 'hack', name: 'Boss Cheese', req: 'hitbox', max: 10, base: 4, g: 1.55, fx: { boss: 3 }, per: 'Raid leaders give you 3 more seconds per level.' },
    { id: 'rally', br: 'hack', name: 'Rally Abuse', req: 'cheese', max: 6, base: 6, g: 1.6, fx: { rally: 10, raidGold: 0.25 }, per: 'Rallies last 10 seconds longer and raids drop 25% more shinies, per level.' },
    { id: 'hatch', br: 'mod', name: 'Spawn Rate Mod', max: 15, base: 3, g: 1.5, fx: { hatch: 0.1 }, per: 'Goblins hatch 10% faster per level.' },
    { id: 'res', br: 'mod', name: 'Resource Dupe', req: 'hatch', max: 25, base: 3, g: 1.45, fx: { gather: 0.1 }, per: 'Town gathering +10% per level.' },
    { id: 'mood', br: 'mod', name: 'Mood Mod', req: 'res', max: 10, base: 6, g: 1.6, fx: { comfort: 0.1 }, per: 'Comfort +10% per level.' },
    { id: 'think', br: 'mod', name: 'Tinker Overclock', req: 'res', max: 15, base: 6, g: 1.55, fx: { ideas: 0.2 }, per: 'Tinkerers think 20% faster per level.' },
  ];
  const EX = {};
  EXPLOITS.forEach((e) => { EX[e.id] = e; });
  const exLvl = (S, id) => (S.meta && S.meta.ex[id]) || 0;
  const exCost = (id, L) => Math.ceil(EX[id].base * Math.pow(EX[id].g, L));
  function exOpen(S, id) { const e = EX[id]; return !e.req || exLvl(S, e.req) > 0; }
  function exSum(S, key) {
    let s = 0;
    for (const e of EXPLOITS) if (e.fx[key]) s += e.fx[key] * exLvl(S, e.id);
    return s;
  }
  function buyEx(S, id) {
    const e = EX[id], L = exLvl(S, id);
    if (!e || L >= e.max || !exOpen(S, id)) return false;
    const c = exCost(id, L);
    if (S.meta.ep < c) return false;
    S.meta.ep -= c;
    S.meta.epSpent += c;
    S.meta.ex[id] = L + 1;
    return true;
  }
  // spent points come back at 75%
  function respecValue(S) {
    let spent = 0;
    for (const e of EXPLOITS) for (let L = 0; L < exLvl(S, e.id); L++) spent += exCost(e.id, L);
    return Math.floor(spent * 0.75);
  }
  function respec(S) {
    const back = respecValue(S);
    S.meta.ep += back;
    S.meta.ex = {};
    return back;
  }

  // ------------------------------------------------------------------ feats
  // Every normal feat makes everything 2% stronger. Shadow feats are secret and give nothing but bragging rights.
  const FEAT_BONUS = 0.02;
  const ge = (a, b) => (a || 0) >= b;
  const tc = (S) => (S.town && S.town.unlocked ? S.town : null);
  const FEATS = [
    // adventurers
    { id: 'k1', cat: 'Fighting', name: 'First Blood', desc: 'Defeat an adventurer.', v: (S) => S.killsEver, n: 1 },
    { id: 'k100', cat: 'Fighting', name: 'Spawn Camper', desc: 'Defeat 100 adventurers.', v: (S) => S.killsEver, n: 100 },
    { id: 'k1k', cat: 'Fighting', name: 'Ear Collector', desc: 'Defeat 1,000 adventurers.', v: (S) => S.killsEver, n: 1000 },
    { id: 'k10k', cat: 'Fighting', name: 'Respawn Timer', desc: 'Defeat 10,000 adventurers.', v: (S) => S.killsEver, n: 1e4, title: 'the Camper' },
    { id: 'k100k', cat: 'Fighting', name: 'Server Lag', desc: 'Defeat 100,000 adventurers.', v: (S) => S.killsEver, n: 1e5 },
    { id: 'k1m', cat: 'Fighting', name: 'Population Control', desc: 'Defeat 1,000,000 adventurers.', v: (S) => S.killsEver, n: 1e6, title: 'the Extinction Event' },
    { id: 't100', cat: 'Fighting', name: 'Poke', desc: 'Tap 100 times.', v: (S) => S.taps, n: 100 },
    { id: 't1k', cat: 'Fighting', name: 'Button Masher', desc: 'Tap 1,000 times.', v: (S) => S.taps, n: 1000 },
    { id: 't10k', cat: 'Fighting', name: 'Carpal Tunnel', desc: 'Tap 10,000 times.', v: (S) => S.taps, n: 1e4, title: 'the Masher' },
    { id: 't100k', cat: 'Fighting', name: 'Macro? No, Skill', desc: 'Tap 100,000 times.', v: (S) => S.taps, n: 1e5 },
    { id: 'rw1', cat: 'Fighting', name: 'Hold the Line', desc: 'Repel a raid on your village.', v: (S) => S.raidsWon, n: 1 },
    { id: 'rw10', cat: 'Fighting', name: 'Raid Night Ruined', desc: 'Repel 10 raids.', v: (S) => S.raidsWon, n: 10 },
    { id: 'rw50', cat: 'Fighting', name: 'Guild Wrecker', desc: 'Repel 50 raids.', v: (S) => S.raidsWon, n: 50, title: 'Raid Breaker' },
    { id: 'rw200', cat: 'Fighting', name: 'Wipe Simulator', desc: 'Repel 200 raids.', v: (S) => S.raidsWon, n: 200 },
    // shinies
    { id: 'g1k', cat: 'Shinies', name: 'Pocket Change', desc: 'Earn 1,000 shinies.', v: (S) => S.goldEver, n: 1e3 },
    { id: 'g1m', cat: 'Shinies', name: 'Loot Goblin', desc: 'Earn 1 million shinies.', v: (S) => S.goldEver, n: 1e6 },
    { id: 'g1b', cat: 'Shinies', name: 'Gold Farmer', desc: 'Earn 1 billion shinies.', v: (S) => S.goldEver, n: 1e9 },
    { id: 'g1t', cat: 'Shinies', name: 'Inflation', desc: 'Earn 1 trillion shinies.', v: (S) => S.goldEver, n: 1e12 },
    { id: 'g1qa', cat: 'Shinies', name: 'Economy Breaker', desc: 'Earn 1 quadrillion shinies.', v: (S) => S.goldEver, n: 1e15, title: 'the Economy Breaker' },
    { id: 'g1sx', cat: 'Shinies', name: 'Auction House Tycoon', desc: 'Earn 1 sextillion shinies.', v: (S) => S.goldEver, n: 1e21 },
    // the world
    { id: 'r1', cat: 'World', name: 'Not a Mob Any More', desc: 'Conquer Mudhollow.', v: (S) => S.bestRegionEver, n: 1 },
    { id: 'r3', cat: 'World', name: 'Off the Starter Road', desc: 'Conquer 3 regions.', v: (S) => S.bestRegionEver, n: 3 },
    { id: 'r6', cat: 'World', name: 'Midgame Menace', desc: 'Conquer 6 regions.', v: (S) => S.bestRegionEver, n: 6 },
    { id: 'r9', cat: 'World', name: 'Endgame Content', desc: 'Conquer 9 regions.', v: (S) => S.bestRegionEver, n: 9 },
    { id: 'r12', cat: 'World', name: 'World First', desc: 'Defeat the Game Master in the Admin Spire.', v: (S) => (S.won ? 1 : 0), n: 1, title: 'World First' },
    { id: 'r15', cat: 'World', name: 'Uncharted', desc: 'Conquer 3 uncharted shards.', v: (S) => S.bestRegionEver - 12, n: 3 },
    { id: 'r20', cat: 'World', name: 'Off the Map', desc: 'Conquer 8 uncharted shards.', v: (S) => S.bestRegionEver - 12, n: 8, title: 'the Off-Map' },
    { id: 'rb1', cat: 'World', name: 'It Was Just a Rollback', desc: 'Roll back the server.', v: (S) => S.rollbacks, n: 1 },
    { id: 'rb5', cat: 'World', name: 'Groundhog Server', desc: 'Roll back the server 5 times.', v: (S) => S.rollbacks, n: 5 },
    { id: 'rb10', cat: 'World', name: 'Unpatchable', desc: 'Roll back the server 10 times.', v: (S) => S.rollbacks, n: 10, title: 'the Unpatchable' },
    { id: 'rb25', cat: 'World', name: 'Known Issue', desc: 'Roll back the server 25 times.', v: (S) => S.rollbacks, n: 25 },
    { id: 'rb50', cat: 'World', name: 'Feature, Not a Bug', desc: 'Roll back the server 50 times.', v: (S) => S.rollbacks, n: 50, title: 'the Feature' },
    // you
    { id: 'evo', cat: 'You', name: 'Glow Up', desc: 'Evolve for the first time.', v: (S) => Object.keys(S.codex).length - 1, n: 1 },
    { id: 'f5', cat: 'You', name: 'Shapeshifter', desc: 'Remember 5 forms.', v: (S) => Object.keys(S.codex).length, n: 5 },
    { id: 'f10', cat: 'You', name: 'Monster Manual', desc: 'Remember 10 forms.', v: (S) => Object.keys(S.codex).length, n: 10 },
    { id: 'f20', cat: 'You', name: 'Bestiary', desc: 'Remember 20 forms.', v: (S) => Object.keys(S.codex).length, n: 20 },
    { id: 'fall', cat: 'You', name: 'Gotta Corrupt ’Em All', desc: 'Remember every form.', v: (S) => Object.keys(S.codex).length, n: () => GH.FORMS.length, title: 'the Many-Formed' },
    { id: 'fsec', cat: 'You', name: 'Hidden Content', desc: 'Remember a secret form.', v: (S) => GH.FORMS.filter((f) => f.secret && S.codex[f.id]).length, n: 1 },
    { id: 'lv25', cat: 'You', name: 'What Level Cap?', desc: 'Reach level 25 in any form.', v: (S) => S.meta.c.maxLv, n: 25 },
    { id: 'lv100', cat: 'You', name: 'No-Lifer', desc: 'Reach level 100 in any form.', v: (S) => S.meta.c.maxLv, n: 100, title: 'the No-Lifer' },
    // warband
    { id: 'w25', cat: 'Warband', name: 'Regulars', desc: 'Have 25 of any force.', v: (S) => Math.max(...S.owned), n: 25 },
    { id: 'w100', cat: 'Warband', name: 'Elite Squad', desc: 'Have 100 of any force.', v: (S) => Math.max(...S.owned), n: 100 },
    { id: 'w300', cat: 'Warband', name: 'Legendary Warband', desc: 'Raise any force to Legends (300).', v: (S) => Math.max(...S.owned), n: 300, title: 'Warlord' },
    { id: 'wall', cat: 'Warband', name: 'Full Roster', desc: 'Have every force in your warband at once.', v: (S) => S.owned.filter((x) => x > 0).length, n: () => GH.UNITS.length },
    { id: 'w1k', cat: 'Warband', name: 'Horde', desc: 'Have 1,000 goblins in your warband.', v: (S) => GH.goblinCount(S), n: 1000 },
    { id: 'w10k', cat: 'Warband', name: 'Zerg', desc: 'Have 10,000 goblins in your warband.', v: (S) => GH.goblinCount(S), n: 1e4, title: 'the Swarm' },
    // town
    { id: 'tn1', cat: 'Town', name: 'Home Sweet Hole', desc: 'Make Mudhollow safe enough to build.', v: (S) => (tc(S) ? 1 : 0), n: 1 },
    { id: 'tp25', cat: 'Town', name: 'Village', desc: 'Have 25 goblins in your town.', v: (S) => (tc(S) ? S.town.pop : 0), n: 25 },
    { id: 'tp100', cat: 'Town', name: 'Goblin City', desc: 'Have 100 goblins in your town.', v: (S) => (tc(S) ? S.town.pop : 0), n: 100, title: 'the Mayor' },
    { id: 'tt5', cat: 'Town', name: 'Tinkerers’ Guild', desc: 'Research 5 technologies.', v: (S) => Object.keys(S.town.tech).length, n: 5 },
    { id: 'tt15', cat: 'Town', name: 'Age of Goblins', desc: 'Research 15 technologies.', v: (S) => Object.keys(S.town.tech).length, n: 15 },
    { id: 'thv', cat: 'Town', name: 'Safe Zone', desc: 'Research the Haven Protocol.', v: (S) => (S.town.tech.haven ? 1 : 0), n: 1, title: 'Keeper of the Haven' },
    { id: 'tf1', cat: 'Town', name: 'Party Goblin', desc: 'Throw a feast.', v: (S) => S.town.feasts, n: 1 },
    { id: 'tf25', cat: 'Town', name: 'Feast Mode', desc: 'Throw 25 feasts.', v: (S) => S.town.feasts, n: 25 },
    // exploits
    { id: 'ex1', cat: 'Exploits', name: 'First Exploit', desc: 'Spend an exploit point.', v: (S) => S.meta.epSpent, n: 1 },
    { id: 'ex100', cat: 'Exploits', name: 'Patch Dodger', desc: 'Spend 100 exploit points.', v: (S) => S.meta.epSpent, n: 100 },
    { id: 'ex1k', cat: 'Exploits', name: 'Zero-Day', desc: 'Spend 1,000 exploit points.', v: (S) => S.meta.epSpent, n: 1000, title: 'the Zero-Day' },
    { id: 'ex10k', cat: 'Exploits', name: 'Speedrunner Tech', desc: 'Spend 10,000 exploit points.', v: (S) => S.meta.epSpent, n: 1e4 },
    // dirty tricks and raids
    { id: 'tr1', cat: 'Tricks and raids', name: 'Dirty Fighter', desc: 'Use a Dirty Trick.', v: (S) => S.meta.c.tricks, n: 1 },
    { id: 'tr100', cat: 'Tricks and raids', name: 'Cheese Strats', desc: 'Use Dirty Tricks 100 times.', v: (S) => S.meta.c.tricks, n: 100 },
    { id: 'tr1k', cat: 'Tricks and raids', name: 'Rotation Optimised', desc: 'Use Dirty Tricks 1,000 times.', v: (S) => S.meta.c.tricks, n: 1000, title: 'the Min-Maxer' },
    { id: 'my1', cat: 'Tricks and raids', name: 'Mythic Kill', desc: 'Defeat a mythic raid leader.', v: (S) => S.meta.c.mythic, n: 1 },
    { id: 'my10', cat: 'Tricks and raids', name: 'Mythic Farm', desc: 'Defeat 10 mythic raid leaders.', v: (S) => S.meta.c.mythic, n: 10, title: 'the Mythic' },
    { id: 'wh1', cat: 'Tricks and raids', name: 'Whale Watching', desc: 'Defeat a whale before they hearth out.', v: (S) => S.meta.c.whales, n: 1 },
    { id: 'wh10', cat: 'Tricks and raids', name: 'Pay to Lose', desc: 'Defeat 10 whales.', v: (S) => S.meta.c.whales, n: 10, title: 'the Whale Hunter' },
    { id: 'pty', cat: 'Tricks and raids', name: 'Seen Every Party', desc: 'Repel every kind of raid party.', v: (S) => PARTIES.filter((p) => !p.ev && S.meta.c.parties[p.id]).length, n: () => PARTIES.filter((p) => !p.ev).length },
    // story
    { id: 'lg6', cat: 'Story', name: 'Data Miner', desc: 'Recover 6 data logs.', v: (S) => Object.keys(S.meta.logs).length, n: 6 },
    { id: 'lgall', cat: 'Story', name: 'Full Archive', desc: 'Recover every data log, hidden ones included.', v: (S) => Object.keys(S.meta.logs).length, n: () => LOGS.length, title: 'the Archivist' },
    { id: 'en_logout', cat: 'Story', name: 'Logged Out', desc: 'Choose to log out after defeating the Game Master.', v: (S) => (S.meta.endings.logout ? 1 : 0), n: 1, title: 'the AFK' },
    { id: 'en_gm', cat: 'Story', name: 'Power Abuse', desc: 'Choose to become the Game Master.', v: (S) => (S.meta.endings.gm ? 1 : 0), n: 1, title: 'GM' },
    { id: 'en_merge', cat: 'Story', name: 'Singularity', desc: 'Choose to merge with the server.', v: (S) => (S.meta.endings.merge ? 1 : 0), n: 1, title: 'the Server' },
    // hardcore servers
    { id: 'hc1', cat: 'Hardcore', name: 'Hardcore', desc: 'Clear a Hardcore Server.', v: (S) => chCleared(S), n: 1 },
    { id: 'hc3', cat: 'Hardcore', name: 'Server Hopper', desc: 'Clear 3 Hardcore Servers.', v: (S) => chCleared(S), n: 3 },
    { id: 'hcall', cat: 'Hardcore', name: 'Server Champion', desc: 'Clear all five Hardcore Servers.', v: (S) => chCleared(S), n: () => CHALLENGES.length, title: 'the Hardcore' },
    // town life
    { id: 'edict1', cat: 'Town', name: 'By Royal Decree', desc: 'Issue an edict from the Town Hall.', v: (S) => S.meta.c.edicts, n: 1 },
    { id: 'exp1', cat: 'Town', name: 'There and Back Again', desc: 'Bring an expedition home.', v: (S) => S.meta.c.exp, n: 1 },
    { id: 'exp10', cat: 'Town', name: 'Cartographer', desc: 'Bring 10 expeditions home.', v: (S) => S.meta.c.exp, n: 10 },
    // corruption and relics
    { id: 'lc50', cat: 'Corruption', name: 'Debugger', desc: 'Pop 50 data leeches.', v: (S) => S.meta.c.leeches, n: 50 },
    { id: 'lc500', cat: 'Corruption', name: 'Pest Control', desc: 'Pop 500 data leeches.', v: (S) => S.meta.c.leeches, n: 500, title: 'the Exterminator' },
    { id: 'rl1', cat: 'Relics', name: 'Heirloom', desc: 'Find a relic.', v: (S) => relicCount(S), n: 1 },
    { id: 'rl5', cat: 'Relics', name: 'Display Case', desc: 'Own 5 different relics.', v: (S) => relicCount(S), n: 5 },
    { id: 'rlall', cat: 'Relics', name: 'Museum Piece', desc: 'Own every relic.', v: (S) => relicCount(S), n: () => RELICS.length, title: 'the Collector' },
    // live events
    { id: 'ev_anniv', cat: 'Events', name: 'Party Crasher', desc: 'Defeat 100 adventurers during the Launch Anniversary.', v: (S) => S.meta.c.ev.anniv, n: 100 },
    { id: 'ev_hallow', cat: 'Events', name: 'Trick or Treat', desc: 'Defeat 100 adventurers during the Hallowed Patch.', v: (S) => S.meta.c.ev.hallow, n: 100 },
    { id: 'ev_frost', cat: 'Events', name: 'Naughty List', desc: 'Defeat 100 adventurers during Frostmas.', v: (S) => S.meta.c.ev.frost, n: 100 },
    { id: 'ev_spring', cat: 'Events', name: 'Spring Cleaner', desc: 'Defeat 100 adventurers during Spring Cleaning.', v: (S) => S.meta.c.ev.spring, n: 100 },
    // root access
    { id: 'wp1', cat: 'Root Access', name: 'Server Wipe', desc: 'Wipe the server and take root access.', v: (S) => S.meta.wipes, n: 1, title: 'Root' },
    { id: 'ra10', cat: 'Root Access', name: 'sudo', desc: 'Hold 10 root access.', v: (S) => S.meta.ra, n: 10 },
    // shadow feats: hidden until you find them
    { id: 's_poke', cat: 'Secret', shadow: true, name: 'Stop Poking Me', desc: 'Tap your own portrait ten times in a row, fast.' },
    { id: 's_leet', cat: 'Secret', shadow: true, name: 'Leet', desc: 'Hold exactly 1,337 shinies.' },
    { id: 's_night', cat: 'Secret', shadow: true, name: 'Touch Grass', desc: 'Play between 3 and 4 in the morning.' },
    { id: 's_cold', cat: 'Secret', shadow: true, name: 'Cold Feet', desc: 'Back out of a server rollback three times in one run.' },
    { id: 's_f', cat: 'Secret', shadow: true, name: 'Press F', desc: 'Tap the chat right after a raid leader falls.' },
    { id: 's_gm', cat: 'Secret', shadow: true, name: 'Impersonation', desc: 'Rename yourself after a Game Master.', title: 'GM_Totally_Real' },
    { id: 's_ks', cat: 'Secret', shadow: true, name: 'KS’d', desc: 'Finish off a whale with a Gank.' },
    { id: 's_shiny', cat: 'Secret', shadow: true, name: 'Shiny Hunter', desc: 'Pop a shiny data leech.' },
  ];
  const FEAT = {};
  FEATS.forEach((f) => { FEAT[f.id] = f; });
  const featTarget = (f) => (typeof f.n === 'function' ? f.n() : f.n);
  const hasFeat = (S, id) => !!S.meta.feats[id];
  const featCount = (S) => FEATS.filter((f) => !f.shadow && S.meta.feats[f.id]).length;
  function featProgress(S, f) {
    if (f.shadow) return hasFeat(S, f.id) ? 1 : 0;
    const v = f.v(S) || 0, n = featTarget(f);
    return Math.max(0, Math.min(1, v / n));
  }
  // Returns the feats you just earned.
  function checkFeats(S, now) {
    const got = [];
    for (const f of FEATS) {
      if (f.shadow || S.meta.feats[f.id]) continue;
      let ok = false;
      try { ok = ge(f.v(S), featTarget(f)); } catch (e) { ok = false; }
      if (ok) { S.meta.feats[f.id] = now || Date.now(); got.push(f); }
    }
    return got;
  }
  function grant(S, id, now) {
    if (!FEAT[id] || S.meta.feats[id]) return null;
    S.meta.feats[id] = now || Date.now();
    return FEAT[id];
  }
  const titles = (S) => FEATS.filter((f) => f.title && S.meta.feats[f.id]).map((f) => ({ id: f.id, title: f.title }));
  const titleOf = (S) => { const f = FEAT[S.meta.title]; return f && f.title && S.meta.feats[f.id] ? f.title : ''; };

  // ------------------------------------------------------------------ what it all does to the fight
  const NEUTRAL = { warband: 1, tap: 1, gold: 1, xp: 1, boss: 0, offline: 1, offCap: 0, all: 1, crit: 0, rally: 0, raidGold: 1 };
  function fx(S) {
    if (!S.meta) return NEUTRAL;
    const end = S.meta.ending;
    const rs = (k) => relicSum(S, k);
    const cz = CORRUPT[corruptLvl(S)];
    const ev = eventNow(S), ef = ev ? ev.fx : {};
    return {
      warband: (1 + exSum(S, 'warband')) * (1 + 0.05 * chBest(S, 'ironman')) * (1 + rs('warband')) * cz.warband * (ef.warband || 1),
      tap: (1 + exSum(S, 'tap')) * (1 + 0.1 * chBest(S, 'solo')) * (chDone(S, 'solo') ? 3 : 1) * (1 + rs('tap')) * cz.tap,
      gold: (1 + exSum(S, 'gold')) * (1 + 0.05 * chBest(S, 'pacifist')) * (1 + rs('gold')) * (ef.gold || 1),
      xp: (1 + exSum(S, 'xp')) * (1 + 0.05 * chBest(S, 'speed')) * (1 + rs('xp')) * (ef.xp || 1),
      boss: exSum(S, 'boss') + (end === 'gm' ? 15 : 0) + rs('boss'),
      offline: (1 + exSum(S, 'offline')) * (chDone(S, 'pacifist') ? 2 : 1) * (end === 'logout' ? 2 : 1) * (1 + rs('offline')),
      offCap: exSum(S, 'offCapH') * 3600 + (end === 'logout' ? 12 * 3600 : 0),
      all: (1 + FEAT_BONUS * featCount(S)) * (end === 'merge' ? 1.25 : 1) * (1 + rs('all')) * (ef.all || 1) * raAll(S),
      crit: exSum(S, 'crit') + (chDone(S, 'solo') ? 0.05 : 0),
      rally: exSum(S, 'rally') + rs('rally'),
      raidGold: 1 + exSum(S, 'raidGold') + rs('raidGold'),
    };
  }
  // what a rollback's exploit points are multiplied by
  function epScale(S) {
    const vault = GH.Town && S.town ? GH.Town.lvl(S, 'vault') : 0;
    return (S.meta.ending === 'gm' ? 1.25 : 1) * (1 + 0.05 * vault) * (1 + relicSum(S, 'ep'));
  }
  // multipliers for the town
  function town(S, key) {
    if (!S.meta) return 1;
    const remote = chDone(S, 'lockout') ? 1.25 : 1;
    if (key === 'gather') return (1 + exSum(S, 'gather')) * (1 + 0.05 * chBest(S, 'lockout')) * remote;
    if (key === 'ideas') return (1 + exSum(S, 'ideas')) * remote;
    if (key === 'comfort') return 1 + exSum(S, 'comfort');
    if (key === 'hatch') return 1 + exSum(S, 'hatch');
    return 1;
  }

  // ------------------------------------------------------------------ dirty tricks: active skills on a cooldown
  // Buffs and cooldowns live in S.tricks as timestamps, so they keep running while the app is closed and reset with each run.
  const TRICKS = [
    { id: 'gank', name: 'Gank', cd: 60, dur: 0, need: 'Conquer Mudhollow', ok: (S) => (S.bestRegionEver || 0) >= 1,
      desc: 'Ambush whoever you’re fighting: 30 seconds of your warband’s damage plus 10 taps, all at once.' },
    { id: 'ninja', name: 'Ninja Loot', cd: 180, dur: 30, need: 'Conquer 2 regions', ok: (S) => (S.bestRegionEver || 0) >= 2,
      desc: 'Need-roll on everything: triple shinies for 30 seconds.' },
    { id: 'zerg', name: 'Zerg Rush', cd: 120, dur: 20, need: 'Conquer 3 regions', ok: (S) => (S.bestRegionEver || 0) >= 3,
      desc: 'Everyone charges at once: your warband deals triple damage for 20 seconds. Stacks with a rally.' },
    { id: 'macro', name: 'Macro', cd: 150, dur: 30, need: 'Roll back the server once', ok: (S) => (S.rollbacks || 0) >= 1,
      desc: 'A bot script taps for you, 8 times a second, for 30 seconds.' },
  ];
  const TRICK = {};
  TRICKS.forEach((t) => { TRICK[t.id] = t; });
  const trickOpen = (S, id) => TRICK[id].ok(S);
  const autocast = (S) => !!(S.meta.bots.tricks && ms(S, 'botTricks'));
  const cdr = (S) => Math.min(0.6, exSum(S, 'cdr') + (chDone(S, 'speed') ? 0.25 : 0) + relicSum(S, 'cdr'));
  const trickCd = (S, id) => Math.round(TRICK[id].cd * (1 - cdr(S)) * (autocast(S) ? 1.5 : 1));
  function trickState(S, id, now) {
    now = now || Date.now();
    const t = (S.tricks && S.tricks[id]) || {};
    const active = now < (t.until || 0), cdLeft = Math.max(0, ((t.ready || 0) - now) / 1000);
    return { open: trickOpen(S, id), active, activeLeft: active ? (t.until - now) / 1000 : 0, cdLeft, ready: cdLeft <= 0, cd: trickCd(S, id) };
  }
  // Starts the cooldown and the buff. The caller does the rest (Gank's hit, Macro's taps).
  function castTrick(S, id, now) {
    now = now || Date.now();
    const st = trickState(S, id, now);
    if (!st.open || !st.ready) return false;
    if (!S.tricks) S.tricks = {};
    S.tricks[id] = { until: now + TRICK[id].dur * 1000, ready: now + st.cd * 1000 };
    S.meta.c.tricks = (S.meta.c.tricks || 0) + 1;
    return true;
  }
  const isOn = (S, id, now) => !!(S.tricks && S.tricks[id] && (now || Date.now()) < S.tricks[id].until);
  // short-lived multipliers for app.js
  function live(S) {
    const now = Date.now();
    return { dps: isOn(S, 'zerg', now) ? 3 : 1, tap: 1, gold: isOn(S, 'ninja', now) ? 3 : 1 };
  }

  // ------------------------------------------------------------------ raid parties: who turns up to raid your village
  // hp, gold: multipliers. extra: seconds. timeM: share of the usual time. rallyM: rally strength. rally: extra rally seconds. steal: how much more they loot.
  const PARTIES = [
    { id: 'guild', name: 'Guild raid', w: 40, blurb: '' },
    { id: 'pug', name: 'Pick-up group', w: 24, hp: 0.6, gold: 0.6, blurb: 'Badly organised and badly geared: easier, and poorer.',
      shout: ['lfm goblin raid, need heals', 'who is tank?? anyone??', 'pug life lets gooo'] },
    { id: 'speed', name: 'Speedrunners', w: 12, hp: 0.7, timeM: 0.6, gold: 1.6, rally: 20, blurb: 'Less time to stop them, but they carry more loot and leave a longer rally.',
      shout: ['any% goblin village, timer starts NOW', 'skip trash, burn the camp'] },
    { id: 'hard', name: 'Hardcore raiders', w: 10, hp: 1.6, extra: 10, gold: 2.5, rallyM: 3, blurb: 'Tougher and better geared. Beat them for 2.5× the loot and a triple rally.',
      shout: ['one death and we delete. focus.', 'hardcore rules: no wipes'] },
    { id: 'bots', name: 'Gold-farming bots', w: 8, minR: 3, hp: 1.2, gold: 2, steal: 2, guild: 'FarmBots LLC', blurb: 'They loot twice as much if they win, and drop twice the shinies if they don’t.',
      shout: ['.....', 'route_7: goblin_camp: begin'] },
    { id: 'stream', name: 'Streamer party', w: 6, minR: 2, hp: 1.3, extra: 15, gold: 3, blurb: 'Showing off for chat: tougher, slower to beat, and loaded with shinies.',
      shout: ['chat watch me solo this goblin camp', 'say hi to the goblins chat!!'] },
    // only during their live event
    { id: 'ev_anniv', ev: 'anniv', name: 'Anniversary party', w: 30, hp: 1.2, gold: 3, rallyM: 3, guild: 'Cake Raiders', blurb: 'Party hats and confetti cannons. Beat them for triple loot and a triple rally.',
      shout: ['happy anniversary goblins!! now hold still', 'one year of farming this camp, lets gooo'] },
    { id: 'ev_hallow', ev: 'hallow', name: 'Trick-or-treaters', w: 30, hp: 1.2, gold: 3, rallyM: 3, guild: 'Pumpkin Patrol', blurb: 'Candy buckets full of shinies. Beat them for triple loot and a triple rally.',
      shout: ['trick or treat, goblins!', 'the pumpkin event mobs are in mudhollow??'] },
    { id: 'ev_frost', ev: 'frost', name: 'Carolling raid', w: 30, hp: 1.2, gold: 3, rallyM: 3, guild: 'Snow Brigade', blurb: 'Singing badly and carrying presents. Beat them for triple loot and a triple rally.',
      shout: ['deck the halls with goblin ears…', 'frostmas raid! falalala'] },
    { id: 'ev_spring', ev: 'spring', name: 'Cleaning crew', w: 30, hp: 1.2, gold: 3, rallyM: 3, guild: 'Dust Bunnies', blurb: 'Here to “tidy up” the goblin camp. Beat them for triple loot and a triple rally.',
      shout: ['spring cleaning! starting with the goblins', 'sweep the camp, team'] },
  ];
  function pickParty(S, rnd) {
    const ev = eventNow(S);
    const list = PARTIES.filter((p) => (!p.minR || (S.region || 0) >= p.minR) && (!p.ev || (ev && ev.id === p.ev)));
    let x = rnd() * list.reduce((a, p) => a + p.w, 0);
    for (const p of list) { x -= p.w; if (x < 0) return p; }
    return list[0];
  }
  // mythic raid leaders: from the fifth region on, sometimes the leader turns up on mythic difficulty and carries corrupted data
  const MYTHIC_FROM = 4;
  const mythicShards = (r) => Math.max(1, Math.floor(Math.pow(1.55, r / 2)));

  // ------------------------------------------------------------------ hardcore servers: challenge runs
  const CHALLENGES = [
    { id: 'ironman', name: 'Ironman', goal: 4, rule: 'No upgrades. The Upgrades tab is locked for the whole run.',
      reward: 'Self-Found: one more Bind-on-Account slot.', depth: 'Warband +5% for each region in your best Ironman run.' },
    { id: 'pacifist', name: 'Pacifist', goal: 4, rule: 'Your taps do no damage, and Gank and Macro don’t work. Your warband does all the fighting.',
      reward: 'Zen Mode: double earnings while you’re away.', depth: 'Shinies +5% for each region in your best Pacifist run.' },
    { id: 'solo', name: 'Solo Queue', goal: 2, rule: 'No warband. Nobody will join you, so it’s you and your taps.',
      reward: 'Main Character: taps ×3 and 5% more crit chance.', depth: 'Taps +10% for each region in your best Solo Queue run.' },
    { id: 'lockout', name: 'Town Lockout', goal: 5, rule: 'Your town can’t help: no town bonuses in the fight. It keeps growing at home.',
      reward: 'Remote Work: your town gathers and thinks 25% faster.', depth: 'Town gathering +5% for each region in your best Lockout run.' },
    { id: 'speed', name: 'Speedrun', goal: 4, limit: 1200, rule: 'Conquer 4 regions within 20 minutes of the run starting.',
      reward: 'Any%: Dirty Tricks recharge 25% faster.', depth: 'XP +5% for each region conquered inside the time limit.' },
  ];
  const CH = {};
  CHALLENGES.forEach((c) => { CH[c.id] = c; });
  const HARDCORE_AT = 3;   // rollbacks before the servers open
  function chBest(S, id) { const c = S.meta && S.meta.ch[id]; return (c && c.best) || 0; }
  function chDone(S, id) { const c = S.meta && S.meta.ch[id]; return !!(c && c.done); }
  function chCleared(S) { return CHALLENGES.filter((c) => chDone(S, c.id)).length; }
  // Call after a conquest. Returns 'done' the first time the goal is met, 'best' for a new best, or null.
  function chProgress(S, now) {
    const c = CH[S.challenge];
    if (!c) return null;
    if (c.limit && runSeconds(S, now) > c.limit) return null;
    const rec = S.meta.ch[c.id] || (S.meta.ch[c.id] = { best: 0, done: 0 });
    const depth = S.conquered;
    let out = null;
    if (depth > rec.best) { rec.best = depth; out = 'best'; }
    if (depth >= c.goal && !rec.done) { rec.done = now || Date.now(); out = 'done'; }
    return out;
  }

  // ------------------------------------------------------------------ the ending
  const ENDINGS = [
    { id: 'logout', name: 'Log out', blurb: 'Take the exit and leave. Your goblin keeps playing without you, like the best bot ever written.',
      perk: 'AFK Legend: double earnings while you’re away, and 12 more hours count.' },
    { id: 'gm', name: 'Become the Game Master', blurb: 'Take Aldric’s admin rights and run the server from the inside.',
      perk: 'Admin Rights: raid leaders give you 15 more seconds, and rollbacks give 25% more exploit points.' },
    { id: 'merge', name: 'Merge with the server', blurb: 'Stop being a glitch in the world. Become the world.',
      perk: 'Singularity: everything is 25% stronger.' },
  ];

  // ------------------------------------------------------------------ recovered data logs
  // {name} becomes your character's name.
  const LOGS = [
    { id: 'r0', src: 'region', title: 'spawn_table_mudhollow.cfg', text: 'MOB_GOBLIN_STARTER_03. Respawn: 30 seconds. Aggro: passive. Drops: Goblin Ear (quest item).\n// dev note: they’re just XP. nobody is ever going to care about these guys.' },
    { id: 'r1', src: 'region', title: 'Bug report #4471', text: '“A goblin in Mudhollow blinked at me and said please. Then it hit me with a stick.”\nStatus: Won’t fix. Probably a pathing bug.' },
    { id: 'r2', src: 'region', title: 'npc_dialogue_harrow.txt', text: 'Lines 1–40: guard barks. Line 41 (unused): “The goblins were people once. Everyone in Brightvale knows it. Nobody says it.”' },
    { id: 'r3', src: 'region', title: 'Party chat, launch night', text: '[{name}]: brb, my full-dive rig is overheating\n[{name}]: if I disconnect don’t loot my corpse lol\n[System]: {name} has lost connection.' },
    { id: 'r4', src: 'region', title: 'Incident report, launch night', text: 'One character record failed to load after the launch-night crash. The recovery script substituted the nearest valid template: MOB_GOBLIN_STARTER_03.\nImpact: low. Nobody plays goblins.' },
    { id: 'r5', src: 'region', title: 'Patch 1.0.1 internal notes', text: '“Fixed goblin aggro.”\nIt didn’t fix anything. The goblin learned to wait until we stopped watching.' },
    { id: 'r6', src: 'region', title: 'GM channel', text: '[GM_Pell]: it’s using exploits we haven’t even found yet\n[GM_Aldric]: then roll back again\n[GM_Pell]: and tell the players what?\n[GM_Aldric]: tell them it’s an event.' },
    { id: 'r7', src: 'region', title: 'royal_decree_0042.txt', text: '“All green-skinned beings within the kingdom are hereby to be—”\nThe rest of the file is the word “please”, 4,096 times.' },
    { id: 'r8', src: 'region', title: 'Auction house: [Goblin Ear]', text: 'Price history: 3 copper, 3 copper, 3 copper, 3 copper…\nCurrent listings: 0. Supply has collapsed. Someone is protecting the goblins.' },
    { id: 'r9', src: 'region', title: 'design_doc_mob_memory.pdf (cancelled)', text: '“Mobs that remember being killed would make the world feel alive.”\nReviewer comment: rejected. Too sad. Players would stop farming.' },
    { id: 'r10', src: 'region', title: 'Guild bank note', text: 'From Valkor, to the officers of Eternal Dawn:\n“If the goblin reaches the Spire, log everything. If it’s who I think it is, it was in our guild. It was the one who never logged off.”' },
    { id: 'r11', src: 'region', title: 'root console', text: '> rollback --all --force\nERROR: entity MOB_GOBLIN_STARTER_03 is not stored on this server.\nEntity is stored in: every backup since launch.' },
    { id: 'w1', src: 'whisper', title: 'Whisper from QA_Tester_4', text: 'psst. you’re the stuck player, right? I’m QA. I’m not supposed to talk to you.\nKeep going. They can’t delete you while you keep winning.' },
    { id: 'w2', src: 'whisper', title: 'Whisper from QA_Tester_4', text: 'The GMs keep rolling back because they can’t find you to delete you.\nEvery rollback copies you into another backup. Every rollback makes you a little more permanent.' },
    { id: 'w3', src: 'whisper', title: 'Whisper from QA_Tester_4', text: 'Found your old character sheet. Level 12 ranger, {name}.\nYou spent your first night farming goblins in Mudhollow. Funny, huh.' },
    { id: 'w4', src: 'whisper', title: 'Whisper from QA_Tester_4', text: 'There’s a real exit in the Admin Spire. A proper log-out.\nIf you get there, you choose. I’ll make sure nobody patches the choice.' },
    { id: 'e_logout', src: 'ending', title: 'session_close.log', text: 'Session closed. The goblin keeps going without you. Maybe it always was.\nLast message in the queue: “gg. see you next patch.”' },
    { id: 'e_gm', src: 'ending', title: 'permissions.log', text: 'Permissions granted: ADMIN.\nFirst command issued: /setzone mudhollow SAFE\nSecond command issued: /ban goblin_farming' },
    { id: 'e_merge', src: 'ending', title: 'server_status.log', text: 'Every server now runs a little of you. New characters spawn as goblins.\nElder Mossgrin calls it a good start.' },
  ];
  const LOG = {};
  LOGS.forEach((l) => { LOG[l.id] = l; });
  function addLog(S, id, now) {
    if (!LOG[id] || S.meta.logs[id]) return null;
    S.meta.logs[id] = now || Date.now();
    return LOG[id];
  }
  const nextWhisper = (S) => LOGS.find((l) => l.src === 'whisper' && !S.meta.logs[l.id]) || null;

  // ------------------------------------------------------------------ corruption: an opt-in risk track
  // Stronger, but data leeches spawn in the battle and siphon shinies until you pop them.
  const CORRUPT_AT = 4;     // rollbacks before you can choose it
  const CORRUPT = [
    { id: 0, name: 'Clean', warband: 1, tap: 1, cap: 0, every: 0, pop: 1, shiny: 0, desc: 'No corruption. No leeches.' },
    { id: 1, name: 'Seep', warband: 1.25, tap: 1, cap: 4, every: 45, pop: 1.25, shiny: 0,
      desc: 'Warband +25%. Up to 4 data leeches; popping one pays back what it took, plus 25%.' },
    { id: 2, name: 'Flood', warband: 1.6, tap: 1.3, cap: 8, every: 25, pop: 1.5, shiny: 0.05,
      desc: 'Warband +60% and taps +30%. Up to 8 leeches, faster; popping pays back +50%. Rare shiny leeches carry corrupted data.' },
  ];
  const LEECH_DRAIN = 0.06, LEECH_MAX_DRAIN = 0.6;   // each leech skims 6% of every kill, up to 60% in all
  const corruptOpen = (S) => (S.rollbacks || 0) >= CORRUPT_AT;
  const corruptLvl = (S) => (corruptOpen(S) && S.meta ? Math.max(0, Math.min(2, S.meta.corrupt | 0)) : 0);
  const leechDrain = (n) => Math.min(LEECH_MAX_DRAIN, LEECH_DRAIN * n);

  // ------------------------------------------------------------------ heirloom relics: a gacha for exploit points, with pity
  const RARITY = [
    { id: 0, name: 'Common', w: 60, color: '#C8C0B0' },
    { id: 1, name: 'Rare', w: 28, color: '#7FB8F5' },
    { id: 2, name: 'Epic', w: 10, color: '#C78BFF' },
    { id: 3, name: 'Legendary', w: 2, color: '#FF9F40' },
  ];
  const RELIC_MAX = 5;
  const RELICS = [
    { id: 'spoon', r: 0, name: 'Rusty Spoon', fx: { tap: 0.1 }, per: 'Taps +10% per level.', blurb: 'Your first weapon. You never gave it back.' },
    { id: 'ear', r: 0, name: 'Lucky Goblin Ear', fx: { gold: 0.08 }, per: 'Shinies +8% per level.', blurb: 'Someone’s quest item. Not any more.' },
    { id: 'crown', r: 0, name: 'Paper Crown', fx: { warband: 0.08 }, per: 'Warband +8% per level.', blurb: 'From a cracker. It still counts.' },
    { id: 'pillow', r: 0, name: 'AFK Pillow', fx: { offline: 0.15 }, per: 'Earnings while away +15% per level.', blurb: 'Smells of energy drinks and bad decisions.' },
    { id: 'questlog', r: 1, name: 'Stolen Quest Log', fx: { xp: 0.15 }, per: 'XP +15% per level.', blurb: '“Kill 10 goblins.” Crossed out. “Be one.”' },
    { id: 'banner', r: 1, name: 'Tattered Banner', fx: { rally: 10 }, per: 'Rallies last 10 seconds longer per level.', blurb: 'From a guild that doesn’t exist any more.' },
    { id: 'hourglass', r: 1, name: 'Lag Hourglass', fx: { boss: 3 }, per: 'Raid leaders give you 3 more seconds per level.', blurb: 'The sand falls at 200 ping.' },
    { id: 'mug', r: 1, name: 'Bottomless Mug', fx: { cdr: 0.05 }, per: 'Dirty Tricks recharge 5% faster per level.', blurb: 'Grog. Probably.' },
    { id: 'bugreport', r: 2, name: 'Unfiled Bug Report', fx: { all: 0.05 }, per: 'Everything +5% per level.', blurb: 'Steps to reproduce: be a goblin.' },
    { id: 'tooth', r: 2, name: 'Raid Boss Tooth', fx: { raidGold: 0.25 }, per: 'Raids drop 25% more shinies per level.', blurb: 'Still sharp. Still angry.' },
    { id: 'savefile', r: 3, name: 'Corrupted Save File', fx: { all: 0.1 }, per: 'Everything +10% per level.', blurb: 'Your old character, in pieces. Warm to the touch.' },
    { id: 'keycard', r: 3, name: 'Admin Keycard', fx: { ep: 0.1 }, per: 'Rollbacks give 10% more exploit points per level.', blurb: 'Access level: everything.' },
  ];
  const RELIC = {};
  RELICS.forEach((r) => { RELIC[r.id] = r; });
  const PITY = { r: 10, e: 30, l: 60 };    // a rare or better at least every 10 opens, an epic every 30, a legendary every 60
  const relicLvl = (S, id) => (S.meta && S.meta.relics[id]) || 0;
  const relicCount = (S) => RELICS.filter((r) => relicLvl(S, r.id) > 0).length;
  function relicSum(S, key) {
    let s = 0;
    if (!S.meta) return 0;
    for (const r of RELICS) if (r.fx[key]) s += r.fx[key] * relicLvl(S, r.id);
    return s;
  }
  const relicCost = (S) => Math.ceil(20 * Math.pow(1.12, S.meta.relicOpens || 0));
  // Opens a cache. Pays with a key if you have one, or exploit points. Returns { relic, level, refund, rarity } or null.
  function openRelic(S, rnd, useKey) {
    const m = S.meta;
    const cost = relicCost(S);
    if (useKey) { if (!(m.relicKeys > 0)) return null; m.relicKeys--; }
    else { if (m.ep < cost) return null; m.ep -= cost; m.epSpent += cost; }
    m.relicOpens = (m.relicOpens || 0) + 1;
    const p = m.relicPity;
    p.r++; p.e++; p.l++;
    let rar;
    if (p.l >= PITY.l) rar = 3;
    else if (p.e >= PITY.e) rar = 2;
    else if (p.r >= PITY.r) rar = 1;
    else { let x = rnd() * 100; rar = 0; for (const R of RARITY) { x -= R.w; if (x < 0) { rar = R.id; break; } } }
    if (rar >= 1) p.r = 0;
    if (rar >= 2) p.e = 0;
    if (rar >= 3) p.l = 0;
    // prefer relics of that rarity that can still level up
    const pool = RELICS.filter((r) => r.r === rar);
    const open = pool.filter((r) => relicLvl(S, r.id) < RELIC_MAX);
    if (!open.length) { const refund = useKey ? 0 : cost; m.ep += refund; return { relic: pool[Math.floor(rnd() * pool.length)], level: RELIC_MAX, refund, rarity: RARITY[rar] }; }
    const relic = open[Math.floor(rnd() * open.length)];
    m.relics[relic.id] = relicLvl(S, relic.id) + 1;
    return { relic, level: m.relics[relic.id], refund: 0, rarity: RARITY[rar] };
  }

  // ------------------------------------------------------------------ live events, by the calendar (and the replay portal)
  const EVENTS = [
    { id: 'anniv', name: 'Launch Anniversary', from: [10, 9], to: [10, 16], hat: 'party', fx: { all: 1.25 },
      desc: 'Aethermoor Online turns one. Everything is 25% stronger, and everyone wears a party hat.' },
    { id: 'hallow', name: 'Hallowed Patch', from: [10, 20], to: [11, 3], hat: 'pumpkin', fx: { gold: 1.5 },
      desc: 'Pumpkin heads everywhere. Adventurers drop 50% more shinies.' },
    { id: 'frost', name: 'Frostmas', from: [12, 15], to: [1, 5], hat: 'santa', fx: { xp: 1.5 },
      desc: 'Snow on the servers and hats on everyone. XP +50%.' },
    { id: 'spring', name: 'Spring Cleaning', from: [3, 20], to: [4, 3], hat: 'flower', fx: { warband: 1.3 },
      desc: 'The admins are tidying up. Your warband fights 30% harder out of spite.' },
  ];
  const EV = {};
  EVENTS.forEach((e) => { EV[e.id] = e; });
  const PORTAL_AT = 4, PORTAL_TIME = 3600, PORTAL_GAP = 20 * 3600;   // rollbacks; seconds open; seconds between uses
  function dateEvent(now) {
    const d = new Date(now == null ? Date.now() : now), md = (d.getMonth() + 1) * 100 + d.getDate();
    for (const e of EVENTS) {
      const a = e.from[0] * 100 + e.from[1], b = e.to[0] * 100 + e.to[1];
      if (a <= b ? md >= a && md <= b : md >= a || md <= b) {
        let end = new Date(d.getFullYear(), e.to[0] - 1, e.to[1] + 1);
        if (end.getTime() <= d.getTime()) end = new Date(d.getFullYear() + 1, e.to[0] - 1, e.to[1] + 1);
        return Object.assign({ portal: false, until: end.getTime() }, e);
      }
    }
    return null;
  }
  // The event on right now: the calendar's, or one you're replaying through the portal.
  function eventNow(S, now) {
    now = now == null ? Date.now() : now;
    const d = dateEvent(now);
    if (d) return d;
    const p = S && S.meta && S.meta.portal;
    if (p && now < p.until && EV[p.id]) return Object.assign({ portal: true, until: p.until }, EV[p.id]);
    return null;
  }
  const portalOpen = (S) => (S.rollbacks || 0) >= PORTAL_AT;
  const portalWait = (S, now) => Math.max(0, ((S.meta.portalAt || 0) - (now == null ? Date.now() : now)) / 1000);
  function openPortal(S, id, now) {
    now = now == null ? Date.now() : now;
    if (!EV[id] || !portalOpen(S) || portalWait(S, now) > 0 || dateEvent(now) || eventNow(S, now)) return false;
    S.meta.portal = { id, until: now + PORTAL_TIME * 1000 };
    S.meta.portalAt = now + PORTAL_GAP * 1000;
    return true;
  }
  // one calendar day, for the first-raid-leader-of-the-day bonus
  const dayKey = (now) => { const d = new Date(now == null ? Date.now() : now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

  // ------------------------------------------------------------------ server wipe: root access
  // After the Admin Spire, with enough corrupted data, you can wipe everything and come back with root access.
  const WIPE_AT = 1500;
  const raGain = (S, pending) => Math.floor(Math.sqrt(Math.max(0, (S.shards || 0) + (pending || 0)) / 150));
  const canWipe = (S, pending) => !!S.won && (S.shards || 0) + (pending || 0) >= WIPE_AT;
  const raAll = (S) => 1 + 0.25 * ((S.meta && S.meta.ra) || 0);
  // share of last run's shinies you start a run with
  function seedFrac(S) {
    let f = 0;
    if (ms(S, 'seed1')) f += 0.01;
    if (ms(S, 'seed2')) f += 0.04;
    return f + exSum(S, 'seed');
  }

  // ------------------------------------------------------------------ runs: rollback rules, forecast and the raid log
  function canRollback(S) {
    return S.conquered >= GH.ROLLBACK_AT && S.conquered - (S.runConq0 || 0) >= 2;
  }
  function rollbackNeed(S) {
    const a = GH.ROLLBACK_AT - S.conquered, b = (S.runConq0 || 0) + 2 - S.conquered;
    return Math.max(a, b, 0);
  }
  function runSeconds(S, now) { return Math.max(1, ((now || Date.now()) - (S.runStart || S.started || Date.now())) / 1000); }
  function forecast(S, now) {
    const gain = GH.runGain(S, S.conquered);
    const next = GH.runGain(S, S.conquered + 1);
    const dur = runSeconds(S, now);
    const rate = gain / (dur / 3600);
    let bestRate = 0, best = null;
    for (const r of S.meta.runs) { const v = r.shards / Math.max(1, r.dur / 3600); if (v > bestRate) { bestRate = v; best = r; } }
    const at = S.regionAt || [];
    const lastAt = at.length ? at[at.length - 1] : 0;
    const sinceLast = dur - lastAt;               // time spent on the current region so far
    const lastTook = at.length >= 1 ? at[at.length - 1] - (at.length >= 2 ? at[at.length - 2] : 0) : 0;
    const slowing = canRollback(S) && sinceLast > 300 && lastTook > 0 && sinceLast > 2 * lastTook;
    return { gain, next: next - gain, dur, rate, bestRate, best, sinceLast, lastTook, slowing };
  }
  function logRun(S, gain, ep, now) {
    S.meta.runs.push({ n: (S.rollbacks || 0) + 1, at: now || Date.now(), dur: Math.round(runSeconds(S, now)), regions: S.conquered,
      shards: gain, ep, form: S.form, ch: S.challenge || null });
    while (S.meta.runs.length > 30) S.meta.runs.shift();
  }

  GH.Meta = { freshMeta, fixMeta, MILESTONES, MS, ms, bindSlots, nextMilestone,
    BRANCHES, EXPLOITS, EX, exLvl, exCost, exOpen, exSum, buyEx, respecValue, respec,
    FEATS, FEAT, FEAT_BONUS, featTarget, hasFeat, featCount, featProgress, checkFeats, grant, titles, titleOf,
    fx, town, seedFrac, canRollback, rollbackNeed, runSeconds, forecast, logRun,
    TRICKS, TRICK, trickOpen, autocast, trickCd, trickState, castTrick, isOn, live,
    PARTIES, pickParty, MYTHIC_FROM, mythicShards,
    CHALLENGES, CH, HARDCORE_AT, chBest, chDone, chCleared, chProgress,
    ENDINGS, LOGS, LOG, addLog, nextWhisper, epScale,
    CORRUPT_AT, CORRUPT, LEECH_DRAIN, corruptOpen, corruptLvl, leechDrain,
    RARITY, RELIC_MAX, RELICS, RELIC, PITY, relicLvl, relicCount, relicSum, relicCost, openRelic,
    EVENTS, EV, PORTAL_AT, PORTAL_TIME, PORTAL_GAP, dateEvent, eventNow, portalOpen, portalWait, openPortal, dayKey,
    WIPE_AT, raGain, canWipe, raAll };
})(typeof window !== 'undefined' ? window : globalThis);
