import type {
  ChooseWordExerciseTemplate,
  ExerciseChoice,
  MatchImageWordExerciseTemplate,
  MissingLetterExerciseTemplate,
  SyllableExerciseTemplate,
} from '../../types/exercises';
import type { Creature } from '../../types';
import type { Rng } from '../../utils/rng';
import { deaccent } from '../../utils/text';
import type { GenerationContext } from '../context';
import { pickCreatures, resolvePool } from '../context';
import { numberChoices, type GeneratedCore } from '../core';

/** Distracteurs de mots (§27). */
function pickDistractors(
  rng: Rng,
  pool: Creature[],
  target: Creature,
  count: number,
  mode: ChooseWordExerciseTemplate['distractors'],
): Creature[] {
  const others = pool.filter((creature) => creature.id !== target.id);
  const scored = others.filter((creature) => {
    if (mode === 'sameFirstLetter') {
      return deaccent(creature.name)[0]?.toUpperCase() === deaccent(target.name)[0]?.toUpperCase();
    }
    if (mode === 'sameLength') {
      return Math.abs(creature.name.length - target.name.length) <= 1;
    }
    return true;
  });

  const preferred = rng.sample(scored, count);
  if (preferred.length >= count) return preferred;

  const fallback = rng.sample(
    others.filter((creature) => !preferred.some((item) => item.id === creature.id)),
    count - preferred.length,
  );
  return [...preferred, ...fallback];
}

/** CHOOSE_WORD — associer une image a son nom (§27). */
export function generateChooseWord(
  template: ChooseWordExerciseTemplate,
  rng: Rng,
  ctx: GenerationContext,
): GeneratedCore {
  const pool = resolvePool(template.creaturePool, ctx);
  const target = rng.pick(pool);
  const distractors = pickDistractors(rng, pool, target, template.answerCount - 1, template.distractors);

  const choices = rng.shuffle(
    [target, ...distractors].map<ExerciseChoice>((creature) => ({
      id: `c_${creature.id}`,
      kind: 'TEXT',
      label: creature.name,
    })),
  );

  return {
    presentation: { kind: 'CREATURE_SINGLE', creatureId: target.id },
    choices,
    correctChoiceId: `c_${target.id}`,
    choicesLayout: 'row',
  };
}

/** MATCH_IMAGE_WORD — image -> mot, ou mot -> image (§27). */
export function generateMatchImageWord(
  template: MatchImageWordExerciseTemplate,
  rng: Rng,
  ctx: GenerationContext,
): GeneratedCore {
  const pool = resolvePool(template.creaturePool, ctx);
  const picked = pickCreatures(rng, pool, template.answerCount);
  const target = picked[0] as Creature;

  if (template.direction === 'wordToImage') {
    const choices = rng.shuffle(
      picked.map<ExerciseChoice>((creature) => ({
        id: `c_${creature.id}`,
        kind: 'CREATURE',
        label: '',
        creatureId: creature.id,
      })),
    );
    return {
      presentation: {
        kind: 'WORD',
        letters: [...target.name.toUpperCase()].map((char) => ({ char, hidden: false })),
      },
      choices,
      correctChoiceId: `c_${target.id}`,
      choicesLayout: 'row',
      promptTarget: target.name,
    };
  }

  const choices = rng.shuffle(
    picked.map<ExerciseChoice>((creature) => ({
      id: `c_${creature.id}`,
      kind: 'TEXT',
      label: creature.name,
    })),
  );
  return {
    presentation: { kind: 'CREATURE_SINGLE', creatureId: target.id },
    choices,
    correctChoiceId: `c_${target.id}`,
    choicesLayout: 'row',
  };
}

/** MISSING_LETTER — completer un mot (§27). */
export function generateMissingLetter(
  template: MissingLetterExerciseTemplate,
  rng: Rng,
  ctx: GenerationContext,
): GeneratedCore {
  const pool = resolvePool(template.creaturePool, ctx);
  const target = rng.pick(pool);
  const word = target.name.toUpperCase();
  const letters = [...word];

  const index =
    template.position === 'first'
      ? 0
      : template.position === 'last'
        ? letters.length - 1
        : rng.int(0, letters.length - 1);

  const answer = letters[index] as string;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const wrongPool = [...alphabet].filter((letter) => letter !== deaccent(answer).toUpperCase());
  const wrong = rng.sample(wrongPool, Math.max(0, template.answerCount - 1));

  const choices = rng.shuffle(
    [answer, ...wrong].map<ExerciseChoice>((letter, position) => ({
      id: `l_${position}_${letter}`,
      kind: 'LETTER',
      label: letter,
    })),
  );
  const correct = choices.find((choice) => choice.label === answer);

  return {
    presentation: {
      kind: 'WORD',
      letters: letters.map((char, position) => ({ char, hidden: position === index })),
    },
    choices,
    correctChoiceId: correct?.id ?? (choices[0] as ExerciseChoice).id,
    choicesLayout: 'row',
  };
}

/** SYLLABLE — compter ou reconnaitre une syllabe (§27). */
export function generateSyllable(
  template: SyllableExerciseTemplate,
  rng: Rng,
  ctx: GenerationContext,
): GeneratedCore {
  const pool = resolvePool(template.creaturePool, ctx).filter(
    (creature) => creature.syllables.length > 0,
  );
  const usable = pool.length > 0 ? pool : resolvePool(template.creaturePool, ctx);
  const target = rng.pick(usable);
  const syllables = target.syllables.length > 0 ? target.syllables : [target.name];

  if (template.mode === 'countSyllables') {
    const answer = syllables.length;
    const { choices, correctChoiceId } = numberChoices(rng, answer, template.answerCount, {
      min: 1,
      max: Math.max(4, answer + 2),
    });
    return {
      presentation: { kind: 'SYLLABLES', syllables, creatureId: target.id },
      choices,
      correctChoiceId,
      choicesLayout: 'row',
    };
  }

  const first = (syllables[0] as string).toUpperCase();
  const otherSyllables = usable
    .filter((creature) => creature.id !== target.id)
    .map((creature) => (creature.syllables[0] ?? creature.name).toUpperCase())
    .filter((syllable) => syllable !== first);

  const distractors = rng.sample([...new Set(otherSyllables)], template.answerCount - 1);
  const choices = rng.shuffle(
    [first, ...distractors].map<ExerciseChoice>((syllable, position) => ({
      id: `s_${position}_${syllable}`,
      kind: 'TEXT',
      label: syllable,
    })),
  );
  const correct = choices.find((choice) => choice.label === first);

  return {
    presentation: { kind: 'CREATURE_SINGLE', creatureId: target.id },
    choices,
    correctChoiceId: correct?.id ?? (choices[0] as ExerciseChoice).id,
    choicesLayout: 'row',
  };
}
