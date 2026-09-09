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

## 149–150. Navigation

Barre d'onglets grands, carrés arrondis, espacés, principalement iconographiques ; onglet actif en
couleur vive + petit marqueur. Certains écrans utilisent une **grille de grandes tuiles** avec
énormément d'espace entre les éléments.

## 151–153. Boutons

Bouton principal : `min-height: 64px; border-radius: 22px; font-weight: 700;`
Action principale en jaune / couleur forte, action secondaire en blanc ou pastel très léger.
Boutons **pilule** pour filtres, petits choix, catégories.
**Pas de checkbox ni de radio HTML côté enfant** : une vraie grosse carte tactile.

## 154–156. Deux grandes colonnes

Ratio recommandé **45 % / 55 %** : collection (grille) à gauche, information (grande image +
détails) à droite. C'est exactement la structure du Pokédex. Une créature inconnue s'affiche en
silhouette avec `???`.

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

## 189. Test ultime de chaque écran

1. Un enfant qui ne sait pas lire comprend-il ce qu'il peut toucher ?
2. L'action principale est-elle identifiable en moins de deux secondes ?
3. Les éléments sont-ils assez gros pour être touchés sans précision ?
4. Peut-on retirer quelque chose de l'écran sans perdre d'information importante ?
5. Est-ce que cela ressemble davantage à un jeu Nintendo qu'à une application Web ?

Si la réponse à la cinquième question est **non**, l'interface doit être retravaillée.
