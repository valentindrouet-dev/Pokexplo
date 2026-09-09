import { describe, expect, it } from 'vitest';
import { applyTemplateVoice, templateTextBlocks } from '../../src/features/admin/exerciseText';
import { defaultContentBundle } from '../../src/content/defaultContent';
import { createVoiceMessage } from '../../src/utils/voice';

/**
 * TEXTES D'EXERCICE : AFFICHÉ ET LU NE DOIVENT JAMAIS DIVERGER.
 *
 * Chaque consigne existe dans la matrice (ce qui s'affiche) et dans une
 * VoiceMessage (ce qui se dit). Deux écrans les modifient — les menus et le
 * mode édition — et tous deux passent par ici.
 */
describe('Textes d’une matrice d’exercice', () => {
  const bundle = defaultContentBundle();
  const template = bundle.exerciseTemplates[0]!;

  it('expose les quatre textes destinés à l’enfant, avec leur voix', () => {
    const blocks = templateTextBlocks(template);
    expect(blocks.map((block) => block.field)).toEqual([
      'prompt',
      'hint1Text',
      'hint2Text',
      'successText',
    ]);
    for (const block of blocks) {
      expect(block.voiceId.length).toBeGreaterThan(0);
      expect(bundle.voiceMessages.some((voice) => voice.id === block.voiceId)).toBe(true);
    }
  });

  it('écrit le texte affiché et le texte lu ensemble', () => {
    const block = templateTextBlocks(template)[0]!;
    const voice = bundle.voiceMessages.find((entry) => entry.id === block.voiceId)!;

    const next = applyTemplateVoice(bundle, template.id, 'prompt', {
      ...voice,
      text: 'Combien y a-t-il de créatures ?',
    });

    const updated = next.exerciseTemplates.find((entry) => entry.id === template.id)!;
    const updatedVoice = next.voiceMessages.find((entry) => entry.id === block.voiceId)!;
    expect(updated.prompt).toBe('Combien y a-t-il de créatures ?');
    expect(updatedVoice.text).toBe('Combien y a-t-il de créatures ?');
    // L'enfant ne doit jamais lire une phrase et en entendre une autre.
    expect(updated.prompt).toBe(updatedVoice.text);
  });

  it('n’altère ni le brouillon d’origine ni les autres matrices', () => {
    const block = templateTextBlocks(template)[0]!;
    const voice = bundle.voiceMessages.find((entry) => entry.id === block.voiceId)!;
    const before = template.prompt;

    const next = applyTemplateVoice(bundle, template.id, 'prompt', { ...voice, text: 'Autre' });

    expect(bundle.exerciseTemplates[0]?.prompt).toBe(before);
    expect(next.exerciseTemplates).toHaveLength(bundle.exerciseTemplates.length);
    expect(next.voiceMessages).toHaveLength(bundle.voiceMessages.length);
    for (const other of next.exerciseTemplates.filter((entry) => entry.id !== template.id)) {
      const original = bundle.exerciseTemplates.find((entry) => entry.id === other.id)!;
      expect(other.prompt).toBe(original.prompt);
    }
  });

  it('ajoute la voix si la matrice n’en avait pas encore', () => {
    const orphan = { ...bundle, voiceMessages: [] };
    const block = templateTextBlocks(template)[0]!;
    const next = applyTemplateVoice(
      orphan,
      template.id,
      'prompt',
      createVoiceMessage(block.voiceId, 'Nouvelle consigne', 'exercises'),
    );

    expect(next.voiceMessages).toHaveLength(1);
    expect(next.exerciseTemplates.find((entry) => entry.id === template.id)?.prompt).toBe(
      'Nouvelle consigne',
    );
  });
});
