import { describe, expect, it } from 'vitest';
import { createRng, seedFromString, weightedPick } from '../../src/utils/rng';
import { textHash, matchesHash, normalizeForHash } from '../../src/utils/hash';

describe('RNG déterministe (CONCEPTION §33)', () => {
  it('produit exactement la même suite pour un même seed', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const left = Array.from({ length: 20 }, () => a.int(0, 1000));
    const right = Array.from({ length: 20 }, () => b.int(0, 1000));
    expect(left).toEqual(right);
  });

  it('produit des suites différentes pour des seeds différents', () => {
    const a = Array.from({ length: 10 }, (_, index) => createRng(index).int(0, 1_000_000));
    expect(new Set(a).size).toBeGreaterThan(5);
  });

  it('reste dans les bornes demandées', () => {
    const rng = createRng(7);
    for (let index = 0; index < 200; index += 1) {
      const value = rng.int(3, 8);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(8);
    }
  });

  it('mélange sans perdre ni dupliquer d’élément', () => {
    const rng = createRng(99);
    const source = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rng.shuffle(source);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(source);
  });

  it('respecte les poids du tirage pondéré', () => {
    const rng = createRng(4);
    const counts = { rare: 0, commun: 0 };
    for (let index = 0; index < 2000; index += 1) {
      const item = weightedPick(rng, [
        { item: 'rare' as const, weight: 1 },
        { item: 'commun' as const, weight: 99 },
      ]);
      counts[item] += 1;
    }
    expect(counts.commun).toBeGreaterThan(counts.rare * 10);
  });

  it('dérive un seed stable d’une chaîne', () => {
    expect(seedFromString('forest-12')).toBe(seedFromString('forest-12'));
    expect(seedFromString('forest-12')).not.toBe(seedFromString('forest-13'));
  });
});

describe('Empreinte de texte (CONCEPTION §50)', () => {
  it('est stable pour un même texte', () => {
    expect(textHash('Bravo !')).toBe(textHash('Bravo !'));
  });

  it('change dès que le texte change', () => {
    expect(textHash('Bravo !')).not.toBe(textHash('Bravo !!'));
  });

  it('ignore les différences d’espacement insignifiantes', () => {
    expect(normalizeForHash('  Bravo   ! ')).toBe('Bravo !');
    expect(textHash('  Bravo   ! ')).toBe(textHash('Bravo !'));
  });

  it('reconnaît une empreinte encore valable', () => {
    const hash = textHash('Compte-les doucement.');
    expect(matchesHash('Compte-les doucement.', hash)).toBe(true);
    expect(matchesHash('Compte-les vite.', hash)).toBe(false);
    expect(matchesHash('Compte-les doucement.', undefined)).toBe(false);
  });
});
