const GH = require('./w3load.cjs');
const M = GH.Meta, T = GH.Town;
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exitCode = 1; } else console.log('ok', m); };
let S = GH.fresh(); S.introDone = true;
// migration: old meta without new fields
const old = JSON.parse(JSON.stringify(S.meta)); for (const k of ['corrupt','relics','relicOpens','relicPity','relicKeys','ra','wipes','portal','portalAt','dayBoss','evSeen']) delete old[k]; delete old.c.ev; delete old.c.edicts;
const fm = M.fixMeta(old);
assert(fm.relics && fm.relicPity.r === 0 && fm.c.ev && fm.ra === 0 && fm.corrupt === 0, 'fixMeta fills wave 3 fields');
const oldTown = JSON.parse(JSON.stringify(S.town)); delete oldTown.edicts; delete oldTown.exp;
const ft = T.fixTown(oldTown); assert(Array.isArray(ft.edicts) && Array.isArray(ft.exp), 'fixTown fills edicts/exp');
// relics
S.meta.ep = 1e15;
const counts = [0,0,0,0];
for (let i = 0; i < 200; i++) { const r = M.openRelic(S, Math.random, false); counts[r.rarity.id]++; }
console.log('rarity counts', counts, 'opens', S.meta.relicOpens, 'cost', M.relicCost(S), 'relics', S.meta.relics);
assert(counts[3] >= 3, 'legendary pity gives >=3 in 200');
assert(Object.values(S.meta.relics).every((v) => v <= 5), 'levels capped at 5');
// pity check: fresh
let S2 = GH.fresh(); S2.meta.ep = 1e9; let gotR = 0; for (let i = 0; i < 10; i++) { const r = M.openRelic(S2, () => 0.01, false); if (r.rarity.id >= 1) gotR++; }
assert(gotR === 1, 'rare pity at 10 with always-common rng (' + gotR + ')');
S2.meta.relicKeys = 1; const k = M.openRelic(S2, Math.random, true); assert(k && S2.meta.relicKeys === 0, 'key open');
assert(M.openRelic(S2, Math.random, true) === null, 'no key -> null');
// fx with relics
const D0 = GH.derive(GH.fresh()), D1 = GH.derive(S);
console.log('all fresh', D0.all.toFixed(3), 'with relics', D1.all.toFixed(3));
// events
const ev = M.dateEvent(new Date(2026, 9, 11).getTime()); assert(ev && ev.id === 'anniv', 'anniv on Oct 11');
assert(new Date(ev.until).getDate() === 17, 'anniv ends Oct 17 00:00');
assert(M.dateEvent(new Date(2026, 9, 18).getTime()) === null, 'no event Oct 18');
assert(M.dateEvent(new Date(2027, 0, 3).getTime()).id === 'frost', 'frost Jan 3');
const fr = M.dateEvent(new Date(2026, 11, 20).getTime()); assert(new Date(fr.until).getFullYear() === 2027, 'frost ends next year');
assert(M.dateEvent(new Date(2026, 10, 3).getTime()).id === 'hallow', 'hallow Nov 3');
// portal
let S3 = GH.fresh(); S3.rollbacks = 4; const t0 = new Date(2026, 9, 18).getTime();
assert(M.openPortal(S3, 'frost', t0) && M.eventNow(S3, t0 + 1000).id === 'frost', 'portal opens frost');
assert(!M.openPortal(S3, 'hallow', t0 + 3601e3), 'portal recharging');
assert(M.eventNow(S3, t0 + 3601e3) === null, 'portal closes after an hour');
// parties
const S4 = GH.fresh(); S4.region = 5; const seen = {}; for (let i = 0; i < 400; i++) seen[M.pickParty(S4, Math.random).id] = 1; console.log('parties today', Object.keys(seen).join(','));
// wipe
const S5 = GH.fresh(); S5.won = true; S5.shards = 1400; assert(!M.canWipe(S5, 0) && M.canWipe(S5, 100), 'canWipe threshold');
assert(M.raGain(S5, 100) === 3, 'ra gain 3 at 1500');
S5.meta.ra = 3; assert(Math.abs(GH.shardPct(S5) - 0.4) < 1e-9, 'shardPct with ra3');
console.log('runGain 12 regions ra0', GH.runGain(GH.fresh(), 12), 'ra3', GH.runGain(S5, 12));
// corruption fx
const S6 = GH.fresh(); S6.rollbacks = 4; S6.meta.corrupt = 2; const f6 = M.fx(S6); assert(Math.abs(f6.warband / M.fx(GH.fresh()).warband - 1.6) < 1e-6, 'flood warband 1.6');
S6.rollbacks = 3; assert(M.corruptLvl(S6) === 0, 'corruption locked under 4 rollbacks');
// epScale
const S7 = GH.fresh(); S7.town.bld.vault = 2; S7.meta.relics.keycard = 1; S7.meta.ending = 'gm'; assert(Math.abs(M.epScale(S7) - 1.25 * 1.1 * 1.1) < 1e-9, 'epScale');
// feats list sanity
const ids = new Set(); for (const f of M.FEATS) { assert(!ids.has(f.id), 'unique ' + f.id); ids.add(f.id); }
const S8 = GH.fresh(); S8.meta.c.ev.anniv = 100; const got = M.checkFeats(S8); console.log('feats got', got.map((f) => f.id).join(','));
// seasons through a day of offline advance
const S9 = GH.fresh(); S9.town.unlocked = true; S9.town.res.food = 1000; const r = T.advance(S9, 6 * 3600); console.log('advance 6h born', r.born, 'pop', S9.town.pop);
