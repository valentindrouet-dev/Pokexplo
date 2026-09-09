# CLAUDE.md — Règles impératives du projet Pokexplo

> **Avant toute modification, lire `docs/CONCEPTION.md`.**
> Ce fichier ne remplace pas la conception : il liste les règles non négociables.

Pokexplo est un **moteur d'aventure pédagogique tactile, configurable et vocal**,
destiné à un enfant de 5 à 7 ans (niveau CP) sur iPad.
Le code sait *afficher, déplacer, générer, corriger, parler, enregistrer,
capturer, sauvegarder, synchroniser*.
Les **données** déterminent le monde, les créatures, les textes, les voix, les
exercices, les Arènes, les quêtes et l'histoire.

---

## 1. Documents de référence

| Document | Rôle |
| --- | --- |
| `docs/CONCEPTION.md` | Source de vérité fonctionnelle (vision, boucle de jeu, contenu). |
| `docs/UI_DESIGN.md` | Direction artistique et design system. **L'interface enfant doit le suivre.** |
| `docs/TECHNICAL_SPEC.md` | Architecture technique, services, PWA, déploiement. |
| `docs/DATA_MODEL.md` | Schémas Firestore / Storage / sauvegardes / migrations. |
| `docs/MEDIA.md` | Origines des médias (dépôt, adresse externe, appareil) et portabilité du contenu. |
| `docs/SYNC.md` | Modifier depuis l'ordinateur, mise à jour automatique sur l'iPad, limites de stockage. |
| `docs/CHANGELOG.md` | Historique des versions. |

---

## 2. Règles générales (§84 du guide)

- Lire `docs/CONCEPTION.md` avant de coder.
- **Ne jamais supprimer une sauvegarde.** Aucune opération destructive sur `playerAccounts/`.
- **Ne jamais modifier directement `gh-pages`.** Cette branche ne contient que le build publié
  par la CI. Travailler sur `main` ou une branche `feature/*` / `fix/*`.
- **Toute modification de schéma nécessite une migration** (`MigrationService`, non destructive).
- **Ne jamais introduire de secret dans Git** (clé de service, token, mot de passe).
- **Ne jamais ouvrir les règles Firebase** : `allow write: if true` est interdit en production.
  Le principe est `DENY BY DEFAULT`.
- **Ne jamais tester sur les données de production.** Utiliser un profil de test ou l'émulateur.
- **Utiliser TypeScript strict.** `any` est interdit (règle ESLint `@typescript-eslint/no-explicit-any`).
- **Ne pas coder les exercices individuellement.** Un nouvel exercice = une nouvelle *matrice*
  (`ExerciseTemplate`) ou un nouveau *générateur* enregistré dans `src/exercise-engine/registry.ts`.
- **Respecter l'ergonomie enfant** (cibles ≥ 56 px, voix, peu de texte).
- **Respecter le système `VoiceTextEditor`** : c'est le seul point d'entrée pour associer une voix à un texte.
- **Tout texte destiné à l'enfant doit pouvoir être vocalisé** (référence `VoiceMessage`).
- **Tester avant toute PR** : `npm run verify` (typecheck + lint + tests + build).

---

## 3. Règles audio (§127 du guide)

- Tout texte enfant doit pouvoir référencer une `VoiceMessage`.
- `VoiceTextEditor` doit rester **réutilisable** : ne jamais recoder un enregistreur ailleurs.
- **Ne jamais coder une voix directement dans un composant spécifique** (pas de chemin audio en dur).
- Les fichiers audio restent dans **Storage** (ou le magasin de médias local) ;
  **Firestore ne stocke que les métadonnées** (`audioPath`, `mimeType`, `duration`, `textHash`).
- Toute modification du texte doit permettre de **détecter une voix obsolète** (`textHash`).
- **L'absence de voix ne doit jamais faire planter l'application.**
- **Le jeu doit rester utilisable si le son est coupé.**
- **Deux voix ne doivent jamais parler simultanément** (`AudioService` sérialise le canal `voice`).
- Les fichiers doivent pouvoir être utilisés **hors ligne**.
- **Ne jamais demander l'accès micro avant une action explicite de l'administrateur.**

---

## 4. Règles d'interface (§186 du guide)

- L'interface enfant doit suivre `docs/UI_DESIGN.md`.
- **Ne jamais créer une interface de type dashboard Web dans `/play`.**
- Privilégier grandes surfaces, coins arrondis, pastels et espace blanc.
- **Ne jamais dépendre du `:hover`** dans `/play`.
- Toutes les actions enfant doivent être tactiles. **Minimum tactile : 56 px.**
- **Une seule action cognitive principale par écran.**
- Jamais plus de **2 ou 3 actions majeures simultanées**.
- **Ne jamais utiliser du noir pur** pour le texte (`--color-text: #514A4B`).
- **Utiliser uniquement les design tokens** (`src/ui/theme/tokens.css`).
- **Ne pas créer de CSS one-off** sans justification (un test garde-fou vérifie les rayons/couleurs).
- **Réutiliser les composants du design system** (`src/ui/components`).
- Ne jamais utiliser une icône sans alternative compréhensible (`aria-label` + voix).
- Ne pas surcharger l'écran de texte (1 à 3 lignes maximum côté enfant).
- Toute sélection doit être identifiable **autrement que par la couleur**
  (pointeur `SelectionPointer` + variation de taille).
- Tester à **1024 × 768**, en **paysage** et en **portrait** iPad. Respecter les `safe-area`.
- **Ne pas copier l'interface ou les assets de Pokopia** : uniquement son langage visuel.

---

## 5. Contenu et marques

Le dépôt ne contient **aucun asset sous copyright**. Les créatures livrées par défaut sont
des dessins **originaux générés en SVG** (`src/components/CreatureSprite.tsx`) à partir d'un
descripteur `visual` stocké dans la donnée. L'administrateur peut remplacer image, nom et
description depuis `/admin` — sous sa propre responsabilité et pour un usage privé.

---

## 6. Workflow Git

```
Issue → @claude → feature branch → code → tests → Pull Request → validation → merge main
```

- Branches : `main`, `feature/*`, `fix/*`, `gh-pages` (build uniquement).
- `gh-pages` est écrite **exclusivement** par `.github/workflows/deploy.yml`.
- Chaque PR doit passer `npm run verify`.

---

## 7. Commandes utiles

```bash
npm run dev         # développement (http://localhost:5173)
npm run typecheck   # TypeScript strict
npm run lint        # ESLint (0 warning toléré)
npm run test        # Vitest (unitaires + RTL)
npm run e2e         # Playwright (iPad paysage, iPad portrait, 1024x768)
npm run build       # build de production (dist/)
npm run verify      # tout ce qui précède, dans l'ordre de la CI
```

---

## 8. Test ultime de chaque écran enfant (§189)

1. Un enfant qui ne sait pas lire comprend-il ce qu'il peut toucher ?
2. L'action principale est-elle identifiable en moins de deux secondes ?
3. Les éléments sont-ils assez gros pour être touchés sans précision ?
4. Peut-on retirer quelque chose sans perdre d'information importante ?
5. Est-ce que cela ressemble davantage à un jeu Nintendo qu'à une application Web ?

**Si la réponse à la question 5 est « non », l'écran doit être retravaillé.**
