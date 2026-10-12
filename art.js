// Goblin Haven: pixel art. Everything is drawn from code at low resolution and scaled up.
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------------ helpers
  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const shadeCache = {};
  function shade(hex, k) {
    const key = hex + k;
    if (shadeCache[key]) return shadeCache[key];
    const [r, g, b] = rgb(hex);
    const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return (shadeCache[key] = `rgb(${f(r)},${f(g)},${f(b)})`);
  }
  function px(g, x, y, w, h, c) {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }
  function line(g, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    g.fillStyle = c;
    for (let n = 0; n < 200; n++) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ------------------------------------------------------------------ the humanoid sprite
  // cx: centre x, fy: feet y. o: look options. a: { swing 0..1, bob 0/1, walk 0..1, flash }
  const WEAPON_LEN = { club: 0.45, sword: 0.55, spear: 0.85, staff: 0.85, greatsword: 0.75, greatclub: 0.72, axe: 0.55,
    greataxe: 0.72, dagger: 0.3, stick: 0.8, chain: 0.85, glaive: 0.85, morningstar: 0.6, mace: 0.5, claws: 0.2, bow: 0.6, none: 0, shovel: 0.6, skullstaff: 0.8 };

  function humanoid(g, cx, fy, o, a) {
    a = a || {};
    if (o.beast) return beast(g, cx, fy, o, a);
    const s = o.h;
    const f = o.facing || 1;
    const goblinoid = o.bigHead;
    const hh = Math.max(4, Math.round(s * (goblinoid ? 0.4 : 0.32)));
    const lh = Math.max(2, Math.round(s * (o.lanky ? 0.34 : 0.27)));
    const bh = Math.max(3, s - hh - lh);
    const bw = Math.max(3, Math.round(s * (o.lanky ? 0.3 : 0.36))) + (o.belly ? 2 : 0);
    const hw = Math.max(4, Math.round(s * (goblinoid ? 0.42 : 0.36)));
    const bob = a.bob || 0;
    const skin = a.flash ? '#FFFFFF' : o.skin;
    const skinD = a.flash ? '#FFFFFF' : shade(o.skin, -0.28);
    const bodyC = a.flash ? '#FFFFFF' : (o.robe || o.armor || o.fur || o.shirt || shade(o.skin, -0.35));
    const bodyD = a.flash ? '#FFFFFF' : shade(bodyC, -0.3);
    const legC = a.flash ? '#FFFFFF' : (o.robe ? o.robe : (o.fur || o.pants || '#4A3B2C'));
    const bx = Math.round(cx - bw / 2);
    const top = fy - lh - bh - hh - bob;

    // cape and wings sit behind everything
    if (o.cape) px(g, f > 0 ? bx - 1 : bx + bw - 1, fy - lh - bh - bob, 2, bh + lh - 1, a.flash ? '#FFF' : o.cape);
    if (o.wings) {
      const flap = Math.sin((a.t || 0) * 18) > 0 ? 1 : 0;
      const wx = f > 0 ? bx - 3 : bx + bw;
      px(g, wx, fy - lh - bh - bob - 1 - flap, 3, 2, o.wings);
      px(g, wx + (f > 0 ? -1 : 2), fy - lh - bh - bob - 2 - flap, 2, 1, o.wings);
    }

    // legs (alternate when walking)
    const lw = Math.max(1, Math.floor(bw / 2) - (bw > 4 ? 1 : 0));
    const step = a.walk ? (Math.sin(a.walk * TAU) > 0 ? 1 : 0) : 0;
    if (!o.robe) {
      px(g, bx, fy - lh, lw, lh - step, legC);
      px(g, bx + bw - lw, fy - lh, lw, lh - (1 - step) * (a.walk ? 1 : 0), shade(legC, -0.2));
      px(g, bx, fy - 1 - step, lw, 1, '#2A2018');
      px(g, bx + bw - lw, fy - 1, lw, 1, '#2A2018');
    } else {
      // robe flares down to the feet
      px(g, bx - 1, fy - lh - bob, bw + 2, lh + bob, bodyC);
      px(g, bx - 1, fy - 1, bw + 2, 1, bodyD);
    }

    // body
    const by = fy - lh - bh - bob;
    px(g, bx, by, bw, bh, bodyC);
    px(g, f > 0 ? bx : bx + bw - 1, by, 1, bh, bodyD);
    if (o.belly) px(g, f > 0 ? bx + bw - 1 : bx, by + Math.floor(bh * 0.35), 1, Math.ceil(bh * 0.5), shade(o.skin, 0.1));
    if (o.armor && !o.robe) px(g, bx, by + bh - 1, bw, 1, '#2A2420');
    if (o.trim) px(g, bx, by + bh - 1, bw, 1, o.trim);
    if (o.tabard) px(g, bx + Math.floor(bw / 2) - 1, by + 1, 2, bh - 1, o.tabard);
    if (o.pox) { px(g, bx + 1, by + 1, 1, 1, o.pox); px(g, bx + bw - 2, by + bh - 2, 1, 1, o.pox); }
    if (o.fur) { px(g, bx - 1, by, 1, 2, o.fur); px(g, bx + bw, by, 1, 2, o.fur); }

    // head
    const hx = Math.round(cx - hw / 2) + f;
    const hy = top;
    px(g, hx, hy, hw, hh, skin);
    px(g, f > 0 ? hx : hx + hw - 1, hy, 1, hh, skinD);
    if (o.fur) { px(g, hx - 1, hy + 1, 1, hh - 1, a.flash ? '#FFF' : o.fur); px(g, hx, hy - 1, hw, 1, a.flash ? '#FFF' : o.fur); }
    // ears
    if (o.ears) {
      const e = o.ears;
      const back = f > 0 ? hx - 1 : hx + hw;
      for (let k = 0; k < e; k++) px(g, back - f * k, hy + 1 - Math.floor(k / 2), 1, k === e - 1 ? 1 : 2, skin);
      if (goblinoid) px(g, f > 0 ? hx + hw : hx - 1, hy + 1, 1, 1, skinD);
    }
    // face
    const front = f > 0 ? hx + hw - 1 : hx;
    const ey = hy + Math.floor(hh * 0.4);
    const eyeC = o.glow || (goblinoid ? '#F5E663' : (o.eye || '#1C1814'));
    if (o.eyepatch) { px(g, hx, ey, hw, 1, '#1A1410'); px(g, front - f, ey, 1, 1, o.glow || '#FF4F4F'); }
    else { px(g, front - f, ey, 1, 1, eyeC); if (hw >= 6) px(g, front - 3 * f, ey, 1, 1, eyeC); }
    if (o.nose) px(g, f > 0 ? front + 1 : front - 2, ey + 1, 2, 1, skin);
    if (o.tusks) px(g, front - f, hy + hh - 1, 1, 1, '#F2EEDC');
    if (goblinoid && !o.tusks) px(g, front - 2 * f, hy + hh - 2, 2, 1, shade(o.skin, -0.45));
    if (!goblinoid && !o.hood && !o.hat && o.hair) px(g, hx, hy - 1, hw, 2, o.hair);

    // headgear
    if (o.hood) {
      px(g, hx - 1, hy - 1, hw + 2, 2, o.hood);
      px(g, f > 0 ? hx - 1 : hx + hw - 1, hy - 1, 2, hh + 1, o.hood);
      px(g, f > 0 ? hx - 2 : hx + hw, hy + 1, 1, hh - 1, shade(o.hood, -0.2));
    }
    if (o.horns === 1) { px(g, hx + 1, hy - 1, 1, 1, '#E8E0C8'); px(g, hx + hw - 2, hy - 1, 1, 1, '#E8E0C8'); }
    if (o.horns === 2) {
      px(g, hx, hy - 2, 1, 2, '#2A1A14'); px(g, hx - 1, hy - 3, 1, 1, '#2A1A14');
      px(g, hx + hw - 1, hy - 2, 1, 2, '#2A1A14'); px(g, hx + hw, hy - 3, 1, 1, '#2A1A14');
    }
    switch (o.hat) {
      case 'crown':
        px(g, hx, hy - 1, hw, 1, '#E8B43A');
        px(g, hx, hy - 2, 1, 1, '#E8B43A'); px(g, hx + Math.floor(hw / 2), hy - 2, 1, 1, '#E8B43A'); px(g, hx + hw - 1, hy - 2, 1, 1, '#E8B43A');
        break;
      case 'jester':
        px(g, hx, hy - 1, Math.ceil(hw / 2), 2, '#C0392B'); px(g, hx + Math.ceil(hw / 2), hy - 1, Math.floor(hw / 2), 2, '#7D3C98');
        px(g, f > 0 ? hx - 2 : hx + hw, hy - 2, 2, 1, '#C0392B'); px(g, f > 0 ? hx - 3 : hx + hw + 2, hy - 1, 1, 1, '#F1C40F');
        break;
      case 'plume':
        px(g, hx, hy - 1, hw, 2, '#8A8E96'); px(g, f > 0 ? hx - 1 : hx + hw - 1, hy - 3, 2, 2, '#C0392B'); px(g, f > 0 ? hx - 2 : hx + hw, hy - 4, 2, 1, '#C0392B');
        break;
      case 'helm':
        px(g, hx - 1, hy - 1, hw + 2, Math.ceil(hh * 0.45), o.helm || '#8A8E96'); px(g, front, hy, 1, Math.ceil(hh * 0.6), o.helm || '#8A8E96');
        break;
      case 'hornhelm':
        px(g, hx - 1, hy - 1, hw + 2, Math.ceil(hh * 0.4), '#3A3A40');
        px(g, hx - 2, hy - 3, 1, 3, '#E8E0C8'); px(g, hx + hw + 1, hy - 3, 1, 3, '#E8E0C8');
        break;
      case 'headdress':
        px(g, hx, hy - 1, hw, 1, '#B5651D'); px(g, hx + 1, hy - 3, 1, 2, '#E74C3C'); px(g, hx + 3, hy - 4, 1, 3, '#F1C40F'); px(g, hx + hw - 2, hy - 3, 1, 2, '#3498DB');
        break;
      case 'wizard': {
        const hc = o.hatColor || '#2E3F80';
        px(g, hx - 1, hy - 1, hw + 2, 1, hc); px(g, hx + 1, hy - 3, hw - 2, 2, hc); px(g, hx + 2 - f, hy - 5, 2, 2, hc); px(g, hx + 2 - 2 * f, hy - 6, 1, 1, hc);
        break;
      }
      case 'gm':
        px(g, hx - 1, hy - 1, hw + 2, 1, '#FFE08A'); px(g, hx, hy - 3, 1, 2, '#FFE08A'); px(g, hx + hw - 1, hy - 3, 1, 2, '#FFE08A'); px(g, hx + Math.floor(hw / 2), hy - 4, 1, 3, '#FFE08A');
        break;
      // event hats
      case 'party': {
        const c = hx + Math.floor(hw / 2);
        px(g, c - 2, hy - 1, 5, 1, '#FF4F8B'); px(g, c - 1, hy - 2, 3, 1, '#F2C14E'); px(g, c - 1, hy - 3, 2, 1, '#7FE0F5'); px(g, c, hy - 4, 1, 1, '#FF4F8B'); px(g, c, hy - 5, 1, 1, '#FFFFFF');
        break;
      }
      case 'pumpkin': {
        const ph = Math.ceil(hh * 0.6) + 1;
        px(g, hx - 1, hy - 2, hw + 2, ph, '#E8762A'); px(g, hx + 1, hy - 2, 1, ph, '#C85A1A'); px(g, hx + hw - 2, hy - 2, 1, ph, '#C85A1A');
        px(g, hx + Math.floor(hw / 2), hy - 3, 1, 1, '#4E7A3A'); px(g, front - f, hy, 1, 1, '#FFE08A'); if (hw >= 6) px(g, front - 3 * f, hy, 1, 1, '#FFE08A');
        break;
      }
      case 'santa': {
        const back = f > 0 ? hx - 2 : hx + hw;
        px(g, hx - 1, hy - 1, hw + 2, 1, '#F2EEDC'); px(g, hx, hy - 3, hw, 2, '#C0392B'); px(g, back, hy - 3, 2, 1, '#C0392B'); px(g, back + (f > 0 ? -1 : 2), hy - 2, 1, 1, '#FFFFFF');
        break;
      }
      case 'flower':
        px(g, hx, hy - 1, hw, 1, '#5E8A3A'); px(g, hx, hy - 2, 1, 1, '#FF9EC4'); px(g, hx + 2, hy - 2, 1, 1, '#F2C14E');
        px(g, hx + hw - 1, hy - 2, 1, 1, '#FF9EC4'); if (hw >= 6) px(g, hx + 4, hy - 2, 1, 1, '#FFFFFF');
        break;
      default: break;
    }

    // front arm and weapon
    const shoulderY = by + 1;
    const handX = f > 0 ? bx + bw : bx - 1;
    const handY = by + Math.floor(bh * 0.55);
    px(g, handX, shoulderY, 1, handY - shoulderY + 1, skin);
    if (o.shield) {
      const sx = f > 0 ? bx + bw - 1 : bx - 2;
      px(g, sx, by + 1, 3, Math.max(3, bh - 1), o.shield);
      px(g, sx + 1, by + 2, 1, Math.max(1, bh - 3), shade(o.shield, 0.3));
    }
    const wt = o.weapon || 'none';
    const L = Math.round(s * (WEAPON_LEN[wt] || 0));
    if (wt === 'none' || L === 0) return { top: hy, headX: hx, headW: hw };
    if (wt === 'bow') {
      const bxp = handX + f;
      line(g, bxp, handY - 4, bxp + f, handY - 2, '#8B5A2B'); line(g, bxp + f, handY - 2, bxp + f, handY + 2, '#8B5A2B'); line(g, bxp + f, handY + 2, bxp, handY + 4, '#8B5A2B');
      px(g, bxp, handY - 3, 1, 7, '#D8D0C0');
      return { top: hy, headX: hx, headW: hw };
    }
    if (wt === 'claws') {
      const reach = a.swing ? 2 : 0;
      px(g, f > 0 ? handX + 1 + reach : handX - 2 - reach, handY, 2, 1, '#EDE6D6');
      px(g, handX + f * (1 + reach), handY - 1, 1, 1, '#EDE6D6');
      return { top: hy, headX: hx, headW: hw };
    }
    // weapon angle: raised back at rest, swung forward when attacking
    const sw = a.swing || 0;
    const ang = (-1.25 + sw * 2.0);
    const ex = handX + f * Math.cos(ang) * L;
    const ey2 = handY + Math.sin(ang) * L;
    const shaft = (wt === 'staff' || wt === 'spear' || wt === 'glaive' || wt === 'shovel' || wt === 'skullstaff') ? '#8B5A2B'
      : (wt === 'club' || wt === 'greatclub') ? '#7A5230' : (wt === 'chain' ? '#9AA0A8' : '#5A4632');
    const metal = '#C8CED6';
    if (wt === 'sword' || wt === 'greatsword' || wt === 'dagger') {
      const hilt = 0.18;
      line(g, handX, handY, handX + f * Math.cos(ang) * L * hilt, handY + Math.sin(ang) * L * hilt, '#5A4632');
      line(g, handX + f * Math.cos(ang) * L * hilt, handY + Math.sin(ang) * L * hilt, ex, ey2, metal);
      if (wt === 'greatsword') line(g, handX + f * Math.cos(ang) * L * hilt + 1, handY + Math.sin(ang) * L * hilt, ex + 1, ey2, shade(metal, -0.25));
      return { top: hy, headX: hx, headW: hw };
    }
    line(g, handX, handY, ex, ey2, shaft);
    switch (wt) {
      case 'club': px(g, ex - 1, ey2 - 1, 2, 2, '#7A5230'); break;
      case 'greatclub': px(g, ex - 1, ey2 - 1, 3, 3, '#6B4628'); break;
      case 'axe': px(g, ex - (f > 0 ? 0 : 1), ey2, 2, 3, metal); break;
      case 'greataxe': px(g, ex - 1, ey2 - 1, 3, 4, metal); px(g, ex, ey2, 1, 2, shade(metal, -0.3)); break;
      case 'spear': px(g, ex, ey2, 1, 1, metal); px(g, ex + f * Math.cos(ang), ey2 + Math.sin(ang), 1, 1, metal); break;
      case 'glaive': line(g, ex, ey2, ex + f * Math.cos(ang) * 3, ey2 + Math.sin(ang) * 3, '#9FD8FF'); break;
      case 'staff': px(g, ex - 1, ey2 - 1, 2, 2, o.orb || o.glow || '#8FD4FF'); break;
      case 'skullstaff': px(g, ex - 1, ey2 - 1, 2, 2, '#EDE6D6'); px(g, ex, ey2, 1, 1, '#3DDC84'); break;
      case 'mace': px(g, ex - 1, ey2 - 1, 2, 2, '#D4AF37'); break;
      case 'morningstar': px(g, ex - 1, ey2 - 1, 3, 3, '#6E6E78'); px(g, ex, ey2 - 2, 1, 1, metal); px(g, ex + 2, ey2, 1, 1, metal); break;
      case 'chain': px(g, ex - 1, ey2 - 1, 3, 3, '#5C5C66'); break;
      case 'shovel': px(g, ex - 1, ey2, 2, 2, '#8A8E96'); break;
      default: break;
    }
    return { top: hy, headX: hx, headW: hw };
  }

  // Barghest: a wolf-like goblin beast on four legs.
  function beast(g, cx, fy, o, a) {
    const s = o.h, f = o.facing || 1;
    const c = a.flash ? '#FFF' : o.skin, d = a.flash ? '#FFF' : shade(o.skin, -0.3);
    const w = Math.round(s * 0.9), bh = Math.round(s * 0.35), lh = Math.round(s * 0.28);
    const x0 = Math.round(cx - w / 2), by = fy - lh - bh - (a.bob || 0);
    px(g, x0, by, w, bh, c);
    px(g, x0, by + bh - 1, w, 1, d);
    const step = a.walk ? (Math.sin(a.walk * TAU) > 0 ? 1 : 0) : 0;
    px(g, x0 + 1, fy - lh, 2, lh - step, d); px(g, x0 + w - 3, fy - lh, 2, lh - (1 - step), d);
    const hx = f > 0 ? x0 + w - 2 : x0 - 4, hy = by - 3;
    px(g, hx, hy, 6, 5, c);
    px(g, f > 0 ? hx + 5 : hx - 1, hy + 2, 2, 2, c); // snout
    px(g, f > 0 ? hx + 4 : hx + 1, hy + 1, 1, 1, o.glow || '#FF7A3D');
    px(g, f > 0 ? hx : hx + 5, hy - 2, 1, 2, c); px(g, f > 0 ? hx + 2 : hx + 3, hy - 2, 1, 2, c); // ears
    px(g, f > 0 ? x0 - 2 : x0 + w, by - 1, 2, 1, d); // tail
    if (a.swing) px(g, f > 0 ? hx + 6 : hx - 2, hy + 4, 2, 1, '#F2EEDC');
    return { top: hy - 2, headX: hx, headW: 6 };
  }

  // ------------------------------------------------------------------ looks
  const HUMAN_SKIN = ['#F1C7A0', '#E0AC7E', '#C68E62', '#9B6A45', '#6B4630'];
  const HAIR = ['#2A1E14', '#6B4226', '#C9A04E', '#8E3B1E', '#D8D0C0', '#1A1A2A'];
  function adventurerLook(cls, seed, big) {
    const r = mulberry(seed);
    const skin = HUMAN_SKIN[Math.floor(r() * HUMAN_SKIN.length)];
    const hair = HAIR[Math.floor(r() * HAIR.length)];
    const h = big ? 22 : 16;
    const base = { h, skin, hair, facing: -1, pants: '#3A3A48', cls, seed }; // cls + seed pick the PixelLab sprite
    switch (cls) {
      case 'warrior': return Object.assign(base, { shirt: ['#9A3B32', '#2F5E9A', '#7A6A2A'][Math.floor(r() * 3)], hat: 'helm', weapon: 'sword', shield: ['#7A2E24', '#2E4A7A', '#5A5A62'][Math.floor(r() * 3)] });
      case 'mage': return Object.assign(base, { robe: ['#3A55A0', '#6A2E8A', '#9A2E3A'][Math.floor(r() * 3)], hat: 'wizard', hatColor: '#2A2A60', weapon: 'staff', orb: '#8FD4FF' });
      case 'ranger': return Object.assign(base, { shirt: '#4E7A3A', hood: '#3B5A2C', weapon: 'bow', pants: '#5A4632' });
      case 'cleric': return Object.assign(base, { robe: '#E6E0CC', trim: '#D4AF37', weapon: 'mace' });
      case 'rogue': return Object.assign(base, { shirt: '#4A3A5A', hood: '#2E2438', weapon: 'dagger' });
      case 'gm': return Object.assign(base, { robe: '#F0E6C8', trim: '#7FE0F5', hat: 'gm', weapon: 'staff', orb: '#7FE0F5', glow: '#7FE0F5', h: 24 });
      default: return base;
    }
  }
  function formLook(form) {
    const L = Object.assign({}, form.look);
    L.bigHead = form.fam === 'goblin' && !L.beast;
    L.beast = L.beast || false;
    L.facing = 1;
    if (L.hood == null && form.look.hood) L.hood = form.look.hood;
    return L;
  }

  // ------------------------------------------------------------------ village units (small sprites)
  // r is the force's rank, 0 (Recruits) to 5 (Legends). Every ×2 checkpoint changes how they look.
  function goblinLook(extra) { return Object.assign({ h: 8, skin: '#7FA650', ears: 2, bigHead: true, facing: 1, shirt: '#5A4632' }, extra || {}); }
  // Gear that comes with rank: a leather cap, an iron helm and mail, a shield, a banner cape, then gold and a corrupted glow.
  function ranked(L, r, opts) {
    opts = opts || {};
    L.h = (L.h || 8) + (r >= 2 ? 1 : 0) + (r >= 4 ? 1 : 0);
    if (r >= 1) { L.hat = 'helm'; L.helm = '#7A5A3A'; }
    if (r >= 2) L.helm = '#8A8E96';
    if (r >= 4) L.helm = '#B8BCC4';
    if (r >= 5) L.helm = '#E8B43A';
    if (r >= 2) L.shirt = r >= 4 ? '#6A6E78' : '#5C5C66';
    if (r >= 3 && opts.shield !== false) L.shield = r >= 5 ? '#C9A64A' : '#7A5230';
    if (r >= 4) { L.cape = r >= 5 ? '#8E2B2B' : '#3F6A30'; L.trim = '#C9A64A'; }
    if (r >= 5) L.glow = '#7FE0F5';
    return L;
  }
  function sparkle(g, x, y, t, k) {
    for (let n = 0; n < 4; n++) {
      const p = (t * 0.7 + n / 4 + k * 0.13) % 1;
      if (p < 0.55) px(g, x - 5 + ((n * 7 + k * 3) % 11), y - Math.round(p * 6), 1, 1, n % 2 ? '#7FE0F5' : '#F2C14E');
    }
  }
  function drawUnit(g, i, x, fy, t, phase, r) {
    r = r || 0;
    const sw = phase > 0.8 ? (phase - 0.8) * 5 : 0;
    const bob = Math.sin(t * 3 + i) > 0.6 ? 1 : 0;
    let top = fy - 10;
    switch (i) {
      case 0: { // pointy sticks become spears, then a glowing glaive
        const L = ranked(goblinLook({ weapon: r === 0 ? 'stick' : (r >= 5 ? 'glaive' : 'spear') }), r);
        humanoid(g, x, fy, L, { swing: sw, bob });
        top = fy - L.h;
        break;
      }
      case 1: { // rock slingers: bigger rocks, a rock pouch, then flaming and glowing rocks
        const L = ranked(goblinLook({ skin: '#86AD57', shirt: '#6B5A3A' }), r, { shield: false });
        humanoid(g, x, fy, L, { bob });
        const rc = r >= 5 ? '#7FE0F5' : r >= 4 ? '#FF8A3D' : r >= 3 ? '#B4B4BE' : '#9A9A9A';
        const rs = r >= 1 ? 2 : 1;
        px(g, x + 3, fy - L.h + 2 - (sw ? 2 : 0), rs, rs, rc);
        if (r >= 2) { px(g, x - 5, fy - 4, 2, 3, '#7A5230'); px(g, x - 5, fy - 5, 2, 1, rc); }
        top = fy - L.h;
        break;
      }
      case 2: { // spike trappers: wooden spikes, iron spikes, then a whole trap field
        const L = ranked(goblinLook({ weapon: 'shovel', shirt: '#4A3B28' }), r, { shield: false });
        humanoid(g, x, fy, L, { swing: sw, bob });
        const n = 3 + Math.min(3, r);
        const sc = r >= 5 ? '#7FE0F5' : r >= 4 ? '#E8B43A' : r >= 1 ? '#C8CED6' : '#B8B0A0';
        if (r >= 3) px(g, x + 4, fy - 1, n * 2 + 1, 1, '#5A5E66');
        for (let k = 0; k < n; k++) px(g, x + 5 + k * 2, fy - 2 - (r >= 2 && k % 2 ? 1 : 0), 1, 2 + (r >= 2 && k % 2 ? 1 : 0), sc);
        top = fy - L.h;
        break;
      }
      case 3: { // wolf riders: dire wolves, saddles, then a white wolf
        const wc = r >= 5 ? '#E8EEF2' : r >= 2 ? '#5A5E66' : '#8A8E96';
        const b = r >= 2 ? 1 : 0;
        px(g, x - 4 - b, fy - 5 - b, 9 + b * 2, 3 + b, wc);
        px(g, x + 4 + b, fy - 7 - b, 3, 3, wc);
        px(g, x + 6 + b, fy - 6 - b, 1, 1, r >= 5 ? '#7FE0F5' : '#F5E663');
        px(g, x + 4 + b, fy - 8 - b, 1, 1, wc);
        px(g, x - 3, fy - 2, 1, 2, shade(wc, -0.3)); px(g, x + 3, fy - 2, 1, 2, shade(wc, -0.3));
        px(g, x - 5 - b, fy - 5 - b, 1, 1, wc);
        if (r >= 3) px(g, x - 2, fy - 6 - b, 5, 1, r >= 4 ? '#C9A64A' : '#8E2B2B');
        const L = ranked(goblinLook({ h: 7, weapon: r >= 5 ? 'glaive' : 'spear' }), r, { shield: false });
        humanoid(g, x, fy - 4 - b, L, { swing: sw });
        top = fy - 4 - b - L.h;
        break;
      }
      case 4: { // boom barrels: iron bands, bigger barrels, a spare barrel, then glowing nitro
        const bw = r >= 2 ? 5 : 4, bh = r >= 2 ? 6 : 5;
        const bc = r >= 5 ? '#2E7A4A' : '#7A5230';
        if (r >= 3) { px(g, x + 3 + bw, fy - 3, 3, 3, bc); px(g, x + 3 + bw, fy - 2, 3, 1, '#3A3A40'); }
        px(g, x + 3, fy - bh, bw, bh, bc);
        px(g, x + 3, fy - bh + 1, bw, 1, '#3A3A40'); px(g, x + 3, fy - 2, bw, 1, '#3A3A40');
        if (r >= 1) px(g, x + 3, fy - Math.ceil(bh / 2), bw, 1, r >= 4 ? '#C9A64A' : '#5A5E66');
        if (r >= 5 && Math.sin(t * 6) > 0) px(g, x + 4, fy - bh + 2, 2, 1, '#B6FF8A');
        px(g, x + 5, fy - bh - 1, 1, 1, (t * 8) % 2 > 1 ? '#FFB23D' : '#FF5A2A');
        const L = ranked(goblinLook({ shirt: '#3A3A40' }), r, { shield: false });
        humanoid(g, x - 1, fy, L, { bob });
        top = fy - L.h;
        break;
      }
      case 5: { // shamans: bone charms, a pointed hat, purple robes, then a spirit companion
        const robe = r >= 5 ? '#2A5A6A' : r >= 3 ? '#4A2E6A' : '#3F5A2E';
        const L = goblinLook({ robe, weapon: 'skullstaff' });
        L.h += (r >= 2 ? 1 : 0) + (r >= 4 ? 1 : 0);
        if (r >= 1) L.trim = '#E6D8B8';
        if (r >= 2) { L.hat = 'wizard'; L.hatColor = r >= 4 ? '#2A1E3A' : '#3A4A2A'; }
        if (r >= 4) L.cape = '#2A1E3A';
        if (r >= 5) L.glow = '#7FE0F5';
        humanoid(g, x, fy, L, { swing: sw, bob });
        if (Math.sin(t * 4) > 0) px(g, x + 3, fy - L.h - 2, 1, 1, r >= 3 ? '#B58CFF' : '#3DDC84');
        if (r >= 4) {
          const sy = fy - L.h - 3 + Math.round(Math.sin(t * 2 + i));
          px(g, x - 7, sy, 3, 3, 'rgba(159,216,255,0.75)'); px(g, x - 7, sy + 3, 1, 1, 'rgba(159,216,255,0.5)');
          px(g, x - 6, sy + 1, 1, 1, '#14100C');
        }
        top = fy - L.h - 3;
        break;
      }
      case 6: { // catapults: iron bands, a longer arm, wheels, a flag, then flaming scrap
        const w = r >= 2 ? 13 : 11;
        px(g, x - 5, fy - 2, w, 2, r >= 1 ? '#5A4632' : '#6B4628');
        if (r >= 1) { px(g, x - 3, fy - 2, 1, 2, '#8A8E96'); px(g, x + 3, fy - 2, 1, 2, '#8A8E96'); }
        if (r >= 3) { px(g, x - 5, fy - 1, 3, 2, '#3A2A1A'); px(g, x + w - 8, fy - 1, 3, 2, '#3A2A1A'); px(g, x - 4, fy, 1, 1, '#8A8E96'); px(g, x + w - 7, fy, 1, 1, '#8A8E96'); }
        else { px(g, x - 4, fy - 1, 2, 1, '#3A2A1A'); px(g, x + 3, fy - 1, 2, 1, '#3A2A1A'); }
        px(g, x - 1, fy - 6, 2, 4, '#7A5230');
        const armA = -0.9 + sw * 1.4, al = r >= 2 ? 9 : 7;
        const ex = x - Math.cos(armA) * al, ey = fy - 6 + Math.sin(armA) * al;
        line(g, x, fy - 6, ex, ey, '#8B5A2B');
        px(g, ex - 1, ey - 1, 2, 2, r >= 4 ? (Math.sin(t * 9) > 0 ? '#FF8A3D' : '#FFB23D') : '#8A8E96');
        if (r >= 4) { px(g, x + w - 6, fy - 10, 1, 8, '#5A4632'); px(g, x + w - 5, fy - 10 + (Math.sin(t * 4) > 0 ? 0 : 1), 3, 2, r >= 5 ? '#FF4F8B' : '#9BC46A'); }
        top = fy - 12;
        break;
      }
      case 7: { // defectors: steel helms, greatswords, shields, plumes, then gold armour
        const L = { h: 12 + (r >= 2 ? 1 : 0) + (r >= 4 ? 1 : 0), skin: HUMAN_SKIN[(i * 3) % 5], shirt: '#3F5A2E', tabard: '#9BC46A', hat: 'helm', helm: '#5A6A4A', weapon: 'sword', facing: 1 };
        if (r >= 1) L.helm = '#8A8E96';
        if (r >= 2) { L.shirt = '#5C5C66'; L.weapon = 'greatsword'; }
        if (r >= 3) L.shield = '#3F6A30';
        if (r >= 4) { L.cape = '#3F6A30'; L.trim = '#C9A64A'; L.hat = 'plume'; }
        if (r >= 5) { L.shirt = '#C9A64A'; L.shield = '#C9A64A'; L.glow = '#7FE0F5'; }
        humanoid(g, x, fy, L, { swing: sw, bob });
        top = fy - L.h;
        break;
      }
      case 8: { // gyro-gobblers: longer rotors, bombs, twin rotors, a pennant, then gold
        const y = fy - 26 + Math.sin(t * 2 + i) * 2;
        const bw = r >= 2 ? 9 : 7;
        px(g, x - 3, y, bw, 3, r >= 5 ? '#C9A64A' : '#B5651D'); px(g, x - 1, y - 1, 3, 1, '#8A8E96');
        const rr = Math.floor(t * 20) % 2, rw = 6 + (r >= 1 ? 2 : 0);
        px(g, x - 5 + rr * 2, y - 2, rw, 1, '#D8D0C0');
        if (r >= 3) px(g, x + bw - 7 - rr * 2, y - 3, rw - 2, 1, '#D8D0C0');
        px(g, x + 1, y + 1, 1, 1, '#7FA650');
        if (r >= 2) { px(g, x + 2, y + 3, 2, 2, '#3A3A40'); px(g, x + 2, y + 3, 1, 1, '#FF5A2A'); }
        if (r >= 4) { px(g, x - 4, y + 1, 1, 3, '#5A4632'); px(g, x - 6, y + 1, 2, 2, '#9BC46A'); }
        if (r >= 5) px(g, x + bw - 4, y + 1, 1, 1, '#7FE0F5');
        top = y - 3;
        break;
      }
      case 9: { // glitch swarms grow thicker and pick up gold
        const rr = mulberry(Math.floor(t * 10));
        const n = 7 + r * 3, spread = 9 + r * 2;
        const cols = r >= 4 ? ['#FF4F8B', '#7FE0F5', '#F2C14E'] : ['#FF4F8B', '#7FE0F5'];
        for (let k = 0; k < n; k++) px(g, x - Math.floor(spread / 2) + Math.floor(rr() * spread), fy - 30 - r + Math.floor(rr() * (7 + r)), 1 + Math.floor(rr() * (r >= 3 ? 3 : 2)), 1, cols[Math.floor(rr() * cols.length)]);
        top = fy - 31 - r;
        break;
      }
      case 10: { // wyvern riders: a saddle, wider wings, a helm, a banner, then a red wyvern
        const y = fy - 34 + Math.sin(t * 1.6) * 3;
        const fl = Math.sin(t * 7) > 0 ? -2 : 1;
        const wc = r >= 5 ? '#8E2B2B' : r >= 3 ? '#3A5A4A' : '#4A6A3A';
        const ws = r >= 2 ? 2 : 0;
        px(g, x - 4, y, 9, 2, wc); px(g, x + 4, y - 1, 3, 2, wc); px(g, x - 7, y + 1, 3, 1, wc);
        line(g, x - 2, y, x - 6 - ws, y + fl * 2, shade(wc, -0.2)); line(g, x + 1, y, x + 4 + ws, y + fl * 2, shade(wc, -0.2));
        if (r >= 1) px(g, x - 1, y - 1, 3, 1, r >= 4 ? '#C9A64A' : '#8E2B2B');
        const ry = y - 2 - (r >= 1 ? 1 : 0);
        px(g, x, ry, 2, 2, '#7FA650');
        if (r >= 2) px(g, x, ry - 1, 2, 1, r >= 5 ? '#E8B43A' : '#8A8E96');
        if (r >= 4) { px(g, x - 3, ry - 4, 1, 5, '#5A4632'); px(g, x - 2, ry - 4, 2, 1, '#9BC46A'); }
        if (r >= 5) px(g, x + 6, y - 1, 1, 1, '#7FE0F5');
        top = ry - 4;
        break;
      }
      case 11: { // exploit engines: an antenna, a bigger chassis, treads, a second screen, then overclocked
        const w = r >= 2 ? 11 : 9, h = r >= 2 ? 8 : 7;
        if (r >= 3) { px(g, x - 5, fy - 2, w + 2, 2, '#2A2A30'); for (let k = 0; k < w + 2; k += 2) px(g, x - 5 + k, fy - 1, 1, 1, '#5A5E66'); }
        px(g, x - 4, fy - h - (r >= 3 ? 1 : 0), w, h, r >= 5 ? '#3A3F5E' : '#4A4F5E');
        const sy = fy - h + 1 - (r >= 3 ? 1 : 0);
        const scr = r >= 5 ? (Math.sin(t * 5) > 0 ? '#7FE0F5' : '#3FA0C0') : (Math.sin(t * 5) > 0 ? '#3DDC84' : '#2A8A5A');
        px(g, x - 3, sy, 5, 3, scr);
        if (r >= 4) px(g, x + 3, sy, 3, 3, scr);
        px(g, x + 3, sy - 3, 1, 2, '#3A3A40');
        if (r >= 1) { px(g, x - 2, sy - 4, 1, 3, '#3A3A40'); px(g, x - 2, sy - 5, 1, 1, Math.sin(t * 6) > 0 ? '#FF4F8B' : '#3A3A40'); }
        if (Math.sin(t * 3) > 0) px(g, x + 3, sy - 5, 1, 1, r >= 5 ? '#7FE0F5' : '#8A8A8A');
        top = sy - 5;
        break;
      }
      default: break;
    }
    if (r >= 5) sparkle(g, x, top, t, i);
    return top;
  }

  // ------------------------------------------------------------------ scenery
  function hut(g, x, fy, w, roof, t, banner) {
    const wallH = Math.round(w * 0.45);
    px(g, x, fy - wallH, w, wallH, '#6B5236');
    px(g, x, fy - wallH, 1, wallH, '#4A3826');
    px(g, x + Math.floor(w / 2) - 1, fy - Math.ceil(wallH * 0.7), 2, Math.ceil(wallH * 0.7), '#2A1E14');
    const rh = Math.round(w * 0.6);
    for (let k = 0; k < rh; k++) {
      const ww = Math.max(1, Math.round((w + 2) * (k + 1) / rh));
      px(g, x + Math.round((w - ww) / 2), fy - wallH - rh + k, ww, 1, k % 3 === 0 ? shade(roof, -0.15) : roof);
    }
    if (banner) {
      const bx2 = x + Math.floor(w / 2), by2 = fy - wallH - rh - 5;
      px(g, bx2, by2, 1, 5, '#5A4632');
      const wave = Math.sin(t * 4 + x) > 0 ? 0 : 1;
      px(g, bx2 + 1, by2 + wave, 3, 2, '#9BC46A');
    }
  }

  function regionProps(g, W, H, G, r, R, t) {
    const rnd = mulberry(1000 + r);
    switch (r % 12) {
      case 1: // forest
        for (let k = 0; k < 9; k++) {
          const x = Math.floor(rnd() * W), h = 10 + Math.floor(rnd() * 12);
          for (let j = 0; j < h; j++) px(g, x - Math.floor(j / 2.5), G - 12 - h + j, Math.floor(j / 1.25) + 1, 1, shade(R.hills, -0.1 - rnd() * 0.15));
        }
        break;
      case 2: // farms: fence and windmill
        px(g, W * 0.72, G - 22, 4, 14, '#8A7A5A');
        for (let a2 = 0; a2 < 4; a2++) { const an = t * 0.8 + a2 * TAU / 4; line(g, W * 0.72 + 2, G - 22, W * 0.72 + 2 + Math.cos(an) * 7, G - 22 + Math.sin(an) * 7, '#D8CCAA'); }
        for (let x = 0; x < W; x += 6) px(g, x, G - 4, 1, 4, '#8A6A40');
        px(g, 0, G - 3, W, 1, '#8A6A40');
        break;
      case 3: // swamp
        for (let k = 0; k < 5; k++) { const x = Math.floor(rnd() * W); px(g, x, G - 16, 1, 12, '#2A2A1E'); px(g, x - 2, G - 13, 2, 1, '#2A2A1E'); px(g, x + 1, G - 11, 2, 1, '#2A2A1E'); }
        px(g, 0, G - 1, W, 2, '#3A4A3E');
        break;
      case 4: // catacombs
        for (let k = 0; k < 6; k++) { const x = Math.floor(rnd() * W); px(g, x, G - 6, 3, 5, '#5A5662'); px(g, x + 1, G - 7, 1, 1, '#5A5662'); }
        px(g, W * 0.75, G - 24, 12, 22, '#2A2638'); px(g, W * 0.75 + 3, G - 16, 6, 14, '#14121C');
        break;
      case 5: // peaks
        for (let k = 0; k < 3; k++) {
          const x = W * (0.2 + k * 0.32), h = 28 + k * 4;
          for (let j = 0; j < h; j++) {
            const ww = j * 1.4;
            px(g, x - ww / 2, G - 10 - h + j, ww + 1, 1, j < h * 0.3 ? '#F4F8FA' : '#8A9AB0');
          }
        }
        break;
      case 6: // wastes: volcano
        for (let j = 0; j < 30; j++) px(g, W * 0.7 - j * 0.9, G - 40 + j, j * 1.8 + 4, 1, '#2A1610');
        px(g, W * 0.7, G - 42, 4, 2, Math.sin(t * 6) > 0 ? '#FF8A3D' : '#FF5A2A');
        break;
      case 7: // keep
        px(g, W * 0.6, G - 34, 30, 26, '#4A4F5E');
        for (let k = 0; k < 6; k++) px(g, W * 0.6 + k * 5, G - 36, 3, 2, '#4A4F5E');
        px(g, W * 0.6 + 12, G - 18, 6, 10, '#22262E');
        px(g, W * 0.6 + 20, G - 46, 8, 14, '#3E4250');
        break;
      case 8: // port city skyline
        for (let k = 0; k < 10; k++) {
          const x = k * (W / 10), h = 10 + Math.floor(rnd() * 22);
          px(g, x, G - 8 - h, W / 10 - 1, h, '#2A3448');
          if (rnd() > 0.4) px(g, x + 2, G - 8 - h + 3, 1, 1, '#F2C14E');
        }
        break;
      case 9: // sky citadel
        for (let k = 0; k < 3; k++) {
          const x = W * (0.15 + k * 0.33), y = 18 + k * 7 + Math.sin(t * 0.6 + k) * 1.5;
          px(g, x, y, 16, 3, '#D6D0C0'); px(g, x + 3, y + 3, 10, 2, '#A8A090'); px(g, x + 6, y - 7, 4, 7, '#F0EAD8');
        }
        break;
      case 10: // guild hall
        px(g, W * 0.55, G - 30, 40, 22, '#6A5032');
        for (let k = 0; k < 4; k++) px(g, W * 0.55 + 4 + k * 9, G - 28, 3, 10, '#C08A3A');
        for (let j = 0; j < 10; j++) px(g, W * 0.55 - 2 + j, G - 40 + j, 44 - j * 2, 1, '#4A3A28');
        break;
      case 11: // the admin spire
        for (let j = 0; j < 60; j++) px(g, W * 0.72 - Math.max(1, j * 0.12), G - 70 + j, Math.max(2, j * 0.24), 1, j % 7 === 0 ? '#7FE0F5' : '#1E2A44');
        if (Math.sin(t * 9) > 0.7) px(g, W * 0.72 - 6 + Math.floor(rnd() * 12), G - 60 + Math.floor(rnd() * 40), 4, 1, '#FF4F8B');
        break;
      default: break;
    }
  }

  // ------------------------------------------------------------------ scene
  const ANIMATED_PROPS = new Set([2, 6, 9, 11]); // windmill, volcano, floating islands, the spire
  // ------------------------------------------------------------------ PixelLab sprites
  // sprites/manifest.json lists the PNGs that exist. Characters are keyed by facing:
  //   "goblin": { "east": "sprites/goblin/east.png" }, "adv-warrior-0": { "west": "..." }, "boss-valkor": { "west": "..." }
  // Backgrounds give the image and the row where its ground starts: "bg-0": { "bg": "sprites/bg/0.png", "horizon": 166 }
  // Sprites are drawn 1:1 on the scene's fine grid. Anything not listed (or not loaded yet) falls back to the procedural drawing.
  // Adventurer class sprites are numbered variants (adv-<class>-<n>); each adventurer picks one from its seed.
  const SPRITES = {};
  const VARIANTS = {};
  function cropInfo(img) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const cg = c.getContext('2d');
    cg.drawImage(img, 0, 0);
    const d = cg.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return null;
    // the middle of the top few rows is roughly where the head is, for event hats
    let hs = 0, hn = 0;
    for (let y = y0; y < Math.min(y1 + 1, y0 + 3); y++) for (let x = x0; x <= x1; x++) if (d[(y * c.width + x) * 4 + 3] > 8) { hs += x; hn++; }
    return { img, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, hx: (hn ? hs / hn : (x0 + x1) / 2) - x0 };
  }
  // VFX made with PixelLab's VFX Creator: "fx-hit": { "pack": "sprites/fx/hit/manifest.json" } points at the exported game pack.
  // Each clip is a sheet of frames placed at an anchor (the target's feet) plus an offset, all in fine pixels. A pack has a
  // "whole" clip and, when the effect wraps around a body, "behind" and "front" clips to draw either side of the character.
  const VFX = {};
  function loadFx(name, packUrl) {
    const dir = packUrl.slice(0, packUrl.lastIndexOf('/') + 1);
    fetch(packUrl).then((r) => r.json()).then((p) => {
      const want = (p.clips || []).filter((k) => ['whole', 'behind', 'front'].includes(k.name) && k.sheets && k.sheets.length);
      if (!want.some((k) => k.name === 'whole')) return;
      const def = { fps: p.fps || 12, loop: !!p.loop, total: p.frames || 1, clips: {} };
      let left = want.length;
      for (const c of want) {
        const sh = c.sheets[0], img = new Image();
        img.onload = () => {
          def.clips[c.name] = { img, frames: c.frames, start: c.start_frame || 0, fw: c.frame.w, fh: c.frame.h, cols: sh.columns || c.frames, ox: c.offset.x, oy: c.offset.y };
          if (!--left) VFX[name] = def;
        };
        img.onerror = () => { if (!--left && def.clips.whole) VFX[name] = def; };
        img.src = dir + sh.file;
      }
    }).catch(() => {});
  }
  // ---- loading. The manifest is read at startup, but an entry's images are only requested the first time something
  // asks for it (ensure), so whatever is on screen jumps the queue. Once the battle scene has everything it needs, the
  // rest is prefetched a few entries at a time so later evolutions and regions don't wait (prefetchAll).
  let MANIFEST = null, manifestFailed = false, prefetching = false;
  const STATE = {}, LOADS = {}; // id -> 'loading' | 'ready'; id -> its loading promise
  let wanted = 0;               // listed-but-still-loading entries asked for; the scene counts these per frame
  const loadImage = (url) => new Promise((res) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = url; });
  // Animation frames share one crop (the union of every frame's opaque pixels) so the figure doesn't jitter.
  function loadFrames(entry, key, urls) {
    return Promise.all(urls.map(loadImage)).then((imgs) => {
      if (imgs.some((im) => !im)) return;
      const boxes = imgs.map((im) => cropInfo(im));
      if (boxes.some((bx) => !bx)) return;
      const x0 = Math.min(...boxes.map((bx) => bx.x)), y0 = Math.min(...boxes.map((bx) => bx.y));
      const x1 = Math.max(...boxes.map((bx) => bx.x + bx.w)), y1 = Math.max(...boxes.map((bx) => bx.y + bx.h));
      // anchor every frame on frame 0's body (the rest pose): its centre and its feet, so a weapon swinging out
      // past the body doesn't shift the figure
      const f0 = boxes[0], ax = f0.x + f0.w / 2 - x0, ay = f0.y + f0.h - y0;
      entry[key] = boxes.map((bx) => ({ img: bx.img, x: x0, y: y0, w: x1 - x0, h: y1 - y0, hx: bx.hx + bx.x - x0, ty: bx.y - y0, ax, ay, bodyH: f0.h }));
    });
  }
  function ensure(id) {
    if (LOADS[id]) return LOADS[id];
    if (!MANIFEST || !MANIFEST[id]) return Promise.resolve();
    STATE[id] = 'loading';
    const m = MANIFEST[id], entry = SPRITES[id], jobs = [];
    for (const key in m) {
      const val = m[key];
      if (Array.isArray(val)) jobs.push(loadFrames(entry, key, val)); // animation frames, e.g. "attack"
      else if (typeof val === 'string') jobs.push(loadImage(val).then((img) => {
        if (!img) return;
        if (key === 'bg') entry.bg = { img, x: 0, y: 0, w: img.width, h: img.height };
        else { const sp = cropInfo(img); if (sp) entry[key] = sp; }
      }));
    }
    return (LOADS[id] = Promise.all(jobs).then(() => { STATE[id] = 'ready'; artChanged(); }));
  }
  // Still waiting on this entry's art? (Before the manifest arrives, everything counts as waiting.)
  const artPending = (id) => (!MANIFEST ? !manifestFailed : STATE[id] === 'loading');
  // Prefetch everything not loaded yet, four entries at a time, once the first scene is complete.
  function prefetchAll() {
    if (prefetching || !MANIFEST) return;
    prefetching = true;
    const ids = Object.keys(SPRITES).filter((id) => !LOADS[id]);
    let i = 0;
    const next = () => { if (i < ids.length) ensure(ids[i++]).then(next); };
    for (let k = 0; k < 4; k++) next();
  }
  // Callbacks for when sprite images arrive, so cached UI images (portraits, unit icons) can be redrawn.
  const artListeners = [];
  let artTimer = 0;
  const artChanged = () => { clearTimeout(artTimer); artTimer = setTimeout(() => artListeners.forEach((f) => f()), 150); };
  function loadSprites() {
    fetch('sprites/manifest.json').then((r) => (r.ok ? r.json() : {})).then((m) => {
      for (const id in m) {
        if (m[id].pack) { loadFx(id.replace(/^fx-/, ''), m[id].pack); continue; } // VFX are small: load them all now
        const entry = SPRITES[id] = {};
        for (const key in m[id]) if (typeof m[id][key] !== 'string' && !Array.isArray(m[id][key])) entry[key] = m[id][key]; // horizon, village
        const v = /^adv-([a-z]+)-\d+$/.exec(id);
        if (v) (VARIANTS[v[1]] = VARIANTS[v[1]] || []).push(id);
      }
      MANIFEST = m;
      artChanged();
    }).catch(() => { manifestFailed = true; artChanged(); });
  }
  if (typeof document !== 'undefined') loadSprites();
  // A loaded sprite, or null. Asking starts its download; a listed sprite that is still loading counts as wanted.
  function sprite(id, dir) {
    const e = SPRITES[id];
    if (!e) { if (!MANIFEST && !manifestFailed) wanted++; return null; }
    ensure(id);
    if (e[dir]) return e[dir];
    if (STATE[id] === 'loading') wanted++;
    return null;
  }
  // The whole entry (facings, frames, numbers) for direct use, with the same loading rules.
  function entryOf(id) {
    const e = SPRITES[id];
    if (!e) { if (!MANIFEST && !manifestFailed) wanted++; return null; }
    ensure(id);
    if (STATE[id] === 'loading') wanted++;
    return e;
  }
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // UI images while their art loads
  // A one-colour silhouette of a sprite: white for the hit flash, gold for a boss's glow. Cached per colour.
  function tintOf(s, color) {
    s.tints = s.tints || {};
    if (s.tints[color]) return s.tints[color];
    const c = document.createElement('canvas');
    c.width = s.img.width; c.height = s.img.height;
    const cg = c.getContext('2d');
    cg.drawImage(s.img, 0, 0);
    cg.globalCompositeOperation = 'source-in';
    cg.fillStyle = color; cg.fillRect(0, 0, c.width, c.height);
    return (s.tints[color] = c);
  }
  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  // Which sprite an adventurer look uses: a named one first (bosses, the whale), then a class variant. Returns its id.
  function lookSpriteId(L, named) {
    for (const id of named || []) if (id && sprite(id, 'west')) return id;
    const list = VARIANTS[L.cls];
    if (!list || !list.length) return null;
    const id = list[(L.seed >>> 0) % list.length];
    return sprite(id, 'west') ? id : null;
  }
  const lookSprite = (L, named) => { const id = lookSpriteId(L, named); return id ? sprite(id, 'west') : null; };
  // Is this look's class sprite still downloading? (Then draw nothing for a moment rather than the old procedural art.)
  const lookPending = (L) => { const list = VARIANTS[L.cls]; return !MANIFEST ? !manifestFailed : !!(list && list.length && artPending(list[(L.seed >>> 0) % list.length])); };
  // Warband unit i at rank r: three gear tiers (recruits, veterans from rank 2, elites from rank 4), facing east.
  // A missing tier falls back to the one below it.
  function unitSprite(i, r) {
    for (let tier = r >= 4 ? 2 : r >= 2 ? 1 : 0; tier >= 0; tier--) { const s = sprite(`unit-${i}-${tier}`, 'east'); if (s) return s; }
    return null;
  }
  const EVENT_HATS = new Set(['party', 'pumpkin', 'santa', 'flower']);
  // impact VFX when a warband unit's shot lands: rock slingers and scrap catapults, boom barrels, shamans
  const SHOT_FX = { 1: 'rock', 4: 'boom', 5: 'hex', 6: 'rock' };

  // ------------------------------------------------------------------ combat styles
  // How a fighter attacks, for both sides. Every effect is made facing right and mirrored for adventurers.
  //   melee:  the attacker lunges in and a trail (fx) plays in front of it
  //   proj:   a cast flash at the hand, then proj-<proj> flies to the target and impact-<proj> plays on it
  //   strike: fx lands straight on the target
  const MELEE = (fx) => ({ kind: 'melee', fx });
  const PROJ = (proj, cast) => ({ kind: 'proj', proj, cast: cast === undefined ? 'cast-' + proj : cast });
  const STRIKE = (fx) => ({ kind: 'strike', fx });
  const COMBAT_CLASS = { warrior: MELEE('slash'), rogue: MELEE('stab'), mage: PROJ('arcane'), ranger: PROJ('arrow', null), cleric: STRIKE('smite'), gm: STRIKE('gm-bolt') };
  const COMBAT_SPRITE = {
    'adv-warrior-2': MELEE('slash-heavy'), 'adv-mage-2': PROJ('fire'),
    'boss-gobbofarmer99': MELEE('slash-heavy'), 'boss-rangerelowen': PROJ('arrow', null), 'boss-captainharrow': MELEE('stab'),
    'boss-swampdaddy': PROJ('poison', 'cast-arcane'), 'boss-necronate': PROJ('poison', 'cast-arcane'), 'boss-brrrian': MELEE('slash-heavy'),
    'boss-pyrequeen': PROJ('fire'), 'boss-lordcastellanvey': MELEE('slash'), 'boss-kingofkingsreach': MELEE('stab'),
    'boss-seraphine': STRIKE('smite'), 'boss-valkor': MELEE('slash-heavy'), 'boss-gmaldric': STRIKE('gm-bolt'),
    whale: PROJ('coin', null),
    // the hero's evolution forms (anything not listed swings with the goblin's club trail)
    goblin: MELEE('swing'), nilbog: MELEE('swing'), boss: MELEE('slash'), mephit: PROJ('fire'), barghest: MELEE('claw'),
    bugbear: MELEE('smash'), bugchief: MELEE('smash'), yeti: MELEE('claw'), abominable: MELEE('claw'),
    hobgoblin: MELEE('slash'), hobcaptain: MELEE('slash'), warlord: MELEE('slash-heavy'), ironshadow: MELEE('stab'), devastator: PROJ('fire'),
    orc: MELEE('slash-heavy'), nurtured: MELEE('claw'), orog: MELEE('slash-heavy'), eye: MELEE('stab'), hand: PROJ('poison', 'cast-arcane'),
    claw: MELEE('claw'), redfang: MELEE('stab'), blade: MELEE('slash-heavy'), warchief: MELEE('slash-heavy'), tanarukk: MELEE('slash-heavy'),
    ogre: MELEE('smash'), chainbrute: MELEE('smash'), oni: MELEE('slash-heavy'), troll: MELEE('claw'), diretroll: MELEE('claw'),
  };
  const combatOf = (spriteId, cls) => COMBAT_SPRITE[spriteId] || COMBAT_CLASS[cls] || MELEE('slash');
  // The attack frame where the blow lands, for animations that don't strike near the middle (default: RELEASE).
  const STRIKE_FRAME = { 'adv-gm-0': 6, 'adv-rogue-0': 6, 'boss-brrrian': 6, 'boss-lordcastellanvey': 5, 'boss-rangerelowen': 4, 'boss-pyrequeen': 4, 'boss-seraphine': 4,
    // hero forms (facing east)
    nilbog: 3, abominable: 3, warlord: 5, ironshadow: 5, orc: 5, orog: 5, blade: 5, ogre: 5, oni: 5, chainbrute: 6 };
  const PROJ_SPEED = { arrow: 150, coin: 110 }; // scene units per second; spells default to 95

  // Draw a PixelLab backdrop into a canvas (identity transform, art pixels): its ground row hz lands on row groundY,
  // centred. If the box is taller or wider than the image, the edge bands are mirrored outward (sky up, ground down,
  // sides out) to fill it. Shared by the battle scene and the town.
  function blitBackdrop(c, cv, s, hz, groundY, BW, BH) {
    const img = s.img, w = s.w, h = s.h;
    const dx = Math.round((BW - w) / 2), dy = groundY - hz;
    c.clearRect(0, 0, BW, BH);
    c.drawImage(img, dx, dy);
    for (let y = dy, flip = true; y > 0; flip = !flip) { // sky band, mirrored upward
      const band = Math.min(hz, y);
      c.save(); c.translate(0, y); if (flip) c.scale(1, -1);
      c.drawImage(img, 0, flip ? 0 : hz - band, w, band, dx, flip ? 0 : -band, w, band);
      c.restore(); y -= band;
    }
    const gh = h - hz;
    for (let y = dy + h, flip = true; y < BH && gh > 0; flip = !flip) { // ground band, mirrored downward
      const band = Math.min(gh, BH - y);
      c.save(); c.translate(0, y); if (flip) c.scale(1, -1);
      c.drawImage(img, 0, flip ? h - band : hz, w, band, dx, flip ? -band : 0, w, band);
      c.restore(); y += band;
    }
    // columns either side: mirror the image outward, again and again, until the box is covered
    for (let x = dx, flip = true; x > 0; flip = !flip) {
      const band = Math.min(w, x);
      c.save(); c.translate(x, 0); if (flip) c.scale(-1, 1);
      c.drawImage(cv, flip ? dx : dx + w - band, 0, band, BH, flip ? 0 : -band, 0, band, BH);
      c.restore(); x -= band;
    }
    for (let x = dx + w, flip = true; x < BW; flip = !flip) {
      const band = Math.min(w, BW - x);
      c.save(); c.translate(x, 0); if (flip) c.scale(-1, 1);
      c.drawImage(cv, flip ? dx + w - band : dx, 0, band, BH, flip ? -band : 0, 0, band, BH);
      c.restore(); x += band;
    }
  }

  function createScene(canvas) {
    const ctx = canvas.getContext('2d');
    const low = document.createElement('canvas');
    const g = low.getContext('2d');
    const spr = document.createElement('canvas');
    const sg = spr.getContext('2d');
    const sil = document.createElement('canvas');
    const silg = sil.getContext('2d');
    // The scene's canvases are on a fine grid: 2 fine pixels per scene unit. Procedural art draws in scene units
    // through a 2x transform (so it keeps its chunky look); PixelLab sprites draw 1:1 in fine pixels.
    const FX = 2;
    const fine = (c, fn) => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); fn(); c.restore(); };
    // Draw a procedural figure with a 1-unit dark outline so it reads against any backdrop.
    function outlined(draw, color) {
      sg.clearRect(0, 0, W, H);
      const res = draw(sg);
      silg.globalCompositeOperation = 'source-over';
      silg.clearRect(0, 0, W * FX, H * FX);
      silg.drawImage(spr, 0, 0);
      silg.globalCompositeOperation = 'source-in';
      silg.fillStyle = color || 'rgba(14,10,8,0.85)';
      silg.fillRect(0, 0, W * FX, H * FX);
      fine(g, () => {
        g.drawImage(sil, -FX, 0); g.drawImage(sil, FX, 0); g.drawImage(sil, 0, -FX); g.drawImage(sil, 0, FX);
        g.drawImage(spr, 0, 0);
      });
      return res;
    }
    // Draw a PixelLab sprite 1:1 on the fine grid, centred on cx with its feet on fy (both in scene units).
    // Returns the top of the sprite and its height, in scene units.
    function drawSprite(s, cx, fy, o) {
      o = o || {};
      // animation frames carry an anchor (ax, ay) on the rest pose's centre and feet; stills centre their crop
      const dx = Math.round(cx * FX - (s.ax != null ? s.ax : s.w / 2)), dy = Math.round(fy * FX) - (s.ay != null ? s.ay : s.h);
      fine(g, () => {
        if (o.alpha != null) g.globalAlpha = o.alpha;
        if (o.glow) { const gl = tintOf(s, o.glow); for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(gl, s.x, s.y, s.w, s.h, dx + ox, dy + oy, s.w, s.h); }
        g.drawImage(o.flash ? tintOf(s, '#FFFFFF') : s.img, s.x, s.y, s.w, s.h, dx, dy, s.w, s.h);
      });
      const h = (s.bodyH || s.h) / FX; // an animation reports its rest-pose height so labels don't bounce
      return { top: fy - h, h };
    }
    // ---- VFX. One-shots are queued with playFx and drop out when done; loops (the campfire) are drawn each frame by loopFx.
    // x and fy are the anchor in scene units (a character's feet). flip mirrors an effect made for the other facing.
    // base: true ignores the pack's offset and stands the frame's bottom-centre on the anchor.
    const fxs = [];
    let skipHitFx = false;
    function playFx(name, x, fy, o) {
      const d = VFX[name];
      if (!d || reduce) return false;
      if (fxs.length >= 14) fxs.shift();
      fxs.push({ d, x, fy, t: 0, flip: !!(o && o.flip), base: !!(o && o.base), center: !!(o && o.center) });
      return true;
    }
    // Projectiles: proj-<kind> loops in place while code flies it from (x0, y0) to (x1, y1); y is the projectile's
    // centre, not feet. On arrival impact-<kind> plays at the target's feet and onHit runs (a flash on the target).
    const bolts = [];
    let heroHurt = 0;
    function fireBolt(kind, x0, y0, x1, y1, feetX, onHit) {
      const d = VFX['proj-' + kind];
      if (!d || reduce || bolts.length >= 8) { playFx('impact-' + kind, feetX, FY); if (onHit) onHit(); return; }
      const dist = Math.hypot(x1 - x0, y1 - y0);
      bolts.push({ d, kind, x0, y0, x1, y1, feetX, onHit, t: 0, dur: Math.max(0.12, dist / (PROJ_SPEED[kind] || 95)), flip: x1 < x0, arc: kind === 'arrow' || kind === 'coin' ? 3 : 0 });
    }
    function drawBolts(dt) {
      for (let k = 0; k < bolts.length; k++) {
        const b = bolts[k];
        b.t += dt;
        const p = Math.min(1, b.t / b.dur);
        const c = b.d.clips.whole, per = (c.start + c.frames) / b.d.fps;
        clipFrame(b.d, c, b.x0 + (b.x1 - b.x0) * p, b.y0 + (b.y1 - b.y0) * p - Math.sin(p * Math.PI) * b.arc, b.t % per, b.flip, false, true);
        if (p >= 1) { playFx('impact-' + b.kind, b.feetX, FY); if (b.onHit) b.onHit(); bolts.splice(k, 1); k--; }
      }
    }
    // Draw one clip of an effect at effect time t (seconds). Loops wrap; one-shots draw nothing outside their frames.
    // base: stand the frame's bottom-centre on the point; center: centre the frame on it (projectiles, cast flashes).
    function clipFrame(d, c, x, fy, t, flip, base, center) {
      if (!c) return;
      const n = Math.floor(t * d.fps) - c.start;
      if (n < 0 || (!d.loop && n >= c.frames)) return;
      const k = d.loop ? n % c.frames : n;
      const sx = (k % c.cols) * c.fw, sy = Math.floor(k / c.cols) * c.fh;
      const ax = Math.round(x * FX), ay = Math.round(fy * FX);
      const ox = base || center ? -Math.round(c.fw / 2) : c.ox, oy = base ? -c.fh : center ? -Math.round(c.fh / 2) : c.oy;
      fine(g, () => {
        if (flip) { g.translate(ax, 0); g.scale(-1, 1); g.drawImage(c.img, sx, sy, c.fw, c.fh, ox, ay + oy, c.fw, c.fh); }
        else g.drawImage(c.img, sx, sy, c.fw, c.fh, ax + ox, ay + oy, c.fw, c.fh);
      });
    }
    // Two passes a frame: 'behind' before the hero and enemies are drawn (it also advances time), 'front' after them.
    // A pack without behind/front clips draws its whole clip in the front pass.
    function drawFxs(dt, layer) {
      for (let k = 0; k < fxs.length; k++) {
        const f = fxs[k], cl = f.d.clips;
        if (layer === 'behind') { f.t += dt; clipFrame(f.d, cl.behind, f.x, f.fy, f.t, f.flip, f.base, f.center); continue; }
        clipFrame(f.d, cl.front || (cl.behind ? null : cl.whole), f.x, f.fy, f.t, f.flip, f.base, f.center);
        if (f.t * f.d.fps >= f.d.total) { fxs.splice(k, 1); k--; }
      }
    }
    function loopFx(name, x, fy, t, o) {
      const d = VFX[name];
      if (!d) return false;
      const c = d.clips.whole, per = (c.start + c.frames) / d.fps; // wrap even if the pack was exported as a one-shot
      clipFrame(d, c, x, fy, reduce ? 0 : t % per, !!(o && o.flip), !!(o && o.base));
      return true;
    }
    let heroXNow = 0, heroAnim = 1, heroHNow = 16, heroFormNow = 'goblin', heroPending = false;
    const RELEASE = 0.55; // how far into an attack animation the blow lands
    // An adventurer's blow lands on the hero, in its combat style (see COMBAT_SPRITE).
    function enemyStrike(e, p, style) {
      const hurt = () => { heroHurt = 0.1; };
      if (style.kind === 'melee') { playFx(style.fx, p.x - 8, FY, { flip: true }); hurt(); return; }
      if (style.kind === 'strike') { playFx(style.fx, heroXNow, FY); heroHurt = 0.14; return; }
      const hx = p.x - 5, hy = FY - (e.drawH || e.look.h) * 0.62; // the staff/bow hand, on the side facing the hero
      if (style.cast) playFx(style.cast, hx, hy, { center: true, flip: true });
      fireBolt(style.proj, hx, hy, heroXNow + 2, FY - heroHNow * 0.55, heroXNow, hurt);
    }
    // The hero's tap attack, in its form's combat style.
    function heroStrike() {
      const style = combatOf(heroFormNow, null), e = st.enemy;
      const ex = e && !e.dead ? enemyPos(e, performance.now()).x : null;
      if (style.kind === 'melee') { playFx(style.fx, heroXNow + 1, FY); return; }
      if (ex == null) return;
      if (style.kind === 'strike') { playFx(style.fx, ex, FY); return; }
      const hx = heroXNow + 5, hy = FY - heroHNow * 0.6;
      if (style.cast) playFx(style.cast, hx, hy, { center: true });
      fireBolt(style.proj, hx, hy, ex - 2, FY - (e.drawH || 16) * 0.55, ex, null);
    }
    // A warband unit: the PixelLab sprite for its rank's gear tier if there is one, else the procedural drawing.
    // Returns the top of the figure in scene units. Units lean in as they attack; legends (rank 5) glow cyan.
    function unitAt(i, x, fy, t, ph, r) {
      const s = unitSprite(i, r || 0);
      if (!s) return drawUnit(g, i, x, fy, t, ph, r);
      const bob = Math.sin(t * 3 + i) > 0.6 ? 1 : 0, lean = ph > 0.8 ? 1 : 0;
      return drawSprite(s, x + lean, fy - bob, { glow: r >= 5 ? 'rgba(127,224,245,0.8)' : null }).top;
    }
    // Event hats (party, pumpkin, santa, flower) sit on a sprite's head, drawn in scene units like the procedural ones.
    function spriteHat(s, cx, fy, hat) {
      const left = cx * FX - (s.ax != null ? s.ax : s.w / 2), top = Math.round(fy * FX) - (s.ay != null ? s.ay : s.h) + (s.ty || 0);
      const hx = Math.round((left + s.hx) / FX), hy = Math.round(top / FX);
      switch (hat) {
        case 'party': px(g, hx - 2, hy - 1, 5, 1, '#FF4F8B'); px(g, hx - 1, hy - 2, 3, 1, '#F2C14E'); px(g, hx - 1, hy - 3, 2, 1, '#7FE0F5'); px(g, hx, hy - 4, 1, 1, '#FF4F8B'); px(g, hx, hy - 5, 1, 1, '#FFFFFF'); break;
        case 'pumpkin': px(g, hx - 3, hy - 3, 7, 3, '#E8762A'); px(g, hx - 1, hy - 3, 1, 3, '#C85A1A'); px(g, hx + 1, hy - 3, 1, 3, '#C85A1A'); px(g, hx, hy - 4, 1, 1, '#4E7A3A'); break;
        case 'santa': px(g, hx - 3, hy - 1, 7, 1, '#F2EEDC'); px(g, hx - 2, hy - 3, 5, 2, '#C0392B'); px(g, hx + 3, hy - 3, 2, 1, '#C0392B'); px(g, hx + 5, hy - 2, 1, 1, '#FFFFFF'); break;
        case 'flower': px(g, hx - 3, hy - 1, 7, 1, '#5E8A3A'); px(g, hx - 3, hy - 2, 1, 1, '#FF9EC4'); px(g, hx - 1, hy - 2, 1, 1, '#F2C14E'); px(g, hx + 1, hy - 2, 1, 1, '#FFFFFF'); px(g, hx + 3, hy - 2, 1, 1, '#FF9EC4'); break;
        default: break;
      }
    }
    const bgC = document.createElement('canvas');
    const bg = bgC.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let CW = 0, CH = 0, DPR = 1, SCALE = 3, W = 0, H = 0, G = 0, FY = 0;
    // Field layout in scene units, set by resize: hero (HX), where enemies stand (SX), how far they walk in (ENTER),
    // the village's right edge (VX). WIDE is the landscape band of the browser layout.
    let HX = 57, SX = 80, ENTER = 35, VX = 46, WIDE = false;
    let bgKey = '';
    let floats = [], parts = [], coins = [], weather = [], shots = [];
    let heroSwing = 0, heroLunge = 0, shake = 0, flashT = 0, quietN = 0;
    const rankFx = {}, rankLabel = {};
    const st = { enemy: null };

    function resize() {
      const r = canvas.getBoundingClientRect();
      CW = Math.max(1, r.width); CH = Math.max(1, r.height);
      DPR = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.round(CW * DPR); canvas.height = Math.round(CH * DPR);
      // CSS px per scene unit, always even so fine pixels are whole. A phone-shaped scene is about 100 units wide;
      // a landscape band is about 100 units tall and as wide as it needs to be.
      WIDE = CW > CH * 1.5;
      SCALE = FX * Math.max(1, Math.round((WIDE ? CH : CW) / 200));
      W = Math.ceil(CW / SCALE); H = Math.ceil(CH / SCALE);
      if (WIDE) { HX = Math.round(W * 0.6); SX = HX + 26; VX = HX - 12; ENTER = W + 12 - SX; } // fighters keep their spacing; the village fills the left
      else { HX = Math.round(W * 0.57); SX = Math.round(W * 0.8); VX = Math.round(W * 0.46); ENTER = Math.round(W * 0.35); }
      for (const c of [low, bgC, spr, sil]) { c.width = W * FX; c.height = H * FX; }
      for (const c of [g, bg, sg]) { c.setTransform(FX, 0, 0, FX, 0, 0); c.imageSmoothingEnabled = false; }
      silg.imageSmoothingEnabled = false;
      G = Math.round(H * 0.64);          // horizon: where the ground starts
      FY = G + Math.round((H - G) * 0.42); // feet of the hero and the adventurers
      bgKey = '';
      weather = [];
    }

    // The PixelLab backdrop for a region, if there is one. Uncharted shards share one.
    // A landscape band uses the region's 512-wide panorama (bg-<r>-wide) when there is one.
    const bgSprite = (r) => {
      const id = r <= 11 ? 'bg-' + r : 'bg-shard';
      if (WIDE && SPRITES[id + '-wide']) { const we = entryOf(id + '-wide'); if (we.bg) return we; if (artPending(id + '-wide')) return null; }
      const e = entryOf(id);
      return e && e.bg ? e : null;
    };
    function paintBackground(R, r) {
      const art = bgSprite(r);
      const key = `${R.name},${W},${H},${art ? 1 : 0}`;
      if (key === bgKey) return;
      bgKey = key;
      if (art) {
        // the image's ground line sits on the scene's horizon (see blitBackdrop)
        const hz = art.horizon || Math.round(art.bg.h * 0.65);
        fine(bg, () => blitBackdrop(bg, bgC, art.bg, hz, G * FX, W * FX, H * FX));
        return;
      }
      const sky = bg.createLinearGradient(0, 0, 0, G);
      sky.addColorStop(0, R.sky[0]); sky.addColorStop(1, R.sky[1]);
      bg.fillStyle = sky; bg.fillRect(0, 0, W, H);
      const lum = (c) => { const [a, b, d] = rgb(c); return (a * 0.3 + b * 0.59 + d * 0.11) / 255; };
      const rnd = mulberry(77 + r);
      if (lum(R.sky[0]) < 0.25) {
        for (let k = 0; k < W * 0.35; k++) px(bg, rnd() * W, rnd() * G * 0.7, 1, 1, rnd() > 0.7 ? '#FFFFFF' : 'rgba(255,255,255,0.45)');
        px(bg, W * 0.5, 22, 4, 4, '#EDE6D0'); px(bg, W * 0.5 + 3, 22, 1, 1, R.sky[0]);
      }
      // far hills and near hills
      for (let x = 0; x < W; x++) {
        const y1 = G - 14 - Math.round(Math.sin(x * 0.045 + r) * 5 + Math.sin(x * 0.11 + r * 2) * 3);
        bg.fillStyle = shade(R.hills, 0.12); bg.fillRect(x, y1, 1, G - y1);
        const y2 = G - 6 - Math.round(Math.sin(x * 0.07 + r * 3) * 3 + Math.sin(x * 0.19) * 1.5);
        bg.fillStyle = R.hills; bg.fillRect(x, y2, 1, G - y2);
      }
      if (!ANIMATED_PROPS.has(r)) regionProps(bg, W, H, G, r, R, 0);
      // ground with dirt texture
      bg.fillStyle = R.ground; bg.fillRect(0, G, W, H - G);
      for (let k = 0; k < W * 1.2; k++) px(bg, rnd() * W, G + 1 + rnd() * (H - G), 1, 1, rnd() > 0.5 ? shade(R.ground, -0.18) : shade(R.ground, 0.1));
      px(bg, 0, G, W, 1, shade(R.ground, 0.2));
    }

    function weatherStep(R, dt, t) {
      if (reduce || R.fx === 'none') return;
      const want = Math.round(({ snow: 40, rain: 40, ash: 30, fireflies: 10, leaves: 10, wisps: 8, glitch: 6 }[R.fx] || 0) * Math.max(1, W / 100));
      while (weather.length < want) weather.push({ x: Math.random() * W, y: Math.random() * H, v: 0.5 + Math.random(), p: Math.random() * TAU });
      for (const w of weather) {
        switch (R.fx) {
          case 'snow': w.y += 8 * w.v * dt; w.x += Math.sin(t + w.p) * 3 * dt; px(g, w.x, w.y, 1, 1, '#FFFFFF'); break;
          case 'rain': w.y += 70 * w.v * dt; w.x -= 10 * dt; px(g, w.x, w.y, 1, 2, 'rgba(170,200,220,0.6)'); break;
          case 'ash': w.y += 5 * w.v * dt; w.x += 4 * dt; px(g, w.x, w.y, 1, 1, Math.sin(t * 3 + w.p) > 0.6 ? '#FF8A3D' : '#6A5A52'); break;
          case 'fireflies': w.x += Math.sin(t * 0.7 + w.p) * 4 * dt; w.y += Math.cos(t * 0.9 + w.p) * 3 * dt; if (Math.sin(t * 2 + w.p) > 0.3) px(g, w.x, w.y, 1, 1, '#E8F57A'); break;
          case 'leaves': w.y += 9 * w.v * dt; w.x += Math.sin(t * 2 + w.p) * 6 * dt; px(g, w.x, w.y, 1, 1, w.p > 3 ? '#D08A3A' : '#B8C45A'); break;
          case 'wisps': w.y -= 3 * w.v * dt; w.x += Math.sin(t + w.p) * 3 * dt; px(g, w.x, w.y, 1, 1, '#9FD8FF'); break;
          case 'glitch': if (Math.random() < 0.02) { w.x = Math.random() * W; w.y = Math.random() * H; } if (Math.sin(t * 13 + w.p) > 0.8) px(g, w.x, w.y, 3 + w.v * 3, 1, w.p > 3 ? '#FF4F8B' : '#7FE0F5'); break;
          default: break;
        }
        if (w.y > H + 2) { w.y = -2; w.x = Math.random() * W; }
        if (w.y < -3) { w.y = H; }
        if (w.x < -3) w.x = W + 2; if (w.x > W + 3) w.x = -2;
      }
    }

    // enemy layout: x where they stand, walking in from the right
    function enemyPos(e, now) {
      const p = Math.min(1, (now - e.born) / (e.walk * 1000));
      return { x: Math.round(SX + (1 - p) * ENTER), walking: p < 1, p };
    }

    // Until the first frame whose sprites have all arrived (or LOAD_WAIT ms), the scene shows a loading screen rather
    // than flashing the old procedural art; then the rest of the art is prefetched in the background.
    let gateOpen = false, gateT0 = 0;
    const LOAD_WAIT = 3000;
    function frame(dt, now, view) {
      if (!W) return;
      const t = now / 1000;
      const R = view.regionData;
      wanted = 0;
      if (!gateT0) gateT0 = performance.now();
      paintBackground(R, view.region);
      g.clearRect(0, 0, W, H);
      fine(g, () => g.drawImage(bgC, 0, 0));
      // animated bits of the procedural backdrop (a PixelLab backdrop has its own)
      if (ANIMATED_PROPS.has(view.region) && !bgSprite(view.region)) regionProps(g, W, H, G, view.region, R, t);
      weatherStep(R, dt, t);

      // ---- village
      // The village lives in a band of ground: VY is its back line (huts, tower), VF its front limit (the front row of
      // the warband). On a PixelLab backdrop both come from the image (sprites/bg/village.json: "v" units below the
      // horizon, "f" units below the fighters' feet), so huts stand on the walkable ground in front of the painted
      // skyline instead of floating on it. On the procedural backdrop the back line sits just above the horizon.
      const bgArt = bgSprite(view.region), lay = bgArt && bgArt.village;
      const lv = typeof lay === 'number' ? lay : lay && lay.v, lf = lay && typeof lay === 'object' ? lay.f : null;
      const VY = bgArt ? G + (lv != null ? lv : 6) : G - 3, VF = FY + (lf != null ? lf : 6);
      const vx = VX; // village edge
      // sprites are much bigger than the old procedural village, so a narrow (phone) scene shows a smaller one
      const narrow = !WIDE && !!sprite('hut', 'east');
      const pal = sprite('palisade', 'east'), tow = sprite('tower', 'east');
      if (view.tower && tow) drawSprite(tow, 9, VY + 1);
      else if (view.tower) { px(g, 4, VY - 31, 2, 30, '#6B4628'); px(g, 12, VY - 31, 2, 30, '#6B4628'); px(g, 2, VY - 35, 14, 4, '#7A5230'); px(g, 3, VY - 38, 12, 3, '#B8963A'); }
      const huts = Math.min(narrow ? 3 : 6, 2 + Math.floor(Math.log2(1 + view.goblins) / 1.6));
      // huts cluster into a settlement at the left, about a hut apart (closer when a narrow scene runs out of room)
      const hutX0 = view.tower ? 16 : 2;
      const hutStep = Math.min(15, (vx - 14 - hutX0) / Math.max(1, huts - 1));
      const settleX1 = Math.round(hutX0 + hutStep * (huts - 1) + 14); // the settlement's right edge
      for (let k = 0; k < huts; k++) {
        const hw2 = 9 + (k % 2) * 2, hx = hutX0 + Math.round(k * hutStep), hfy = VY - (k % 2) * 2;
        // conquered regions fly a banner over a hut
        const hs2 = sprite(k < view.conquered ? 'hut-banner' : 'hut', 'east') || sprite('hut', 'east');
        if (hs2) drawSprite(hs2, hx + hw2 / 2, hfy + 1);
        else hut(g, hx, hfy, hw2, k % 2 ? '#B8963A' : '#C9A64A', t, k < view.conquered);
      }
      if (view.palisade && pal) drawSprite(pal, vx - 1, Math.min(VY + 4, VF));
      else if (view.palisade) { for (let k = 0; k < 5; k++) { px(g, vx - 2, VY - 7 + k * 2, 2, 2, k % 2 ? '#7A5230' : '#6B4628'); } px(g, vx - 2, VY - 8, 1, 1, '#8B6A40'); }
      // campfire in front of the huts
      const fx2 = Math.round((hutX0 + settleX1) / 2);
      if (!loopFx('campfire', fx2, Math.min(VY + 6, VF), t, { base: true })) {
        px(g, fx2 - 2, VY + 5, 5, 1, '#3A2A1A');
        px(g, fx2 - 1, VY + 2 + (Math.sin(t * 9) > 0 ? 0 : 1), 3, 3, '#FF8A3D');
        px(g, fx2, VY + 1 + (Math.sin(t * 11) > 0 ? 0 : 1), 1, 2, '#FFE08A');
      }
      // a crowd of plain goblins grows with the village, milling about in front of the huts
      const crowd = Math.min(narrow ? 4 : 10, Math.floor(Math.log2(1 + view.goblins) * 1.2));
      for (let k = 0; k < crowd; k++) {
        const x = Math.round(5 + ((k * 37) % Math.max(10, settleX1 - 4))), bob = Math.sin(t * 2.5 + k * 1.7) > 0.7 ? 1 : 0, cy = Math.min(VY + 4 + (k % 2) * 2, VF);
        const cs = sprite('crowd-' + (k % 2), 'east') || sprite('crowd-0', 'east');
        if (cs) drawSprite(cs, x, cy - bob);
        else humanoid(g, x, cy, goblinLook({ h: 7, skin: k % 3 ? '#7FA650' : '#8DB85A', shirt: k % 2 ? '#5A4632' : '#4A3B28' }), { bob });
      }

      // units, newest types near the front: two rows on the ground, flyers hovering over the huts
      const owned = view.owned;
      const slots = [];
      for (let i = 0; i < owned.length; i++) if (owned[i] > 0) slots.push(i);
      const big = narrow && (unitSprite(0, 0) || unitSprite(1, 0));
      const ground = slots.filter((i) => i !== 8 && i !== 9 && i !== 10).slice(big ? -5 : 0);
      const air = slots.filter((i) => i === 8 || i === 9 || i === 10).slice(big ? -2 : 0);
      const ranks = view.ranks || [];
      const row0 = Math.round(VY + (VF - VY) * 0.45), row1 = VF - 1, flyY = VY - 16;
      air.forEach((i, k) => {
        const x = Math.round(hutX0 + 6 + k * 16 + Math.sin(t * 0.5 + k) * 3), fy = flyY - (k % 2) * 6 + Math.round(Math.sin(t * 1.6 + k) * 1.5);
        const ph = ((t * 0.5 + i * 0.37) % 1);
        const top = unitAt(i, x, fy, t, ph, ranks[i]);
        if (rankFx[i] > 0) rankBurst(i, x, top, fy, rankFx[i]);
        if (st.enemy && !st.enemy.dead && ph > 0.8 && ph - dt * 0.5 <= 0.8 && !reduce) shoot(i, x, fy - 4, ranks[i]);
      });
      ground.forEach((i, k) => {
        const row = k % 2;
        const x = Math.round(6 + (k * (vx - 6)) / Math.max(1, ground.length) + 4);
        const ph = ((t * (0.6 + i * 0.07) + i * 0.37) % 1);
        const fy = row ? row1 : row0;
        const top = unitAt(i, x, fy, t, ph, ranks[i]);
        if (rankFx[i] > 0) rankBurst(i, x, top, fy, rankFx[i]);
        if (st.enemy && !st.enemy.dead && ph > 0.8 && ph - dt * (0.6 + i * 0.07) <= 0.8 && !reduce) shoot(i, x, fy - 8, ranks[i]);
      });
      for (const k in rankFx) rankFx[k] = Math.max(0, rankFx[k] - dt);

      drawFxs(dt, 'behind');

      // ---- hero
      heroSwing = Math.max(0, heroSwing - dt * 6);
      heroLunge = Math.max(0, heroLunge - dt * 10);
      const heroX = Math.round(HX + heroLunge * 3);
      heroXNow = HX;
      const look = view.heroLook;
      // sprite frames: an attack animation after each swing, else an idle loop, else the still sprite with a bob
      const hset = entryOf(view.heroForm) || {};
      heroAnim = Math.min(1, heroAnim + dt / 0.32);
      if (heroPending) {
        const fr = hset.attack, sf = STRIKE_FRAME[view.heroForm];
        if (!fr || heroAnim >= (sf != null ? (sf + 0.3) / fr.length : RELEASE)) { heroPending = false; heroStrike(); }
      }
      let hs = hset.east, heroBob = Math.sin(t * 2.4) > 0.5 ? 1 : 0;
      if (hs && hset.attack && heroAnim < 1) { hs = hset.attack[Math.min(hset.attack.length - 1, Math.floor(heroAnim * hset.attack.length))]; heroBob = 0; }
      else if (hs && hset.idle) { hs = hset.idle[Math.floor(t * 6) % hset.idle.length]; heroBob = 0; }
      heroHurt = Math.max(0, heroHurt - dt);
      const heroTop = hs ? drawSprite(hs, heroX, FY - heroBob, { flash: heroHurt > 0 })
        : Object.assign(outlined((c) => humanoid(c, heroX, FY, look, { swing: heroSwing > 0 ? 1 - heroSwing : 0, bob: heroBob, t, flash: heroHurt > 0 })), { h: look.h });
      heroHNow = heroTop.h; heroFormNow = view.heroForm;
      // corruption flicker on the hero
      if (!reduce && Math.sin(t * 1.3) > 0.97) px(g, heroX - 3 + Math.floor(Math.random() * 6), heroTop.top + Math.floor(Math.random() * heroTop.h), 2, 1, '#FF4F8B');

      // ---- enemy
      const e = st.enemy;
      let ePos = null;
      if (e) {
        ePos = enemyPos(e, now);
        if (st.arriveFx && !ePos.walking) { playFx(st.arriveFx, ePos.x, FY); st.arriveFx = null; } // e.g. a boss's beam lands as it arrives
        // walking adventurers hop a unit every other step; idle ones breathe; a swing leans them at the hero
        const step = (k) => (ePos.walking ? (Math.sin((t * 3 + k) * TAU) > 0 ? 1 : 0) : (Math.sin(t * 3 + k) > 0.6 ? 1 : 0));
        if (e.raid) {
          // each member on its own: its class sprite, nothing while that sprite downloads, else the procedural figure
          let tallest = 0;
          [0, 2, 1].forEach((k) => { // the middle member stands in front
            const L = e.looks[k], s = lookSprite(L), x = ePos.x + (k - 1) * 12, fy = FY + (k === 1 ? 1 : -1) - (e.dead ? 0 : step(k));
            if (s) {
              tallest = Math.max(tallest, drawSprite(s, x, fy, { flash: e.flash > 0 }).h);
              if (EVENT_HATS.has(L.hat)) spriteHat(s, x, fy, L.hat);
            } else if (!lookPending(L)) {
              outlined((c) => humanoid(c, x, fy, L, { walk: ePos.walking ? t * 3 + k : 0, flash: e.flash > 0, bob: e.dead ? 0 : (Math.sin(t * 3 + k) > 0.6 ? 1 : 0) }));
              tallest = Math.max(tallest, L.h);
            }
          });
          e.drawH = tallest ? tallest + 2 : 0;
        } else if (!e.dead || e.deadT < 0.15) {
          const eid = lookSpriteId(e.look, [e.look.sprite, e.boss ? 'boss-' + slug(e.name) : null, e.whale ? 'whale' : null]);
          let es = eid ? sprite(eid, 'west') : null;
          const ringW = es ? Math.max(16, Math.round(es.w / FX) + 4) : 16;
          if (e.boss || e.ring) { // a glow ring under raid leaders and other special targets
            g.fillStyle = e.ring || 'rgba(242,193,78,0.25)';
            g.fillRect(ePos.x - ringW / 2, FY - 1, ringW, 2);
          }
          // an attack in progress: e.atk runs 0..1; the blow lands at RELEASE, melee fighters lunge at the hero
          const style = combatOf(eid, e.look.cls);
          let lunge = 0;
          if (e.atk != null) {
            const frames = eid && entryOf(eid).attack;
            if (frames && es) es = frames[Math.min(frames.length - 1, Math.floor(e.atk * frames.length))];
            if (style.kind === 'melee') lunge = Math.round(Math.sin(Math.min(1, e.atk) * Math.PI) * 8);
            else if (!frames) lunge = e.atk < 0.6 ? 1 : 0;
          }
          if (es) {
            const x = ePos.x - lunge, fy = FY - (e.atk != null ? 0 : step(0));
            e.drawH = drawSprite(es, x, fy, { flash: e.flash > 0, glow: e.outline || (e.boss ? 'rgba(242,193,78,0.9)' : null) }).h;
            if (EVENT_HATS.has(e.look.hat)) spriteHat(es, x, fy, e.look.hat);
          } else if (lookPending(e.look) || (e.boss && artPending('boss-' + slug(e.name)))) {
            e.drawH = 0; // its sprite is still downloading: draw nothing for a moment rather than the old procedural art
          } else {
            outlined((c) => humanoid(c, ePos.x, FY, e.look, { walk: ePos.walking ? t * 3 : 0, flash: e.flash > 0, swing: e.swing || 0, bob: Math.sin(t * 3) > 0.6 ? 1 : 0 }), e.outline || (e.boss ? 'rgba(242,193,78,0.9)' : null));
            e.drawH = 0;
          }
        }
        if (e.dead) e.deadT += dt;
        e.flash = Math.max(0, (e.flash || 0) - dt);
        e.swing = Math.max(0, (e.swing || 0) - dt * 3);
        // adventurers attack the hero every couple of seconds (bosses more often); raids just posture
        if (e.atk != null) {
          const eid = !e.raid && lookSpriteId(e.look, [e.look.sprite, e.boss ? 'boss-' + slug(e.name) : null, e.whale ? 'whale' : null]);
          const frames = eid && entryOf(eid).attack;
          e.atk += dt / (frames ? Math.max(0.45, frames.length / 12) : 0.45);
          const release = frames && STRIKE_FRAME[eid] != null ? (STRIKE_FRAME[eid] + 0.3) / frames.length : RELEASE;
          if (!e.fired && e.atk >= release) { e.fired = true; if (!e.dead) enemyStrike(e, ePos, combatOf(eid, e.look.cls)); }
          if (e.atk >= 1 || e.dead) e.atk = null;
        } else if (!e.raid && !e.dead && !ePos.walking && Math.random() < dt * (e.boss ? 0.8 : 0.45)) { e.atk = 0; e.fired = false; e.swing = 1; }
      }

      drawFxs(dt, 'front');
      drawBolts(dt);

      // projectiles from the village; some units' shots land with an impact effect
      for (let k = shots.length - 1; k >= 0; k--) {
        const s2 = shots[k];
        s2.p += dt * 2.2;
        if (s2.p >= 1 && ePos && !e.dead && SHOT_FX[s2.i] && fxs.length < 8 && Math.random() < 0.6) playFx(SHOT_FX[s2.i], ePos.x, FY);
        if (s2.p >= 1 || !ePos) { shots.splice(k, 1); continue; }
        const tx = ePos.x, ty = FY - 7;
        const x = s2.x + (tx - s2.x) * s2.p, y = s2.y + (ty - s2.y) * s2.p - Math.sin(s2.p * Math.PI) * s2.arc;
        px(g, x, y, s2.w, 1, s2.c);
      }

      // particles: dissolve + coins
      for (let k = parts.length - 1; k >= 0; k--) {
        const p = parts[k];
        p.t += dt;
        if (p.t > p.life) { parts.splice(k, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
        px(g, p.x, p.y, 1, 1, p.c);
      }

      // corruption: glitch bars tear across the scene
      if (view.glitch && !reduce) {
        const odds = view.glitch >= 2 ? 0.14 : 0.06;
        if (Math.random() < odds) {
          const n = 1 + Math.floor(Math.random() * (view.glitch >= 2 ? 3 : 2));
          for (let k = 0; k < n; k++) {
            const y = Math.floor(Math.random() * H), w = 6 + Math.random() * W * 0.4, x = Math.random() * (W - w);
            g.fillStyle = Math.random() < 0.5 ? 'rgba(255,79,139,0.55)' : 'rgba(127,224,245,0.5)';
            g.fillRect(Math.round(x), y, Math.round(w), 1);
            if (view.glitch >= 2 && Math.random() < 0.4) { const sx = Math.round((Math.random() - 0.5) * 6); fine(g, () => g.drawImage(low, 0, y * FX, W * FX, 2 * FX, sx * FX, y * FX, W * FX, 2 * FX)); }
          }
        }
      }

      // compose: low-res scene scaled up, screen shake on crits
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      shake = Math.max(0, shake - dt * 30);
      const sx2 = shake ? (Math.random() - 0.5) * shake : 0, sy2 = shake ? (Math.random() - 0.5) * shake : 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!gateOpen && (wanted === 0 || performance.now() - gateT0 > LOAD_WAIT)) { gateOpen = true; prefetchAll(); }
      if (!gateOpen) { drawLoading(now); return; }
      ctx.drawImage(low, 0, 0, W * FX, H * FX, Math.round(sx2 * DPR), Math.round(sy2 * DPR), W * SCALE * DPR, H * SCALE * DPR);
      if (flashT > 0) { ctx.fillStyle = `rgba(255,79,139,${flashT * 0.5})`; ctx.fillRect(0, 0, canvas.width, canvas.height); flashT = Math.max(0, flashT - dt * 1.5); }

      // ---- crisp text layer
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const S = SCALE;
      if (e && ePos && !(e.dead && e.deadT > 0.15)) {
        const ey = (FY - (e.drawH || (e.raid ? 20 : e.look.h)) - 3) * S;
        const big = e.boss || e.raid || e.special;
        const top = Math.max(big ? 36 : 22, ey - 6);
        ctx.textAlign = 'center';
        ctx.font = `700 ${big ? 14 : 13}px "Barlow SC", sans-serif`;
        const name = e.raid ? `<${e.guild}> raid party` : e.name;
        const lvl = `Lv ${e.level}`;
        const tw = ctx.measureText(`${lvl}  ${name}`).width;
        const ex = Math.max(tw / 2 + 6, Math.min(CW - tw / 2 - 6, ePos.x * S));
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(`${lvl}  ${name}`, ex + 1, top - 9 + 1);
        ctx.fillStyle = e.nameColor || (e.boss ? '#F2C14E' : (e.raid ? '#FF8A6A' : (e.npc ? '#9FD8FF' : '#EFE6D2')));
        ctx.fillText(`${lvl}  ${name}`, ex, top - 9);
        if ((e.boss || e.special) && e.guild) {
          ctx.font = `600 12px "Barlow SC", sans-serif`;
          ctx.fillStyle = 'rgba(239,230,210,0.75)';
          ctx.fillText(`<${e.guild}>`, ex, top - 22);
        }
        const bw2 = e.boss || e.raid || e.special ? 84 : 60;
        const frac = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(ex - bw2 / 2 - 1, top - 4, bw2 + 2, 6);
        ctx.fillStyle = '#5A1A14'; ctx.fillRect(ex - bw2 / 2, top - 3, bw2, 4);
        ctx.fillStyle = '#E0533D'; ctx.fillRect(ex - bw2 / 2, top - 3, bw2 * frac, 4);
      }
      ctx.textAlign = 'center';
      for (let k = floats.length - 1; k >= 0; k--) {
        const f2 = floats[k];
        f2.t += dt / f2.life;
        if (f2.t >= 1) { floats.splice(k, 1); continue; }
        ctx.globalAlpha = 1 - f2.t * f2.t;
        ctx.font = `700 ${f2.size}px "Barlow SC", sans-serif`;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(f2.text, f2.x + 1, f2.y - f2.t * f2.rise + 1);
        ctx.fillStyle = f2.c;
        ctx.fillText(f2.text, f2.x, f2.y - f2.t * f2.rise);
      }
      ctx.globalAlpha = 1;
      // coins flying to the shinies counter
      for (let k = coins.length - 1; k >= 0; k--) {
        const c = coins[k];
        c.t += dt * 1.6;
        if (c.t >= 1) { coins.splice(k, 1); continue; }
        const e2 = c.t * c.t;
        const x = c.x + (CW - 36 - c.x) * e2 + Math.sin(c.t * Math.PI) * c.dx;
        const y = c.y + (18 - c.y) * e2 - Math.sin(c.t * Math.PI) * 30;
        ctx.fillStyle = '#F2C14E';
        ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
        ctx.fillStyle = '#FFE9A8';
        ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 2, 2);
      }
    }

    // The loading screen: the night colour and a quiet System line, while the first scene's art downloads.
    function drawLoading(now) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#16130F'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.textAlign = 'center';
      ctx.font = '600 14px "Pixelify Sans", monospace';
      ctx.fillStyle = `rgba(127,224,245,${0.45 + 0.35 * Math.sin(now / 300)})`;
      ctx.fillText('Loading world data' + '...'.slice(0, 1 + Math.floor(now / 400) % 3), CW / 2, CH * 0.55);
    }

    // a column of light and sparks over a force that just ranked up
    function rankBurst(i, x, top, fy, left) {
      if (rankLabel[i]) { // the new rank's name floats up from the force
        floats.push({ x: x * SCALE, y: (top - 3) * SCALE, text: rankLabel[i], t: 0, life: 1.8, rise: 34, size: 16, c: '#F2C14E' });
        rankLabel[i] = null;
        if (playFx('rankup', x, fy)) rankFx[i] = 0; // the VFX replaces the procedural column of light
      }
      if (!rankFx[i]) return;
      const a = Math.min(1, left);
      g.fillStyle = `rgba(242,193,78,${(0.4 * a).toFixed(2)})`;
      g.fillRect(x - 5, top - 8, 11, fy - top + 8);
      for (let n = 0; n < 12; n++) {
        const p = ((2 - left) * 1.4 + n / 8) % 1;
        px(g, x - 6 + ((n * 5) % 13), fy - p * (fy - top + 12), 1, 1, n % 2 ? '#FFE08A' : '#7FE0F5');
      }
    }
    function shoot(i, x, y, r) {
      r = r || 0;
      const spec = {
        0: ['#C8CED6', 2, 8], 1: ['#9A9A9A', 1, 10], 2: null, 3: null, 4: ['#FF8A3D', 2, 14], 5: ['#3DDC84', 2, 4],
        6: ['#8A8E96', 2, 20], 7: ['#C8CED6', 2, 2], 8: ['#3A3A40', 1, 0], 9: ['#FF4F8B', 2, 0], 10: ['#B6FF8A', 2, 4], 11: ['#3DDC84', 3, 0],
      }[i];
      if (!spec || shots.length > 30) return;
      shots.push({ i, x, y, p: 0, c: r >= 5 ? '#7FE0F5' : spec[0], w: spec[1] + (r >= 3 ? 1 : 0), arc: spec[2] });
    }

    function enemyScreen() {
      const e = st.enemy;
      if (!e) return { x: SX * SCALE, y: CH * 0.6 };
      const p = enemyPos(e, performance.now());
      return { x: p.x * SCALE, y: (FY - (e.drawH ? e.drawH * 0.6 : (e.raid ? 14 : e.look.h * 0.6))) * SCALE };
    }

    return {
      resize,
      get enemy() { return st.enemy; },
      setEnemy(e) { st.enemy = e; st.arriveFx = null; },
      // The next hit plays no hit/crit VFX (a trick that brings its own effect, like Gank).
      skipNextHitFx() { skipHitFx = true; },
      enemyArrived(now) { const e = st.enemy; return e && !e.dead && now - e.born >= e.walk * 1000; },
      // the swing's effect lands on the form's strike frame; a tap during a swing lands the pending one at once
      heroAttack() { if (heroPending) heroStrike(); heroPending = true; heroSwing = 1; heroLunge = 1; heroAnim = 0; },
      hit(amount, crit, text, quiet) {
        const e = st.enemy; if (!e) return;
        if (quiet && !crit) { quietN++; if (quietN % 3) return; }
        else { e.flash = 0.08; if (skipHitFx) skipHitFx = false; else playFx(crit ? 'crit' : 'hit', enemyPos(e, performance.now()).x, FY); }
        const p = enemyScreen();
        if (floats.length > 24) floats.shift();
        floats.push({ x: p.x + (Math.random() - 0.5) * 30, y: p.y - 10, text, t: 0, life: crit ? 1.1 : 0.8, rise: crit ? 46 : 34, size: crit ? 19 : 14, c: crit ? '#FF4F8B' : '#EFE6D2' });
        if (crit && !reduce) shake = 4;
      },
      float(text, color, big) {
        const p = enemyScreen();
        floats.push({ x: p.x, y: p.y - 30, text, t: 0, life: 1.4, rise: 40, size: big ? 18 : 13, c: color || '#F2C14E' });
      },
      kill(n) {
        const e = st.enemy; if (!e) return;
        e.dead = true; e.deadT = 0;
        const p = enemyPos(e, performance.now());
        const cols = e.raid ? ['#E0533D', '#FF8A6A', '#EFE6D2'] : [e.look.robe || e.look.shirt || '#9A3B32', e.look.skin, '#EFE6D2', '#7FE0F5'];
        // the despawn VFX (one per raid member) replaces the procedural dissolve; loot coins pop out too
        let poof = false;
        const big = (e.boss || e.special) && VFX['kill-boss'] ? 'kill-boss' : 'kill';
        for (const dx of e.raid ? [-12, 0, 12] : [0]) poof = playFx(big, p.x + dx, FY) || poof;
        playFx('coins', p.x, FY);
        if (!reduce && !poof) for (let k = 0; k < (e.boss || e.raid ? 50 : 22); k++) {
          parts.push({ x: p.x + (Math.random() - 0.5) * (e.raid ? 24 : 6), y: FY - Math.random() * (e.drawH || (e.raid ? 16 : e.look.h)), vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 18, g: -4, t: 0, life: 0.6 + Math.random() * 0.6, c: cols[k % cols.length] });
        }
        const s2 = enemyScreen();
        for (let k = 0; k < Math.min(12, n || 4); k++) coins.push({ x: s2.x, y: s2.y, t: -k * 0.05, dx: (Math.random() - 0.5) * 60 });
      },
      corruptFlash() { flashT = 1; shake = 6; playFx('corrupt', heroXNow, FY); },
      // Play a named VFX at the hero, the current enemy, where enemies stand, or the middle of the field.
      fx(name, where) {
        const e = st.enemy;
        if (where === 'arrive') { st.arriveFx = name; return true; } // plays when the current enemy finishes walking in
        const x = where === 'hero' ? heroXNow
          : where === 'enemy' && e ? enemyPos(e, performance.now()).x
          : where === 'center' ? Math.round((HX + SX) / 2) : SX;
        return playFx(name, x, FY);
      },
      rankUp(i, label) { rankFx[i] = reduce ? 0.01 : 2; rankLabel[i] = label || 'Rank up!'; },
      frame,
    };
  }

  // ------------------------------------------------------------------ the town
  // Each building is drawn around a centre x with its base on fy. L is its level (1 and up).
  const SMOKE = 'rgba(200,196,188,0.55)';
  function smoke(g, x, y, t, k) {
    for (let n = 0; n < 3; n++) {
      const p = ((t * 0.35 + n / 3 + (k || 0)) % 1);
      px(g, x + Math.round(Math.sin(p * 5 + n) * 1.2 + p * 2), y - Math.round(p * 7), 1 + (p > 0.5 ? 1 : 0), 1, SMOKE);
    }
  }
  function roofTri(g, x, y, w, h, c) {
    for (let k = 0; k < h; k++) {
      const ww = Math.max(1, Math.round(w * (k + 1) / h));
      px(g, x + Math.round((w - ww) / 2), y + k, ww, 1, k % 2 ? shade(c, -0.12) : c);
    }
  }
  function stakes(g, cx, fy) {
    px(g, cx - 4, fy - 3, 1, 3, '#8B6A40'); px(g, cx + 3, fy - 3, 1, 3, '#8B6A40');
    px(g, cx - 3, fy - 3, 6, 1, 'rgba(239,230,210,0.35)');
  }

  const BUILD_ART = {
    farm(g, cx, fy, L, t) {
      const rows = Math.min(3, 1 + Math.floor(L / 4)), w = 14;
      for (let r = 0; r < rows; r++) {
        const y = fy - r * 2;
        px(g, cx - w / 2, y - 1, w, 1, '#3A2A1A');
        for (let k = 0; k < w; k += 2) {
          const sway = Math.sin(t * 1.5 + k + r) > 0.85 ? 1 : 0;
          px(g, cx - w / 2 + k, y - 2, 1, 1, '#E6D8B8');
          px(g, cx - w / 2 + k - sway, y - 3, 2, 1, (k + r) % 4 ? '#C8463A' : '#B8833A');
        }
      }
      px(g, cx - w / 2 - 2, fy - 4, 1, 4, '#8B6A40'); px(g, cx + w / 2 + 1, fy - 4, 1, 4, '#8B6A40');
      if (L >= 6) { px(g, cx + w / 2 + 3, fy - 3, 3, 3, '#6B4A2A'); px(g, cx + w / 2 + 4, fy - 4, 1, 1, '#E6D8B8'); } // grub barrel
    },
    lumber(g, cx, fy, L, t) {
      px(g, cx - 6, fy - 2, 3, 2, '#7A5230'); px(g, cx - 6, fy - 2, 3, 1, '#C9A06A');
      px(g, cx - 5, fy - 5, 1, 3, '#8B5A2B'); px(g, cx - 5, fy - 6, 2, 1, '#C8CED6');
      const piles = Math.min(6, 1 + Math.floor(L / 3));
      let n = 0;
      for (let row = 0; n < piles; row++) {
        for (let k = 0; k < 3 - row && n < piles; k++, n++) {
          const x = cx - 1 + k * 3 + row * 1.5, y = fy - 2 - row * 2;
          px(g, x, y, 3, 2, '#8B5A2B'); px(g, x + 2, y, 1, 2, '#C9A06A');
        }
      }
    },
    shed(g, cx, fy, L, t) {
      const x = cx - 5;
      px(g, x, fy - 6, 10, 6, '#6B5236'); px(g, x, fy - 6, 1, 6, '#4A3826');
      roofTri(g, x - 1, fy - 9, 12, 3, '#5A6A72');
      px(g, x + 6, fy - 4, 3, 4, '#2A1E14');
      const r = Math.floor(t * 4) % 2;
      px(g, x + 2, fy - 5, 3, 3, '#B8B0A0'); px(g, x + 3 - r, fy - 4 + r, 1 + r * 0, 1, '#4A4F5E');
      px(g, x + 3, fy - 4, 1, 1, '#4A4F5E');
      if (Math.sin(t * 3) > 0.6) px(g, x + 1, fy - 7, 1, 1, '#7FE0F5');
      if (L >= 5) px(g, x + 9, fy - 11, 1, 3, '#8A8E96');
      if (L >= 5) smoke(g, x + 9, fy - 12, t, 0.3);
    },
    feast(g, cx, fy, L, t, o) {
      const w = 18, x = cx - w / 2;
      px(g, x, fy - 6, w, 6, '#6B5236'); px(g, x, fy - 6, 1, 6, '#4A3826');
      roofTri(g, x - 1, fy - 10, w + 2, 4, '#8A3A2A');
      const glow = Math.sin(t * 9) > 0 ? '#FFB23D' : '#FF8A3D';
      px(g, cx - 1, fy - 4, 3, 4, glow);
      px(g, x + 3, fy - 4, 2, 2, '#F2C14E'); px(g, x + w - 5, fy - 4, 2, 2, '#F2C14E');
      px(g, x + w - 4, fy - 13, 2, 3, '#4A3826'); smoke(g, x + w - 3, fy - 14, t);
      if (L >= 4) for (let k = 0; k < 3; k++) px(g, x + 3 + k * 6, fy - 11, 1, 1, '#9BC46A');
      if (o && o.feast) { // a feast spills out the door
        px(g, x + 2, fy + 2, w - 4, 1, '#7A5230'); px(g, x + 3, fy + 3, 1, 1, '#5A4632'); px(g, x + w - 4, fy + 3, 1, 1, '#5A4632');
        for (let k = 0; k < 5; k++) px(g, x + 3 + k * 3, fy + 1, 1, 1, ['#C8463A', '#F2C14E', '#9BC46A', '#E8A65E', '#C8463A'][k]);
      }
    },
    healer(g, cx, fy, L, t) {
      const x = cx - 4;
      px(g, x, fy - 5, 8, 5, '#7A6248'); px(g, x, fy - 5, 1, 5, '#5A4632');
      for (let k = 0; k < 4; k++) px(g, x - 1 + k, fy - 6 - k, 10 - k * 2, 1, k % 2 ? '#5A7A3A' : '#6E8E46');
      px(g, x + 3, fy - 3, 2, 3, '#2A1E14');
      px(g, x + 9, fy - 2, 2, 2, '#8A6A40'); px(g, x + 9, fy - 4, 1, 2, '#6ECB5A'); px(g, x + 10, fy - 3, 1, 1, '#6ECB5A');
      if (Math.sin(t * 2) > 0.7) px(g, x + 5, fy - 9, 1, 1, '#B6FF8A');
    },
    quarry(g, cx, fy, L, t) {
      const steps = Math.min(4, 2 + Math.floor(L / 5));
      for (let k = 0; k < steps; k++) px(g, cx - 7 + k * 2, fy - 2 - k * 2, 14 - k * 4, 2, k % 2 ? '#8A8A94' : '#9A9AA4');
      px(g, cx + 4, fy - 2, 2, 2, '#B4B4BE'); px(g, cx + 6, fy - 1, 2, 1, '#A8A8B0');
      px(g, cx - 2, fy - 2 - steps * 2, 1, 2, '#8B5A2B'); px(g, cx - 3, fy - 3 - steps * 2, 3, 1, '#C8CED6');
    },
    mine(g, cx, fy, L, t, o) {
      for (let k = 0; k < 8; k++) px(g, cx - 8 + k, fy - k * 0.9 - 1, 16 - k * 2 + 2, 1, shade(o.hills, k % 2 ? -0.05 : 0.05));
      px(g, cx - 2, fy - 5, 4, 5, '#14100C'); px(g, cx - 3, fy - 6, 6, 1, '#7A5230'); px(g, cx - 3, fy - 5, 1, 5, '#7A5230'); px(g, cx + 2, fy - 5, 1, 5, '#7A5230');
      px(g, cx - 1, fy - 1, 9, 1, '#5A5662');
      const cart = cx + 4 + Math.round(Math.sin(t * 0.6) * 1.5);
      px(g, cart, fy - 3, 3, 2, '#5A5662'); px(g, cart, fy - 4, 3, 1, '#9CC0D8');
      if (L >= 5 && Math.sin(t * 7) > 0.8) px(g, cx, fy - 3, 1, 1, '#F2C14E');
    },
    pit(g, cx, fy, L, t) {
      for (let k = -7; k <= 7; k += 2) px(g, cx + k, fy - 2 - (Math.abs(k) < 4 ? 1 : 0), 1, 2, '#8B6A40');
      px(g, cx - 7, fy - 2, 15, 1, '#7A5230');
      const hit = Math.sin(t * 5) > 0.7 ? 1 : 0;
      px(g, cx + hit, fy - 7, 1, 6, '#C9A64A'); px(g, cx - 2 + hit, fy - 5, 5, 1, '#C9A64A'); px(g, cx - 1 + hit, fy - 8, 3, 2, '#D8C080');
      px(g, cx - 1 + hit, fy - 6, 1, 1, '#9A3B32');
    },
    library(g, cx, fy, L, t) {
      const x = cx - 5;
      px(g, x, fy - 11, 10, 11, '#6A6460'); px(g, x, fy - 11, 1, 11, '#4E4844');
      roofTri(g, x - 1, fy - 15, 12, 4, '#3B4F7A');
      for (let r = 0; r < 2; r++) for (let k = 0; k < 2; k++) {
        px(g, x + 2 + k * 4, fy - 9 + r * 4, 2, 2, Math.sin(t * 0.8 + r + k) > 0.3 ? '#F2C14E' : '#B88A3A');
      }
      px(g, x + 4, fy - 3, 2, 3, '#2A1E14');
      px(g, x + 10, fy - 13, 1, 9, '#5A4632'); px(g, x + 11, fy - 13 + (Math.sin(t * 3) > 0 ? 0 : 1), 3, 3, '#7FA0E0');
    },
    forge(g, cx, fy, L, t) {
      const x = cx - 5;
      px(g, x, fy - 6, 10, 6, '#5A5662'); px(g, x, fy - 6, 1, 6, '#3E3A46');
      px(g, x - 1, fy - 7, 12, 1, '#4A4652');
      px(g, x + 6, fy - 14, 3, 8, '#4A4652'); smoke(g, x + 7, fy - 15, t, 0.5); smoke(g, x + 7, fy - 15, t, 0.15);
      px(g, x + 2, fy - 4, 3, 3, Math.sin(t * 12) > 0 ? '#FF8A3D' : '#FF5A2A');
      px(g, x + 11, fy - 3, 4, 1, '#2E2E36'); px(g, x + 12, fy - 2, 2, 2, '#2E2E36');
      if (Math.sin(t * 4) > 0.75) { px(g, x + 13, fy - 5, 1, 1, '#FFE08A'); px(g, x + 15, fy - 4, 1, 1, '#FFB23D'); }
    },
    bath(g, cx, fy, L, t) {
      const w = 14, x = cx - w / 2;
      px(g, x, fy - 6, w, 6, '#9A968E'); px(g, x, fy - 6, 1, 6, '#7A766E');
      for (let k = 0; k < 3; k++) px(g, x + 1 + k, fy - 7 - k, w - 2 - k * 2, 1, '#6A8AA0');
      px(g, x + 3, fy - 4, 3, 4, '#2A2420'); px(g, x + 8, fy - 4, 3, 2, '#7FB8D0');
      for (let n = 0; n < 4; n++) {
        const p = ((t * 0.25 + n / 4) % 1);
        px(g, x + 3 + n * 3 + Math.round(Math.sin(p * 6 + n)), fy - 10 - Math.round(p * 6), 1, 1, `rgba(255,255,255,${(0.6 * (1 - p)).toFixed(2)})`);
      }
    },
    market(g, cx, fy, L, t) {
      const x = cx - 6;
      px(g, x, fy - 7, 1, 7, '#7A5230'); px(g, x + 11, fy - 7, 1, 7, '#7A5230');
      for (let k = 0; k < 12; k++) px(g, x + k, fy - 9, 1, 2, k % 2 ? '#EFE6D2' : '#C0392B');
      px(g, x, fy - 3, 12, 3, '#8B6A40');
      const goods = ['#F2C14E', '#9CC0D8', '#C8463A', '#9BC46A', '#F2C14E'];
      for (let k = 0; k < 5; k++) px(g, x + 1 + k * 2, fy - 4, 1, 1, goods[k]);
      if (Math.sin(t * 2.2) > 0.8) px(g, x + 6, fy - 6, 1, 1, '#F2C14E');
    },
    hall(g, cx, fy, L, t) {
      const w = 14, x = cx - w / 2;
      px(g, x, fy - 7, w, 7, '#7A6A58'); px(g, x, fy - 7, 1, 7, '#5A4C3E');
      roofTri(g, x - 1, fy - 10, w + 2, 3, '#3B4F7A');
      px(g, cx - 2, fy - 13, 4, 3, '#6A5A48'); roofTri(g, cx - 3, fy - 15, 6, 2, '#3B4F7A');
      px(g, cx - 1, fy - 12 + (Math.sin(t * 2) > 0.9 ? 1 : 0), 2, 1, '#E8B43A');
      px(g, cx - 1, fy - 4, 3, 4, '#2A1E14');
      px(g, x + 2, fy - 6, 2, 2, '#F2C14E'); px(g, x + w - 4, fy - 6, 2, 2, '#F2C14E');
      if (L >= 5) { px(g, x + w, fy - 13, 1, 6, '#5A4632'); px(g, x + w + 1, fy - 13 + (Math.sin(t * 3) > 0 ? 0 : 1), 3, 2, '#9BC46A'); }
    },
    camp(g, cx, fy, L, t) {
      if (L >= 3) { roofTri(g, cx - 9, fy - 5, 7, 5, '#9A7A3A'); px(g, cx - 6, fy - 2, 1, 2, '#3A2A1A'); }
      roofTri(g, cx - 4, fy - 7, 9, 7, '#B8963A'); px(g, cx, fy - 3, 1, 3, '#3A2A1A');
      px(g, cx + 6, fy - 9, 1, 9, '#5A4632'); px(g, cx + 7, fy - 9 + (Math.sin(t * 3) > 0 ? 0 : 1), 3, 2, '#C0392B');
      px(g, cx - 6, fy - 2, 2, 2, '#7A5230'); px(g, cx - 6, fy - 3, 2, 1, '#8B6A40');
    },
    vault(g, cx, fy, L, t) {
      const x = cx - 5;
      px(g, x, fy - 9, 10, 9, '#4A4652'); px(g, x, fy - 9, 1, 9, '#36323E'); px(g, x - 1, fy - 10, 12, 1, '#5A5662');
      px(g, x + 3, fy - 6, 4, 6, '#1A1420');
      const rr = mulberry(Math.floor(t * 6) + 7);
      for (let k = 0; k < 5; k++) px(g, x + 3 + Math.floor(rr() * 4), fy - 6 + Math.floor(rr() * 6), 1, 1, rr() > 0.5 ? '#FF4F8B' : '#7FE0F5');
      if (L >= 5) { px(g, x + 8, fy - 13, 1, 3, '#8A8E96'); if (Math.sin(t * 4) > 0.3) px(g, x + 8, fy - 14, 1, 1, '#FF4F8B'); }
    },
    shrine(g, cx, fy, L, t) {
      const x = cx - 5;
      px(g, x, fy - 12, 2, 12, '#6A6460'); px(g, x + 8, fy - 12, 2, 12, '#6A6460'); px(g, x - 1, fy - 13, 12, 2, '#7A746E');
      const rr = mulberry(Math.floor(t * 8));
      for (let k = 0; k < 14; k++) px(g, x + 2 + Math.floor(rr() * 6), fy - 11 + Math.floor(rr() * 11), 1, 1, rr() > 0.5 ? '#FF4F8B' : '#7FE0F5');
      px(g, x + 2, fy - 1, 6, 1, '#7FE0F5');
    },
  };
  // A cluster of huts for the housing level; longhouses are wider.
  function hutsArt(g, x0, x1, fy, L, t, longhouses) {
    const n = Math.min(7, 1 + Math.floor((L - 1) / 2));
    const w = longhouses ? 12 : 9;
    for (let k = 0; k < n; k++) {
      const x = Math.round(x0 + (n === 1 ? (x1 - x0 - w) / 2 : k * (x1 - x0 - w) / (n - 1)));
      const y = fy - (k % 2 ? 2 : 0);
      hut(g, x, y, w - (k % 3 === 2 ? 1 : 0), k % 2 ? '#B8963A' : '#C9A64A', t, false);
      if (L >= 10 && k % 3 === 0) smoke(g, x + 2, y - Math.round(w * 1.05) - 1, t, k * 0.2);
    }
  }
  function wallsArt(g, W, fyB, fyF, L) {
    const stone = L >= 4, tall = stone ? 9 : 6;
    for (const side of [0, 1]) {
      const x = side ? W - 4 : 0;
      for (let y = fyB - tall; y < fyF; y += 2) px(g, x, y, 4, 2, stone ? ((y >> 1) % 2 ? '#8A8A94' : '#7A7A84') : ((y >> 1) % 2 ? '#7A5230' : '#6B4628'));
      if (stone) for (let k = 0; k < 2; k++) px(g, x + k * 2, fyB - tall - 1, 1, 1, '#8A8A94');
      else px(g, x + 1, fyB - tall - 1, 2, 1, '#8B6A40');
      if (L >= 8) { px(g, x, fyB - tall - 6, 4, 5, '#6A6A74'); px(g, x + 1, fyB - tall - 4, 2, 1, '#2A2420'); px(g, x + 1, fyB - tall - 8, 1, 2, '#5A4632'); px(g, x + 2, fyB - tall - 8, 2, 1, '#9BC46A'); }
    }
  }

  const TOWN_SPOTS = {
    back: [['mine', 0.07], ['quarry', 0.15], ['hall', 0.475], ['library', 0.575], ['feast', 0.675], ['bath', 0.795], ['shrine', 0.915]],
    front: [['farm', 0.08], ['lumber', 0.185], ['shed', 0.29], ['forge', 0.395], ['healer', 0.5], ['market', 0.605], ['pit', 0.71], ['camp', 0.815], ['vault', 0.915]],
  };
  const JOB_ITEM = { forager: '#C8463A', woodcutter: '#8B5A2B', stonecutter: '#B4B4BE', miner: '#9CC0D8', tinkerer: '#7FE0F5', guard: '#C8CED6' };

  function createTownView(canvas) {
    const ctx = canvas.getContext('2d');
    const low = document.createElement('canvas');
    const g = low.getContext('2d');
    const bgC = document.createElement('canvas');
    const bg = bgC.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let CW = 0, CH = 0, DPR = 1, SCALE = 3, W = 0, H = 0, G = 0, FB = 0, FF = 0, bgKey = '';
    let folk = [];
    let bubble = null;
    const R = { sky: ['#30485A', '#7A9AA0'], hills: '#3A5232', ground: '#4E3E2A' };
    // The canvases are in art pixels, TS CSS px each, about 128 art px tall. PixelLab sprites draw 1:1 in art pixels;
    // the procedural drawings work in units of TF art pixels (about 43 units tall) through a transform, so they keep
    // their old look. Layout (G, FB, FF, folk x/y) stays in units; SCALE is CSS px per unit.
    const TF = 3;
    let TS = 1;
    const idt = (c, fn) => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); fn(); c.restore(); };

    function resize() {
      const r = canvas.getBoundingClientRect();
      CW = Math.max(1, r.width); CH = Math.max(1, r.height);
      DPR = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.round(CW * DPR); canvas.height = Math.round(CH * DPR);
      TS = Math.max(1, Math.round(CH / 128));
      SCALE = TS * TF;
      W = Math.ceil(CW / SCALE); H = Math.ceil(CH / SCALE);
      for (const c of [low, bgC]) { c.width = W * TF; c.height = H * TF; }
      for (const c of [g, bg]) { c.setTransform(TF, 0, 0, TF, 0, 0); c.imageSmoothingEnabled = false; }
      G = Math.round(H * 0.36);
      FB = G + 5;
      FF = H - 4;
      bgKey = '';
    }
    // The season's PixelLab backdrop (bg-town-<season>), if any. Its "horizon" in horizons.json is the row of the
    // painted road, which lands on the road the villagers walk.
    const townBg = (season) => { const e = entryOf('bg-town-' + season); return e && e.bg ? e : null; };
    const roadRow = () => Math.round((FB + FF) / 2) + 1;
    function paint(season) {
      const art = townBg(season);
      const key = `${W},${H},${season},${art ? 1 : 0}`;
      if (key === bgKey) return;
      bgKey = key;
      if (art) { idt(bg, () => blitBackdrop(bg, bgC, art.bg, art.horizon || Math.round(art.bg.h * 0.7), roadRow() * TF, W * TF, H * TF)); return; }
      const sky = bg.createLinearGradient(0, 0, 0, G);
      sky.addColorStop(0, R.sky[0]); sky.addColorStop(1, R.sky[1]);
      bg.fillStyle = sky; bg.fillRect(0, 0, W, H);
      const rnd = mulberry(4242);
      for (let x = 0; x < W; x++) {
        const y1 = G - 6 - Math.round(Math.sin(x * 0.05) * 3 + Math.sin(x * 0.13 + 1) * 2);
        bg.fillStyle = shade(R.hills, 0.14); bg.fillRect(x, y1, 1, G - y1);
        const y2 = G - 2 - Math.round(Math.sin(x * 0.09 + 2) * 2);
        bg.fillStyle = R.hills; bg.fillRect(x, y2, 1, G - y2 + 1);
      }
      bg.fillStyle = R.ground; bg.fillRect(0, G, W, H - G);
      for (let k = 0; k < W * 1.4; k++) px(bg, rnd() * W, G + 1 + rnd() * (H - G), 1, 1, rnd() > 0.5 ? shade(R.ground, -0.16) : shade(R.ground, 0.09));
      // the dirt road through the middle
      const ry = Math.round((FB + FF) / 2) - 1;
      bg.fillStyle = shade(R.ground, 0.12); bg.fillRect(0, ry - 2, W, 4);
      for (let k = 0; k < W; k += 3) px(bg, k + rnd() * 2, ry - 2 + rnd() * 4, 1, 1, shade(R.ground, 0.2));
      px(bg, 0, G, W, 1, shade(R.ground, 0.2));
    }

    function syncFolk(view) {
      const want = Math.min(16, Math.max(3, Math.round(view.pop * 0.6)));
      const jobs = [];
      for (const id in view.jobs) for (let k = 0; k < view.jobs[id]; k++) jobs.push(id);
      while (folk.length < want) {
        folk.push({ x: 8 + Math.random() * (W - 16), dy: (folk.length % 3) - 2, tx: 0, wait: Math.random() * 2, f: 1, k: folk.length, job: null });
      }
      folk.length = want;
      folk.forEach((p, i) => { p.job = jobs.length ? jobs[Math.floor((i * jobs.length) / want)] : null; });
    }

    // ---- PixelLab sprites in the town. Each helper draws the sprite and returns true, returns true without drawing
    // while that art is still downloading (so the old drawing never flashes), and returns false when there is no art.
    function drawS(sp, x, fy, flip) { // 1:1 in art pixels, centred on x (units) with its feet on fy (units)
      const X = Math.round(x * TF), dx = Math.round(X - (sp.ax != null ? sp.ax : sp.w / 2)), dy = Math.round(fy * TF) - (sp.ay != null ? sp.ay : sp.h);
      idt(g, () => { if (flip) { g.translate(2 * X, 0); g.scale(-1, 1); } g.drawImage(sp.img, sp.x, sp.y, sp.w, sp.h, dx, dy, sp.w, sp.h); });
    }
    // buildings come in three tiers: levels 1-3, 4-7 and 8+ (town-<id>/t0, t1, t2)
    function tierSprite(id, L) { for (let k = L >= 8 ? 2 : L >= 4 ? 1 : 0; k >= 0; k--) { const sp = sprite('town-' + id, 't' + k); if (sp) return sp; } return null; }
    function bldSpr(id, x, fy, L) { const sp = tierSprite(id, L); if (sp) { drawS(sp, x, fy); return true; } return artPending('town-' + id); }
    function plotSpr(x, fy) { const sp = sprite('town-plot', 'east'); if (sp) { drawS(sp, x, fy); return true; } return artPending('town-plot'); }
    function hutsSpr(x0, x1, fy, L, longhouses) {
      const hs = (longhouses && sprite('longhouse', 'east')) || sprite('hut', 'east');
      if (!hs) return artPending('hut') || (longhouses && artPending('longhouse'));
      const w = hs.w / TF, n = Math.max(1, Math.min(7, 1 + Math.floor((L - 1) / 2), Math.floor((x1 - x0) / (w * 0.55))));
      for (let k = 0; k < n; k++) drawS(hs, n === 1 ? (x0 + x1) / 2 : x0 + w / 2 + (k * (x1 - x0 - w)) / (n - 1), fy - (k % 2 ? 1 : 0));
      return true;
    }
    function wallsSpr(L) {
      const sp = tierSprite('walls', L);
      if (!sp) return artPending('town-walls');
      drawS(sp, sp.w / TF / 2, FF + 1); drawS(sp, W - sp.w / TF / 2, FF + 1, true);
      return true;
    }
    function fireSpr(x, fy, t) { // the campfire VFX loop, standing on fy
      const d = VFX.campfire;
      if (!d) return false;
      const c = d.clips.whole, per = (c.start + c.frames) / d.fps, n = Math.floor((reduce ? 0 : t % per) * d.fps) - c.start;
      if (n < 0) return true;
      const k = n % c.frames;
      idt(g, () => g.drawImage(c.img, (k % c.cols) * c.fw, Math.floor(k / c.cols) * c.fh, c.fw, c.fh, Math.round(x * TF - c.fw / 2), Math.round(fy * TF) - c.fh, c.fw, c.fh));
      return true;
    }
    // Until a frame has all its sprites (or 3 s), show the night colour instead of the old drawings.
    let gateOpen = false, gateT0 = 0;

    function frame(dt, now, view) {
      if (W < 40 || H < 20) return;
      const t = now / 1000;
      wanted = 0;
      if (!gateT0) gateT0 = performance.now();
      paint(view.season);
      g.clearRect(0, 0, W, H);
      idt(g, () => g.drawImage(bgC, 0, 0));
      const artBg = !!townBg(view.season);
      if (!artBg && view.season === 'summer') { px(g, W - 14, 3, 5, 5, '#FFE08A'); px(g, W - 13, 2, 3, 7, '#FFE08A'); px(g, W - 15, 4, 7, 3, '#FFE08A'); }
      if (!artBg && view.season === 'winter') { px(g, 0, G - 1, W, 1, 'rgba(255,255,255,0.55)'); for (let x = 1; x < W; x += 5) px(g, x, G, 2, 1, 'rgba(255,255,255,0.4)'); }
      const lv = view.bld;
      const lh = !!view.tech.longhouses;
      // back row
      for (const [id, fx] of TOWN_SPOTS.back) {
        const x = Math.round(W * fx);
        if (lv[id]) { if (!bldSpr(id, x, FB, lv[id])) BUILD_ART[id](g, x, FB, lv[id], t, { hills: R.hills, feast: view.feast }); }
        else if (view.open[id] && !plotSpr(x, FB)) stakes(g, x, FB);
      }
      const hx0 = Math.round(W * 0.21), hx1 = Math.round(W * (lv.hall ? 0.41 : 0.5));
      if (!hutsSpr(hx0, hx1, FB, lv.huts || 1, lh)) hutsArt(g, hx0, hx1, FB, lv.huts || 1, t, lh);
      // the old campfire, in the middle of the road
      const fx2 = Math.round(W * 0.53), fy2 = Math.round((FB + FF) / 2) + 1;
      if (!fireSpr(fx2, fy2 + 1, t)) {
        px(g, fx2 - 2, fy2, 5, 1, '#3A2A1A');
        px(g, fx2 - 1, fy2 - 3 + (Math.sin(t * 9) > 0 ? 0 : 1), 3, 3, '#FF8A3D');
        px(g, fx2, fy2 - 4 + (Math.sin(t * 11) > 0 ? 0 : 1), 1, 2, '#FFE08A');
      }
      // villagers walk the road
      syncFolk(view);
      const roadY = Math.round((FB + FF) / 2) + 1;
      const happy = view.mood === 'Joyful' || view.mood === 'Happy' || view.feast;
      const slow = view.mood === 'Miserable' ? 0.5 : 1;
      for (const p of folk) p.y = roadY + p.dy;
      const order = folk.slice().sort((a, b) => a.y - b.y);
      for (const p of order) {
        if (p.x > W - 4) p.x = W - 6;
        if (p.wait > 0) { p.wait -= dt; if (p.wait <= 0) p.tx = 6 + Math.random() * (W - 12); }
        else if (!reduce) {
          const d = p.tx - p.x;
          if (Math.abs(d) < 0.6) p.wait = 1 + Math.random() * 3;
          else { p.f = d > 0 ? 1 : -1; p.x += p.f * Math.min(Math.abs(d), (4 + (p.k % 3)) * dt * slow); }
        }
        const walking = p.wait <= 0;
        const hop = happy && !walking && Math.sin(t * 6 + p.k) > 0.8 ? 1 : 0;
        // a worker is its job's villager sprite (walk cycle while moving, mirrored when heading left); idlers are crowd goblins
        const fe = p.job ? entryOf('folk-' + p.job) : null;
        const fs = fe && fe.east ? (walking && !reduce && fe.walk ? fe.walk[Math.floor(t * 8 + p.k) % fe.walk.length] : fe.east) : (!p.job ? sprite('crowd-' + (p.k % 2), 'east') : null);
        if (fs) { drawS(fs, p.x, p.y - hop, p.f < 0); continue; }
        if (p.job ? artPending('folk-' + p.job) : artPending('crowd-' + (p.k % 2))) continue;
        const L = { h: 7, skin: p.k % 3 ? '#7FA650' : '#8DB85A', ears: 2, bigHead: true, facing: p.f, shirt: p.k % 2 ? '#5A4632' : '#4A3B28' };
        if (p.job === 'guard') { L.weapon = 'spear'; L.hat = 'helm'; L.helm = '#8A8E96'; }
        humanoid(g, Math.round(p.x), Math.round(p.y) + 0, L, { walk: walking && !reduce ? t * 2 + p.k : 0, bob: hop });
        if (p.job && p.job !== 'guard') px(g, Math.round(p.x) + (p.f > 0 ? 2 : -3), Math.round(p.y) - 4 - hop, 2, 2, JOB_ITEM[p.job]);
      }
      // front row
      for (const [id, fx] of TOWN_SPOTS.front) {
        const x = Math.round(W * fx);
        if (lv[id]) { if (!bldSpr(id, x, FF, lv[id])) BUILD_ART[id](g, x, FF, lv[id], t, { hills: R.hills }); }
        else if (view.open[id] && !plotSpr(x, FF)) stakes(g, x, FF);
      }
      if (lv.walls && !wallsSpr(lv.walls)) wallsArt(g, W, FB, FF, lv.walls);
      if (view.mood === 'Miserable' && !reduce) { // a sulky little rain cloud
        const cx = Math.round(W * 0.35 + Math.sin(t * 0.3) * 8);
        px(g, cx, 3, 7, 2, '#5A5E66'); px(g, cx + 1, 2, 4, 1, '#5A5E66');
        for (let k = 0; k < 3; k++) px(g, cx + 1 + k * 2, 5 + Math.floor((t * 8 + k) % 4), 1, 1, '#8AA8C0');
      }
      if (happy && !reduce) for (let k = 0; k < 2; k++) {
        const p = (t * 0.4 + k * 0.5) % 1;
        px(g, Math.round(W * (0.62 + k * 0.08)) + Math.round(Math.sin(p * 6) * 2), Math.round(FB - 12 - p * 8), 1, 2, `rgba(242,193,78,${(1 - p).toFixed(2)})`);
      }
      seasonStep(view.season, dt, t);
      if (view.haven) { // the safe-zone dome
        for (let x = 0; x < W; x += 2) {
          const u = (x / W) * 2 - 1;
          const y = Math.round(H - 2 - Math.sqrt(Math.max(0, 1 - u * u)) * (H - 4));
          if (Math.sin(t * 2 + x * 0.3) > -0.2) px(g, x, y, 1, 1, 'rgba(127,224,245,0.55)');
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!gateOpen && (wanted === 0 || performance.now() - gateT0 > 3000)) gateOpen = true;
      if (!gateOpen) { ctx.fillStyle = '#16130F'; ctx.fillRect(0, 0, canvas.width, canvas.height); return; }
      ctx.drawImage(low, 0, 0, low.width, low.height, 0, 0, low.width * TS * DPR, low.height * TS * DPR);

      // speech bubble
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (bubble) {
        bubble.t += dt;
        if (bubble.t > bubble.life) bubble = null;
        else {
          const p = folk[bubble.who] || folk[0];
          if (p) {
            ctx.font = '600 13px "Barlow SC", sans-serif';
            const lines = wrap(ctx, bubble.text, Math.min(220, CW - 24));
            const lw = Math.max(...lines.map((l) => ctx.measureText(l).width));
            const bw = lw + 14, bh = lines.length * 15 + 8;
            const ax = p.x * SCALE, ay = (p.y - 10) * SCALE;
            const bx = Math.max(6, Math.min(CW - bw - 6, ax - bw / 2));
            const by = Math.max(4, ay - bh - 6);
            ctx.globalAlpha = Math.min(1, (bubble.life - bubble.t) * 3, bubble.t * 6);
            ctx.fillStyle = 'rgba(239,230,210,0.96)';
            roundRect(ctx, bx, by, bw, bh, 5); ctx.fill();
            ctx.beginPath(); ctx.moveTo(Math.max(bx + 8, Math.min(bx + bw - 8, ax)) - 4, by + bh); ctx.lineTo(Math.max(bx + 8, Math.min(bx + bw - 8, ax)) + 4, by + bh); ctx.lineTo(ax, Math.min(by + bh + 6, ay)); ctx.fill();
            ctx.fillStyle = '#241C10'; ctx.textAlign = 'left';
            lines.forEach((l, k) => ctx.fillText(l, bx + 7, by + 16 + k * 15));
            ctx.globalAlpha = 1;
          }
        }
      }
    }
    let flakes = [];
    function seasonStep(season, dt, t) {
      const want = reduce ? 0 : ({ winter: 34, autumn: 12, spring: 14 }[season] || 0);
      while (flakes.length < want) flakes.push({ x: Math.random() * W, y: Math.random() * H, v: 0.5 + Math.random(), p: Math.random() * TAU });
      flakes.length = want;
      for (const w of flakes) {
        if (season === 'winter') { w.y += 6 * w.v * dt; w.x += Math.sin(t + w.p) * 2 * dt; px(g, w.x, w.y, 1, 1, '#FFFFFF'); }
        else if (season === 'autumn') { w.y += 7 * w.v * dt; w.x += Math.sin(t * 2 + w.p) * 5 * dt; px(g, w.x, w.y, 1, 1, w.p > 3 ? '#D08A3A' : '#B85A2A'); }
        else { w.y += 5 * w.v * dt; w.x += Math.sin(t * 1.5 + w.p) * 6 * dt; px(g, w.x, w.y, 1, 1, w.p > 3 ? '#FF9EC4' : '#FFFFFF'); }
        if (w.y > H + 2) { w.y = -2; w.x = Math.random() * W; }
        if (w.x < -3) w.x = W + 2; if (w.x > W + 3) w.x = -2;
      }
    }
    function wrap(c, text, max) {
      const words = text.split(' '), out = [];
      let cur = '';
      for (const w of words) {
        const n = cur ? cur + ' ' + w : w;
        if (c.measureText(n).width > max && cur) { out.push(cur); cur = w; } else cur = n;
      }
      if (cur) out.push(cur);
      return out.slice(0, 3);
    }
    function roundRect(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }
    // A goblin near where you tapped says something.
    function say(text, cssX) {
      if (!folk.length) return;
      let who = 0, best = Infinity;
      folk.forEach((p, i) => { const d = Math.abs(p.x * SCALE - (cssX == null ? CW / 2 : cssX)); if (d < best) { best = d; who = i; } });
      folk[who].wait = Math.max(folk[who].wait, 2.5);
      bubble = { text, who, t: 0, life: 3.2 + text.length * 0.03 };
    }
    return { resize, frame, say };
  }

  // Small pictures for the town lists, as data URLs (cached).
  const iconCache = {};
  function iconURL(key, N, size, draw) {
    const k = key + ':' + size;
    if (iconCache[k]) return iconCache[k];
    const c = document.createElement('canvas');
    c.width = N; c.height = N;
    draw(c.getContext('2d'));
    const out = document.createElement('canvas');
    out.width = size; out.height = size;
    const og = out.getContext('2d');
    og.imageSmoothingEnabled = false;
    og.drawImage(c, 0, 0, N, N, 0, 0, size, size);
    return (iconCache[k] = out.toDataURL());
  }
  function resIcon(id, size) {
    return iconURL('r' + id, 8, size, (g) => {
      switch (id) {
        case 'food': px(g, 1, 1, 6, 3, '#C8463A'); px(g, 2, 0, 4, 1, '#C8463A'); px(g, 2, 1, 1, 1, '#F2EEDC'); px(g, 5, 2, 1, 1, '#F2EEDC'); px(g, 3, 4, 2, 3, '#E6D8B8'); px(g, 1, 3, 6, 1, '#9A3028'); break;
        case 'wood': px(g, 0, 2, 7, 4, '#8B5A2B'); px(g, 0, 2, 7, 1, '#A8743E'); px(g, 6, 2, 2, 4, '#C9A06A'); px(g, 7, 3, 1, 2, '#8B5A2B'); break;
        case 'stone': px(g, 1, 2, 6, 5, '#9A9AA4'); px(g, 2, 1, 4, 1, '#9A9AA4'); px(g, 2, 2, 2, 1, '#C8C8D0'); px(g, 1, 6, 6, 1, '#6A6A74'); px(g, 6, 3, 1, 3, '#7A7A84'); break;
        case 'iron': px(g, 1, 3, 6, 3, '#7A9AB0'); px(g, 2, 2, 4, 1, '#9CC0D8'); px(g, 2, 3, 3, 1, '#C8E0F0'); px(g, 1, 6, 6, 1, '#4E6A80'); break;
        case 'ideas': px(g, 3, 0, 2, 8, '#7FE0F5'); px(g, 0, 3, 8, 2, '#7FE0F5'); px(g, 2, 2, 4, 4, '#BFF2FC'); px(g, 3, 3, 2, 2, '#FFFFFF'); break;
        default: break;
      }
    });
  }
  function jobIcon(id, size) {
    return iconURL('j' + id, 14, size, (g) => {
      const L = { h: 11, skin: '#7FA650', ears: 3, bigHead: true, facing: 1, shirt: '#5A4632' };
      const map = { woodcutter: { weapon: 'axe' }, stonecutter: { weapon: 'mace', shirt: '#4A4652' }, miner: { weapon: 'shovel', hat: 'helm', helm: '#C9A64A' },
        tinkerer: { weapon: 'none', shirt: '#3B4F7A' }, guard: { weapon: 'spear', hat: 'helm', helm: '#8A8E96', shield: '#7A5230' }, forager: { weapon: 'none' } };
      humanoid(g, 6, 13, Object.assign(L, map[id] || {}), {});
      if (id === 'forager') { px(g, 9, 7, 3, 2, '#8B6A40'); px(g, 9, 6, 2, 1, '#C8463A'); }
      if (id === 'tinkerer') { px(g, 4, 3, 5, 1, '#7FE0F5'); px(g, 10, 6, 1, 1, '#7FE0F5'); px(g, 11, 5, 1, 1, '#BFF2FC'); }
      if (id === 'miner') px(g, 7, 1, 1, 1, '#FFE08A');
    });
  }
  function bldIcon(id, size) {
    return iconURL('b' + id, 20, size, (g) => {
      if (id === 'huts') { hut(g, 2, 17, 9, '#C9A64A', 0, false); hut(g, 10, 18, 8, '#B8963A', 0, false); return; }
      if (id === 'walls') { for (let y = 6; y < 18; y += 2) px(g, 3, y, 14, 2, (y >> 1) % 2 ? '#8A8A94' : '#7A7A84'); for (let k = 0; k < 4; k++) px(g, 3 + k * 4, 4, 2, 2, '#8A8A94'); return; }
      BUILD_ART[id](g, 10, 18, 1, 0.3, { hills: '#3A5232' });
    });
  }

  // Portrait of a form, cropped to head and shoulders, as a data URL (cached).
  const portraitCache = {};
  function portrait(form, size, unknown) {
    // a PixelLab form gets a head-and-shoulders crop of its front-facing (south) sprite
    const ps = sprite(form.id, 'south');
    if (!ps && artPending(form.id)) return BLANK; // its art is on the way: show nothing rather than the old drawing
    const key = form.id + size + (unknown ? 'u' : '') + (ps ? 's' : '');
    if (portraitCache[key]) return portraitCache[key];
    if (ps) {
      const side = Math.min(ps.h, Math.max(ps.w + 2, Math.round(ps.h * 0.6)));
      const sx = Math.round(ps.x + ps.hx - side / 2), sy = ps.y - 1;
      const out = document.createElement('canvas');
      out.width = size; out.height = size;
      const og = out.getContext('2d');
      og.imageSmoothingEnabled = false;
      og.drawImage(ps.img, sx, sy, side, side, 0, 0, size, size);
      if (unknown) { og.globalCompositeOperation = 'source-in'; og.fillStyle = 'rgba(239,230,210,0.28)'; og.fillRect(0, 0, size, size); }
      return (portraitCache[key] = out.toDataURL());
    }
    const c = document.createElement('canvas');
    const N = 16;
    c.width = N; c.height = N;
    const g = c.getContext('2d');
    const L = formLook(form);
    // head near the top, shoulders filling the frame; the feet fall off the bottom
    humanoid(g, N / 2 - 1, 4 + L.h, L, {});
    if (unknown) { g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(239,230,210,0.28)'; g.fillRect(0, 0, N, N); }
    const out = document.createElement('canvas');
    out.width = size; out.height = size;
    const og = out.getContext('2d');
    og.imageSmoothingEnabled = false;
    og.drawImage(c, 0, 0, N, N, 0, 0, size, size);
    return (portraitCache[key] = out.toDataURL());
  }

  // Small icon of a village unit at a given rank, as a data URL (cached).
  // Every rank of a force shares one frame, sized to its biggest look, so you can see them grow.
  const unitCache = {}, unitFrames = {};
  let frameCtx = null;
  const ICON_N = 48;
  const iconFeet = (i) => ({ 8: 50, 9: 54, 10: 58 }[i] || 36);
  function unitFrame(i) {
    if (unitFrames[i]) return unitFrames[i];
    if (!frameCtx) { const fc = document.createElement('canvas'); fc.width = ICON_N; fc.height = ICON_N; frameCtx = fc.getContext('2d', { willReadFrequently: true }); }
    const g = frameCtx;
    let x0 = ICON_N, y0 = ICON_N, x1 = 0, y1 = 0;
    for (let r = 0; r <= 5; r++) {
      g.clearRect(0, 0, ICON_N, ICON_N);
      drawUnit(g, i, 24, iconFeet(i), 0.3, 0, r);
      const d = g.getImageData(0, 0, ICON_N, ICON_N).data;
      for (let y = 0; y < ICON_N; y++) for (let x = 0; x < ICON_N; x++) {
        if (d[(y * ICON_N + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
    if (x1 < x0) { x0 = 16; y0 = 16; x1 = 31; y1 = 31; }
    // big enough for the widest look, but tall weapons may poke out of the top so the goblins stay large
    const side = Math.max(12, Math.min(17, Math.max(x1 - x0, y1 - y0) + 3), x1 - x0 + 3);
    const f = { x: Math.round((x0 + x1 + 1) / 2 - side / 2), y: Math.round(y1 + 2 - side), side };
    return (unitFrames[i] = f);
  }
  function unitIcon(i, size, r) {
    r = r || 0;
    // a PixelLab unit fills a square frame, feet near the bottom
    const us = unitSprite(i, r);
    if (!us && (artPending(`unit-${i}-0`) || artPending(`unit-${i}-${r >= 4 ? 2 : r >= 2 ? 1 : 0}`))) return BLANK;
    const key = i + ':' + size + ':' + r + (us ? ':s' + us.w + 'x' + us.h : '');
    if (unitCache[key]) return unitCache[key];
    if (us) {
      const side = Math.max(us.w, us.h) + 4;
      const out = document.createElement('canvas');
      out.width = size; out.height = size;
      const og = out.getContext('2d');
      og.imageSmoothingEnabled = false;
      og.drawImage(us.img, Math.round(us.x + us.w / 2 - side / 2), us.y + us.h + 2 - side, side, side, 0, 0, size, size);
      return (unitCache[key] = out.toDataURL());
    }
    const f = unitFrame(i);
    const c = document.createElement('canvas');
    c.width = ICON_N; c.height = ICON_N;
    const g = c.getContext('2d');
    drawUnit(g, i, 24, iconFeet(i), 0.3, 0, r);
    const out = document.createElement('canvas');
    out.width = size; out.height = size;
    const og = out.getContext('2d');
    og.imageSmoothingEnabled = false;
    og.drawImage(c, f.x, f.y, f.side, f.side, 0, 0, size, size);
    return (unitCache[key] = out.toDataURL());
  }

  root.GHArt = { createScene, createTownView, humanoid, adventurerLook, formLook, portrait, unitIcon, resIcon, jobIcon, bldIcon, mulberry, onArt: (f) => artListeners.push(f), sprites: SPRITES, fx: VFX }; // sprites/fx exposed for tests
})(window);
