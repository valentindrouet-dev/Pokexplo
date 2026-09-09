import { describe, expect, it } from 'vitest';
import { defaultContentBundle } from '../../src/content/defaultContent';
import {
  createSkillStats,
  evaluateAttempt,
  generateExercise,
  MAX_DIFFICULTY,
  nextDifficulty,
  selectTemplate,
  updateSkillStats,
} from '../../src/exercise-engine';
import { createRng } from '../../src/utils/rng';
import type { LearningState } from '../../src/types';

const bundle = defaultContentBundle();
const ctx = { creatures: bundle.creatures, capturedIds: [] as string[] };
const template = bundle.exerciseTemplates.find((item) => item.id === 'count-medium');
if (!template) throw new Error('matrice count-medium absente');
const instance = generateExercise(template, 4242, ctx);
const wrongId = instance.choices.find((choice) => choice.id !== instance.correctChoiceId)?.id ?? '';

describe('Gestion de l’erreur (CONCEPTION §14)', () => {
  it('compte une réussite du premier coup', () => {
    const result = evaluateAttempt(instance, instance.correctChoiceId, 0);
    expect(result.correct).toBe(true);
    expect(result.outcome).toBe('FIRST_TRY');
    expect(result.hint).toBeNull();
  });

  it('n’annonce jamais « mauvaise réponse » mais encourage', () => {
    const result = evaluateAttempt(instance, wrongId, 0);
    expect(result.correct).toBe(false);
    expect(result.message.text).toBe('Presque ! Regarde bien.');
    expect(result.message.text.toLowerCase()).not.toContain('faux');
    expect(result.message.text.toLowerCase()).not.toContain('mauvaise');
    // La phrase d'encouragement est elle aussi une voix enregistrable.
    expect(result.message.voiceId).toBe('voice.feedback.almost');
  });

  it('ne déclare jamais un échec définitif', () => {
    expect(evaluateAttempt(instance, wrongId, 0).outcome).toBeNull();
    expect(evaluateAttempt(instance, wrongId, 1).outcome).toBeNull();
    expect(evaluateAttempt(instance, wrongId, 5).outcome).toBeNull();
  });

  it('donne un indice avant la 2e tentative puis une aide renforcée avant la 3e', () => {
    // Premier essai raté : on montre l'indice de la matrice, sans rien retirer.
    const afterFirst = evaluateAttempt(instance, wrongId, 0);
    expect(afterFirst.hint?.level).toBe(1);
    expect(afterFirst.hint?.type).toBe(instance.hints[0]?.type);
    expect(afterFirst.removeChoiceIds).toHaveLength(0);

    // Deuxième essai raté : aide renforcée, on retire de mauvaises réponses.
    const afterSecond = evaluateAttempt(instance, wrongId, 1);
    expect(afterSecond.hint?.level).toBe(2);
    expect(afterSecond.removeChoiceIds.length).toBeGreaterThan(0);
    expect(afterSecond.removeChoiceIds).not.toContain(instance.correctChoiceId);
    expect(instance.choices.length - afterSecond.removeChoiceIds.length).toBeGreaterThanOrEqual(2);
  });

  it('compte une réussite après aide comme « assistée »', () => {
    const result = evaluateAttempt(instance, instance.correctChoiceId, 2);
    expect(result.outcome).toBe('ASSISTED');
  });
});

describe('Difficulté adaptative (CONCEPTION §74-75)', () => {
  it('fait progresser la maîtrise après des réussites', () => {
    let stats = createSkillStats('math.counting');
    const before = stats.mastery;
    stats = updateSkillStats(stats, 'FIRST_TRY', 1);
    expect(stats.mastery).toBeGreaterThan(before);
    expect(stats.firstTrySuccesses).toBe(1);
    expect(stats.attemptCount).toBe(1);
  });

  it('fait baisser la maîtrise après un échec', () => {
    let stats = updateSkillStats(createSkillStats('math.counting'), 'FIRST_TRY', 1);
    const before = stats.mastery;
    stats = updateSkillStats(stats, 'FAILED', 2);
    expect(stats.mastery).toBeLessThan(before);
    expect(stats.failures).toBe(1);
  });

  it('monte d’un cran après trois réussites du premier coup', () => {
    let stats = createSkillStats('math.counting');
    stats = { ...stats, mastery: 0.8 };
    for (let index = 0; index < 3; index += 1) {
      stats = updateSkillStats(stats, 'FIRST_TRY', index);
    }
    expect(stats.currentDifficulty).toBeGreaterThan(1);
    expect(stats.currentDifficulty).toBeLessThanOrEqual(MAX_DIFFICULTY);
  });

  it('redescend quand l’enfant peine', () => {
    expect(nextDifficulty(3, 0.3, ['ASSISTED', 'FAILED', 'ASSISTED'])).toBe(2);
    expect(nextDifficulty(1, 0.1, ['FAILED', 'FAILED', 'FAILED'])).toBe(1);
  });

  it('ne garde qu’une fenêtre glissante de résultats', () => {
    let stats = createSkillStats('math.counting');
    for (let index = 0; index < 30; index += 1) {
      stats = updateSkillStats(stats, 'FIRST_TRY', index);
    }
    expect(stats.recentResults.length).toBeLessThanOrEqual(12);
  });

  it('respecte le plafond de difficulté du pack pédagogique (§76)', () => {
    const learning: LearningState = { skills: {}, activePackId: 'pack-cp-1' };
    const pack = bundle.curriculumPacks.find((item) => item.id === 'pack-cp-1');
    const chosen = selectTemplate({
      templates: bundle.exerciseTemplates,
      learning,
      pack: pack ?? null,
      rng: createRng(3),
    });
    expect(chosen).not.toBeNull();
    expect(pack?.skillIds).toContain(chosen?.skillId);
    expect(chosen!.difficulty).toBeLessThanOrEqual(pack!.maxDifficulty[chosen!.skillId] ?? 5);
  });

  it('propose toujours un exercice même sans pack', () => {
    const chosen = selectTemplate({
      templates: bundle.exerciseTemplates,
      learning: { skills: {}, activePackId: null },
      pack: null,
      rng: createRng(9),
    });
    expect(chosen).not.toBeNull();
  });
});
