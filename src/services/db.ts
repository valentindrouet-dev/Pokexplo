/**
 * Petit acces IndexedDB, sans dependance.
 *
 * En environnement de test (jsdom) ou dans un navigateur qui refuse
 * IndexedDB (navigation privee tres restrictive), on bascule automatiquement
 * sur une implementation en memoire : l'application ne plante jamais a cause
 * du stockage (CLAUDE.md).
 */

export const DB_NAME = 'pokexplo';
export const DB_VERSION = 1;

export const STORES = {
  kv: 'kv',
  releases: 'releases',
  saves: 'saves',
  media: 'media',
  queue: 'queue',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

interface KeyValueStore {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  put<T>(store: StoreName, key: string, value: T): Promise<void>;
  delete(store: StoreName, key: string): Promise<void>;
  keys(store: StoreName): Promise<string[]>;
  all<T>(store: StoreName): Promise<T[]>;
  clear(store: StoreName): Promise<void>;
}

function createMemoryStore(): KeyValueStore {
  const data = new Map<string, Map<string, unknown>>();
  const bucket = (store: StoreName): Map<string, unknown> => {
    const existing = data.get(store);
    if (existing) return existing;
    const created = new Map<string, unknown>();
    data.set(store, created);
    return created;
  };

  return {
    async get<T>(store: StoreName, key: string) {
      return bucket(store).get(key) as T | undefined;
    },
    async put<T>(store: StoreName, key: string, value: T) {
      bucket(store).set(key, value);
    },
    async delete(store: StoreName, key: string) {
      bucket(store).delete(key);
    },
    async keys(store: StoreName) {
      return [...bucket(store).keys()];
    },
    async all<T>(store: StoreName) {
      return [...bucket(store).values()] as T[];
    },
    async clear(store: StoreName) {
      bucket(store).clear();
    },
  };
}

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB indisponible'));
    request.onblocked = () => reject(new Error('IndexedDB bloquee par un autre onglet'));
  });
  return dbPromise;
}

function createIdbStore(): KeyValueStore {
  const run = <T>(
    store: StoreName,
    mode: IDBTransactionMode,
    action: (objectStore: IDBObjectStore) => IDBRequest,
  ): Promise<T> =>
    openDatabase().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const transaction = db.transaction(store, mode);
          const request = action(transaction.objectStore(store));
          request.onsuccess = () => resolve(request.result as T);
          request.onerror = () => reject(request.error ?? new Error('Erreur IndexedDB'));
        }),
    );

  return {
    get: <T,>(store: StoreName, key: string) => run<T | undefined>(store, 'readonly', (s) => s.get(key)),
    put: <T,>(store: StoreName, key: string, value: T) =>
      run<void>(store, 'readwrite', (s) => s.put(value, key)).then(() => undefined),
    delete: (store: StoreName, key: string) =>
      run<void>(store, 'readwrite', (s) => s.delete(key)).then(() => undefined),
    keys: (store: StoreName) =>
      run<IDBValidKey[]>(store, 'readonly', (s) => s.getAllKeys()).then((keys) =>
        keys.map((key) => String(key)),
      ),
    all: <T,>(store: StoreName) => run<T[]>(store, 'readonly', (s) => s.getAll()),
    clear: (store: StoreName) => run<void>(store, 'readwrite', (s) => s.clear()).then(() => undefined),
  };
}

let store: KeyValueStore | null = null;

/** Acces au stockage local (IndexedDB, ou memoire en repli). */
export function db(): KeyValueStore {
  if (store) return store;
  store = hasIndexedDb() ? withFallback(createIdbStore()) : createMemoryStore();
  return store;
}

/**
 * Si IndexedDB echoue a l'execution (quota, mode prive), on retombe en memoire
 * plutot que de casser la session en cours.
 */
function withFallback(primary: KeyValueStore): KeyValueStore {
  const memory = createMemoryStore();
  let broken = false;
  const guard = async <T,>(action: () => Promise<T>, fallback: () => Promise<T>): Promise<T> => {
    if (broken) return fallback();
    try {
      return await action();
    } catch (error) {
      broken = true;
      console.warn('[pokexplo] IndexedDB indisponible, bascule en memoire', error);
      return fallback();
    }
  };

  return {
    get: (s, k) => guard(() => primary.get(s, k), () => memory.get(s, k)),
    put: (s, k, v) => guard(() => primary.put(s, k, v), () => memory.put(s, k, v)),
    delete: (s, k) => guard(() => primary.delete(s, k), () => memory.delete(s, k)),
    keys: (s) => guard(() => primary.keys(s), () => memory.keys(s)),
    all: (s) => guard(() => primary.all(s), () => memory.all(s)),
    clear: (s) => guard(() => primary.clear(s), () => memory.clear(s)),
  };
}

/** Reinitialise le cache de connexion (tests). */
export function resetDb(): void {
  store = null;
  dbPromise = null;
}
