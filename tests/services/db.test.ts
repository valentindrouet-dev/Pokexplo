import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, resetDb, STORES } from '../../src/services/db';

/**
 * Résilience du stockage local.
 *
 * Safari/iPadOS peut laisser `indexedDB.open()` sans aucune réponse quand il
 * est appelé trop tôt après le chargement de la page. L'application doit
 * continuer à fonctionner (en mémoire) plutôt que de rester bloquée sur
 * « Un instant… » — c'est ce que ces tests garantissent.
 */

const originalIndexedDb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');

function installIndexedDb(factory: unknown): void {
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    writable: true,
    value: factory,
  });
}

beforeEach(() => {
  resetDb();
});

afterEach(() => {
  resetDb();
  if (originalIndexedDb) Object.defineProperty(globalThis, 'indexedDB', originalIndexedDb);
  else installIndexedDb(undefined);
});

describe('Stockage local (docs/TECHNICAL_SPEC.md)', () => {
  it('fonctionne en mémoire quand IndexedDB est absent', async () => {
    installIndexedDb(undefined);
    resetDb();

    await db().put(STORES.kv, 'clé', { valeur: 42 });
    expect(await db().get(STORES.kv, 'clé')).toEqual({ valeur: 42 });
  });

  it('bascule en mémoire, dans un temps borné, si open() ne répond jamais', async () => {
    // Requête qui ne déclenche NI onsuccess, NI onerror, NI onblocked.
    installIndexedDb({
      open: vi.fn(() => ({
        onsuccess: null,
        onerror: null,
        onblocked: null,
        onupgradeneeded: null,
        result: null,
      })),
    });
    resetDb();

    const started = Date.now();
    await db().put(STORES.kv, 'clé', 'valeur');
    const elapsed = Date.now() - started;

    expect(await db().get(STORES.kv, 'clé')).toBe('valeur');
    // 3 tentatives bornées : on ne reste jamais bloqué indéfiniment.
    expect(elapsed).toBeLessThan(10_000);
  }, 15_000);

  it('bascule en mémoire si open() échoue', async () => {
    installIndexedDb({
      open: vi.fn(() => {
        const request: Record<string, unknown> = { error: new Error('refusé') };
        setTimeout(() => {
          (request.onerror as (() => void) | undefined)?.();
        }, 0);
        return request;
      }),
    });
    resetDb();

    await db().put(STORES.saves, 'profil', { nickname: 'Lucie' });
    expect(await db().get(STORES.saves, 'profil')).toEqual({ nickname: 'Lucie' });
  });

  it('ne perd pas les données déjà écrites après la bascule', async () => {
    installIndexedDb(undefined);
    resetDb();

    await db().put(STORES.media, 'media/a', 1);
    await db().put(STORES.media, 'media/b', 2);

    expect(await db().keys(STORES.media)).toEqual(['media/a', 'media/b']);
    expect(await db().all(STORES.media)).toEqual([1, 2]);

    await db().delete(STORES.media, 'media/a');
    expect(await db().keys(STORES.media)).toEqual(['media/b']);
  });
});
