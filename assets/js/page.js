/* NEXIO — pages simples (mentions légales) */
import { gsap, boot, calm, veilOut, glitchIn } from './main.js';

boot();
const html = document.documentElement;
if (calm) html.classList.remove('intro');
else {
  const tl = gsap.timeline({ onComplete: () => html.classList.remove('intro') });
  tl.add(veilOut(), 0)
    .add(glitchIn(document.querySelector('[data-hero-title]')), 0.4)
    .from('.page-hero .eyebrow, .page-hero .lead', { y: 20, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out' }, 0.8)
    .from('.legal-page > section', { y: 30, opacity: 0, stagger: 0.06, duration: 0.8, ease: 'power3.out' }, 0.9);
  document.querySelectorAll('.circuit path').forEach((p, i) => {
    const l = p.getTotalLength();
    gsap.fromTo(p, { strokeDasharray: l, strokeDashoffset: l }, { strokeDashoffset: 0, duration: 1.6, delay: 0.4 + i * 0.04, ease: 'power2.out' });
  });
}

// tout le script de page s'est exécuté : le filet de sécurité du voile n'est plus nécessaire
window.__nexioReady = true;
