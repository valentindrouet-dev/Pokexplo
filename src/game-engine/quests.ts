import type {
  ContentBundle,
  Creature,
  Quest,
  QuestObjective,
  QuestProgress,
  QuestId,
  SaveFile,
} from '../types';
import { deaccent } from '../utils/text';

/** Nombre a atteindre pour terminer la quete. */
export function questTarget(objective: QuestObjective): number {
  switch (objective.kind) {
    case 'CAPTURE_TYPE':
    case 'CAPTURE_COUNT':
    case 'CAPTURE_NAME_STARTS_WITH':
    case 'CAPTURE_SYLLABLE_COUNT':
      return objective.count;
    case 'COMPLETE_NODES':
      return objective.nodeIds.length;
    case 'WIN_GYM':
      return 1;
    default:
      return 1;
  }
}

function capturedCreatures(save: SaveFile, content: ContentBundle): Creature[] {
  return content.creatures.filter((creature) => save.pokedex[creature.id]?.state === 'CAPTURED');
}

/** CONCEPTION §25 — avancement d'une mini-quete. */
export function questProgress(
  objective: QuestObjective,
  save: SaveFile,
  content: ContentBundle,
): number {
  switch (objective.kind) {
    case 'CAPTURE_COUNT':
      return capturedCreatures(save, content).length;
    case 'CAPTURE_TYPE':
      return capturedCreatures(save, content).filter(
        (creature) => creature.type1 === objective.type || creature.type2 === objective.type,
      ).length;
    case 'CAPTURE_NAME_STARTS_WITH': {
      const letter = deaccent(objective.letter).toUpperCase();
      return capturedCreatures(save, content).filter(
        (creature) => deaccent(creature.name)[0]?.toUpperCase() === letter,
      ).length;
    }
    case 'CAPTURE_SYLLABLE_COUNT':
      return capturedCreatures(save, content).filter(
        (creature) => creature.syllables.length === objective.syllables,
      ).length;
    case 'COMPLETE_NODES':
      return objective.nodeIds.filter((nodeId) => save.state.completedNodes.includes(nodeId)).length;
    case 'WIN_GYM':
      return save.state.gymsCompleted.includes(objective.gymId) ? 1 : 0;
    default:
      return 0;
  }
}

/**
 * Recalcule TOUTES les quetes actives.
 * On recalcule au lieu d'incrementer : la progression reste juste meme si un
 * evenement est rejoue ou si le contenu change entre deux releases.
 */
export function evaluateQuests(
  save: SaveFile,
  content: ContentBundle,
  at: number,
): { quests: Record<QuestId, QuestProgress>; completed: Quest[] } {
  const quests: Record<QuestId, QuestProgress> = {};
  const completed: Quest[] = [];

  for (const quest of content.quests) {
    const existing = save.state.quests[quest.id];
    if (!existing) continue;

    const target = questTarget(quest.objective);
    const progress = Math.min(target, questProgress(quest.objective, save, content));
    const wasCompleted = existing.status === 'COMPLETED';
    const isCompleted = progress >= target;

    quests[quest.id] = {
      ...existing,
      progress,
      target,
      status: isCompleted ? 'COMPLETED' : existing.status === 'OFFERED' ? 'OFFERED' : 'ACTIVE',
      ...(isCompleted && !wasCompleted ? { completedAt: at } : {}),
    };

    if (isCompleted && !wasCompleted) completed.push(quest);
  }

  return { quests, completed };
}

/** Quetes proposables : celles du chapitre courant qui ne sont pas encore ouvertes. */
export function offerableQuests(save: SaveFile, content: ContentBundle): Quest[] {
  return content.quests.filter(
    (quest) =>
      !save.state.quests[quest.id] &&
      (quest.chapterId === undefined || quest.chapterId === save.state.chapterId),
  );
}
