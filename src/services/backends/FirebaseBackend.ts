import type {
  AppMeta,
  ContentBundle,
  ContentRelease,
  MediaPath,
  ProfileId,
  ReleaseId,
  SaveFile,
} from '../../types';
import { readFirebaseConfig } from '../../firebase/config';
import type {
  AuthPort,
  Backend,
  ContentPort,
  MediaPort,
  MediaRecordMeta,
  SavePort,
  SessionUser,
  UserRole,
} from './types';

/**
 * Backend Firebase — charge DYNAMIQUEMENT.
 *
 * Aucun composant de l'application n'importe Firebase : seul ce fichier le
 * fait, et seulement si `readFirebaseConfig()` renvoie une configuration
 * complete. L'application reste donc parfaitement fonctionnelle sans compte
 * Firebase (docs/TECHNICAL_SPEC.md).
 *
 * Repartition (docs/DATA_MODEL.md) :
 *  - `meta/app`                                    : pointeur de release
 *  - `contentReleases/{id}`                        : metadonnees de release
 *  - `contentReleases/{id}/collections/{nom}`      : une collection par document
 *  - `playerAccounts/{uid}/profiles/{profileId}`   : sauvegardes
 *  - Storage `media/...`                           : images, voix, musiques
 *
 * Les collections sont regroupees par document (et non un document par
 * creature) pour limiter le nombre de lectures au demarrage sur iPad.
 */

type FirebaseApp = Awaited<ReturnType<typeof loadFirebase>>;

const COLLECTION_KEYS = [
  'creatures',
  'biomes',
  'nodes',
  'specialEncounters',
  'exerciseTemplates',
  'skills',
  'curriculumPacks',
  'gyms',
  'badges',
  'quests',
  'chapters',
  'voiceMessages',
] as const;

type CollectionKey = (typeof COLLECTION_KEYS)[number];

async function loadFirebase() {
  const config = readFirebaseConfig();
  if (!config) throw new Error('Configuration Firebase absente');

  const [{ initializeApp, getApps, getApp }, firestore, auth, storage] = await Promise.all([
    import('firebase/app'),
    import('firebase/firestore'),
    import('firebase/auth'),
    import('firebase/storage'),
  ]);

  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  const dbInstance = firestore.initializeFirestore(app, {
    // Persistance locale : l'aventure doit rester jouable hors ligne (§107).
    localCache: firestore.persistentLocalCache({
      tabManager: firestore.persistentMultipleTabManager(),
    }),
  });

  return { app, firestore, db: dbInstance, auth: auth.getAuth(app), authApi: auth, storage, storageApi: storage.getStorage(app) };
}

let instance: Promise<FirebaseApp> | null = null;
function fb(): Promise<FirebaseApp> {
  instance ??= loadFirebase();
  return instance;
}

const authPort: AuthPort = {
  async currentUser(): Promise<SessionUser> {
    const { auth, authApi, firestore, db } = await fb();
    const user = auth.currentUser ?? (await authApi.signInAnonymously(auth)).user;
    const snapshot = await firestore.getDoc(firestore.doc(db, 'playerAccounts', user.uid));
    const data = snapshot.data() as { role?: UserRole; displayName?: string } | undefined;
    return {
      uid: user.uid,
      role: data?.role === 'ADMIN' ? 'ADMIN' : 'PLAYER',
      displayName: data?.displayName ?? 'Joueur',
    };
  },
  async elevate(secret: string): Promise<SessionUser> {
    // Le role ADMIN est porte par Firestore et protege par les regles :
    // il ne s'obtient jamais depuis le client (CLAUDE.md : deny by default).
    const { auth, authApi } = await fb();
    if (secret.includes('@')) {
      throw new Error(
        "Connexion par e-mail requise : utilisez le compte administrateur du projet Firebase.",
      );
    }
    await authApi.signInAnonymously(auth);
    return authPort.currentUser();
  },
  async signOutAdmin(): Promise<SessionUser> {
    const { auth, authApi } = await fb();
    await authApi.signOut(auth);
    await authApi.signInAnonymously(auth);
    return authPort.currentUser();
  },
};

const contentPort: ContentPort = {
  async getMeta() {
    const { firestore, db } = await fb();
    const snapshot = await firestore.getDoc(firestore.doc(db, 'meta', 'app'));
    return snapshot.exists() ? (snapshot.data() as AppMeta) : null;
  },
  async setMeta(meta) {
    const { firestore, db } = await fb();
    await firestore.setDoc(firestore.doc(db, 'meta', 'app'), meta);
  },
  async getRelease(id: ReleaseId) {
    const { firestore, db } = await fb();
    const headSnapshot = await firestore.getDoc(firestore.doc(db, 'contentReleases', id));
    if (!headSnapshot.exists()) return null;
    const head = headSnapshot.data() as Omit<ContentRelease, 'bundle'> & {
      bundleMeta: { releaseId: ReleaseId; contentVersion: string; createdAt: number };
    };

    const collections = await Promise.all(
      COLLECTION_KEYS.map(async (key) => {
        const snapshot = await firestore.getDoc(
          firestore.doc(db, 'contentReleases', id, 'collections', key),
        );
        const data = snapshot.data() as { items?: unknown[] } | undefined;
        return [key, data?.items ?? []] as const;
      }),
    );

    const bundle = {
      ...head.bundleMeta,
      ...Object.fromEntries(collections),
    } as unknown as ContentBundle;

    return { ...head, bundle } as ContentRelease;
  },
  async listReleases() {
    const { firestore, db } = await fb();
    const snapshot = await firestore.getDocs(firestore.collection(db, 'contentReleases'));
    const releases = await Promise.all(
      snapshot.docs.map((document) => contentPort.getRelease(document.id)),
    );
    return releases
      .filter((release): release is ContentRelease => release !== null)
      .sort((a, b) =>
        // Meme arbitrage que le backend local : createdAt puis identifiant.
        b.createdAt === a.createdAt ? b.id.localeCompare(a.id) : b.createdAt - a.createdAt,
      );
  },
  async putRelease(release) {
    const { firestore, db } = await fb();
    const { bundle, ...head } = release;
    const batch = firestore.writeBatch(db);
    batch.set(firestore.doc(db, 'contentReleases', release.id), {
      ...head,
      bundleMeta: {
        releaseId: bundle.releaseId,
        contentVersion: bundle.contentVersion,
        createdAt: bundle.createdAt,
      },
    });
    for (const key of COLLECTION_KEYS) {
      batch.set(firestore.doc(db, 'contentReleases', release.id, 'collections', key), {
        items: bundle[key as CollectionKey] ?? [],
      });
    }
    await batch.commit();
  },
  async getDraft() {
    const { firestore, db } = await fb();
    const snapshot = await firestore.getDoc(firestore.doc(db, 'meta', 'draft'));
    return snapshot.exists() ? ((snapshot.data() as { bundle: ContentBundle }).bundle ?? null) : null;
  },
  async putDraft(bundle) {
    const { firestore, db } = await fb();
    await firestore.setDoc(firestore.doc(db, 'meta', 'draft'), { bundle, updatedAt: Date.now() });
  },
};

async function profilesPath() {
  const { firestore, db } = await fb();
  const user = await authPort.currentUser();
  return { firestore, db, collection: firestore.collection(db, 'playerAccounts', user.uid, 'profiles') };
}

const savePort: SavePort = {
  async list() {
    const { firestore, collection } = await profilesPath();
    const snapshot = await firestore.getDocs(collection);
    return snapshot.docs.map((document) => document.data() as SaveFile);
  },
  async get(profileId: ProfileId) {
    const { firestore, collection } = await profilesPath();
    const snapshot = await firestore.getDoc(firestore.doc(collection, profileId));
    return snapshot.exists() ? (snapshot.data() as SaveFile) : null;
  },
  async put(save: SaveFile) {
    const { firestore, collection } = await profilesPath();
    // Ecriture unique : capture + pokedex + progression arrivent ensemble (§104).
    await firestore.setDoc(firestore.doc(collection, save.profile.id), save);
  },
  async archive(profileId: ProfileId) {
    const { firestore, collection } = await profilesPath();
    const reference = firestore.doc(collection, profileId);
    const snapshot = await firestore.getDoc(reference);
    if (!snapshot.exists()) return;
    // On ne supprime jamais : on marque archive (CLAUDE.md §2).
    await firestore.setDoc(reference, { ...snapshot.data(), archivedAt: Date.now() });
  },
};

const mediaPort: MediaPort = {
  async put(path: MediaPath, blob: Blob, meta): Promise<MediaRecordMeta> {
    const { storage, storageApi } = await fb();
    const reference = storage.ref(storageApi, path);
    await storage.uploadBytes(reference, blob, { contentType: meta.mimeType });
    return {
      path,
      mimeType: meta.mimeType,
      size: blob.size,
      updatedAt: Date.now(),
      ...(meta.duration !== undefined ? { duration: meta.duration } : {}),
    };
  },
  async getBlob(path: MediaPath) {
    const url = await mediaPort.getUrl(path);
    if (!url) return null;
    const response = await fetch(url);
    return response.ok ? await response.blob() : null;
  },
  async getUrl(path: MediaPath) {
    try {
      const { storage, storageApi } = await fb();
      return await storage.getDownloadURL(storage.ref(storageApi, path));
    } catch {
      return null;
    }
  },
  async list(prefix = 'media/') {
    const { storage, storageApi } = await fb();
    const result = await storage.listAll(storage.ref(storageApi, prefix));
    return Promise.all(
      result.items.map(async (item) => {
        const metadata = await storage.getMetadata(item);
        return {
          path: item.fullPath,
          mimeType: metadata.contentType ?? 'application/octet-stream',
          size: metadata.size ?? 0,
          updatedAt: Date.parse(metadata.updated ?? '') || Date.now(),
        } satisfies MediaRecordMeta;
      }),
    );
  },
  async remove(path: MediaPath) {
    const { storage, storageApi } = await fb();
    await storage.deleteObject(storage.ref(storageApi, path));
  },
};

export const firebaseBackend: Backend = {
  kind: 'firebase',
  auth: authPort,
  content: contentPort,
  saves: savePort,
  media: mediaPort,
};
