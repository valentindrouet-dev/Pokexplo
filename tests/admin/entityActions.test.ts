import { describe, expect, it } from 'vitest';
import { defaultContentBundle } from '../../src/content/defaultContent';
import {
  creatureBlocker,
  duplicateCreature,
  duplicateTemplate,
  removeCreature,
  removeTemplate,
  templateBlocker,
} from '../../src/features/admin/entityActions';
import { duplicateNode } from '../../src/features/admin/nodeFactory';
import { ContentService } from '../../src/services';

/**
 * DUPLIQUER ET SUPPRIMER (UI_DESIGN §196).
 *
 * Dupliquer n'a d'intérêt que si la copie est INDÉPENDANTE : renommer l'une
 * ne doit jamais changer ce que dit l'autre. C'est toute la difficulté, parce
 * que le nom vit aussi dans une `VoiceMessage`.
 */
function errorsOf(bundle: ReturnType<typeof defaultContentBundle>): string[] {
  return ContentService.validate(bundle)
    .issues.filter((issue) => issue.level === 'ERROR')
    .map((issue) => issue.message);
}

describe('Dupliquer une créature', () => {
  it('emporte sa voix : les deux noms restent indépendants', () => {
    const bundle = defaultContentBundle();
    const copy = duplicateCreature(bundle, 'piloupi')!;

    expect(copy.created.id).not.toBe('piloupi');
    expect(copy.created.name).toBe('Piloupi (copie)');
    // La copie ne partage AUCUNE voix avec l'original.
    expect(copy.created.nameVoiceId).not.toBe(
      bundle.creatures.find((item) => item.id === 'piloupi')!.nameVoiceId,
    );
    const voice = copy.bundle.voiceMessages.find((item) => item.id === copy.created.nameVoiceId);
    expect(voice?.text).toBe('Piloupi (copie)');
    expect(errorsOf(copy.bundle)).toEqual([]);
  });

  it('copie en profondeur : modifier la copie ne touche pas l’original', () => {
    const bundle = defaultContentBundle();
    const copy = duplicateCreature(bundle, 'piloupi')!;
    copy.created.visual.palette[0] = '#000001';
    expect(bundle.creatures.find((item) => item.id === 'piloupi')!.visual.palette[0]).not.toBe(
      '#000001',
    );
  });
});

describe('Supprimer une créature', () => {
  it('refuse tant qu’elle sert quelque part, et dit où', () => {
    const bundle = defaultContentBundle();
    expect(creatureBlocker(bundle, 'piloupi')).toMatch(/Prairie/u);
    expect(creatureBlocker(bundle, 'lianou')).toMatch(/spéciale/u);
  });

  it('garde la voix, et laisse un contenu valide', () => {
    const bundle = defaultContentBundle();
    // Une créature qu'on ne rencontre nulle part : on la fabrique pour le test.
    const orphan = duplicateCreature(bundle, 'piloupi')!;
    expect(creatureBlocker(orphan.bundle, orphan.created.id)).toBeNull();

    const after = removeCreature(orphan.bundle, orphan.created.id);
    expect(after.creatures.some((item) => item.id === orphan.created.id)).toBe(false);
    expect(after.voiceMessages.some((item) => item.id === orphan.created.nameVoiceId)).toBe(true);
    expect(errorsOf(after)).toEqual([]);
  });
});

describe('Dupliquer une matrice d’exercice', () => {
  it('emporte ses quatre voix, avec les textes de l’original', () => {
    const bundle = defaultContentBundle();
    const copy = duplicateTemplate(bundle, 'count-easy')!;

    expect(copy.created.label).toBe('Compter jusqu’à 5 (copie)');
    expect(copy.created.audio.question?.voiceId).toBe(`voice.ex.${copy.created.id}.q`);
    for (const suffix of ['q', 'h1', 'h2', 'ok']) {
      const voice = copy.bundle.voiceMessages.find(
        (item) => item.id === `voice.ex.${copy.created.id}.${suffix}`,
      );
      expect(voice, suffix).toBeDefined();
      expect(voice!.text.length).toBeGreaterThan(0);
    }
    expect(errorsOf(copy.bundle)).toEqual([]);
  });

  it('refuse la suppression tant qu’un lieu ou une Arène s’en sert', () => {
    const bundle = defaultContentBundle();
    expect(templateBlocker(bundle, 'count-easy')).toMatch(/Prairie/u);

    const copy = duplicateTemplate(bundle, 'count-easy')!;
    expect(templateBlocker(copy.bundle, copy.created.id)).toBeNull();
    const after = removeTemplate(copy.bundle, copy.created.id);
    expect(after.exerciseTemplates.some((item) => item.id === copy.created.id)).toBe(false);
    expect(errorsOf(after)).toEqual([]);
  });
});

describe('Dupliquer un lieu', () => {
  it('copie créatures et exercices, mais jamais les chemins ni l’Arène', () => {
    const bundle = defaultContentBundle();
    const after = duplicateNode(bundle, 'prairie-2', 'node_copy');
    const copy = after.nodes.find((node) => node.id === 'node_copy')!;
    const source = bundle.nodes.find((node) => node.id === 'prairie-2')!;

    expect(copy.label).toBe('Grand pré (copie)');
    expect(copy.biomeId).toBe(source.biomeId);
    expect(copy.encounters).toEqual(source.encounters);
    expect(copy.exerciseTemplateIds).toEqual(source.exerciseTemplateIds);
    // Les chemins décrivent la place de l'ORIGINAL dans l'aventure.
    expect(copy.connections).toEqual([]);
    expect(after.voiceMessages.some((voice) => voice.id === 'voice.node.node_copy')).toBe(true);
    expect(errorsOf(after)).toEqual([]);
  });

  it('une Arène dupliquée redevient un lieu ordinaire', () => {
    const after = duplicateNode(defaultContentBundle(), 'arene-pierre', 'node_gym_copy');
    const copy = after.nodes.find((node) => node.id === 'node_gym_copy')!;
    // Sans cela, deux lieux porteraient la même Arène.
    expect(copy.gymId).toBeUndefined();
    expect(copy.kind).toBe('ENCOUNTER');
    expect(errorsOf(after)).toEqual([]);
  });
});
