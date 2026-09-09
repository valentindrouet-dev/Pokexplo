import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
import { AudioService, localBackend, SaveService, setBackend, ContentService } from '../../src/services';
import { resetDb } from '../../src/services/db';

/**
 * Regressions signalées sur iPad :
 *  - « Commencer l'aventure » ne faisait rien ;
 *  - l'espace parents restait bloqué sur « Un instant… ».
 *
 * Ces tests reproduisent les deux situations depuis l'application complète.
 */

beforeEach(() => {
  resetDb();
  setBackend(localBackend);
  ContentService.invalidate();
  AudioService.reset();
  localStorage.clear();
  window.location.hash = '';
});

describe('Démarrage de l’aventure (CONCEPTION §64, §130)', () => {
  it('entre dans le jeu même si le navigateur ne répond jamais au déblocage audio', async () => {
    const user = userEvent.setup();
    // iPadOS : `play()` peut rester indéfiniment en attente.
    vi.spyOn(AudioService, 'unlock').mockReturnValue(new Promise<void>(() => undefined));

    render(<App />);

    const nickname = await screen.findByPlaceholderText('Ton prénom', undefined, { timeout: 5000 });
    await user.type(nickname, 'Lucie');
    await user.click(screen.getByRole('button', { name: /commencer l’aventure/iu }));

    // Le Centre s'ouvre : la navigation n'attend pas la réponse du navigateur.
    expect(await screen.findByRole('button', { name: 'Partir !' })).toBeInTheDocument();
  });

  it('tente quand même de débloquer l’audio dans le geste de l’enfant', async () => {
    const user = userEvent.setup();
    const unlock = vi.spyOn(AudioService, 'unlock');

    render(<App />);
    const nickname = await screen.findByPlaceholderText('Ton prénom', undefined, { timeout: 5000 });
    await user.type(nickname, 'Lucie');
    await user.click(screen.getByRole('button', { name: /commencer l’aventure/iu }));

    expect(unlock).toHaveBeenCalled();
  });

  it('relâche le bouton et prévient si la création du profil échoue', async () => {
    const user = userEvent.setup();
    vi.spyOn(SaveService, 'create').mockRejectedValue(new Error('stockage indisponible'));

    render(<App />);
    const nickname = await screen.findByPlaceholderText('Ton prénom', undefined, { timeout: 5000 });
    await user.type(nickname, 'Lucie');

    const button = screen.getByRole('button', { name: /commencer l’aventure/iu });
    await user.click(button);

    expect(await screen.findByText(/n’a pas pu démarrer/iu)).toBeInTheDocument();
    // Le bouton reste utilisable : on peut réessayer.
    expect(screen.getByRole('button', { name: /commencer l’aventure/iu })).toBeEnabled();
  });
});

describe('Espace parents (CONCEPTION §77, §175)', () => {
  it('s’ouvre et s’explique quand aucun profil n’existe encore', async () => {
    window.location.hash = '#/parents';
    render(<App />);

    expect(
      await screen.findByText(/aucun profil n’a encore été créé/iu, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    // Il y a toujours une sortie : jamais un écran de chargement sans fin.
    expect(screen.getByRole('button', { name: /créer un profil/iu })).toBeInTheDocument();
  });

  it('affiche la progression dès qu’un profil existe', async () => {
    const user = userEvent.setup();
    render(<App />);

    const nickname = await screen.findByPlaceholderText('Ton prénom', undefined, { timeout: 5000 });
    await user.type(nickname, 'Lucie');
    await user.click(screen.getByRole('button', { name: /commencer l’aventure/iu }));
    await screen.findByRole('button', { name: 'Partir !' });

    act(() => {
      window.location.hash = '#/parents';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(await screen.findByText(/espace parents — lucie/iu)).toBeInTheDocument();
  });
});
