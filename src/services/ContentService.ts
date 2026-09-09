import type {
  AppMeta,
  ContentBundle,
  ContentRelease,
  ReleaseId,
  ValidationIssue,
  ValidationReport,
} from '../types';
import { SAVE_SCHEMA_VERSION } from '../types/save';
import { defaultContentBundle } from '../content/defaultContent';
import { voiceStatus } from '../utils/voice';
import { deepClone } from '../utils/clone';
import { getBackend } from './backends';
import { failAfter } from '../utils/async';

/**
 * Contenu optionnel livre AVEC LE SITE.
 *
 * S'il existe, ce fichier remplace le contenu par defaut compile dans
 * l'application. C'est la voie qui permet a un contenu prepare depuis l'Admin
 * (creatures, images, textes) d'apparaitre sur TOUS les appareils sans serveur :
 * on l'exporte, on le depose dans `public/content/bundle.json`, on publie.
 * Voir docs/MEDIA.md.
 */
const BUNDLE_OVERRIDE_PATH = 'content/bundle.json';
const BUNDLE_FETCH_TIMEOUT_MS = 4000;

interface BundledSource {
  bundle: ContentBundle;
  /**
   * Vrai si l'on a pu VERIFIER ce que le site propose. Hors ligne, on ne
   * remplace jamais le contenu installe : on risquerait d'ecraser une version
   * plus recente par le contenu compile.
   */
  reachable: boolean;
}

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

export interface LoadedContent {
  bundle: ContentBundle;
  meta: AppMeta;
  /** Vrai si le contenu vient du bundle livre avec l'application. */
  fromDefaults: boolean;
}

/**
 * CONTENT SERVICE (CONCEPTION §97-99).
 *
 * Au premier lancement, le contenu livre avec l'application est publie comme
 * `release_0001` : l'enfant peut jouer immediatement, et l'administrateur
 * dispose deja d'une base a modifier.
 */
class ContentServiceImpl {
  private cache: LoadedContent | null = null;

  /**
   * Contenu de reference : celui livre avec le site s'il existe, sinon celui
   * compile dans l'application.
   */
  private async bundledContent(): Promise<BundledSource> {
    const url = `${import.meta.env.BASE_URL || '/'}${BUNDLE_OVERRIDE_PATH}`;
    try {
      /*
       * `no-cache` : on revalide toujours aupres du serveur. Sans cela, un
       * contenu publie depuis l'ordinateur pouvait rester invisible sur l'iPad
       * tant que le cache HTTP n'avait pas expire.
       */
      const response = await failAfter(
        fetch(url, { cache: 'no-cache' }),
        BUNDLE_FETCH_TIMEOUT_MS,
        'Le contenu du site',
      );
      // 404 : aucun contenu n'a ete depose, on utilise celui de l'application.
      if (response.status === 404) return { bundle: defaultContentBundle(), reachable: true };
      if (!response.ok) return { bundle: defaultContentBundle(), reachable: false };

      const parsed = (await response.json()) as Partial<ContentBundle>;
      if (!Array.isArray(parsed.creatures) || !Array.isArray(parsed.nodes)) {
        console.warn('[pokexplo] content/bundle.json ignoré : format inattendu');
        return { bundle: defaultContentBundle(), reachable: true };
      }
      return { bundle: parsed as ContentBundle, reachable: true };
    } catch {
      // Hors ligne, ou fichier injoignable : on ne touche a rien.
      return { bundle: defaultContentBundle(), reachable: false };
    }
  }

  async load(force = false): Promise<LoadedContent> {
    if (this.cache && !force) return this.cache;
    const backend = await getBackend();

    let meta = await backend.content.getMeta();
    let release: ContentRelease | null = meta
      ? await backend.content.getRelease(meta.currentReleaseId)
      : null;

    /*
     * Le contenu de reference a evolue : on le remplace.
     * On ne touche JAMAIS a une release publiee depuis l'Admin (§97) — seule
     * la release `bundled` suit les mises a jour de l'application ou du site.
     */
    const bundled = await this.bundledContent();
    const bundledOutdated =
      release?.source === 'bundled' &&
      bundled.reachable &&
      release.bundle.contentVersion !== bundled.bundle.contentVersion;

    if (!release || bundledOutdated) {
      const seeded = this.seedRelease(bundled.bundle);
      await backend.content.putRelease(seeded);
      meta = {
        currentReleaseId: seeded.id,
        minimumAppVersion: APP_VERSION,
        saveSchemaVersion: SAVE_SCHEMA_VERSION,
      };
      await backend.content.setMeta(meta);
      release = seeded;
    }

    this.cache = {
      bundle: release.bundle,
      meta: meta as AppMeta,
      fromDefaults: release.source === 'bundled',
    };
    return this.cache;
  }

  private seedRelease(bundle: ContentBundle): ContentRelease {
    return {
      id: 'release_0001' as ReleaseId,
      label: 'Contenu livré avec l’application',
      createdAt: Date.now(),
      publishedAt: Date.now(),
      status: 'PUBLISHED',
      source: 'bundled',
      bundle,
    };
  }

  /**
   * CONCEPTION §99 — le Master travaille toujours sur un brouillon.
   *
   * Le brouillon est copie de la version publiee, puis vit sa vie. Quand le
   * contenu de reference du site avance (nouvelle carte, nouveaux lieux), un
   * brouillon INTACT est remplace sans bruit : l'administrateur retrouve la
   * version a jour. Un brouillon MODIFIE n'est jamais ecrase — on signale
   * seulement qu'il est en retard (`draftStatus`), et c'est a l'adulte de
   * decider de repartir de la version publiee.
   */
  async getDraft(): Promise<ContentBundle> {
    const backend = await getBackend();
    const draft = await backend.content.getDraft();
    const published = await this.load();

    if (draft) {
      let meta = await backend.content.getDraftMeta();
      if (meta === null) {
        // Brouillon anterieur a ce suivi : on ignore s'il a ete touche. On le
        // garde, et on le considere MODIFIE — ainsi, s'il est en retard, c'est
        // signale a l'adulte plutot qu'ecrase ou passe sous silence.
        meta = { basedOn: draft.contentVersion, dirty: true };
        await backend.content.setDraftMeta(meta);
      }
      const stale = !meta.dirty && meta.basedOn !== published.bundle.contentVersion;
      if (!stale) return draft;
    }

    const copy: ContentBundle = deepClone(published.bundle);
    await backend.content.putDraft(copy);
    await backend.content.setDraftMeta({ basedOn: published.bundle.contentVersion, dirty: false });
    return copy;
  }

  /** Toute ecriture venant de l'Admin marque le brouillon comme travail en cours. */
  async saveDraft(bundle: ContentBundle): Promise<void> {
    const backend = await getBackend();
    await backend.content.putDraft(bundle);
    const meta = await backend.content.getDraftMeta();
    await backend.content.setDraftMeta({
      basedOn: meta?.basedOn ?? bundle.contentVersion,
      dirty: true,
    });
  }

  async resetDraftFromPublished(): Promise<ContentBundle> {
    const backend = await getBackend();
    const published = await this.load(true);
    const copy: ContentBundle = deepClone(published.bundle);
    await backend.content.putDraft(copy);
    await backend.content.setDraftMeta({ basedOn: published.bundle.contentVersion, dirty: false });
    return copy;
  }

  /**
   * Le brouillon est-il en retard sur la version publiee ?
   *
   * Vrai quand il a ete copie d'un contenu de reference plus ancien que celui
   * servi aujourd'hui : publier ce brouillon ferait REVENIR l'ancienne carte,
   * les anciens noms — c'est exactement ce qu'un adulte doit savoir avant.
   */
  /**
   * Etat du brouillon vis-a-vis de ce que joue l'enfant.
   *
   * `unpublished` est LA question que se pose l'adulte : « mes modifications
   * sont-elles arrivees jusqu'a mon enfant ? ». Elle vaut vrai des la premiere
   * retouche, et redevient fausse a la publication.
   */
  async draftStatus(): Promise<{
    unpublished: boolean;
    outdated: boolean;
    basedOn: string | null;
    published: string;
  }> {
    const backend = await getBackend();
    const [meta, published] = await Promise.all([backend.content.getDraftMeta(), this.load()]);
    const current = published.bundle.contentVersion;
    return {
      unpublished: meta?.dirty === true,
      outdated: meta !== null && meta.basedOn !== current,
      basedOn: meta?.basedOn ?? null,
      published: current,
    };
  }

  /**
   * Le brouillon vient d'etre publie : il n'a plus rien en attente.
   *
   * Sans cela, « modifications non publiees » restait allume pour toujours
   * apres la premiere retouche, et l'avertissement perdait tout son sens.
   */
  async markDraftPublished(version: string): Promise<void> {
    const backend = await getBackend();
    if (!(await backend.content.getDraft())) return;
    await backend.content.setDraftMeta({ basedOn: version, dirty: false });
  }

  invalidate(): void {
    this.cache = null;
  }

  /** Version de contenu actuellement servie a l'enfant, si elle est chargee. */
  installedVersion(): string | null {
    return this.cache?.bundle.contentVersion ?? null;
  }

  /**
   * Existe-t-il un contenu plus recent que celui installe ?
   *
   * C'est ce qui permet a l'iPad de suivre seul les modifications faites
   * depuis l'ordinateur, par les deux chemins possibles :
   *  - avec Firebase, le pointeur `meta/app` designe une autre release ;
   *  - sans Firebase, le site sert un `content/bundle.json` d'une autre
   *    version.
   *
   * Dans le second cas, on ne regarde que la release `bundled` : une release
   * publiee depuis l'Admin de CET appareil est immuable et n'est jamais
   * remplacee automatiquement (§97).
   */
  async updateAvailable(): Promise<boolean> {
    if (!this.cache) return false;

    const backend = await getBackend();
    if (backend.kind === 'firebase') {
      const meta = await backend.content.getMeta();
      return meta !== null && meta.currentReleaseId !== this.cache.meta.currentReleaseId;
    }

    if (!this.cache.fromDefaults) return false;
    const bundled = await this.bundledContent();
    if (!bundled.reachable) return false;
    return bundled.bundle.contentVersion !== this.cache.bundle.contentVersion;
  }

  /**
   * CONCEPTION §53, §99 — validation avant publication.
   *
   * Les references cassees sont des ERREURS (elles casseraient le jeu) ;
   * les voix manquantes ou obsoletes sont des AVERTISSEMENTS : l'administrateur
   * peut publier quand meme et s'appuyer temporairement sur le TTS.
   */
  validate(bundle: ContentBundle): ValidationReport {
    const issues: ValidationIssue[] = [];
    const nodeIds = new Set(bundle.nodes.map((node) => node.id));
    const creatureIds = new Set(bundle.creatures.map((creature) => creature.id));
    const templateIds = new Set(bundle.exerciseTemplates.map((template) => template.id));
    const gymIds = new Set(bundle.gyms.map((gym) => gym.id));
    const badgeIds = new Set(bundle.badges.map((badge) => badge.id));
    const questIds = new Set(bundle.quests.map((quest) => quest.id));
    const skillIds = new Set(bundle.skills.map((skill) => skill.id));
    const voiceIds = new Set(bundle.voiceMessages.map((voice) => voice.id));

    const error = (code: string, message: string, ref?: string): void => {
      issues.push({ level: 'ERROR', code, message, ...(ref ? { ref } : {}) });
    };
    const warn = (code: string, message: string, ref?: string): void => {
      issues.push({ level: 'WARNING', code, message, ...(ref ? { ref } : {}) });
    };
    const checkVoice = (id: string | undefined, ref: string): void => {
      if (id && !voiceIds.has(id)) error('VOICE_REF', `Voix inconnue « ${id} »`, ref);
    };

    if (bundle.nodes.length === 0) error('NO_NODES', 'La carte ne contient aucun nœud.');
    if (!bundle.nodes.some((node) => node.kind === 'CENTER')) {
      error('NO_CENTER', 'Aucun Centre : le jeu n’a pas de point de départ.');
    }

    for (const node of bundle.nodes) {
      for (const connection of node.connections) {
        if (!nodeIds.has(connection)) {
          error('NODE_LINK', `Le nœud « ${node.label} » pointe vers un nœud inconnu.`, node.id);
        }
      }
      for (const entry of node.encounters ?? []) {
        if (!creatureIds.has(entry.creatureId)) {
          error('NODE_CREATURE', `Créature inconnue dans « ${node.label} ».`, node.id);
        }
      }
      for (const templateId of node.exerciseTemplateIds ?? []) {
        if (!templateIds.has(templateId)) {
          error('NODE_TEMPLATE', `Matrice inconnue dans « ${node.label} ».`, node.id);
        }
      }
      if (node.gymId && !gymIds.has(node.gymId)) {
        error('NODE_GYM', `Arène inconnue sur « ${node.label} ».`, node.id);
      }
      checkVoice(node.arrivalVoiceId, node.id);
    }

    for (const template of bundle.exerciseTemplates) {
      if (!skillIds.has(template.skillId)) {
        error('TEMPLATE_SKILL', `Compétence inconnue pour « ${template.label} ».`, template.id);
      }
      if (template.answerCount < 2 || template.answerCount > 4) {
        warn(
          'TEMPLATE_ANSWERS',
          `« ${template.label} » propose ${template.answerCount} réponses (2 à 4 recommandé).`,
          template.id,
        );
      }
      checkVoice(template.audio.question?.voiceId, template.id);
      checkVoice(template.audio.hint1?.voiceId, template.id);
      checkVoice(template.audio.hint2?.voiceId, template.id);
      checkVoice(template.audio.success?.voiceId, template.id);
    }

    for (const gym of bundle.gyms) {
      if (!nodeIds.has(gym.nodeId)) error('GYM_NODE', `Nœud inconnu pour « ${gym.gymName} ».`, gym.id);
      if (!badgeIds.has(gym.badgeId)) error('GYM_BADGE', `Badge inconnu pour « ${gym.gymName} ».`, gym.id);
      if (gym.opponents.length === 0) {
        error('GYM_EMPTY', `« ${gym.gymName} » n’a aucun adversaire.`, gym.id);
      }
      for (const opponent of gym.opponents) {
        if (!creatureIds.has(opponent.creatureId)) {
          error('GYM_CREATURE', `Créature inconnue dans « ${gym.gymName} ».`, gym.id);
        }
      }
    }

    for (const quest of bundle.quests) {
      for (const nodeId of quest.unlocksNodes ?? []) {
        if (!nodeIds.has(nodeId)) error('QUEST_NODE', `Quête « ${quest.title} » : nœud inconnu.`, quest.id);
      }
      checkVoice(quest.offerVoiceId, quest.id);
      checkVoice(quest.completeVoiceId, quest.id);
    }

    for (const chapter of bundle.chapters) {
      for (const goal of chapter.goals) {
        if (goal.kind === 'QUEST' && !questIds.has(goal.questId)) {
          error('CHAPTER_QUEST', `Chapitre « ${chapter.title} » : quête inconnue.`, chapter.id);
        }
        if (goal.kind === 'GYM' && !gymIds.has(goal.gymId)) {
          error('CHAPTER_GYM', `Chapitre « ${chapter.title} » : arène inconnue.`, chapter.id);
        }
      }
      checkVoice(chapter.introVoiceId, chapter.id);
      checkVoice(chapter.outroVoiceId, chapter.id);
    }

    let missingVoices = 0;
    let outdatedVoices = 0;
    for (const voice of bundle.voiceMessages) {
      const status = voiceStatus(voice);
      if (status === 'VOICE_MISSING') missingVoices += 1;
      if (status === 'VOICE_OUTDATED') outdatedVoices += 1;
    }

    if (missingVoices > 0) {
      warn('VOICE_MISSING', `${missingVoices} texte(s) destiné(s) à l’enfant n’ont pas de voix.`);
    }
    if (outdatedVoices > 0) {
      warn('VOICE_OUTDATED', `${outdatedVoices} voix ne correspondent plus à leur texte.`);
    }

    return { issues, checkedAt: Date.now(), missingVoices, outdatedVoices };
  }
}

export const ContentService = new ContentServiceImpl();
