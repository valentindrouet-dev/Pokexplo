import type { ContentBundle, CreatureType, Gym, SaveFile } from '../types';
import { TYPE_LABELS } from '../types/content';

export interface GymReadinessRow {
  type: CreatureType;
  label: string;
  ok: boolean;
}

export interface GymReadiness {
  ready: boolean;
  have: number;
  need: number;
  rows: GymReadinessRow[];
}

/**
 * CONCEPTION §23 — « PRÊT POUR PIERRE ? »
 *
 *   💧 Eau      ✅
 *   🌿 Plante   ✅
 *   ❄️ Glace    ❌
 *   2 / 3
 *
 * On liste chaque type efficace et on coche ceux que l'enfant possede :
 * l'objectif est comprehensible d'un coup d'œil, sans savoir lire.
 */
export function gymReadiness(gym: Gym, save: SaveFile, content: ContentBundle): GymReadiness {
  const requirement = gym.requires.effectiveTypes;
  if (!requirement) {
    return { ready: true, have: 0, need: 0, rows: [] };
  }

  const owned = new Set(
    Object.values(save.pokedex)
      .filter((entry) => entry.state === 'CAPTURED')
      .map((entry) => entry.creatureId),
  );

  const rows = requirement.types.map<GymReadinessRow>((type) => ({
    type,
    label: TYPE_LABELS[type],
    ok: content.creatures.some(
      (creature) => owned.has(creature.id) && (creature.type1 === type || creature.type2 === type),
    ),
  }));

  const have = rows.filter((row) => row.ok).length;
  return { ready: have >= requirement.count, have, need: requirement.count, rows };
}

/** Adversaire courant d'un combat d'Arene (§24). */
export function currentOpponent(gym: Gym, opponentIndex: number) {
  return gym.opponents[Math.min(opponentIndex, gym.opponents.length - 1)] ?? null;
}

export function isGymCleared(gym: Gym, opponentIndex: number): boolean {
  return opponentIndex >= gym.opponents.length;
}
