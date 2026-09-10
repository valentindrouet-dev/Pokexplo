import type { MediaPath, VoiceMessageId } from './ids';

/** Canal de lecture : la voix a toujours la priorite (CONCEPTION §68). */
export type AudioChannel = 'voice' | 'music' | 'sfx';

/**
 * Mode de restitution d'un bloc « texte + voix ».
 *
 *  - 'RECORDED' : on joue la prise de l'adulte, si elle existe ;
 *  - 'NONE' : texte seul, volontairement muet ;
 *  - 'TTS' : valeur HERITEE, plus jamais produite. La synthese vocale du
 *    navigateur a ete retiree (§127) : on ne lit que les voix enregistrees.
 *    Les anciennes donnees qui la portent se comportent comme 'RECORDED'.
 */
export type VoiceMode = 'RECORDED' | 'TTS' | 'NONE';

/** CONCEPTION §51 : statut d'un bloc texte + voix, affiche dans l'Admin. */
export type VoiceStatus =
  | 'NO_TEXT'
  | 'TEXT_ONLY'
  | 'VOICE_OK'
  | 'VOICE_OUTDATED'
  | 'VOICE_MISSING';

/** CONCEPTION §49. */
export interface VoiceMessage {
  id: VoiceMessageId;
  /** Texte affiche a l'enfant, et lu par la voix enregistree. */
  text: string;
  /** Chemin du fichier dans le magasin de medias. Jamais le son lui-meme (§72). */
  audioPath?: MediaPath;
  mimeType?: string;
  /** Duree en secondes. */
  duration?: number;
  /** Empreinte du texte au moment de la prise (§50). */
  textHash?: string;
  autoPlay: boolean;
  replayEnabled: boolean;
  showText: boolean;
  /** Mode de restitution souhaite. */
  voiceMode: VoiceMode;
  /** Locale de la voix : permet des voix anglaises dediees (§30). */
  locale: 'fr-FR' | 'en-GB' | 'en-US';
  /** Regroupement pour la session de doublage et le stockage (§71). */
  category: VoiceCategory;
  /** Prise precedente conservee tant que la nouvelle n'est pas validee (§42). */
  previousTake?: VoiceTake;
  updatedAt: number;
}

export type VoiceCategory =
  | 'professor'
  | 'adventure'
  | 'gyms'
  | 'exercises'
  | 'tutorials'
  | 'quests'
  | 'ui';

/** Une prise d'enregistrement. */
export interface VoiceTake {
  audioPath: MediaPath;
  mimeType: string;
  duration: number;
  textHash: string;
  recordedAt: number;
}

/** Reference vers une VoiceMessage depuis n'importe quel contenu. */
export interface VoiceReference {
  voiceId: VoiceMessageId;
}

/** CONCEPTION §55. */
export interface ExerciseAudio {
  question?: VoiceReference;
  hint1?: VoiceReference;
  hint2?: VoiceReference;
  success?: VoiceReference;
}

/** CONCEPTION §67 : volumes separes. */
export interface AudioSettings {
  voicesVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  /** Lecture automatique des dialogues (peut etre coupee par le parent). */
  autoPlayVoices: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  voicesVolume: 1,
  musicVolume: 0.45,
  sfxVolume: 0.8,
  muted: false,
  autoPlayVoices: true,
};
