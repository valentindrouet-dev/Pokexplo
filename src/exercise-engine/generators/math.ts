import type {
  AdditionExerciseTemplate,
  CompareExerciseTemplate,
  CountExerciseTemplate,
  ExerciseChoice,
  NumberSequenceExerciseTemplate,
  SubtractionExerciseTemplate,
} from '../../types/exercises';
import type { Rng } from '../../utils/rng';
import { clamp } from '../../utils/array';
import type { GenerationContext } from '../context';
import { pickCreatures, resolvePool } from '../context';
import { numberChoices, scatter, type GeneratedCore } from '../core';

/** COUNT — denombrer (§28). */
export function generateCount(
  template: CountExerciseTemplate,
  rng: Rng,
  ctx: GenerationContext,
): GeneratedCore {
  const pool = resolvePool(template.creaturePool, ctx);
  const creature = rng.pick(pool);
  const min = Math.max(1, Math.min(template.minValue, template.maxValue));
  const max = Math.max(min, template.maxValue);
  const answer = rng.int(min, max);

  const { choices, correctChoiceId } = numberChoices(rng, answer, template.answerCount, {
    min: Math.max(1, min - 2),
    max: max + 2,
  });

  return {
    presentation: { kind: 'CREATURE_GROUP', items: scatter(rng, answer, () => creature.id) },
    choices,
    correctChoiceId,
    choicesLayout: 'row',
  };
}

/** ADDITION — additionner (§28). */
export function generateAddition(
  template: AdditionExerciseTemplate,
  rng: Rng,
  ctx: GenerationContext,
): GeneratedCore {
  const pool = resolvePool(template.creaturePool, ctx);
  const creature = rng.pick(pool);
  const maxTerm = Math.max(1, template.maxTerm);
  const maxSum = Math.max(2, template.maxSum);

  const left = rng.int(1, Math.min(maxTerm, maxSum - 1));
  const right = rng.int(1, clamp(maxSum - left, 1, maxTerm));
  const answer = left + right;

  const { choices, correctChoiceId } = numberChoices(rng, answer, template.answerCount, {
    min: 1,
    max: maxSum + 2,
  });

  return {
    presentation: {
      kind: 'OPERATION',
      left,
      operator: '+',
      right,
      showObjects: template.showObjects,
      creatureId: creature.id,
    },
    choices,
    correctChoiceId,
    choicesLayout: 'row',
  };
}

/** SUBTRACTION — soustraire (§28). */
export function generateSubtraction(
  template: SubtractionExerciseTemplate,
  rng: Rng,
  ctx: GenerationContext,
): GeneratedCore {
  const pool = resolvePool(template.creaturePool, ctx);
  const creature = rng.pick(pool);
  const maxValue = Math.max(2, template.maxValue);
  const left = rng.int(2, maxValue);
  const right = rng.int(1, left);
  const answer = left - right;

  const { choices, correctChoiceId } = numberChoices(rng, answer, template.answerCount, {
    min: 0,
    max: maxValue,
  });

  return {
    presentation: {
      kind: 'OPERATION',
      left,
      operator: '−',
      right,
      showObjects: template.showObjects,
      creatureId: creature.id,
    },
    choices,
    correctChoiceId,
    choicesLayout: 'row',
  };
}

/**
 * COMPARE — comparer (§28).
 * Les deux groupes SONT les reponses : l'enfant touche directement le bon tas,
 * sans avoir a relier une illustration a un bouton separe (§166).
 */
export function generateCompare(
  template: CompareExerciseTemplate,
  rng: Rng,
  ctx: GenerationContext,
): GeneratedCore {
  const pool = resolvePool(template.creaturePool, ctx);
  const [first, second] = pickCreatures(rng, pool, 2);
  const maxValue = Math.max(2, template.maxValue);

  let leftCount = rng.int(1, maxValue);
  let rightCount = rng.int(1, maxValue);
  let guard = 0;
  while (rightCount === leftCount && guard < 20) {
    rightCount = rng.int(1, maxValue);
    guard += 1;
  }
  if (rightCount === leftCount) {
    rightCount = leftCount === maxValue ? leftCount - 1 : leftCount + 1;
  }
  if (rng.chance(0.5)) [leftCount, rightCount] = [rightCount, leftCount];

  const choices: ExerciseChoice[] = [
    { id: 'left', kind: 'GROUP', label: '', creatureId: first!.id, count: leftCount },
    { id: 'right', kind: 'GROUP', label: '', creatureId: second!.id, count: rightCount },
  ];

  const wantsMore = template.question === 'more';
  const leftWins = wantsMore ? leftCount > rightCount : leftCount < rightCount;

  return {
    presentation: { kind: 'NONE' },
    choices,
    correctChoiceId: leftWins ? 'left' : 'right',
    choicesLayout: 'row',
  };
}

/** NUMBER_SEQUENCE — nombre precedent / suivant / manquant (§28). */
export function generateNumberSequence(
  template: NumberSequenceExerciseTemplate,
  rng: Rng,
  _ctx: GenerationContext,
): GeneratedCore {
  const length = Math.max(3, template.length);
  const min = Math.max(0, template.minValue);
  const max = Math.max(min + length, template.maxValue);
  const start = rng.int(min + 1, Math.max(min + 1, max - length));

  const run = Array.from({ length }, (_, index) => start + index);
  let answer: number;
  let values: Array<number | null>;

  switch (template.mode) {
    case 'next':
      answer = start + length;
      values = [...run, null];
      break;
    case 'previous':
      answer = start - 1;
      values = [null, ...run];
      break;
    case 'missing':
    default: {
      const hole = rng.int(1, length - 2);
      answer = run[hole] as number;
      values = run.map((value, index) => (index === hole ? null : value));
      break;
    }
  }

  const { choices, correctChoiceId } = numberChoices(rng, answer, template.answerCount, {
    min: Math.max(0, min - 1),
    max: max + 2,
  });

  return {
    presentation: { kind: 'NUMBER_LINE', values },
    choices,
    correctChoiceId,
    choicesLayout: 'row',
  };
}
