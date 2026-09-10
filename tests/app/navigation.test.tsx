import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
import {
  AudioService,
  ContentService,
  localBackend,
  LOCAL_ADMIN_CODE,
  SaveService,
  setBackend,
} from '../../src/services';
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
    expect(await screen.findByRole('button', { name: 'Partir à l’aventure !' })).toBeInTheDocument();
    const menu = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(within(menu).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Équipe', 'Pokédex', 'Objets', 'Exercices', 'Carte', 'Parents',
    ]);
    await user.click(within(menu).getByRole('button', { name: 'Objets' }));
    await user.click(await screen.findByRole('button', { name: 'Mes badges' }));
    expect(await screen.findByText('Tes badges')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retour' }));
    await user.click(await screen.findByRole('button', { name: 'Exercices' }));
    await user.click(await screen.findByRole('button', { name: 'Commencer' }));
    expect(await screen.findByRole('button', { name: 'Écouter la consigne' })).toBeInTheDocument();

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
    await screen.findByRole('button', { name: 'Partir à l’aventure !' });

    act(() => {
      window.location.hash = '#/parents';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(await screen.findByText(/espace parents — lucie/iu)).toBeInTheDocument();
  });
});

describe('Retour à l’accueil et version installée', () => {
  /**
   * Ouvre l'Admin. La barrière d'accès (§93) n'apparaît qu'une fois par
   * session : une fois franchie, l'adulte y revient sans ressaisir son code.
   */
  async function openAdmin(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    act(() => {
      window.location.hash = '#/admin';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    await screen.findByText(/espace administrateur|Pokexplo — Admin/iu, undefined, {
      timeout: 5000,
    });

    const code = screen.queryByLabelText(/code d’accès/iu);
    if (code) {
      await user.type(code, LOCAL_ADMIN_CODE);
      await user.click(screen.getByRole('button', { name: 'Entrer' }));
    }
    await screen.findByText('Pokexplo — Admin', undefined, { timeout: 5000 });
  }

  it('affiche la version installée sous « Pokexplo — Admin »', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAdmin(user);

    const brand = await screen.findByText('Pokexplo — Admin', undefined, { timeout: 5000 });
    const identity = brand.parentElement!;
    // La version est juste dessous, dans le même bloc d'identité.
    expect(identity).toHaveTextContent(/Version\s+\S+/u);
  });

  it('ramène à l’accueil depuis l’Admin', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openAdmin(user);

    await user.click(
      await screen.findByRole('button', { name: 'Accueil' }, { timeout: 5000 }),
    );
    expect(window.location.hash).toBe('#/');
  });

  it('ramène à l’accueil depuis l’espace parents', async () => {
    const user = userEvent.setup();
    render(<App />);

    const nickname = await screen.findByPlaceholderText('Ton prénom', undefined, { timeout: 5000 });
    await user.type(nickname, 'Lucie');
    await user.click(screen.getByRole('button', { name: /commencer l’aventure/iu }));
    await screen.findByRole('button', { name: 'Partir à l’aventure !' });

    act(() => {
      window.location.hash = '#/parents';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    await screen.findByText(/espace parents — lucie/iu);

    await user.click(screen.getByRole('button', { name: /accueil/iu }));
    expect(window.location.hash).toBe('#/');
  });
});
