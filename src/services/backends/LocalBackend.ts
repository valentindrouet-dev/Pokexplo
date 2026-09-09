import type {
  AppMeta,
  ContentBundle,
  ContentRelease,
  MediaPath,
  ProfileId,
  ReleaseId,
  SaveFile,
} from '../../types';
import { db, STORES } from '../db';
import type {
  AuthPort,
  Backend,
  ContentPort,
  MediaPort,
  MediaRecordMeta,
  SavePort,
  SessionUser,
} from './types';

const KEY_META = 'meta';
const KEY_DRAFT = 'draft';
const KEY_ROLE = 'pokexplo.role';

/**
 * Code d'acces a l'Admin.
 *
 * Ce n'est PAS un secret de securite : c'est une barriere pour qu'un enfant
 * n'ouvre pas l'Admin par hasard. Le vrai controle d'acces se fait cote
 * Firebase (regles + roles) quand ce backend est active.
 */
export const LOCAL_ADMIN_CODE = 'parent';

interface StoredMedia extends MediaRecordMeta {
  blob: Blob;
}

const urlCache = new Map<MediaPath, string>();

const auth: AuthPort = {
  async currentUser(): Promise<SessionUser> {
    const role = readRole();
    return { uid: 'local', role, displayName: role === 'ADMIN' ? 'Administrateur' : 'Joueur' };
  },
  async elevate(secret: string): Promise<SessionUser> {
    if (secret.trim().toLowerCase() !== LOCAL_ADMIN_CODE) {
      throw new Error('Code incorrect');
    }
    writeRole('ADMIN');
    return { uid: 'local', role: 'ADMIN', displayName: 'Administrateur' };
  },
  async signOutAdmin(): Promise<SessionUser> {
    writeRole('PLAYER');
    return { uid: 'local', role: 'PLAYER', displayName: 'Joueur' };
  },
};

function readRole(): 'ADMIN' | 'PLAYER' {
  try {
    return localStorage.getItem(KEY_ROLE) === 'ADMIN' ? 'ADMIN' : 'PLAYER';
  } catch {
    return 'PLAYER';
  }
}

function writeRole(role: 'ADMIN' | 'PLAYER'): void {
  try {
    localStorage.setItem(KEY_ROLE, role);
  } catch {
    /* stockage indisponible : la session reste en memoire */
  }
}

/**
 * Deux publications rapprochees peuvent partager la meme milliseconde :
 * l'identifiant (release_0001, release_0002…) sert alors d'arbitre, sinon
 * l'historique de l'Admin s'afficherait dans un ordre imprevisible.
 */
function sortReleases(releases: ContentRelease[]): ContentRelease[] {
  return [...releases].sort((a, b) =>
    b.createdAt === a.createdAt ? b.id.localeCompare(a.id) : b.createdAt - a.createdAt,
  );
}

const content: ContentPort = {
  getMeta: () => db().get<AppMeta>(STORES.kv, KEY_META).then((value) => value ?? null),
  setMeta: (meta: AppMeta) => db().put(STORES.kv, KEY_META, meta),
  getRelease: (id: ReleaseId) =>
    db().get<ContentRelease>(STORES.releases, id).then((value) => value ?? null),
  listReleases: () => db().all<ContentRelease>(STORES.releases).then(sortReleases),
  putRelease: (release: ContentRelease) => db().put(STORES.releases, release.id, release),
  getDraft: () => db().get<ContentBundle>(STORES.kv, KEY_DRAFT).then((value) => value ?? null),
  putDraft: (bundle: ContentBundle) => db().put(STORES.kv, KEY_DRAFT, bundle),
};

const saves: SavePort = {
  list: () => db().all<SaveFile>(STORES.saves),
  get: (profileId: ProfileId) =>
    db().get<SaveFile>(STORES.saves, profileId).then((value) => value ?? null),
  put: (save: SaveFile) => db().put(STORES.saves, save.profile.id, save),
  async archive(profileId: ProfileId) {
    // On ne supprime JAMAIS une sauvegarde : on la deplace sous une cle d'archive.
    const existing = await db().get<SaveFile>(STORES.saves, profileId);
    if (!existing) return;
    await db().put(STORES.saves, `archive:${profileId}:${Date.now()}`, existing);
    await db().delete(STORES.saves, profileId);
  },
};

const media: MediaPort = {
  async put(path, blob, meta) {
    const record: StoredMedia = {
      path,
      blob,
      mimeType: meta.mimeType,
      size: blob.size,
      updatedAt: Date.now(),
      ...(meta.duration !== undefined ? { duration: meta.duration } : {}),
    };
    await db().put(STORES.media, path, record);
    const cached = urlCache.get(path);
    if (cached) {
      URL.revokeObjectURL(cached);
      urlCache.delete(path);
    }
    const { blob: _blob, ...rest } = record;
    return rest;
  },
  async getBlob(path) {
    const record = await db().get<StoredMedia>(STORES.media, path);
    return record?.blob ?? null;
  },
  async getUrl(path) {
    const cached = urlCache.get(path);
    if (cached) return cached;
    const record = await db().get<StoredMedia>(STORES.media, path);
    if (!record) return null;
    const url = URL.createObjectURL(record.blob);
    urlCache.set(path, url);
    return url;
  },
  async list(prefix) {
    const all = await db().all<StoredMedia>(STORES.media);
    return all
      .filter((record) => (prefix ? record.path.startsWith(prefix) : true))
      .map(({ blob: _blob, ...rest }) => rest)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async remove(path) {
    const cached = urlCache.get(path);
    if (cached) {
      URL.revokeObjectURL(cached);
      urlCache.delete(path);
    }
    await db().delete(STORES.media, path);
  },
};

/** Backend par defaut : tout reste sur l'appareil. */
export const localBackend: Backend = { kind: 'local', auth, content, saves, media };
