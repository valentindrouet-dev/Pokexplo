import type {
  Direction,
  ExerciseChoice,
  GridMoveExerciseTemplate,
  LeftRightExerciseTemplate,
} from '../../types/exercises';
import type { Rng } from '../../utils/rng';
import { clamp } from '../../utils/array';
import type { GenerationContext } from '../context';
import { pickCreatures, resolvePool } from '../context';
import type { GeneratedCore } from '../core';

/**
 * LEFT_RIGHT — gauche / droite / dessus / dessous (§29).
 *
 * Les reponses SONT la scene : elles sont disposees en ligne ou en colonne et
 * l'enfant touche directement la bonne creature. Aucun detour cognitif.
 */
export function generateLeftRight(
  template: LeftRightExerciseTemplate,
  rng: Rng,
  ctx: GenerationContext,
): GeneratedCore {
  const pool = resolvePool(template.creaturePool, ctx);
  const count = clamp(template.answerCount, 2, 3);
  const creatures = pickCreatures(rng, pool, count);

  const choices = creatures.map<ExerciseChoice>((creature, index) => ({
    id: `p${index}`,
    kind: 'CREATURE',
    label: '',
    creatureId: creature.id,
  }));

  const targetIndex = pickTargetIndex(template.target, choices.length);

  return {
    presentation: { kind: 'NONE' },
    choices,
    correctChoiceId: (choices[targetIndex] as ExerciseChoice).id,
    choicesLayout: template.axis === 'leftRight' ? 'row' : 'column',
  };
}

function pickTargetIndex(target: Direction, length: number): number {
  switch (target) {
    case 'LEFT':
    case 'UP':
      return 0;
    case 'RIGHT':
    case 'DOWN':
    default:
      return length - 1;
  }
}

const DELTA: Record<Direction, { dx: number; dy: number }> = {
  LEFT: { dx: -1, dy: 0 },
  RIGHT: { dx: 1, dy: 0 },
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
};

/** GRID_MOVE — deplacements et chemins sur une grille (§29). */
export function generateGridMove(
  template: GridMoveExerciseTemplate,
  rng: Rng,
  ctx: GenerationContext,
): GeneratedCore {
  const pool = resolvePool(template.creaturePool, ctx);
  const creature = rng.pick(pool);
  const size = clamp(template.gridSize, 3, 5);
  const steps = clamp(template.steps, 1, size - 1);

  const start = { x: rng.int(0, size - 1), y: rng.int(0, size - 1) };
  const path: Direction[] = [];
  const cursor = { ...start };

  for (let index = 0; index < steps; index += 1) {
    const options = (Object.keys(DELTA) as Direction[]).filter((direction) => {
      const delta = DELTA[direction];
      const nx = cursor.x + delta.dx;
      const ny = cursor.y + delta.dy;
      return nx >= 0 && nx < size && ny >= 0 && ny < size;
    });
    if (options.length === 0) break;
    const direction = rng.pick(options);
    path.push(direction);
    cursor.x += DELTA[direction].dx;
    cursor.y += DELTA[direction].dy;
  }

  const answerKey = `${cursor.x}-${cursor.y}`;
  const cells = new Set<string>([answerKey]);
  let guard = 0;
  while (cells.size < template.answerCount && guard < 100) {
    guard += 1;
    cells.add(`${rng.int(0, size - 1)}-${rng.int(0, size - 1)}`);
  }

  const choices = rng.shuffle(
    [...cells].map<ExerciseChoice>((key) => {
      const [x, y] = key.split('-').map(Number);
      return {
        id: `g_${key}`,
        kind: 'CELL',
        label: '',
        creatureId: creature.id,
        cell: { x: x as number, y: y as number },
      };
    }),
  );

  return {
    presentation: { kind: 'GRID', size, start, path, creatureId: creature.id },
    choices,
    correctChoiceId: `g_${answerKey}`,
    choicesLayout: 'row',
  };
}
