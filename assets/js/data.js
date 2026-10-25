/* ============================================================
   NEXIO — données du site (un seul fichier à compléter)
   Tout ce qui vaut null s'affiche « à compléter » sur le site.
   ============================================================ */

export const NEXIO = {
  nom: 'NEXIO',
  accroche: 'Vos appareils, comme neuf.',
  sousTitre: 'Votre réparateur de smartphone rapide & fiable.',
  clients: 100,              // « +100 clients satisfaits » (repris du site actuel)
  telephone: null,           // ex. '03 00 00 00 00'
  email: null,               // ex. 'contact@nexio-info.fr'
  adresse: null,             // ex. ['12 rue Exemple', '57000 Ville']
  zone: null,                // ex. 'Ville et 20 km autour'
  delai: null,               // ex. 'Écran : environ 1 h'
  garantie: null,            // ex. '6 mois pièces et main-d’œuvre'
  reservationExterne: null,  // lien vers un vrai outil de réservation, si existant
  avisGoogle: null,          // lien vers la fiche Google, si existante
  /* Horaires : null = à compléter.
     Format : { 1: [['10:00','12:30'],['14:00','19:00']], 2: [...], ... }  (0 = dimanche) */
  horaires: null,
};

export const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/* Pannes — liste type, à confirmer par NEXIO.
   part = pièce allumée sur le téléphone en radiographie. */
export const PANNES = [
  { id: 'ecran',    label: 'Écran ou vitre avant',  court: 'Écran',      part: 'screen',  desc: 'Vitre fissurée, tactile qui ne répond plus, lignes ou taches à l’écran.' },
  { id: 'batterie', label: 'Batterie',              court: 'Batterie',   part: 'battery', desc: 'Autonomie en chute, téléphone qui s’éteint seul ou batterie gonflée.' },
  { id: 'charge',   label: 'Connecteur de charge',  court: 'Charge',     part: 'port',    desc: 'Le câble ne tient plus, la charge se coupe ou ne démarre pas.' },
  { id: 'camera',   label: 'Caméra',                court: 'Caméra',     part: 'camera',  desc: 'Photos floues, objectif fissuré, appareil photo qui ne s’ouvre plus.' },
  { id: 'dos',      label: 'Vitre arrière',         court: 'Dos',        part: 'back',    desc: 'Dos en verre fêlé ou éclaté.' },
  { id: 'son',      label: 'Haut-parleur ou micro', court: 'Son',        part: 'speaker', desc: 'Son grésillant, interlocuteur qui ne vous entend plus.' },
  { id: 'eau',      label: 'Contact avec l’eau',    court: 'Eau',        part: 'board',   desc: 'Téléphone tombé dans l’eau ou exposé à l’humidité.' },
  { id: 'diag',     label: 'Autre panne / diagnostic', court: 'Diagnostic', part: 'board', desc: 'Vous ne savez pas d’où vient le problème : on cherche avec vous.' },
];

/* Modèles — liste indicative, à valider avec NEXIO. */
export const MARQUES = [
  { id: 'iphone', label: 'iPhone', modeles: [
    'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone Air', 'iPhone 17', 'iPhone 16e',
    'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
    'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
    'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
    'iPhone SE (2022)', 'iPhone SE (2020)', 'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
    'iPhone XR', 'iPhone XS Max', 'iPhone XS', 'iPhone X',
  ] },
  { id: 'samsung', label: 'Samsung', modeles: [
    'Galaxy S26 Ultra', 'Galaxy S26+', 'Galaxy S26',
    'Galaxy S25 Ultra', 'Galaxy S25 Edge', 'Galaxy S25+', 'Galaxy S25', 'Galaxy S25 FE',
    'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S24 FE',
    'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23', 'Galaxy S23 FE',
    'Galaxy S22 Ultra', 'Galaxy S22+', 'Galaxy S22', 'Galaxy S21 FE', 'Galaxy S21',
    'Galaxy Z Fold6', 'Galaxy Z Flip6', 'Galaxy Z Fold5', 'Galaxy Z Flip5',
    'Galaxy A56', 'Galaxy A55', 'Galaxy A36', 'Galaxy A35', 'Galaxy A26', 'Galaxy A25',
    'Galaxy A16', 'Galaxy A15', 'Galaxy A54', 'Galaxy A34', 'Galaxy A14',
  ] },
  { id: 'autre', label: 'Autre marque', modeles: [] },
];

export const AUTRES_MARQUES = ['Google Pixel', 'Xiaomi', 'Redmi', 'Oppo', 'OnePlus', 'Honor', 'Huawei', 'Motorola', 'Autre'];

/* Tarifs — vides tant que NEXIO n'a pas transmis sa grille.
   Format :  TARIFS['iPhone 13'] = { ecran: { neuve: 129, circulaire: 99 }, batterie: { neuve: 69 } }
   Un prix absent s'affiche « à compléter ». */
export const TARIFS = {};

export const PIECES = [
  { id: 'neuve', label: 'Pièce neuve' },
  { id: 'circulaire', label: 'Pièce issue de l’économie circulaire', aide: 'Occasion ou reconditionnée, selon disponibilité.' },
  { id: 'conseil', label: 'Je ne sais pas encore', aide: 'On vous présente les options au diagnostic.' },
];

/* ---------- Fonctions utiles (testées) ---------- */

export const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function prix(modele, panneId, piece) {
  const m = TARIFS[modele];
  if (!m || !m[panneId]) return null;
  const p = m[panneId];
  if (piece === 'circulaire') return Number.isFinite(p.circulaire) ? p.circulaire : null;
  if (piece === 'neuve') return Number.isFinite(p.neuve) ? p.neuve : null;
  const vals = [p.neuve, p.circulaire].filter(Number.isFinite);
  return vals.length ? Math.min(...vals) : null;   // « à partir de »
}

export function total(modele, pannes, piece) {
  if (!pannes.length) return null;
  let sum = 0;
  for (const id of pannes) {
    const v = prix(modele, id, piece);
    if (v === null) return null;
    sum += v;
  }
  return sum;
}

export const euros = v => v === null || v === undefined ? null : v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: v % 1 ? 2 : 0 });

const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/* État d'ouverture à une date donnée. */
export function ouverture(horaires, date = new Date()) {
  if (!horaires) return { etat: 'inconnu' };
  const jour = date.getDay();
  const now = date.getHours() * 60 + date.getMinutes();
  const plages = horaires[jour] || [];
  for (const [a, b] of plages) {
    if (now >= toMin(a) && now < toMin(b)) return { etat: 'ouvert', jusqua: b };
  }
  for (let k = 0; k < 8; k++) {
    const j = (jour + k) % 7;
    const ps = horaires[j] || [];
    for (const [a] of ps) {
      if (k > 0 || toMin(a) > now) return { etat: 'ferme', prochain: { jour: j, heure: a, demain: k === 1, aujourdhui: k === 0 } };
    }
  }
  return { etat: 'ferme' };
}

/* Créneaux : ceux des horaires réels, sinon une grille de démonstration. */
export function creneaux(horaires, date, pas = 30) {
  const demo = !horaires;
  const h = horaires || { 2: [['10:00', '12:30'], ['14:00', '19:00']], 3: [['10:00', '12:30'], ['14:00', '19:00']], 4: [['10:00', '12:30'], ['14:00', '19:00']], 5: [['10:00', '12:30'], ['14:00', '19:00']], 6: [['10:00', '17:00']] };
  const plages = h[date.getDay()] || [];
  const out = [];
  for (const [a, b] of plages) {
    for (let t = toMin(a); t + pas <= toMin(b); t += pas) {
      const hh = String(Math.floor(t / 60)).padStart(2, '0'), mm = String(t % 60).padStart(2, '0');
      out.push(hh + ':' + mm);
    }
  }
  return { demo, liste: out };
}
