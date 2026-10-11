// Town simulator: plays the town with a simple strategy and prints when each technology lands.
// usage: node sim/town-sim.mjs [hours] [profile: active|casual] [T overrides as k=v ...]
import '../core.js';
import '../town.js';
const GH = globalThis.GH;
const Town = GH.Town;
const { T, JOBS, BUILDINGS, TECHS } = Town;

const HOURS = Number(process.argv[2] || 48);
const PROFILE = process.argv[3] || 'casual';
for (const kv of process.argv.slice(4)) { const [k, v] = kv.split('='); T[k] = Number(v); }
// first conquest of each region in the combat simulator (casual profile), in hours
const REGION_T = [0.12, 1, 2, 4.08, 6.2, 7.25, 8, 8.22, 10.12, 12, 14, 36];

const S = GH.fresh(0);
S.introDone = true;
const fmtT = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return `${String(h).padStart(3)}h${String(m).padStart(2, '0')}m`; };
const f = (x) => x < 1e3 ? x.toFixed(x < 10 ? 1 : 0) : x.toExponential(2);
const log = (t, m) => console.log(`${fmtT(t)}  ${m}`);
function active(time) {
  if (PROFILE === 'active') return true;
  const day = time % 86400;
  if (day > 16 * 3600) return false;
  return (time % 3600) < 900;
}

function setSplit() {
  const t = S.town, has = (id) => Town.has(S, id);
  let w = { forager: 0.35, woodcutter: 0.3, tinkerer: 0.35 };
  if (has('masonry')) w = { forager: 0.3, woodcutter: 0.22, stonecutter: 0.18, tinkerer: 0.3 };
  if (has('mining')) w = { forager: 0.26, woodcutter: 0.16, stonecutter: 0.16, miner: 0.14, tinkerer: 0.28 };
  if (has('glitch')) w = { forager: 0.22, woodcutter: 0.08, stonecutter: 0.2, miner: 0.18, tinkerer: 0.32 };
  for (const j of JOBS) t.jobs[j.id] = 0;
  let left = t.pop;
  const ids = Object.keys(w);
  for (const id of ids) { const n = Math.floor(t.pop * w[id]); t.jobs[id] = n; left -= n; }
  for (let k = 0; left > 0; k++, left--) t.jobs[ids[k % ids.length]]++;
  for (const j of JOBS) t.split[j.id] = t.jobs[j.id];
}

function act(t) {
  const now = t * 1000;
  setSplit();
  // research the cheapest open tech
  let bought = true;
  while (bought) {
    bought = false;
    const open = TECHS.filter((x) => Town.techState(S, x.id) === 'open').sort((a, b) => a.cost.ideas - b.cost.ideas);
    for (const x of open) if (Town.research(S, x.id)) { log(t, `TECH ${x.name}  (pop ${S.town.pop}/${Town.housing(S)}, mood ${Town.mood(S, now).label})`); bought = true; break; }
    const next = open.find((x) => !Town.has(S, x.id));
    const reserve = next ? next.cost : {};
    // buildings
    const cand = [];
    for (const b of BUILDINGS) {
      if (!Town.bldOpen(S, b.id)) continue;
      const c = Town.bldCost(b.id, Town.lvl(S, b.id));
      let ok = true;
      for (const r in c) if (S.town.res[r] - c[r] < (r === 'ideas' ? 0 : (reserve[r] || 0))) ok = false;
      if (!ok) continue;
      let pri = 1;
      const m = Town.mood(S, now);
      if (b.id === 'huts') pri = S.town.pop >= Town.housing(S) - 1 ? 5 : 0.5;
      else if (b.fx === 'comfort') pri = m.work < 1.3 ? 4 : 0.6;
      else if (b.fx === 'job') pri = 2;
      cand.push({ b, c, pri });
    }
    cand.sort((a, b) => b.pri - a.pri);
    if (cand.length) { Town.build(S, cand[0].b.id); bought = true; }
  }
  if (Town.lvl(S, 'feast') && !Town.feasting(S, now) && S.town.pop >= Town.housing(S) && S.town.res.food > Town.feastCost(S) * 2) Town.feast(S, now);
}

const DT = 2;
let nextAct = 0, nextLog = 3600, rescued = 0;
for (let t = 0; t <= HOURS * 3600; t += DT) {
  while (rescued < REGION_T.length && t >= REGION_T[rescued] * 3600) {
    rescued++;
    if (!S.town.unlocked) { S.town.unlocked = true; log(t, 'TOWN UNLOCKED'); }
    S.bestRegionEver = rescued;
    Town.rescue(S, rescued);
    if (rescued === 12) S.won = true;
  }
  if (!S.town.unlocked) continue;
  Town.tick(S, DT, t * 1000);
  if (active(t) && t >= nextAct) { act(t); nextAct = t + 10; }
  if (t >= nextLog) {
    nextLog += PROFILE === 'active' ? 1800 : 3 * 3600;
    const r = Town.rates(S, t * 1000), m = Town.mood(S, t * 1000);
    const fx = Town.fx(S, t * 1000);
    log(t, `pop ${S.town.pop}/${Town.housing(S)} mood ${m.label} ×${m.work.toFixed(2)} | rates food ${f(r.food)} wood ${f(r.wood)} stone ${f(r.stone)} iron ${f(r.iron)} ideas ${f(r.ideas)} | warband ×${f(fx.warband)} gold ×${f(fx.gold)} all ×${f(fx.all)}`);
    log(t, `   blds ${Object.entries(S.town.bld).map(([k, v]) => k + v).join(' ')}`);
  }
}
console.log('techs', Object.keys(S.town.tech).length, '/', TECHS.length);
