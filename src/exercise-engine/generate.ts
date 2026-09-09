import type { ExerciseInstance, ExerciseTemplate } from '../types/exercises';
import { createRng, seedFromString } from '../utils/rng';
import type { GenerationContext } from './context';
import { generateCore } from './registry';
import { buildHints } from './hints';

/**
 * CONCEPTION §33 — un exercice est une fonction pure de (matrice, seed).
 *
 * Le meme couple redonne EXACTEMENT le meme exercice : c'est ce qui permet de
 * reprendre une rencontre apres une fermeture accidentelle de l'application.
 */
export function generateExercise(
  template: ExerciseTemplate,
  seed: number,
  ctx: GenerationContext,
): ExerciseInstance {
  // Le seed est melange a l'identifiant de la matrice : deux matrices tirees
  // avec le meme seed ne produisent pas la meme configuration.
  const rng = createRng((seed ^ seedFromString(template.id)) >>> 0);
  const core = generateCore(template, rng, ctx);
  const hints = buildHints(template, core.choices, core.correctChoiceId, rng);

  const promptText = core.promptTarget
    ? template.prompt.replace('{cible}', core.promptTarget)
    : template.prompt.replace('{cible}', '').replace(/\s{2,}/gu, ' ').trim();

  return {
    id: `${template.id}#${seed}`,
    templateId: template.id,
    type: template.type,
    category: template.category,
    skillId: template.skillId,
    difficulty: template.difficulty,
    seed,
    promptText,
    ...(template.audio.question ? { promptVoice: template.audio.question } : {}),
    successText: template.successText,
    ...(template.audio.success ? { successVoice: template.audio.success } : {}),
    presentation: core.presentation,
    choices: core.choices,
    choicesLayout: core.choicesLayout,
    correctChoiceId: core.correctChoiceId,
    hints,
    locale: template.locale ?? 'fr-FR',
  };
}

export type { GenerationContext };
