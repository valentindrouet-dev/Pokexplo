import type { ContentBundle, MapNode } from '../../types';
import { uid } from '../../utils/id';
import { createVoiceMessage } from '../../utils/voice';
import { freeSpotNear, type Point } from '../world-map/mapGeometry';

/**
 * NOUVEAU LIEU SUR LA CARTE (§10, §115).
 *
 * Un lieu se crée À CÔTÉ d'un lieu existant, dans sa région, relié à lui — et
 * il hérite de ses créatures et de ses exercices pour être jouable tout de
 * suite. L'adulte n'a plus qu'à le nommer. C'est la même fabrique pour le
 * « + » de la carte et pour les menus.
 */
export interface CreatedNode {
  bundle: ContentBundle;
  node: MapNode;
}

export function createNodeAfter(
  bundle: ContentBundle,
  parentId: string | null,
  preferred: Point | null = null,
  /**
   * Identifiant choisi par l'appelant : la création se fait dans une mise à
   * jour différée du brouillon, et l'appelant doit connaître l'identifiant
   * AVANT, pour ouvrir le tiroir du nouveau lieu.
   */
  id: string = uid('node'),
): CreatedNode {
  const parent = bundle.nodes.find((node) => node.id === parentId) ?? null;
  const voiceId = `voice.node.${id}`;
  // À côté de son voisin, sur une place libre : jamais posé sur un autre lieu.
  const origin: Point = parent ?? { x: 50, y: 50 };
  const at = freeSpotNear(origin, bundle.nodes, null, preferred ?? { x: origin.x + 10, y: origin.y });

  const node: MapNode = {
    id,
    biomeId: parent?.biomeId ?? bundle.biomes[0]?.id ?? '',
    label: 'Nouveau lieu',
    kind: 'ENCOUNTER',
    x: at.x,
    y: at.y,
    connections: [],
    encounters: parent?.encounters ? parent.encounters.map((entry) => ({ ...entry })) : [],
    exerciseTemplateIds: [...(parent?.exerciseTemplateIds ?? [])],
    arrivalVoiceId: voiceId,
  };

  return {
    node,
    bundle: {
      ...bundle,
      nodes: [
        ...bundle.nodes.map((entry) =>
          entry.id === parentId ? { ...entry, connections: [...entry.connections, id] } : entry,
        ),
        node,
      ],
      voiceMessages: [
        ...bundle.voiceMessages,
        createVoiceMessage(voiceId, 'Nous voilà arrivés !', 'adventure'),
      ],
    },
  };
}

/** Pourquoi un lieu ne peut pas être retiré, ou `null` s'il le peut. */
export function removalBlocker(bundle: ContentBundle, nodeId: string): string | null {
  const node = bundle.nodes.find((entry) => entry.id === nodeId);
  if (!node) return null;
  if (node.kind === 'CENTER') return 'Le Centre est le point de départ : il ne se retire pas.';
  if (bundle.gyms.some((gym) => gym.nodeId === nodeId)) return 'Une Arène est posée sur ce lieu.';
  if (bundle.specialEncounters.some((special) => special.nodeId === nodeId)) {
    return 'Une rencontre spéciale est posée sur ce lieu.';
  }
  return null;
}

/**
 * Retire un lieu et tous les chemins qui y menaient. Sa voix reste dans le
 * brouillon : on ne supprime jamais un enregistrement dans le dos de l'adulte.
 */
export function removeNode(bundle: ContentBundle, nodeId: string): ContentBundle {
  return {
    ...bundle,
    nodes: bundle.nodes
      .filter((node) => node.id !== nodeId)
      .map((node) => ({
        ...node,
        connections: node.connections.filter((id) => id !== nodeId),
        ...(node.requires?.nodes
          ? { requires: { ...node.requires, nodes: node.requires.nodes.filter((id) => id !== nodeId) } }
          : {}),
      })),
    quests: bundle.quests.map((quest) =>
      quest.unlocksNodes ? { ...quest, unlocksNodes: quest.unlocksNodes.filter((id) => id !== nodeId) } : quest,
    ),
  };
}
