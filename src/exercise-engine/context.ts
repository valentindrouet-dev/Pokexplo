import type { Creature, CreatureId } from '../types';
import type { CreaturePool } from '../types/exercises';
import type { Rng } from '../utils/rng';

/**
 * Tout ce dont un generateur a besoin pour fabriquer une instance.
 * Il ne connait ni React, ni le stockage, ni l'audio : le moteur d'exercices
 * est une fonction pure de (matrice, seed, contexte).
 */
export interface GenerationContext {
  /** Catalogue complet de la release courante. */
  creatures: Creature[];
  /** Creatures deja capturees (pool `captured`). */
  capturedIds: CreatureId[];
  /** Biome courant (pool `biome`). */
  biomeId?: string;
}

/**
 * Resout la source de creatures d'une matrice (§32).
 * On ne renvoie jamais une liste vide : une matrice mal configuree ne doit pas
 * casser une rencontre en cours (CLAUDE.md : l'application ne plante pas).
 */
export function resolvePool(pool: CreaturePool, ctx: GenerationContext): Creature[] {
  const all = ctx.creatures;
  if (all.length === 0) {
    throw new Error('GenerationContext.creatures est vide : contenu non charge');
  }

  const filtered = ((): Creature[] => {
    switch (pool.kind) {
      case 'random':
        return all;
      case 'biome': {
        const biomeId = pool.biomeId || ctx.biomeId;
        if (!biomeId) return all;
        return all.filter((creature) => creature.biomes.includes(biomeId));
      }
      case 'explicit':
        return all.filter((creature) => pool.creatureIds.includes(creature.id));
      case 'type':
        return all.filter((creature) => creature.type1 === pool.type || creature.type2 === pool.type);
      case 'captured':
        return all.filter((creature) => ctx.capturedIds.includes(creature.id));
      default:
        return all;
    }
  })();

  return filtered.length > 0 ? filtered : all;
}

/** Choisit `count` creatures distinctes, en completant si le vivier est trop petit. */
export function pickCreatures(rng: Rng, pool: Creature[], count: number): Creature[] {
  if (pool.length === 0) throw new Error('pickCreatures : vivier vide');
  const chosen = rng.sample(pool, count);
  while (chosen.length < count) {
    chosen.push(rng.pick(pool));
  }
  return chosen;
}
