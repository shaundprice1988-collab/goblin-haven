// Runs the town with technology granted at target times, and reports how much of each resource was made in between.
import '../core.js';
import '../town.js';
const GH = globalThis.GH, Town = GH.Town;
const { JOBS, BUILDINGS, TECHS } = Town;
const TARGET = { fire: 0.15, baskets: 0.2, sticks: 0.3, herbs: 0.4, masonry: 0.6, counting: 0.9, mining: 1.5, songs: 2, drills: 2.5,
  longhouses: 3, wheelbarrows: 3.5, writing: 4.5, smithing: 5.5, plumbing: 8, patch: 9.5, clockwork: 11, loot: 13, glitch: 18, console: 24, respawn: 30, haven: 40 };
const REGION_T = [0.12, 1, 2, 4.08, 6.2, 7.25, 8, 8.22, 10.12, 12, 14, 36];
const S = GH.fresh(0); S.introDone = true;
function active(time) { const day = time % 86400; if (day > 16 * 3600) return false; return (time % 3600) < 900; }
function setSplit() {
  const t = S.town, has = (id) => Town.has(S, id);
  let w = { forager: 0.35, woodcutter: 0.3, tinkerer: 0.35 };
  if (has('masonry')) w = { forager: 0.3, woodcutter: 0.22, stonecutter: 0.18, tinkerer: 0.3 };
  if (has('mining')) w = { forager: 0.26, woodcutter: 0.16, stonecutter: 0.16, miner: 0.14, tinkerer: 0.28 };
  for (const j of JOBS) t.jobs[j.id] = 0;
  let left = t.pop; const ids = Object.keys(w);
  for (const id of ids) { const n = Math.floor(t.pop * w[id]); t.jobs[id] = n; left -= n; }
  for (let k = 0; left > 0; k++, left--) t.jobs[ids[k % ids.length]]++;
  for (const j of JOBS) t.split[j.id] = t.jobs[j.id];
}
const SHARE = Number(process.env.SHARE || 0.5); // share of non-idea resources kept for technology
function act(t) {
  const now = t * 1000; setSplit();
  let bought = true;
  while (bought) {
    bought = false;
    const cand = [];
    for (const b of BUILDINGS) {
      if (!Town.bldOpen(S, b.id) || b.id === 'shrine') continue;
      const c = Town.bldCost(b.id, Town.lvl(S, b.id));
      let ok = true;
      for (const r in c) if (S.town.res[r] * (1 - SHARE) < c[r] + (S.town.res[r] * 0)) ok = false;
      if (!ok) continue;
      const m = Town.mood(S, now);
      let pri = 1;
      if (b.id === 'huts') pri = S.town.pop >= Town.housing(S) - 1 ? 5 : 0.5;
      else if (b.fx === 'comfort') pri = m.work < 1.3 ? 4 : 0.6;
      else if (b.fx === 'job') pri = 2;
      cand.push({ b, pri });
    }
    cand.sort((a, b) => b.pri - a.pri);
    if (cand.length) { Town.build(S, cand[0].b.id); bought = true; }
  }
}
const DT = 2; let nextAct = 0, rescued = 0;
const made = []; let prev = { ...S.town.made }; let prevT = 0;
const order = Object.entries(TARGET).sort((a, b) => a[1] - b[1]);
let k = 0;
for (let t = 0; t <= 41 * 3600; t += DT) {
  while (rescued < REGION_T.length && t >= REGION_T[rescued] * 3600) { rescued++; S.town.unlocked = true; S.bestRegionEver = rescued; Town.rescue(S, rescued); }
  if (!S.town.unlocked) continue;
  Town.tick(S, DT, t * 1000);
  while (k < order.length && t >= order[k][1] * 3600) {
    const id = order[k][0];
    const d = {}; for (const r in S.town.made) d[r] = S.town.made[r] - prev[r];
    console.log(id.padEnd(13), `${order[k][1]}h`.padStart(6), 'pop', S.town.pop, 'ideas', Math.round(d.ideas), 'wood', Math.round(d.wood), 'stone', Math.round(d.stone), 'iron', Math.round(d.iron), 'food', Math.round(d.food));
    S.town.tech[id] = 1; prev = { ...S.town.made }; k++;
  }
  if (active(t) && t >= nextAct) { act(t); nextAct = t + 10; }
}
console.log('blds', JSON.stringify(S.town.bld));
