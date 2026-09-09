import type { ContentBundle, VoiceMessage, VoiceMessageId, VoiceStatus } from '../types';
import { matchesHash } from './hash';

/**
 * CONCEPTION §50-51 — statut d'un bloc « texte + voix ».
 *
 * C'est ce calcul qui permet a l'Admin d'afficher
 * « ⚠️ Le texte a été modifié depuis l'enregistrement de la voix ».
 */
export function voiceStatus(voice: VoiceMessage | null | undefined): VoiceStatus {
  if (!voice || voice.text.trim().length === 0) return 'NO_TEXT';
  if (voice.voiceMode === 'NONE') return 'TEXT_ONLY';
  if (!voice.audioPath) return 'VOICE_MISSING';
  if (!matchesHash(voice.text, voice.textHash)) return 'VOICE_OUTDATED';
  return 'VOICE_OK';
}

export const VOICE_STATUS_LABEL: Record<VoiceStatus, string> = {
  NO_TEXT: 'Pas de texte',
  TEXT_ONLY: 'Texte seul',
  VOICE_OK: 'Voix valide',
  VOICE_OUTDATED: 'Voix obsolète',
  VOICE_MISSING: 'Voix manquante',
};

export function findVoice(
  bundle: ContentBundle,
  id: VoiceMessageId | undefined,
): VoiceMessage | null {
  if (!id) return null;
  return bundle.voiceMessages.find((voice) => voice.id === id) ?? null;
}

/** Cree une VoiceMessage vide, prete a etre editee dans le VoiceTextEditor. */
export function createVoiceMessage(
  id: VoiceMessageId,
  text: string,
  category: VoiceMessage['category'],
  options: Partial<VoiceMessage> = {},
): VoiceMessage {
  return {
    id,
    text,
    category,
    autoPlay: true,
    replayEnabled: true,
    showText: true,
    voiceMode: 'RECORDED',
    locale: 'fr-FR',
    updatedAt: Date.now(),
    ...options,
  };
}

export interface VoiceDashboard {
  total: number;
  ok: number;
  missing: number;
  outdated: number;
  textOnly: number;
}

/** CONCEPTION §116 — chiffres du tableau de bord des voix. */
export function voiceDashboard(bundle: ContentBundle): VoiceDashboard {
  const counters: VoiceDashboard = { total: 0, ok: 0, missing: 0, outdated: 0, textOnly: 0 };
  for (const voice of bundle.voiceMessages) {
    counters.total += 1;
    switch (voiceStatus(voice)) {
      case 'VOICE_OK':
        counters.ok += 1;
        break;
      case 'VOICE_MISSING':
        counters.missing += 1;
        break;
      case 'VOICE_OUTDATED':
        counters.outdated += 1;
        break;
      case 'TEXT_ONLY':
        counters.textOnly += 1;
        break;
      default:
        break;
    }
  }
  return counters;
}

/** CONCEPTION §52 / §117 — file de la session de doublage. */
export function voicesToRecord(bundle: ContentBundle): VoiceMessage[] {
  return bundle.voiceMessages.filter((voice) => {
    const status = voiceStatus(voice);
    return status === 'VOICE_MISSING' || status === 'VOICE_OUTDATED';
  });
}
