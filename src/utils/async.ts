/**
 * Garde-fous asynchrones.
 *
 * Sur iPadOS, certaines API du navigateur peuvent ne JAMAIS répondre :
 * `HTMLMediaElement.play()` sur un média muet, ou `indexedDB.open()` appelé
 * trop tôt après le chargement de la page (bug WebKit connu). Une promesse qui
 * ne se règle pas bloque alors tout l'écran — c'est exactement ce qu'un enfant
 * ne doit jamais subir (CONCEPTION §175).
 *
 * Toute attente sur une API navigateur passe donc par l'un de ces deux outils.
 */

/** Attend `promise`, mais abandonne après `ms` en renvoyant `fallback`. */
export function settleWithin<T>(
  promise: Promise<T> | undefined | null,
  ms: number,
  fallback: T,
): Promise<T> {
  if (!promise) return Promise.resolve(fallback);
  return new Promise<T>((resolve) => {
    let done = false;
    const finish = (value: T): void => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(fallback), ms);
    promise.then(finish, () => finish(fallback));
  });
}

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} n'a pas répondu en ${ms} ms`);
    this.name = 'TimeoutError';
  }
}

/** Attend `promise`, mais échoue avec `TimeoutError` après `ms`. */
export function failAfter<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let done = false;
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      reject(new TimeoutError(label, ms));
    }, ms);
    promise.then(
      (value) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/** Petite pause, utilisée entre deux tentatives d'ouverture d'IndexedDB. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
