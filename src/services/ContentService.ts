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

  async load(force = false): Promise<LoadedContent> {
    if (this.cache && !force) return this.cache;
    const backend = await getBackend();

    let meta = await backend.content.getMeta();
    let release: ContentRelease | null = meta
      ? await backend.content.getRelease(meta.currentReleaseId)
      : null;

    if (!release) {
      const seeded = this.seedRelease();
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
      fromDefaults: release.id === 'release_0001',
    };
    return this.cache;
  }

  private seedRelease(): ContentRelease {
    const bundle = defaultContentBundle();
    return {
      id: 'release_0001' as ReleaseId,
      label: 'Contenu initial',
      createdAt: Date.now(),
      publishedAt: Date.now(),
      status: 'PUBLISHED',
      bundle,
    };
  }

  /** CONCEPTION §99 — le Master travaille toujours sur un brouillon. */
  async getDraft(): Promise<ContentBundle> {
    const backend = await getBackend();
    const draft = await backend.content.getDraft();
    if (draft) return draft;
    const published = await this.load();
    const copy: ContentBundle = deepClone(published.bundle);
    await backend.content.putDraft(copy);
    return copy;
  }

  async saveDraft(bundle: ContentBundle): Promise<void> {
    const backend = await getBackend();
    await backend.content.putDraft(bundle);
  }

  async resetDraftFromPublished(): Promise<ContentBundle> {
    const backend = await getBackend();
    const published = await this.load(true);
    const copy: ContentBundle = deepClone(published.bundle);
    await backend.content.putDraft(copy);
    return copy;
  }

  invalidate(): void {
    this.cache = null;
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
