/**
 * Generateur pseudo-aleatoire deterministe (mulberry32).
 *
 * CONCEPTION §33 : un exercice est entierement reproductible a partir de son
 * seed. On ne peut donc jamais utiliser `Math.random()` dans le moteur
 * d'exercices ni dans le tirage des rencontres.
 */
export interface Rng {
  /** Flottant dans [0, 1). */
  next(): number;
  /** Entier dans [min, max] inclus. */
  int(min: number, max: number): number;
  /** Element au hasard (leve si la liste est vide). */
  pick<T>(items: readonly T[]): T;
  /** Copie melangee (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** `count` elements distincts au hasard (moins si la liste est trop courte). */
  sample<T>(items: readonly T[], count: number): T[];
  /** Vrai avec la probabilite `p`. */
  chance(p: number): boolean;
}

export function createRng(seed: number): Rng {
  let state = (seed >>> 0) || 0x9e3779b9;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(next() * (max - min + 1));
  };

  const pick = <T,>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error('createRng().pick : liste vide');
    }
    return items[int(0, items.length - 1)] as T;
  };

  const shuffle = <T,>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      const a = copy[i] as T;
      copy[i] = copy[j] as T;
      copy[j] = a;
    }
    return copy;
  };

  const sample = <T,>(items: readonly T[], count: number): T[] =>
    shuffle(items).slice(0, Math.max(0, Math.min(count, items.length)));

  const chance = (p: number): boolean => next() < p;

  return { next, int, pick, shuffle, sample, chance };
}

/** Seed reproductible derive d'une chaine (FNV-1a 32 bits). */
export function seedFromString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Nouveau seed non deterministe, pour demarrer une rencontre. */
export function randomSeed(): number {
  const buffer = new Uint32Array(1);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] as number;
  }
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/** Tirage pondere deterministe. */
export function weightedPick<T>(rng: Rng, entries: ReadonlyArray<{ item: T; weight: number }>): T {
  const usable = entries.filter((entry) => entry.weight > 0);
  if (usable.length === 0) {
    throw new Error('weightedPick : aucune entree de poids positif');
  }
  const total = usable.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng.next() * total;
  for (const entry of usable) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return (usable[usable.length - 1] as { item: T; weight: number }).item;
}
