import { describe, expect, it } from 'vitest';
import { defaultContentBundle } from '../../src/content/defaultContent';
import { EXERCISE_TYPES, generateExercise } from '../../src/exercise-engine';
import type { ExerciseTemplate } from '../../src/types';

const bundle = defaultContentBundle();
const ctx = { creatures: bundle.creatures, capturedIds: [] as string[] };

function templateOfType(type: string): ExerciseTemplate {
  const found = bundle.exerciseTemplates.find((template) => template.type === type);
  if (!found) throw new Error(`Aucune matrice pour le type ${type}`);
  return found;
}

describe('Moteur d’exercices (CONCEPTION §31-33)', () => {
  it('couvre les douze moteurs génériques', () => {
    expect(EXERCISE_TYPES).toHaveLength(12);
    for (const type of EXERCISE_TYPES) {
      expect(bundle.exerciseTemplates.some((template) => template.type === type)).toBe(true);
    }
  });

  it('régénère exactement le même exercice à partir du même seed', () => {
    for (const template of bundle.exerciseTemplates) {
      const first = generateExercise(template, 814293, ctx);
      const second = generateExercise(template, 814293, ctx);
      expect(second).toEqual(first);
    }
  });

  it('produit des instances différentes avec des seeds différents', () => {
    const template = templateOfType('COUNT');
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed += 1) {
      seen.add(JSON.stringify(generateExercise(template, seed, ctx).presentation));
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it('produit toujours une bonne réponse présente parmi les choix', () => {
    for (const template of bundle.exerciseTemplates) {
      for (let seed = 1; seed <= 25; seed += 1) {
        const instance = generateExercise(template, seed, ctx);
        expect(instance.choices.length).toBeGreaterThanOrEqual(2);
        expect(instance.choices.some((choice) => choice.id === instance.correctChoiceId)).toBe(true);
        expect(new Set(instance.choices.map((choice) => choice.id)).size).toBe(
          instance.choices.length,
        );
      }
    }
  });

  it('respecte le nombre de réponses demandé', () => {
    for (const template of bundle.exerciseTemplates) {
      const instance = generateExercise(template, 42, ctx);
      // LEFT_RIGHT est borné à 3 réponses : la position porte le sens.
      const expected = template.type === 'LEFT_RIGHT' ? Math.min(template.answerCount, 3) : template.answerCount;
      expect(instance.choices.length).toBe(expected);
    }
  });

  it('compte exactement le nombre de créatures annoncé (COUNT)', () => {
    const template = templateOfType('COUNT');
    for (let seed = 1; seed <= 30; seed += 1) {
      const instance = generateExercise(template, seed, ctx);
      if (instance.presentation.kind !== 'CREATURE_GROUP') throw new Error('présentation inattendue');
      const answer = instance.choices.find((choice) => choice.id === instance.correctChoiceId);
      expect(Number(answer?.label)).toBe(instance.presentation.items.length);
    }
  });

  it('calcule juste les additions et les soustractions', () => {
    for (const type of ['ADDITION', 'SUBTRACTION'] as const) {
      const template = templateOfType(type);
      for (let seed = 1; seed <= 30; seed += 1) {
        const instance = generateExercise(template, seed, ctx);
        if (instance.presentation.kind !== 'OPERATION') throw new Error('présentation inattendue');
        const { left, right, operator } = instance.presentation;
        const expected = operator === '+' ? left + right : left - right;
        const answer = instance.choices.find((choice) => choice.id === instance.correctChoiceId);
        expect(Number(answer?.label)).toBe(expected);
        expect(expected).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('cache exactement une lettre (MISSING_LETTER)', () => {
    const template = templateOfType('MISSING_LETTER');
    for (let seed = 1; seed <= 20; seed += 1) {
      const instance = generateExercise(template, seed, ctx);
      if (instance.presentation.kind !== 'WORD') throw new Error('présentation inattendue');
      const hidden = instance.presentation.letters.filter((letter) => letter.hidden);
      expect(hidden).toHaveLength(1);
      const answer = instance.choices.find((choice) => choice.id === instance.correctChoiceId);
      expect(answer?.label).toBe(hidden[0]?.char);
    }
  });

  it('place la bonne réponse du bon côté (LEFT_RIGHT)', () => {
    const left = bundle.exerciseTemplates.find((template) => template.id === 'left-easy');
    const right = bundle.exerciseTemplates.find((template) => template.id === 'right-easy');
    if (!left || !right) throw new Error('matrices de repérage absentes');

    for (let seed = 1; seed <= 20; seed += 1) {
      const leftInstance = generateExercise(left, seed, ctx);
      expect(leftInstance.correctChoiceId).toBe(leftInstance.choices[0]?.id);
      expect(leftInstance.choicesLayout).toBe('row');

      const rightInstance = generateExercise(right, seed, ctx);
      expect(rightInstance.correctChoiceId).toBe(
        rightInstance.choices[rightInstance.choices.length - 1]?.id,
      );
    }
  });

  it('empile les réponses en colonne pour dessus / dessous', () => {
    const above = bundle.exerciseTemplates.find((template) => template.id === 'above-easy');
    if (!above) throw new Error('matrice « au-dessus » absente');
    expect(generateExercise(above, 3, ctx).choicesLayout).toBe('column');
  });

  it('remplace le marqueur {cible} dans les consignes anglaises', () => {
    const template = templateOfType('ENGLISH_WORD');
    const instance = generateExercise(template, 11, ctx);
    expect(instance.promptText).not.toContain('{cible}');
    expect(instance.locale).toBe('en-GB');
  });

  it('fournit toujours deux paliers d’indice avec leur voix (§14, §35)', () => {
    for (const template of bundle.exerciseTemplates) {
      const instance = generateExercise(template, 5, ctx);
      expect(instance.hints).toHaveLength(2);
      expect(instance.hints[0]?.level).toBe(1);
      expect(instance.hints[1]?.level).toBe(2);
      for (const hint of instance.hints) {
        expect(hint.text.length).toBeGreaterThan(0);
        expect(hint.voice?.voiceId).toBeTruthy();
      }
    }
  });

  it('laisse toujours au moins deux réponses après l’aide renforcée', () => {
    for (const template of bundle.exerciseTemplates) {
      const instance = generateExercise(template, 17, ctx);
      const removed = instance.hints[1]?.removeChoiceIds ?? [];
      expect(instance.choices.length - removed.length).toBeGreaterThanOrEqual(2);
      expect(removed).not.toContain(instance.correctChoiceId);
    }
  });
});
