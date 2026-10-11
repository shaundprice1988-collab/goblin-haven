const GH=require('./load.cjs'); const M=GH.Meta; const S=GH.fresh();
console.log(Object.keys(S.meta).join(','), M.bindSlots(S), JSON.stringify(M.fx(S)), M.FEATS.length, M.LOGS.length);
S.bestRegionEver=3; console.log(M.trickState(S,'gank'), M.castTrick(S,'gank'), M.trickState(S,'gank'), M.live(S));
S.tricks.zerg={until:Date.now()+5000,ready:0}; console.log(M.live(S));
const c={}; for(let i=0;i<10000;i++){const p=M.pickParty(S,Math.random).id;c[p]=(c[p]||0)+1} console.log(c);
console.log([4,6,8,11,15].map(M.mythicShards));
S.challenge='ironman'; S.conquered=4; console.log(M.chProgress(S), M.bindSlots(S), M.chCleared(S), M.checkFeats(S).map(f=>f.id));
console.log(JSON.stringify(M.fx(S)));
