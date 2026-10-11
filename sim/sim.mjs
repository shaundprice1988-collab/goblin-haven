// Balance simulator: plays Goblin Haven with a simple greedy strategy and prints a timeline.
// usage: node sim/sim.mjs [hours] [profile: active|casual] [overrides as k=v ...]
import '../core.js';
const GH = globalThis.GH;
const { K, FORM, UNITS } = GH;
const UPGRADES = GH.UPGRADES;

const HOURS = Number(process.argv[2] || 40);
const PROFILE = process.argv[3] || 'casual';
for (const kv of process.argv.slice(4)) { const [k, v] = kv.split('='); K[k] = Number(v); }
GH.rebuild();
const EVOLVE = process.env.EVOLVE || 'greedy'; // greedy | deep


const TAP_RATE = 4;              // taps per second while playing
const DT = 0.5;
let S = GH.fresh(0);
S.introDone = true;
let D = GH.derive(S);
let t = 0, lastConquer = 0, bossFailPower = 0, nextRaid = 360;
const log = [];
const fmtT = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return `${String(h).padStart(3)}h${String(m).padStart(2, '0')}m`; };
const fmt = (x) => x < 1e3 ? x.toFixed(0) : x.toExponential(2);
function say(msg) { log.push(`${fmtT(t)}  ${msg}`); }

function active(time) {
  if (PROFILE === 'active') return true;
  // casual: 15 minutes playing, then 45 minutes away, every hour; nights off (8h of every 24)
  const day = time % 86400;
  if (day > 16 * 3600) return false;
  return (time % 3600) < 900;
}
const power = (D, taps) => D.dps + (taps ? TAP_RATE * GH.tapAvg(D) : 0);

function bestBuy(on) {
  // value = gain in effective damage per shiny
  const base = power(D, on);
  let best = null;
  for (let i = 0; i < UNITS.length; i++) {
    if (i > 0 && S.owned[i - 1] === 0) break; // units unlock in order
    const c = GH.unitCost(i, S.owned[i]);
    S.owned[i]++; const d2 = GH.derive(S); S.owned[i]--;
    const v = (power(d2, on) - base) / c;
    if (!best || v > best.v) best = { v, c, kind: 'unit', i };
  }
  for (const u of UPGRADES) {
    if (S.ups[u.id] || !GH.reqMet(u.req, S)) continue;
    const t = u.fx.t;
    if (t === 'gold' || t === 'xp' || t === 'raid' || t === 'boss' || t === 'offline' || t === 'hoard') {
      if (u.cost < S.gold * 0.3) { S.gold -= u.cost; S.ups[u.id] = 1; D = GH.derive(S); }
      continue;
    }
    S.ups[u.id] = 1; const d2 = GH.derive(S); delete S.ups[u.id];
    const v = (power(d2, on) - base) / u.cost;
    if (!best || v > best.v) best = { v, c: u.cost, kind: 'up', u };
  }
  return best;
}

function tryEvolve() {
  const f = FORM[S.form];
  if (f.final || S.level < f.maxLv) return;
  let best = null;
  for (const cid of f.children) {
    const c = FORM[cid];
    if (!GH.reqMet(c.req, S)) continue;
    const save = { form: S.form, level: S.level };
    S.form = cid; S.level = 1;
    const d2 = GH.derive(S);
    S.form = save.form; S.level = save.level;
    // prefer forms not yet in the codex a little, and value raw power
    let score = power(d2, true) * (S.codex[cid] ? 1 : 1.3);
    if (EVOLVE === 'deep' && c.final && c.tier < 6) score *= 0.2; // avoid dead ends
    if (EVOLVE === 'deep') score *= Math.pow(3, c.tier);
    if (process.env.PREFER && process.env.PREFER.split(',').includes(cid)) score *= 1e6;
    if (!best || score > best.score) best = { cid, score };
  }
  if (!best) return;
  S.form = best.cid; S.level = 1; S.xp = 0;
  const isNew = !S.codex[best.cid];
  S.codex[best.cid] = 1;
  D = GH.derive(S);
  say(`evolve → ${FORM[best.cid].name} (tier ${FORM[best.cid].tier})${isNew ? ' NEW' : ''}  codex ${Object.keys(S.codex).length}`);
}

function gainXp(x) {
  S.xp += x;
  const f = FORM[S.form];
  let changed = false;
  while (S.level < f.maxLv) {
    const need = GH.xpNeed(f.tier, S.level);
    if (S.xp < need) break;
    S.xp -= need; S.level++; changed = true;
  }
  if (S.level >= f.maxLv) S.xp = Math.min(S.xp, GH.xpNeed(f.tier, S.level));
  if (changed) D = GH.derive(S);
}

let boss = null, killAcc = 0;
const end = HOURS * 3600;
while (t < end) {
  const on = active(t);
  // buy as much as the strategy wants
  for (let n = 0; n < 50; n++) {
    const b = bestBuy(on);
    if (!b || b.c > S.gold) break;
    S.gold -= b.c;
    if (b.kind === 'unit') S.owned[b.i]++; else S.ups[b.u.id] = 1;
    D = GH.derive(S);
  }
  tryEvolve();

  const P = power(D, on);
  const s = GH.stageOf(S.region, S.threat);
  if (boss) {
    boss.hp -= P * DT; boss.time -= DT;
    if (boss.hp <= 0) {
      const g = GH.goldAt(s) * K.BOSS_GOLD * D.goldM;
      S.gold += g; gainXp(GH.xpAt(s) * K.BOSS_XP * D.xpM);
      say(`CONQUERED ${GH.region(S.region).name} (region ${S.region + 1})  dps ${fmt(D.dps)} tap ${fmt(GH.tapAvg(D))} form ${FORM[S.form].name} L${S.level}`);
      S.conquered = Math.max(S.conquered, S.region + 1);
      S.region++; S.threat = 0; lastConquer = t; boss = null;
      if (S.conquered > S.bestRegionEver) S.bestRegionEver = S.conquered;
      if (S.region > GH.FINAL_REGION && !S.won) { S.won = true; say('*** WORLD CONQUERED ***'); }
      D = GH.derive(S);
    } else if (boss.time <= 0) {
      boss = null; bossFailPower = P;
    }
  } else {
    if (on && S.threat >= 10 && P > bossFailPower * 1.25) {
      const bs = GH.stageOf(S.region, 9);
      boss = { hp: GH.hp(bs) * K.BOSS_HP * D.hpM, time: D.bossTime };
    } else {
      const h = GH.hp(s) * D.hpM;
      const tpk = K.SPAWN_DELAY + h / Math.max(P, 1e-9);
      killAcc += DT / tpk;
      while (killAcc >= 1) {
        killAcc -= 1;
        S.gold += GH.goldAt(s) * D.goldM; S.goldRun += GH.goldAt(s) * D.goldM;
        gainXp(GH.xpAt(s) * D.xpM);
        if (S.threat < 10) S.threat++;
        S.best = Math.max(S.best, GH.stageOf(S.region, S.threat));
      }
    }
  }
  // raids
  if (on && S.conquered >= 1 && t >= nextRaid && !boss) {
    const rh = GH.hp(s) * K.RAID_HP * D.hpM;
    if (P * D.raidTime >= rh) S.gold += GH.goldAt(s) * K.RAID_GOLD * D.goldM;
    else S.gold *= 1 - D.raidSteal;
    nextRaid = t + 300 + Math.random() * 240;
  }
  // rollback policy: stalled for 45 minutes of play and the gain is worth it
  const gain = GH.shardsFor(S.conquered);
  const stall = t - lastConquer;
  if (S.conquered >= GH.ROLLBACK_AT && !boss && ((stall > 2700 && gain >= Math.max(4, S.shards * 0.5)) || (stall > 3 * 3600 && gain >= S.shards * 0.15))) {
    S.shards += gain; S.rollbacks++;
    say(`ROLLBACK #${S.rollbacks}: +${gain} shards (total ${S.shards}), best region ${S.conquered}`);
    const keep = { shards: S.shards, rollbacks: S.rollbacks, codex: S.codex, bestRegionEver: S.bestRegionEver, won: S.won };
    S = Object.assign(GH.fresh(0), keep);
    D = GH.derive(S); lastConquer = t; bossFailPower = 0; boss = null;
  }
  t += DT;
}
console.log(log.join('\n'));
console.log(`\nend: region ${S.region + 1}, form ${FORM[S.form].name} L${S.level}, codex ${Object.keys(S.codex).length}/${GH.FORMS.length}, shards ${S.shards}, owned ${S.owned.join(',')}`);
