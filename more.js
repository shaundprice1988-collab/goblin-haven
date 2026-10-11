// Goblin Haven: screens for the systems on top of a run. Feats, exploits, the raid log, patch notes, bots and save transfer.
// app.js hands over its internal API on 'init' and calls back through GH.emit.
'use strict';
(function () {
  const GH = window.GH, Art = window.GHArt, M = GH.Meta;
  const $ = (s) => document.querySelector(s);
  let A = null;                       // the app's internal API
  const st = () => A.S;
  const ICON_TROPHY = (on) => `<svg class="trophy" viewBox="0 0 12 12" aria-hidden="true" shape-rendering="crispEdges"><path fill="${on ? '#F2C14E' : 'rgba(239,230,210,.25)'}" d="M2 1h8v1h2v3h-1v1h-1v1H8v1H7v1h1v1h1v2H3v-2h1V9h1V8H4V7H2V6H1V5H0V2h2zM1 3v1h1V3zm9 0v1h1V3z"/><path fill="${on ? '#B8862A' : 'rgba(239,230,210,.12)'}" d="M3 2h1v3H3zM4 10h4v1H4z"/></svg>`;

  // ------------------------------------------------------------------ helpers
  const fmt = (x, d) => A.fmt(x, d), esc = (s) => A.esc(s);
  function grantShadow(id) {
    const f = M.grant(st(), id);
    if (!f) return;
    A.sys(`Secret feat: ${f.name}!${f.title ? ` Title unlocked: “${f.title}”.` : ''}`, 'glitch', 'sfeat');
    A.buzz(40);
    GH.emit('feat', f);
    A.save();
    renderFeatDot();
  }
  function earnedCount() { return Object.keys(st().meta.feats).length; }

  // ------------------------------------------------------------------ feats
  function checkFeats(quiet) {
    const got = M.checkFeats(st());
    if (!got.length) return;
    A.derive();
    if (!quiet) {
      if (got.length > 2) A.sys(`${got.length} feats unlocked. Everything +${got.length * 2}%.`, 'gold', 'feat');
      else for (const f of got) A.sys(`Feat unlocked: ${f.name}. Everything +2%.${f.title ? ` Title: “${f.title}”.` : ''}`, 'gold', 'feat' + f.id);
      A.buzz(25);
      GH.emit('feat', got[0]);
    }
    renderFeatDot();
  }
  function renderFeatDot() {
    const d = $('#dotFeats');
    if (d) d.hidden = earnedCount() <= (st().meta.featSeen || 0);
    renderTitle();
  }
  function renderTitle() {
    const el = $('#ufTitle');
    if (!el) return;
    const t = M.titleOf(st());
    el.hidden = !t;
    A.set(el, 'text', t);
  }
  function openFeats() {
    const S = st();
    S.meta.featSeen = earnedCount();
    renderFeatDot();
    const normal = M.FEATS.filter((f) => !f.shadow);
    const n = M.featCount(S);
    const cats = [];
    for (const f of M.FEATS) if (!cats.includes(f.cat)) cats.push(f.cat);
    const ts = M.titles(S);
    const chips = ts.length ? `<div class="titles" role="group" aria-label="Title">
        <button type="button" class="chip" data-title="" aria-pressed="${!S.meta.title}">No title</button>
        ${ts.map((t) => `<button type="button" class="chip" data-title="${t.id}" aria-pressed="${S.meta.title === t.id}">${esc(t.title)}</button>`).join('')}
      </div>` : '<p class="muted small">Some feats come with a title to wear next to your name.</p>';
    let body = '';
    for (const c of cats) {
      const list = M.FEATS.filter((f) => f.cat === c);
      body += `<h3>${esc(c)}</h3><ul class="featlist">`;
      for (const f of list) {
        const got = M.hasFeat(S, f.id);
        if (f.shadow && !got) { body += `<li class="secret">${ICON_TROPHY(false)}<div><b>???</b><small>A secret feat. Keep poking around.</small></div></li>`; continue; }
        const p = M.featProgress(S, f);
        const tgt = f.shadow ? 0 : M.featTarget(f);
        const cur = f.shadow ? 0 : Math.max(0, Math.min(tgt, f.v(S) || 0));
        body += `<li class="${got ? 'got' : ''}">${ICON_TROPHY(got)}<div><b>${esc(f.name)}</b><small>${esc(f.desc)}${f.title ? ` <span class="ftitle">Title: ${esc(f.title)}</span>` : ''}</small>
          ${got ? '' : `<div class="fbar"><span style="width:${(p * 100).toFixed(1)}%"></span></div><small class="fnum">${fmt(cur)} / ${fmt(tgt)}</small>`}</div></li>`;
      }
      body += '</ul>';
    }
    $('#featDlg').innerHTML = `<div class="sys-title">Achievements</div><h2>Feats <span class="muted small">${n} of ${normal.length}</span></h2>
      <p class="muted">Each feat makes everything 2% stronger. Right now: <b class="gold">+${n * 2}%</b>.</p>
      ${chips}${body}
      <div class="dlg-actions sticky"><button type="button" class="primary" data-close>Close</button></div>`;
    A.openDlg($('#featDlg'));
  }

  // ------------------------------------------------------------------ exploit tree
  function exEffect(e, L) {
    const v = (k) => e.fx[k] * L;
    switch (e.id) {
      case 'dupe': return `Shinies +${fmt(v('gold') * 100)}%`;
      case 'bots': return `Warband +${fmt(v('warband') * 100)}%`;
      case 'farm': return `XP +${fmt(v('xp') * 100)}%`;
      case 'afk': return `Away +${fmt(v('offline') * 100)}%, +${v('offCapH')}h`;
      case 'seed': return `Seed money +${fmt(v('seed') * 100)}%`;
      case 'hitbox': return `Taps +${fmt(v('tap') * 100)}%`;
      case 'desync': return `Crit chance +${fmt(v('crit') * 100)}%`;
      case 'cdr': return `Tricks recharge ${fmt(v('cdr') * 100)}% faster`;
      case 'cheese': return `Raid leaders +${v('boss')}s`;
      case 'rally': return `Rally +${v('rally')}s, raid shinies +${fmt(v('raidGold') * 100)}%`;
      case 'hatch': return `Hatching +${fmt(v('hatch') * 100)}%`;
      case 'res': return `Gathering +${fmt(v('gather') * 100)}%`;
      case 'mood': return `Comfort +${fmt(v('comfort') * 100)}%`;
      case 'think': return `Ideas +${fmt(v('ideas') * 100)}%`;
      default: return '';
    }
  }
  function renderEx() {
    const S = st();
    const back = M.respecValue(S);
    let html = `<div class="sys-title">Exploits</div><h2>Exploit Tree</h2>
      <p class="muted">Every rollback gives you exploit points equal to the corrupted data it gives. Spending them never touches your corrupted data.</p>
      <div class="eppill"><span>Exploit points</span><b>${fmt(S.meta.ep)}</b></div>`;
    for (const br of M.BRANCHES) {
      html += `<h3 style="color:${br.color}">${esc(br.name)} <span class="muted small">${esc(br.blurb)}</span></h3><ul class="list exlist">`;
      for (const e of M.EXPLOITS.filter((x) => x.br === br.id)) {
        const L = M.exLvl(S, e.id), open = M.exOpen(S, e.id), max = L >= e.max;
        const cost = max ? 0 : M.exCost(e.id, L);
        const can = open && !max && S.meta.ep >= cost;
        const need = !open ? `Needs ${M.EX[e.req].name}.` : '';
        html += `<li class="row exnode ${open ? '' : 'locked'} ${e.req ? 'sub' : ''}"><div class="info">
            <div class="name">${esc(e.name)} <span class="lv">${L}/${e.max}</span></div>
            <div class="detail">${esc(e.per)}</div>
            <div class="next">${L ? 'Now: ' + esc(exEffect(e, L)) : esc(need || 'Not bought yet.')}</div></div>
          ${max ? '<div class="tcost">Maxed</div>' : `<button type="button" class="buy ${can ? 'can' : ''}" data-ex="${e.id}" ${can ? '' : 'disabled'}>
            <span class="fill" style="width:${open ? Math.min(100, (S.meta.ep / cost) * 100).toFixed(1) : 0}%"></span><span class="lbl">${L ? 'Level up' : 'Unlock'}</span><span class="cost">${fmt(cost)} EP</span></button>`}</li>`;
      }
      html += '</ul>';
    }
    html += `<div class="dlg-actions sticky">${back > 0 ? `<button type="button" class="secondary" data-respec>Refund ${fmt(back)}</button>` : ''}<button type="button" class="primary" data-close>Close</button></div>`;
    const dlg = $('#exDlg');
    const top = dlg.scrollTop;
    dlg.innerHTML = html;
    dlg.scrollTop = top;
  }
  function openEx() { renderEx(); A.openDlg($('#exDlg')); }
  $('#exDlg').addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.ex) {
      if (M.buyEx(st(), b.dataset.ex)) { A.derive(); A.buzz(15); A.save(); checkFeats(); renderEx(); A.render(true); }
    } else if (b.hasAttribute('data-respec')) {
      const back = M.respecValue(st());
      A.closeDlg($('#exDlg'));
      A.confirmAsk('Refund your exploits?', `All exploit levels reset and you get ${fmt(back)} exploit points back (75% of what you spent).`, 'Refund', () => {
        M.respec(st()); A.derive(); A.save(); A.render(true); openEx();
      }, () => openEx());
    }
  });

  // ------------------------------------------------------------------ raid log and patch notes (World tab)
  function openLog() {
    const S = st();
    const runs = S.meta.runs.slice().reverse();
    const fc = M.forecast(S);
    const rateOf = (r) => r.shards / Math.max(1, r.dur / 3600);
    const best = Math.max(1e-9, fc.bestRate, fc.rate);
    const row = (label, sub, rate, cls) => `<li class="${cls || ''}"><div class="rl-top"><b>${label}</b><span>${fmt(rate, true)}/h</span></div>
      <div class="rbar"><span style="width:${Math.max(2, Math.min(100, (rate / best) * 100)).toFixed(1)}%"></span></div><small>${sub}</small></li>`;
    let list = '';
    if (M.canRollback(S)) list += row('This run, so far', `${A.fmtTime(fc.dur)} · ${S.conquered} regions · +${fmt(fc.gain)} if you roll back now`, fc.rate, 'now');
    for (const r of runs) {
      const ch = r.ch ? ` · ${esc(M.CH[r.ch] ? M.CH[r.ch].name : r.ch)}` : '';
      list += row(`Run ${r.n}`, `${A.fmtTime(r.dur)} · ${r.regions} regions · +${fmt(r.shards)} data${ch}`, rateOf(r), fc.best === r ? 'best' : '');
    }
    const totalShards = S.meta.runs.reduce((a, r) => a + r.shards, 0);
    $('#logDlg').innerHTML = `<div class="sys-title">Damage meter</div><h2>Raid Log</h2>
      <p class="muted">Corrupted data per hour for each run. The longest bar is your best pace; when this run falls behind it, a rollback usually pays.</p>
      ${runs.length ? `<dl class="stats"><dt>Rollbacks</dt><dd>${fmt(S.rollbacks)}</dd><dt>Best pace</dt><dd>${fmt(fc.bestRate, true)}/h</dd><dt>Data from ${runs.length === 1 ? 'your last run' : `your last ${runs.length} runs`}</dt><dd>${fmt(totalShards)}</dd></dl>` : ''}
      ${list ? `<ol class="runlist">${list}</ol>` : '<p class="empty">Your first server rollback will show up here.</p>'}
      <div class="dlg-actions"><button type="button" class="primary" data-close>Close</button></div>`;
    A.openDlg($('#logDlg'));
  }
  let metaSig = '';
  function renderMetaBar() {
    const S = st();
    const el = $('#metaBar');
    const rb = S.rollbacks > 0 || S.conquered >= GH.ROLLBACK_AT;
    const nLogs = Object.keys(S.meta.logs).length;
    const hc = (S.rollbacks || 0) >= M.HARDCORE_AT;
    const show = rb || nLogs > 0;
    const nx = M.nextMilestone(S);
    const extra = [];                  // buttons other files add (world.js: the Relic Cache)
    GH.emit('metaBtns', extra, S);
    const sig = [show, S.meta.ep, S.rollbacks, S.meta.runs.length, nLogs, S.meta.logSeen, S.challenge, M.chCleared(S), S.won && !S.meta.ending, extra.join('')].join('|');
    if (sig === metaSig) return;
    metaSig = sig;
    el.hidden = !show;
    if (!show) return;
    const cheapest = M.EXPLOITS.filter((e) => M.exOpen(S, e.id) && M.exLvl(S, e.id) < e.max).reduce((a, e) => Math.min(a, M.exCost(e.id, M.exLvl(S, e.id))), Infinity);
    const hot = S.meta.ep >= cheapest;
    const notes = M.MILESTONES.map((m) => {
      const on = S.rollbacks >= m.n;
      const next = nx === m;
      return `<li class="${on ? 'on' : next ? 'next' : ''}"><span class="pv">${m.n}</span><div><b>Patch ${m.patch}: ${esc(m.title)}</b><small>${esc(m.gift)}</small>
        ${next ? `<small class="togo">${m.n - S.rollbacks} more rollback${m.n - S.rollbacks === 1 ? '' : 's'}</small>` : ''}</div></li>`;
    }).join('');
    const unread = nLogs > (S.meta.logSeen || 0) || (S.won && !S.meta.ending);
    const btns = [];
    if (rb) {
      btns.push(`<button type="button" class="metabtn ${hot ? 'hot' : ''}" id="openEx"><b>Exploit Tree</b><small>${fmt(S.meta.ep)} point${S.meta.ep === 1 ? '' : 's'} to spend</small></button>`);
      btns.push(`<button type="button" class="metabtn" id="openLog"><b>Raid Log</b><small>${S.meta.runs.length ? `${S.meta.runs.length} run${S.meta.runs.length === 1 ? '' : 's'}` : 'No runs yet'}</small></button>`);
    }
    if (nLogs) btns.push(`<button type="button" class="metabtn ${unread ? 'hot' : ''}" id="openData"><b>Data Logs</b><small>${unread ? (S.won && !S.meta.ending ? 'Choose an ending' : 'New data recovered') : `${nLogs} of ${M.LOGS.length} recovered`}</small></button>`);
    if (hc) btns.push(`<button type="button" class="metabtn ${S.challenge ? 'hot' : ''}" id="openHc"><b>Hardcore Servers</b><small>${S.challenge ? `On ${esc(M.CH[S.challenge].name)}` : `${M.chCleared(S)} of ${M.CHALLENGES.length} cleared`}</small></button>`);
    else if (rb) btns.push(`<div class="metabtn off"><b>Hardcore Servers</b><small>Open at ${M.HARDCORE_AT} rollbacks</small></div>`);
    btns.push(...extra);
    el.innerHTML = `<div class="metabar">${btns.join('')}</div>
      ${rb ? `<details class="patches"><summary>Patch notes <span class="muted">${nx ? `· next at ${nx.n} rollbacks` : '· all unlocked'}</span></summary>
        <p class="muted small">Each rollback is the Game Masters trying to patch you out. Every failed patch leaves you something.</p>
        <ol>${notes}</ol></details>` : ''}`;
  }
  $('#metaBar').addEventListener('click', (e) => {
    if (e.target.closest('#openEx')) openEx();
    else if (e.target.closest('#openLog')) openLog();
    else if (e.target.closest('#openData')) GH.emit('openData');
    else if (e.target.closest('#openHc')) GH.emit('openHardcore');
  });

  // ------------------------------------------------------------------ bots and bind slots
  function renderTools() {
    const S = st();
    const rt = $('#recruitTools');
    const r = M.ms(S, 'botRecruit');
    if (rt._on !== r) {
      rt._on = r;
      rt.innerHTML = r ? `<label class="setting inset botrow"><span>Auto-recruit bot<span class="muted small block">Buys whichever force adds the most damage per shiny.</span></span>
        <input type="checkbox" class="switch" id="botRecruit"></label>` : '';
    }
    const bR = $('#botRecruit');
    if (bR) bR.checked = !!S.meta.bots.recruit;
    const ut = $('#upTools');
    const u = M.ms(S, 'botUpgrade'), slots = M.bindSlots(S);
    const sig = [u, slots, S.meta.binds.join(','), Object.keys(S.ups).length].join('|');
    if (ut._sig !== sig) {
      ut._sig = sig;
      let h = '';
      if (u) h += `<label class="setting inset botrow"><span>Auto-upgrade bot<span class="muted small block">Buys the cheapest upgrade as soon as you can afford it.</span></span>
        <input type="checkbox" class="switch" id="botUpgrade"></label>`;
      if (slots) {
        const names = S.meta.binds.map((id) => (GH.UPGRADES.find((x) => x.id === id) || {}).name).filter(Boolean);
        h += `<div class="setting inset botrow"><div><div>Bind-on-Account <span class="muted small">${S.meta.binds.length}/${slots} slots</span></div>
          <div class="muted small">${names.length ? 'Kept through rollbacks: ' + esc(names.join(', ')) + '.' : 'Choose upgrades that stay bought through every rollback.'}</div></div>
          <button type="button" class="secondary small-btn" id="bindBtn">Choose</button></div>`;
      }
      ut.innerHTML = h;
    }
    const bU = $('#botUpgrade');
    if (bU) bU.checked = !!S.meta.bots.upgrade;
  }
  document.addEventListener('change', (e) => {
    if (!A) return;
    if (e.target.id === 'botRecruit') { st().meta.bots.recruit = e.target.checked; A.save(); }
    if (e.target.id === 'botUpgrade') { st().meta.bots.upgrade = e.target.checked; A.save(); }
    if (e.target.id === 'notationSel') { A.setNotation(e.target.value); A.save(); }
  });
  function openBind() {
    const S = st();
    const slots = M.bindSlots(S);
    const owned = GH.UPGRADES.filter((u) => S.ups[u.id]);
    const list = owned.length ? owned.map((u) => {
      const on = S.meta.binds.includes(u.id);
      return `<li class="row up-row"><div class="info"><div class="name">${esc(u.name)}</div><div class="detail">${esc(u.desc)}</div></div>
        <button type="button" class="${on ? 'primary' : 'secondary'} small-btn" data-bind="${u.id}" aria-pressed="${on}">${on ? 'Bound' : 'Bind'}</button></li>`;
    }).join('') : '<li class="empty">Buy some upgrades this run, then bind your favourites here.</li>';
    $('#pickDlg').innerHTML = `<div class="sys-title">Bind-on-Account</div><h2>Keep upgrades</h2>
      <p class="muted">Bound upgrades are already bought at the start of every run. You have ${slots} slot${slots === 1 ? '' : 's'}; binding another replaces the oldest.</p>
      <ul class="list">${list}</ul>
      <div class="dlg-actions sticky"><button type="button" class="primary" data-close>Done</button></div>`;
    A.openDlg($('#pickDlg'));
  }
  $('#upTools').addEventListener('click', (e) => { if (e.target.closest('#bindBtn')) openBind(); });
  $('#pickDlg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-bind]');
    if (!b) return;
    const S = st(), id = b.dataset.bind, slots = M.bindSlots(S);
    const i = S.meta.binds.indexOf(id);
    if (i >= 0) S.meta.binds.splice(i, 1);
    else { S.meta.binds.push(id); while (S.meta.binds.length > slots) S.meta.binds.shift(); }
    A.save();
    openBind();
    renderTools();
  });

  function botRecruit() {
    const S = st(), D = A.D;
    let n = 0;
    while (n < 25) {
      let best = -1, bestR = 0;
      for (let i = 0; i < GH.UNITS.length; i++) {
        if (!(i === 0 || S.owned[i] > 0 || S.owned[i - 1] > 0)) continue;
        if (GH.ask('blockRecruit', i)) continue;
        const own = S.owned[i];
        let gain = D.unitDps[i];
        if (GH.milestones(own + 1) > GH.milestones(own)) gain += D.unitDps[i] * (own + 1);
        const r = gain / GH.unitCost(i, own);
        if (r > bestR) { bestR = r; best = i; }
      }
      if (best < 0 || S.gold < GH.unitCost(best, S.owned[best])) break;
      if (!A.buyUnit(best, 1, true)) break;
      n++;
    }
  }
  function botUpgrade() {
    const S = st();
    const avail = GH.UPGRADES.filter((u) => !S.ups[u.id] && GH.reqMet(u.req, S) && S.gold >= u.cost);
    if (avail.length) A.buyUpgrade(avail[0], true);
  }
  function botRollback() {
    const S = st();
    if (!S.meta.bots.rollback || !M.ms(S, 'botRollback') || A.fight) return;
    const target = S.meta.bots.rollbackAt || Infinity;
    if (M.canRollback(S) && GH.runGain(S, S.conquered) >= target) {
      A.sys('Auto-rollback bot: target reached. Rolling back the server.', 'glitch', 'botrb');
      A.rollback();
    }
  }

  // ------------------------------------------------------------------ settings: name, numbers, character transfer
  function toB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function fromB64(b64) {
    const bin = atob(b64.replace(/\s+/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  const exportString = () => 'GOBLINHAVEN1:' + toB64(JSON.stringify(st()));
  function decodeImport(text) {
    const t = String(text || '').trim();
    if (!t) throw new Error('empty');
    const json = /^GOBLINHAVEN1:/.test(t) ? fromB64(t.slice(13)) : t;
    return { json, state: A.parseSave(json) };
  }
  function readBackup() {
    try { const b = JSON.parse(localStorage.getItem(A.BACKUP_KEY)); return b && b.data ? b : null; } catch (e) { return null; }
  }
  function writeBackup() {
    if (!st().introDone) return;
    try { localStorage.setItem(A.BACKUP_KEY, JSON.stringify({ at: Date.now(), data: JSON.stringify(st()) })); } catch (e) { /* full or blocked */ }
  }
  const ago = (t) => (t ? `${A.fmtTime((Date.now() - t) / 1000)} ago` : 'never');
  function fillMenu() {
    const S = st();
    const b = readBackup();
    $('#menuExtra').innerHTML = `<h3>Character</h3>
      <div class="setting"><div><div>Name</div><div class="muted small">${esc(S.name || 'Goblin')}${M.titleOf(S) ? `, ${esc(M.titleOf(S))}` : ''}</div></div>
        <button type="button" class="secondary small-btn" id="renameBtn">Rename</button></div>
      <label class="setting"><span>Big numbers</span><select id="notationSel" class="sel">
        <option value="letters">1.5M, 2.3B</option><option value="sci">1.5e6 (scientific)</option><option value="eng">1.5e6, 15e6 (engineering)</option></select></label>
      <h3>Character transfer</h3>
      <p class="muted small xfer-note">Your goblin lives only on this device. Export a save to keep it safe or move it to another phone. Last export: ${ago(S.meta.exportAt)}.</p>
      <div class="btnrow"><button type="button" class="secondary" id="exportBtn">Export save</button><button type="button" class="secondary" id="importBtn">Import save</button></div>
      <div class="setting"><div><div>Automatic backup</div><div class="muted small">${b ? `Taken ${ago(b.at)}.` : 'None yet.'} One is taken every 10 minutes and at each rollback.</div></div>
        <button type="button" class="secondary small-btn" id="restoreBtn" ${b ? '' : 'disabled'}>Restore</button></div>`;
    $('#notationSel').value = S.meta.notation || 'letters';
  }
  function openExport() {
    const code = exportString();
    st().meta.exportAt = Date.now();
    A.save();
    renderMenuDot();
    $('#xferDlg').innerHTML = `<div class="sys-title">Character transfer</div><h2>Export save</h2>
      <p class="muted">Copy this code or download it as a file. To restore, open Settings on any device, tap Import save and paste it in.</p>
      <textarea class="code" readonly id="xferCode" aria-label="Your save code">${esc(code)}</textarea>
      <div class="btnrow"><button type="button" class="secondary" id="copyCode">Copy</button><button type="button" class="secondary" id="dlCode">Download file</button></div>
      <p class="muted small" id="xferMsg" role="status"></p>
      <div class="dlg-actions"><button type="button" class="primary" data-close>Done</button></div>`;
    A.closeDlg($('#menuDlg'));
    A.openDlg($('#xferDlg'));
  }
  function openImport() {
    $('#xferDlg').innerHTML = `<div class="sys-title">Character transfer</div><h2>Import save</h2>
      <p class="muted">Paste a save code, or load a save file. This replaces the goblin on this device; a backup of it is kept first.</p>
      <textarea class="code" id="xferIn" aria-label="Save code" placeholder="GOBLINHAVEN1:…"></textarea>
      <div class="btnrow"><label class="secondary filebtn">Load file<input type="file" id="xferFile" accept=".txt,.json,text/plain,application/json" hidden></label></div>
      <p class="muted small err" id="xferMsg" role="status"></p>
      <div class="dlg-actions"><button type="button" class="secondary" data-close>Cancel</button><button type="button" class="primary" id="doImport">Import</button></div>`;
    A.closeDlg($('#menuDlg'));
    A.openDlg($('#xferDlg'));
  }
  function replaceWith(state, label) {
    writeBackup();
    A.closeDlg($('#xferDlg'));
    A.confirmAsk('Replace this goblin?', `${label} replaces the goblin on this device. Your current goblin is kept as the automatic backup until the next one is taken.`, 'Replace', () => {
      A.S = state;
      A.save();
      location.reload();
    });
  }
  $('#xferDlg').addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const msg = $('#xferMsg');
    if (b.id === 'copyCode') {
      const ta = $('#xferCode');
      try { await navigator.clipboard.writeText(ta.value); msg.textContent = 'Copied.'; }
      catch (err) { ta.select(); try { document.execCommand('copy'); msg.textContent = 'Copied.'; } catch (e2) { msg.textContent = 'Select the code and copy it by hand.'; } }
    } else if (b.id === 'dlCode') {
      const S = st();
      const blob = new Blob([$('#xferCode').value], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const day = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `goblin-haven-${(S.name || 'goblin').replace(/[^\w-]+/g, '_')}-${day}.txt`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      msg.textContent = 'Saved to your downloads.';
    } else if (b.id === 'doImport') {
      try {
        const { state } = decodeImport($('#xferIn').value);
        replaceWith(state, `${state.name || 'This goblin'} (${state.rollbacks || 0} rollbacks, ${state.bestRegionEver || 0} regions)`);
      } catch (err) { msg.textContent = 'That doesn’t look like a Goblin Haven save. Check you copied all of it.'; }
    }
  });
  $('#xferDlg').addEventListener('change', (e) => {
    if (e.target.id !== 'xferFile' || !e.target.files[0]) return;
    const r = new FileReader();
    r.onload = () => { $('#xferIn').value = String(r.result || ''); };
    r.readAsText(e.target.files[0]);
  });
  function openRename() {
    const S = st();
    $('#pickDlg').innerHTML = `<div class="sys-title">System</div><h2>Change name</h2>
      <p class="muted">Your character name, as other players see it.</p>
      <input class="namein" id="renameIn" maxlength="16" autocomplete="off" value="${esc(S.name || '')}" aria-label="Character name">
      <div class="dlg-actions"><button type="button" class="secondary" data-close>Cancel</button><button type="button" class="primary" id="renameOk">Save name</button></div>`;
    A.closeDlg($('#menuDlg'));
    A.openDlg($('#pickDlg'));
    setTimeout(() => { const i = $('#renameIn'); if (i) i.focus(); }, 50);
  }
  function commitRename() {
    const raw = ($('#renameIn').value || '');
    const v = raw.replace(/[^\p{L}\p{N} _.'/-]/gu, '').trim().slice(0, 16);
    if (!v) return;
    const S = st();
    S.name = v;
    A.closeDlg($('#pickDlg'));
    A.save();
    A.render(true);
    if (/(^|[^a-z])gm([_ ]|$)|^\/gm|aldric/i.test(v)) grantShadow('s_gm');
  }
  $('#pickDlg').addEventListener('click', (e) => { if (e.target.closest('#renameOk')) commitRename(); });
  $('#pickDlg').addEventListener('keydown', (e) => { if (e.target.id === 'renameIn' && e.key === 'Enter') commitRename(); });
  $('#menuExtra').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'exportBtn') openExport();
    else if (b.id === 'importBtn') openImport();
    else if (b.id === 'renameBtn') openRename();
    else if (b.id === 'restoreBtn') {
      const bk = readBackup();
      if (!bk) return;
      try { const state = A.parseSave(bk.data); A.closeDlg($('#menuDlg')); replaceWith(state, `The backup from ${ago(bk.at)}`); }
      catch (err) { A.sys('That backup is damaged and can’t be restored.', 'warn'); }
    }
  });
  function renderMenuDot() {
    const S = st();
    const stale = !S.meta.exportAt || Date.now() - S.meta.exportAt > 14 * 864e5;
    $('#dotMenu').hidden = !(S.rollbacks >= 1 && stale);
  }

  // close buttons in every sheet this file owns
  for (const id of ['#featDlg', '#exDlg', '#logDlg', '#xferDlg', '#pickDlg']) {
    $(id).addEventListener('click', (e) => { if (e.target.closest('[data-close]')) A.closeDlg($(id)); });
  }
  $('#featDlg').addEventListener('click', (e) => {
    const c = e.target.closest('[data-title]');
    if (!c) return;
    st().meta.title = c.dataset.title;
    A.save();
    renderTitle();
    openFeats();
  });
  $('#featBtn').addEventListener('click', openFeats);

  // ------------------------------------------------------------------ hooks
  let backupAcc = 0, botAcc = 0, pokes = [], fUntil = 0;
  GH.on('init', (app) => {
    A = app;
    const name = $('#ufName');
    if (name && !$('#ufTitle')) {
      const t = document.createElement('span');
      t.className = 'uf-title';
      t.id = 'ufTitle';
      t.hidden = true;
      name.after(t);
    }
  });
  GH.on('ready', () => {
    const S = st();
    // a save from before feats existed: hand them out quietly, then say so once
    if (S.introDone && !Object.keys(S.meta.feats).length && S.killsEver > 0) {
      const got = M.checkFeats(S);
      S.meta.featSeen = 0;
      if (got.length) { A.derive(); setTimeout(() => A.sys(`Your past deeds count: ${got.length} feats unlocked. Everything +${got.length * 2}%. Open them from the Hero tab.`, 'gold', 'feat'), 1500); }
    }
    renderFeatDot();
    renderMenuDot();
    renderTools();
    renderMetaBar();
  });
  GH.on('render', (force) => {
    if (st().tab === 'village' || st().tab === 'ups' || force) renderTools();
    if (st().tab === 'world' || force) renderMetaBar();
  });
  GH.on('tick', (dt) => {
    const S = st();
    botAcc += dt;
    if (botAcc >= 0.5) {
      botAcc = 0;
      if (S.meta.bots.recruit && M.ms(S, 'botRecruit')) botRecruit();
    }
  });
  GH.on('sec', () => {
    const S = st();
    if (S.meta.bots.upgrade && M.ms(S, 'botUpgrade')) botUpgrade();
    botRollback();
    checkFeats();
    if (Math.floor(S.gold) === 1337) grantShadow('s_leet');
    if (new Date().getHours() === 3) grantShadow('s_night');
    backupAcc++;
    if (backupAcc >= 600) { backupAcc = 0; writeBackup(); }
  });
  GH.on('menu', () => { fillMenu(); });
  GH.on('rollback', () => {
    writeBackup();
    metaSig = '';
    renderTools();
    renderMenuDot();
    const S = st();
    if (S.rollbacks === 1 && !S.meta.exportAt) setTimeout(() => A.sys('Tip: back up your goblin. Settings → Character transfer → Export save.', '', 'nag'), 6000);
  });
  GH.on('portraitTap', () => {
    const now = Date.now();
    pokes = pokes.filter((t) => now - t < 3000);
    pokes.push(now);
    if (pokes.length >= 10) { pokes = []; grantShadow('s_poke'); }
  });
  GH.on('rollbackCancel', (n) => { if (n >= 3) grantShadow('s_cold'); });
  GH.on('shadow', (id) => grantShadow(id));
  GH.on('logsSeen', () => { metaSig = ''; renderMetaBar(); });
  GH.on('conquer', () => {
    const last = A.chatEl.lastElementChild;
    if (last) { last.classList.add('pressf'); fUntil = Date.now() + 6000; }
  });
  document.querySelector('#chat').addEventListener('click', (e) => {
    if (!A || Date.now() > fUntil || !e.target.closest('.pressf')) return;
    fUntil = 0;
    A.chat(st().name || 'Goblin', 'F');
    grantShadow('s_f');
  });
  GH.on('buyUpgrade', () => { if (st().tab === 'ups') renderTools(); });
})();
