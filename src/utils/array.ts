/** Ajoute une valeur si elle est absente (immuable). */
export function withUnique<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? [...list] : [...list, value];
}

/** Retire une valeur (immuable). */
export function without<T>(list: readonly T[], value: T): T[] {
  return list.filter((item) => item !== value);
}

/** Indexe une liste par identifiant. */
export function byId<T extends { id: string }>(items: readonly T[]): Record<string, T> {
  const result: Record<string, T> = {};
  for (const item of items) result[item.id] = item;
  return result;
}

/** Garde les `max` derniers elements. */
export function tail<T>(list: readonly T[], max: number): T[] {
  return list.length <= max ? [...list] : list.slice(list.length - max);
}

/** Somme d'une liste de nombres. */
export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Borne une valeur. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
