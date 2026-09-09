import type { AttemptOutcome, ExerciseInstance, HintStep } from '../types/exercises';
import { RETRY_FIRST, RETRY_SECOND, SUCCESS_ASSISTED, SUCCESS_DEFAULT, type Encouragement } from './feedback';

export interface AttemptEvaluation {
  correct: boolean;
  /** Numero de la tentative qui vient d'etre jouee (1, 2, 3...). */
  attempt: number;
  /** Renseigne uniquement quand l'exercice est termine. */
  outcome: AttemptOutcome | null;
  /** Indice a presenter avant la tentative suivante (§14). */
  hint: HintStep | null;
  /** Message toujours bienveillant : jamais « mauvaise reponse ». */
  message: Encouragement;
  /** Reponses a retirer de l'ecran (aide renforcee). */
  removeChoiceIds: string[];
}

/**
 * CONCEPTION §14 — l'enfant finit toujours par comprendre puis reussir.
 * Il n'y a pas d'echec definitif : apres la 3e tentative, l'aide renforcee ne
 * laisse plus que deux reponses, et le resultat est compte comme « assiste ».
 */
export function evaluateAttempt(
  instance: ExerciseInstance,
  choiceId: string,
  previousAttempts: number,
): AttemptEvaluation {
  const attempt = previousAttempts + 1;
  const correct = choiceId === instance.correctChoiceId;

  if (correct) {
    return {
      correct: true,
      attempt,
      outcome: attempt === 1 ? 'FIRST_TRY' : 'ASSISTED',
      hint: null,
      message: attempt === 1 ? SUCCESS_DEFAULT : SUCCESS_ASSISTED,
      removeChoiceIds: [],
    };
  }

  const hint = instance.hints.find((step) => step.level === (attempt === 1 ? 1 : 2)) ?? null;

  return {
    correct: false,
    attempt,
    // On ne « rate » jamais definitivement : l'exercice reste ouvert.
    outcome: null,
    hint,
    message: attempt === 1 ? RETRY_FIRST : RETRY_SECOND,
    removeChoiceIds: hint?.removeChoiceIds ?? [],
  };
}

/**
 * Resultat pedagogique final d'un exercice.
 * `FAILED` n'est utilise que si l'enfant quitte l'exercice sans le reussir.
 */
export function outcomeFromAttempts(attempts: number, solved: boolean): AttemptOutcome {
  if (!solved) return 'FAILED';
  return attempts <= 1 ? 'FIRST_TRY' : 'ASSISTED';
}
