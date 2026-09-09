import type { ContentBundle, ExerciseTemplate, VoiceMessage } from '../../types';

/**
 * TEXTES D'UNE MATRICE D'EXERCICE.
 *
 * Chaque texte destiné à l'enfant existe à DEUX endroits : dans la matrice
 * (ce qui est affiché) et dans une `VoiceMessage` (ce qui est lu). S'ils
 * divergent, l'enfant lit une phrase et en entend une autre.
 *
 * Cette fonction est le seul endroit qui les écrit, pour les menus comme pour
 * le mode édition. Le texte se saisit dans `VoiceTextEditor` (CLAUDE.md §3) :
 * c'est lui qui met à jour le `textHash` et signale une voix devenue obsolète.
 */
export type TemplateTextField = 'prompt' | 'hint1Text' | 'hint2Text' | 'successText';

export interface TemplateTextBlock {
  field: TemplateTextField;
  title: string;
  /** Identifiant de la `VoiceMessage` associée, tel que déclaré par la matrice. */
  voiceId: string;
  text: string;
}

/** Les quatre textes d'une matrice, dans l'ordre où l'enfant les entend. */
export function templateTextBlocks(template: ExerciseTemplate): TemplateTextBlock[] {
  return [
    {
      field: 'prompt',
      title: 'Consigne',
      voiceId: template.audio.question?.voiceId ?? `voice.ex.${template.id}.q`,
      text: template.prompt,
    },
    {
      field: 'hint1Text',
      title: 'Premier indice',
      voiceId: template.audio.hint1?.voiceId ?? `voice.ex.${template.id}.h1`,
      text: template.hint1Text,
    },
    {
      field: 'hint2Text',
      title: 'Second indice',
      voiceId: template.audio.hint2?.voiceId ?? `voice.ex.${template.id}.h2`,
      text: template.hint2Text,
    },
    {
      field: 'successText',
      title: 'Félicitations',
      voiceId: template.audio.success?.voiceId ?? `voice.ex.${template.id}.ok`,
      text: template.successText,
    },
  ];
}

/**
 * Écrit la voix ET le texte affiché en une seule modification du brouillon,
 * pour qu'ils ne puissent pas diverger.
 */
export function applyTemplateVoice(
  bundle: ContentBundle,
  templateId: string,
  field: TemplateTextField,
  voice: VoiceMessage,
): ContentBundle {
  const known = bundle.voiceMessages.some((entry) => entry.id === voice.id);
  return {
    ...bundle,
    exerciseTemplates: bundle.exerciseTemplates.map((entry) =>
      entry.id === templateId ? ({ ...entry, [field]: voice.text } as ExerciseTemplate) : entry,
    ),
    voiceMessages: known
      ? bundle.voiceMessages.map((entry) => (entry.id === voice.id ? voice : entry))
      : [...bundle.voiceMessages, voice],
  };
}
