import type {
  ExerciseChoice,
  ExercisePresentation,
  ScatteredCreature,
} from '../types/exercises';
import type { Rng } from '../utils/rng';

/** Ce qu'un generateur produit : le moteur ajoute ensuite prompt, audio et indices. */
export interface GeneratedCore {
  presentation: ExercisePresentation;
  choices: ExerciseChoice[];
  correctChoiceId: string;
  choicesLayout: 'row' | 'column' | 'grid';
  /**
   * Complement optionnel injecte dans la consigne quand la matrice contient le
   * marqueur `{cible}` (ex. « Touche le {cible} »). Reste vide la plupart du
   * temps : les consignes sont volontairement generiques (§57).
   */
  promptTarget?: string;
}

/** Fabrique des reponses numeriques plausibles autour de la bonne valeur. */
export function numberChoices(
  rng: Rng,
  answer: number,
  count: number,
  bounds: { min: number; max: number },
): { choices: ExerciseChoice[]; correctChoiceId: string } {
  const values = new Set<number>([answer]);
  let spread = 1;
  let guard = 0;
  while (values.size < count && guard < 200) {
    guard += 1;
    const delta = rng.int(1, spread);
    const candidate = rng.chance(0.5) ? answer - delta : answer + delta;
    if (candidate >= bounds.min && candidate <= bounds.max) values.add(candidate);
    if (guard % 8 === 0) spread += 1;
  }
  // Vivier trop etroit : on elargit pour toujours proposer `count` reponses.
  let extra = bounds.max + 1;
  while (values.size < count) {
    values.add(extra);
    extra += 1;
  }

  const ordered = rng.shuffle([...values]).slice(0, count);
  if (!ordered.includes(answer)) ordered[rng.int(0, ordered.length - 1)] = answer;

  const choices = ordered.map<ExerciseChoice>((value) => ({
    id: `n${value}`,
    kind: 'NUMBER',
    label: String(value),
  }));
  return { choices, correctChoiceId: `n${answer}` };
}

/**
 * Dispose des creatures dans la zone de jeu sans qu'elles se chevauchent
 * franchement : compter doit rester facile pour un enfant de CP.
 */
export function scatter(rng: Rng, count: number, creatureIdAt: (index: number) => string): ScatteredCreature[] {
  const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(count))));
  const rows = Math.ceil(count / columns);
  const items: ScatteredCreature[] = [];
  const order = rng.shuffle(Array.from({ length: columns * rows }, (_, index) => index)).slice(0, count);

  order.forEach((cell, index) => {
    const column = cell % columns;
    const row = Math.floor(cell / columns);
    items.push({
      key: `s${index}`,
      creatureId: creatureIdAt(index),
      x: ((column + 0.5) / columns) * 100 + rng.int(-4, 4),
      y: ((row + 0.5) / rows) * 100 + rng.int(-5, 5),
      scale: 0.92 + rng.int(0, 16) / 100,
    });
  });

  // Ordre de lecture stable : indispensable a l'indice « compte-les un par un ».
  return items.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
}
