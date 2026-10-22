/* NEXIO — page Rendez-vous (prise de rendez-vous simulée) */
import { gsap, boot, calm, veilOut, glitchIn, scrollToEl } from './main.js';
import { NEXIO, JOURS, MARQUES, PANNES, PIECES, creneaux } from './data.js';

window.__nexioReady = true;
boot();

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const form = $('#rdv');
const st = { step: 1, date: null, heure: null };
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/* ---------- Appareil ---------- */
const selMarque = $('#r-marque'), selModele = $('#r-modele');
function fillModeles() {
  const m = selMarque.value;
  $('#r-modele-f').hidden = m === 'autre';
  $('#r-libre-f').hidden = m !== 'autre';
  if (m !== 'autre') selModele.innerHTML = MARQUES.find(x => x.id === m).modeles.map(n => `<option>${n}</option>`).join('');
}
selMarque.addEventListener('change', fillModeles);

const q = new URLSearchParams(location.search);
if (MARQUES.some(m => m.id === q.get('marque'))) selMarque.value = q.get('marque');
fillModeles();
if (q.get('modele')) {
  if (selMarque.value === 'autre') $('#r-libre').value = q.get('modele');
  else if ([...selModele.options].some(o => o.value === q.get('modele'))) selModele.value = q.get('modele');
}
(q.get('pannes') || q.get('panne') || '').split(',').forEach(id => { const i = form.querySelector(`[name=r-panne][value="${id}"]`); if (i) i.checked = true; });
if (PIECES.some(p => p.id === q.get('pieces'))) form.querySelector(`[name=r-pieces][value="${q.get('pieces')}"]`).checked = true;

/* ---------- Créneaux ---------- */
const daysEl = $('#days'), slotsEl = $('#slots');
$('#demo-note').hidden = !!NEXIO.horaires;
function renderDays() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let h = '';
  for (let i = 0; i < 14; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const list = available(d);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    h += `<button type="button" class="day" data-date="${key}" aria-pressed="${st.date === key}" ${list.length ? '' : 'disabled'} aria-label="${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}"><small>${JOURS[d.getDay()].slice(0, 3)}</small><b>${d.getDate()}</b><small>${MOIS[d.getMonth()]}</small></button>`;
  }
  daysEl.innerHTML = h;
}
function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function available(d) {
  const { liste } = creneaux(NEXIO.horaires, d);
  const now = new Date();
  if (d.toDateString() !== now.toDateString()) return liste;
  const lim = now.getHours() * 60 + now.getMinutes() + 60;
  return liste.filter(t => { const [h, m] = t.split(':').map(Number); return h * 60 + m >= lim; });
}
function renderSlots() {
  if (!st.date) { slotsEl.innerHTML = '<p class="muted" style="grid-column:1/-1">Choisissez d’abord un jour.</p>'; return; }
  const list = available(parseDate(st.date));
  slotsEl.innerHTML = list.map(t => `<button type="button" class="slot-btn" data-t="${t}" aria-pressed="${st.heure === t}">${t}</button>`).join('');
  if (!calm) gsap.from(slotsEl.children, { y: 10, opacity: 0, stagger: 0.015, duration: 0.35, ease: 'power2.out' });
}
daysEl.addEventListener('click', e => {
  const b = e.target.closest('.day'); if (!b || b.disabled) return;
  st.date = b.dataset.date; st.heure = null;
  $$('.day', daysEl).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  renderSlots();
});
slotsEl.addEventListener('click', e => {
  const b = e.target.closest('.slot-btn'); if (!b) return;
  st.heure = b.dataset.t;
  $$('.slot-btn', slotsEl).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  $('#e-slot').hidden = true;
});

/* ---------- Validation ---------- */
const telOk = v => { let d = v.replace(/[\s.\-()]/g, ''); if (d.startsWith('+33')) d = '0' + d.slice(3); return /^0\d{9}$/.test(d); };
const mailOk = v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function fieldErr(input, bad) {
  input.setAttribute('aria-invalid', bad ? 'true' : 'false');
  const err = input.parentElement.querySelector('.err');
  if (err) { err.hidden = !bad; if (bad) { err.id = err.id || input.id + '-err'; input.setAttribute('aria-describedby', err.id); } }
  return !bad;
}
function validate(step) {
  if (step === 1) {
    const okP = $$('[name=r-panne]:checked', form).length > 0;
    $('#e-panne').hidden = okP;
    let okM = true;
    if (selMarque.value === 'autre') okM = fieldErr($('#r-libre'), !$('#r-libre').value.trim());
    return okP && okM;
  }
  if (step === 2) { const ok = !!(st.date && st.heure); $('#e-slot').hidden = ok; return ok; }
  if (step === 3) {
    const a = fieldErr($('#f-prenom'), !$('#f-prenom').value.trim());
    const b = fieldErr($('#f-nom'), !$('#f-nom').value.trim());
    const c = fieldErr($('#f-tel'), !telOk($('#f-tel').value));
    const d = fieldErr($('#f-mail'), !mailOk($('#f-mail').value.trim()));
    const e = $('#f-ok').checked; $('#e-ok').hidden = e;
    const first = form.querySelector('[data-step="3"] [aria-invalid="true"]');
    first?.focus();
    return a && b && c && d && e;
  }
  return true;
}

/* ---------- Navigation entre étapes ---------- */
function data() {
  const marque = selMarque.value;
  const modele = marque === 'autre' ? $('#r-libre').value.trim() : selModele.value;
  const pannes = $$('[name=r-panne]:checked', form).map(i => PANNES.find(p => p.id === i.value).label);
  const pieces = PIECES.find(p => p.id === form.querySelector('[name=r-pieces]:checked').value).label;
  const d = st.date ? parseDate(st.date) : null;
  const jour = d ? `${JOURS[d.getDay()].toLowerCase()} ${d.getDate()} ${MOIS[d.getMonth()]}` : '';
  return { modele, pannes, pieces, jour, heure: st.heure, prenom: $('#f-prenom').value.trim(), nom: $('#f-nom').value.trim(), tel: $('#f-tel').value.trim(), mail: $('#f-mail').value.trim(), msg: $('#f-msg').value.trim() };
}
function esc(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function recap() {
  const v = data();
  const rows = [['Appareil', v.modele], ['Panne', v.pannes.join(', ')], ['Pièces', v.pieces], ['Créneau', `${v.jour} à ${v.heure}${NEXIO.horaires ? '' : ' (démonstration)'}`], ['Nom', `${v.prenom} ${v.nom}`], ['Téléphone', v.tel], ['E-mail', v.mail || '—']];
  if (v.msg) rows.push(['Précisions', v.msg]);
  $('#recap').innerHTML = rows.map(([k, val]) => `<div class="trow"><span>${k}</span><b>${esc(val)}</b></div>`).join('');
}
function go(n) {
  const cur = form.querySelector(`[data-step="${st.step}"]`), next = form.querySelector(`[data-step="${n}"]`);
  if (n === 2) { renderDays(); renderSlots(); }
  if (n === 4) recap();
  if (n === 5) { const v = data(); $('#done-txt').textContent = `${v.prenom}, votre demande pour ${v.modele} (${v.pannes.join(', ').toLowerCase()}) le ${v.jour} à ${v.heure} est prête à être envoyée à NEXIO.`; }
  const dir = n > st.step ? 1 : -1;
  st.step = n;
  $$('.progress li').forEach((li, i) => li.classList.toggle('on', i < Math.min(n, 4)));
  const show = () => {
    cur.hidden = true; next.hidden = false;
    if (!calm) gsap.fromTo(next, { x: 40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'expo.out' });
    scrollToEl(form);
    (next.querySelector('h2') || next).setAttribute('tabindex', '-1');
    setTimeout(() => (next.querySelector('h2') || next).focus({ preventScroll: true }), 300);
  };
  if (calm) show(); else gsap.to(cur, { x: -30 * dir, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => { gsap.set(cur, { clearProps: 'all' }); show(); } });
}
form.addEventListener('click', e => {
  if (e.target.closest('[data-next]')) { if (validate(st.step)) go(st.step + 1); }
  if (e.target.closest('[data-prev]')) go(st.step - 1);
});
form.addEventListener('submit', e => { e.preventDefault(); if (st.step === 4) go(5); });
$('#again').addEventListener('click', () => { form.reset(); fillModeles(); st.date = null; st.heure = null; go(1); });
$$('#f-prenom, #f-nom, #f-tel, #f-mail').forEach(i => i.addEventListener('blur', () => { if (i.getAttribute('aria-invalid') === 'true') validate(3); }));

/* ---------- Ouverture ---------- */
(function intro() {
  const rot = $('.dial__rot');
  if (calm) { html.classList.remove('intro'); return; }
  const tl = gsap.timeline({ onComplete: () => html.classList.remove('intro') });
  tl.add(veilOut(), 0)
    .add(glitchIn($('[data-hero-title]')), 0.4)
    .from('.page-hero .eyebrow, .page-hero .lead', { y: 20, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out' }, 0.8)
    .from('.dial .tick', { opacity: 0, stagger: { each: 0.012, from: 'random' }, duration: 0.3 }, 0.4)
    .fromTo('.dial .arc', { strokeDasharray: 300, strokeDashoffset: 300 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power3.out' }, 1)
    .from('.rdv > *', { y: 40, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out' }, 1);
  gsap.to(rot, { rotation: 360, duration: 120, repeat: -1, ease: 'none', svgOrigin: '300 300' });
  const ticks = $$('.dial .tick');
  let k = 0;
  setInterval(() => { ticks.forEach(t => t.classList.remove('on')); for (let i = 0; i < 4; i++) ticks[(k + i) % ticks.length].classList.add('on'); k = (k + 1) % ticks.length; }, 900);
})();
