import { afterEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../../src/services';
import { formatBytes } from '../../src/utils/text';

/**
 * STOCKAGE DE L'APPAREIL.
 *
 * Il n'existe pas de limite unique : on mesure celle de l'appareil ouvert.
 * L'absence de mesure ne doit jamais empecher de jouer.
 */
function withStorage(value: unknown): void {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value,
  });
}

afterEach(() => {
  withStorage(undefined);
  vi.restoreAllMocks();
});

describe('Mesure du stockage', () => {
  it('rapporte l’occupation et le quota réels de l’appareil', async () => {
    withStorage({
      estimate: () => Promise.resolve({ usage: 12_500_000, quota: 500_000_000 }),
      persisted: () => Promise.resolve(true),
    });

    const report = await StorageService.report();
    expect(report.supported).toBe(true);
    expect(report.usage).toBe(12_500_000);
    expect(report.quota).toBe(500_000_000);
    expect(report.persisted).toBe(true);
    expect(report.ratio).toBeCloseTo(0.025, 3);
  });

  it('reste silencieux quand le navigateur n’expose rien (vieux Safari)', async () => {
    withStorage(undefined);
    const report = await StorageService.report();
    expect(report.supported).toBe(false);
    expect(report.usage).toBeNull();
  });

  it('ne casse pas si la mesure échoue', async () => {
    withStorage({ estimate: () => Promise.reject(new Error('refusé')) });
    const report = await StorageService.report();
    expect(report.supported).toBe(false);
  });

  it('demande la persistance sans jamais lever', async () => {
    withStorage({ persist: () => Promise.reject(new Error('refusé')) });
    await expect(StorageService.requestPersistence()).resolves.toBe(false);

    withStorage({ persist: () => Promise.resolve(true) });
    await expect(StorageService.requestPersistence()).resolves.toBe(true);
  });
});

describe('Affichage des tailles', () => {
  it('utilise les unités que l’iPad affiche ailleurs', () => {
    expect(formatBytes(0)).toBe('0 o');
    expect(formatBytes(999)).toBe('999 o');
    expect(formatBytes(12_500_000)).toBe('12,5 Mo');
    expect(formatBytes(2_000_000_000)).toBe('2 Go');
  });

  it('ne produit jamais de valeur absurde', () => {
    expect(formatBytes(-1)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
  });
});
