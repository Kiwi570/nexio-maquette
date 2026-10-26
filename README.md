# NEXIO — maquette v1

Maquette de présentation du futur site de NEXIO (réparation de smartphones).
Direction « Nuit d'atelier ». Site statique HTML, CSS et JavaScript, sans étape de construction.

## Pages

- `index.html` : accueil (écran fissuré en 3D qui se ressoude, réparations, parcours, pièces, estimation rapide, infos pratiques)
- `estimation.html` : téléphone en radiographie et calculateur de prix
- `rendez-vous.html` : prise de rendez-vous en 4 étapes (envoi simulé)
- `mentions-legales.html` : modèle de mentions légales à compléter

## Ce qui reste à compléter

Toutes les informations de l'entreprise sont dans **un seul fichier** : `assets/js/data.js`
(téléphone, e-mail, adresse, zone, horaires, délai, garantie, tarifs, liste des modèles).
Tant qu'une valeur vaut `null`, le site affiche une pastille « à compléter ».

## Images

Visuels générés avec ChatGPT (aucune personne réelle, aucun logo), convertis en WebP
dans `assets/img/` en deux tailles (`-800` et `-1600`). Seule image d'origine du client : le logo.
Si un fichier manque, l'emplacement affiche un visuel provisoire dessiné en code.

## Bibliothèques (hébergées avec le site)

- GSAP 3.15 (ScrollTrigger, SplitText) : licence standard GSAP, gratuite
- Lenis 1.3 : licence MIT
- three.js r170 : licence MIT
- Polices Unbounded et Inter Tight : SIL Open Font License

## Accessibilité

Bouton « Animations » dans l'en-tête et le pied de page, respect du réglage système
« réduire les animations », version sans WebGL, navigation au clavier, textes alternatifs.
