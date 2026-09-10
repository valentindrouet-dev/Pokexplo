# CONCEPTION — Pokexplo

> **Document de référence principal du projet.**
> Source de vérité fonctionnelle. Il doit être lu et respecté par le concepteur,
> par Claude lors du développement, par l'interface d'administration, par la structure
> Firebase, par les workflows GitHub et par les futures évolutions.

---

## 1. Vision générale

Créer une application tactile destinée principalement à un enfant de **5 à 7 ans / niveau CP**,
fonctionnant sur **iPad**, et proposant une véritable aventure d'exploration et de collection.

L'application ne doit **jamais** donner l'impression d'être *une collection d'exercices scolaires
décorés avec des créatures*. Elle doit être conçue comme **un véritable jeu d'aventure dans lequel
apprendre permet d'agir sur le monde**.

L'enfant : explore → rencontre des créatures → réussit des défis → les capture → complète son
Pokédex → constitue une équipe → découvre des biomes → accomplit des quêtes → affronte des Maîtres
d'Arène → gagne des badges → progresse jusqu'à une véritable fin.

## 2. Règle fondamentale

> **L'enfant ne doit jamais être obligé de savoir lire pour comprendre ce qu'il doit faire.**

Tout contenu important destiné à l'enfant peut posséder : un texte, une voix, une illustration,
éventuellement une animation. **La voix est une composante fondamentale de l'interface.**

## 3. Public

Public principal : **5–7 ans, CP**. L'architecture doit pouvoir évoluer vers Grande Section, CE1 et
au-delà (voir « Packs pédagogiques », §26).

## 4. Ergonomie

Gros boutons, pictogrammes, très grandes zones tactiles, peu de texte, navigation évidente, aucun
menu technique, animations courtes, retours visuels immédiats, voix pour toutes les consignes.

- Taille tactile minimale : **56 × 56 px CSS** (`--touch-min`).
- Cible prioritaire : **iPad en paysage**, tout en restant responsive (plancher 1024 × 768).

## 5. Boucle de jeu

```
CENTRE → CARTE → DESTINATION → DÉPLACEMENT → ÉVÉNEMENT → RENCONTRE → EXERCICE
   → RÉUSSITE / AIDE → CAPTURE → COLLECTION → EXPLORATION → QUÊTE / OBJECTIF
   → ARÈNE → BADGE → NOUVELLE RÉGION
```

Implémentée par `src/game-engine/` et orchestrée par `GameProvider`.

## 6. Une vraie aventure

Le jeu possède un vrai début, des chapitres, des événements, des objectifs, des Arènes, une
progression et une vraie conclusion. Après la fin, l'enfant peut continuer à explorer et compléter
son Pokédex (mode « exploration libre »).

## 7. Récompenses

Créatures capturées, Pokédex, nouveaux chemins, nouvelles régions, badges, rencontres rares,
événements, progression narrative.

**La V1 n'ajoute pas** : monnaie, cristaux, boutique, énergie, objets consommables complexes.

## 8. Centre Pokémon

Hub principal, il remplace autant que possible les menus traditionnels. Il donne accès à :
🗺️ Aventure · 🎒 Équipe · 📖 Pokédex · 🏅 Badges · 👨‍🔬 Professeur.

## 9. Professeur

Donne les objectifs, introduit les régions, explique une mécanique, propose une quête, félicite.
Dialogues **très courts** (1 à 3 lignes), affichés, lus automatiquement et réécoutables via 🔊.

## 10. Carte du monde

Pas de monde ouvert avec joystick : la carte fonctionne **par nœuds**. L'enfant touche une
destination, son personnage s'y déplace automatiquement.

```
         🌲 FORÊT
         ●──●──●
        /
🏥 ●──●──●──● 💧 RIVIÈRE
CENTRE           │
                 ●
                 │
                🏆 ARÈNE
```

## 11. États des nœuds

`LOCKED` · `AVAILABLE` · `CURRENT` · `COMPLETED` · `SPECIAL_EVENT`

L'enfant doit comprendre immédiatement où il est, où il peut aller, où il est déjà allé, et où
quelque chose de spécial se produit. Chaque état a une couleur **et** une forme **et** une icône.

## 12. Biomes

Prairie, forêt, rivière, plage, grotte, montagne, neige, marais, volcan, ville.
Chaque biome définit : illustration, musique, ambiance sonore, nœuds, créatures, rencontres rares,
quêtes, événements, chemins, conditions de déblocage.

## 13. Rencontres

Apparition → animation → phrase vocale éventuelle → exercice → réponse → aide éventuelle →
réussite → capture. **Par défaut : exercice réussi = capture réussie.**

## 14. Gestion de l'erreur

Ne jamais afficher « ❌ MAUVAISE RÉPONSE ». Préférer « Presque ! Regarde bien. » (également lue).

| Tentative | Aide |
| --- | --- |
| 1 | Aucune aide |
| 2 | Indice |
| 3 | Aide renforcée (ex. suppression d'une mauvaise réponse) |

**L'objectif est que l'enfant finisse par comprendre puis réussir.** Aucun échec définitif.

## 15. Capture

Rapide et gratifiante : Ball → animation → quelques mouvements → capture → révélation Pokédex.

## 16. Rareté

`COMMON` · `UNCOMMON` · `RARE` · `VERY_RARE` · `LEGENDARY`
Les rencontres rares bénéficient d'une animation spéciale, d'une musique, d'effets et d'une
apparition visible sur la carte.

## 17. Rencontres visibles

Certaines rencontres apparaissent directement comme objectifs (« Une créature rare est apparue dans
la forêt ! ») avec une silhouette visible sur la carte (nœud `SPECIAL_EVENT`).

## 18. Pokédex

Trois états : **Inconnu** (silhouette) · **Rencontré** (informations partielles) · **Capturé**
(image, nom, type, habitat).

## 19. Collection

La collection contient les créatures **réellement capturées**. Elle est distincte du Pokédex
(un même Pokédex peut être vu sans posséder la créature).

## 20. Équipe

Équipe active : **6 créatures maximum**. Ajouter / retirer / remplacer. Pas de statistiques
complexes en V1.

## 21. Types

`type1` obligatoire, `type2` optionnel. Eau, Plante, Feu, Glace, Roche, Électrik, Normal, Vol,
Insecte, Sol, Psy, Ténèbres, Fée.

## 22. Arènes

Chaque Arène possède : un Maître, un type, une condition d'accès, plusieurs créatures adverses,
plusieurs exercices, un badge.

## 23. Condition d'accès (exemple « Pierre »)

Posséder au moins 3 créatures efficaces contre Roche.

```
PRÊT POUR PIERRE ?
💧 Eau      ✅
🌿 Plante   ✅
❄️ Glace    ❌
2 / 3
```

## 24. Combats

Système pédagogique avec habillage de combat : la créature adverse possède des cœurs, une bonne
réponse déclenche une animation d'attaque et retire un cœur, puis un nouvel exercice, puis victoire.

## 25. Mini-quêtes

Trouve trois créatures Plante · Trouve une créature dont le nom commence par C · Capture deux
créatures Eau · Trouve une créature avec trois syllabes.

## 26. Catégories pédagogiques

`READING` · `MATH` · `SPATIAL` · `ENGLISH` · `LOGIC` · `MEMORY`

## 27. Lecture

Associer nom et image, reconnaître une lettre, compléter un mot, reconnaître une syllabe, sons
simples, sons complexes.

## 28. Mathématiques

Dénombrer, additionner, soustraire, comparer, reconnaître un nombre, nombre précédent, nombre
suivant, suite numérique.

## 29. Repérage

Gauche, droite, dessus, dessous, déplacements, grilles, chemins.

## 30. Anglais

`Touch the blue Pokémon.` · `Find three Pokémon.` · `Which Pokémon is red?`
L'architecture accepte des voix spécifiques en anglais (`locale` sur `VoiceMessage`).

## 31. Moteur d'exercices

> **Les exercices ne sont jamais développés un par un comme des écrans indépendants.**

Types génériques : `COUNT`, `CHOOSE_WORD`, `MATCH_IMAGE_WORD`, `MISSING_LETTER`, `SYLLABLE`,
`ADDITION`, `SUBTRACTION`, `COMPARE`, `NUMBER_SEQUENCE`, `LEFT_RIGHT`, `GRID_MOVE`, `ENGLISH_WORD`.

## 32. Matrices

```json
{
  "type": "COUNT",
  "difficulty": 2,
  "minValue": 3,
  "maxValue": 8,
  "answerCount": 3,
  "creaturePool": "random",
  "hintType": "highlightOneByOne"
}
```

Une matrice produit des dizaines ou centaines d'instances différentes.

## 33. Seed

Les exercices générés utilisent un **seed** (`encounterId` + `seed`). Le même exercice doit pouvoir
être recréé à l'identique après fermeture accidentelle de l'application.

## 34. Types TypeScript

Unions discriminées, TypeScript strict, `any` interdit (voir `src/types/exercises.ts`).

## 35. Indices

`highlightOneByOne` · `splitSyllables` · `showObjects` · `highlightDirection` · `removeWrongAnswer`
Les indices possèdent leur propre voix.

---

# Système audio

## 36–37. Principe général

Tout bloc de contenu destiné à l'enfant associe **TEXTE + VOIX**. Tout texte important doit pouvoir
posséder une voix enregistrée, une lecture automatique facultative et un bouton de réécoute.

**On ne lit que les voix enregistrées par l'administrateur** (§59) : aucune voix de synthèse ne
parle à sa place.

## 38–42. Enregistrement dans l'Admin

Composant réutilisable `<VoiceTextEditor />` : zone de texte + 🎙️ Enregistrer · ▶️ Écouter ·
🔴 Recommencer · 🗑 Supprimer.

Workflow : écrire le texte → 🎙 Enregistrer → autoriser le micro → parler → ⏹ Stop → ▶ préécouter →
✅ Utiliser cette voix. **Aucun logiciel externe n'est nécessaire.**

Pendant l'enregistrement, un **prompteur** affiche le texte en très grand (utile sur iPad).

**Plusieurs prises** : réenregistrer ne supprime jamais immédiatement l'ancienne prise. L'ancienne
n'est supprimée qu'après validation (`[ Garder l'ancienne ] [ Utiliser la nouvelle ]`).

## 43–48. Fichiers audio

Import manuel conservé (`.m4a`, `.mp3`, `.wav`, `.webm`). Format préféré MP4/AAC ; pour de la voix :
mono, 44,1 kHz, 64–96 kb/s. L'enregistrement utilise `getUserMedia()` puis `MediaRecorder`, le format
étant détecté via `MediaRecorder.isTypeSupported()` selon la priorité
`audio/mp4` → `audio/webm` → format natif. **Pas de transcodage serveur en V1** : on stocke
`mimeType`, `extension` et `duration`, et `AudioService` sait les lire. Les noms de fichiers sont
générés automatiquement (`voice_784ec239.m4a`).

## 49. Structure `VoiceMessage`

```ts
interface VoiceMessage {
  id: string;
  text: string;
  audioPath?: string;
  mimeType?: string;
  duration?: number;
  textHash?: string;
  autoPlay: boolean;
  replayEnabled: boolean;
  showText: boolean;
}
```

## 50–53. Cycle de vie des voix

Un `textHash` est enregistré au moment de la prise. Si le texte change, l'Admin affiche
« ⚠️ Le texte a été modifié depuis l'enregistrement de la voix » puis « 🎙 Réenregistrer ».

Statuts : `NO_TEXT` · `TEXT_ONLY` · `VOICE_OK` · `VOICE_OUTDATED` · `VOICE_MISSING`.

L'Admin propose un filtre « voix à enregistrer » et une **session de doublage**. Avant publication,
il avertit : « ⚠️ 7 textes destinés à l'enfant n'ont pas de voix » — l'administrateur peut corriger
ou publier quand même, ces textes restant alors **muets**.

## 54–58. Voix d'exercice et textes dynamiques

`ExerciseAudio { question?, hint1?, hint2?, success? }`.

On distingue le **texte statique** (voix enregistrée complète) du **texte dynamique**
(« Combien vois-tu de Pikachu ? »). On n'enregistre pas 300 variantes : on préfère des formulations
génériques (« Combien y en a-t-il ? »). Les fragments assemblés ne sont pas indispensables en V1.

## 59. Pas de voix de synthèse

`voiceMode: RECORDED | NONE`. Priorité : **voix enregistrée → silence**, le texte restant affiché.

Il y a eu un repli sur la synthèse vocale du navigateur. Il a été retiré : un fichier absent — ou
présent sur un autre appareil seulement — et une voix de machine prenait la place de celle de
l'adulte, sans que rien ne le dise. On croyait entendre sa prise, on entendait la machine.

Le silence est plus honnête : il se voit dans l'Admin (« voix manquante »), il se corrige en une
prise, et il ne fait jamais passer une voix pour une autre. L'absence de voix ne casse rien, et le
jeu reste entièrement jouable sans le son.

`voiceMode: 'TTS'` reste accepté en lecture pour les contenus d'avant ce retrait : il se comporte
comme `RECORDED`.

## 60–63. Services

`AudioService` : `play/stop/pause/replay/preload/setVolume/mute/unmute`, empêche deux voix
simultanées, gère les erreurs, fonctionne hors connexion depuis le cache.

`VoiceRecorderService` : `requestMicrophonePermission/startRecording/stopRecording/
getSupportedMimeType/createBlob/preview/upload/replace/delete`.

**Le micro n'est demandé que lorsque l'administrateur clique réellement sur 🎙 Enregistrer**, jamais
au chargement. En cas de refus : message clair, proposition de réessayer ou d'importer un fichier.
L'application ne doit pas planter.

## 64–69. Lecture côté enfant

Safari/iPad bloque l'autoplay : un premier écran **« ▶ COMMENCER L'AVENTURE »** initialise
`AudioService` et débloque le contexte audio. Un bouton 🔊 permet toujours de réécouter.
Icônes : 🔊 disponible · 🔉 lecture en cours · 🔇 son coupé · 🎙️ enregistrer.
Volumes séparés `voicesVolume` / `musicVolume` / `sfxVolume`.
Priorité VOIX > BRUITAGE IMPORTANT > MUSIQUE (ducking de la musique pendant une voix).

## 69–72. Hors ligne et stockage

Les voix de la région courante sont préchargées (dialogues, exercices, tutoriels, Arène, événements
proches) via Service Worker + Cache API. **Firestore ne stocke pas le son** : uniquement
`audioPath`, `mimeType`, `duration`, `textHash`. Le fichier reste dans Storage
(`media/voice/{professor,adventure,gyms,exercises,tutorials,quests}/`).

---

# Progression

## 73. Progression aventure

`currentNode`, `regionsUnlocked`, `completedNodes`, `gymsCompleted`, `badges`, `quests`, `encounters`.

## 74. Progression pédagogique

Compétences : `math.counting`, `math.addition`, `reading.syllables`, `reading.complexSounds`,
`spatial.leftRight`, … Chaque compétence conserve `mastery`, `attemptCount`, `firstTrySuccesses`,
`assistedSuccesses`, `failures`, `recentResults`, `lastPracticedAt`.

## 75. Difficulté adaptative

Le moteur ajuste progressivement la difficulté. **L'enfant ne voit jamais ces statistiques.**

## 76. Packs pédagogiques

*CP — période 1* : nombres 1–10, syllabes simples, gauche/droite.
*CP — période 2* : nombres jusqu'à 20, additions, sons OU / ON / CH.

## 77. Tableau parent

Pourcentages par domaine (Lecture / Maths / Repérage) puis une liste « À retravailler ».

## 78. Données enfant

Uniquement : pseudonyme, avatar, progression, Pokédex, statistiques pédagogiques.
**Aucune** adresse, géolocalisation, publicité ou donnée marketing.

---

# Contenu de la V1

## 121. Périmètre V1

- **Carte** : Centre, Prairie, Forêt, Rivière, Arène de Pierre.
- **Créatures** : 15–20.
- **Exercices** : `COUNT`, `MATCH_IMAGE_WORD`, `MISSING_LETTER`, `LEFT_RIGHT` (les autres moteurs
  existent et sont testés, mais ces quatre-là portent la V1).
- **Audio** : dialogues principaux, tutoriels, consignes des quatre moteurs, indices essentiels,
  voix de Pierre, messages de victoire.
- **Fin** : Badge Roche.

## 122–126. Phases

1. **Prototype** — Centre, carte, déplacement, rencontre, COUNT, VoiceTextEditor, enregistrement
   micro, lecture enfant, capture, Pokédex, sauvegarde.
2. **Vertical slice** — trois biomes, vingt créatures, quatre moteurs, voix, Pierre, badge, fin de
   chapitre.
3. **Master complet** — créatures, exercices, biomes, map editor, Arènes, voix, session de doublage,
   Draft, Preview, Publish.
4. **Intelligence pédagogique** — maîtrise, difficulté adaptative, historique, dashboard, packs CP.
5. **Extensions** — nouvelles régions, créatures, anglais, nouveaux moteurs, légendaires, voix,
   personnages.

## 130. Définition de réussite de la V1

**L'enfant peut** : lancer l'application depuis l'écran d'accueil de l'iPad ; toucher Commencer ;
comprendre toutes les consignes importantes sans savoir lire ; naviguer sur la carte ; entendre les
personnages ; réécouter avec 🔊 ; rencontrer une créature ; faire quatre types d'exercices ; recevoir
des indices vocaux ; capturer ; consulter son Pokédex ; constituer son équipe ; affronter Pierre ;
gagner le Badge Roche ; atteindre une vraie fin de chapitre.

**L'administrateur peut** : écrire un texte ; cliquer sur 🎙 Enregistrer la voix ; enregistrer depuis
Mac ou iPad ; préécouter ; recommencer ; conserver l'ancienne prise ; importer un fichier audio ;
repérer les voix manquantes ; repérer les voix obsolètes ; créer créatures, exercices, biomes et
Arènes ; prévisualiser ; publier ; suivre la progression.

**Le tout sans mettre en danger les sauvegardes existantes.**

---

## Note sur les marques et les assets

Le dépôt ne contient aucun asset sous copyright. Les créatures livrées par défaut sont des dessins
originaux générés en SVG à partir d'un descripteur stocké dans la donnée. Le vocabulaire de
l'interface (Centre, Pokédex, Badge, Arène, Ball) reprend la grammaire de jeu décrite dans ce guide ;
l'administrateur reste libre de remplacer noms, images et textes depuis `/admin`, pour un usage
familial privé.
