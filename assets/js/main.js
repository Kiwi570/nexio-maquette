/* NEXIO — comportements communs à toutes les pages */
import { Lenis } from '../vendor/lenis/lenis.js';
import { initSlots } from './slots.js?v=20261028';
import { NEXIO, JOURS, ouverture } from './data.js?v=20261028';

export const gsap = window.gsap;
export const ScrollTrigger = window.ScrollTrigger;
const SplitText = window.SplitText;
gsap.registerPlugin(ScrollTrigger, SplitText);

const html = document.documentElement;
html.classList.add('js');

function readCalm() {
  let s = null;
  try { s = localStorage.getItem('nexio-calm'); } catch (e) { /* stockage indisponible */ }
  if (s === null) return matchMedia('(prefers-reduced-motion: reduce)').matches;
  return s === '1';
}
export const calm = readCalm();
html.classList.toggle('calm', calm);
export const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
export const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- Défilement fluide ---------- */
export let lenis = null;
function smooth() {
  if (calm) return;
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, anchors: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
export function scrollToEl(el) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -72, duration: 1.4 });
  else el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
}
function anchors() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const t = id ? document.getElementById(id) : null;
    if (!t) return;
    e.preventDefault();
    closeMenu();
    scrollToEl(t);
    t.setAttribute('tabindex', '-1');
    setTimeout(() => t.focus({ preventScroll: true }), 600);
  });
}

/* ---------- Données « à compléter » ---------- */
const TODO = '<span class="todo">à compléter</span>';
export function fillFacts(root = document) {
  root.querySelectorAll('[data-fact]').forEach(el => {
    const k = el.dataset.fact;
    const v = NEXIO[k];
    if (v === null || v === undefined || (Array.isArray(v) && !v.length)) {
      el.innerHTML = (el.dataset.prefix || '') + TODO;
      el.classList.add('is-todo');
      el.closest('[data-copy]')?.querySelector('.copy')?.setAttribute('disabled', '');
      return;
    }
    const txt = Array.isArray(v) ? v.join(', ') : String(v);
    const href = k === 'telephone' ? 'tel:' + txt.replace(/[^\d+]/g, '') : k === 'email' ? 'mailto:' + txt : k === 'avisGoogle' ? txt : null;
    if (href && !el.closest('a')) {
      const a = document.createElement('a');
      a.className = 'link'; a.href = href; a.textContent = k === 'avisGoogle' ? 'Voir les avis' : txt;
      if (k === 'avisGoogle') { a.target = '_blank'; a.rel = 'noopener'; }
      el.replaceChildren(a);
    } else el.textContent = txt;
  });
  root.querySelectorAll('[data-horaires]').forEach(el => {
    if (!NEXIO.horaires) {
      el.innerHTML = '<table class="hours"><tbody>' + [1, 2, 3, 4, 5, 6, 0].map(j => `<tr><th scope="row">${JOURS[j]}</th><td>—</td></tr>`).join('') + '</tbody></table>';
      return;
    }
    const order = [1, 2, 3, 4, 5, 6, 0];
    const today = new Date().getDay();
    el.innerHTML = '<table class="hours"><tbody>' + order.map(j => {
      const p = NEXIO.horaires[j];
      const t = p && p.length ? p.map(([a, b]) => `${a} – ${b}`).join(' · ') : 'Fermé';
      return `<tr${j === today ? ' class="is-today"' : ''}><th scope="row">${JOURS[j]}</th><td>${t}</td></tr>`;
    }).join('') + '</tbody></table>';
  });
  root.querySelectorAll('[data-status]').forEach(el => {
    const o = ouverture(NEXIO.horaires);
    el.classList.remove('is-open', 'is-closed', 'is-unknown');
    if (o.etat === 'ouvert') { el.classList.add('is-open'); el.textContent = `Ouvert maintenant · jusqu’à ${o.jusqua}`; }
    else if (o.etat === 'ferme') {
      el.classList.add('is-closed');
      const n = o.prochain;
      el.textContent = n ? `Fermé · ouvre ${n.aujourdhui ? 'à' : n.demain ? 'demain à' : JOURS[n.jour].toLowerCase() + ' à'} ${n.heure}` : 'Fermé';
    } else { el.classList.add('is-unknown'); el.textContent = 'Horaires à compléter'; }
  });
  root.querySelectorAll('[data-copy]').forEach(box => {
    const btn = box.querySelector('.copy');
    const val = box.querySelector('[data-fact]');
    if (!btn || !val || btn.hasAttribute('disabled')) return;
    btn.addEventListener('click', async () => {
      const txt = val.textContent.trim();
      try { await navigator.clipboard.writeText(txt); btn.textContent = 'Copié'; }
      catch (e) { const r = document.createRange(); r.selectNodeContents(val); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Sélectionné'; }
      setTimeout(() => { btn.textContent = 'Copier'; }, 1800);
    });
  });
}

/* ---------- En-tête et menu ---------- */
let menuOpen = false;
function header() {
  const h = document.querySelector('.site-header');
  if (!h) return;
  let lastY = 0;
  const onScroll = y => {
    h.classList.toggle('is-scrolled', y > 30);
    if (!menuOpen) h.classList.toggle('is-hidden', y > 260 && y > lastY + 2);
    if (y < lastY - 2) h.classList.remove('is-hidden');
    lastY = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  const btn = h.querySelector('.menu-btn');
  const panel = document.getElementById('menu');
  btn?.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  document.addEventListener('keydown', e => {
    if (!menuOpen) return;
    if (e.key === 'Escape') { closeMenu(); return; }
    if (e.key !== 'Tab') return;
    // le focus reste entre le bouton du menu et le contenu du menu
    const items = [btn, ...panel.querySelectorAll('a[href], button:not([disabled])')];
    const i = items.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
  });
  panel?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => closeMenu()));
}
function openMenu() {
  const btn = document.querySelector('.menu-btn'), panel = document.getElementById('menu');
  if (!panel) return;
  menuOpen = true;
  panel.hidden = false;
  panel.setAttribute('data-lenis-prevent', '');
  document.querySelectorAll('body > main, body > footer, body > .skip').forEach(el => { el.inert = true; });
  btn.setAttribute('aria-expanded', 'true');
  html.classList.add('menu-open');
  lenis?.stop();
  if (!calm) {
    gsap.fromTo(panel, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'expo.out' });
    gsap.from(panel.querySelectorAll('.menu__link, .menu__foot > *'), { yPercent: 60, opacity: 0, stagger: 0.05, duration: 0.6, ease: 'power3.out', delay: 0.1 });
  }
  panel.querySelector('a')?.focus();
}
function closeMenu() {
  if (!menuOpen) return;
  const btn = document.querySelector('.menu-btn'), panel = document.getElementById('menu');
  menuOpen = false;
  document.querySelectorAll('body > main, body > footer, body > .skip').forEach(el => { el.inert = false; });
  btn.setAttribute('aria-expanded', 'false');
  html.classList.remove('menu-open');
  lenis?.start();
  const done = () => { panel.hidden = true; panel.style.clipPath = ''; };
  if (calm) done(); else gsap.to(panel, { clipPath: 'inset(0 0 100% 0)', duration: 0.45, ease: 'power3.in', onComplete: done });
  btn.focus();
}

function calmToggle() {
  document.querySelectorAll('[data-calm-toggle]').forEach(b => {
    b.setAttribute('aria-pressed', calm ? 'true' : 'false');
    b.querySelector('.calm-state') && (b.querySelector('.calm-state').textContent = calm ? 'réduites' : 'activées');
    b.addEventListener('click', () => {
      try { localStorage.setItem('nexio-calm', calm ? '0' : '1'); } catch (e) { /* ignore */ }
      if (!calm) html.classList.add('calm');
      location.reload();
    });
  });
}

/* ---------- Curseur ---------- */
function cursor() {
  if (!fine || calm) return;
  const ring = document.createElement('div'); ring.className = 'cursor'; ring.setAttribute('aria-hidden', 'true');
  ring.innerHTML = '<span class="cursor__label"></span>';
  const dot = document.createElement('div'); dot.className = 'cursor-dot'; dot.setAttribute('aria-hidden', 'true');
  document.body.append(ring, dot);
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08 });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
  const label = ring.querySelector('.cursor__label');
  addEventListener('pointermove', e => {
    rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    html.classList.add('has-cursor');
    const t = e.target.closest?.('a, button, [data-cursor], input, select, label, textarea');
    ring.classList.toggle('is-link', !!t);
    const lab = html.classList.contains('cursor-solder') ? 'souder' : (t?.dataset.cursor || '');
    if (label.textContent !== lab) label.textContent = lab;
    ring.classList.toggle('has-label', !!lab);
  }, { passive: true });
  document.addEventListener('pointerleave', () => html.classList.remove('has-cursor'));
  addEventListener('pointerdown', () => ring.classList.add('is-down'));
  addEventListener('pointerup', () => ring.classList.remove('is-down'));
}

/* ---------- Micro-interactions ---------- */
function magnetic() {
  if (!fine || calm) return;
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.3); y((e.clientY - r.top - r.height / 2) * 0.4);
    });
    el.addEventListener('pointerleave', () => { gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' }); });
  });
}
export function tilt(root = document) {
  if (!fine || calm) return;
  root.querySelectorAll('[data-tilt]').forEach(el => {
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    gsap.set(el, { transformPerspective: 900 });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * 12); rx((0.5 - py) * 10);
      el.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}
function lamp() {
  document.querySelectorAll('[data-lamp]').forEach(el => {
    if (!fine || calm) return;
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      el.style.setProperty('--ly', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      el.classList.add('lamp-on');
    });
    el.addEventListener('pointerleave', () => el.classList.remove('lamp-on'));
  });
}

/* ---------- Apparitions au défilement ---------- */
export function glitchIn(el, opts = {}) {
  const split = new SplitText(el, { type: 'chars,words', charsClass: 'gch' });
  const tl = gsap.timeline(opts);
  tl.from(split.chars, {
    opacity: 0, x: () => rand(-28, 28), y: () => rand(-16, 16), color: '#39e9f7',
    duration: 0.55, ease: 'steps(5)', stagger: { each: 0.018, from: 'random' },
  }).to(split.chars, { color: '', duration: 0.4, stagger: { each: 0.01, from: 'random' }, clearProps: 'color' }, '-=0.25');
  return tl;
}
function reveals() {
  if (calm) return;
  document.querySelectorAll('[data-reveal]').forEach(el => {
    const kind = el.dataset.reveal;
    const st = { trigger: el, start: 'top 88%', once: true };
    if (kind === 'lines') {
      const s = new SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'ln' });
      gsap.from(s.lines, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: st });
    } else if (kind === 'clip') {
      gsap.fromTo(el, { clipPath: 'inset(18% 8% 18% 8% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.4, ease: 'expo.out', scrollTrigger: st });
    } else if (kind === 'glitch') {
      glitchIn(el, { scrollTrigger: st });
    } else if (kind === 'stagger') {
      gsap.from(el.children, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, scrollTrigger: st });
    } else {
      gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: st });
    }
  });
  document.querySelectorAll('[data-parallax]').forEach(el => {
    const inner = () => el.querySelector('.slot__inner');
    const amt = +(el.dataset.parallax || 10);
    ScrollTrigger.create({
      trigger: el, start: 'top bottom', end: 'bottom top',
      onUpdate: self => { const i = inner(); if (i) i.style.transform = `translate3d(0, ${(self.progress - 0.5) * amt * 2}%, 0) scale(${1 + amt / 50})`; },
    });
  });
}

/* ---------- Transitions de page (balayage d'écran) ---------- */
function transitions() {
  const veil = document.querySelector('.veil');
  if (!veil) return;
  addEventListener('pageshow', e => { if (e.persisted) gsap.set(veil, { yPercent: -100 }); });
  if (calm) return;
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    const href = a.getAttribute('href');
    if (!/\.html(\?|$)/.test(href) || /^https?:/.test(href)) return;
    const norm = p => p.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
    const u = new URL(a.href, location.href);
    if (norm(u.pathname) === norm(location.pathname) && u.search === location.search) {
      e.preventDefault(); closeMenu(); scrollToEl(document.getElementById('contenu') || document.body); return;
    }
    e.preventDefault();
    gsap.timeline({ onComplete: () => { location.href = href; } })
      .set(veil, { yPercent: -100, visibility: 'visible' })
      .to(veil, { yPercent: 0, duration: 0.55, ease: 'expo.inOut' });
  });
}
export function veilOut() {
  const veil = document.querySelector('.veil');
  if (!veil) return gsap.timeline();
  if (calm) { gsap.set(veil, { yPercent: -100 }); return gsap.timeline(); }
  return gsap.timeline()
    .set(veil, { yPercent: 0, visibility: 'visible' })
    .fromTo(veil.querySelector('.veil__line'), { y: 0 }, { y: () => innerHeight, duration: 0.55, ease: 'power2.inOut' }, 0)
    .to(veil, { yPercent: 100, duration: 0.7, ease: 'expo.inOut' }, 0.15)
    .set(veil, { visibility: 'hidden' });
}

/* ---------- Démarrage ---------- */
export function boot() {
  smooth();
  anchors();
  fillFacts();
  header();
  calmToggle();
  cursor();
  magnetic();
  tilt();
  lamp();
  initSlots();
  reveals();
  transitions();
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
