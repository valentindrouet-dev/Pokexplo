import { hasFirebaseConfig } from '../../firebase/config';
import { localBackend } from './LocalBackend';
import type { Backend } from './types';

export type { Backend, AuthPort, AdminCredentials, ContentPort, SavePort, MediaPort, MediaRecordMeta, SessionUser, UserRole } from './types';
export { localBackend, LOCAL_ADMIN_CODE } from './LocalBackend';

let cached: Backend | null = null;
let loading: Promise<Backend> | null = null;

/**
 * Selectionne le backend actif.
 *
 * Firebase n'est charge (import dynamique) que si une configuration complete
 * est presente. Si son initialisation echoue, on retombe sur le backend local
 * plutot que d'empecher l'enfant de jouer.
 */
export async function getBackend(): Promise<Backend> {
  if (cached) return cached;
  if (loading) return loading;

  if (!hasFirebaseConfig()) {
    cached = localBackend;
    return cached;
  }

  loading = import('./FirebaseBackend')
    .then((module) => {
      cached = module.firebaseBackend;
      return cached;
    })
    .catch((error: unknown) => {
      console.warn('[pokexplo] Firebase indisponible, bascule en local', error);
      cached = localBackend;
      return cached;
    })
    .finally(() => {
      loading = null;
    });

  return loading;
}

/** Force un backend (tests, previsualisation Admin). */
export function setBackend(backend: Backend | null): void {
  cached = backend;
  loading = null;
}
