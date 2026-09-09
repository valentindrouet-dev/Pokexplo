import type {
  BadgeId,
  BiomeId,
  ChapterId,
  CreatureId,
  CurriculumPackId,
  EncounterId,
  ExerciseTemplateId,
  GymId,
  MediaPath,
  NodeId,
  QuestId,
  ReleaseId,
  SkillId,
  VoiceMessageId,
} from './ids';
import type { VoiceMessage } from './audio';
import type { ExerciseTemplate } from './exercises';

/** CONCEPTION §21. Les libelles affiches viennent de `TYPE_LABELS`. */
export type CreatureType =
  | 'NORMAL'
  | 'FEU'
  | 'EAU'
  | 'PLANTE'
  | 'ELECTRIK'
  | 'GLACE'
  | 'ROCHE'
  | 'SOL'
  | 'VOL'
  | 'INSECTE'
  | 'PSY'
  | 'TENEBRES'
  | 'FEE'
  | 'COMBAT';

/** Couleurs utilisables par les exercices (une seule dominante par creature). */
export type CreatureColorKey =
  | 'rouge'
  | 'bleu'
  | 'vert'
  | 'jaune'
  | 'orange'
  | 'rose'
  | 'gris'
  | 'marron'
  | 'blanc';

export const COLOR_EN: Record<CreatureColorKey, string> = {
  rouge: 'red',
  bleu: 'blue',
  vert: 'green',
  jaune: 'yellow',
  orange: 'orange',
  rose: 'pink',
  gris: 'grey',
  marron: 'brown',
  blanc: 'white',
};

/** CONCEPTION §16. */
export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'VERY_RARE' | 'LEGENDARY';

/** CONCEPTION §12. */
export type BiomeKind =
  | 'CENTER'
  | 'PRAIRIE'
  | 'FOREST'
  | 'RIVER'
  | 'BEACH'
  | 'CAVE'
  | 'MOUNTAIN'
  | 'SNOW'
  | 'SWAMP'
  | 'VOLCANO'
  | 'CITY';

/**
 * Descripteur graphique d'une creature.
 *
 * Il permet de dessiner une illustration ORIGINALE en SVG sans aucun asset
 * externe (voir `src/components/CreatureSprite.tsx`). L'administrateur peut a
 * tout moment fournir une vraie image via `imagePath`, qui prend le dessus.
 */
export interface CreatureVisual {
  shape: 'round' | 'blob' | 'quad' | 'serpent' | 'bird' | 'rock';
  /** Couleur principale puis couleur de ventre / secondaire. */
  palette: [string, string];
  accent: string;
  ears: 'none' | 'pointy' | 'round' | 'long' | 'fin';
  eyes: 'dot' | 'happy' | 'big' | 'sleepy';
  feature: 'none' | 'spark' | 'leaf' | 'flame' | 'fin' | 'rock' | 'snow' | 'wing';
}

/** CONCEPTION §18-21. */
export interface Creature {
  id: CreatureId;
  name: string;
  /** Nom anglais, utilise par les exercices ENGLISH_WORD. */
  nameEn?: string;
  type1: CreatureType;
  type2?: CreatureType;
  rarity: Rarity;
  /** Biomes ou la creature peut apparaitre. */
  biomes: BiomeId[];
  /** Libelle court d'habitat affiche dans le Pokedex ("Foret de Jade"). */
  habitat: string;
  /** Decoupage syllabique, utilise par les exercices et les quetes (§25). */
  syllables: string[];
  /** Couleur dominante, pour les exercices ENGLISH_WORD / LOGIC. */
  colorKey: CreatureColorKey;
  description?: string;
  /** Image fournie par l'administrateur (prioritaire sur `visual`). */
  imagePath?: MediaPath;
  visual: CreatureVisual;
  /** Voix disant le nom de la creature (bouton 🔊 du Pokedex, §155). */
  nameVoiceId?: VoiceMessageId;
}

/** CONCEPTION §12. */
export interface Biome {
  id: BiomeId;
  name: string;
  kind: BiomeKind;
  /** Deux couleurs de degrade pour le decor procedural. */
  sky: [string, string];
  ground: string;
  accent: string;
  imagePath?: MediaPath;
  musicPath?: MediaPath;
  ambiencePath?: MediaPath;
  introVoiceId?: VoiceMessageId;
  /** Conditions de deblocage du biome (§12). */
  requires?: UnlockCondition;
}

/** CONCEPTION §11. */
export type NodeState = 'LOCKED' | 'AVAILABLE' | 'CURRENT' | 'COMPLETED' | 'SPECIAL_EVENT';

export type NodeKind = 'CENTER' | 'PATH' | 'ENCOUNTER' | 'GYM' | 'EVENT' | 'REST';

/** Condition de deblocage (nœud, biome, arene). */
export interface UnlockCondition {
  /** Nœuds a avoir termines. */
  nodes?: NodeId[];
  /** Badges a posseder. */
  badges?: BadgeId[];
  /** Nombre minimal de creatures capturees. */
  capturedCount?: number;
  /** Il faut posseder au moins `count` creatures d'un de ces types (§23). */
  effectiveTypes?: { types: CreatureType[]; count: number };
  /** Quetes a avoir terminees. */
  quests?: QuestId[];
}

/** Entree d'une table de rencontre ponderee (§16). */
export interface EncounterTableEntry {
  creatureId: CreatureId;
  weight: number;
}

/** CONCEPTION §10 : la carte est un graphe de nœuds. */
export interface MapNode {
  id: NodeId;
  biomeId: BiomeId;
  label: string;
  kind: NodeKind;
  /** Position sur la carte, en pourcentage (0-100), independante de la resolution. */
  x: number;
  y: number;
  connections: NodeId[];
  requires?: UnlockCondition;
  /** Table de rencontre pour les nœuds ENCOUNTER. */
  encounters?: EncounterTableEntry[];
  /** Matrices d'exercices utilisables sur ce nœud. */
  exerciseTemplateIds?: ExerciseTemplateId[];
  gymId?: GymId;
  /** Rencontre visible / evenement special (§17). */
  specialEncounterId?: EncounterId;
  arrivalVoiceId?: VoiceMessageId;
}

/** CONCEPTION §17 : rencontre visible, posee comme un objectif sur la carte. */
export interface SpecialEncounter {
  id: EncounterId;
  creatureId: CreatureId;
  nodeId: NodeId;
  announceVoiceId?: VoiceMessageId;
  exerciseTemplateIds: ExerciseTemplateId[];
  /** Reste sur la carte tant que la creature n'est pas capturee. */
  persistent: boolean;
}

/** CONCEPTION §22-24. */
export interface GymOpponent {
  creatureId: CreatureId;
  hearts: number;
  exerciseTemplateIds: ExerciseTemplateId[];
}

export interface Gym {
  id: GymId;
  /** Nom du Maitre d'Arene. */
  masterName: string;
  gymName: string;
  type: CreatureType;
  nodeId: NodeId;
  badgeId: BadgeId;
  /** Condition d'acces (§23). */
  requires: UnlockCondition;
  opponents: GymOpponent[];
  introVoiceId?: VoiceMessageId;
  requirementVoiceId?: VoiceMessageId;
  victoryVoiceId?: VoiceMessageId;
  encourageVoiceId?: VoiceMessageId;
  masterVisual: CreatureVisual;
}

export interface Badge {
  id: BadgeId;
  name: string;
  gymId: GymId;
  color: string;
  /** Forme du badge, dessinee en SVG. */
  shape: 'hexagon' | 'drop' | 'star' | 'shield' | 'flower';
}

/** CONCEPTION §25 : mini-quetes. */
export type QuestObjective =
  | { kind: 'CAPTURE_TYPE'; type: CreatureType; count: number }
  | { kind: 'CAPTURE_COUNT'; count: number }
  | { kind: 'CAPTURE_NAME_STARTS_WITH'; letter: string; count: number }
  | { kind: 'CAPTURE_SYLLABLE_COUNT'; syllables: number; count: number }
  | { kind: 'COMPLETE_NODES'; nodeIds: NodeId[] }
  | { kind: 'WIN_GYM'; gymId: GymId };

export interface Quest {
  id: QuestId;
  title: string;
  objective: QuestObjective;
  /** Presente par le Professeur (§9). */
  offerVoiceId?: VoiceMessageId;
  completeVoiceId?: VoiceMessageId;
  /** Debloque des nœuds a la reussite. */
  unlocksNodes?: NodeId[];
  chapterId?: ChapterId;
}

/** CONCEPTION §6 : le jeu a un vrai debut, des chapitres et une vraie fin. */
export interface Chapter {
  id: ChapterId;
  index: number;
  title: string;
  introVoiceId?: VoiceMessageId;
  outroVoiceId?: VoiceMessageId;
  /** Le chapitre est termine quand tous ces objectifs sont atteints. */
  goals: Array<
    | { kind: 'QUEST'; questId: QuestId }
    | { kind: 'GYM'; gymId: GymId }
    | { kind: 'CAPTURES'; count: number }
  >;
  /** Chapitre final : declenche l'ecran de fin puis l'exploration libre. */
  isFinal: boolean;
}

/** CONCEPTION §26 + §74. */
export type PedagogyCategory = 'READING' | 'MATH' | 'SPATIAL' | 'ENGLISH' | 'LOGIC' | 'MEMORY';

export interface Skill {
  id: SkillId;
  label: string;
  category: PedagogyCategory;
  /** Regroupement affiche dans le tableau parent (§77). */
  parentLabel: string;
}

/** CONCEPTION §76. */
export interface CurriculumPack {
  id: CurriculumPackId;
  label: string;
  level: 'GS' | 'CP1' | 'CP2' | 'CP3' | 'CE1';
  skillIds: SkillId[];
  /** Difficulte maximale autorisee par competence dans ce pack. */
  maxDifficulty: Record<SkillId, number>;
  active: boolean;
}

/** Ensemble complet du contenu d'une release (§98). */
export interface ContentBundle {
  releaseId: ReleaseId;
  contentVersion: string;
  createdAt: number;
  creatures: Creature[];
  biomes: Biome[];
  nodes: MapNode[];
  specialEncounters: SpecialEncounter[];
  exerciseTemplates: ExerciseTemplate[];
  skills: Skill[];
  curriculumPacks: CurriculumPack[];
  gyms: Gym[];
  badges: Badge[];
  quests: Quest[];
  chapters: Chapter[];
  voiceMessages: VoiceMessage[];
}

/** CONCEPTION §97 : une release publiee est immuable. */
export interface ContentRelease {
  id: ReleaseId;
  label: string;
  createdAt: number;
  publishedAt?: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  bundle: ContentBundle;
  /** Rapport de validation au moment de la publication. */
  validation?: ValidationReport;
}

export interface ValidationIssue {
  level: 'ERROR' | 'WARNING';
  code: string;
  message: string;
  /** Reference de l'element concerne, pour naviguer depuis l'Admin. */
  ref?: string;
}

export interface ValidationReport {
  issues: ValidationIssue[];
  checkedAt: number;
  missingVoices: number;
  outdatedVoices: number;
}

/** CONCEPTION §96. */
export interface AppMeta {
  currentReleaseId: ReleaseId;
  minimumAppVersion: string;
  saveSchemaVersion: number;
}

export const TYPE_LABELS: Record<CreatureType, string> = {
  NORMAL: 'Normal',
  FEU: 'Feu',
  EAU: 'Eau',
  PLANTE: 'Plante',
  ELECTRIK: 'Électrik',
  GLACE: 'Glace',
  ROCHE: 'Roche',
  SOL: 'Sol',
  VOL: 'Vol',
  INSECTE: 'Insecte',
  PSY: 'Psy',
  TENEBRES: 'Ténèbres',
  FEE: 'Fée',
  COMBAT: 'Combat',
};

export const TYPE_COLORS: Record<CreatureType, string> = {
  NORMAL: '#D9D2C6',
  FEU: '#FF9E7A',
  EAU: '#7FC4F5',
  PLANTE: '#A8D86E',
  ELECTRIK: '#FFD45C',
  GLACE: '#BDEDEA',
  ROCHE: '#C9B79C',
  SOL: '#E0C48C',
  VOL: '#CFD8FF',
  INSECTE: '#C4DD8E',
  PSY: '#F0A6D0',
  TENEBRES: '#A79BB5',
  FEE: '#FFC1DE',
  COMBAT: '#FF9E9E',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  COMMON: 'Commun',
  UNCOMMON: 'Peu commun',
  RARE: 'Rare',
  VERY_RARE: 'Très rare',
  LEGENDARY: 'Légendaire',
};

/** Poids de rencontre par defaut selon la rarete (§16). */
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  COMMON: 100,
  UNCOMMON: 45,
  RARE: 16,
  VERY_RARE: 5,
  LEGENDARY: 1,
};
