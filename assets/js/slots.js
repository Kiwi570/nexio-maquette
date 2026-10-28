/* Emplacements d'images : l'image WebP est chargée si elle existe dans assets/img/,
   sinon un visuel provisoire est dessiné en code (jamais de cadre vide). */
import { rng, makeCracks } from './cracks.js?v=20261028';

const IMG = 'assets/img/';
// Noms des visuels réellement présents dans assets/img/ (fichiers <nom>-800.webp et <nom>-1600.webp).
// Ajouter ici chaque nom livré : sans cela, l'emplacement garde son visuel provisoire, sans requête en erreur.
const DISPONIBLES = new Set([
  'accueil-confiance-mains',
  'accueil-final-ecran',
  'accueil-infos-rue',
  'accueil-ouverture-fond',
  'accueil-ouverture-fond-mobile',
  'accueil-parcours-diagnostic',
  'accueil-parcours-estimation',
  'accueil-parcours-recuperation',
  'accueil-parcours-rendez-vous',
  'accueil-parcours-reparation',
  'accueil-pieces-circulaires',
  'accueil-pieces-neuves',
  'accueil-promesse-etabli',
  'accueil-reparations-carte',
  'estimation-composants',
  'estimation-ouverture-fond',
  'estimation-ouverture-fond-mobile',
  'rdv-confirmation',
  'rdv-ouverture-etabli',
  'rdv-ouverture-etabli-mobile',
]);
const CY = [57, 233, 247];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export function initSlots(root = document) {
  root.querySelectorAll('[data-slot]').forEach(fig => {
    if (fig.dataset.ready) return;
    fig.dataset.ready = '1';
    const name = fig.dataset.slot;
    const mob = fig.dataset.slotMobile;
    const sizes = fig.dataset.sizes || '100vw';
    const inner = document.createElement('div');
    inner.className = 'slot__inner';
    if (!DISPONIBLES.has(name)) { fig.prepend(inner); provisional(fig, inner); return; }
    const pic = document.createElement('picture');
    if (mob && DISPONIBLES.has(mob)) {
      const so = document.createElement('source');
      so.media = '(max-width: 700px)';
      so.srcset = `${IMG}${mob}-800.webp 800w, ${IMG}${mob}-1600.webp 1600w`;
      so.sizes = sizes;
      pic.appendChild(so);
    }
    const img = document.createElement('img');
    img.alt = fig.dataset.alt || '';
    img.decoding = 'async';
    if (fig.dataset.eager === undefined) img.loading = 'lazy';
    img.sizes = sizes;
    img.srcset = `${IMG}${name}-800.webp 800w, ${IMG}${name}-1600.webp 1600w`;
    img.src = `${IMG}${name}-1600.webp`;
    pic.appendChild(img);
    inner.appendChild(pic);
    fig.prepend(inner);
    img.addEventListener('load', () => fig.classList.add('is-loaded'), { once: true });
    img.addEventListener('error', () => { pic.remove(); provisional(fig, inner); }, { once: true });
  });
}

function provisional(fig, inner) {
  fig.classList.add('is-provisional');
  const c = document.createElement('canvas');
  c.className = 'slot__canvas';
  if (fig.classList.contains('slot--bg') || !fig.dataset.alt) c.setAttribute('aria-hidden', 'true');
  else { c.setAttribute('role', 'img'); c.setAttribute('aria-label', fig.dataset.alt + ' (visuel provisoire)'); }
  inner.appendChild(c);
  if (!fig.querySelector('.slot__tag')) {
    const t = document.createElement('span');
    t.className = 'slot__tag';
    t.textContent = 'Visuel provisoire';
    fig.appendChild(t);
  }
  const draw = () => {
    const r = inner.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (c.width === w && c.height === h) return;
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    (V[fig.dataset.variant] || V.bench)(g, w, h, rng(+(fig.dataset.seed || 3)));
    grain(g, w, h);
  };
  let to;
  new ResizeObserver(() => { clearTimeout(to); to = setTimeout(draw, 120); }).observe(inner);
  draw();
}

/* ---------- petits outils ---------- */
function base(g, w, h, top = '#0b1016', bottom = '#040507') {
  const lg = g.createLinearGradient(0, 0, 0, h);
  lg.addColorStop(0, top); lg.addColorStop(1, bottom);
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
}
function glow(g, x, y, r, col, a) {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, rgba(col, a)); rg.addColorStop(1, rgba(col, 0));
  g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function bokeh(g, w, h, r, n, cols) {
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, s = (0.02 + r() * 0.07) * Math.max(w, h);
    glow(g, x, y, s, cols[i % cols.length], 0.05 + r() * 0.12);
  }
  g.globalCompositeOperation = 'source-over';
}
function dust(g, w, h, r, n) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(220,240,245,${0.05 + r() * 0.3})`;
    const s = r() * 1.6 + 0.3;
    g.fillRect(r() * w, r() * h, s, s);
  }
}
function vignette(g, w, h, a = 0.75) {
  const rg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
  rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, `rgba(0,0,0,${a})`);
  g.fillStyle = rg; g.fillRect(0, 0, w, h);
}
function grain(g, w, h) {
  const n = document.createElement('canvas'); n.width = 128; n.height = 128;
  const ng = n.getContext('2d'); const d = ng.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 14; }
  ng.putImageData(d, 0, 0);
  g.fillStyle = g.createPattern(n, 'repeat'); g.fillRect(0, 0, w, h);
}
function rr(g, x, y, w, h, rad) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, rad) : g.rect(x, y, w, h); }
function phoneShape(g, x, y, pw, ph, ang, screenFn) {
  g.save(); g.translate(x, y); g.rotate(ang);
  rr(g, -pw / 2, -ph / 2, pw, ph, pw * 0.14);
  const lg = g.createLinearGradient(-pw / 2, 0, pw / 2, 0);
  lg.addColorStop(0, '#1b2229'); lg.addColorStop(0.5, '#0f1418'); lg.addColorStop(1, '#232b33');
  g.fillStyle = lg; g.fill();
  g.strokeStyle = rgba(CY, 0.35); g.lineWidth = Math.max(1, pw * 0.006); g.stroke();
  const m = pw * 0.045;
  rr(g, -pw / 2 + m, -ph / 2 + m, pw - m * 2, ph - m * 2, pw * 0.1);
  g.save(); g.clip();
  screenFn && screenFn(g, -pw / 2 + m, -ph / 2 + m, pw - m * 2, ph - m * 2);
  g.restore();
  g.restore();
}
function screenGlow(g, x, y, w, h, strength = 1) {
  const lg = g.createLinearGradient(x, y, x + w, y + h);
  lg.addColorStop(0, `rgba(10,40,60,${strength})`); lg.addColorStop(0.55, `rgba(20,140,170,${0.65 * strength})`); lg.addColorStop(1, `rgba(6,14,24,${strength})`);
  g.fillStyle = lg; g.fillRect(x, y, w, h);
}
function cracksOn(g, x, y, w, h, seed) {
  const cr = makeCracks({ W: 640, H: 1384, seed });
  g.save(); g.translate(x, y); g.scale(w / 640, h / 1384);
  g.strokeStyle = 'rgba(225,245,250,0.85)'; g.lineCap = 'round';
  cr.lines.forEach(l => { g.lineWidth = l.w * 1.3; g.beginPath(); l.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); });
  g.restore();
}

/* ---------- variantes ---------- */
const V = {
  bench(g, w, h, r) {
    base(g, w, h, '#071015', '#020304');
    g.save(); g.globalCompositeOperation = 'lighter';
    const bx = w * (0.25 + r() * 0.5);
    const lg = g.createLinearGradient(bx, 0, bx + w * 0.25, h);
    lg.addColorStop(0, rgba(CY, 0.14)); lg.addColorStop(1, rgba(CY, 0));
    g.fillStyle = lg; g.beginPath(); g.moveTo(bx - w * 0.04, 0); g.lineTo(bx + w * 0.06, 0); g.lineTo(bx + w * 0.38, h); g.lineTo(bx + w * 0.02, h); g.fill();
    g.restore();
    for (let i = 0; i < 3; i++) { g.fillStyle = rgba(CY, 0.18 - i * 0.05); g.fillRect(w * (0.1 + r() * 0.6), h * (0.12 + i * 0.07), w * (0.12 + r() * 0.2), Math.max(1, h * 0.004)); }
    const by = h * 0.74;
    const bg = g.createLinearGradient(0, by, 0, h); bg.addColorStop(0, '#11181e'); bg.addColorStop(1, '#030405');
    g.fillStyle = bg; g.fillRect(0, by, w, h - by);
    g.fillStyle = rgba(CY, 0.22); g.fillRect(0, by, w, Math.max(1, h * 0.002));
    bokeh(g, w, h * 0.7, r, 26, [CY, [255, 186, 120], [120, 160, 255]]);
    dust(g, w, h, r, Math.round(w * h / 4000));
    vignette(g, w, h, 0.8);
  },
  tools(g, w, h, r) {
    base(g, w, h, '#0d1418', '#06090b');
    const step = Math.max(14, w / 22);
    g.strokeStyle = 'rgba(120,200,210,0.07)'; g.lineWidth = 1;
    for (let x = 0; x < w; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const n = 7;
    for (let i = 0; i < n; i++) {
      const x = w * (0.14 + i * 0.12), len = h * (0.35 + r() * 0.3), y = h * (0.18 + r() * 0.15), tw = Math.max(5, w * 0.022);
      g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.12);
      g.fillStyle = 'rgba(0,0,0,0.55)'; rr(g, tw * 0.9, tw * 0.9, tw, len, tw / 2); g.fill();
      const lg = g.createLinearGradient(0, 0, tw, 0);
      const handle = i % 3 === 0 ? ['#18343a', '#2a5a62'] : ['#1a1f24', '#323a42'];
      lg.addColorStop(0, handle[0]); lg.addColorStop(1, handle[1]);
      g.fillStyle = lg; rr(g, 0, 0, tw, len * 0.45, tw / 2); g.fill();
      g.fillStyle = '#9aa7b0'; g.fillRect(tw * 0.38, len * 0.45, tw * 0.24, len * 0.55);
      g.fillStyle = rgba(CY, 0.5); g.fillRect(tw * 0.38, len * 0.45, tw * 0.06, len * 0.55);
      g.restore();
    }
    for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(190,205,215,0.6)'; g.beginPath(); g.arc(w * (0.15 + r() * 0.7), h * (0.78 + r() * 0.12), Math.max(1.5, w * 0.004), 0, 7); g.fill(); }
    const lg = g.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, rgba(CY, 0.18)); lg.addColorStop(0.5, rgba(CY, 0)); g.fillStyle = lg; g.fillRect(0, 0, w, h);
    vignette(g, w, h, 0.7);
  },
  board(g, w, h, r) {
    base(g, w, h, '#06100e', '#020504');
    const cell = Math.max(10, Math.min(w, h) / 26);
    g.lineCap = 'round';
    for (let i = 0; i < 90; i++) {
      let x = Math.round(r() * w / cell) * cell, y = Math.round(r() * h / cell) * cell;
      g.strokeStyle = r() < 0.22 ? rgba(CY, 0.55) : 'rgba(140,175,160,0.22)';
      g.lineWidth = Math.max(1, cell * (0.08 + r() * 0.12));
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        const dir = Math.floor(r() * 4), l = cell * (2 + Math.floor(r() * 6));
        const dx = [1, 0, -1, 0][dir] * l, dy = [0, 1, 0, -1][dir] * l;
        if (r() < 0.5) { x += dx; y += dy; } else { x += dx * 0.7; y += Math.abs(dx || dy) * 0.7 * (r() < 0.5 ? 1 : -1); }
        g.lineTo(x, y);
      }
      g.stroke();
      g.fillStyle = 'rgba(200,170,90,0.6)'; g.beginPath(); g.arc(x, y, cell * 0.18, 0, 7); g.fill();
    }
    for (let i = 0; i < 9; i++) {
      const cw = cell * (2 + r() * 4), ch = cell * (2 + r() * 3), x = r() * (w - cw), y = r() * (h - ch);
      g.fillStyle = '#0a0d0e'; rr(g, x, y, cw, ch, cell * 0.2); g.fill();
      g.strokeStyle = 'rgba(120,140,150,0.35)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(200,175,100,0.45)';
      for (let p = cell * 0.4; p < cw - cell * 0.2; p += cell * 0.5) { g.fillRect(x + p, y - cell * 0.2, cell * 0.18, cell * 0.2); g.fillRect(x + p, y + ch, cell * 0.18, cell * 0.2); }
    }
    g.globalCompositeOperation = 'lighter';
    const lg = g.createLinearGradient(0, h, w, 0);
    lg.addColorStop(0.35, rgba(CY, 0)); lg.addColorStop(0.5, rgba(CY, 0.16)); lg.addColorStop(0.65, rgba(CY, 0));
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    vignette(g, w, h, 0.85);
  },
  hand(g, w, h, r) {
    base(g, w, h, '#060b10', '#020304');
    bokeh(g, w, h, r, 30, [[255, 180, 110], CY, [90, 130, 255]]);
    const ph = h * 0.72, pw = ph * 0.48;
    phoneShape(g, w * 0.52, h * 0.5, pw, ph, -0.1, (gg, x, y, sw, sh) => { screenGlow(gg, x, y, sw, sh, 0.85); cracksOn(gg, x, y, sw, sh, 5 + Math.floor(r() * 50)); });
    vignette(g, w, h, 0.7);
  },
  restored(g, w, h, r) {
    base(g, w, h, '#071017', '#020304');
    bokeh(g, w, h, r, 22, [[255, 190, 130], CY]);
    const ph = h * 0.7, pw = ph * 0.48;
    glow(g, w * 0.5, h * 0.5, ph * 0.7, CY, 0.18);
    phoneShape(g, w * 0.5, h * 0.52, pw, ph, 0.06, (gg, x, y, sw, sh) => { screenGlow(gg, x, y, sw, sh, 1); glow(gg, x + sw * 0.5, y + sh * 0.6, sw, CY, 0.25); });
    vignette(g, w, h, 0.7);
  },
  diag(g, w, h, r) {
    V.board(g, w, h, r);
    const cx = w * 0.55, cy = h * 0.45, R = Math.min(w, h) * 0.3;
    g.globalCompositeOperation = 'lighter';
    glow(g, cx, cy, R * 1.3, [255, 220, 170], 0.18);
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = rgba(CY, 0.7); g.lineWidth = Math.max(2, R * 0.05);
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(200,220,230,0.25)'; g.lineWidth = Math.max(1, R * 0.015);
    g.beginPath(); g.arc(cx, cy, R * 0.94, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#c7d2d8'; g.lineWidth = Math.max(2, R * 0.03);
    g.beginPath(); g.moveTo(w * 0.95, h * 0.95); g.lineTo(cx + R * 0.2, cy + R * 0.15); g.stroke();
    g.fillStyle = 'rgba(255,90,60,0.9)'; g.beginPath(); g.arc(cx + R * 0.2, cy + R * 0.15, Math.max(2, R * 0.03), 0, 7); g.fill();
  },
  repair(g, w, h, r) {
    base(g, w, h, '#0a1116', '#030405');
    const ph = h * 0.78, pw = ph * 0.48;
    phoneShape(g, w * 0.5, h * 0.56, pw, ph, 0.02, (gg, x, y, sw, sh) => {
      gg.fillStyle = '#0b1114'; gg.fillRect(x, y, sw, sh);
      gg.save(); gg.translate(x, y); V.board(gg, sw, sh * 0.35, r); gg.restore();
      gg.fillStyle = '#1a2a30'; rr(gg, x + sw * 0.12, y + sh * 0.42, sw * 0.76, sh * 0.48, sw * 0.04); gg.fill();
      gg.strokeStyle = rgba(CY, 0.4); gg.stroke();
    });
    g.save(); g.translate(w * 0.5, h * 0.2); g.rotate(-0.08);
    rr(g, -pw * 0.47, -ph * 0.06, pw * 0.94, ph * 0.12, pw * 0.08);
    g.fillStyle = 'rgba(30,140,160,0.35)'; g.fill(); g.strokeStyle = rgba(CY, 0.8); g.lineWidth = 2; g.stroke();
    g.restore();
    g.fillStyle = 'rgba(20,30,36,0.95)'; g.beginPath(); g.ellipse(w * 0.5, h * 0.12, pw * 0.16, pw * 0.1, 0, 0, 7); g.fill();
    g.strokeStyle = rgba(CY, 0.5); g.stroke();
    vignette(g, w, h, 0.75);
  },
  parts(g, w, h, r, circular = false) {
    base(g, w, h, '#0b1115', '#040607');
    const items = [[0.08, 0.1, 0.5, 0.42, 'screen'], [0.62, 0.1, 0.3, 0.42, 'battery'], [0.08, 0.6, 0.24, 0.3, 'cam'], [0.38, 0.6, 0.54, 0.12, 'flex'], [0.38, 0.78, 0.25, 0.12, 'port'], [0.68, 0.78, 0.24, 0.12, 'screws']];
    items.forEach(([x, y, iw, ih, t]) => {
      x *= w; y *= h; iw *= w; ih *= h;
      if (!circular) { g.fillStyle = 'rgba(160,210,225,0.06)'; rr(g, x - 6, y - 6, iw + 12, ih + 12, 10); g.fill(); g.strokeStyle = 'rgba(180,220,230,0.18)'; g.lineWidth = 1; g.stroke(); }
      else { g.strokeStyle = 'rgba(120,230,200,0.25)'; g.setLineDash([4, 5]); g.lineWidth = 1; rr(g, x - 6, y - 6, iw + 12, ih + 12, 6); g.stroke(); g.setLineDash([]); }
      if (t === 'screen') { const lg = g.createLinearGradient(x, y, x + iw, y + ih); lg.addColorStop(0, '#0d1d24'); lg.addColorStop(1, '#05090b'); g.fillStyle = lg; rr(g, x, y, iw, ih, 12); g.fill(); g.strokeStyle = rgba(CY, 0.35); g.stroke(); }
      if (t === 'battery') { g.fillStyle = '#1c2228'; rr(g, x, y, iw, ih, 8); g.fill(); g.fillStyle = circular ? 'rgba(120,230,200,0.35)' : rgba(CY, 0.3); g.fillRect(x + iw * 0.1, y + ih * 0.12, iw * 0.8, ih * 0.04); }
      if (t === 'cam') { [0.3, 0.7].forEach(k => { g.fillStyle = '#05080a'; g.beginPath(); g.arc(x + iw * 0.5, y + ih * k, Math.min(iw, ih) * 0.22, 0, 7); g.fill(); g.strokeStyle = 'rgba(200,215,225,0.4)'; g.lineWidth = 2; g.stroke(); }); }
      if (t === 'flex') { g.fillStyle = 'rgba(200,140,60,0.55)'; rr(g, x, y + ih * 0.3, iw, ih * 0.4, 4); g.fill(); }
      if (t === 'port') { g.fillStyle = '#7f8c95'; rr(g, x + iw * 0.2, y + ih * 0.3, iw * 0.6, ih * 0.4, ih * 0.2); g.fill(); }
      if (t === 'screws') { for (let i = 0; i < 6; i++) { g.fillStyle = '#9aa6ae'; g.beginPath(); g.arc(x + iw * (0.12 + i * 0.15), y + ih * 0.5, Math.max(2, ih * 0.1), 0, 7); g.fill(); } }
    });
    if (circular) {
      const cx = w * 0.82, cy = h * 0.5, R = Math.min(w, h) * 0.09;
      g.strokeStyle = 'rgba(120,230,200,0.8)'; g.lineWidth = Math.max(2, R * 0.12);
      for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx, cy, R, k * 2.09 + 0.25, k * 2.09 + 1.7); g.stroke(); }
      glow(g, w * 0.4, h * 0.5, Math.max(w, h) * 0.6, [120, 230, 200], 0.08);
    } else {
      glow(g, w * 0.3, h * 0.2, Math.max(w, h) * 0.5, CY, 0.08);
    }
    vignette(g, w, h, 0.6);
  },
  circular(g, w, h, r) { V.parts(g, w, h, r, true); },
  street(g, w, h, r) {
    base(g, w, h, '#05080d', '#020203');
    bokeh(g, w, h * 0.65, r, 40, [[255, 190, 120], CY, [255, 120, 90], [140, 170, 255]]);
    const y0 = h * 0.62;
    g.save(); g.globalAlpha = 0.35; g.translate(0, y0 * 2); g.scale(1, -0.6); g.drawImage(g.canvas, 0, 0, w, y0, 0, y0 * 1.1, w, y0); g.restore();
    const lg = g.createLinearGradient(0, y0, 0, h); lg.addColorStop(0, 'rgba(2,3,4,0.2)'); lg.addColorStop(1, 'rgba(2,3,4,0.9)');
    g.fillStyle = lg; g.fillRect(0, y0, w, h - y0);
    vignette(g, w, h, 0.6);
  },
  edge(g, w, h, r) {
    base(g, w, h, '#030406', '#010102');
    g.lineCap = 'round';
    const draw = (a, lw) => { g.strokeStyle = rgba(CY, a); g.lineWidth = lw; g.beginPath(); g.moveTo(-w * 0.05, h * 0.92); g.bezierCurveTo(w * 0.35, h * 0.88, w * 0.62, h * 0.55, w * 1.05, h * 0.12); g.stroke(); };
    g.save(); g.filter = 'blur(10px)'; draw(0.5, h * 0.05); g.restore();
    draw(0.25, h * 0.02); draw(0.95, Math.max(1.5, h * 0.006));
    g.strokeStyle = 'rgba(160,180,190,0.12)'; g.lineWidth = h * 0.12;
    g.beginPath(); g.moveTo(-w * 0.05, h * 1.05); g.bezierCurveTo(w * 0.35, h * 1.0, w * 0.62, h * 0.68, w * 1.05, h * 0.25); g.stroke();
    vignette(g, w, h, 0.5);
  },
  studio(g, w, h, r) {
    base(g, w, h, '#050a0e', '#020304');
    glow(g, w * 0.5, h * 0.46, Math.max(w, h) * 0.45, CY, 0.16);
    glow(g, w * 0.5, h * 0.46, Math.max(w, h) * 0.18, [200, 240, 250], 0.06);
    const fy = h * 0.78;
    const lg = g.createLinearGradient(0, fy, 0, h); lg.addColorStop(0, 'rgba(57,233,247,0.10)'); lg.addColorStop(0.05, 'rgba(10,16,20,0.6)'); lg.addColorStop(1, 'rgba(2,3,4,1)');
    g.fillStyle = lg; g.fillRect(0, fy, w, h - fy);
    dust(g, w, h, r, Math.round(w * h / 6000));
    vignette(g, w, h, 0.75);
  },
  lamp(g, w, h, r) {
    base(g, w, h, '#06090c', '#020203');
    const cx = w * 0.62, cy = h * 0.72;
    g.save(); g.translate(cx, cy); g.scale(1, 0.35);
    glow(g, 0, 0, Math.min(w, h) * 0.75, [255, 200, 140], 0.35); g.restore();
    g.strokeStyle = '#2a3138'; g.lineWidth = Math.max(4, w * 0.008); g.lineCap = 'round';
    g.beginPath(); g.moveTo(w * 0.9, h * 0.92); g.lineTo(w * 0.86, h * 0.35); g.lineTo(w * 0.68, h * 0.18); g.stroke();
    g.fillStyle = '#20272e'; g.beginPath(); g.moveTo(w * 0.6, h * 0.14); g.lineTo(w * 0.74, h * 0.14); g.lineTo(w * 0.7, h * 0.26); g.lineTo(w * 0.56, h * 0.26); g.fill();
    g.globalCompositeOperation = 'lighter';
    const lg = g.createLinearGradient(0, h * 0.26, 0, h * 0.8); lg.addColorStop(0, 'rgba(255,205,150,0.22)'); lg.addColorStop(1, 'rgba(255,205,150,0)');
    g.fillStyle = lg; g.beginPath(); g.moveTo(w * 0.56, h * 0.26); g.lineTo(w * 0.7, h * 0.26); g.lineTo(w * 0.86, h * 0.8); g.lineTo(w * 0.4, h * 0.8); g.fill();
    g.globalCompositeOperation = 'source-over';
    const ph = Math.min(h * 0.36, w * 0.5), pw = ph * 0.48;
    phoneShape(g, cx, cy - ph * 0.25, pw, ph, -0.25, (gg, x, y, sw, sh) => screenGlow(gg, x, y, sw, sh, 0.7));
    bokeh(g, w * 0.4, h * 0.6, r, 10, [CY]);
    vignette(g, w, h, 0.7);
  },
  tray(g, w, h, r) {
    base(g, w, h, '#071016', '#020304');
    g.fillStyle = '#111a20'; rr(g, w * 0.14, h * 0.18, w * 0.72, h * 0.66, w * 0.05); g.fill();
    g.strokeStyle = 'rgba(120,180,190,0.25)'; g.lineWidth = 2; g.stroke();
    const ph = h * 0.56, pw = ph * 0.48;
    phoneShape(g, w * 0.5, h * 0.51, pw, ph, 0, (gg, x, y, sw, sh) => { screenGlow(gg, x, y, sw, sh, 1); glow(gg, x + sw / 2, y + sh * 0.4, sw, CY, 0.3); });
    vignette(g, w, h, 0.7);
  },
};
