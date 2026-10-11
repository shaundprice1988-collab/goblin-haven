// Goblin Haven: sound. Small synthesised effects and an optional chiptune loop, made with WebAudio.
// Both start switched off; Settings turns them on. Nothing is downloaded.
'use strict';
(function () {
  const GH = window.GH;
  let A = null, ctx = null, sfxBus = null, musicBus = null, noiseBuf = null;
  const prefs = () => (A && A.S.meta.sound) || { sfx: false, music: false };

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.14; musicBus.connect(master);
    }
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {});
    return ctx;
  }

  // ------------------------------------------------------------------ building blocks
  function tone(f, t0, len, type, vol, slideTo, bus) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + len);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t0); o.stop(t0 + len + 0.03);
  }
  function noise(t0, len, vol, fFrom, fTo, q) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = 'bandpass'; f.Q.value = q || 1;
    f.frequency.setValueAtTime(fFrom, t0);
    if (fTo) f.frequency.exponentialRampToValueAtTime(fTo, t0 + len);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t0); s.stop(t0 + len + 0.03);
  }
  function drum(t0, vol) {
    tone(140, t0, 0.22, 'sine', vol || 0.35, 45);
    noise(t0, 0.08, 0.12, 900, 200, 0.7);
  }
  // a war horn: two long brassy notes, the second a fifth higher
  function horn(t0) {
    [[98, 0, 0.6], [147, 0.55, 1.0]].forEach(([f, d, l]) => {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      const t = t0 + d;
      o.type = 'sawtooth'; o2.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 0.93, t); o.frequency.linearRampToValueAtTime(f, t + 0.12);
      o2.frequency.setValueAtTime(f * 0.93 * 1.004, t); o2.frequency.linearRampToValueAtTime(f * 1.004, t + 0.12);
      lp.type = 'lowpass'; lp.Q.value = 2;
      lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(1300, t + 0.25); lp.frequency.linearRampToValueAtTime(700, t + l);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.09);
      g.gain.setValueAtTime(0.2, t + l - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + l);
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(sfxBus);
      o.start(t); o2.start(t); o.stop(t + l + 0.05); o2.stop(t + l + 0.05);
    });
  }

  const SFX = {
    hit: (t) => tone(170 + Math.random() * 50, t, 0.05, 'square', 0.04, 85),
    crit: (t) => { noise(t, 0.1, 0.12, 2600, 500, 0.8); tone(540, t, 0.1, 'square', 0.06, 240); },
    kill: (t) => { tone(988, t, 0.06, 'triangle', 0.07); tone(1319, t + 0.055, 0.12, 'triangle', 0.07); },
    horn: (t) => { drum(t, 0.3); horn(t + 0.05); },
    boss: (t) => { drum(t); drum(t + 0.28); drum(t + 0.56, 0.45); tone(82, t + 0.56, 0.7, 'sawtooth', 0.06, 78); },
    fanfare: (t) => [523, 659, 784, 1047].forEach((f, k) => tone(f, t + k * 0.09, k === 3 ? 0.4 : 0.12, 'square', 0.055)),
    level: (t) => [392, 523, 659, 784].forEach((f, k) => tone(f, t + k * 0.055, 0.1, 'triangle', 0.07)),
    glitch: (t) => { for (let k = 0; k < 7; k++) tone(200 + Math.random() * 1400, t + k * 0.035, 0.05, 'square', 0.045); noise(t, 0.35, 0.08, 5000, 250, 0.6); },
    buy: (t) => tone(700, t, 0.05, 'triangle', 0.06, 900),
    feat: (t) => [784, 988, 1175, 1568].forEach((f, k) => tone(f, t + k * 0.07, k === 3 ? 0.35 : 0.1, 'triangle', 0.06)),
    trick: (t) => { noise(t, 0.28, 0.16, 350, 3200, 1.3); tone(330, t, 0.18, 'square', 0.03, 660); },
    cash: (t) => { noise(t, 0.04, 0.1, 6000); tone(1568, t, 0.07, 'square', 0.05); tone(2093, t + 0.065, 0.28, 'square', 0.05); },
    lose: (t) => [392, 330, 262].forEach((f, k) => tone(f, t + k * 0.15, 0.2, 'triangle', 0.07)),
    whisper: (t) => { tone(1100, t, 0.18, 'sine', 0.05, 1500); tone(1500, t + 0.14, 0.22, 'sine', 0.04, 1100); },
  };
  let lastHit = 0, autoN = 0;
  function play(name) {
    if (!prefs().sfx || document.hidden || !ensure() || ctx.state !== 'running') return;
    try { SFX[name](ctx.currentTime + 0.01); } catch (e) { /* ignore */ }
  }
  function hitSound(crit, auto) {
    if (auto && (autoN++ % 3)) return;        // the Macro bot taps a lot; play every third
    const now = performance.now();
    if (!crit && now - lastHit < 45) return;
    lastHit = now;
    play(crit ? 'crit' : 'hit');
  }

  // ------------------------------------------------------------------ music: a short chiptune loop in A minor
  const STEP = 60 / 104 / 2;    // eighth notes at 104 bpm
  const _ = null;
  const LEAD = [0, _, 3, 5, 7, _, 5, 3, 0, _, _, _, 10, 7, 5, _, 3, _, 5, 7, 3, _, 0, _, -2, _, 0, _, _, _, _, _,
    7, _, 10, 12, 10, _, 7, 5, 3, _, 5, _, 7, _, _, _, 12, 10, 7, _, 5, _, 3, 5, 0, _, _, _, _, _, _, _];
  const BASS = [0, _, 0, _, 0, _, 0, _, -4, _, -4, _, -4, _, -4, _, -7, _, -7, _, -7, _, -7, _, -5, _, -5, _, -2, _, -5, _];
  let musicTimer = 0, nextT = 0, step = 0;
  const hz = (base, semi) => base * Math.pow(2, semi / 12);
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    while (nextT < ctx.currentTime + 0.35) {
      const l = LEAD[step % LEAD.length], b = BASS[step % BASS.length];
      if (l != null) tone(hz(440, l), nextT, STEP * 1.6, 'triangle', 0.5, null, musicBus);
      if (b != null) tone(hz(110, b), nextT, STEP * 1.8, 'square', 0.22, null, musicBus);
      if (step % 4 === 0) { const t = nextT; tone(60, t, 0.09, 'sine', 0.35, 40, musicBus); }
      if (step % 4 === 2) noiseHat(nextT);
      nextT += STEP;
      step++;
    }
  }
  function noiseHat(t0) {
    if (!noiseBuf) return;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 7000;
    g.gain.setValueAtTime(0.12, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
    s.connect(f); f.connect(g); g.connect(musicBus);
    s.start(t0); s.stop(t0 + 0.06);
  }
  function startMusic() {
    if (musicTimer || !prefs().music || document.hidden || !ensure()) return;
    if (!noiseBuf) noise(ctx.currentTime, 0.01, 0.0001, 1000);   // builds the noise buffer
    nextT = ctx.currentTime + 0.1;
    musicTimer = setInterval(schedule, 100);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = 0; } }

  // ------------------------------------------------------------------ settings
  GH.on('menu', () => {
    const box = document.querySelector('#menuExtra');
    if (!box) return;
    const p = prefs();
    box.insertAdjacentHTML('afterbegin', `<h3>Sound</h3>
      <label class="setting"><span>Sound effects<span class="muted small block">Hits, loot, raid horns and fanfares.</span></span><input type="checkbox" class="switch" id="sfxToggle" ${p.sfx ? 'checked' : ''}></label>
      <label class="setting"><span>Music<span class="muted small block">A quiet chiptune loop.</span></span><input type="checkbox" class="switch" id="musicToggle" ${p.music ? 'checked' : ''}></label>`);
  });
  document.addEventListener('change', (e) => {
    if (!A) return;
    if (e.target.id === 'sfxToggle') { A.S.meta.sound.sfx = e.target.checked; A.save(); if (e.target.checked) { ensure(); setTimeout(() => play('kill'), 60); } }
    if (e.target.id === 'musicToggle') { A.S.meta.sound.music = e.target.checked; A.save(); if (e.target.checked) startMusic(); else stopMusic(); }
  });
  // browsers only allow audio after a tap, so start on the first one
  document.addEventListener('pointerdown', () => {
    if (!A) return;
    const p = prefs();
    if (p.sfx || p.music) ensure();
    if (p.music) startMusic();
  }, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { stopMusic(); ctx.suspend().catch(() => {}); }
    else if (prefs().sfx || prefs().music) { ctx.resume().then(() => startMusic()).catch(() => {}); }
  });

  // ------------------------------------------------------------------ what makes a sound
  GH.on('init', (app) => { A = app; });
  GH.on('tap', (dmg, crit, auto) => hitSound(crit, auto));
  let lastKill = 0;
  GH.on('kill', () => { const n = performance.now(); if (n - lastKill > 90) { lastKill = n; play('kill'); } });
  GH.on('raidSpawn', () => play('horn'));
  GH.on('bossSpawn', () => play('boss'));
  GH.on('conquer', () => play('fanfare'));
  GH.on('raidWon', () => { play('fanfare'); setTimeout(() => play('cash'), 380); });
  GH.on('raidLost', () => play('lose'));
  GH.on('bossFail', () => play('lose'));
  GH.on('levelUp', (lv, quiet) => { if (!quiet) play('level'); });
  GH.on('evolve', () => play('glitch'));
  GH.on('rollback', () => play('glitch'));
  GH.on('buyUnit', (i, k, quiet) => { if (!quiet) play('buy'); });
  GH.on('buyUpgrade', (u, quiet) => { if (!quiet) play('buy'); });
  GH.on('build', () => play('buy'));
  GH.on('research', () => play('feat'));
  GH.on('feast', () => play('fanfare'));
  GH.on('feat', () => play('feat'));
  GH.on('trick', () => play('trick'));
  GH.on('whaleSpawn', () => play('cash'));
  GH.on('whale', () => play('cash'));
  GH.on('whisper', () => play('whisper'));
  GH.on('mythicKill', () => setTimeout(() => play('glitch'), 450));
  GH.on('ending', () => play('feat'));
  let lastPop = 0;
  GH.on('leechPop', () => { const n = performance.now(); if (n - lastPop > 120) { lastPop = n; play('cash'); } });
  GH.on('relic', (r) => play(r && r.rarity && r.rarity.id >= 2 ? 'fanfare' : 'feat'));
  GH.on('expBack', () => play('cash'));
  GH.on('expSend', () => play('buy'));
  GH.on('edict', () => play('buy'));
  GH.on('corrupt', (v) => { if (v) play('glitch'); });

  GH.Sound = { play, startMusic, stopMusic };
})();
