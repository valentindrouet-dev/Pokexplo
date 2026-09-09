import type { CurriculumPack, ExerciseTemplate, LearningState, SkillId, SkillStats } from '../types';
import type { AttemptOutcome } from '../types/exercises';
import { tail } from '../utils/array';
import type { Rng } from '../utils/rng';

const MASTERY_GAIN_FIRST_TRY = 0.14;
const MASTERY_GAIN_ASSISTED = 0.05;
const MASTERY_LOSS_FAILED = 0.1;
const RECENT_WINDOW = 12;

export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

export function createSkillStats(skillId: SkillId): SkillStats {
  return {
    skillId,
    mastery: 0.2,
    attemptCount: 0,
    firstTrySuccesses: 0,
    assistedSuccesses: 0,
    failures: 0,
    recentResults: [],
    lastPracticedAt: 0,
    currentDifficulty: MIN_DIFFICULTY,
  };
}

/**
 * CONCEPTION §74-75 — modele de maitrise et difficulte adaptative.
 * L'enfant ne voit JAMAIS ces valeurs : elles ne servent qu'a choisir la
 * prochaine matrice et a alimenter le tableau parent.
 */
export function updateSkillStats(stats: SkillStats, outcome: AttemptOutcome, at: number): SkillStats {
  const gain =
    outcome === 'FIRST_TRY'
      ? MASTERY_GAIN_FIRST_TRY * (1 - stats.mastery)
      : outcome === 'ASSISTED'
        ? MASTERY_GAIN_ASSISTED * (1 - stats.mastery)
        : -MASTERY_LOSS_FAILED * Math.max(0.25, stats.mastery);

  const mastery = Math.max(0, Math.min(1, stats.mastery + gain));
  const recentResults = tail([...stats.recentResults, outcome], RECENT_WINDOW);

  return {
    ...stats,
    mastery,
    attemptCount: stats.attemptCount + 1,
    firstTrySuccesses: stats.firstTrySuccesses + (outcome === 'FIRST_TRY' ? 1 : 0),
    assistedSuccesses: stats.assistedSuccesses + (outcome === 'ASSISTED' ? 1 : 0),
    failures: stats.failures + (outcome === 'FAILED' ? 1 : 0),
    recentResults,
    lastPracticedAt: at,
    currentDifficulty: nextDifficulty(stats.currentDifficulty, mastery, recentResults),
  };
}

/**
 * Monte d'un cran apres trois reussites du premier coup et une bonne maitrise ;
 * redescend des que l'enfant peine. On ne saute jamais plus d'un palier.
 */
export function nextDifficulty(
  current: number,
  mastery: number,
  recentResults: AttemptOutcome[],
): number {
  const lastThree = tail(recentResults, 3);
  const allFirstTry = lastThree.length === 3 && lastThree.every((result) => result === 'FIRST_TRY');
  const struggling = tail(recentResults, 3).filter((result) => result !== 'FIRST_TRY').length >= 2;

  if (allFirstTry && mastery >= 0.7) return Math.min(MAX_DIFFICULTY, current + 1);
  if (struggling && mastery < 0.45) return Math.max(MIN_DIFFICULTY, current - 1);
  return current;
}

export function statsFor(learning: LearningState, skillId: SkillId): SkillStats {
  return learning.skills[skillId] ?? createSkillStats(skillId);
}

export interface SelectionOptions {
  /** Matrices candidates (celles du nœud, de l'arene ou de la quete). */
  templates: ExerciseTemplate[];
  learning: LearningState;
  /** Pack pedagogique actif : il plafonne la difficulte (§76). */
  pack?: CurriculumPack | null;
  /** Matrices deja jouees recemment : on evite de les reproposer aussitot. */
  recentTemplateIds?: string[];
  rng: Rng;
}

/**
 * Choisit la prochaine matrice.
 *
 * 1. on ne garde que ce que le pack autorise ;
 * 2. on privilegie la difficulte courante de la competence ;
 * 3. on evite de repeter les dernieres matrices ;
 * 4. en dernier recours on tire au hasard : il y a TOUJOURS un exercice.
 */
export function selectTemplate(options: SelectionOptions): ExerciseTemplate | null {
  const { templates, learning, pack, rng } = options;
  if (templates.length === 0) return null;
  const recent = options.recentTemplateIds ?? [];

  const allowed = templates.filter((template) => {
    if (!pack) return true;
    if (pack.skillIds.length > 0 && !pack.skillIds.includes(template.skillId)) return false;
    const cap = pack.maxDifficulty[template.skillId];
    return cap === undefined || template.difficulty <= cap;
  });
  const pool = allowed.length > 0 ? allowed : templates;

  const scored = pool.map((template) => {
    const stats = statsFor(learning, template.skillId);
    const distance = Math.abs(template.difficulty - stats.currentDifficulty);
    const freshness = recent.includes(template.id) ? 3 : 0;
    // Une competence non travaillee depuis longtemps remonte naturellement.
    const staleness = stats.lastPracticedAt === 0 ? -1 : 0;
    return { template, score: distance + freshness + staleness };
  });

  const best = Math.min(...scored.map((entry) => entry.score));
  const finalists = scored.filter((entry) => entry.score === best).map((entry) => entry.template);
  return rng.pick(finalists);
}

/** Agregat par categorie pour le tableau parent (§77). */
export function masteryByCategory(
  learning: LearningState,
  skillCategory: Record<SkillId, string>,
): Record<string, number> {
  const totals: Record<string, { sum: number; count: number }> = {};
  for (const stats of Object.values(learning.skills)) {
    const category = skillCategory[stats.skillId];
    if (!category) continue;
    const entry = totals[category] ?? { sum: 0, count: 0 };
    entry.sum += stats.mastery;
    entry.count += 1;
    totals[category] = entry;
  }
  const result: Record<string, number> = {};
  for (const [category, entry] of Object.entries(totals)) {
    result[category] = entry.count === 0 ? 0 : entry.sum / entry.count;
  }
  return result;
}

/** Competences a retravailler (§77) : les moins maitrisees, deja pratiquees. */
export function skillsToPractice(learning: LearningState, limit = 3): SkillStats[] {
  return Object.values(learning.skills)
    .filter((stats) => stats.attemptCount >= 3 && stats.mastery < 0.7)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, limit);
}
