import type { ContentBundle, MediaPath, NodeId } from '../types';
import { getBackend } from './backends';
import type { MediaRecordMeta } from './backends';

/**
 * ASSET SERVICE — resolution et mise en cache des medias.
 *
 * Il masque completement l'origine du fichier (Blob local ou Cloud Storage) :
 * les composants ne manipulent qu'un chemin logique `media/...`.
 */
class AssetServiceImpl {
  private readonly urlCache = new Map<MediaPath, string | null>();

  private readonly inflight = new Map<MediaPath, Promise<string | null>>();

  /** URL utilisable dans un <img> ou un <audio>. `null` si le media est absent. */
  async getUrl(path: MediaPath | undefined): Promise<string | null> {
    if (!path) return null;
    if (this.urlCache.has(path)) return this.urlCache.get(path) ?? null;

    const pending = this.inflight.get(path);
    if (pending) return pending;

    const promise = getBackend()
      .then((backend) => backend.media.getUrl(path))
      .then((url) => {
        this.urlCache.set(path, url);
        return url;
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
      if (url) {
        loaded += 1;
        // Un simple fetch suffit : le Service Worker intercepte et met en cache.
        try {
          await fetch(url, { mode: 'no-cors' });
        } catch {
          /* hors ligne : le fichier local est deja disponible */
        }
      } else {
        missing += 1;
      }
      options.onProgress?.(loaded + missing, list.length);
    }

    return { total: list.length, loaded, missing };
  }
}

export const AssetService = new AssetServiceImpl();
