/**
 * Configuration Firebase — entierement OPTIONNELLE.
 *
 * Sans ces variables, l'application fonctionne integralement en local
 * (docs/TECHNICAL_SPEC.md, « Backends »). Ces valeurs sont publiques cote
 * client : ce ne sont pas des secrets, et aucun secret ne doit entrer dans Git
 * (CLAUDE.md §2).
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function readFirebaseConfig(): FirebaseConfig | null {
  const env = import.meta.env;
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: env.VITE_FIREBASE_APP_ID ?? '',
  };
  const complete = Object.values(config).every((value) => value.length > 0);
  return complete ? config : null;
}

export function hasFirebaseConfig(): boolean {
  return readFirebaseConfig() !== null;
}
