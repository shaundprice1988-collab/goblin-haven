// Goblin Haven: things that happen during a run. Dirty Tricks, raid parties, mythic leaders, whales,
// world chat and whispers, recovered data logs, the ending, and Hardcore Servers.
// app.js hands over its internal API on 'init' and calls back through GH.emit / GH.ask.
'use strict';
(function () {
  const GH = window.GH, Art = window.GHArt, M = GH.Meta;
  const $ = (s) => document.querySelector(s);
  let A = null;
  const st = () => A.S;
  const fmt = (x, d) => A.fmt(x, d), esc = (s) => A.esc(s);
  const fillName = (t) => t.replace(/\{name\}/g, st().name || 'Goblin');
  const para = (t) => esc(fillName(t)).replace(/\n/g, '<br>');

  // ------------------------------------------------------------------ pixel icons (12×12 grids)
  const ICONS = {
    gank: ['..........W.', '.........WW.', '........WW..', '.......WW...', '......WW....', '..G..WW.....', '...GWW......', '....G.......', '...B.G......', '..B.........', '.B..........', '............'],
    ninja: ['............', '.....BB.....', '....GGGG....', '.....BB.....', '....BBBB....', '...BBBBBB...', '..BBBYYBBB..', '..BBYBBBBB..', '..BBBYYBBB..', '..BBBBBYBB..', '...BYYBBB...', '............'],
    zerg: ['............', '............', 'a...b...c...', 'aa..bb..cc..', '.aa..bb..cc.', '..aa..bb..cc', '.aa..bb..cc.', 'aa..bb..cc..', 'a...b...c...', '............', '............', '............'],
    macro: ['............', '..K...Y..Y..', '..KK.....Y..', '..KWK..Y....', '..KWWK......', '..KWWWK.....', '..KWWWWK....', '..KWWKKK....', '..KKKWK.....', '.....KWK....', '......KK....', '............'],
  };
  const ICOL = { W: '#E6ECF2', G: '#C9A04E', B: '#8B6A40', Y: '#F2C14E', K: '#1C1814', a: '#5E8A3A', b: '#7FA650', c: '#B6E07A' };
  function iconSVG(id) {
    let r = '';
    ICONS[id].forEach((row, y) => [...row].forEach((ch, x) => { if (ICOL[ch]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${ICOL[ch]}"/>`; }));
    return `<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
  }

  // ------------------------------------------------------------------ dirty tricks
  const blockedTrick = (S, id) => (S.challenge === 'pacifist' && (id === 'gank' || id === 'macro') ? 'Pacifist: no Gank or Macro on this server.' : null);
  function shadow(id) { GH.emit('shadow', id); }
  function cast(id, auto) {
    const S = st(), now = Date.now(), pnow = performance.now();
    const block = blockedTrick(S, id);
    if (block) { if (!auto) A.sys(block, 'warn', 'block'); return false; }
    const e = A.enemy;
    const target = e && !e.dead && A.scene.enemyArrived(pnow);
    if (id === 'gank' && !target) { if (!auto) A.sys('Nobody to gank yet. Wait for an adventurer to arrive.', '', 'trick'); return false; }
    if (!M.castTrick(S, id, now)) return false;
    GH.emit('trick', id, auto);
    if (id === 'gank') {
      const dmg = 30 * A.dpsNow() + 10 * A.tapBase();
      const whale = e.whale;
      A.scene.heroAttack();
      A.hitEnemy(dmg, true, 'GANK ' + fmt(dmg, true), pnow);
      if (whale && e.dead) shadow('s_ks');
    } else if (!auto) A.scene.float(`${M.TRICK[id].name}!`, id === 'ninja' ? '#F2C14E' : '#B6E07A', true);
    if (!auto) A.buzz(30);
    renderBar(true);
    return true;
  }

  // the bar of trick buttons in the bottom-right corner of the battle
  let barSig = '', btns = {};
  function renderBar(force) {
    const S = st(), bar = $('#trickBar');
    const open = M.TRICKS.filter((t) => M.trickOpen(S, t.id));
    const sig = open.map((t) => t.id).join(',') + '|' + S.introDone;
    if (sig !== barSig) {
      barSig = sig;
      bar.innerHTML = open.map((t) => `<button type="button" class="trick" data-trick="${t.id}" aria-label="${esc(t.name)}">${iconSVG(t.id)}<span class="tcd"></span><b class="tnum"></b></button>`).join('');
      btns = {};
      bar.querySelectorAll('.trick').forEach((b) => { btns[b.dataset.trick] = { b, num: b.querySelector('.tnum'), cd: b.querySelector('.tcd'), p: -1 }; });
      bar.hidden = !open.length || !S.introDone;
      $('#scene').style.setProperty('--tricks', String(open.length));
      A.setClass($('#scene'), 'has-tricks', open.length > 0 && S.introDone);
    }
    if (bar.hidden) return;
    const now = Date.now();
    for (const t of open) {
      const r = btns[t.id];
      if (!r) continue;
      const s = M.trickState(S, t.id, now);
      const blocked = !!blockedTrick(S, t.id);
      const p = s.active ? 0 : s.ready ? 0 : Math.min(1, s.cdLeft / s.cd);
      const pr = Math.round(p * 100) / 100;
      if (pr !== r.p) { r.p = pr; r.cd.style.setProperty('--p', String(pr)); }
      A.setClass(r.b, 'active', s.active);
      A.setClass(r.b, 'ready', s.ready && !s.active && !blocked);
      A.setClass(r.b, 'blocked', blocked);
      A.set(r.num, 'text', s.active ? String(Math.ceil(s.activeLeft)) : s.ready ? '' : String(Math.ceil(s.cdLeft)));
      const label = `${t.name}. ${s.active ? `Active, ${Math.ceil(s.activeLeft)} seconds left.` : s.ready ? (blocked ? 'Not on this server.' : 'Ready.') : `Ready in ${Math.ceil(s.cdLeft)} seconds.`}`;
      if (r.b._l !== label) { r.b._l = label; r.b.setAttribute('aria-label', label); }
    }
  }
  $('#trickBar').addEventListener('pointerdown', (e) => { e.stopPropagation(); });
  $('#trickBar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-trick]');
    if (b) cast(b.dataset.trick, false);
  });

  // the Dirty Tricks window in the Hero tab
  let boxSig = '';
  function renderBox(force) {
    const S = st(), box = $('#trickBox');
    const anyOpen = M.TRICKS.some((t) => M.trickOpen(S, t.id));
    const sig = [anyOpen, M.TRICKS.map((t) => (M.trickOpen(S, t.id) ? 1 : 0) + ':' + M.trickCd(S, t.id)).join(','), M.ms(S, 'botTricks'), S.meta.bots.tricks, S.challenge].join('|');
    if (sig === boxSig && !force) return;
    boxSig = sig;
    box.hidden = !anyOpen;
    if (!anyOpen) return;
    const rows = M.TRICKS.map((t) => {
      const open = M.trickOpen(S, t.id);
      const blocked = blockedTrick(S, t.id);
      return `<li class="${open ? '' : 'locked'}"><span class="ticon">${open ? iconSVG(t.id) : ''}</span><div><b>${open ? esc(t.name) : '???'}</b>
        ${open ? `<span class="muted small"> · ${dur(t)}${fmtSec(M.trickCd(S, t.id))} cooldown</span>` : ''}
        <small>${open ? esc(t.desc) : `Unlocks when you ${esc(t.need.charAt(0).toLowerCase() + t.need.slice(1))}.`}${blocked ? ` <span class="warn">${esc(blocked)}</span>` : ''}</small></div></li>`;
    }).join('');
    const auto = M.ms(S, 'botTricks') ? `<label class="setting inset botrow"><span>Autocast bot<span class="muted small block">Casts each trick when it’s ready, and saves Gank for raids, leaders and whales. Cooldowns are 50% longer while it’s on.</span></span>
      <input type="checkbox" class="switch" id="botTricks" ${S.meta.bots.tricks ? 'checked' : ''}></label>` : '';
    box.innerHTML = `<h3>Dirty Tricks</h3><p class="muted small" style="margin:0 0 8px">Tap the buttons in the bottom-right corner of the battle.</p><ul class="tricklist">${rows}</ul>${auto}`;
  }
  const fmtSec = (s) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);
  const dur = (t) => (t.dur ? `${t.dur}s, ` : '');
  $('#trickBox').addEventListener('change', (e) => {
    if (e.target.id === 'botTricks') { st().meta.bots.tricks = e.target.checked; A.save(); renderBox(true); }
  });

  function autocastTick() {
    const S = st();
    if (!M.autocast(S) || !S.introDone) return;
    const e = A.enemy;
    if (!e || e.dead || !A.scene.enemyArrived(performance.now())) return;
    for (const t of M.TRICKS) {
      if (!M.trickOpen(S, t.id) || blockedTrick(S, t.id) || !M.trickState(S, t.id).ready) continue;
      if (t.id === 'gank' && !(A.fight || e.special)) continue;
      if (cast(t.id, true)) return;      // one trick per second, so they don't all go off together
    }
  }

  // ------------------------------------------------------------------ raid parties
  GH.on('raidSpawn', (e) => {
    const S = st(), p = M.pickParty(S, Math.random);
    e.party = p.id;
    if (p.hp) { e.hp *= p.hp; e.maxHp = e.hp; }
    e.goldM = p.gold || 1; e.extraTime = p.extra || 0; e.timeM = p.timeM || 1;
    e.rallyM = p.rallyM || 2; e.rallyBonus = p.rally || 0; e.stealM = p.steal || 1;
    if (p.shout) e.shout = A.pick(p.shout);
    if (p.guild) { e.guild = p.guild; e.name = p.guild; }
    if (p.id === 'stream') { e.guild = 'TTV_' + A.randomName(Math.random).replace(/[^\w]/g, '').slice(0, 14); e.name = e.guild; }
    if (p.id === 'bots' && e.looks) { e.looks = [e.looks[0], e.looks[0], e.looks[0]]; e.look = e.looks[0]; }
    if (p.id !== 'guild') A.sys(`${p.name}! ${p.blurb}`, 'warn', 'party');
  });
  GH.on('raidWon', (e) => { if (e && e.party) st().meta.c.parties[e.party] = 1; });

  // ------------------------------------------------------------------ mythic raid leaders
  let mythicFailed = false;
  GH.on('bossSpawn', (e) => {
    const S = st(), r = S.region;
    if (r < M.MYTHIC_FROM) return;
    const guaranteed = !S.meta.c.mythicSeen;
    if (!guaranteed && (mythicFailed || Math.random() >= 0.2)) { mythicFailed = false; return; }
    mythicFailed = false;
    S.meta.c.mythicSeen = 1;
    const n = M.mythicShards(r);
    e.mythic = n;
    e.hp *= 2; e.maxHp = e.hp;
    e.extraTime = 5;
    e.nameColor = '#FF9F40'; e.outline = 'rgba(255,159,64,0.95)'; e.ring = 'rgba(255,159,64,0.35)';
    e.guild = `Mythic · ${e.guild}`;
    const t = Math.max(5, Math.round(A.D.bossTime + 5));
    e.intro = `Mythic raid leader! ${e.name} came back on mythic difficulty: twice the health, carrying ${n} corrupted data. Beat them in ${t} seconds.`;
    e.line = 'Mythic difficulty. No carries, goblin.';
  });
  GH.on('bossFail', (e) => {
    if (e && e.mythic) { mythicFailed = true; setTimeout(() => A.sys('Mythic leaders don’t wait around. Next time it’ll be the normal version.', '', 'myth'), 400); }
  });

  // ------------------------------------------------------------------ whales: rich players who flee
  const WHALES = ['xX_CashShop_Xx', 'WhaleBoi_$$$', 'PayToWin_Pete', 'MountCollector', 'PremiumPaladin', 'BoughtThisAccount', 'GemSpender9000', 'LootBoxLarry'];
  const WHALE_HI = ['lol goblins. watch this gear', 'just bought the 200 dollar sword, testing it', 'why is everyone here so poor', 'my cosmetics cost more than your village'];
  const WHALE_WIN = ['I PAID FOR THIS GEAR', 'refund!! REFUND!!', 'reporting this goblin to support', 'my wallet…'];
  const WHALE_BYE = ['lol bye poors', 'hearthed. ez', '*poof*', 'not today, goblin'];
  let whaleAt = Date.now() + 120e3;      // none in the first two minutes after opening the app
  let forceWhale = false;
  const WHALE_SEC = 6;
  GH.on('spawnSpecial', (now) => {
    const S = st();
    if (!forceWhale && (S.conquered < 2 || Date.now() < whaleAt || A.fight || Math.random() >= 0.03)) return null;
    forceWhale = false;
    whaleAt = Date.now() + 180e3;
    const s = GH.stageOf(S.region, S.threat);
    const seed = (Math.random() * 1e9) | 0;
    const look = Object.assign(Art.adventurerLook('cleric', seed, false), { robe: '#E8B43A', trim: '#FFF3B0', hat: 'crown', glow: '#FFE08A', weapon: 'staff', orb: '#FFE08A' });
    const hp = GH.hp(s) * 8 * A.D.hpM;
    const e = { name: A.pick(WHALES), guild: 'Cash Shop VIP', cls: 'cleric', level: s + 5, hp, maxHp: hp, born: now, walk: 0.45, look, stage: s,
      special: 'whale', whale: true, nameColor: '#FFE08A', outline: 'rgba(255,224,138,0.9)', ring: 'rgba(255,224,138,0.3)' };
    A.setFight({ kind: 'escape', end: now + e.walk * 1000 + WHALE_SEC * 1000, dur: WHALE_SEC, label: `${e.name} is casting Hearthstone…` });
    A.chat(e.name, A.pick(WHALE_HI));
    A.sys(`A whale! ${e.name} is dripping with premium loot. Take them down before their Hearthstone finishes.`, 'gold', 'whale');
    GH.emit('whaleSpawn', e);
    return e;
  });
  GH.on('specialKill', (e) => {
    if (!e || !e.whale) return;
    const S = st(), D = A.D;
    const g = GH.goldAt(e.stage) * 120 * D.goldM * A.live().gold;
    A.earn(g);
    A.gainXp(GH.xpAt(e.stage) * 20 * D.xpM);
    S.kills++; S.killsEver++;
    S.meta.c.whales = (S.meta.c.whales || 0) + 1;
    A.scene.float('+' + fmt(g), '#FFE08A', true);
    A.chat(e.name, A.pick(WHALE_WIN));
    A.sys(`Whale down! ${e.name} dropped ${fmt(g)} shinies.`, 'gold', 'whale');
    GH.emit('whale', e, g);
  });
  GH.on('fightFailed', (e, kind) => {
    if (kind !== 'escape' || !e || !e.whale) return;
    A.chat(e.name, A.pick(WHALE_BYE));
    A.sys(`${e.name} hearthed out with the loot.${M.trickOpen(st(), 'gank') ? ' Save a Gank for the next whale.' : ''}`, '', 'whale');
  });

  // ------------------------------------------------------------------ world chat and whispers
  const WORLD = [
    () => 'anyone else notice the mudhollow goblins hit way harder now?',
    () => 'WTS [Goblin Ear] x200, pst',
    () => 'WTB [Goblin Ear]. why are there NONE on the auction house',
    (S, R) => `LFG ${R.name}, need 2 dps and a healer`,
    (S, R) => `${R.boss} is camping ${R.name} again`,
    () => 'GMs say the goblin thing is a “limited-time event”',
    () => 'is the server rolling back again or is it just me',
    () => 'patch notes say “fixed goblin aggro”. they did not fix goblin aggro',
    () => 'my guild got wiped by a goblin village. a VILLAGE',
    () => 'does anyone know what actually happened on launch night?',
    () => 'free goblin xp in mudhollow. wait no. NOT free. not free at all',
    () => 'i swear one of the goblins had a nameplate',
    () => 'gm pls respond',
    (S) => `${S.name || 'that goblin'} isn’t a real player name right? it’s a mob??`,
    () => 'mudhollow is a no-go zone now, reroute your farming',
    () => 'selling boosts through Whisperwood, goblin-free guaranteed*',
    () => 'speedrunners keep dying at the goblin camp lmao',
    () => 'whoever keeps buying up the goblin ears, i will find you',
    () => 'reminder: guild raid tonight, bring fire resist',
    () => 'imagine getting looted by a goblin. couldn’t be me. (it was me)',
    () => 'pls tell me goblins can’t evolve. pls',
    (S) => (S.conquered >= 2 ? `the goblins took ${GH.region(S.conquered - 1).name}?? since when` : 'starter zone is cursed, don’t go'),
    (S) => (S.won ? 'why is the server called Goblin Haven now. who approved this' : 'heard the admins are scared of a single mob lol'),
    (S) => (S.rollbacks ? `that’s ${S.rollbacks} rollback${S.rollbacks === 1 ? '' : 's'} this week. my gear keeps vanishing` : 'rollback rumours again. anyone?'),
  ];
  const GIFT_LINES = ['found these in the loot tables. take them, quick', 'the GMs won’t miss these', 'here. for the village'];
  let chatAt = Date.now() + 15e3, whisperOpen = null;
  function worldChat() {
    const S = st();
    if (!S.introDone || document.hidden) return;
    chatAt = Date.now() + 20e3 + Math.random() * 20e3;
    if (S.conquered >= 1 && Math.random() < 0.05) { whisper(); return; }
    const R = GH.region(S.region);
    A.chat('[World] ' + A.randomName(Math.random), A.pick(WORLD)(S, R), 'world');
  }
  function whisper() {
    const S = st();
    const next = M.nextWhisper(S);
    const d = A.chat('[Whisper] QA_Tester_4', next ? 'psst. tap here. quick.' : A.pick(GIFT_LINES) + ' (tap)', 'whisper');
    whisperOpen = { d, log: next ? next.id : null };
    chatAt = Date.now() + 25e3;     // keep the channel quiet so it can be read
    GH.emit('whisper');
  }
  $('#chat').addEventListener('click', (e) => {
    const w = e.target.closest('.whisper');
    if (!w || !whisperOpen || whisperOpen.d !== w) return;
    const S = st(), o = whisperOpen;
    whisperOpen = null;
    w.remove();
    S.meta.c.whispers = (S.meta.c.whispers || 0) + 1;
    if (o.log) {
      const L = M.addLog(S, o.log);
      if (L) { A.save(); openStory(L.title, para(L.text), 'Recovered data log'); }
    } else {
      const g = GH.goldAt(GH.stageOf(S.region, S.threat)) * 40 * A.D.goldM;
      A.earn(g);
      A.scene.float('+' + fmt(g), '#FF4F8B', true);
      A.sys(`QA_Tester_4 slipped you ${fmt(g)} shinies.`, 'glitch', 'gift');
    }
    A.buzz(25);
  });

  // ------------------------------------------------------------------ recovered data logs
  function grantRegionLogs(quiet) {
    const S = st();
    let got = null;
    for (let r = 0; r < Math.min(S.bestRegionEver || 0, 12); r++) { const L = M.addLog(S, 'r' + r); if (L) got = L; }
    if (got && !quiet) A.sys(`Recovered data: ${got.title}. Read it in the World tab.`, 'glitch', 'log');
  }
  function openData() {
    const S = st();
    S.meta.logSeen = Object.keys(S.meta.logs).length;
    GH.emit('logsSeen');
    const groups = [['region', 'Recovered from the world'], ['whisper', 'Whispers'], ['ending', 'Endings']];
    let body = '';
    for (const [src, title] of groups) {
      const list = M.LOGS.filter((l) => l.src === src);
      const found = list.filter((l) => S.meta.logs[l.id]).length;
      if (src !== 'region' && !found) {
        body += `<h3>${title} <span class="muted small">0 of ${list.length}</span></h3><p class="muted small">${src === 'whisper' ? 'Someone in world chat is trying to reach you. Watch for a whisper.'
          : S.won ? 'You beat the Game Master, but never touched the console.' : 'Defeat the Game Master to choose an ending.'}</p>${src === 'ending' && S.won ? '<button type="button" class="glitchbtn small" data-console>Open the console</button>' : ''}`;
        continue;
      }
      body += `<h3>${title} <span class="muted small">${found} of ${list.length}</span></h3><ol class="loglist">`;
      list.forEach((l, k) => {
        if (S.meta.logs[l.id]) body += `<li><details><summary><b>${esc(l.title)}</b></summary><p class="logtext">${para(l.text)}</p></details></li>`;
        else body += `<li class="locked"><b>${src === 'region' ? `Corrupted sector ${k + 1}` : '???'}</b><small>${src === 'region' ? `Conquer ${esc(GH.region(k).name)} to recover it.` : 'Not found yet.'}</small></li>`;
      });
      body += '</ol>';
    }
    $('#dataDlg').innerHTML = `<div class="sys-title">Recovered data</div><h2>Data Logs <span class="muted small">${Object.keys(S.meta.logs).length} of ${M.LOGS.length}</span></h2>
      <p class="muted">Files that survived the rollbacks. Tap one to read it.</p>${body}
      <div class="dlg-actions sticky"><button type="button" class="primary" data-close>Close</button></div>`;
    A.openDlg($('#dataDlg'));
  }
  $('#dataDlg').addEventListener('click', (e) => { if (e.target.closest('[data-console]')) { A.closeDlg($('#dataDlg')); openEnding(); } });
  function openStory(title, html, kicker) {
    $('#storyDlg').innerHTML = `<div class="sys-title">${esc(kicker || 'System')}</div><h2 class="logtitle">${esc(title)}</h2><p class="logtext">${html}</p>
      <div class="dlg-actions"><button type="button" class="primary" data-close>Close</button></div>`;
    A.openDlg($('#storyDlg'));
  }

  // ------------------------------------------------------------------ the ending: what you do with the Game Master's console
  function openEnding() {
    const S = st();
    const lines = [
      ['System', `${GH.REGIONS[GH.FINAL_REGION].boss} has been defeated.`, ''],
      ['Sys█em', 'Emergency patch 6.6.6 deployed by unknown user.', 'glitch'],
      ['System', 'Root console unlocked. Awaiting one command.', 'gold'],
    ];
    const cur = S.meta.ending;
    const cards = M.ENDINGS.map((x) => `<button type="button" class="endcard ${cur === x.id ? 'on' : ''}" data-end="${x.id}">
        <b>${esc(x.name)}${cur === x.id ? ' <span class="chip-on">Current</span>' : S.meta.endings[x.id] ? ' <span class="chip-seen">Chosen before</span>' : ''}</b>
        <small>${esc(x.blurb)}</small><small class="perk">${esc(x.perk)}</small></button>`).join('');
    $('#storyDlg').innerHTML = `<div class="victory-body"><h2 style="margin:0">The world is yours</h2>
      ${lines.map(([t, m, k]) => `<div class="sysmsg ${k}"><span class="st">${t}</span>${esc(m)}</div>`).join('')}
      <p class="muted">${cur ? 'GM_Aldric’s console is open again. You can keep your choice or make a new one.' : 'GM_Aldric’s console is open in front of you. Root access, one command. What do you do?'}</p>
      <div class="endcards">${cards}</div>
      <p class="muted small">Your choice gives a lasting perk. You can choose again each time you defeat the Game Master${S.meta.ending ? '' : ', or later from Data Logs in the World tab'}.${S.town.unlocked && !GH.Town.has(S, 'haven') ? ' Back home, your tinkerers can now research the Haven Protocol.' : ''}</p></div>
      <div class="dlg-actions">${cur ? `<button type="button" class="primary" data-close>Keep “${esc(M.ENDINGS.find((x) => x.id === cur).name)}”</button>`
        : '<button type="button" class="secondary" data-close>Decide later</button>'}</div>`;
    A.openDlg($('#storyDlg'));
  }
  $('#storyDlg').addEventListener('click', (e) => {
    const c = e.target.closest('[data-end]');
    if (!c) return;
    const x = M.ENDINGS.find((y) => y.id === c.dataset.end);
    A.closeDlg($('#storyDlg'));
    A.confirmAsk(`${x.name}?`, `${x.perk} You can change your mind the next time you defeat the Game Master.`, 'Choose', () => chooseEnding(x.id), () => openEnding());
  });
  function chooseEnding(id) {
    const S = st();
    S.meta.ending = id;
    S.meta.endings[id] = S.meta.endings[id] || Date.now();
    const L = M.addLog(S, 'e_' + id) || M.LOG['e_' + id];
    A.derive();
    A.save();
    GH.emit('ending', id);
    openStory(L.title, para(L.text), 'Ending');
    A.render(true);
  }
  GH.on('victory', () => { setTimeout(openEnding, 0); return true; });
  GH.on('victoryAgain', () => true);

  // ------------------------------------------------------------------ hardcore servers
  const chOpen = (S) => (S.rollbacks || 0) >= M.HARDCORE_AT;
  GH.on('blockUpgrade', () => (st().challenge === 'ironman' ? 'Ironman: no upgrades on this server.' : null));
  GH.on('blockRecruit', () => (st().challenge === 'solo' ? 'Solo Queue: nobody will join your warband on this server.' : null));
  GH.on('tapScale', () => (st().challenge === 'pacifist' ? 0 : null));
  let paciAt = 0;
  GH.on('sceneTap', () => {
    if (st().challenge !== 'pacifist') return null;
    const now = Date.now();
    if (now - paciAt > 2500) { paciAt = now; A.scene.float('Pacifist: no tapping', '#9FD8FF'); }
    return true;
  });
  function chTime(S) { const c = M.CH[S.challenge]; return c && c.limit ? Math.max(0, c.limit - M.runSeconds(S)) : null; }
  const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function openHardcore() {
    const S = st();
    const can = M.canRollback(S);
    const gain = GH.runGain(S, S.conquered);
    const cards = M.CHALLENGES.map((c) => {
      const best = M.chBest(S, c.id), done = M.chDone(S, c.id), here = S.challenge === c.id;
      const status = here ? '<span class="chip-on">You’re here</span>' : done ? '<span class="chip-done">Cleared</span>' : best ? `<span class="chip-seen">Best ${best}</span>` : '';
      return `<li class="hcard ${here ? 'here' : ''}">
        <div class="hc-top"><b>${esc(c.name)}</b>${status}</div>
        <p>${esc(c.rule)}</p>
        <dl class="hc-dl"><dt>Goal</dt><dd>Conquer ${c.goal} regions${c.limit ? ` in ${c.limit / 60} minutes` : ''}${here ? ` · now ${S.conquered}` : ''}</dd>
          <dt>Clear reward</dt><dd class="${done ? 'got' : ''}">${done ? '✓ ' : ''}${esc(c.reward)}</dd>
          <dt>Best run</dt><dd>${esc(c.depth)}${best ? ` <span class="gold">Now: ${best} region${best === 1 ? '' : 's'}</span>` : ''}</dd></dl>
        ${here ? '<button type="button" class="secondary small-btn" data-leave>Leave this server</button>' : `<button type="button" class="glitchbtn small" data-enter="${c.id}">Enter</button>`}
      </li>`;
    }).join('');
    const where = S.challenge ? `You’re on the ${esc(M.CH[S.challenge].name)} server.${chTime(S) != null ? ` ${clock(chTime(S))} left.` : ''}` : 'You’re on the normal server.';
    $('#chDlg').innerHTML = `<div class="sys-title">Server select</div><h2>Hardcore Servers <span class="muted small">${M.chCleared(S)} of ${M.CHALLENGES.length} cleared</span></h2>
      <p class="muted">Challenge runs with harsh rules. They start from nothing: no seed money, no bound upgrades and no starter-zone skip. Clear one for a lasting reward, and push deeper for a bigger bonus.</p>
      <p class="hc-where">${where} ${can ? `Entering one now rolls the server back as usual, for +${fmt(gain)} corrupted data.` : 'You can’t roll back right now, so entering one is a transfer: this run resets and gives nothing.'}</p>
      <ul class="hclist">${cards}</ul>
      <div class="dlg-actions sticky"><button type="button" class="primary" data-close>Close</button></div>`;
    A.openDlg($('#chDlg'));
  }
  $('#chDlg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const S = st();
    if (b.dataset.enter) {
      const c = M.CH[b.dataset.enter];
      const can = M.canRollback(S), gain = GH.runGain(S, S.conquered);
      A.closeDlg($('#chDlg'));
      A.confirmAsk(`Enter ${c.name}?`, `${c.rule} Goal: conquer ${c.goal} regions${c.limit ? ` within ${c.limit / 60} minutes` : ''}. ${can ? `This rolls the server back first, for +${fmt(gain)} corrupted data.` : 'You can’t roll back yet, so this run resets and gives no corrupted data.'}`,
        can ? 'Roll back and enter' : 'Transfer', () => { A.rollback({ challenge: c.id, transfer: true }); }, () => openHardcore());
    } else if (b.hasAttribute('data-leave')) {
      A.closeDlg($('#chDlg'));
      A.confirmAsk('Leave this server?', 'The rules lift straight away and the rest of this run counts as a normal run. Your best result here is kept.', 'Leave', () => {
        S.challenge = null;
        A.derive(); A.save(); A.render(true);
        A.sys('You left the Hardcore Server. Normal rules from now on.', '', 'hc');
      }, () => openHardcore());
    }
  });
  function renderBadge() {
    const S = st(), el = $('#chBadge');
    const c = M.CH[S.challenge];
    el.hidden = !c || !S.introDone;
    if (!c) return;
    const t = chTime(S);
    const done = M.chDone(S, c.id) && S.conquered >= c.goal;
    A.set(el, 'html', `<b>${esc(c.name)}</b> ${done ? '✓ ' : ''}${S.conquered}/${c.goal}${t != null ? ` · ${clock(t)}` : ''}`);
  }
  $('#chBadge').addEventListener('click', openHardcore);
  function renderNotes() {
    const S = st();
    const up = $('#hcNoteUps'), vil = $('#hcNoteVillage');
    up.hidden = S.challenge !== 'ironman';
    vil.hidden = S.challenge !== 'solo';
    if (!up.hidden) A.set(up, 'text', 'Ironman server: upgrades are locked for this run.');
    if (!vil.hidden) A.set(vil, 'text', 'Solo Queue server: nobody will join your warband this run.');
  }

  // ------------------------------------------------------------------ hooks
  let macroAcc = 0;
  GH.on('init', (app) => { A = app; });
  GH.on('ready', () => {
    const S = st();
    grantRegionLogs(true);
    renderBar(true);
    renderBox(true);
    renderBadge();
    renderNotes();
    S.meta.trickSeen = Math.min(S.meta.trickSeen || 0, M.TRICKS.length);
    if (S.introDone && S.won && !S.meta.ending && !S.meta.endNag) {
      S.meta.endNag = 1;
      setTimeout(() => A.sys('The Game Master’s console is still open. Choose an ending from Data Logs in the World tab.', 'glitch', 'console'), 2500);
    }
  });
  GH.on('render', (force) => {
    renderBar(force);
    renderBadge();
    if (st().tab === 'hero' || force) renderBox(force);
    if (force) renderNotes();
  });
  GH.on('tab', () => renderNotes());
  GH.on('tick', (dt, now) => {
    const S = st();
    if (M.isOn(S, 'macro') && S.challenge !== 'pacifist') {
      macroAcc += dt * 8;
      while (macroAcc >= 1) { macroAcc -= 1; A.tap(now, true); }
    } else macroAcc = 0;
  });
  GH.on('sec', () => {
    const S = st();
    if (!S.introDone) return;
    // newly opened tricks
    const open = M.TRICKS.filter((t) => M.trickOpen(S, t.id));
    if (open.length > (S.meta.trickSeen || 0)) {
      const fresh = open.slice(S.meta.trickSeen || 0);
      S.meta.trickSeen = open.length;
      if (fresh.length === 1) A.sys(`New Dirty Trick: ${fresh[0].name}. ${fresh[0].desc} Its button is in the bottom-right corner of the battle.`, 'gold', 'newtrick');
      else A.sys(`New Dirty Tricks: ${fresh.map((t) => t.name).join(', ')}. Their buttons are in the bottom-right corner of the battle; the Hero tab explains each one.`, 'gold', 'newtrick');
      renderBar(true);
    }
    autocastTick();
    if (Date.now() >= chatAt) worldChat();
    // the speedrun clock
    const c = M.CH[S.challenge];
    if (c && c.limit) {
      const left = chTime(S);
      if (left <= 0) { S.challenge = null; A.derive(); A.sys(`Speedrun over: ${c.limit / 60} minutes are up. The rest of this run counts as a normal run.`, 'warn', 'hc'); A.render(true); }
      else if (left <= 300 && !S.speedWarned) { S.speedWarned = true; A.sys('Speedrun: 5 minutes left.', 'warn', 'hc'); }
    }
  });
  GH.on('conquer', (r, first, e) => {
    const S = st();
    if (e && e.mythic) {
      S.shards += e.mythic;
      S.meta.c.mythic = (S.meta.c.mythic || 0) + 1;
      A.derive();
      A.sys(`Mythic kill! ${e.name} dropped ${e.mythic} corrupted data. Everything is now ${fmt(S.shards * GH.shardPct(S) * 100)}% stronger.`, 'glitch', 'myth');
      GH.emit('mythicKill', e);
    }
    if (r < 12) { const L = M.addLog(S, 'r' + r); if (L) A.sys(`Recovered data: ${L.title}. Read it in the World tab.`, 'glitch', 'log'); }
    const res = M.chProgress(S);
    const c = M.CH[S.challenge];
    if (res === 'done') { A.derive(); A.sys(`Hardcore Server cleared: ${c.name}! ${c.reward}`, 'gold', 'hc'); GH.emit('hcClear', c.id); }
    else if (res === 'best' && S.conquered > 1) A.sys(`${c.name}: new best, ${S.conquered} regions.`, '', 'hcbest');
  });
  GH.on('openData', openData);
  GH.on('openHardcore', openHardcore);
  for (const id of ['#dataDlg', '#storyDlg', '#chDlg']) $(id).addEventListener('click', (e) => { if (e.target.closest('[data-close]')) A.closeDlg($(id)); });

  GH.Play = { cast, openData, openHardcore, openEnding, openStory, iconSVG, chOpen,
    // for testing from the console
    debug: { whale() { forceWhale = true; }, chat() { chatAt = 0; }, whisper }, };
})();
