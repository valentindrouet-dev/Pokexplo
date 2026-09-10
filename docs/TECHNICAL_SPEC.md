# TECHNICAL_SPEC — Architecture technique

## 79. Chaîne globale

```
CLAUDE → GITHUB → GITHUB PAGES → PWA IPAD
                        ↕
                     FIREBASE (optionnel)
```

## 80. Stack

- **React 19 + TypeScript strict + Vite 7 + CSS natif** (aucun framework CSS).
- **Firebase (optionnel)** : Authentication, Cloud Firestore, Cloud Storage.
- **PWA** : Manifest, Service Worker écrit à la main, Cache API, persistance locale.
- **Tests** : Vitest, React Testing Library, Playwright.

### Backends enfichables

Le projet doit pouvoir tourner **sans Firebase** (déploiement GitHub Pages immédiat, usage familial,
mode hors ligne complet). `src/services/backends/` définit une interface unique :

```ts
interface Backend {
  readonly kind: 'local' | 'firebase';
  auth: AuthPort; content: ContentPort; saves: SavePort; media: MediaPort;
}
```

- `LocalBackend` — IndexedDB (`src/services/db.ts`) : contenu, brouillon, releases, sauvegardes,
  fichiers audio et images stockés en `Blob`. C'est le backend par défaut.
- `FirebaseBackend` — chargé **dynamiquement** (`import('firebase/app')`) uniquement si la
  configuration `VITE_FIREBASE_*` est présente. Firestore pour les métadonnées, Storage pour les
  médias.

Le reste de l'application ne connaît que les *ports* : aucun composant n'importe Firebase.

## 85. Arborescence

```
/
├── CLAUDE.md · README.md · package.json · vite.config.ts · tsconfig.json
├── firebase.json · firestore.rules · firestore.indexes.json · storage.rules
├── docs/     CONCEPTION.md · TECHNICAL_SPEC.md · DATA_MODEL.md · UI_DESIGN.md · CHANGELOG.md
├── public/   manifest.webmanifest · icons/ · .nojekyll
│          media/   images et sons publiés avec le site (docs/MEDIA.md)
│          content/ bundle.json optionnel : contenu de référence du site
├── src/
│   ├── app/             App, router, providers
│   ├── components/      composants transverses (CreatureSprite, VoiceText…)
│   ├── content/         bundle de contenu par défaut (V1)
│   ├── exercise-engine/ générateurs, registre, évaluation, indices, difficulté
│   ├── features/        center · world-map · encounters · capture · pokedex · team ·
│   │                    gyms · quests · learning · parent-dashboard · admin ·
│   │                    play (coquille commune : PlayScreen, StartScreen, badges) · dev
│   ├── firebase/        configuration et initialisation paresseuse
│   ├── game-engine/     monde, rencontres, capture, arènes, quêtes, progression
│   ├── pwa/             sw.template.js, register.ts
│   ├── services/        les 9 services + backends
│   ├── types/           types partagés (unions discriminées)
│   ├── styles/          index.css : point d'entree CSS unique
│   ├── ui/              design system (tokens, components, icons, animations, theme)
│   └── utils/           rng, hash, id, array…
└── .github/workflows/
```

## 87. Services

| Service | Responsabilité |
| --- | --- |
| `ContentService` | Charger la release courante, gérer le brouillon, valider le contenu. |
| `SaveService` | Charger/écrire les profils, `saveRevision`, journal d'événements idempotent. |
| `SyncService` | File d'attente hors ligne, réconciliation, résolution par `saveRevision`. |
| `AssetService` | Résoudre `mediaPath` → URL (Blob local ou Storage), cache, `downloadCurrentAdventure()`. |
| `AudioService` | Lecture voix/musique/bruitages, canaux, ducking. Aucune synthèse vocale (§59). |
| `VoiceRecorderService` | Permission micro, `MediaRecorder`, prises multiples, import de fichier. |
| `AuthService` | Rôles `ADMIN` / `PLAYER`, session locale ou Firebase. |
| `MigrationService` | Migrations de `saveSchemaVersion`, non destructives. |
| `ReleaseService` | Draft → validate → publish → rollback. |

## 88. Routage

**Hash Router** (obligatoire pour GitHub Pages, sans configuration serveur) :

```
#/                    écran « Commencer l'aventure »
#/play                Centre
#/play/map            Carte
#/play/pokedex        Pokédex
#/play/team           Équipe
#/play/badges         Badges
#/play/quests         Quêtes
#/play/encounter/:id  Rencontre
#/play/gym/:id        Arène
#/parents             Tableau parent
#/admin               Admin (tableau de bord)
#/admin/creatures · /exercises · /audio · /images · /biomes · /nodes · /gyms
#/admin/quests · /packs · /releases · /profiles · /progress · /preview
#/dev/ui-kit          Design system (développement)
```

## 89–90. Déploiement

`Settings → Pages → Deploy from a branch → gh-pages → /root`.

```
main → npm ci → typecheck → lint → tests → build → dist/ → gh-pages → GitHub Pages
```

Le workflow `.github/workflows/deploy.yml` est **le seul** à écrire sur `gh-pages`.
`public/.nojekyll` empêche Jekyll d'ignorer les fichiers commençant par `_`.
`BASE_PATH=/Pokexplo/` est injecté au build ; toutes les URL d'assets sont relatives.

## 91. Code update ≠ content update

- **Code** (nouvelle mécanique) : Claude → GitHub → build → GitHub Pages.
- **Contenu** (nouvelle créature) : `/admin` → backend → *Publish*. **Aucun nouveau build.**

## 109–112. PWA

`manifest.webmanifest` : `name`, `short_name`, `icons`, `display: standalone`, `start_url`, `scope`,
`theme_color`, `background_color`, `orientation: landscape`.

Service Worker (`src/pwa/sw.template.js`, précache injecté au build) :

- **App Shell** (JS, CSS, HTML, icônes) — stratégie *cache first*, mise à jour en arrière-plan.
- **Runtime** (images, voix, musique, bruitages) — *stale-while-revalidate* dans un cache dédié.
- **Navigations** — *network first* avec repli sur `index.html` en cache.

**Mise à jour non brutale (§111)** : le nouveau SW n'est jamais activé pendant un exercice, un
combat ou une capture. `UpdateController` n'appelle `skipWaiting()` qu'au lancement, au Centre
Pokémon, ou entre deux séquences (`AppBusyState`).

Trois versions distinctes (§112) : `APP_VERSION`, `CONTENT_VERSION`, `SAVE_SCHEMA_VERSION`.

## 107–108. Hors ligne

`downloadCurrentAdventure()` précharge explicitement le contenu de la région courante : images des
créatures, voix des dialogues/exercices/indices, musique du biome, données de la release. La
progression est écrite localement puis synchronisée quand le réseau revient.

## 119–120. Tests

Tests audio indispensables : enregistrement micro, stop, préécoute, nouvelle prise, annulation,
upload, lecture, lecture offline, texte modifié, voix obsolète, voix absente, permission refusée.

Tests iPad (manuels, `docs/CHANGELOG.md` en garde la trace) : PWA installée, micro, lecture audio,
autoplay après « Commencer », réécoute, retour de veille, mode avion, reconnexion, casque Bluetooth.

## 92–94. Firebase

Projet **dédié** à cette application. Services : Authentication, Firestore, Storage.
Rôles `ADMIN` (contenu, images, voix, publication, progression) et `PLAYER` (lire le contenu, jouer,
sauvegarder sa progression).

Règles : **DENY BY DEFAULT**. `allow write: if true` est interdit en production
(`firestore.rules`, `storage.rules`).
