import type {
  BadgeId,
  ChapterId,
  CreatureId,
  CurriculumPackId,
  EncounterId,
  EventId,
  ExerciseTemplateId,
  GymId,
  NodeId,
  ProfileId,
  QuestId,
  ReleaseId,
  SkillId,
} from './ids';
import type { AudioSettings } from './audio';
import type { AttemptOutcome, ExerciseInstance } from './exercises';

/** Version du schema de sauvegarde (§112). */
export const SAVE_SCHEMA_VERSION = 3;

/** CONCEPTION §18 : trois etats du Pokedex. */
export type PokedexState = 'UNKNOWN' | 'SEEN' | 'CAPTURED';

export interface PokedexEntry {
  creatureId: CreatureId;
  state: PokedexState;
  firstSeenAt?: number;
  capturedAt?: number;
  /** Nombre d'exemplaires reellement captures (la collection, §19). */
  captureCount: number;
}

export interface QuestProgress {
  questId: QuestId;
  status: 'OFFERED' | 'ACTIVE' | 'COMPLETED';
  progress: number;
  target: number;
  startedAt?: number;
  completedAt?: number;
}

/** Rencontre en cours : permet de reprendre exactement ou l'enfant s'est arrete (§33). */
export interface ActiveEncounter {
  encounterId: EncounterId;
  nodeId: NodeId;
  creatureId: CreatureId;
  templateId: ExerciseTemplateId;
  seed: number;
  attempts: number;
  startedAt: number;
  /** Instance regeneree a la volee ; jamais persistee telle quelle. */
  instance?: ExerciseInstance;
}

/** Etat d'un combat d'Arene en cours (§24). */
export interface ActiveGymBattle {
  gymId: GymId;
  opponentIndex: number;
  heartsLeft: number;
  seed: number;
  attempts: number;
}

/** CONCEPTION §103. */
export interface SaveState {
  currentNode: NodeId;
  unlockedNodes: NodeId[];
  completedNodes: NodeId[];
  regionsUnlocked: string[];
  team: CreatureId[];
  badges: BadgeId[];
  quests: Record<QuestId, QuestProgress>;
  gymsCompleted: GymId[];
  chapterId: ChapterId;
  chaptersCompleted: ChapterId[];
  /** Vrai une fois la fin atteinte : l'exploration libre continue (§6). */
  adventureCompleted: boolean;
  activeEncounter: ActiveEncounter | null;
  activeGymBattle: ActiveGymBattle | null;
  lastPlayedAt: number;
  saveRevision: number;
}

/** CONCEPTION §74. */
export interface SkillStats {
  skillId: SkillId;
  mastery: number;
  attemptCount: number;
  firstTrySuccesses: number;
  assistedSuccesses: number;
  failures: number;
  recentResults: AttemptOutcome[];
  lastPracticedAt: number;
  /** Difficulte courante proposee par le moteur adaptatif (§75). */
  currentDifficulty: number;
}

export interface LearningState {
  skills: Record<SkillId, SkillStats>;
  activePackId: CurriculumPackId | null;
}

/** Une ligne du journal, utile au tableau parent et au debug. */
export interface HistoryEntry {
  id: EventId;
  at: number;
  kind:
    | 'ENCOUNTER'
    | 'CAPTURE'
    | 'EXERCISE'
    | 'NODE_COMPLETED'
    | 'QUEST_COMPLETED'
    | 'GYM_WON'
    | 'BADGE'
    | 'CHAPTER_COMPLETED';
  label: string;
  skillId?: SkillId;
  outcome?: AttemptOutcome;
}

export interface PlayerProfile {
  id: ProfileId;
  /** Pseudonyme uniquement : aucune donnee personnelle (§78). */
  nickname: string;
  avatar: string;
  createdAt: number;
  audioSettings: AudioSettings;
  packId: CurriculumPackId | null;
}

/** Sauvegarde complete d'un profil. */
export interface SaveFile {
  schemaVersion: number;
  profile: PlayerProfile;
  state: SaveState;
  pokedex: Record<CreatureId, PokedexEntry>;
  learning: LearningState;
  history: HistoryEntry[];
  /** CONCEPTION §105 : journal d'idempotence. */
  appliedEvents: EventId[];
  /** Release de contenu avec laquelle la sauvegarde a ete ecrite. */
  contentReleaseId: ReleaseId | null;
  meta: {
    migrations: Array<{ from: number; to: number; at: number }>;
    appVersion: string;
  };
}
