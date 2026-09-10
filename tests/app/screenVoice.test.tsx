import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { AudioService, ContentService, localBackend, setBackend } from '../../src/services';
import { resetDb } from '../../src/services/db';
import { defaultContentBundle } from '../../src/content/defaultContent';
import { SCREEN_VOICES } from '../../src/content/voices';
import { useScreenVoice } from '../../src/app/providers/useScreenVoice';
import { renderWithProviders } from '../helpers/renderWithProviders';

/**
 * LA VOIX GUIDE AUSSI LA NAVIGATION (UI_DESIGN §192).
 *
 * Cette règle était gardée par un test e2e qui espionnait la synthèse vocale du
 * navigateur. La synthèse a été retirée (§127) : on ne lit plus que les voix
 * enregistrées par l'adulte, et il n'y en a aucune dans un navigateur de test.
 *
 * Ce qui reste vérifiable — et qui est le vrai contrat — tient en deux points :
 * l'écran DEMANDE sa voix d'arrivée, et cette voix existe dans le contenu. Le
 * jour où l'adulte l'enregistre, elle se fait entendre sans une ligne de code.
 */
beforeEach(() => {
  resetDb();
  setBackend(localBackend);
  ContentService.invalidate();
  AudioService.reset();
});

function Screen({ voiceId }: { voiceId: string }) {
  useScreenVoice(voiceId);
  return <p>écran</p>;
}

describe('Annonce vocale des écrans enfant (§192)', () => {
  it('chaque écran a bien une voix d’arrivée dans le contenu', () => {
    const bundle = defaultContentBundle();
    for (const voiceId of Object.values(SCREEN_VOICES)) {
      const message = bundle.voiceMessages.find((voice) => voice.id === voiceId);
      expect(message, `voix manquante : ${voiceId}`).toBeDefined();
      // Sans texte, il n'y aurait rien à enregistrer ni à afficher.
      expect(message?.text.trim().length).toBeGreaterThan(0);
      expect(message?.autoPlay).toBe(true);
    }
  });

  it('demande sa voix à l’arrivée, même si rien n’est encore enregistré', async () => {
    const play = vi.spyOn(AudioService, 'playVoice');
    renderWithProviders(<Screen voiceId={SCREEN_VOICES.map} />);

    await waitFor(() =>
      expect(play).toHaveBeenCalledWith(expect.objectContaining({ id: SCREEN_VOICES.map })),
    );
  });

  it('ne réannonce pas l’écran à chaque re-rendu', async () => {
    const play = vi.spyOn(AudioService, 'playVoice');
    const { rerender } = renderWithProviders(<Screen voiceId={SCREEN_VOICES.pokedex} />);

    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    rerender(<Screen voiceId={SCREEN_VOICES.pokedex} />);
    expect(play).toHaveBeenCalledTimes(1);
  });
});
