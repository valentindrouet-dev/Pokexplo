import { describe, expect, it } from 'vitest';
import { defaultContentBundle } from '../../src/content/defaultContent';
import { SCREEN_VOICES } from '../../src/content/voices';
import { pageVoices } from '../../src/features/admin/pageVoices';
import type { Route } from '../../src/app/routes';

/**
 * « QUELLES VOIX PARLENT ICI ? » (§196)
 *
 * Le contrat est double : ne rien oublier de ce que l'écran dit vraiment, et ne
 * jamais inventer une voix qui n'existe pas dans le contenu — sinon le bouton
 * « Voix de cette page » proposerait d'enregistrer du vide.
 */
const bundle = defaultContentBundle();

function idsOn(route: Route): string[] {
  return pageVoices(bundle, route).voices.map((voice) => voice.id);
}

describe('Les voix de la page courante', () => {
  it('donne à la carte son annonce d’arrivée et les voix des lieux', () => {
    const ids = idsOn({ name: 'map' });
    expect(ids).toContain(SCREEN_VOICES.map);
    for (const node of bundle.nodes) {
      if (node.arrivalVoiceId) expect(ids).toContain(node.arrivalVoiceId);
    }
  });

  it('donne au Pokédex les noms des créatures', () => {
    const ids = idsOn({ name: 'pokedex' });
    expect(ids).toContain(SCREEN_VOICES.pokedex);
    const named = bundle.creatures.filter((creature) => creature.nameVoiceId);
    expect(named.length).toBeGreaterThan(0);
    for (const creature of named) expect(ids).toContain(creature.nameVoiceId);
  });

  it('donne à l’Arène ses quatre répliques', () => {
    const gym = bundle.gyms[0];
    expect(gym).toBeDefined();
    const ids = idsOn({ name: 'gym', gymId: gym.id });
    for (const voiceId of [
      gym.introVoiceId,
      gym.requirementVoiceId,
      gym.encourageVoiceId,
      gym.victoryVoiceId,
    ]) {
      if (voiceId) expect(ids).toContain(voiceId);
    }
  });

  it('ne renvoie que des voix qui existent vraiment', () => {
    const known = new Set(bundle.voiceMessages.map((voice) => voice.id));
    const routes: Route[] = [
      { name: 'start' },
      { name: 'center' },
      { name: 'map' },
      { name: 'pokedex' },
      { name: 'team' },
      { name: 'badges' },
      { name: 'items' },
      { name: 'practice' },
      { name: 'quests' },
      { name: 'encounter', nodeId: bundle.nodes[1]?.id ?? '' },
      { name: 'gym', gymId: bundle.gyms[0]?.id ?? '' },
      { name: 'admin', section: 'creatures' },
      { name: 'admin', section: 'exercises' },
      { name: 'admin', section: 'world' },
      { name: 'admin', section: 'story' },
    ];

    for (const route of routes) {
      const ids = idsOn(route);
      for (const id of ids) expect(known.has(id), `${id} n’existe pas`).toBe(true);
      // Aucun doublon : la même voix ne doit pas se proposer deux fois.
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('ne propose rien là où l’enfant ne lit rien', () => {
    expect(idsOn({ name: 'admin', section: 'publish' })).toEqual([]);
    expect(idsOn({ name: 'admin', section: 'progress' })).toEqual([]);
    expect(idsOn({ name: 'parents' })).toEqual([]);
    // Sans contenu chargé, on ne casse pas : la liste est simplement vide.
    expect(pageVoices(null, { name: 'map' }).voices).toEqual([]);
  });

  it('nomme la page en français, pour l’adulte', () => {
    expect(pageVoices(bundle, { name: 'pokedex' }).title).toBe('le Pokédex');
    expect(pageVoices(bundle, { name: 'admin', section: 'story' }).title).toBe(
      'l’histoire et les Arènes',
    );
  });
});
