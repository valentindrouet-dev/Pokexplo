import type {
  ContentBundle,
  MapNode,
  NodeId,
  NodeState,
  SaveFile,
  UnlockCondition,
} from '../types';

/** Le joueur possede-t-il au moins une creature d'un de ces types ? */
export function ownedTypeCount(save: SaveFile, content: ContentBundle, types: string[]): number {
  const captured = Object.values(save.pokedex).filter((entry) => entry.state === 'CAPTURED');
  const owned = new Set(captured.map((entry) => entry.creatureId));
  return types.filter((type) =>
    content.creatures.some(
      (creature) => owned.has(creature.id) && (creature.type1 === type || creature.type2 === type),
    ),
  ).length;
}

/** CONCEPTION §11-12 — evaluation d'une condition de deblocage. */
export function isConditionMet(
  condition: UnlockCondition | undefined,
  save: SaveFile,
  content: ContentBundle,
): boolean {
  if (!condition) return true;

  if (condition.nodes?.some((nodeId) => !save.state.completedNodes.includes(nodeId))) return false;
  if (condition.badges?.some((badgeId) => !save.state.badges.includes(badgeId))) return false;
  if (condition.quests?.some((questId) => save.state.quests[questId]?.status !== 'COMPLETED')) {
    return false;
  }

  if (condition.capturedCount !== undefined) {
    const captured = Object.values(save.pokedex).filter((entry) => entry.state === 'CAPTURED').length;
    if (captured < condition.capturedCount) return false;
  }

  if (condition.effectiveTypes) {
    const have = ownedTypeCount(save, content, condition.effectiveTypes.types);
    if (have < condition.effectiveTypes.count) return false;
  }

  return true;
}

/**
 * Un nœud est atteignable s'il est relie a un nœud deja termine (ou au nœud
 * courant) : la carte reste lisible, l'enfant avance de proche en proche.
 */
export function isReachable(node: MapNode, save: SaveFile, allNodes: MapNode[]): boolean {
  if (node.id === save.state.currentNode) return true;
  if (save.state.completedNodes.includes(node.id)) return true;

  const anchors = new Set<NodeId>([save.state.currentNode, ...save.state.completedNodes]);
  if (node.connections.some((neighbour) => anchors.has(neighbour))) return true;
  return allNodes.some((other) => anchors.has(other.id) && other.connections.includes(node.id));
}

/** CONCEPTION §11 — les cinq etats d'un nœud. */
export function nodeState(node: MapNode, save: SaveFile, content: ContentBundle): NodeState {
  if (node.id === save.state.currentNode) return 'CURRENT';

  const unlocked = isConditionMet(node.requires, save, content) && isReachable(node, save, content.nodes);
  if (!unlocked) return 'LOCKED';

  if (node.specialEncounterId) {
    const special = content.specialEncounters.find((item) => item.id === node.specialEncounterId);
    const captured = special ? save.pokedex[special.creatureId]?.state === 'CAPTURED' : true;
    if (!captured) return 'SPECIAL_EVENT';
  }

  if (save.state.completedNodes.includes(node.id)) return 'COMPLETED';
  return 'AVAILABLE';
}

/** Liste des nœuds actuellement accessibles (memorisee dans la sauvegarde §73). */
export function computeUnlockedNodes(save: SaveFile, content: ContentBundle): NodeId[] {
  return content.nodes
    .filter((node) => nodeState(node, save, content) !== 'LOCKED')
    .map((node) => node.id);
}

export function canTravelTo(nodeId: NodeId, save: SaveFile, content: ContentBundle): boolean {
  const node = content.nodes.find((item) => item.id === nodeId);
  if (!node) return false;
  return nodeState(node, save, content) !== 'LOCKED';
}

/**
 * Chemin le plus court entre deux nœuds, en ne passant que par des nœuds
 * ouverts : c'est lui qui anime le deplacement du personnage (§10).
 */
export function pathBetween(
  from: NodeId,
  to: NodeId,
  save: SaveFile,
  content: ContentBundle,
): NodeId[] {
  if (from === to) return [from];
  const open = new Set(computeUnlockedNodes(save, content));
  open.add(from);
  open.add(to);

  const nodesById = new Map(content.nodes.map((node) => [node.id, node]));
  const queue: NodeId[] = [from];
  const cameFrom = new Map<NodeId, NodeId>();
  const seen = new Set<NodeId>([from]);

  while (queue.length > 0) {
    const current = queue.shift() as NodeId;
    if (current === to) break;
    const node = nodesById.get(current);
    if (!node) continue;

    const neighbours = new Set<NodeId>(node.connections);
    for (const other of content.nodes) {
      if (other.connections.includes(current)) neighbours.add(other.id);
    }

    for (const neighbour of neighbours) {
      if (seen.has(neighbour) || !open.has(neighbour)) continue;
      seen.add(neighbour);
      cameFrom.set(neighbour, current);
      queue.push(neighbour);
    }
  }

  if (!cameFrom.has(to) && from !== to) return [from, to];

  const path: NodeId[] = [to];
  let cursor = to;
  while (cursor !== from) {
    const previous = cameFrom.get(cursor);
    if (!previous) break;
    path.unshift(previous);
    cursor = previous;
  }
  return path;
}
