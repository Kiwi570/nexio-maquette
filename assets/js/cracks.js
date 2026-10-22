/* Générateur de fissures d'écran (toile d'araignée autour d'un point d'impact).
   Coordonnées en pixels d'un écran W × H. Sert à la texture WebGL et à la version SVG. */

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function makeCracks({ W = 640, H = 1384, ix = 0.66, iy = 0.27, seed = 11 } = {}) {
  const r = rng(seed);
  const cx = ix * W, cy = iy * H;
  const lines = [];      // { pts: [[x,y],...], w }
  const radials = [];
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2 + (r() - 0.5) * 0.32;
    const reach = (0.35 + r() * 0.75) * H;
    const pts = [[cx, cy]];
    let x = cx, y = cy, a = a0, travelled = 0;
    while (travelled < reach) {
      const st = 26 + r() * 46;
      a += (r() - 0.5) * 0.42;
      a = a * 0.8 + a0 * 0.2;
      x += Math.cos(a) * st; y += Math.sin(a) * st; travelled += st;
      pts.push([x, y]);
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) break;
    }
    radials.push({ a: a0, pts });
    lines.push({ pts, w: 2.4 + r() * 1.4 });
    // branches
    const nb = 1 + Math.floor(r() * 3);
    for (let b = 0; b < nb; b++) {
      const k = 2 + Math.floor(r() * Math.max(1, pts.length - 3));
      if (!pts[k]) continue;
      let [bx, by] = pts[k];
      let ba = a0 + (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.6);
      const bl = 50 + r() * 220;
      const bp = [[bx, by]];
      let t = 0;
      while (t < bl) {
        const st = 18 + r() * 30; ba += (r() - 0.5) * 0.5;
        bx += Math.cos(ba) * st; by += Math.sin(ba) * st; t += st; bp.push([bx, by]);
      }
      lines.push({ pts: bp, w: 1.2 + r() * 0.8 });
    }
  }
  // anneaux concentriques
  radials.sort((p, q) => p.a - q.a);
  const near = (pts, R) => {
    let best = null, bd = 1e9;
    for (const p of pts) { const d = Math.abs(Math.hypot(p[0] - cx, p[1] - cy) - R); if (d < bd) { bd = d; best = p; } }
    return bd < 40 ? best : null;
  };
  [[54, 0.85], [120, 0.75], [215, 0.55], [340, 0.4], [480, 0.25]].forEach(([R, prob]) => {
    for (let i = 0; i < radials.length; i++) {
      if (r() > prob) continue;
      const A = near(radials[i].pts, R * (0.85 + r() * 0.3));
      const B = near(radials[(i + 1) % radials.length].pts, R * (0.85 + r() * 0.3));
      if (!A || !B) continue;
      const mx = (A[0] + B[0]) / 2 + (r() - 0.5) * 18, my = (A[1] + B[1]) / 2 + (r() - 0.5) * 18;
      lines.push({ pts: [A, [mx, my], B], w: 1.1 + r() * 0.9 });
    }
  });
  // éclats autour de l'impact
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2, d = r() * 34, l = 6 + r() * 22;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    const b = a + (r() - 0.5) * 2;
    lines.push({ pts: [[x, y], [x + Math.cos(b) * l, y + Math.sin(b) * l]], w: 0.8 + r() * 1.2 });
  }
  return { W, H, cx, cy, lines };
}

/* Texture : R = fissures nettes, G = halo (pour la soudure), B = zone éclatée */
export function crackCanvas(cr) {
  const c = document.createElement('canvas');
  c.width = cr.W; c.height = cr.H;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, cr.W, cr.H);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.globalCompositeOperation = 'lighter';
  const path = l => { g.beginPath(); l.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); };
  // halo vert
  g.strokeStyle = 'rgba(0,255,0,0.55)'; g.shadowColor = 'rgba(0,255,0,1)'; g.shadowBlur = 16;
  cr.lines.forEach(l => { g.lineWidth = l.w * 2.2; path(l); });
  g.shadowBlur = 0;
  // fissures nettes rouges
  g.strokeStyle = 'rgb(255,0,0)';
  cr.lines.forEach(l => { g.lineWidth = l.w; path(l); });
  // zone éclatée bleue
  const rg = g.createRadialGradient(cr.cx, cr.cy, 0, cr.cx, cr.cy, 230);
  rg.addColorStop(0, 'rgba(0,0,255,1)'); rg.addColorStop(0.35, 'rgba(0,0,255,0.45)'); rg.addColorStop(1, 'rgba(0,0,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, cr.W, cr.H);
  return c;
}

/* Chemins SVG (version sans WebGL) */
export function crackPaths(cr, scale = 1) {
  return cr.lines.map(l => ({
    d: l.pts.map((p, i) => (i ? 'L' : 'M') + (p[0] * scale).toFixed(1) + ' ' + (p[1] * scale).toFixed(1)).join(' '),
    w: l.w * scale,
    dist: Math.hypot(l.pts[0][0] - cr.cx, l.pts[0][1] - cr.cy),
  }));
}
