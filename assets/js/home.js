/* NEXIO — accueil */
import { gsap, ScrollTrigger, boot, calm, fine, veilOut, glitchIn, scrollToEl } from './main.js?v=20261028';
import { MARQUES, AUTRES_MARQUES, PANNES, prix, euros } from './data.js?v=20261028';
import { makeCracks, crackPaths } from './cracks.js?v=20261028';

boot();

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;

/* =========================================================
   1. Ouverture : téléphone 3D à l'écran fissuré
   ========================================================= */
const hero = $('.hero');
const canvas = $('.hero__gl', hero);
const meter = $('.meter-val', hero);
const hint = $('.hint-txt', hero);
if (!fine) hint.textContent = 'Passez le doigt sur l’écran pour le réparer';

let phone = null;
let svgPhone = null;
let painted = 0;

async function startPhone() {
  try {
    const m = await import('./phone3d.js?v=20261028');
    if (!m.webglOK()) throw new Error('webgl');
    phone = m.createPhone(canvas, { mode: 'hero', calm, onPaint: v => { painted = v; } });
  } catch (e) {
    canvas.hidden = true;
    svgPhone = buildSvgPhone($('.hero__svg', hero));
  }
}

/* Version sans WebGL : téléphone SVG, fissures qui se ressoudent */
function buildSvgPhone(box) {
  box.hidden = false;
  const cr = makeCracks({});
  const sc = 216 / 640;
  const paths = crackPaths(cr, sc);
  box.innerHTML = `<svg viewBox="0 0 240 500" role="img" aria-label="Téléphone à l’écran fissuré">
    <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#03141c"/><stop offset=".55" stop-color="#0b4b57"/><stop offset="1" stop-color="#02070b"/></linearGradient><clipPath id="sc"><rect x="0" y="0" width="216" height="476" rx="27"/></clipPath></defs>
    <rect x="2" y="2" width="236" height="496" rx="36" fill="#141a20" stroke="rgba(57,233,247,.35)"/>
    <rect x="12" y="12" width="216" height="476" rx="27" fill="url(#sg)"/>
    <g transform="translate(12 12)" clip-path="url(#sc)" fill="none" stroke-linecap="round">${paths.map(p => `<path d="${p.d}" stroke="#dff4f8" stroke-width="${Math.max(0.6, p.w).toFixed(2)}" data-d="${p.dist.toFixed(0)}"/>`).join('')}</g>
  </svg>`;
  const els = $$('path[data-d]', box);
  els.forEach(p => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = calm ? 0 : l; p.style.transition = 'stroke .5s, opacity .9s'; });
  const svg = $('svg', box);
  const heal = (fn) => els.forEach(p => { if (fn(p) && !p.classList.contains('ok')) { p.classList.add('ok'); p.style.stroke = '#39e9f7'; setTimeout(() => { p.style.opacity = 0; }, 350); } });
  svg.addEventListener('pointermove', e => {
    const r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 240 - 12, y = (e.clientY - r.top) / r.height * 500 - 12;
    const cx = cr.cx * sc, cy = cr.cy * sc;
    const d = Math.hypot(x - cx, y - cy);
    heal(p => Math.abs(+p.dataset.d - d) < 50);
    painted = $$('path.ok', box).length / els.length;
  });
  return {
    draw(tl, at) { tl.to(els, { strokeDashoffset: 0, duration: 0.7, ease: 'power3.out', stagger: 0.004 }, at); },
    wave(v) { const max = 1384 * sc; heal(p => +p.dataset.d < v * max); painted = Math.max(painted, $$('path.ok', box).length / els.length); },
  };
}

function setMeter() {
  const wave = phone ? phone.state.wave : 0;
  const v = Math.round(Math.min(1, Math.max(painted * 1.6, wave)) * 100);
  const txt = v + ' %';
  if (meter.textContent !== txt) meter.textContent = txt;
}

async function intro() {
  const title = $('.hero__title');
  if (calm) {
    html.classList.remove('intro');
    await startPhone();
    if (phone) Object.assign(phone.state, { rise: 1, power: 1, crack: 1, wave: 1, rotY: -0.25 });
    if (svgPhone) svgPhone.wave(1);
    meter.textContent = '100 %';
    return;
  }
  // le texte s'ouvre tout de suite, le téléphone 3D le rejoint dès qu'il est chargé
  const t0 = performance.now();
  const tl = gsap.timeline({ delay: 0.05, onComplete: () => html.classList.remove('intro') });
  tl.add(veilOut(), 0)
    .add(glitchIn(title), 0.85)
    .from('.hero__content .eyebrow, .hero__lead, .hero__cta > *, .brands li', { y: 24, opacity: 0, stagger: 0.05, duration: 0.8, ease: 'power3.out' }, 1.45)
    .from('.hero__hint, .hero__meter, .hero__scroll', { opacity: 0, y: 12, duration: 0.6, stagger: 0.08 }, 2.05);

  await startPhone();
  const late = (performance.now() - t0) / 1000;
  const pt = gsap.timeline({ delay: Math.max(0, 0.4 - late) });
  if (phone) {
    pt.to(phone.state, { rise: 1, duration: 1.5, ease: 'expo.out' }, 0)
      .fromTo(phone.state, { rotX: 0.75, rotY: -0.9 }, { rotX: 0.12, rotY: -0.32, duration: 1.7, ease: 'expo.out' }, 0)
      .to(phone.state, { power: 1, duration: 0.7, ease: 'power2.inOut' }, 0.6)
      .to(phone.state, { crack: 1, duration: 0.6, ease: 'power4.out' }, 1.15)
      .fromTo(canvas, { x: 0 }, { x: 5, duration: 0.05, repeat: 3, yoyo: true, ease: 'none', clearProps: 'x' }, 1.15);
  } else if (svgPhone) {
    svgPhone.draw(pt, 0.6);
  }

  // démonstration si personne ne touche l'écran
  gsap.delayedCall(6, () => { if (phone && painted < 0.02 && scrollY < 80) phone.ghostStroke(2.6); });
  gsap.ticker.add(setMeter);

  // au défilement, la soudure se propage et le téléphone pivote
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const st = { trigger: hero, start: 'top top', end: '+=75%', scrub: 0.8, pin: true, anticipatePin: 1 };
    const t = gsap.timeline({ scrollTrigger: st });
    if (phone) t.to(phone.state, { wave: 1.05, rotY: 0.5, x: -0.15, scale: 0.92, ease: 'none' }, 0);
    else if (svgPhone) t.to({ v: 0 }, { v: 1, ease: 'none', onUpdate() { svgPhone.wave(this.targets()[0].v); } }, 0);
    t.to('.hero__content', { y: -50, opacity: 0.35, ease: 'none' }, 0.4)
      .to('.hero__hint, .hero__meter', { opacity: 0, ease: 'none' }, 0.6);
  });
  mm.add('(max-width: 899px)', () => {
    const t = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } });
    if (phone) t.to(phone.state, { wave: 1.05, rotY: 0.4, ease: 'none' }, 0);
    else if (svgPhone) t.to({ v: 0 }, { v: 1, ease: 'none', onUpdate() { svgPhone.wave(this.targets()[0].v); } }, 0);
  });
  // l'épinglage de l'ouverture est créé après les autres : on remet l'ordre
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  let cible = null;
  try { cible = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; } catch (e) { /* ancre invalide */ }
  if (cible) scrollToEl(cible);
}
intro();

/* =========================================================
   2. Promesse : le texte s'allume mot à mot
   ========================================================= */
(function manifesto() {
  const el = $('[data-words]');
  if (!el || calm) return;
  const split = new window.SplitText(el, { type: 'words', wordsClass: 'w', aria: 'none' }); // découpage en mots : le texte reste lisible tel quel
  split.words.forEach(w => { if (w.closest('.hl-g')) w.classList.add('hl'); });
  gsap.to(split.words, {
    opacity: 1, stagger: 0.08, ease: 'none',
    scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
  });
})();

/* =========================================================
   3. Réparations : micro-animations quand les cartes sont visibles
   ========================================================= */
(function live() {
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-live', e.isIntersecting)), { rootMargin: '-10% 0px' });
  $$('.card').forEach(c => io.observe(c));
})();

/* =========================================================
   4. Parcours : défilement horizontal, câble qui se branche
   ========================================================= */
(function journey() {
  const pin = $('.journey__pin'), track = $('.journey__track');
  const svg = $('.cable', track), bg = $('.c-bg', svg), fg = $('.c-fg', svg);
  const pct = $('.journey__hud .pct'), mini = $('.journey__hud .batt-mini');
  const endB = $('.end-batt'), endPct = $('.end-pct');
  let len = 1;

  function setCharge(p) {
    p = Math.max(0, Math.min(1, p));
    fg.style.strokeDashoffset = len * (1 - p);
    const v = Math.round(p * 100) + ' %';
    if (pct) pct.textContent = v;
    mini?.style.setProperty('--p', p * 100 + '%');
    endB?.style.setProperty('--p', p * 100 + '%');
    if (endPct) endPct.textContent = v;
  }

  function cableH() {
    const W = track.scrollWidth, H = 120;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const endX = $('.journey__end').offsetLeft + 6;
    let d = `M 0 60`;
    const seg = 380;
    let x = 0, up = true;
    while (x + seg < endX) { d += ` C ${x + seg * 0.35} ${up ? 18 : 102}, ${x + seg * 0.65} ${up ? 18 : 102}, ${x + seg} 60`; x += seg; up = !up; }
    d += ` C ${x + (endX - x) * 0.4} 60, ${x + (endX - x) * 0.6} 60, ${endX} 60`;
    bg.setAttribute('d', d); fg.setAttribute('d', d);
    $('.plug-g', svg)?.remove();
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'plug-g');
    g.setAttribute('transform', `translate(${endX - 44} 46)`);
    g.innerHTML = '<rect x="0" y="0" width="44" height="28" rx="8" fill="#131920" stroke="#39e9f7" stroke-width="1.5"/><rect x="44" y="7" width="20" height="14" rx="7" fill="#a2b0b9"/>';
    svg.appendChild(g);
    len = fg.getTotalLength(); fg.style.strokeDasharray = len;
  }
  function cableV() {
    const H = track.offsetHeight, W = 24;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let d = `M 12 0`, y = 0; const seg = 220; let left = true;
    while (y + seg < H) { d += ` C ${left ? 2 : 22} ${y + seg * 0.35}, ${left ? 2 : 22} ${y + seg * 0.65}, 12 ${y + seg}`; y += seg; left = !left; }
    d += ` L 12 ${H}`;
    bg.setAttribute('d', d); fg.setAttribute('d', d);
    $('.plug-g', svg)?.remove();
    len = fg.getTotalLength(); fg.style.strokeDasharray = len;
  }

  if (calm) {
    cableV(); setCharge(1); addEventListener('resize', cableV);
    return;
  }
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    cableH(); setCharge(0);
    ScrollTrigger.addEventListener('refreshInit', cableH);
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, onUpdate: s => setCharge(s.progress) },
    });
    $$('.step', track).forEach(st => {
      const inner = $('.slot__inner', st);
      if (inner) gsap.fromTo(inner, { xPercent: -5, scale: 1.12 }, { xPercent: 5, scale: 1.12, ease: 'none', scrollTrigger: { trigger: st, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      gsap.from($('.step__txt', st).children, { y: 30, opacity: 0, stagger: 0.06, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: st, containerAnimation: tween, start: 'left 85%' } });
    });
    return () => ScrollTrigger.removeEventListener('refreshInit', cableH);
  });
  mm.add('(max-width: 899px)', () => {
    cableV(); setCharge(0);
    ScrollTrigger.addEventListener('refreshInit', cableV);
    ScrollTrigger.create({ trigger: track, start: 'top 70%', end: 'bottom 75%', scrub: 0.5, onUpdate: s => setCharge(s.progress) });
    $$('.step', track).forEach(st => gsap.from(st, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: st, start: 'top 85%', once: true } }));
    return () => ScrollTrigger.removeEventListener('refreshInit', cableV);
  });
})();

/* =========================================================
   5. Pièces : les deux volets s'ouvrent depuis la jointure
   ========================================================= */
(function parts() {
  if (calm) return;
  const sec = $('#pieces');
  const tl = gsap.timeline({ scrollTrigger: { trigger: $('.parts__split', sec), start: 'top 75%', once: true } });
  tl.from('.part--new', { xPercent: 12, rotationY: -14, opacity: 0, duration: 1.3, ease: 'expo.out', transformPerspective: 1200 }, 0)
    .from('.part--circ', { xPercent: -12, rotationY: 14, opacity: 0, duration: 1.3, ease: 'expo.out', transformPerspective: 1200 }, 0)
    .from('.parts__seam svg', { scale: 0.4, opacity: 0, duration: 0.9, ease: 'back.out(2)' }, 0.3);
  $$('.parts__seam .ring').forEach(r => { const l = r.getTotalLength(); gsap.fromTo(r, { strokeDasharray: l, strokeDashoffset: l }, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.out', scrollTrigger: { trigger: r, start: 'top 85%', once: true } }); });
  gsap.to('.parts__seam svg', { rotation: 360, duration: 24, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
})();

/* =========================================================
   6. Estimation rapide
   ========================================================= */
(function quick() {
  const f = $('#quick');
  if (!f) return;
  const sel = $('#q-modele', f), out = $('#q-prix', f), note = $('#q-note', f), go = $('#q-go'), rdv = $('#q-rdv');
  const svg = $('.quick__viz .xray-svg');
  const fill = marque => {
    const m = MARQUES.find(x => x.id === marque);
    const list = marque === 'autre' ? AUTRES_MARQUES.map(n => n + ' (modèle à préciser)') : m.modeles;
    sel.innerHTML = list.map(n => `<option>${n}</option>`).join('');
    if (marque === 'iphone') sel.value = 'iPhone 13';
  };
  const update = () => {
    const marque = f.querySelector('[name=q-marque]:checked')?.value || 'iphone';
    const panne = f.querySelector('[name=q-panne]:checked')?.value || 'ecran';
    const modele = sel.value;
    const p = PANNES.find(x => x.id === panne);
    $$('[data-part]', svg).forEach(g => g.classList.toggle('on', g.dataset.part === p.part));
    const v = prix(modele, panne, 'conseil');
    out.innerHTML = v === null ? '<span class="todo">à compléter</span>' : 'à partir de ' + euros(v);
    note.textContent = v === null ? `${p.label} · ${modele} : les tarifs NEXIO s’afficheront ici dès qu’ils seront renseignés.` : `${p.label} · ${modele}. Estimation indicative, confirmée au diagnostic.`;
    const qs = new URLSearchParams({ marque, modele, panne }).toString();
    go.href = 'estimation.html?' + qs; rdv.href = 'rendez-vous.html?' + qs;
    if (!calm) gsap.fromTo(out, { opacity: 0.2, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
  };
  fill('iphone'); update();
  f.addEventListener('change', e => { if (e.target.name === 'q-marque') fill(e.target.value); update(); });
})();

/* =========================================================
   7. Confiance : jauge +100
   ========================================================= */
(function gauge() {
  const g = $('[data-gauge]');
  if (!g) return;
  const fillEl = $('.gauge__fill', g), num = $('[data-count]', g);
  if (calm) return;
  const o = { v: 0 };
  gsap.set(fillEl, { '--p': 0 });
  gsap.to(o, {
    v: 100, duration: 2.2, ease: 'power2.out',
    scrollTrigger: { trigger: g, start: 'top 75%', once: true },
    onUpdate: () => { num.textContent = Math.round(o.v); fillEl.style.setProperty('--p', (o.v / 100).toFixed(3)); },
  });
})();

/* =========================================================
   8. Infos : le trajet se dessine jusqu'à l'épingle
   ========================================================= */
(function map() {
  if (calm) return;
  $$('.map-route').forEach(p => {
    const l = p.getTotalLength();
    gsap.fromTo(p, { strokeDasharray: l, strokeDashoffset: l }, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut', scrollTrigger: { trigger: p.closest('svg'), start: 'top 80%', once: true } });
  });
})();

// tout le script de page s'est exécuté : le filet de sécurité du voile n'est plus nécessaire
window.__nexioReady = true;
