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
    const base = { h, skin, hair, facing: -1, pants: '#3A3A48' };
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
  function createScene(canvas) {
    const ctx = canvas.getContext('2d');
    const low = document.createElement('canvas');
    const g = low.getContext('2d');
    const spr = document.createElement('canvas');
    const sg = spr.getContext('2d');
    const sil = document.createElement('canvas');
    const silg = sil.getContext('2d');
    // Draw a sprite with a 1px dark outline so it reads against any backdrop.
    function outlined(draw, color) {
      sg.clearRect(0, 0, W, H);
      const res = draw(sg);
      silg.globalCompositeOperation = 'source-over';
      silg.clearRect(0, 0, W, H);
      silg.drawImage(spr, 0, 0);
      silg.globalCompositeOperation = 'source-in';
      silg.fillStyle = color || 'rgba(14,10,8,0.85)';
      silg.fillRect(0, 0, W, H);
      g.drawImage(sil, -1, 0); g.drawImage(sil, 1, 0); g.drawImage(sil, 0, -1); g.drawImage(sil, 0, 1);
      g.drawImage(spr, 0, 0);
      return res;
    }
    const bgC = document.createElement('canvas');
    const bg = bgC.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let CW = 0, CH = 0, DPR = 1, SCALE = 3, W = 0, H = 0, G = 0, FY = 0;
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
      SCALE = Math.max(2, Math.round(CW / 100));
      W = Math.ceil(CW / SCALE); H = Math.ceil(CH / SCALE);
      low.width = W; low.height = H; bgC.width = W; bgC.height = H;
      spr.width = W; spr.height = H; sil.width = W; sil.height = H;
      G = Math.round(H * 0.64);          // horizon: where the ground starts
      FY = G + Math.round((H - G) * 0.42); // feet of the hero and the adventurers
      bgKey = '';
      weather = [];
    }

    function paintBackground(R, r) {
      const key = `${R.name},${W},${H}`;
      if (key === bgKey) return;
      bgKey = key;
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
      const want = { snow: 40, rain: 40, ash: 30, fireflies: 10, leaves: 10, wisps: 8, glitch: 6 }[R.fx] || 0;
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
      const standX = Math.round(W * 0.8);
      const p = Math.min(1, (now - e.born) / (e.walk * 1000));
      return { x: Math.round(standX + (1 - p) * (W * 0.35)), walking: p < 1, p };
    }

    function frame(dt, now, view) {
      if (!W) return;
      const t = now / 1000;
      const R = view.regionData;
      paintBackground(R, view.region);
      g.clearRect(0, 0, W, H);
      g.drawImage(bgC, 0, 0);
      // animated bits of the backdrop
      if (ANIMATED_PROPS.has(view.region)) regionProps(g, W, H, G, view.region, R, t);
      weatherStep(R, dt, t);

      // ---- village
      const vx = Math.round(W * 0.46); // village edge
      const huts = Math.min(6, 2 + Math.floor(Math.log2(1 + view.goblins) / 1.6));
      for (let k = 0; k < huts; k++) {
        const hw2 = 9 + (k % 2) * 2;
        hut(g, 2 + Math.round(k * (vx - 16) / Math.max(1, huts - 1)), G - 3 - (k % 2) * 2, hw2, k % 2 ? '#B8963A' : '#C9A64A', t, k < view.conquered);
      }
      // campfire
      const fx2 = Math.round(vx * 0.55);
      px(g, fx2 - 2, G + 2, 5, 1, '#3A2A1A');
      px(g, fx2 - 1, G - 1 + (Math.sin(t * 9) > 0 ? 0 : 1), 3, 3, '#FF8A3D');
      px(g, fx2, G - 2 + (Math.sin(t * 11) > 0 ? 0 : 1), 1, 2, '#FFE08A');
      if (view.palisade) { for (let k = 0; k < 5; k++) { px(g, vx - 2, G - 10 + k * 2, 2, 2, k % 2 ? '#7A5230' : '#6B4628'); } px(g, vx - 2, G - 11, 1, 1, '#8B6A40'); }
      if (view.tower) { px(g, 4, G - 34, 2, 30, '#6B4628'); px(g, 12, G - 34, 2, 30, '#6B4628'); px(g, 2, G - 38, 14, 4, '#7A5230'); px(g, 3, G - 41, 12, 3, '#B8963A'); }

      // units, newest types near the front
      const owned = view.owned;
      const slots = [];
      for (let i = 0; i < owned.length; i++) if (owned[i] > 0) slots.push(i);
      const ground = slots.filter((i) => i !== 8 && i !== 9 && i !== 10);
      const air = slots.filter((i) => i === 8 || i === 9 || i === 10);
      const ranks = view.ranks || [];
      ground.forEach((i, k) => {
        const row = k % 2;
        const x = Math.round(6 + (k * (vx - 6)) / Math.max(1, ground.length) + 4);
        const ph = ((t * (0.6 + i * 0.07) + i * 0.37) % 1);
        const fy = G + 5 + row * Math.round((H - G) * 0.42);
        const top = drawUnit(g, i, x, fy, t, ph, ranks[i]);
        if (rankFx[i] > 0) rankBurst(i, x, top, fy, rankFx[i]);
        if (st.enemy && !st.enemy.dead && ph > 0.8 && ph - dt * (0.6 + i * 0.07) <= 0.8 && !reduce) shoot(i, x, G - 2, ranks[i]);
      });
      air.forEach((i, k) => {
        const x = Math.round(10 + k * 14 + Math.sin(t * 0.5 + k) * 3);
        const ph = ((t * 0.5 + i * 0.37) % 1);
        const top = drawUnit(g, i, x, G + 4, t, ph, ranks[i]);
        if (rankFx[i] > 0) rankBurst(i, x, top, top + 6, rankFx[i]);
        if (st.enemy && !st.enemy.dead && ph > 0.8 && ph - dt * 0.5 <= 0.8 && !reduce) shoot(i, x, G - 26, ranks[i]);
      });
      for (const k in rankFx) rankFx[k] = Math.max(0, rankFx[k] - dt);
      // a crowd of plain goblins grows with the village
      const crowd = Math.min(10, Math.floor(Math.log2(1 + view.goblins) * 1.2));
      for (let k = 0; k < crowd; k++) {
        const x = Math.round(5 + ((k * 37) % Math.max(10, vx - 10)));
        humanoid(g, x, G + 1, goblinLook({ h: 7, skin: k % 3 ? '#7FA650' : '#8DB85A', shirt: k % 2 ? '#5A4632' : '#4A3B28' }), { bob: Math.sin(t * 2.5 + k * 1.7) > 0.7 ? 1 : 0 });
      }

      // ---- hero
      heroSwing = Math.max(0, heroSwing - dt * 6);
      heroLunge = Math.max(0, heroLunge - dt * 10);
      const heroX = Math.round(W * 0.57 + heroLunge * 3);
      const look = view.heroLook;
      const heroTop = outlined((c) => humanoid(c, heroX, FY, look, { swing: heroSwing > 0 ? 1 - heroSwing : 0, bob: Math.sin(t * 2.4) > 0.5 ? 1 : 0, t }));
      // corruption flicker on the hero
      if (!reduce && Math.sin(t * 1.3) > 0.97) px(g, heroX - 3 + Math.floor(Math.random() * 6), heroTop.top + Math.floor(Math.random() * look.h), 2, 1, '#FF4F8B');

      // ---- enemy
      const e = st.enemy;
      let ePos = null;
      if (e) {
        ePos = enemyPos(e, now);
        if (e.raid) {
          outlined((c) => e.looks.forEach((L, k) => humanoid(c, ePos.x + (k - 1) * 9, FY + (k === 1 ? -2 : 1), L, { walk: ePos.walking ? t * 3 + k : 0, flash: e.flash > 0, bob: e.dead ? 0 : (Math.sin(t * 3 + k) > 0.6 ? 1 : 0) })));
        } else if (!e.dead || e.deadT < 0.15) {
          if (e.boss || e.ring) { // a glow ring under raid leaders and other special targets
            g.fillStyle = e.ring || 'rgba(242,193,78,0.25)';
            g.fillRect(ePos.x - 8, FY - 1, 16, 2);
          }
          outlined((c) => humanoid(c, ePos.x, FY, e.look, { walk: ePos.walking ? t * 3 : 0, flash: e.flash > 0, swing: e.swing || 0, bob: Math.sin(t * 3) > 0.6 ? 1 : 0 }), e.outline || (e.boss ? 'rgba(242,193,78,0.9)' : null));
        }
        if (e.dead) e.deadT += dt;
        e.flash = Math.max(0, (e.flash || 0) - dt);
        e.swing = Math.max(0, (e.swing || 0) - dt * 3);
        if (!e.dead && !ePos.walking && Math.random() < dt * 0.5) e.swing = 1;
      }

      // projectiles from the village
      for (let k = shots.length - 1; k >= 0; k--) {
        const s2 = shots[k];
        s2.p += dt * 2.2;
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
            if (view.glitch >= 2 && Math.random() < 0.4) g.drawImage(low, 0, y, W, 2, Math.round((Math.random() - 0.5) * 6), y, W, 2);
          }
        }
      }

      // compose: low-res scene scaled up, screen shake on crits
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      shake = Math.max(0, shake - dt * 30);
      const sx2 = shake ? (Math.random() - 0.5) * shake : 0, sy2 = shake ? (Math.random() - 0.5) * shake : 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(low, 0, 0, W, H, Math.round(sx2 * DPR), Math.round(sy2 * DPR), W * SCALE * DPR, H * SCALE * DPR);
      if (flashT > 0) { ctx.fillStyle = `rgba(255,79,139,${flashT * 0.5})`; ctx.fillRect(0, 0, canvas.width, canvas.height); flashT = Math.max(0, flashT - dt * 1.5); }

      // ---- crisp text layer
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const S = SCALE;
      if (e && ePos && !(e.dead && e.deadT > 0.15)) {
        const ey = (FY - (e.raid ? 20 : e.look.h) - 3) * S;
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

    // a column of light and sparks over a force that just ranked up
    function rankBurst(i, x, top, fy, left) {
      if (rankLabel[i]) { // the new rank's name floats up from the force
        floats.push({ x: x * SCALE, y: (top - 3) * SCALE, text: rankLabel[i], t: 0, life: 1.8, rise: 34, size: 16, c: '#F2C14E' });
        rankLabel[i] = null;
      }
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
      shots.push({ x, y, p: 0, c: r >= 5 ? '#7FE0F5' : spec[0], w: spec[1] + (r >= 3 ? 1 : 0), arc: spec[2] });
    }

    function enemyScreen() {
      const e = st.enemy;
      if (!e) return { x: CW * 0.76, y: CH * 0.6 };
      const p = enemyPos(e, performance.now());
      return { x: p.x * SCALE, y: (FY - (e.raid ? 14 : e.look.h * 0.6)) * SCALE };
    }

    return {
      resize,
      get enemy() { return st.enemy; },
      setEnemy(e) { st.enemy = e; },
      enemyArrived(now) { const e = st.enemy; return e && !e.dead && now - e.born >= e.walk * 1000; },
      heroAttack() { heroSwing = 1; heroLunge = 1; },
      hit(amount, crit, text, quiet) {
        const e = st.enemy; if (!e) return;
        if (quiet && !crit) { quietN++; if (quietN % 3) return; }
        else e.flash = 0.08;
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
        if (!reduce) for (let k = 0; k < (e.boss || e.raid ? 50 : 22); k++) {
          parts.push({ x: p.x + (Math.random() - 0.5) * (e.raid ? 24 : 6), y: FY - Math.random() * (e.raid ? 16 : e.look.h), vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 18, g: -4, t: 0, life: 0.6 + Math.random() * 0.6, c: cols[k % cols.length] });
        }
        const s2 = enemyScreen();
        for (let k = 0; k < Math.min(12, n || 4); k++) coins.push({ x: s2.x, y: s2.y, t: -k * 0.05, dx: (Math.random() - 0.5) * 60 });
      },
      corruptFlash() { flashT = 1; shake = 6; },
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

    function resize() {
      const r = canvas.getBoundingClientRect();
      CW = Math.max(1, r.width); CH = Math.max(1, r.height);
      DPR = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.round(CW * DPR); canvas.height = Math.round(CH * DPR);
      SCALE = Math.max(2, Math.round(CW / 130));
      W = Math.ceil(CW / SCALE); H = Math.ceil(CH / SCALE);
      low.width = W; low.height = H; bgC.width = W; bgC.height = H;
      G = Math.round(H * 0.36);
      FB = G + 5;
      FF = H - 4;
      bgKey = '';
    }
    function paint() {
      const key = `${W},${H}`;
      if (key === bgKey) return;
      bgKey = key;
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

    function frame(dt, now, view) {
      if (W < 40 || H < 20) return;
      const t = now / 1000;
      paint();
      g.clearRect(0, 0, W, H);
      g.drawImage(bgC, 0, 0);
      if (view.season === 'summer') { px(g, W - 14, 3, 5, 5, '#FFE08A'); px(g, W - 13, 2, 3, 7, '#FFE08A'); px(g, W - 15, 4, 7, 3, '#FFE08A'); }
      if (view.season === 'winter') { px(g, 0, G - 1, W, 1, 'rgba(255,255,255,0.55)'); for (let x = 1; x < W; x += 5) px(g, x, G, 2, 1, 'rgba(255,255,255,0.4)'); }
      const lv = view.bld;
      const lh = !!view.tech.longhouses;
      // back row
      for (const [id, fx] of TOWN_SPOTS.back) {
        const x = Math.round(W * fx);
        if (lv[id]) BUILD_ART[id](g, x, FB, lv[id], t, { hills: R.hills, feast: view.feast });
        else if (view.open[id]) stakes(g, x, FB);
      }
      hutsArt(g, Math.round(W * 0.21), Math.round(W * (lv.hall ? 0.41 : 0.5)), FB, lv.huts || 1, t, lh);
      // the old campfire, in the middle of the road
      const fx2 = Math.round(W * 0.53), fy2 = Math.round((FB + FF) / 2) + 1;
      px(g, fx2 - 2, fy2, 5, 1, '#3A2A1A');
      px(g, fx2 - 1, fy2 - 3 + (Math.sin(t * 9) > 0 ? 0 : 1), 3, 3, '#FF8A3D');
      px(g, fx2, fy2 - 4 + (Math.sin(t * 11) > 0 ? 0 : 1), 1, 2, '#FFE08A');
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
        const L = { h: 7, skin: p.k % 3 ? '#7FA650' : '#8DB85A', ears: 2, bigHead: true, facing: p.f, shirt: p.k % 2 ? '#5A4632' : '#4A3B28' };
        if (p.job === 'guard') { L.weapon = 'spear'; L.hat = 'helm'; L.helm = '#8A8E96'; }
        humanoid(g, Math.round(p.x), Math.round(p.y) + 0, L, { walk: walking && !reduce ? t * 2 + p.k : 0, bob: hop });
        if (p.job && p.job !== 'guard') px(g, Math.round(p.x) + (p.f > 0 ? 2 : -3), Math.round(p.y) - 4 - hop, 2, 2, JOB_ITEM[p.job]);
      }
      // front row
      for (const [id, fx] of TOWN_SPOTS.front) {
        const x = Math.round(W * fx);
        if (lv[id]) BUILD_ART[id](g, x, FF, lv[id], t, { hills: R.hills });
        else if (view.open[id]) stakes(g, x, FF);
      }
      if (lv.walls) wallsArt(g, W, FB, FF, lv.walls);
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
      ctx.drawImage(low, 0, 0, W, H, 0, 0, W * SCALE * DPR, H * SCALE * DPR);

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
    const key = form.id + size + (unknown ? 'u' : '');
    if (portraitCache[key]) return portraitCache[key];
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
    const key = i + ':' + size + ':' + r;
    if (unitCache[key]) return unitCache[key];
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

  root.GHArt = { createScene, createTownView, humanoid, adventurerLook, formLook, portrait, unitIcon, resIcon, jobIcon, bldIcon, mulberry };
})(window);
