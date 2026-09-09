import type { ExerciseTemplate, ExerciseType } from '../types/exercises';
import type { Rng } from '../utils/rng';
import type { GenerationContext } from './context';
import type { GeneratedCore } from './core';
import {
  generateAddition,
  generateCompare,
  generateCount,
  generateNumberSequence,
  generateSubtraction,
} from './generators/math';
import {
  generateChooseWord,
  generateMatchImageWord,
  generateMissingLetter,
  generateSyllable,
} from './generators/reading';
import { generateGridMove, generateLeftRight } from './generators/spatial';
import { generateEnglishWord } from './generators/english';

type TemplateOf<K extends ExerciseType> = Extract<ExerciseTemplate, { type: K }>;
type GeneratorFor<K extends ExerciseType> = (
  template: TemplateOf<K>,
  rng: Rng,
  ctx: GenerationContext,
) => GeneratedCore;

type GeneratorRegistry = { [K in ExerciseType]: GeneratorFor<K> };

/**
 * REGISTRE DES MOTEURS (§31).
 *
 * Ajouter un exercice = ajouter une entree ici + une matrice dans le contenu.
 * On ne code JAMAIS un exercice comme un ecran independant : le type
 * `GeneratorRegistry` garantit qu'aucun type declare ne reste sans generateur.
 */
export const generators: GeneratorRegistry = {
  COUNT: generateCount,
  ADDITION: generateAddition,
  SUBTRACTION: generateSubtraction,
  COMPARE: generateCompare,
  NUMBER_SEQUENCE: generateNumberSequence,
  CHOOSE_WORD: generateChooseWord,
  MATCH_IMAGE_WORD: generateMatchImageWord,
  MISSING_LETTER: generateMissingLetter,
  SYLLABLE: generateSyllable,
  LEFT_RIGHT: generateLeftRight,
  GRID_MOVE: generateGridMove,
  ENGLISH_WORD: generateEnglishWord,
};

type AnyGenerator = (template: ExerciseTemplate, rng: Rng, ctx: GenerationContext) => GeneratedCore;

/**
 * Repartition vers le bon generateur.
 * La conversion est le seul endroit du moteur ou l'on perd le lien entre le
 * discriminant et le type concret ; elle est sure car `generators` est indexe
 * par ce meme discriminant.
 */
export function generateCore(
  template: ExerciseTemplate,
  rng: Rng,
  ctx: GenerationContext,
): GeneratedCore {
  const generator = generators[template.type] as AnyGenerator;
  return generator(template, rng, ctx);
}

export const EXERCISE_TYPES = Object.keys(generators) as ExerciseType[];
