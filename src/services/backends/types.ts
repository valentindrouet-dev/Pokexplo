import type {
  AppMeta,
  ContentBundle,
  ContentRelease,
  MediaPath,
  ProfileId,
  ReleaseId,
  SaveFile,
} from '../../types';

export type UserRole = 'ADMIN' | 'PLAYER';

export interface SessionUser {
  uid: string;
  role: UserRole;
  displayName: string;
}

/**
 * Identifiants du passage en mode administrateur (§93).
 *
 * En local, `secret` est le code d'acces qui empeche un enfant d'ouvrir
 * l'Admin par hasard. Avec Firebase, c'est le mot de passe du compte
 * administrateur et `email` est obligatoire : le role ADMIN vit dans Firestore
 * et n'est jamais accorde depuis le client.
 */
export interface AdminCredentials {
  secret: string;
  email?: string;
}

export interface AuthPort {
  currentUser(): Promise<SessionUser>;
  /** Passage en mode administrateur (§93). */
  elevate(credentials: AdminCredentials): Promise<SessionUser>;
  signOutAdmin(): Promise<SessionUser>;
}

/**
 * Ce que l'on sait du brouillon en plus de son contenu.
 *
 * `basedOn` est la version du contenu dont il a ete copie ; `dirty` dit si
 * l'administrateur l'a modifie depuis. C'est ce qui permet de remplacer un
 * brouillon intact par un contenu de reference plus recent, sans jamais
 * ecraser un travail en cours.
 */
export interface DraftMeta {
  basedOn: string;
  dirty: boolean;
}

export interface ContentPort {
  getMeta(): Promise<AppMeta | null>;
  setMeta(meta: AppMeta): Promise<void>;
  getRelease(id: ReleaseId): Promise<ContentRelease | null>;
  listReleases(): Promise<ContentRelease[]>;
  putRelease(release: ContentRelease): Promise<void>;
  getDraft(): Promise<ContentBundle | null>;
  putDraft(bundle: ContentBundle): Promise<void>;
  getDraftMeta(): Promise<DraftMeta | null>;
  setDraftMeta(meta: DraftMeta): Promise<void>;
}

export interface SavePort {
  list(): Promise<SaveFile[]>;
  get(profileId: ProfileId): Promise<SaveFile | null>;
  put(save: SaveFile): Promise<void>;
  /** Jamais de suppression silencieuse : on archive (CLAUDE.md §2). */
  archive(profileId: ProfileId): Promise<void>;
}

export interface MediaRecordMeta {
  path: MediaPath;
  mimeType: string;
  size: number;
  duration?: number;
  updatedAt: number;
}

export interface MediaPort {
  put(path: MediaPath, blob: Blob, meta: Omit<MediaRecordMeta, 'path' | 'size' | 'updatedAt'>): Promise<MediaRecordMeta>;
  getBlob(path: MediaPath): Promise<Blob | null>;
  getUrl(path: MediaPath): Promise<string | null>;
  list(prefix?: string): Promise<MediaRecordMeta[]>;
  remove(path: MediaPath): Promise<void>;
}

export interface Backend {
  readonly kind: 'local' | 'firebase';
  auth: AuthPort;
  content: ContentPort;
  saves: SavePort;
  media: MediaPort;
}
