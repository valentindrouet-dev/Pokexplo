import { describe, expect, it } from 'vitest';
import { defaultContentBundle } from '../../src/content/defaultContent';
import { EXERCISE_TYPES, generateExercise } from '../../src/exercise-engine';
import { addTemplate, createTemplate } from '../../src/features/admin/templateFactory';
import { createNodeAfter, removalBlocker, removeNode } from '../../src/features/admin/nodeFactory';
import { isCrowded } from '../../src/features/world-map/mapGeometry';
import { ContentService } from '../../src/services';

/**
 * AJOUTER DEPUIS L'ÉDITEUR VISUEL.
 *
 * Un « + » ne sert à rien s'il crée quelque chose d'injouable. Chaque
 * fabrique doit produire un contenu qui passe la validation ET que le moteur
 * sait faire tourner tout de suite.
 */
describe('Nouvelle matrice d’exercice', () => {
  for (const type of EXERCISE_TYPES) {
    it(`${type} : jouable immédiatement, valide, avec ses quatre voix`, () => {
      const bundle = defaultContentBundle();
      const created = createTemplate(type, bundle.skills);
      expect(created.template.type).toBe(type);
      expect(created.voices).toHaveLength(4);
      expect(created.voices.map((voice) => voice.id)).toEqual([
        `voice.ex.${created.template.id}.q`,
        `voice.ex.${created.template.id}.h1`,
        `voice.ex.${created.template.id}.h2`,
        `voice.ex.${created.template.id}.ok`,
      ]);

      const next = addTemplate(bundle, created, 'prairie-1');
      const errors = ContentService.validate(next).issues.filter((issue) => issue.level === 'ERROR');
      expect(errors).toEqual([]);
      expect(next.nodes.find((node) => node.id === 'prairie-1')?.exerciseTemplateIds).toContain(
        created.template.id,
      );

      // Le moteur produit une instance sans lever, pour plusieurs tirages.
      for (const seed of [1, 7, 42]) {
        const instance = generateExercise(created.template, seed, {
          creatures: bundle.creatures,
          capturedIds: [],
        });
        expect(instance.choices.length).toBeGreaterThanOrEqual(2);
        expect(instance.choices.some((choice) => choice.id === instance.correctChoiceId)).toBe(true);
      }
    });
  }
});

describe('Nouveau lieu à côté d’un voisin', () => {
  it('est relié à son voisin, dans sa région, et hérite de quoi jouer', () => {
    const bundle = defaultContentBundle();
    const { bundle: next, node } = createNodeAfter(bundle, 'prairie-2');

    expect(node.biomeId).toBe('prairie');
    expect(node.kind).toBe('ENCOUNTER');
    expect(next.nodes.find((entry) => entry.id === 'prairie-2')?.connections).toContain(node.id);
    expect(node.encounters?.length).toBeGreaterThan(0);
    expect(node.exerciseTemplateIds?.length).toBeGreaterThan(0);
    expect(next.voiceMessages.some((voice) => voice.id === node.arrivalVoiceId)).toBe(true);
    // Il ne se pose jamais sur un autre lieu.
    expect(isCrowded(node, bundle.nodes, null)).toBe(false);
    expect(ContentService.validate(next).issues.filter((i) => i.level === 'ERROR')).toEqual([]);
  });

  it('sans voisin, se pose au milieu de la carte sur une place libre', () => {
    const bundle = defaultContentBundle();
    const { node } = createNodeAfter(bundle, null);
    expect(node.biomeId).toBe(bundle.biomes[0]!.id);
    expect(isCrowded(node, bundle.nodes, null)).toBe(false);
  });
});

describe('Retirer un lieu', () => {
  it('refuse le Centre et les lieux qui portent une Arène', () => {
    const bundle = defaultContentBundle();
    expect(removalBlocker(bundle, 'centre')).toMatch(/Centre/u);
    expect(removalBlocker(bundle, 'arene-pierre')).toMatch(/Arène/u);
    expect(removalBlocker(bundle, 'foret-3')).toMatch(/spéciale/u);
    expect(removalBlocker(bundle, 'prairie-3')).toBeNull();
  });

  it('retire aussi les chemins qui y menaient, et garde la voix', () => {
    const bundle = defaultContentBundle();
    const next = removeNode(bundle, 'prairie-3');
    expect(next.nodes.some((node) => node.id === 'prairie-3')).toBe(false);
    expect(next.nodes.every((node) => !node.connections.includes('prairie-3'))).toBe(true);
    expect(next.nodes.every((node) => !(node.requires?.nodes ?? []).includes('prairie-3'))).toBe(true);
    expect(next.voiceMessages.some((voice) => voice.id === 'voice.node.prairie3')).toBe(true);
    expect(ContentService.validate(next).issues.filter((i) => i.level === 'ERROR')).toEqual([]);
  });
});

describe('Validation : lieux trop proches', () => {
  it('prévient quand deux lieux se touchent', () => {
    const bundle = defaultContentBundle();
    const prairie = bundle.nodes.find((node) => node.id === 'prairie-1')!;
    bundle.nodes.push({ ...prairie, id: 'double', label: 'Doublon', x: prairie.x + 2 });
    const warnings = ContentService.validate(bundle).issues.filter((i) => i.code === 'NODE_CROWDED');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.message).toMatch(/Prairie.*Doublon/u);
  });

  it('ne dit rien sur le contenu livré', () => {
    const warnings = ContentService.validate(defaultContentBundle()).issues.filter(
      (i) => i.code === 'NODE_CROWDED',
    );
    expect(warnings).toEqual([]);
  });
});
