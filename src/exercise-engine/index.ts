/**
 * MOTEUR D'EXERCICES (CONCEPTION §31-35).
 *
 * Regle absolue : on ne code jamais un exercice comme un ecran independant.
 * Un exercice = une MATRICE (donnee) + un GENERATEUR (code generique) + un SEED.
 */
export { generateExercise } from './generate';
export { generateCore, generators, EXERCISE_TYPES } from './registry';
export { evaluateAttempt, outcomeFromAttempts } from './evaluate';
export type { AttemptEvaluation } from './evaluate';
export { buildHints } from './hints';
export {
  createSkillStats,
  updateSkillStats,
  nextDifficulty,
  selectTemplate,
  statsFor,
  masteryByCategory,
  skillsToPractice,
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
} from './difficulty';
export type { SelectionOptions } from './difficulty';
export {
  RETRY_FIRST,
  RETRY_SECOND,
  SUCCESS_DEFAULT,
  SUCCESS_ASSISTED,
  SYSTEM_ENCOURAGEMENTS,
} from './feedback';
export type { Encouragement } from './feedback';
export { resolvePool, pickCreatures } from './context';
export type { GenerationContext } from './context';
export type { GeneratedCore } from './core';
