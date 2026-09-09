import type { ContentBundle, MediaPath, NodeId } from '../types';
import { getBackend } from './backends';
import type { MediaRecordMeta } from './backends';

/** Une adresse deja utilisable telle quelle. */
const EXTERNAL_URL = /^(https?:|data:|blob:)/iu;

/**
 * Fichier livre avec l'application : il se trouve dans `public/` et suit donc
 * le site partout ou il est deploye.
 */
function publicUrl(path: MediaPath): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${path.replace(/^\/+/u, '')}`;
}

/**
 * ASSET SERVICE — resolution et mise en cache des medias.
 *
 * Il masque completement l'origine du fichier : les composants ne manipulent
 * qu'un chemin. Trois origines sont acceptees (docs/MEDIA.md) :
 *
 *  1. `https://…` (ou `data:`) — adresse externe, renvoyee telle quelle ;
 *  2. un fichier du magasin de medias — importe depuis l'Admin, stocke sur
 *     l'appareil (IndexedDB) ou dans Cloud Storage selon le backend ;
 *  3. un fichier livre avec l'application (`public/…`) — c'est le repli, et
 *     c'est la seule origine qui suit le site sur TOUS les appareils sans
 *     configuration serveur.
 */
class AssetServiceImpl {
  private readonly urlCache = new Map<MediaPath, string | null>();

  private readonly inflight = new Map<MediaPath, Promise<string | null>>();

  /** URL utilisable dans un <img> ou un <audio>. `null` si le media est absent. */
  async getUrl(path: MediaPath | undefined): Promise<string | null> {
    if (!path) return null;
    // Une adresse complete est utilisable directement.
    if (EXTERNAL_URL.test(path)) return path;
    if (this.urlCache.has(path)) return this.urlCache.get(path) ?? null;

    const pending = this.inflight.get(path);
    if (pending) return pending;

    const promise = getBackend()
      .then((backend) => backend.media.getUrl(path))
      .then((url) => {
        // Rien dans le magasin de medias : le fichier est peut-etre livre
        // avec l'application. C'est ce repli qui permet a une image d'exister
        // sur tous les appareils sans Firebase.
        const resolved = url ?? publicUrl(path);
        this.urlCache.set(path, resolved);
        return resolved;
      })
      .catch(() => {
        // Un media manquant ne casse jamais l'ecran (§174).
        this.urlCache.set(path, null);
        return null;
      })
      .finally(() => {
        this.inflight.delete(path);
      });

    this.inflight.set(path, promise);
    return promise;
  }

  async put(
    path: MediaPath,
    blob: Blob,
    meta: { mimeType: string; duration?: number },
  ): Promise<MediaRecordMeta> {
    const backend = await getBackend();
    const record = await backend.media.put(path, blob, meta);
    this.urlCache.delete(path);
    return record;
  }

  async getBlob(path: MediaPath): Promise<Blob | null> {
    const backend = await getBackend();
    return backend.media.getBlob(path);
  }

  async list(prefix?: string): Promise<MediaRecordMeta[]> {
    const backend = await getBackend();
    return backend.media.list(prefix);
  }

  async remove(path: MediaPath): Promise<void> {
    const backend = await getBackend();
    await backend.media.remove(path);
    this.urlCache.delete(path);
  }

  /** Vide le cache d'URL (apres un changement de release par exemple). */
  invalidate(path?: MediaPath): void {
    if (path) this.urlCache.delete(path);
    else this.urlCache.clear();
  }

  /**
   * CONCEPTION §108 — `downloadCurrentAdventure()`.
   *
   * Precharge explicitement tout ce dont la region courante a besoin :
   * images de creatures, voix des dialogues, indices, arene, musique du biome.
   * Le Service Worker met ensuite ces fichiers en cache (§69-70).
   */
  async downloadCurrentAdventure(
    content: ContentBundle,
    options: { nodeIds?: NodeId[]; onProgress?: (done: number, total: number) => void } = {},
  ): Promise<{ total: number; loaded: number; missing: number }> {
    const nodeIds = new Set(options.nodeIds ?? content.nodes.map((node) => node.id));
    const biomeIds = new Set(
      content.nodes.filter((node) => nodeIds.has(node.id)).map((node) => node.biomeId),
    );

    const paths = new Set<MediaPath>();

    for (const creature of content.creatures) {
      if (creature.imagePath) paths.add(creature.imagePath);
    }
    for (const biome of content.biomes) {
      if (!biomeIds.has(biome.id)) continue;
      if (biome.imagePath) paths.add(biome.imagePath);
      if (biome.musicPath) paths.add(biome.musicPath);
      if (biome.ambiencePath) paths.add(biome.ambiencePath);
    }
    for (const voice of content.voiceMessages) {
      if (voice.audioPath) paths.add(voice.audioPath);
    }

    const list = [...paths];
    let loaded = 0;
    let missing = 0;

    for (const path of list) {
      const url = await this.getUrl(path);
      if (!url) {
        missing += 1;
        options.onProgress?.(loaded + missing, list.length);
        continue;
      }

      if (url.startsWith('blob:')) {
        // Deja sur l'appareil : rien a telecharger.
        loaded += 1;
      } else {
        try {
          // Un simple fetch suffit : le Service Worker intercepte et met en cache.
          const response = await fetch(url);
          if (response.ok || response.type === 'opaque') loaded += 1;
          else missing += 1;
        } catch {
          // Hors ligne : si le fichier est deja en cache, il reste jouable.
          loaded += 1;
        }
      }
      options.onProgress?.(loaded + missing, list.length);
    }

    return { total: list.length, loaded, missing };
  }
}

export const AssetService = new AssetServiceImpl();
