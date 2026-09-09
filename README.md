# Pokexplo

**Une aventure d'apprentissage tactile pour un enfant de CP (5–7 ans), sur iPad.**

Pokexplo n'est pas une collection d'exercices décorés : c'est un **jeu d'aventure, d'exploration et
de collection** dans lequel apprendre permet d'agir sur le monde. L'enfant explore une carte,
rencontre des créatures, réussit des défis, les capture, complète son Pokédex, constitue une équipe,
accomplit des quêtes, affronte un Maître d'Arène et gagne un badge.

> **Règle fondamentale : l'enfant ne doit jamais être obligé de savoir lire pour comprendre ce qu'il
> doit faire.** Chaque texte important peut porter une voix enregistrée, réécoutable via 🔊.

## Démarrage rapide

```bash
npm ci
npm run dev      # http://localhost:5173
```

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run typecheck` | TypeScript strict |
| `npm run lint` | ESLint (0 warning toléré) |
| `npm run test` | Vitest (unitaires + React Testing Library) |
| `npm run e2e` | Playwright (iPad paysage + 1024 × 768) |
| `npm run build` | Build de production dans `dist/` |
| `npm run verify` | typecheck + lint + tests + build (ce que fait la CI) |

## Routes

| Route | Écran |
| --- | --- |
| `#/` | « ▶ Commencer l'aventure » (débloque l'audio iPad) |
| `#/play` | Centre Pokémon (hub) |
| `#/play/map` | Carte à nœuds |
| `#/play/pokedex` · `#/play/team` · `#/play/badges` · `#/play/quests` | Collection |
| `#/parents` | Tableau parent |
| `#/admin` | Interface d'administration (contenu, voix, releases) |
| `#/dev/ui-kit` | Design system (développement) |

## Déploiement sur GitHub Pages

1. Pousser sur la **branche par défaut** du dépôt, ou lancer le workflow *Deploy*
   à la main (**Actions → Deploy → Run workflow**).
2. Le workflow exécute `typecheck → lint → test → build` puis publie `dist/` sur la
   branche `gh-pages`. C'est le **seul** à écrire sur cette branche.
3. Dans GitHub : **Settings → Pages → Deploy from a branch → `gh-pages` → `/ (root)`**.
4. Sur l'iPad, ouvrir `https://<compte>.github.io/Pokexplo/` dans Safari,
   puis **Partager → Sur l'écran d'accueil**. L'application s'installe en PWA plein écran.

> Le premier écran (« Commencer l'aventure ») est indispensable : c'est le premier toucher qui
> débloque l'audio sur iPad.

## Fonctionne sans Firebase

L'application est **complète sans aucun service externe** : le contenu, les voix enregistrées, les
images et les sauvegardes sont stockés dans IndexedDB sur l'appareil. C'est le mode par défaut, et
c'est suffisant pour un usage familial.

Pour activer la synchronisation multi-appareils, renseigner les variables `VITE_FIREBASE_*`
(voir `.env.example`) : `FirebaseBackend` est alors chargé dynamiquement. Aucun composant de
l'application n'importe Firebase directement.

## Ajouter du contenu sans toucher au code

Tout se fait depuis `#/admin` : créatures, biomes, nœuds, rencontres, matrices d'exercices, arènes,
quêtes, packs pédagogiques, **et surtout les voix** (écrire un texte → 🎙 enregistrer → préécouter →
valider). Puis *Publier* : une nouvelle release de contenu est créée, sans nouveau build.

Pour que ce contenu et ses images apparaissent **sur tous les appareils**, deux voies :
déposer l'export dans `public/content/bundle.json` et les images dans `public/media/`, ou activer
Firebase. Tout est expliqué dans [`docs/MEDIA.md`](docs/MEDIA.md).

## Documentation

| Document | Contenu |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | Règles impératives du projet |
| [`docs/CONCEPTION.md`](docs/CONCEPTION.md) | Source de vérité fonctionnelle |
| [`docs/UI_DESIGN.md`](docs/UI_DESIGN.md) | Direction artistique et design system |
| [`docs/TECHNICAL_SPEC.md`](docs/TECHNICAL_SPEC.md) | Architecture technique |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Données, releases, sauvegardes, migrations |
| [`docs/MEDIA.md`](docs/MEDIA.md) | **Ajouter des images et des sons**, et les faire apparaître partout |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Historique des versions |

## Marques et assets

Ce dépôt ne contient **aucun asset sous copyright**. Les créatures livrées par défaut sont des
dessins originaux générés en SVG à partir d'un descripteur stocké dans la donnée. Les noms, images
et textes sont remplaçables depuis `/admin`, sous la responsabilité de l'administrateur et pour un
usage privé.
