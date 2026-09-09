# DATA_MODEL — Données, releases, sauvegardes et migrations

## 95. Structure Firestore

```
meta/
contentReleases/
playerAccounts/
```

## 96. `meta/app`

```json
{
  "currentReleaseId": "release_0007",
  "minimumAppVersion": "1.2.0",
  "saveSchemaVersion": 3
}
```

## 97–98. Releases

```
contentReleases/
├── release_0001/
├── release_0002/
└── release_0003/
```

**Une release publiée est immuable.** Contenu d'une release :

```
creatures/ · biomes/ · nodes/ · encounters/ · exerciseTemplates/ · skills/
curriculumPacks/ · gyms/ · quests/ · chapters/ · voiceMessages/
```

## 99. Draft et publication

```
validate → create release → copy content → validate release → set currentReleaseId
```

**Le pointeur `currentReleaseId` change en dernier.**

## 100. Rollback

Revenir à une release antérieure (`release_0012 → release_0011`) suffit.
**Les sauvegardes restent intactes.**

## 101–103. Profils et sauvegardes

```
playerAccounts/{uid}/profiles/{profileId}/
    state/ · pokedex/ · learning/ · history/
```

`state` :

```ts
interface SaveState {
  currentNode: NodeId;
  unlockedNodes: NodeId[];
  completedNodes: NodeId[];
  team: CreatureId[];
  badges: BadgeId[];
  quests: Record<QuestId, QuestProgress>;
  activeEncounter: ActiveEncounter | null;
  lastPlayedAt: number;
  saveRevision: number;
}
```

## 104–106. Cohérence

- **Transactions (§104)** — une capture écrit `collection + pokedex + progress` en une seule
  opération (`applyGameEvent` produit un patch unique, écrit en un `set` transactionnel).
- **Idempotence (§105)** — chaque événement important possède un `eventId`. Le journal
  `appliedEvents` empêche qu'une capture envoyée deux fois soit appliquée deux fois.
- **`saveRevision` (§106)** — incrémenté à chaque modification importante ; sert d'arbitre à la
  synchronisation (la révision la plus haute gagne, jamais de suppression).

## 74. Statistiques pédagogiques

```ts
interface SkillStats {
  skillId: SkillId;
  mastery: number;          // 0..1
  attemptCount: number;
  firstTrySuccesses: number;
  assistedSuccesses: number;
  failures: number;
  recentResults: AttemptResult[]; // fenêtre glissante (12 derniers)
  lastPracticedAt: number;
}
```

Mise à jour : moyenne mobile pondérée. Réussite du premier coup `+`, réussite avec aide `+/-`,
échec `-`. La difficulté proposée suit la maîtrise (§75) mais **n'est jamais montrée à l'enfant**.

## 114. Storage

```
media/
├── creatures/ · biomes/ · gyms/ · characters/
├── voice/
│   ├── professor/ · adventure/ · gyms/ · exercises/ · tutorials/ · quests/
├── music/ · sfx/ · ui/
```

**Firestore ne stocke jamais le son (§72)** : uniquement `audioPath`, `mimeType`, `duration`,
`textHash`.

## 113. Migrations

`MigrationService` applique en séquence des migrations `n → n+1`. Chaque migration :

- ne supprime **jamais** de donnée (on ajoute, on renomme en conservant l'ancien champ si besoin) ;
- est testée (`tests/services/migration.test.ts`) ;
- est journalisée dans `save.meta.migrations`.

| Version | Contenu |
| --- | --- |
| 1 | Schéma initial (état, pokédex, équipe, badges). |
| 2 | Ajout de `quests`, `appliedEvents`, `saveRevision`. |
| 3 | Ajout de `learning` (statistiques par compétence) et `audioSettings`. |

## 78. Données enfant

Uniquement pseudonyme, avatar, progression, Pokédex, statistiques pédagogiques.
Aucune adresse, géolocalisation, publicité ou donnée marketing.
