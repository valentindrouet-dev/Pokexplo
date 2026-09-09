import type { CreatureId, ExerciseInstanceId, ExerciseTemplateId, SkillId } from './ids';
import type { CreatureColorKey, CreatureType, PedagogyCategory } from './content';
import type { ExerciseAudio, VoiceReference } from './audio';

/** CONCEPTION §31 : les 12 moteurs generiques. */
export type ExerciseType =
  | 'COUNT'
  | 'CHOOSE_WORD'
  | 'MATCH_IMAGE_WORD'
  | 'MISSING_LETTER'
  | 'SYLLABLE'
  | 'ADDITION'
  | 'SUBTRACTION'
  | 'COMPARE'
  | 'NUMBER_SEQUENCE'
  | 'LEFT_RIGHT'
  | 'GRID_MOVE'
  | 'ENGLISH_WORD';

/** CONCEPTION §35. */
export type HintType =
  | 'highlightOneByOne'
  | 'splitSyllables'
  | 'showObjects'
  | 'highlightDirection'
  | 'removeWrongAnswer';

/** D'ou viennent les creatures affichees par une matrice (§32). */
export type CreaturePool =
  | { kind: 'random' }
  | { kind: 'biome'; biomeId: string }
  | { kind: 'explicit'; creatureIds: CreatureId[] }
  | { kind: 'type'; type: CreatureType }
  | { kind: 'captured' };

/** Champs communs a toutes les matrices. */
export interface ExerciseTemplateBase {
  id: ExerciseTemplateId;
  label: string;
  category: PedagogyCategory;
  skillId: SkillId;
  /** 1 (tres facile) a 5 (difficile). */
  difficulty: number;
  /** Nombre de reponses proposees. Minimum 2, maximum 4 (§167). */
  answerCount: number;
  hintType: HintType;
  creaturePool: CreaturePool;
  audio: ExerciseAudio;
  /** Consigne generique, volontairement independante du contenu genere (§57). */
  prompt: string;
  hint1Text: string;
  hint2Text: string;
  successText: string;
  locale?: 'fr-FR' | 'en-GB';
}

/* ------------------------------------------------------------------ *
 * Matrices : union discriminee (§34)
 * ------------------------------------------------------------------ */

export interface CountExerciseTemplate extends ExerciseTemplateBase {
  type: 'COUNT';
  minValue: number;
  maxValue: number;
}

export interface ChooseWordExerciseTemplate extends ExerciseTemplateBase {
  type: 'CHOOSE_WORD';
  /** Comment fabriquer les mauvaises reponses. */
  distractors: 'random' | 'sameFirstLetter' | 'sameLength';
}

export interface MatchImageWordExerciseTemplate extends ExerciseTemplateBase {
  type: 'MATCH_IMAGE_WORD';
  /** `wordToImage` : on lit un mot et on choisit l'image. */
  direction: 'imageToWord' | 'wordToImage';
}

export interface MissingLetterExerciseTemplate extends ExerciseTemplateBase {
  type: 'MISSING_LETTER';
  position: 'first' | 'last' | 'any';
}

export interface SyllableExerciseTemplate extends ExerciseTemplateBase {
  type: 'SYLLABLE';
  mode: 'countSyllables' | 'pickFirstSyllable';
}

export interface AdditionExerciseTemplate extends ExerciseTemplateBase {
  type: 'ADDITION';
  maxTerm: number;
  maxSum: number;
  showObjects: boolean;
}

export interface SubtractionExerciseTemplate extends ExerciseTemplateBase {
  type: 'SUBTRACTION';
  maxValue: number;
  showObjects: boolean;
}

export interface CompareExerciseTemplate extends ExerciseTemplateBase {
  type: 'COMPARE';
  maxValue: number;
  question: 'more' | 'less';
}

export interface NumberSequenceExerciseTemplate extends ExerciseTemplateBase {
  type: 'NUMBER_SEQUENCE';
  minValue: number;
  maxValue: number;
  mode: 'next' | 'previous' | 'missing';
  /** Longueur de la suite affichee. */
  length: number;
}

export interface LeftRightExerciseTemplate extends ExerciseTemplateBase {
  type: 'LEFT_RIGHT';
  axis: 'leftRight' | 'aboveBelow';
  /**
   * Cote demande. Il est FIXE par la matrice, pas tire au sort : cela permet
   * d'enregistrer une seule voix par matrice (§57) tout en faisant varier les
   * creatures a chaque instance.
   */
  target: Direction;
}

export interface GridMoveExerciseTemplate extends ExerciseTemplateBase {
  type: 'GRID_MOVE';
  gridSize: number;
  steps: number;
}

export type EnglishWordExerciseTemplate = ExerciseTemplateBase &
  (
    | { type: 'ENGLISH_WORD'; mode: 'color'; color: CreatureColorKey }
    | { type: 'ENGLISH_WORD'; mode: 'count'; count: number }
    | { type: 'ENGLISH_WORD'; mode: 'creature' }
  );

export type ExerciseTemplate =
  | CountExerciseTemplate
  | ChooseWordExerciseTemplate
  | MatchImageWordExerciseTemplate
  | MissingLetterExerciseTemplate
  | SyllableExerciseTemplate
  | AdditionExerciseTemplate
  | SubtractionExerciseTemplate
  | CompareExerciseTemplate
  | NumberSequenceExerciseTemplate
  | LeftRightExerciseTemplate
  | GridMoveExerciseTemplate
  | EnglishWordExerciseTemplate;

/* ------------------------------------------------------------------ *
 * Instances generees
 * ------------------------------------------------------------------ */

export type Direction = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';

/** Une creature posee dans la scene d'exercice. */
export interface ScatteredCreature {
  key: string;
  creatureId: CreatureId;
  /** Position en pourcentage de la zone de jeu. */
  x: number;
  y: number;
  /** Facteur d'echelle, pour eviter un alignement trop mecanique. */
  scale: number;
}

/**
 * Ce qui est montre a l'enfant. Une seule vue generique
 * (`features/learning/ExerciseView`) sait rendre toutes ces presentations :
 * c'est ce qui interdit de coder les exercices un par un (§31).
 */
export type ExercisePresentation =
  | { kind: 'NONE' }
  | { kind: 'CREATURE_GROUP'; items: ScatteredCreature[] }
  | { kind: 'CREATURE_SINGLE'; creatureId: CreatureId }
  | { kind: 'WORD'; letters: Array<{ char: string; hidden: boolean }> }
  | { kind: 'SYLLABLES'; syllables: string[]; creatureId: CreatureId }
  | { kind: 'NUMBER_LINE'; values: Array<number | null> }
  | {
      kind: 'OPERATION';
      left: number;
      operator: '+' | '−';
      right: number;
      showObjects: boolean;
      creatureId: CreatureId;
    }
  | {
      kind: 'COMPARE_PAIR';
      left: { count: number; creatureId: CreatureId };
      right: { count: number; creatureId: CreatureId };
    }
  | {
      kind: 'GRID';
      size: number;
      start: { x: number; y: number };
      path: Direction[];
      creatureId: CreatureId;
    };

export type ChoiceKind = 'NUMBER' | 'TEXT' | 'CREATURE' | 'GROUP' | 'LETTER' | 'CELL';

export interface ExerciseChoice {
  id: string;
  kind: ChoiceKind;
  /** Libelle affiche (nombre, mot, lettre...). Vide pour les choix visuels. */
  label: string;
  creatureId?: CreatureId;
  /** Nombre de creatures affichees pour un choix `GROUP`. */
  count?: number;
  cell?: { x: number; y: number };
}

/** Un palier d'aide (§14 : tentative 2 = indice, tentative 3 = aide renforcee). */
export interface HintStep {
  level: 1 | 2;
  type: HintType;
  text: string;
  voice?: VoiceReference;
  /** Aide renforcee : reponses a retirer de l'ecran. */
  removeChoiceIds?: string[];
}

/** Instance concrete, entierement reproductible a partir de (templateId, seed). */
export interface ExerciseInstance {
  id: ExerciseInstanceId;
  templateId: ExerciseTemplateId;
  type: ExerciseType;
  category: PedagogyCategory;
  skillId: SkillId;
  difficulty: number;
  /** CONCEPTION §33 : rejouer le meme seed redonne exactement le meme exercice. */
  seed: number;
  promptText: string;
  promptVoice?: VoiceReference;
  successText: string;
  successVoice?: VoiceReference;
  presentation: ExercisePresentation;
  choices: ExerciseChoice[];
  /**
   * Disposition des reponses. `row` / `column` portent eux-memes le sens
   * spatial des exercices de reperage : l'enfant touche directement la
   * creature qui est a gauche, sans avoir a relier une scene a une reponse.
   */
  choicesLayout: 'row' | 'column' | 'grid';
  correctChoiceId: string;
  hints: HintStep[];
  locale: 'fr-FR' | 'en-GB';
}

/** Resultat d'une tentative, envoye au modele pedagogique (§74). */
export type AttemptOutcome = 'FIRST_TRY' | 'ASSISTED' | 'FAILED';

export interface ExerciseResult {
  instanceId: ExerciseInstanceId;
  templateId: ExerciseTemplateId;
  skillId: SkillId;
  difficulty: number;
  attempts: number;
  outcome: AttemptOutcome;
  durationMs: number;
  at: number;
}
