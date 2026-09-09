import type { ExerciseChoice, ExerciseTemplate, HintStep } from '../types/exercises';
import type { Rng } from '../utils/rng';

/**
 * CONCEPTION §14 — progression de l'aide :
 *   tentative 1 : aucune aide
 *   tentative 2 : indice (le `hintType` de la matrice)
 *   tentative 3 : aide renforcee (on retire les mauvaises reponses)
 *
 * Chaque palier porte sa propre voix (§35).
 */
export function buildHints(
  template: ExerciseTemplate,
  choices: ExerciseChoice[],
  correctChoiceId: string,
  rng: Rng,
): HintStep[] {
  const first: HintStep = {
    level: 1,
    type: template.hintType,
    text: template.hint1Text,
    ...(template.audio.hint1 ? { voice: template.audio.hint1 } : {}),
  };

  const wrong = choices.filter((choice) => choice.id !== correctChoiceId);
  // On laisse toujours au moins deux reponses a l'ecran : l'enfant doit choisir,
  // pas subir. Si l'exercice n'a que deux reponses, on renforce l'indice initial.
  const keepOne = wrong.length > 1 ? rng.pick(wrong) : null;
  const removeChoiceIds = keepOne
    ? wrong.filter((choice) => choice.id !== keepOne.id).map((choice) => choice.id)
    : [];

  const second: HintStep = {
    level: 2,
    type: removeChoiceIds.length > 0 ? 'removeWrongAnswer' : template.hintType,
    text: template.hint2Text,
    ...(template.audio.hint2 ? { voice: template.audio.hint2 } : {}),
    ...(removeChoiceIds.length > 0 ? { removeChoiceIds } : {}),
  };

  return [first, second];
}
