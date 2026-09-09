# CHANGELOG

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Trois versions sont suivies séparément (§112) : `APP_VERSION`, `CONTENT_VERSION`,
`SAVE_SCHEMA_VERSION`.

## [1.2.0] — Mode édition

`APP_VERSION 1.2.0` · `CONTENT_VERSION bundled-3` · `SAVE_SCHEMA_VERSION 3`

### Ajouté

- **Mode édition** (`docs/SYNC.md` §3) : l'aventure se modifie **là où on la
  voit**, sur l'écran même de l'enfant. Un crayon sur chaque lieu de la carte,
  un titre de région, le titre du chapitre, la bulle du Professeur, la consigne
  d'un exercice, une créature rencontrée — un geste ouvre le tiroir qui les
  modifie. On y entre depuis `/parents → Modifier l'aventure` ou
  `/admin → Prévisualiser → Éditer sur place`.
- Le mode édition et les menus écrivent dans **le même brouillon** : ce qui
  change d'un côté apparaît aussitôt de l'autre. Pendant l'édition, les écrans
  affichent ce brouillon (§118) ; rien n'est publié pour autant (§99).
- Icône crayon dans le design system.

### Modifié

- **Les textes destinés à l'enfant se saisissent dans `VoiceTextEditor`, et
  nulle part ailleurs** (CLAUDE.md §3). Les champs en double de la section
  « Exercices » disparaissent.

### Corrigé

- Le texte affiché d'un exercice et le texte lu pouvaient diverger : les menus
  écrivaient la consigne de la matrice sans mettre à jour la `VoiceMessage`
  correspondante. L'enfant pouvait lire une phrase et en entendre une autre.
  Les deux sont désormais écrits ensemble (`applyTemplateVoice`).

## [1.1.0] — Mise à jour automatique de l'iPad

`APP_VERSION 1.1.0` · `CONTENT_VERSION bundled-3` · `SAVE_SCHEMA_VERSION 3`

### Ajouté

- **Mise à jour automatique du contenu sur l'iPad** (`docs/SYNC.md`). Le contenu
  publié depuis l'ordinateur arrive seul sur la tablette : vérification au
  lancement, à chaque retour au premier plan, au retour du réseau et toutes les
  dix minutes. La bascule attend toujours un moment sûr — **jamais** pendant un
  exercice, un combat ou une capture (§111).
- **`Admin → Releases → Envoyer sur le site`** : un bouton écrit
  `public/content/bundle.json` dans le dépôt GitHub, la CI reconstruit, l'iPad
  suit. Le jeton reste dans le navigateur de l'ordinateur qui publie et n'entre
  jamais dans le dépôt ni dans un contenu exporté.
- **`Admin → Tableau de bord → Stockage sur cet appareil`** : occupation et
  quota réellement mesurés (`navigator.storage`), plus la demande de stockage
  persistant — la réponse à « quelle est la limite ? » est celle de l'appareil
  ouvert, pas un chiffre approximatif.
- **Version installée affichée sous « Pokexplo — Admin »**, et **bouton
  d'accueil** dans l'Admin comme dans l'espace parents.
- **`docs/SYNC.md`** : la procédure complète ordinateur → iPad, les limites de
  stockage et un tableau de dépannage.

### Modifié

- **Connexion administrateur avec Firebase** : e-mail et mot de passe, au lieu
  d'un compte anonyme dont l'identifiant changeait à chaque effacement des
  données du site — aucun rôle stable ne pouvait y être rattaché. Le rôle ADMIN
  reste porté par Firestore et n'est jamais accordé depuis le client.
- Le déploiement transmet les `VITE_FIREBASE_*` s'ils existent dans les secrets
  du dépôt : la voie Firebase est désormais utilisable depuis la CI.
- `content/bundle.json` est servi **réseau d'abord** par le Service Worker : il
  ne peut plus rester figé dans le cache de l'application.
- L'export du contenu estampille automatiquement un `contentVersion` neuf.

### Corrigé

- Avec Firebase, un administrateur déjà connecté était remplacé par un compte
  anonyme au démarrage : on attend maintenant la restauration de la session.

## [1.0.4] — Images et portabilité du contenu

`APP_VERSION 1.0.4` · `CONTENT_VERSION bundled-3` · `SAVE_SCHEMA_VERSION 3`

### Ajouté

- **Trois origines d'image, toutes prises en charge** (`docs/MEDIA.md`) :
  un fichier du dépôt (`public/media/…`, visible partout et hors connexion),
  une adresse `https://`, ou un import depuis l'appareil. Seule la troisième
  existait, et elle ne quittait jamais l'appareil.
- **`public/content/bundle.json`** : s'il est présent, il devient le contenu de
  référence du site. Exporté depuis l'Admin puis déposé dans le dépôt, il fait
  apparaître créatures, textes, carte et images sur **tous** les appareils, sans
  Firebase ni serveur. Une release publiée depuis l'Admin n'est jamais écrasée
  par cette voie (§97), et rien n'est remplacé hors connexion.
- **Export / import du contenu** dans `Admin → Releases`, avec avertissement
  explicite si des images n'existent que sur l'appareil courant.
- `Admin → Images` refait : les trois voies sont expliquées, la provenance de
  chaque image est affichée, et le chemin ou l'adresse se saisit directement.

### Corrigé

- Une image introuvable ou une adresse cassée ramène désormais au dessin généré
  au lieu d'afficher une image brisée (§174).

## [1.0.3] — Carte du monde

`APP_VERSION 1.0.3` · `CONTENT_VERSION bundled-3` · `SAVE_SCHEMA_VERSION 3`

### Modifié

- **Carte redessinée** (§10-12, §147) : chaque lieu porte le pictogramme de son
  type — fleur, feuille, goutte, rocher, arène — au lieu d'un cadenas ; une
  bulle souple regroupe les lieux d'une même région, avec son nom ; des chemins
  épais montrent la progression possible ; les lieux ont été réespacés pour que
  les étiquettes ne se chevauchent plus.
- Noms de lieux raccourcis pour rester lisibles sur la carte ; les biomes
  peuvent définir un `shortName` affiché uniquement là.

### Ajouté

- **Mise à jour du contenu livré avec l'application.** Le contenu par défaut
  porte désormais une version (`BUNDLED_CONTENT_VERSION`) : un appareil qui a
  déjà joué reçoit la nouvelle carte à la mise à jour, au lieu de conserver
  indéfiniment l'ancienne. Seule la release `bundled` est remplacée — les
  releases publiées depuis l'Admin restent immuables (§97).
- Pictogrammes de lieux : fleur, feuille, goutte, rocher, vague, flocon, volcan.
- `e2e/layout.spec.ts` : la carte doit présenter des régions nommées, des
  chemins, un pictogramme par lieu, et aucun titre qui se chevauche.

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
