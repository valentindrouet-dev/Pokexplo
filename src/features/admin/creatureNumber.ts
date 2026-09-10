import type { ContentBundle, Creature } from '../../types';

/**
 * NUMÉRO D'UNE CRÉATURE (§198).
 *
 * Un contenu écrit avant l'arrivée des numéros n'en a pas : plutôt que de
 * réécrire ce contenu — et donc de risquer d'en perdre — on retombe sur le
 * rang dans la liste. Le numéro affiché est toujours défini.
 */
export function creatureNumber(bundle: ContentBundle, creature: Creature): number {
  if (typeof creature.number === 'number') return creature.number;
  return bundle.creatures.findIndex((entry) => entry.id === creature.id) + 1;
}

/** Le prochain numéro libre : pour une créature créée ou dupliquée. */
export function nextCreatureNumber(bundle: ContentBundle): number {
  const used = bundle.creatures.map((creature) => creature.number ?? 0);
  return Math.max(0, ...used, bundle.creatures.length) + 1;
}

/** Affichage : `#025`, comme sur le dos d'une carte. */
export function formatCreatureNumber(value: number): string {
  return `#${String(value).padStart(3, '0')}`;
}
