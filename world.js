// Goblin Haven: the long game. Seasons, Town Hall edicts and expeditions, corruption and data leeches,
// heirloom relics, live events and the replay portal, server wipes, and the reasons to come back tomorrow.
// app.js hands over its internal API on 'init' and calls back through GH.emit / GH.ask.
'use strict';
(function () {
  const GH = window.GH, M = GH.Meta, Town = GH.Town;
  const $ = (s) => document.querySelector(s);
  let A = null;
  const st = () => A.S;
  const fmt = (x, d) => A.fmt(x, d), esc = (s) => A.esc(s);
  const pct = (x) => `${fmt(Math.round(x * 100))}%`;
  const RES_NAME = { food: 'food', wood: 'wood', stone: 'stone', iron: 'iron', ideas: 'ideas' };
  const SEASON_ICON = { spring: '✿', summer: '☀', autumn: '❦', winter: '❄' };
  const left = (sec) => (sec >= 3600 ? A.fmtTime(sec) : sec >= 60 ? `${Math.floor(sec / 60)}m ${String(Math.floor(sec % 60)).padStart(2, '0')}s` : `${Math.ceil(sec)}s`);

  // ------------------------------------------------------------------ seasons
  function renderSeasonChip() {
    const s = Town.season();
    A.set($('#seasonChip'), 'html', `<span aria-hidden="true">${SEASON_ICON[s.id]}</span> ${s.name} · ${Math.ceil(s.left / 60)}m`);
    const label = `${s.name}, ${Math.ceil(s.left / 60)} minutes left. ${s.desc}`;
    if ($('#seasonChip')._l !== label) { $('#seasonChip')._l = label; $('#seasonChip').setAttribute('aria-label', label); }
  }
  $('#seasonChip').addEventListener('click', () => {
    const s = Town.season();
    A.sys(`${s.name}: ${s.desc} ${s.next.name} arrives in ${left(s.left)}.`, '', 'season');
  });
  let lastSeason = '';
  function seasonTick() {
    const S = st();
    const s = Town.season();
    if (lastSeason && s.id !== lastSeason && S.town.unlocked) {
      A.derive();
      A.sys(`The season turns: ${s.name}. ${s.desc}`, 'gold', 'season');
      if (S.tab === 'town') A.townView.say(({ spring: 'Eggs everywhere!', summer: 'Too hot for tunnels.', autumn: 'The tinkerers love this weather.', winter: 'Brrr. Feast, anyone?' })[s.id]);
    }
    lastSeason = s.id;
  }

  // ------------------------------------------------------------------ the Hall tab: edicts and expeditions
  const hallOpen = (S) => (S.rollbacks || 0) >= Town.BLD.hall.rb || Town.lvl(S, 'hall') > 0 || Town.lvl(S, 'camp') > 0;
  let hallSig = '';
  function renderHall(force) {
    const S = st(), t = S.town, el = $('#sub-hall');
    if (!el || el.hidden) return;
    const now = Date.now();
    const hall = Town.lvl(S, 'hall'), camp = Town.lvl(S, 'camp');
    const wait = Town.edictWait(S, now);
    const sig = [hall, camp, t.edicts.join(','), wait > 0, Town.corrupted(S), t.exp.map((e) => e.id + (now >= e.end ? '!' : '')).join(','),
      Town.TRIPS.map((x) => Town.expBlock(S, x.id)).join('|'), Town.season().id, S.rollbacks, S.meta.relicKeys].join('#');
    if (sig !== hallSig || force) {
      hallSig = sig;
      const s = Town.season();
      let html = `<div class="sysw seasoncard"><h3>${SEASON_ICON[s.id]} ${esc(s.name)}</h3>
        <p>${esc(s.desc)}</p><p class="muted small" style="margin:0">${esc(s.next.name)} in <span data-season></span>. Seasons turn every 45 minutes for everyone on the server: ${Town.SEASONS.map((x) => esc(x.name)).join(', ')}.</p></div>`;
      // edicts
      if (!hall) {
        html += `<div class="sysw"><h3>Edicts</h3><p class="muted" style="margin:0">${(S.rollbacks || 0) >= Town.BLD.hall.rb
          ? `Build the Town Hall${Town.has(S, 'masonry') ? '' : ' (it needs Masonry first)'} to issue edicts: laws that boost one thing at the cost of another.`
          : `The Town Hall opens after ${Town.BLD.hall.rb} server rollbacks.`}</p></div>`;
      } else {
        const slots = Town.edictSlots(S);
        const rows = Town.EDICTS.map((e) => {
          const on = t.edicts.includes(e.id), live = Town.edictOn(S, e.id);
          const locked = e.corrupt && !Town.corrupted(S) && !on;
          const btn = on ? `<button type="button" class="secondary small-btn" data-repeal="${e.id}" ${wait > 0 ? 'disabled' : ''}>Repeal</button>`
            : `<button type="button" class="buy ${wait > 0 || locked ? '' : 'can'}" data-enact="${e.id}" ${wait > 0 || locked ? 'disabled' : ''}><span class="lbl">${t.edicts.length >= slots ? 'Swap in' : 'Enact'}</span></button>`;
          return `<li class="row up-row edict ${on ? 'on' : ''} ${locked ? 'locked' : ''}"><div class="info"><div class="name">${esc(e.name)}${on ? ` <span class="chip-${live ? 'done' : 'seen'}">${live ? 'In force' : 'Asleep'}</span>` : ''}</div>
            <div class="detail">${esc(e.desc)}</div>${on && !live ? '<div class="next">Corrupt Rites sleeps until you turn corruption back on.</div>' : ''}</div>${btn}</li>`;
        }).join('');
        html += `<div class="sysw edicts"><h3>Edicts <span class="small muted">${t.edicts.length} of ${slots} in force</span></h3>
          <p class="muted small" style="margin:0">${slots < 2 ? 'One edict at a time; a level 5 Town Hall allows two.' : 'Two edicts at a time.'} After any change, the elders need 5 minutes before the next.${wait > 0 ? ` <b class="gold">Next change in <span data-edict></span>.</b>` : ''}</p></div>
          <ul class="list">${rows}</ul>`;
      }
      // expeditions
      if (!camp) {
        html += `<div class="sysw"><h3>Expeditions</h3><p class="muted" style="margin:0">${(S.rollbacks || 0) >= Town.BLD.camp.rb
          ? 'Build the Expedition Camp to send goblins out. They bring back shinies, resources and sometimes a relic cache key.'
          : `The Expedition Camp opens after ${Town.BLD.camp.rb} server rollbacks.`}</p></div>`;
      } else {
        const out = t.exp.map((e, i) => {
          const trip = Town.TRIP[e.id], back = now >= e.end;
          return `<li class="exp-out ${back ? 'back' : ''}"><div class="eo-top"><b>${esc(trip.name)}</b><span>${e.party} goblins</span></div>
            ${back ? `<button type="button" class="buy can" data-claim="${i}"><span class="lbl">They’re back!</span><span class="cost">Collect the loot</span></button>`
              : `<div class="bar"><span data-expbar="${i}"></span></div><div class="muted small">Back in <span data-expleft="${i}"></span></div>`}</li>`;
        }).join('');
        const trips = Town.TRIPS.map((x) => {
          const why = Town.expBlock(S, x.id);
          return `<li class="row up-row"><div class="info"><div class="name">${esc(x.name)} <span class="lv">${A.fmtTime(x.sec)}</span></div>
            <div class="detail">${x.party} goblins. ${esc(x.desc)} Key chance ${pct(x.key)}.</div>${why && t.exp.length < Town.expSlots(S) ? `<div class="next">${esc(why)}</div>` : ''}</div>
            <button type="button" class="buy ${why ? '' : 'can'}" data-send="${x.id}" ${why ? 'disabled' : ''}><span class="lbl">Send</span><span class="cost">${x.party} goblins</span></button></li>`;
        }).join('');
        const nReady = Town.expReady(S, now);
        html += `<div class="sysw exps"><h3>Expeditions <span class="small muted">${t.exp.length} of ${Town.expSlots(S)} out · ${fmt(t.expDone || 0)} back so far</span></h3>
          <p class="muted small" style="margin:0 0 6px">Parties leave your workforce until you collect them. They bring back shinies from the toughest adventurers you’ve reached this run, a share of what the town gathers${Town.campMul(S) > 1 ? ` (+${pct(Town.campMul(S) - 1)} from your camp)` : ''}, and sometimes a relic cache key.</p>
          ${out ? `<ul class="explist">${out}</ul>` : ''}${nReady > 1 ? '<button type="button" class="primary wide" data-claimall>Collect everyone</button>' : ''}</div>
          ${t.exp.length < Town.expSlots(S) ? `<ul class="list">${trips}</ul>` : `<p class="empty" style="padding-top:12px">${Town.expSlots(S) < 2 ? 'A level 3 Expedition Camp lets two parties go at once.' : 'Both parties are out.'}</p>`}`;
      }
      el.innerHTML = html;
    }
    // timers
    const sn = el.querySelector('[data-season]');
    if (sn) A.set(sn, 'text', left(Town.season().left));
    const ed = el.querySelector('[data-edict]');
    if (ed) A.set(ed, 'text', left(wait));
    t.exp.forEach((e, i) => {
      const b = el.querySelector(`[data-expbar="${i}"]`), l = el.querySelector(`[data-expleft="${i}"]`);
      if (b) A.set(b, 'width', `${Math.min(100, ((now - e.start) / (e.end - e.start)) * 100).toFixed(1)}%`);
      if (l) A.set(l, 'text', left(Math.max(0, (e.end - now) / 1000)));
    });
  }
  // what a party carries home: town resources (from town.js), shinies, and maybe a key
  function claim(i) {
    const S = st(), now = Date.now();
    const res = Town.claimExp(S, i, now);
    if (!res) return null;
    const D = A.D;
    // a share of what the warband would loot in that time, at the toughest adventurers you've reached this run
    const g = GH.goldAt(Math.max(0, S.best || 0)) * D.goldM * (res.trip.sec / 4) * Town.campMul(S);
    A.earn(g);
    const key = Math.random() < res.trip.key;
    if (key) S.meta.relicKeys = (S.meta.relicKeys || 0) + 1;
    S.meta.c.exp = (S.meta.c.exp || 0) + 1;
    const bits = Object.keys(res.res).filter((r) => res.res[r] >= 1).map((r) => `${fmt(res.res[r])} ${RES_NAME[r]}`);
    A.sys(`${res.trip.name} is home: ${fmt(g)} shinies${bits.length ? `, ${bits.join(', ')}` : ''}${key ? ', and a relic cache key!' : '.'}`, 'gold', 'exp' + i);
    GH.emit('expBack', res, g, key);
    return res;
  }
  $('#sub-hall').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const S = st();
    if (b.dataset.enact || b.dataset.repeal) {
      const id = b.dataset.enact || b.dataset.repeal;
      if (!Town.toggleEdict(S, id)) return;
      if (b.dataset.enact) {
        S.meta.c.edicts = (S.meta.c.edicts || 0) + 1;
        A.sys(`Edict issued: ${Town.EDICT[id].name}. ${Town.EDICT[id].desc}`, 'gold', 'edict');
        A.townView.say(A.pick(['The elders have spoken!', 'New rules? Fine.', 'Who reads these anyway?']));
      } else A.sys(`${Town.EDICT[id].name} repealed.`, '', 'edict');
      GH.emit('edict', id);
    } else if (b.dataset.send) {
      const x = Town.TRIP[b.dataset.send];
      if (!Town.sendExp(S, x.id)) return;
      A.sys(`${x.name}: ${x.party} goblins set off. Back in ${A.fmtTime(x.sec)}.`, '', 'exp');
      A.townView.say(A.pick(['Adventure! Real adventure!', 'Back by dinner. Probably.', 'Which way is “out”?']));
      GH.emit('expSend', x.id);
    } else if (b.dataset.claim != null) claim(Number(b.dataset.claim));
    else if (b.hasAttribute('data-claimall')) { for (let i = S.town.exp.length - 1; i >= 0; i--) claim(i); }
    else return;
    A.derive(); A.buzz(15); A.save();
    hallSig = '';
    A.render(true);
  });

  // ------------------------------------------------------------------ corruption and data leeches
  const SLOTS = [[12, 34], [30, 44], [46, 30], [62, 42], [20, 56], [40, 58], [8, 48], [56, 56]];
  const LEECH_SVG = (shiny) => {
    const body = shiny ? '#F2C14E' : '#FF4F8B', dark = shiny ? '#B8862A' : '#A82E5E', eye = shiny ? '#FFFFFF' : '#7FE0F5';
    const cells = ['....bbbb....', '..bbBBBBbb..', '.bBBBBBBBBb.', 'bBBeBBBBeBBb', 'bBBBBBBBBBBb', 'bBBBBBBBBBBb', '.bBBkkkkBBb.', '..bBkBBkBb..', '...bBBBBb...', '....b..b....'];
    const col = { b: dark, B: body, e: eye, k: '#1C1814' };
    let r = '';
    cells.forEach((row, y) => [...row].forEach((ch, x) => { if (col[ch]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col[ch]}"/>`; }));
    return `<svg viewBox="0 0 12 10" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
  };
  function leeches() {
    const S = st();
    if (!Array.isArray(S.leeches)) S.leeches = [];
    return S.leeches;
  }
  let leechSig = '';
  function renderLeeches() {
    const L = leeches(), box = $('#leeches');
    const sig = L.map((l) => l.slot + (l.shiny ? 's' : '')).join(',') + '|' + st().introDone;
    if (sig === leechSig) return;
    leechSig = sig;
    box.innerHTML = st().introDone ? L.map((l, i) => `<button type="button" class="leech ${l.shiny ? 'shiny' : ''}" data-leech="${i}" style="left:${SLOTS[l.slot][0]}%;top:${SLOTS[l.slot][1]}%;--d:${(l.slot * 0.37) % 1}s" aria-label="${l.shiny ? 'Shiny data leech' : 'Data leech'}. Tap to pop it and get back what it took.">${LEECH_SVG(l.shiny)}</button>`).join('') : '';
  }
  function spawnLeech() {
    const S = st(), lv = M.corruptLvl(S), C = M.CORRUPT[lv];
    const L = leeches();
    if (!lv || L.length >= C.cap) return false;
    const used = new Set(L.map((l) => l.slot));
    const free = SLOTS.map((_, i) => i).filter((i) => !used.has(i));
    if (!free.length) return false;
    const slot = free[Math.floor(Math.random() * free.length)];
    L.push({ slot, store: 0, shiny: Math.random() < C.shiny ? 1 : 0 });
    renderLeeches();
    if (!S.meta.c.leechSeen) { S.meta.c.leechSeen = 1; A.sys('A data leech! It skims shinies from every kill. Tap it to pop it and take them back, with interest.', 'glitch', 'leech'); }
    return true;
  }
  function popLeech(i, mult, quiet) {
    const S = st(), L = leeches(), l = L[i];
    if (!l) return 0;
    L.splice(i, 1);
    const m = mult == null ? M.CORRUPT[M.corruptLvl(S)].pop * (l.shiny ? 3 : 1) : mult;
    const back = l.store;
    S.gold += back;                      // it was already counted as earned
    if (m > 1) A.earn(back * (m - 1));
    if (!quiet) {
      S.meta.c.leeches = (S.meta.c.leeches || 0) + 1;
      if (l.shiny) {
        S.shards += 1;
        S.meta.c.shinies = (S.meta.c.shinies || 0) + 1;
        A.derive();
        GH.emit('shadow', 's_shiny');
        A.sys(`Shiny leech! It was carrying corrupted data: +1 (now ${fmt(S.shards)}).`, 'glitch', 'shiny');
      }
      popFloat(l.slot, back * m, l.shiny);
      A.buzz(12);
      GH.emit('leechPop', l, back * m);
    }
    renderLeeches();
    return back * m;
  }
  function popFloat(slot, amount, shiny) {
    const box = $('#leeches');
    const d = document.createElement('span');
    d.className = 'leechpop' + (shiny ? ' shiny' : '');
    d.style.left = SLOTS[slot][0] + 4 + '%';
    d.style.top = SLOTS[slot][1] + '%';
    d.textContent = amount >= 1 ? '+' + fmt(amount) : 'pop!';
    box.appendChild(d);
    setTimeout(() => d.remove(), 1000);
  }
  $('#leeches').addEventListener('pointerdown', (e) => { if (e.target.closest('.leech')) e.stopPropagation(); });
  $('#leeches').addEventListener('click', (e) => {
    const b = e.target.closest('[data-leech]');
    if (b) popLeech(Number(b.dataset.leech));
  });
  // Changing the level: turning it off pops every leech at no bonus; dropping to Seep pops the ones over the cap.
  function setCorrupt(v) {
    const S = st();
    if (!M.corruptOpen(S) || S.meta.corrupt === v) return;
    S.meta.corrupt = v;
    const cap = M.CORRUPT[M.corruptLvl(S)].cap;
    let back = 0;
    while (leeches().length > cap) back += popLeech(leeches().length - 1, 1, true);
    A.derive(); A.save();
    A.sys(v ? `Corruption: ${M.CORRUPT[v].name}. ${M.CORRUPT[v].desc}` : `Corruption off. The leeches let go${back >= 1 ? ` and dropped ${fmt(back)} shinies` : ''}.`, v ? 'glitch' : '', 'corrupt');
    if (v) A.scene.corruptFlash();
    GH.emit('corrupt', v);
    worldSig = '';
    A.render(true);
  }
  let leechAcc = 0, leechNext = 0;
  function leechTick() {
    const S = st(), lv = M.corruptLvl(S);
    if (!lv || !S.introDone || document.hidden) { leechAcc = 0; return; }
    leechAcc++;
    if (!leechNext) leechNext = M.CORRUPT[lv].every * (0.7 + Math.random() * 0.6);
    if (leechAcc >= leechNext) { leechAcc = 0; leechNext = 0; spawnLeech(); }
  }
  GH.on('kill', (e, g) => {
    const S = st(), L = leeches();
    if (!L.length || !(g > 0)) return;
    const take = Math.min(S.gold, g * M.leechDrain(L.length));
    if (!(take > 0)) return;
    S.gold -= take;
    for (const l of L) l.store += take / L.length;
  });

  // ------------------------------------------------------------------ heirloom relics
  const RAR_CLASS = ['r0', 'r1', 'r2', 'r3'];
  let lastPull = null;
  function relicBtn(S) {
    const keys = S.meta.relicKeys || 0, cost = M.relicCost(S);
    const hot = keys > 0 || S.meta.ep >= cost;
    return `<button type="button" class="metabtn ${hot ? 'hot' : ''}" id="openRelic"><b>Relic Cache</b><small>${keys ? `${keys} key${keys === 1 ? '' : 's'} to use` : `${M.relicCount(S)} of ${M.RELICS.length} found · ${fmt(cost)} pts`}</small></button>`;
  }
  GH.on('metaBtns', (out, S) => { if ((S.rollbacks || 0) >= 1 || S.meta.relicOpens > 0) out.push(relicBtn(S)); });
  function openRelics() {
    const S = st(), m = S.meta;
    const cost = M.relicCost(S), keys = m.relicKeys || 0, p = m.relicPity;
    const pity = [`rare or better within ${M.PITY.r - p.r}`, `epic within ${M.PITY.e - p.e}`, `legendary within ${M.PITY.l - p.l}`];
    const list = M.RELICS.map((r) => {
      const L = M.relicLvl(S, r.id), R = M.RARITY[r.r];
      return `<li class="relic ${RAR_CLASS[r.r]} ${L ? '' : 'unknown'}"><div class="rl-head"><b>${L ? esc(r.name) : '???'}</b><span class="rar">${R.name}</span></div>
        ${L ? `<small>${esc(r.per)} <span class="gold">Level ${L}/${M.RELIC_MAX}</span></small><small class="muted">${esc(r.blurb)}</small>` : '<small class="muted">Not found yet.</small>'}</li>`;
    }).join('');
    const pull = lastPull ? `<div class="pull ${RAR_CLASS[lastPull.rarity.id]}"><span class="rar">${lastPull.rarity.name}!</span><b>${esc(lastPull.relic.name)}</b>
      <small>${lastPull.refund ? `Already at level ${M.RELIC_MAX}: your ${fmt(lastPull.refund)} points came back.` : lastPull.level > 1 ? `Level ${lastPull.level}. ${esc(lastPull.relic.per)}` : `New relic! ${esc(lastPull.relic.per)}`}</small></div>` : '';
    $('#relicDlg').innerHTML = `<div class="sys-title">Inventory</div><h2>Relic Cache <span class="muted small">${M.relicCount(S)} of ${M.RELICS.length}</span></h2>
      <p class="muted">Things you carried through every rollback. Each cache holds one relic; duplicates level it up, to level ${M.RELIC_MAX}. Relics last forever, through rollbacks and wipes.</p>
      ${pull}
      <div class="eppill"><span>Exploit points</span><b>${fmt(m.ep)}</b></div>
      <div class="btnrow"><button type="button" class="glitchbtn" data-pull ${m.ep >= cost ? '' : 'disabled'}>Open for ${fmt(cost)} points</button>
        <button type="button" class="secondary" data-key ${keys ? '' : 'disabled'}>Use a key (${keys})</button></div>
      <p class="muted small">Odds: common 60%, rare 28%, epic 10%, legendary 2%. Guaranteed: ${pity.join(', ')} opens. Expeditions find keys.</p>
      <ul class="reliclist">${list}</ul>
      <div class="dlg-actions sticky"><button type="button" class="primary" data-close>Close</button></div>`;
    A.openDlg($('#relicDlg'));
  }
  $('#relicDlg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.hasAttribute('data-close')) { lastPull = null; A.closeDlg($('#relicDlg')); return; }
    const S = st();
    const res = M.openRelic(S, Math.random, b.hasAttribute('data-key'));
    if (!res) return;
    lastPull = res;
    A.derive(); A.save(); A.buzz(res.rarity.id >= 2 ? 50 : 20);
    GH.emit('relic', res);
    openRelics();
    const top = $('#relicDlg');
    if (top) top.scrollTop = 0;
  });
  $('#metaBar').addEventListener('click', (e) => { if (e.target.closest('#openRelic')) { lastPull = null; openRelics(); } });

  // ------------------------------------------------------------------ live events
  let lastEv = '';
  function eventTick(quiet) {
    const S = st(), ev = M.eventNow(S);
    const id = ev ? ev.id + (ev.portal ? 'p' : '') : '';
    if (id !== lastEv) {
      const was = lastEv;
      lastEv = id;
      A.derive();
      worldSig = '';
      if (ev && !quiet) A.sys(`${ev.portal ? 'Replay portal' : 'Live event'}: ${ev.name}! ${ev.desc}`, 'gold', 'event');
      else if (!ev && was && !quiet) A.sys('The event is over. See you at the next one.', '', 'event');
    }
    // say hello once per event per year
    if (ev && !ev.portal && S.introDone) {
      const key = ev.id + new Date().getFullYear();
      if (S.meta.evSeen !== key) { S.meta.evSeen = key; setTimeout(() => A.sys(`Live event: ${ev.name}! ${ev.desc} Ends ${new Date(ev.until - 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.`, 'gold', 'event'), 1800); }
    }
  }
  GH.on('enemySpawn', (e) => {
    const ev = M.eventNow(st());
    if (!ev || !ev.hat || !e) return;
    const hat = (L) => Object.assign({}, L, { hat: ev.hat, hood: null });
    if (e.looks) { e.looks = e.looks.map((L) => (Math.random() < 0.7 ? hat(L) : L)); e.look = e.looks[1]; }
    else if (e.look && e.look.hat !== 'gm' && (e.boss || Math.random() < 0.6)) e.look = hat(e.look);
  });
  GH.on('kill', () => {
    const S = st(), ev = M.eventNow(S);
    if (ev) S.meta.c.ev[ev.id] = (S.meta.c.ev[ev.id] || 0) + 1;
  });
  function nextEvent(now) {
    const d = new Date(now);
    let best = null;
    for (const e of M.EVENTS) {
      let at = new Date(d.getFullYear(), e.from[0] - 1, e.from[1]);
      if (at.getTime() <= now) at = new Date(d.getFullYear() + 1, e.from[0] - 1, e.from[1]);
      if (!best || at < best.at) best = { e, at };
    }
    return best;
  }

  // ------------------------------------------------------------------ the World tab: event, daily bonus, corruption, root access
  let worldSig = '';
  function renderWorldExtra(force) {
    const S = st(), el = $('#worldExtra');
    if (!el || S.tab !== 'world') return;
    const now = Date.now();
    const ev = M.eventNow(S, now);
    const today = M.dayKey(now);
    const pending = M.canRollback(S) ? GH.runGain(S, S.conquered) : 0;
    const sig = [ev && ev.id, ev && ev.portal, S.meta.dayBoss === today, M.corruptOpen(S), M.corruptLvl(S), leeches().length, S.won, S.meta.wipes, S.meta.ra,
      S.shards, pending, M.portalOpen(S), Math.ceil(M.portalWait(S, now) / 60), ev ? S.meta.c.ev[ev.id] || 0 : 0, S.rollbacks].join('|');
    if (sig !== worldSig || force) {
      worldSig = sig;
      let html = '';
      // event / portal
      if (ev) {
        const kills = S.meta.c.ev[ev.id] || 0, f = M.FEAT['ev_' + ev.id];
        html += `<div class="sysw eventcard ev-${ev.id}"><h3>${ev.portal ? 'Replay portal' : 'Live event'}: ${esc(ev.name)}</h3><p>${esc(ev.desc)}</p>
          <p class="muted small" style="margin:0">Ends in <span data-evleft></span>. Special raid parties turn up while it lasts.${f && !M.hasFeat(S, f.id) ? ` Feat “${esc(f.name)}”: ${fmt(Math.min(kills, 100))}/100 adventurers.` : ''}</p></div>`;
      } else if (M.portalOpen(S)) {
        const w = M.portalWait(S, now);
        html += `<div class="sysw eventcard portal"><h3>Replay portal</h3><p class="muted">Missed an event? Reopen one for an hour. The portal needs 20 hours to recharge.</p>
          <div class="chips">${M.EVENTS.map((e) => `<button type="button" class="chip" data-portal="${e.id}" ${w > 0 ? 'disabled' : ''}>${esc(e.name)}</button>`).join('')}</div>
          ${w > 0 ? `<p class="muted small" style="margin:8px 0 0">Recharging: ready in <span data-portalleft></span>.</p>` : ''}</div>`;
      } else {
        const nx = nextEvent(now);
        if (nx && (S.rollbacks || 0) >= 1) html += `<p class="muted small evnext">Next live event: ${esc(nx.e.name)}, ${nx.at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.</p>`;
      }
      // daily
      if (S.conquered >= 1 || S.rollbacks) {
        const done = S.meta.dayBoss === today;
        html += `<p class="daily ${done ? 'done' : ''}">${done ? '✓ Today’s first raid leader is down. A fresh ×5 bonus waits tomorrow.' : '★ Daily: the first raid leader you beat today drops ×5 loot.'}</p>`;
      }
      // corruption
      if (M.corruptOpen(S)) {
        const lv = M.corruptLvl(S), L = leeches();
        const stored = L.reduce((a, l) => a + l.store, 0);
        html += `<div class="sysw glitch corruptcard"><h3>Corruption</h3>
          <p class="muted small" style="margin:0 0 8px">Let the glitch in. You hit harder, but data leeches crawl into the battle and skim ${pct(M.LEECH_DRAIN)} of each kill’s shinies apiece. Tap them to pop them.</p>
          <div class="seg" role="group" aria-label="Corruption level">${M.CORRUPT.map((c) => `<button type="button" data-corrupt="${c.id}" aria-pressed="${lv === c.id}">${esc(c.name)}</button>`).join('')}</div>
          <p class="cdesc">${esc(M.CORRUPT[lv].desc)}</p>
          ${L.length ? `<p class="small" style="margin:0">${L.length} leech${L.length === 1 ? '' : 'es'} skimming ${pct(M.leechDrain(L.length))} of each kill, holding ${fmt(stored)} shinies.</p>` : ''}</div>`;
      }
      // root access
      if (S.won || S.meta.wipes) {
        const can = M.canWipe(S, pending), ra = M.raGain(S, pending);
        const total = S.shards + pending;
        html += `<div class="sysw glitch wipecard"><h3>Server wipe</h3>
          <p>Wipe every server and come back with root access. Corrupted data, exploits and exploit points are deleted. Your town, feats, relics, remembered forms, logs and rollback count survive.</p>
          <dl class="statgrid fc"><dt>Root access</dt><dd class="v corrupt">${S.meta.ra}${S.meta.ra ? ` · data ${fmt(GH.shardPct(S) * 100)}% each` : ''}</dd>
            <dt>Wipe now for</dt><dd class="v corrupt">+${ra} root access</dd>
            <dt>Corrupted data</dt><dd class="v">${fmt(total)}${pending ? ` <span class="muted">(${fmt(pending)} from this run)</span>` : ''} / ${fmt(M.WIPE_AT)}</dd></dl>
          <p class="small muted">Each root access: corrupted data counts 10% more each, rollbacks give 25% more of it, and everything is 25% stronger.</p>
          <button type="button" class="glitchbtn" id="wipeBtn" ${can ? '' : 'disabled'}>${can ? 'Wipe the server' : `Needs ${fmt(M.WIPE_AT)} corrupted data`}</button></div>`;
      }
      el.innerHTML = html;
    }
    const el2 = el.querySelector('[data-evleft]');
    if (el2 && ev) A.set(el2, 'text', A.fmtTime((ev.until - now) / 1000));
    const pl = el.querySelector('[data-portalleft]');
    if (pl) A.set(pl, 'text', A.fmtTime(M.portalWait(S, now)));
  }
  $('#worldExtra').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const S = st();
    if (b.dataset.corrupt != null) setCorrupt(Number(b.dataset.corrupt));
    else if (b.dataset.portal) {
      const ev = M.EV[b.dataset.portal];
      A.confirmAsk(`Replay ${ev.name}?`, `${ev.desc} The portal stays open for an hour, then needs 20 hours to recharge.`, 'Open the portal', () => {
        if (!M.openPortal(S, ev.id)) return;
        A.save(); eventTick(); A.render(true);
      });
    } else if (b.id === 'wipeBtn') {
      const pending = M.canRollback(S) ? GH.runGain(S, S.conquered) : 0, ra = M.raGain(S, pending);
      A.confirmAsk('Wipe the server?', `This deletes all ${fmt(S.shards + pending)} corrupted data, every exploit and all ${fmt(S.meta.ep)} unspent exploit points, and starts a fresh run. You gain ${ra} root access (total ${S.meta.ra + ra}). Town, feats, relics, forms and logs stay. It can’t be undone.`, 'Wipe everything', () => {
        if (A.rollback({ transfer: true, wipe: true })) { GH.emit('wipe', ra); worldSig = ''; }
      });
    }
  });

  // ------------------------------------------------------------------ the return loop
  GH.on('bossSpawn', (e) => {
    const S = st();
    if (!e || S.meta.dayBoss === M.dayKey()) return;
    const t = Math.max(5, Math.round((A.D.bossTime + (e.extraTime || 0)) * (e.timeM || 1)));
    const base = e.intro || `Raid leader ${e.name} has entered ${GH.region(S.region).name}. Defeat them in ${t} seconds to take the region.`;
    e.intro = `${base} First leader today: ×5 loot!`;
  });
  GH.on('conquer', (r, first, e) => {
    const S = st();
    if (!e || !e.boss) return;
    const k = M.dayKey();
    if (S.meta.dayBoss === k) return;
    S.meta.dayBoss = k;
    const D = A.D, s = GH.stageOf(r, 9);
    const g = GH.goldAt(s) * GH.K.BOSS_GOLD * D.goldM * A.live().gold * 4;
    A.earn(g);
    A.gainXp(GH.xpAt(s) * GH.K.BOSS_XP * D.xpM * 4);
    setTimeout(() => A.sys(`First raid leader of the day: ×5 loot! +${fmt(g)} shinies. Back tomorrow for another.`, 'gold', 'daily'), 300);
    worldSig = '';
  });
  GH.on('away', (sec, rows) => {
    const S = st();
    const n = Town.expReady(S), out = (S.town.exp || []).length - n;
    if (n) rows.push(['Expeditions back', `${n} (Town › Hall)`]);
    if (out) rows.push(['Still exploring', `${out} part${out === 1 ? 'y' : 'ies'}`]);
  });
  function setBadge(n) {
    try {
      if (n > 0 && navigator.setAppBadge) navigator.setAppBadge(n).catch(() => {});
      else if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
    } catch (e) { /* not supported */ }
  }
  GH.on('hide', () => {
    const S = st(), f = GH.FORM[S.form];
    const evo = !f.final && S.level >= f.maxLv && f.children && f.children.length ? 1 : 0;
    setBadge((S.town.exp || []).length + evo);
  });
  GH.on('show', () => setBadge(0));

  // ------------------------------------------------------------------ hooks
  GH.on('init', (app) => { A = app; });
  GH.on('ready', () => {
    const S = st();
    if (!Array.isArray(S.leeches)) S.leeches = [];
    S.leeches = S.leeches.filter((l) => l && SLOTS[l.slot] && isFinite(l.store)).slice(0, 8);
    lastSeason = Town.season().id;
    eventTick(true);
    renderLeeches();
    renderSeasonChip();
    setBadge(0);
  });
  GH.on('render', (force) => {
    const S = st();
    if (S.tab === 'town' && S.town.unlocked) renderSeasonChip();
    if (S.tab === 'world' || force) renderWorldExtra(force);
  });
  GH.on('renderHall', (force) => renderHall(force));
  GH.on('sec', () => {
    seasonTick();
    eventTick(false);
    leechTick();
    renderLeeches();
  });
  GH.on('rollback', () => { leechSig = ''; worldSig = ''; hallSig = ''; renderLeeches(); });
  GH.on('tab', () => { worldSig = ''; hallSig = ''; });

  GH.World = { claim, spawnLeech, popLeech, setCorrupt, openRelics, renderHall, eventTick, hallOpen,
    // for testing from the console
    debug: { leech: () => spawnLeech(), finishExp() { for (const e of st().town.exp) e.end = Date.now() - 1; hallSig = ''; } } };
})();
