# CHANGELOG

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Trois versions sont suivies séparément (§112) : `APP_VERSION`, `CONTENT_VERSION`,
`SAVE_SCHEMA_VERSION`.

## [1.9.0] — Passe UX : la carte se choisit en deux temps, l'exercice remet la voix devant

`APP_VERSION 1.9.0` · `CONTENT_VERSION bundled-5` · `SAVE_SCHEMA_VERSION 3`

### Modifié — la carte

- **Sélection en deux temps** (§193). Un simple toucher partait aussitôt en
  voyage : un doigt qui effleurait l'écran suffisait à quitter le Centre. Le
  premier geste **choisit** le lieu et **dit son nom** ; « Y aller ! » — ou un
  second toucher sur le même lieu — lance le déplacement.
- Un lieu **fermé se nomme aussi**, et dit qu'il n'est pas encore ouvert :
  l'enfant apprend qu'il existe, au lieu de se demander pourquoi rien ne se
  passe.
- **Les destinations ouvertes respirent** : une pulsation très lente sur
  l'anneau, coupée sous `prefers-reduced-motion`.
- **Le dresseur est une silhouette** — tête, casquette, corps, ombre portée —
  et non plus un petit rond corail qu'on ne repérait pas.
- Les lieux sont **plus grands** (rayon 5,6 → 6,2 ; Arène 6,6 → 7,2). La boîte
  utile se resserre d'autant pour que les étiquettes restent dans le cadre.

### Modifié — les exercices

- **🔊 · grande scène · réponses géantes** (§194). La consigne écrite était le
  plus gros élément de l'écran, en taille de titre : pour un enfant qui ne lit
  pas, c'était le seul élément inutile. Elle reste — pour l'adulte et pour
  celui qui commence à lire — mais passe **sous** le haut-parleur, en second,
  et la place rendue revient à la scène.
- **L'indice est porté par l'animation et la voix.** Le gros bandeau jaune
  devenait aussitôt le nouvel élément dominant ; il est maintenant discret.
- Deux bornes tiennent la consigne : jamais sous 20 px (régression d'origine
  en portrait), jamais au-dessus de 26 px (§194).

## [1.8.0] — Passe UX : le Pokédex et l'Équipe, une chose à la fois

`APP_VERSION 1.8.0` · `CONTENT_VERSION bundled-5` · `SAVE_SCHEMA_VERSION 3`

### Modifié — le Pokédex

- **Une grande grille, et rien d'autre.** Les deux panneaux permanents ont
  disparu (§191) : on touche une créature, sa **fiche s'ouvre par-dessus**, et
  un seul geste la referme. L'enfant n'a plus à comprendre que le panneau de
  droite parle de ce qu'il a touché à gauche.
- **Les filtres sont des pictogrammes** (§147) et suivent les types réellement
  présents dans le contenu : ajouter une créature de Feu fait apparaître le
  filtre Feu, sans toucher au code. Quatorze nouveaux dessins de type.
- Le compteur devient **deux nombres** (« 3 / 20 ») au lieu d'une phrase.

### Modifié — l'Équipe

- **Un seul geste.** L'équipe est en haut, la collection dessous ; toucher une
  créature l'emmène, la retoucher la laisse à la maison. Plus de sélection à
  faire suivre d'un bouton visé en bas d'écran.
- Les places libres sont des **Balls vides**, pas des « + » : un objet du jeu,
  pas un symbole d'interface.
- Une créature de l'équipe porte une **coche** en plus de la couleur (§142).
- Équipe pleine : on le **dit à la voix** au lieu de bloquer en silence (§192).
- Collection vide : un message centré avec une Ball, au lieu d'un grand panneau
  blanc avec une ligne de texte en haut à gauche (§175).

### Ajouté

- Le garde-fou `child-ux` sait maintenant qu'un **groupe compte pour un
  choix** : une rangée de filtres, une grille de créatures ou les six places
  d'une équipe sont autant de réponses à une seule question. Le groupe est
  déclaré dans le code (`data-choice-group`), jamais deviné par le test.
- Deux tests de bout en bout : la fiche s'ouvre bien par-dessus la collection,
  et le même geste fait l'aller et le retour dans l'équipe.

## [1.7.0] — Passe UX : l'accueil et le Centre redeviennent ceux d'un enfant

`APP_VERSION 1.7.0` · `CONTENT_VERSION bundled-5` · `SAVE_SCHEMA_VERSION 3`

Première étape d'une passe qui ne cherche pas à ajouter des fonctions, mais à
**retirer de la complexité visible**. Constat : l'interface avait été conçue
trop près du modèle de données et pas assez près des gestes réels de l'enfant.

### Ajouté — trois règles, et de quoi les tenir

- **§190 — quatre choix au maximum** par écran enfant, trois de préférence, et
  jamais deux chemins vers la même destination. Les réponses d'un exercice, le
  retour et le 🔊 ne comptent pas ; une grille de créatures compte pour un.
- **§191 — une chose à la fois, en grand** : les deux panneaux permanents sont
  désormais réservés à `/admin`.
- **§192 — la voix guide aussi la navigation** : chaque écran enfant annonce ce
  qu'on peut y faire, en arrivant (« Voici tous les Pokémon que tu as
  rencontrés ! », « Où veux-tu aller ? »). Cinq nouvelles `VoiceMessage`,
  enregistrables comme les autres — d'où le nouveau `CONTENT_VERSION`.
- **§195** (checklist d'une PR qui touche `/play`) et **§196** (l'Admin montre
  des intentions, pas la structure de données) rejoignent `UI_DESIGN.md` et
  `CLAUDE.md`.
- `e2e/child-ux.spec.ts` **mesure** ces règles sur les écrans réels : une règle
  écrite dans un document ne tient pas toute seule.

### Modifié — l'accueil

- Plus de champ de saisie, plus de numéro de version, plus de bouton « Espace
  parents » : l'enfant voit **sa frimousse, son prénom et un seul bouton**. À
  plusieurs, la question « Qui joue ? » et de très grands visages.
- Créer un profil est une opération d'adulte : cet écran-là n'apparaît qu'au
  tout premier lancement, et il l'assume.
- L'accès adulte est un **petit cadenas qui demande un appui maintenu** — un
  geste qu'un enfant de cinq ans ne fait pas par hasard.
- Le numéro de version rejoint l'espace parents, y compris avant qu'un profil
  existe : c'est quand rien ne marche qu'on va le chercher.

### Modifié — le Centre

- De sept choix à **quatre** : le Professeur dit la mission en haut, **PARTIR !**
  est la seule action principale, et trois destinations restent — Pokédex,
  Équipe, Badges.
- **« Aventure » et « Partir ! » menaient au même endroit.** La tuile a
  disparu, et « Partir ! » accepte la mission au passage : un geste au lieu de
  deux.
- « Quêtes » et « Professeur » ne sont plus des destinations : ce sont les
  missions, là où l'enfant les entend.
- La progression garde sa place, discrète : le titre du chapitre et une jauge
  sans chiffre — et c'est là que l'adulte modifie le chapitre en édition.

## [1.6.0] — Ajouter depuis la carte, choisir les pictogrammes, textes jamais superposés

`APP_VERSION 1.6.0` · `CONTENT_VERSION bundled-4` · `SAVE_SCHEMA_VERSION 3`

### Ajouté

- **« + » sur chaque lieu, en mode édition** : crée un nouveau lieu juste à
  côté, dans la même région, relié par un chemin, avec les créatures et les
  exercices de son voisin — jouable tout de suite — et ouvre son tiroir pour
  le nommer. « Retirer ce lieu » défait l'opération (jamais le Centre, ni un
  lieu qui porte une Arène ou une rencontre spéciale).
- **Le tiroir d'un lieu règle ses rencontres et ses exercices** : une pastille
  par créature, et **« Créer et ajouter ici »** fabrique une nouvelle matrice
  du type choisi, attachée au lieu et ouverte aussitôt. Les menus
  `Exercices` proposent la même création (« Nouvelle matrice ») — il n'y en
  avait aucune.
- **Pictogramme des lieux au choix** (`MapNode.icon`, facultatif) : arbre,
  champignon, poisson, montagne, pierre précieuse, soleil, lune, pont, drapeau,
  œuf… ; « Région » revient au dessin de la région. Dans le tiroir comme dans
  les menus. Dix icônes de plus dans le design system, même trait.
- Depuis l'écran de rencontre, en édition : **« Créatures et exercices de ce
  lieu »** ouvre le tiroir du lieu sans revenir à la carte.

### Corrigé

- **Les textes de la carte se superposaient** dès qu'on déplaçait ou renommait
  des lieux : un titre de région tombait sur le nom d'un lieu voisin. Les
  étiquettes sont désormais posées ensemble, après coup : chaque nom cherche
  une place libre tout autour de son lieu (deux tours, pour que les premiers
  servis libèrent la place aux suivants), les titres de région prennent ce qui
  reste autour de leur bulle, un titre long passe sur deux lignes, et une
  étiquette qui a dû s'éloigner est rattachée par un trait. En édition, le
  crayon et le « + » comptent parmi les obstacles : ils ne masquent plus un
  nom voisin. Vérifié sur des cartes volontairement serrées, dans les deux
  orientations, en géométrie pure ET sur les rectangles réellement rendus —
  c'est cette mesure qui a montré que le modèle de boîte surestimait la
  hauteur du texte, au point de faire fuir chaque étiquette de sa place
  naturelle.
- **Deux lieux ne se posent plus l'un sur l'autre** : lâché sur un voisin, un
  lieu s'écarte de lui-même. Un contenu qui en contient tout de même est
  signalé par la validation (« trop proches sur la carte »).

## [1.5.0] — « Mon enfant voit-il mes modifications ? »

`APP_VERSION 1.5.0` · `CONTENT_VERSION bundled-4` · `SAVE_SCHEMA_VERSION 3`

### Corrigé

- **Les modifications faites en mode parent n'arrivaient pas chez l'enfant.**
  Deux causes, l'une visible, l'autre non :
  - **rien ne disait qu'il fallait publier.** On modifiait, on quittait
    l'édition, l'écran revenait à l'ancienne version sans un mot — le brouillon
    (§99) faisait exactement son travail, mais en silence. Le bandeau répond
    désormais à la question en permanence, et publier tient en un geste ;
  - **publier ne rafraîchissait pas le contenu servi.** La release partait bien,
    le brouillon se marquait « à jour », et l'écran continuait pourtant
    d'afficher le bundle chargé au démarrage.
- **Une retouche faite juste avant de sortir était perdue en silence.**
  L'enregistrement du brouillon est différé de quelques centaines de
  millisecondes ; quitter le mode édition annulait purement et simplement
  l'écriture en attente. Elle est maintenant menée à terme — en sortant, avant
  de publier, et quand l'iPad passe en arrière-plan.
- **Publier depuis les menus ne mettait pas à jour l'indicateur** : l'écran
  Releases appelait le service directement, la barre affichait encore « Non
  publié » après une publication réussie, et l'on republiait. Les deux surfaces
  passent par le même chemin.

### Ajouté

- Bandeau **« Votre enfant voit cette version. » / « Non publié » +
  « Publier pour mon enfant »**, présent dans le mode édition comme dans
  l'Admin. Les voix manquantes ne bloquent pas : on annonce combien de textes
  seront lus par la voix de synthèse et on propose de publier quand même (§53).
- **Quitter avec des retouches non publiées prévient**, et propose
  « Quitter sans publier » ou « Publier puis quitter ».
- `e2e/publish.spec.ts` suit la boucle entière — du geste de l'adulte à l'écran
  de l'enfant — dans les trois formats ; `tests/admin/draftPublish.test.tsx`
  garde les deux régressions au niveau du brouillon.

## [1.4.0] — Ranger la carte au doigt

`APP_VERSION 1.4.0` · `CONTENT_VERSION bundled-4` · `SAVE_SCHEMA_VERSION 3`

### Ajouté

- **Déplacer les lieux sur la carte**, en mode édition (`docs/SYNC.md` §3). La
  bulle de région se reforme sous le doigt et les chemins suivent : on voit
  immédiatement ce que l'enfant verra. Les lieux se posent sur une grille et ne
  peuvent pas sortir du cadre — dans les deux orientations, quelle que soit
  celle dans laquelle on édite. Au clavier, les flèches font la même chose, en
  suivant l'écran et non les données.
- **Cohérence des régions** : un lieu lâché chez une autre région est signalé,
  avec un bouton pour l'y rattacher. Sans cela, la bulle de sa région d'origine
  s'étire pour aller le chercher et traverse la voisine. Rien n'est jamais
  réaffecté sans l'accord de l'administrateur (§115).
- La géométrie de la carte vit désormais dans `mapGeometry.ts`, pure et testée :
  les deux projections, leurs inverses, et la boîte utile qui garantit qu'un
  lieu rangé reste lisible en paysage comme en portrait.

### Corrigé

- **Un appui sur un lieu ne faisait plus rien en mode édition** : dès qu'on
  capture le pointeur — indispensable pour suivre le doigt — le navigateur
  n'émet plus de `click`. Le lâcher décide désormais lui-même.
- **Le crayon d'un lieu lançait un voyage** au lieu d'ouvrir son tiroir.
- Le cadre de focus posé sur un lieu était un rectangle noir du navigateur ;
  c'est maintenant un anneau du design system, réservé au clavier (§186).
- Le **Centre** débordait du cadre à gauche : sa bulle était rognée. Il est
  ramené dans la boîte utile — d'où le nouveau `CONTENT_VERSION`.

## [1.3.0] — iPad en portrait, et le tiroir d'édition partout

`APP_VERSION 1.3.0` · `CONTENT_VERSION bundled-3` · `SAVE_SCHEMA_VERSION 3`

### Corrigé

- **Le tiroir d'édition s'affichait brut** (champs en ligne, police du jeu,
  sélecteur de fichier visible) dès qu'on entrait en mode édition sans être
  passé par `/admin` : ses styles ne vivaient que dans le chunk de l'Admin.
  Les formulaires adultes sont désormais dans `forms.css`, chargé par les
  deux surfaces ; le tiroir est chargé à la demande.
- **Les menus déroulants ne s'ouvraient pas sur iPad** hors de `/admin` :
  `user-select: none` posé sur `body` pour l'enfant bloquait les `<select>`
  et les champs. Les contrôles de formulaire gardent la sélection partout.
- **Un brouillon périmé ne suivait jamais le contenu du site** : après une
  mise à jour de l'application, l'Admin montrait l'ancienne carte et publier
  l'aurait fait revenir. Un brouillon intact est remplacé sans bruit ; un
  brouillon modifié est conservé et **signalé**, avec un bouton pour repartir
  de la version publiée — dans les menus comme en mode édition.
- Dans la colonne qui défile de l'Admin, un panneau plus haut que l'écran
  était comprimé et son texte passait sous le suivant.

### Modifié — l'iPad se tient dans les deux sens

- **Typographie indexée sur le grand côté de l'écran** (`vmax`) : en portrait,
  les textes tombaient à leur minimum alors que l'écran offre plus de place.
  Les deux orientations donnent maintenant les mêmes tailles.
- **Carte transposée en portrait** : le chemin Centre → Arène descend au lieu
  d'aller à droite ; les lieux sont plus gros, le cadre est rempli, les titres
  de région se posent du côté libre.
- **Admin en portrait** : la navigation devient un bandeau compact (une rangée
  de sections qui défile) au lieu d'une colonne de 700 px.
- **Pokédex en portrait** : la grille prend le haut, la fiche devient une
  ligne (dessin à gauche, texte à droite), le compteur ne chevauche plus rien.
- **Exercices** : la consigne passe à la taille de titre ; les créatures de la
  scène grandissent avec l'écran, dans les deux sens.
- Espace parents : deux colonnes en portrait, trois en paysage.
- Les tests e2e s'exécutent aussi en **portrait** (`ipad-portrait`), avec
  des garde-fous dédiés : remplissage de la carte, taille de la consigne,
  compacité de l'Admin, non-chevauchement du Pokédex.

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
