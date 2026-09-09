import type { EnglishWordExerciseTemplate, ExerciseChoice } from '../../types/exercises';
import type { Creature } from '../../types';
import { COLOR_EN } from '../../types/content';
import type { Rng } from '../../utils/rng';
import type { GenerationContext } from '../context';
import { pickCreatures, resolvePool } from '../context';
import { numberChoices, scatter, type GeneratedCore } from '../core';

/**
 * ENGLISH_WORD — anglais (§30).
 *
 * « Touch the blue Pokémon » / « Find three Pokémon » / « Which one is Pikachu? ».
 * La cible (couleur ou nombre) est portee par la MATRICE, pas tiree au sort :
 * une seule voix anglaise suffit par matrice.
 */
export function generateEnglishWord(
  template: EnglishWordExerciseTemplate,
  rng: Rng,
  ctx: GenerationContext,
): GeneratedCore {
  const pool = resolvePool(template.creaturePool, ctx);

  if (template.mode === 'color') {
    const matching = pool.filter((creature) => creature.colorKey === template.color);
    const target = matching.length > 0 ? rng.pick(matching) : rng.pick(pool);
    const others = rng.sample(
      pool.filter((creature) => creature.colorKey !== target.colorKey),
      Math.max(1, template.answerCount - 1),
    );
    const filler = others.length > 0 ? others : pickCreatures(rng, pool, template.answerCount - 1);

    const choices = rng.shuffle(
      [target, ...filler].map<ExerciseChoice>((creature) => ({
        id: `c_${creature.id}`,
        kind: 'CREATURE',
        label: '',
        creatureId: creature.id,
      })),
    );

    return {
      presentation: { kind: 'NONE' },
      choices,
      correctChoiceId: `c_${target.id}`,
      choicesLayout: 'row',
      promptTarget: COLOR_EN[template.color],
    };
  }

  if (template.mode === 'count') {
    const creature = rng.pick(pool);
    const answer = Math.max(1, template.count);
    const { choices, correctChoiceId } = numberChoices(rng, answer, template.answerCount, {
      min: 1,
      max: answer + 3,
    });
    return {
      presentation: { kind: 'CREATURE_GROUP', items: scatter(rng, answer, () => creature.id) },
      choices,
      correctChoiceId,
      choicesLayout: 'row',
    };
  }

  const picked = pickCreatures(rng, pool, template.answerCount);
  const target = picked[0] as Creature;
  const choices = rng.shuffle(
    picked.map<ExerciseChoice>((creature) => ({
      id: `c_${creature.id}`,
      kind: 'CREATURE',
      label: '',
      creatureId: creature.id,
    })),
  );

  return {
    presentation: { kind: 'NONE' },
    choices,
    correctChoiceId: `c_${target.id}`,
    choicesLayout: 'row',
    promptTarget: target.nameEn ?? target.name,
  };
}
