import type {
  ContentBundle,
  Creature,
  CreatureId,
  ExerciseTemplate,
  LearningState,
  MapNode,
  SaveFile,
} from '../types';
import { RARITY_WEIGHTS } from '../types/content';
import { selectTemplate } from '../exercise-engine';
import type { Rng } from '../utils/rng';
import { weightedPick } from '../utils/rng';

/**
 * CONCEPTION §13, §16 — tirage d'une rencontre.
 * Le poids d'une entree est module par la rarete de la creature : une
 * legendaire reste exceptionnelle meme si elle figure dans la table.
 */
export function rollEncounter(
  node: MapNode,
  content: ContentBundle,
  rng: Rng,
): Creature | null {
  const table = node.encounters ?? [];
  const entries = table
    .map((entry) => ({
      creature: content.creatures.find((creature) => creature.id === entry.creatureId),
      weight: entry.weight,
    }))
    .filter(
      (entry): entry is { creature: Creature; weight: number } => entry.creature !== undefined,
    )
    .map((entry) => ({
      item: entry.creature,
      weight: entry.weight * RARITY_WEIGHTS[entry.creature.rarity],
    }));

  if (entries.length === 0) return null;
  return weightedPick(rng, entries);
}

/** Matrices utilisables sur un nœud (repli sur tout le contenu si vide). */
export function templatesForNode(node: MapNode, content: ContentBundle): ExerciseTemplate[] {
  const ids = node.exerciseTemplateIds ?? [];
  const selected = content.exerciseTemplates.filter((template) => ids.includes(template.id));
  return selected.length > 0 ? selected : content.exerciseTemplates;
}

export interface EncounterDraft {
  creatureId: CreatureId;
  templateId: string;
  seed: number;
}

/**
 * Prepare une rencontre complete : creature + matrice adaptee au niveau de
 * l'enfant + seed reproductible (§33).
 */
export function prepareEncounter(
  node: MapNode,
  content: ContentBundle,
  save: SaveFile,
  learning: LearningState,
  rng: Rng,
  options: { creatureId?: CreatureId; templateIds?: string[] } = {},
): EncounterDraft | null {
  const creature = options.creatureId
    ? (content.creatures.find((item) => item.id === options.creatureId) ?? null)
    : rollEncounter(node, content, rng);
  if (!creature) return null;

  const candidates = options.templateIds
    ? content.exerciseTemplates.filter((template) => options.templateIds?.includes(template.id))
    : templatesForNode(node, content);

  const pack = content.curriculumPacks.find((item) => item.id === save.profile.packId) ?? null;
  const recentTemplateIds = save.history
    .filter((entry) => entry.kind === 'EXERCISE')
    .slice(-4)
    .map((entry) => entry.label);

  const template = selectTemplate({
    templates: candidates.length > 0 ? candidates : content.exerciseTemplates,
    learning,
    pack,
    recentTemplateIds,
    rng,
  });
  if (!template) return null;

  return {
    creatureId: creature.id,
    templateId: template.id,
    seed: rng.int(1, 0x7fffffff),
  };
}
