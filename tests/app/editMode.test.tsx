import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
import {
  AudioService,
  ContentService,
  localBackend,
  LOCAL_ADMIN_CODE,
  setBackend,
} from '../../src/services';
import { resetDb } from '../../src/services/db';

/**
 * MODE ÉDITION — éditer l'aventure DANS l'aventure.
 *
 * Ce que ces tests garantissent :
 *  - l'enfant ne voit JAMAIS l'outillage adulte ;
 *  - un adulte peut modifier ce qu'il a sous les yeux ;
 *  - la modification apparaît immédiatement sur l'écran de l'enfant ;
 *  - rien n'est publié pour autant : c'est un brouillon (§99).
 */
beforeEach(() => {
  resetDb();
  setBackend(localBackend);
  ContentService.invalidate();
  AudioService.reset();
  localStorage.clear();
  window.location.hash = '';
});

function goTo(hash: string): void {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

/** Crée un profil : sans lui, l'espace parents n'a rien à montrer. */
async function startAdventure(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const nickname = await screen.findByPlaceholderText('Ton prénom', undefined, { timeout: 5000 });
  await user.type(nickname, 'Lucie');
  await user.click(screen.getByRole('button', { name: /commencer l’aventure/iu }));
  await screen.findByRole('button', { name: 'Partir !' });
}

/**
 * Franchit la barrière d'accès (§93). Elle ne se présente qu'une fois par
 * session : une fois entré, l'adulte y revient sans ressaisir son code.
 */
async function becomeAdmin(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  goTo('#/admin');
  await screen.findByText(/espace administrateur|Pokexplo — Admin/iu, undefined, { timeout: 5000 });

  const code = screen.queryByLabelText(/code d’accès/iu);
  if (code) {
    await user.type(code, LOCAL_ADMIN_CODE);
    await user.click(screen.getByRole('button', { name: 'Entrer' }));
  }
  await screen.findByText('Pokexplo — Admin', undefined, { timeout: 5000 });
}

async function enterEditMode(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  goTo('#/parents');
  await user.click(
    await screen.findByRole('button', { name: /modifier l’aventure/iu }, { timeout: 5000 }),
  );
  await screen.findByText('Mode édition', undefined, { timeout: 5000 });
}

describe('L’enfant ne voit jamais l’outillage adulte', () => {
  it('n’affiche ni bandeau ni bouton d’édition sans administrateur', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startAdventure(user);

    expect(screen.queryByText('Mode édition')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Modifier /iu })).not.toBeInTheDocument();

    goTo('#/parents');
    await screen.findByText(/espace parents — lucie/iu);
    // Le bouton d'édition n'existe que pour un adulte identifié (§93).
    expect(screen.queryByRole('button', { name: /modifier l’aventure/iu })).not.toBeInTheDocument();
  }, 20_000);
});

describe('Éditer là où on le voit', () => {
  it('propose une zone modifiable sur chaque lieu de la carte', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startAdventure(user);
    await becomeAdmin(user);
    await enterEditMode(user);

    goTo('#/play/map');
    expect(
      await screen.findByRole('button', { name: /modifier le lieu centre/iu }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Modifier la région Prairie des Premiers Pas' }),
    ).toBeInTheDocument();
  }, 20_000);

  it('renomme un lieu depuis la carte, et la carte suit aussitôt', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startAdventure(user);
    await becomeAdmin(user);
    await enterEditMode(user);

    goTo('#/play/map');
    await user.click(
      await screen.findByRole('button', { name: /modifier le lieu prairie/iu }, { timeout: 5000 }),
    );

    const field = await screen.findByLabelText(/^Nom du lieu/u);
    await user.clear(field);
    await user.type(field, 'Grand jardin');

    await user.click(screen.getByRole('button', { name: 'Terminé' }));
    // La carte de l'enfant affiche immédiatement le brouillon (§118).
    expect(await screen.findByRole('button', { name: /modifier le lieu grand jardin/iu })).toBeInTheDocument();
  }, 20_000);

  it('modifie le titre du chapitre depuis le Centre', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startAdventure(user);
    await becomeAdmin(user);
    await enterEditMode(user);

    await user.click(
      await screen.findByRole('button', { name: /modifier le chapitre/iu }, { timeout: 5000 }),
    );
    const field = await screen.findByLabelText('Titre du chapitre');
    await user.clear(field);
    await user.type(field, 'Le grand départ');

    await user.click(screen.getByRole('button', { name: 'Terminé' }));
    expect(await screen.findByText('Le grand départ')).toBeInTheDocument();
  }, 20_000);

  it('ne publie rien : la version servie à l’enfant reste inchangée (§99)', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startAdventure(user);
    await becomeAdmin(user);
    const before = (await ContentService.load(true)).meta.currentReleaseId;

    await enterEditMode(user);
    goTo('#/play/map');
    await user.click(
      await screen.findByRole('button', { name: /modifier le lieu prairie/iu }, { timeout: 5000 }),
    );
    const field = await screen.findByLabelText(/^Nom du lieu/u);
    await user.clear(field);
    await user.type(field, 'Pré des Lucioles');
    await user.click(screen.getByRole('button', { name: 'Terminé' }));

    const published = await ContentService.load(true);
    expect(published.meta.currentReleaseId).toBe(before);
    expect(published.bundle.nodes.some((node) => node.label === 'Pré des Lucioles')).toBe(false);
  }, 20_000);

  it('rend l’écran à l’enfant en quittant le mode édition', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startAdventure(user);
    await becomeAdmin(user);
    await enterEditMode(user);

    await user.click(screen.getByRole('button', { name: /quitter l’édition/iu }));
    expect(screen.queryByText('Mode édition')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Modifier le chapitre/iu })).not.toBeInTheDocument();
  }, 20_000);
});
