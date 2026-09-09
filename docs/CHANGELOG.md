# CHANGELOG

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Trois versions sont suivies séparément (§112) : `APP_VERSION`, `CONTENT_VERSION`,
`SAVE_SCHEMA_VERSION`.

## [1.0.2] — Ergonomie iPad

`APP_VERSION 1.0.2` · `CONTENT_VERSION release_0001` · `SAVE_SCHEMA_VERSION 3`

### Corrigé

- **Cartes et listes qui se chevauchent.** Sur un `<button>`, une hauteur
  tactile minimale empêchait la carte de grandir avec son illustration : la
  ligne de grille se calait sur ce minimum et l'image débordait sur les cartes
  voisines. Le Pokédex était illisible. Même cause pour les réponses illustrées
  et les listes de l'Admin, où les enfants d'une colonne défilante se
  compressaient au lieu de conserver leur hauteur.
- **Scène d'exercice par-dessus les réponses.** Une boîte en `aspect-ratio` ne
  contribue pas à la hauteur intrinsèque de son parent : les créatures à
  compter s'affichaient derrière les boutons de réponse.
- **Espace parents et Admin illisibles sur iPad.** Ils utilisaient l'échelle
  typographique de l'interface enfant : la moitié des informations et quatre
  sections de menu tombaient hors de l'écran. Une échelle dense, réservée aux
  interfaces adultes (§178), est désormais définie dans `tokens.css`. Tout
  l'espace parents tient sur un écran ; les treize sections de l'Admin aussi,
  avec ses deux actions toujours visibles.

### Ajouté

- **Accès à l'espace parents depuis le Centre** : jusque-là, une fois
  l'aventure lancée, il fallait relancer l'application pour y revenir. Le bouton
  est volontairement discret pour ne pas attirer l'enfant.
- `e2e/layout.spec.ts` : garde-fous qui échouent si des cartes, des réponses ou
  des lignes de liste se recouvrent, si la scène d'exercice déborde, ou si une
  action de l'Admin sort de l'écran.

## [1.0.1] — Correctifs iPad

`APP_VERSION 1.0.1` · `CONTENT_VERSION release_0001` · `SAVE_SCHEMA_VERSION 3`

### Corrigé

- **« Commencer l'aventure » sans effet sur iPad.** La navigation attendait le
  déblocage audio ; or `HTMLMediaElement.play()` peut ne jamais répondre sur
  iPadOS. Le déblocage part toujours du geste (§64) mais ne bloque plus rien,
  et il amorce désormais les trois canaux (voix, musique, bruitages).
- **Application figée sur « Un instant… ».** `indexedDB.open()` peut rester sans
  réponse sur Safari quand il est appelé trop tôt après le chargement. Chaque
  tentative est bornée, réessayée deux fois, puis le stockage bascule en
  mémoire. Un chien de garde de 12 s protège aussi le chargement du contenu.
- **Espace parents bloqué.** Sans profil, l'écran tournait indéfiniment. Il
  affiche maintenant un état clair avec une action (« Créer un profil »).
- **Rechargement au premier lancement.** La prise de contrôle initiale du
  Service Worker (`clients.claim()`) déclenchait un `reload()` juste après
  l'ouverture. Seule une vraie mise à jour recharge désormais la page.
- Suppression de `crossOrigin` sur les éléments audio : inutile ici, et cela
  faisait échouer la lecture des fichiers servis sans en-tête CORS.
- Navigation unifiée : plus aucune écriture directe de `window.location.hash`
  hors du routeur.
- **Compatibilité iPadOS antérieur à 15.4** : `structuredClone`, appelé dès le
  premier chargement, n'y existe pas. Une copie profonde compatible prend le
  relais. Préfixe `-webkit-` ajouté sur `backdrop-filter` (Safari).

### Ajouté

- La version installée est affichée sur l'écran d'accueil : indispensable pour
  vérifier, depuis l'iPad, que le Service Worker ne sert plus une version
  précédente.

## [1.0.0] — Version initiale

`APP_VERSION 1.0.0` · `CONTENT_VERSION release_0001` · `SAVE_SCHEMA_VERSION 3`

### Ajouté

- **Aventure** : Centre, carte à nœuds (Prairie, Forêt, Rivière), Arène de Pierre, Badge Roche,
  chapitre 1 avec vraie fin puis exploration libre.
- **Moteur d'exercices** : 12 types génériques pilotés par matrices, génération déterministe par
  seed, indices progressifs (3 tentatives), difficulté adaptative.
- **Système audio complet** : `VoiceMessage`, `AudioService` (canaux voix/musique/bruitages,
  ducking, une seule voix à la fois), TTS de secours, préchargement hors ligne.
- **Admin** : `VoiceTextEditor` réutilisable (enregistrement micro, prompteur, prises multiples,
  import de fichier), session de doublage, tableau de bord des voix, éditeurs de créatures,
  exercices, biomes, nœuds, arènes, quêtes, packs, images, releases, profils, progression, preview.
- **Design system** : tokens CSS, 17 composants, icônes SVG originales, page `#/dev/ui-kit`.
- **PWA** : manifest, Service Worker (App Shell + runtime médias), `downloadCurrentAdventure()`,
  mise à jour non brutale.
- **Backends enfichables** : local (IndexedDB) par défaut, Firebase optionnel.
- **CI/CD** : vérification (typecheck, lint, tests, build) puis publication sur `gh-pages`.

### Tests iPad à effectuer à chaque version (§120)

- [ ] PWA installée depuis l'écran d'accueil
- [ ] Micro autorisé puis refusé dans `/admin`
- [ ] Lecture audio après le bouton « Commencer »
- [ ] Réécoute 🔊
- [ ] Retour de veille
- [ ] Mode avion (contenu et voix en cache)
- [ ] Reconnexion et synchronisation
- [ ] Casque / Bluetooth
