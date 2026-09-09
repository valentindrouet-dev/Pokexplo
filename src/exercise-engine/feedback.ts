import type { VoiceMessageId } from '../types';

/**
 * CONCEPTION §14 — on n'affiche JAMAIS « mauvaise reponse ».
 * Ces phrases sont des contenus comme les autres : elles possedent un
 * identifiant de voix stable, enregistrable depuis l'Admin.
 */
export interface Encouragement {
  voiceId: VoiceMessageId;
  text: string;
}

export const RETRY_FIRST: Encouragement = {
  voiceId: 'voice.feedback.almost',
  text: 'Presque ! Regarde bien.',
};

export const RETRY_SECOND: Encouragement = {
  voiceId: 'voice.feedback.help',
  text: 'On regarde ensemble.',
};

export const SUCCESS_DEFAULT: Encouragement = {
  voiceId: 'voice.feedback.bravo',
  text: 'Bravo !',
};

export const SUCCESS_ASSISTED: Encouragement = {
  voiceId: 'voice.feedback.wellDone',
  text: 'Tu as trouvé !',
};

/** Toutes les voix systeme, pour que l'Admin puisse les lister et les enregistrer. */
export const SYSTEM_ENCOURAGEMENTS: Encouragement[] = [
  RETRY_FIRST,
  RETRY_SECOND,
  SUCCESS_DEFAULT,
  SUCCESS_ASSISTED,
];
