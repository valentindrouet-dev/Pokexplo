import type { AppMeta, ContentBundle, ContentRelease, ReleaseId } from '../types';
import { SAVE_SCHEMA_VERSION } from '../types/save';
import { releaseId as makeReleaseId } from '../utils/id';
import { deepClone } from '../utils/clone';
import { getBackend } from './backends';
import { ContentService } from './ContentService';

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

export interface PublishResult {
  release: ContentRelease;
  meta: AppMeta;
}

/**
 * RELEASE SERVICE (CONCEPTION §99-100).
 *
 *   validate -> create release -> copy content -> validate release -> set pointer
 *
 * Le pointeur `currentReleaseId` change EN DERNIER : si quoi que ce soit
 * echoue, les joueurs continuent de voir l'ancienne release.
 * Une release publiee est immuable ; un rollback consiste simplement a
 * repointer vers une release anterieure, sans toucher aux sauvegardes.
 */
class ReleaseServiceImpl {
  async list(): Promise<ContentRelease[]> {
    const backend = await getBackend();
    return backend.content.listReleases();
  }

  async nextReleaseId(): Promise<ReleaseId> {
    const releases = await this.list();
    const numbers = releases
      .map((release) => Number.parseInt(release.id.replace('release_', ''), 10))
      .filter((value) => Number.isFinite(value));
    const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
    return makeReleaseId(next) as ReleaseId;
  }

  /**
   * Publie le brouillon.
   * `force` autorise la publication malgre des voix manquantes (§53) ;
   * une ERREUR de validation reste bloquante.
   */
  async publish(
    draft: ContentBundle,
    label: string,
    options: { force?: boolean } = {},
  ): Promise<PublishResult> {
    const validation = ContentService.validate(draft);
    const blocking = validation.issues.filter((issue) => issue.level === 'ERROR');
    if (blocking.length > 0) {
      throw new Error(
        `Publication impossible : ${blocking.length} erreur(s) de contenu.\n` +
          blocking
            .slice(0, 5)
            .map((issue) => `• ${issue.message}`)
            .join('\n'),
      );
    }
    if (!options.force && validation.missingVoices > 0) {
      throw new Error(
        `${validation.missingVoices} texte(s) destiné(s) à l’enfant n’ont pas de voix. ` +
          'Enregistrez-les, ou publiez quand même.',
      );
    }

    const backend = await getBackend();
    const id = await this.nextReleaseId();
    const bundle: ContentBundle = {
      ...deepClone(draft),
      releaseId: id,
      contentVersion: id,
      createdAt: Date.now(),
    };

    const release: ContentRelease = {
      id,
      label,
      createdAt: Date.now(),
      publishedAt: Date.now(),
      status: 'PUBLISHED',
      source: 'admin',
      bundle,
      validation,
    };

    await backend.content.putRelease(release);

    // Relecture : on ne bascule le pointeur que si la release est bien ecrite.
    const stored = await backend.content.getRelease(id);
    if (!stored) throw new Error('La release n’a pas pu être relue après écriture.');

    const meta: AppMeta = {
      currentReleaseId: id,
      minimumAppVersion: APP_VERSION,
      saveSchemaVersion: SAVE_SCHEMA_VERSION,
    };
    await backend.content.setMeta(meta);
    ContentService.invalidate();
    // Le brouillon est desormais a jour : plus rien n'attend d'etre publie.
    await ContentService.markDraftPublished(bundle.contentVersion);

    return { release: stored, meta };
  }

  /** CONCEPTION §100 — retour a une release anterieure. Les sauvegardes restent intactes. */
  async rollback(id: ReleaseId): Promise<AppMeta> {
    const backend = await getBackend();
    const release = await backend.content.getRelease(id);
    if (!release) throw new Error(`Release inconnue : ${id}`);

    const meta: AppMeta = {
      currentReleaseId: id,
      minimumAppVersion: APP_VERSION,
      saveSchemaVersion: SAVE_SCHEMA_VERSION,
    };
    await backend.content.setMeta(meta);
    ContentService.invalidate();
    return meta;
  }
}

export const ReleaseService = new ReleaseServiceImpl();
