# UI_DESIGN — Direction artistique et design system

> Ce document est **normatif** pour tout ce qui est affiché dans `/play`.
> Résumé en une phrase (§188) :
>
> « Une interface Nintendo/Pokopia lumineuse et pastel, faite de grands panneaux arrondis,
> de gros pictogrammes et de très peu d'informations simultanées, conçue pour être comprise
> tactilement par un enfant de cinq ans avant même qu'il sache lire. »

---

## 131. Direction artistique

L'interface enfant s'inspire fortement de la **philosophie visuelle de Pokémon Pokopia**, sans en
faire une copie pixel-perfect. On en reprend le **langage visuel** : extrêmement simple, chaleureux,
rond, pastel, très lumineux, tactile, peu chargé, immédiatement compréhensible — davantage proche
d'une interface de jeu Nintendo que d'une application Web.

**À éviter absolument** : l'apparence site Internet / dashboard / application de gestion.

## 132. Principe visuel fondamental

```
DÉCOR DU JEU
   ↓ léger assombrissement / adoucissement
GRAND PANNEAU CLAIR
   ↓
GROS CONTENU
   ↓
ACTIONS SIMPLES
```

L'interface ne doit jamais devenir une accumulation de petites fenêtres : **un grand panneau
principal avec beaucoup d'air**.

## 133. Arrière-plan

Le monde reste visible derrière les menus, mais sa compétition visuelle est réduite :
`background: rgba(255,255,255,0.10)` + `backdrop-filter: blur(1px à 3px)`.
**Jamais de flou massif** : l'enfant doit encore reconnaître « je suis dans la forêt » même quand le
Pokédex est ouvert. Tokens : `--scrim-light`, `--scrim-dark`, `--blur-scene`.

## 134. Surfaces principales

Très grandes surfaces blanc **chaud** (jamais `#FFFFFF` partout) :

```css
--surface-main: #FFFDF8;
--surface-soft: #FFF8EC;
--surface-muted: #F7F5F3;
```

## 135. Formes

Presque aucun angle vif.

```css
--radius-sm: 12px;  --radius-md: 18px;  --radius-lg: 28px;
--radius-xl: 34px;  --radius-pill: 999px;
```

Grands panneaux 24–36 px · boutons 16–24 px · petits contrôles complètement arrondis.

## 136. Pas de contours lourds

Pas de gros traits noirs. L'interface fonctionne par **couleur, espace, surface, contraste et légère
ombre**. Les bordures restent rares : `border: 1px solid rgba(70,60,55,0.08)` (`--border-hairline`).

## 137. Ombres

Très discrètes :

```css
--shadow-soft:  0 6px 18px rgba(65, 53, 40, 0.12);
--shadow-float: 0 12px 32px rgba(50, 45, 40, 0.16);
```

Pas d'ombres noires très fortes.

## 138–139. Palette et sémantique des couleurs

```css
--ui-cream: #FFF8EC;   --ui-white: #FFFDF9;
--ui-yellow: #FFD45C;  --ui-yellow-soft: #FFE9A2;
--ui-coral: #FF777F;   --ui-coral-soft: #FFB0B5;
--ui-aqua: #62D7D0;    --ui-aqua-soft: #BDEDEA;
--ui-lavender: #919AEF; --ui-lavender-soft: #D7D9FF;
--ui-lilac: #D7B5F5;   --ui-green: #A8D86E;
--ui-text: #514A4B;    --ui-text-soft: #837B7A;
```

| Couleur | Fonction |
| --- | --- |
| Jaune | sélection / action immédiate |
| Corail | Arènes / défis / énergie |
| Turquoise | navigation / information |
| Lavande | Pokédex / collection / menus secondaires |
| Vert | exploration / validation / nature |
| Blanc/crème | surface principale |

**Jamais 12 couleurs différentes sur le même écran.**

## 140–142. Sélection

La sélection est **extrêmement évidente** : l'élément change franchement de surface
(`background: var(--color-yellow)`), grossit légèrement, et reçoit un **pointeur** ▼.

```
      ▼
┌─────────────────────┐
│   Créature choisie  │
└─────────────────────┘
```

Le pointeur flotte lentement (2–4 px). **La sélection ne doit jamais dépendre uniquement de la
couleur** : couleur + pointeur + taille (+ son discret). C'est aussi une exigence d'accessibilité.

## 143–146. Typographie

```css
font-family: ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", system-ui, sans-serif;
```

Éviter les polices fines, serif ou condensées. Couleur du texte : **jamais noir pur**, `#514A4B`.

```css
--text-small: 18px; --text-normal: 22px; --text-large: 28px;
--title: 34px;      --hero-title: 42px;
```

Toutes ces valeurs utilisent `clamp()` pour s'adapter aux tailles d'iPad.
**Maximum 1 à 3 lignes** dans l'interface enfant.

## 147–148. Pictogrammes

L'application est massivement iconographique. Les icônes finales sont des **SVG originaux
cohérents** (`src/ui/icons/`), pas des emoji : formes simples, coins arrondis, faible détail,
aplats pastel, contour sombre fin, même épaisseur de trait. **Pas d'icônes venant de cinq
bibliothèques différentes.**

## 148 bis. Carte du monde

La carte se lit sans savoir lire :

- une **bulle souple** regroupe les lieux d'une même région (union de cercles et
  de liaisons épaisses de la même couleur, opacité portée par le groupe pour
  éviter les coutures) ; un liseré plus large dans la couleur d'accent sépare
  deux régions de teintes proches ;
- un **chemin** épais et arrondi relie les lieux : plein quand il est ouvert,
  vert quand il est déjà parcouru, pointillé gris quand il est fermé ;
- chaque lieu porte un **pictogramme de son type** — fleur, feuille, goutte,
  rocher, arène — et **jamais un cadenas à la place** : l'enfant doit d'abord
  reconnaître *où* il va. L'état « fermé » est porté par la couleur, la
  transparence et une petite pastille en coin (§142, §173) ;
- les régions sont **espacées** pour que les titres ne se chevauchent jamais :
  chaque nom de lieu prend la première place libre autour de son lieu, les
  titres de région prennent ce qui reste autour de leur bulle
  (`mapGeometry.layoutLabels`) ;
- les **destinations ouvertes respirent** (pulsation lente de l'anneau) et le
  **dresseur** est une silhouette reconnaissable, pas une pastille ;
- **on choisit avant de partir** (§193) : le premier toucher sélectionne et
  nomme, le second — ou « Y aller ! » — déplace.

Un biome peut définir un `shortName`, utilisé uniquement sur la carte.

## 148 ter. Pictogrammes de types

Chaque `CreatureType` a son dessin (`features/pokedex/typeIcons.tsx`), même
grille et même trait que le reste. Les filtres du Pokédex les utilisent, et
**suivent les types réellement présents dans le contenu** : la donnée décide de
la liste, pas le code.

## 149–150. Navigation

Barre d'onglets grands, carrés arrondis, espacés, principalement iconographiques ; onglet actif en
couleur vive + petit marqueur. Certains écrans utilisent une **grille de grandes tuiles** avec
énormément d'espace entre les éléments.

## 151–153. Boutons

Bouton principal : `min-height: 64px; border-radius: 22px; font-weight: 700;`
Action principale en jaune / couleur forte, action secondaire en blanc ou pastel très léger.
Boutons **pilule** pour filtres, petits choix, catégories.
**Pas de checkbox ni de radio HTML côté enfant** : une vraie grosse carte tactile.

## 154–156. Deux grandes colonnes — **côté adulte uniquement**

Ratio **45 % / 55 %** : liste à gauche, édition à droite. C'est la structure de `/admin`.

> **Cette structure est proscrite dans `/play` (§191).** Le Pokédex et l'Équipe l'utilisaient : un
> enfant de cinq ans doit alors comprendre que le panneau de droite parle de ce qu'il a touché à
> gauche, et que le bouton du bas agit sur la sélection. C'est trois idées avant le premier geste.
> Côté enfant, on montre **une chose à la fois, en grand** : la grille, puis la fiche par-dessus.

Une créature inconnue s'affiche en silhouette avec `???`.

## 157–159. Espacement, safe-area, responsive

```css
--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
--space-5: 24px; --space-6: 32px; --space-7: 48px;
```

Tous les écrans respectent `env(safe-area-inset-*)` ; aucun bouton essentiel contre les bords.
Plancher **1024 × 768**. Utiliser `flex`, `grid`, `clamp()`, `aspect-ratio`, `min()`, `max()` —
jamais de positions calées sur une seule résolution.

## 160–163. Interaction et animation

Aucune fonctionnalité de `/play` ne dépend du `:hover`. Retour tactile : `scale 1 → 0.96 → 1` en
100–160 ms. Transitions souples et courtes (`transform 160ms ease, background 160ms ease`) ;
apparition des panneaux en `fade + scale .97 → 1` sur 180–250 ms.
**Ne pas suranimer** : seul l'élément à regarder attire l'attention.
Tout est désactivé sous `prefers-reduced-motion`.

## 164–167. Listes et exercices

Chaque ligne de liste fait **56–72 px minimum**. Un écran d'exercice est encore plus simple qu'un
menu : 🔊 + une question + le support + les réponses. Pas d'onglets, pas de menus, pas d'information
secondaire. **Une seule question visuelle.** Les réponses sont immenses :
100–140 px de largeur, 70–90 px de hauteur.

## 168–169. Bouton voix

Le bouton 🔊 est un composant officiel du design system (`<VoiceButton />`) : rond, 56–64 px,
toujours placé au même endroit dans un même contexte. Pendant la lecture il pulse légèrement
(ondes discrètes, pas d'animation agressive).

## 170–172. Dialogues et modales

Les dialogues sont de grandes cartes très claires avec portrait du personnage, texte court, 🔊 et une
action contextualisée. **Pas de bouton « OK » abstrait** : « J'Y VAIS ! », « CONTINUER »,
« ATTRAPER ! », « RETOUR ». Les modales sont rares : fond atténué, grande carte centrale,
**1 ou 2 actions maximum**.

## 173–175. États

Élément bloqué : désaturé, `opacity: 0.45`, symbole cadenas — mais **reste identifiable**.
Information manquante : côté enfant une image neutre, côté admin « ⚠️ Image manquante ».
Jamais `ERROR 404 ASSET MISSING`, jamais `Loading…` comme écran principal enfant : on utilise une
petite Ball tournante (`<LoadingBall />`).

## 176–177. Grammaire de navigation

Retour **toujours au même endroit** (coin inférieur gauche) avec la même icône ←.
Action principale à droite : `[ ← RETOUR ]  …  [ CONTINUER → ]`.

## 178. Mode enfant ≠ mode admin

`/play` suit intégralement ce document. `/admin` peut être plus dense et professionnel (tableaux,
formulaires, listes, informations techniques) mais partage couleurs, typographie et une partie des
composants.

## 179–182. Design system technique

```
src/ui/
├── tokens/       (types TS des tokens, échelles)
├── components/   (composants réutilisables)
├── icons/        (SVG originaux)
├── animations/   (keyframes + utilitaires)
└── theme/        (tokens.css, base.css)
```

`src/ui/theme/tokens.css` contient **toutes** les valeurs centrales (couleurs, rayons, espacements,
`--touch-min: 56px`).

**Interdiction du one-off CSS (§181)** : pas de `border-radius: 17px` ici et `23px` ailleurs. Tous
les composants utilisent les tokens communs. Un test garde-fou (`tests/ui/design-tokens.test.ts`)
échoue si un fichier CSS introduit une couleur hexadécimale ou un rayon hors tokens.

Composants minimum (§182) : `SoftPanel`, `ModalPanel`, `IconButton`, `PrimaryButton`,
`SecondaryButton`, `PillButton`, `TabButton`, `SelectionTile`, `SelectionPointer`, `VoiceButton`,
`CreatureCard`, `ChoiceButton`, `BottomActionBar`, `TopTabs`, `DialogCard`, `TwoPaneLayout`.

## 183–184. SoftPanel et BottomActionBar

`<SoftPanel>` est le composant principal : blanc chaud, coins très arrondis, légère ombre, beaucoup
de padding. Il constitue la base visuelle de presque tous les écrans.
`<BottomActionBar>` accueille les actions secondaires en bas — **jamais plus de 2–3 actions**.

## 185. Page de développement

Route `#/dev/ui-kit` : couleurs, boutons, panneaux, cartes, voix, états, typographies, onglets.

## 186. Règles Claude pour l'UI

Reprises intégralement dans `CLAUDE.md` §4.

---

# Deuxième passe UX (§190–§196)

> Ces règles viennent d'une inspection complète de la V1. Le constat tenait en une phrase :
> **l'interface avait été conçue trop près du modèle de données et pas assez près des gestes réels
> de l'enfant et de l'éditeur.** Elles ne demandent pas d'ajouter des fonctions — elles demandent
> d'en **retirer de la complexité visible**.

## 190. Quatre choix, pas davantage

**Un écran destiné à l'enfant ne présente jamais plus de QUATRE actions conceptuellement
différentes en même temps.** Trois est mieux. Une seule est *l'action principale* (§177).

Ne comptent pas dans ce total : les réponses d'un exercice (2 à 4, §167), le retour (§176), le
bouton 🔊 (§168), et les éléments d'une même collection — vingt créatures dans une grille sont
**un** choix, pas vingt.

Ne pas offrir **deux chemins vers la même destination** sur un même écran : le Centre proposait à
la fois une tuile « Aventure » et un bouton « Partir ! ».

## 191. Une chose à la fois, en grand

Côté enfant, pas de deux panneaux permanents (§154). Le détail d'un élément s'ouvre **par-dessus**
la collection, en plein écran, et se referme d'un geste. L'enfant sait toujours ce qu'il regarde.

## 192. La voix guide aussi la NAVIGATION

Le moteur vocal ne sert plus seulement aux exercices. **Chaque écran enfant annonce ce qu'on peut y
faire**, à l'arrivée, une fois :

| Écran | Ce que dit la voix |
| --- | --- |
| Pokédex | « Voici tous les Pokémon que tu as rencontrés ! » |
| Équipe | « Choisis les Pokémon que tu veux emmener avec toi ! » |
| Carte | « Où veux-tu aller ? » |
| Badges | « Voici tes badges ! » |

Et **toute sélection se nomme** : toucher un lieu dit son nom, toucher une créature dit le sien.

> L'enfant ne doit pas avoir besoin de comprendre les mots **Pokédex**, **Équipe** ou **Quêtes**
> pour se servir du jeu.

Ces phrases sont des `VoiceMessage` comme les autres (CLAUDE.md §3) : jamais de chemin audio en
dur, toujours enregistrables par l'administrateur, toujours rattrapées par la synthèse.

## 193. Sélection en deux temps sur la carte

Toucher un lieu le **sélectionne** et dit son nom ; un second geste sur « Y aller ! » lance le
voyage. Cela supprime les départs accidentels et laisse à l'enfant le temps de comprendre ce qu'il
vient de choisir.

## 194. Hiérarchie d'un écran d'exercice

De haut en bas : **🔊 · grande scène · réponses géantes**. La consigne écrite reste présente mais
**secondaire** (elle sert à l'adulte et à l'enfant qui commence à lire). Quand un indice apparaît,
ce sont **l'animation et la voix** qui portent l'aide — pas un nouveau bloc de texte dominant.

## 195. Checklist obligatoire d'une PR qui touche `/play`

| Critère | Cible |
| --- | --- |
| Lecture nécessaire pour jouer | **aucune** |
| Actions principales simultanées | **1**, exceptionnellement 2 |
| Choix conceptuels simultanés | **≤ 4** |
| Taille tactile | **≥ 56 px** |
| Navigation dépendant du `:hover` | **0** |
| Texte enfant | **1–2 lignes** |
| Consigne importante | **voix disponible** |
| Action principale visible en moins de 2 s | **oui** |
| Défilement pour atteindre l'action principale | **non** |
| Ressemble à un formulaire Web | **non** |

## 196. L'Admin montre des INTENTIONS, pas la structure de données

`/admin` a le droit d'être dense et professionnel (§178). Il n'a pas le droit d'exiger la
connaissance du modèle interne. Aucun parcours normal ne doit demander de saisir un chemin
`media/…`, un identifiant, une coordonnée X/Y, une valeur d'énumération ou une couleur
hexadécimale : image et voix s'éditent **dans l'entité** qu'elles concernent, les couleurs par un
sélecteur, la carte au doigt. Ce qui reste technique vit sous un repli **« Réglages avancés »**.

Cibles :

| Action | Objectif |
| --- | --- |
| Ajouter une créature | < 1 minute |
| Remplacer son image | 2 à 3 gestes |
| Enregistrer son nom | 2 à 3 gestes |
| Dupliquer une créature | 1 geste |
| Créer une matrice d'exercice | < 2 minutes |
| Ajouter un lieu | depuis la carte |
| Ajouter une créature à un lieu | vignettes visuelles |
| Voir les voix manquantes | 1 geste |
| Prévisualiser | 1 geste |
| Publier | 1 action claire, après validation |

Les pages globales « Images » et « Voix » ne servent plus à éditer une entité : elles servent à
**vérifier l'ensemble** — ce qui manque, ce qui est obsolète, ce qui n'est plus utilisé.

---

## 189. Test ultime de chaque écran

1. Un enfant qui ne sait pas lire comprend-il ce qu'il peut toucher ?
2. L'action principale est-elle identifiable en moins de deux secondes ?
3. Les éléments sont-ils assez gros pour être touchés sans précision ?
4. Peut-on retirer quelque chose de l'écran sans perdre d'information importante ?
5. Est-ce que cela ressemble davantage à un jeu Nintendo qu'à une application Web ?

Si la réponse à la cinquième question est **non**, l'interface doit être retravaillée.


## Accueil — ajustement demandé le 10 septembre 2026

Le Centre présente « Partir à l’aventure ! » sur toute la largeur du menu,
puis six boutons carrés à coins arrondis en deux lignes de trois :
Équipe / Pokédex / Objets, puis Exercices / Carte / Parents.
Cette disposition demandée remplace pour cet accueil la limite de quatre
choix du §190. Partir accepte la mission proposée ; Carte ouvre seulement la carte.
Les six pictogrammes sont des illustrations PNG originales générées, à fond
transparent, aplats pastel et contours sombres épais inspirés de la référence.
La confirmation Parents est conservée. Objets donne accès aux badges existants.
Exercices propose un entraînement libre issu des matrices et du pack du profil,
sans capture ni modification de la progression de l’aventure ou des statistiques.
