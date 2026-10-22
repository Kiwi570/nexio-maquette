/* NEXIO — page Estimation : radiographie + calculateur */
import { gsap, boot, calm, fine, veilOut, glitchIn } from './main.js';
import { NEXIO, MARQUES, AUTRES_MARQUES, PANNES, PIECES, prix, total, euros } from './data.js';

window.__nexioReady = true;
boot();

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const TODO = '<span class="todo">à compléter</span>';
const PART_LABEL = { screen: 'Écran', battery: 'Batterie', port: 'Connecteur de charge', camera: 'Caméra', back: 'Vitre arrière', speaker: 'Haut-parleur et micro', board: 'Carte mère' };

const f = $('#est');
const st = { marque: 'iphone', modele: null, autre: null, libre: '', pannes: [], pieces: 'conseil' };

/* ---------- Pré-remplissage depuis l'URL ---------- */
const q = new URLSearchParams(location.search);
if (q.get('marque') && MARQUES.some(m => m.id === q.get('marque'))) st.marque = q.get('marque');
if (q.get('modele')) st.modele = q.get('modele');
const fromUrl = (q.get('pannes') || q.get('panne') || '').split(',').filter(id => PANNES.some(p => p.id === id));
st.pannes = fromUrl;
if (q.get('pieces') && PIECES.some(p => p.id === q.get('pieces'))) st.pieces = q.get('pieces');
f.querySelector(`[name=marque][value="${st.marque}"]`).checked = true;
f.querySelector(`[name=pieces][value="${st.pieces}"]`).checked = true;
st.pannes.forEach(id => { f.querySelector(`[name=panne][value="${id}"]`).checked = true; });
if (st.marque === 'autre' && st.modele) {
  const hit = AUTRES_MARQUES.find(n => st.modele.startsWith(n));
  st.autre = hit || 'Autre';
}

/* ---------- Modèles ---------- */
const models = $('#models'), search = $('#m-search');
function renderModels() {
  const autre = st.marque === 'autre';
  $('#m-search-f').hidden = autre; models.hidden = autre; $('#autre-f').hidden = !autre;
  if (autre) {
    $('#autres').innerHTML = AUTRES_MARQUES.map(n => `<label class="chip"><input type="radio" name="autre" value="${n}"${st.autre === n ? ' checked' : ''}><span>${n}</span></label>`).join('');
    return;
  }
  const list = MARQUES.find(m => m.id === st.marque).modeles;
  const term = search.value.trim().toLowerCase();
  const shown = list.filter(n => !term || n.toLowerCase().includes(term));
  models.innerHTML = shown.length
    ? shown.map(n => `<label class="chip"><input type="radio" name="modele" value="${n}"${st.modele === n ? ' checked' : ''}><span>${n}</span></label>`).join('')
    : '<p class="muted" style="font-size:.9rem">Aucun modèle trouvé. Choisissez « Autre marque » pour l’indiquer.</p>';
}

/* ---------- Radiographie ---------- */
let phone = null;
const partName = $('#part-name');
async function startXray() {
  const canvas = $('#xray');
  try {
    const m = await import('./phone3d.js');
    if (!m.webglOK()) throw new Error('webgl');
    phone = m.createPhone(canvas, { mode: 'xray', calm });
  } catch (e) {
    canvas.hidden = true;
    $('.xray-fallback').hidden = false;
    $('#drag-hint').hidden = true;
  }
}
function showPart(part) {
  if (phone) phone.setPart(part);
  $$('.xray-fallback [data-part]').forEach(g => g.classList.toggle('on', g.dataset.part === part));
  partName.textContent = part ? PART_LABEL[part] : 'Choisissez une panne';
}
const lastPart = () => { const id = st.pannes[st.pannes.length - 1]; return id ? PANNES.find(p => p.id === id).part : null; };

/* ---------- Ticket ---------- */
const rows = $('#t-rows'), rdvBtn = $('#t-rdv'), note = $('#t-note');
$('#t-date').textContent = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
function modeleLabel() {
  if (st.marque === 'autre') return st.autre ? `${st.autre}${st.libre ? ' ' + st.libre : ''}` : null;
  return st.modele;
}
function renderTicket(animate = true) {
  const modele = modeleLabel();
  const pieceLabel = PIECES.find(p => p.id === st.pieces).label;
  let h = '';
  if (!modele || !st.pannes.length) {
    h = `<div class="trow"><span>${!modele ? 'Choisissez votre modèle' : 'Choisissez au moins une panne'}</span><b>—</b></div>`;
  } else {
    h += `<div class="trow"><span>Appareil</span><b>${modele}</b></div>`;
    st.pannes.forEach(id => {
      const p = PANNES.find(x => x.id === id);
      const v = prix(modele, id, st.pieces);
      h += `<div class="trow"><span>${p.label}</span><b>${v === null ? TODO : (st.pieces === 'conseil' ? 'dès ' : '') + euros(v)}</b></div>`;
    });
    h += `<div class="trow"><span>Pièces</span><b>${pieceLabel}</b></div>`;
    h += `<div class="trow"><span>Délai</span><b>${NEXIO.delai || TODO}</b></div>`;
    h += `<div class="trow"><span>Garantie</span><b>${NEXIO.garantie || TODO}</b></div>`;
    const t = total(modele, st.pannes, st.pieces);
    h += `<div class="trow total"><span>Total estimé</span><b>${t === null ? TODO : (st.pieces === 'conseil' ? 'dès ' : '') + euros(t)}</b></div>`;
  }
  rows.innerHTML = h;
  const ok = !!modele && st.pannes.length > 0;
  rdvBtn.setAttribute('aria-disabled', ok ? 'false' : 'true');
  rdvBtn.href = ok ? 'rendez-vous.html?' + new URLSearchParams({ marque: st.marque, modele, pannes: st.pannes.join(','), pieces: st.pieces }) : 'rendez-vous.html';
  note.textContent = ok ? 'Estimation indicative, confirmée au diagnostic. Les tarifs NEXIO sont à compléter.' : 'Estimation indicative, confirmée au diagnostic.';
  $('#s1').classList.add('is-done');
  $('#s2').classList.toggle('is-done', !!modele);
  $('#s3').classList.toggle('is-done', st.pannes.length > 0);
  $('#s4').classList.add('is-done');
  if (animate && !calm) gsap.from(rows.children, { x: -14, opacity: 0, duration: 0.45, stagger: 0.04, ease: 'power3.out' });
}

/* ---------- Événements ---------- */
f.addEventListener('change', e => {
  const t = e.target;
  if (t.name === 'marque') { st.marque = t.value; st.modele = null; st.autre = null; search.value = ''; renderModels(); }
  if (t.name === 'modele') st.modele = t.value;
  if (t.name === 'autre') st.autre = t.value;
  if (t.name === 'panne') {
    st.pannes = $$('[name=panne]:checked', f).map(i => i.value);
    if (t.checked) showPart(PANNES.find(p => p.id === t.value).part); else showPart(lastPart());
    const p = PANNES.find(x => x.id === t.value);
    $('#panne-desc').textContent = t.checked ? p.desc : '';
  }
  if (t.name === 'pieces') st.pieces = t.value;
  renderTicket();
});
$('#m-libre').addEventListener('input', e => { st.libre = e.target.value.trim(); renderTicket(false); });
search.addEventListener('input', renderModels);
f.addEventListener('submit', e => e.preventDefault());
$$('[name=panne]', f).forEach(i => {
  const lab = i.closest('.chip');
  lab.addEventListener('pointerenter', () => { if (fine) showPart(PANNES.find(p => p.id === i.value).part); });
  lab.addEventListener('pointerleave', () => { if (fine) showPart(lastPart()); });
});

renderModels();
renderTicket(false);

/* ---------- Ouverture ---------- */
(async () => {
  if (calm) { html.classList.remove('intro'); await startXray(); showPart(lastPart()); return; }
  const t0 = performance.now();
  const tl = gsap.timeline({ onComplete: () => html.classList.remove('intro') });
  tl.add(veilOut(), 0)
    .add(glitchIn($('[data-hero-title]')), 0.4)
    .from('.page-hero .eyebrow, .page-hero .lead', { y: 20, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out' }, 0.8)
    .from('.est__viz', { opacity: 0, scale: 0.96, duration: 1.2, ease: 'expo.out' }, 0.6)
    .from('.est__form > *', { y: 40, opacity: 0, stagger: 0.07, duration: 0.9, ease: 'power3.out' }, 0.9);
  await startXray();
  showPart(lastPart());
  const late = (performance.now() - t0) / 1000;
  if (phone) gsap.fromTo(phone.state, { rise: 0 }, { rise: 1, duration: 1.4, ease: 'expo.out', delay: Math.max(0, 0.6 - late) });
})();
