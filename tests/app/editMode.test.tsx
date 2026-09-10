import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
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
  await screen.findByRole('button', { name: 'Partir à l’aventure !' });
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

describe('Les voix de la page, sous les yeux (§196)', () => {
  it('ouvre les voix de l’écran depuis le bandeau d’édition', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startAdventure(user);
    await becomeAdmin(user);
    await enterEditMode(user);

    goTo('#/play/map');
    // Le bouton dit ce qu'il reste à faire : c'est l'information utile.
    const open = await screen.findByRole(
      'button',
      { name: /voix de cette page/iu },
      { timeout: 5000 },
    );
    await user.click(open);

    // On est bien sur les voix de LA CARTE, pas sur les deux cents autres.
    const dialog = await screen.findByRole('dialog', { name: 'Les voix de la carte' });
    await user.click(within(dialog).getByRole('button', { name: /où veux-tu aller/iu }));

    // L'enregistreur habituel, ouvert sous le texte concerné.
    expect(within(dialog).getByRole('button', { name: 'Enregistrer la voix' })).toBeInTheDocument();
  }, 20_000);

  it('modifie un texte destiné à l’enfant sans quitter l’écran', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startAdventure(user);
    await becomeAdmin(user);
    await enterEditMode(user);

    goTo('#/play/map');
    await user.click(
      await screen.findByRole('button', { name: /voix de cette page/iu }, { timeout: 5000 }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Les voix de la carte' });
    await user.click(within(dialog).getByRole('button', { name: /où veux-tu aller/iu }));

    const area = within(dialog).getByRole('textbox');
    await user.clear(area);
    await user.type(area, 'Choisis un endroit !');

    // Le brouillon a suivi : le texte modifié devient le titre de la ligne.
    expect(
      await within(dialog).findByRole('button', { name: /choisis un endroit/iu }),
    ).toBeInTheDocument();
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

describe('Ajouter depuis l’éditeur visuel', () => {
  it('le tiroir d’un lieu propose ses créatures, un nouvel exercice et un pictogramme', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startAdventure(user);
    await becomeAdmin(user);
    await enterEditMode(user);

    goTo('#/play/map');
    await user.click(
      await screen.findByRole('button', { name: /modifier le lieu prairie/iu }, { timeout: 5000 }),
    );
    const drawer = await screen.findByRole('dialog');

    // Les créatures que l'on peut rencontrer ici, à activer d'un geste.
    expect(within(drawer).getByRole('button', { name: 'Piloupi', pressed: true })).toBeInTheDocument();

    // Le pictogramme : celui de la région par défaut, remplaçable.
    expect(
      within(drawer).getByRole('button', { name: 'Pictogramme de la région', pressed: true }),
    ).toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: 'Champignon' }));
    expect(within(drawer).getByRole('button', { name: 'Champignon', pressed: true })).toBeInTheDocument();

    /*
     * Un nouvel exercice : deux questions en français — ce qu'on fait
     * travailler, à quel point c'est difficile (§196) — et il est attaché à ce
     * lieu puis ouvert aussitôt. Plus de liste de valeurs d'énumération.
     */
    await user.click(within(drawer).getByRole('button', { name: /créer un exercice pour ce lieu/iu }));
    const wizard = await screen.findByRole('dialog', { name: /que voulez-vous faire travailler/iu });
    await user.click(within(wizard).getByRole('button', { name: 'Syllabes' }));
    await user.click(await screen.findByRole('button', { name: 'Moyen' }));
    await user.click(screen.getByRole('button', { name: /créer l’exercice/iu }));
    expect(await screen.findByText(/Exercice — Syllabes — Moyen/u)).toBeInTheDocument();

    // L'écriture du brouillon est différée : on l'attend.
    await waitFor(
      async () => {
        const draft = await ContentService.getDraft();
        const node = draft.nodes.find((entry) => entry.id === 'prairie-1')!;
        expect(node.icon).toBe('mushroom');
        const created = draft.exerciseTemplates.find(
          (template) => template.type === 'SYLLABLE' && template.id.startsWith('ex_'),
        );
        expect(created).toBeDefined();
        // « Moyen » se traduit en réglages réels, pas seulement en étiquette.
        expect(created!.difficulty).toBe(3);
        expect(node.exerciseTemplateIds).toContain(created!.id);
      },
      { timeout: 4000 },
    );
  }, 30_000);

  it('le « + » d’un lieu en crée un autre à côté, relié à lui', async () => {
    const user = userEvent.setup();
    render(<App />);
    await startAdventure(user);
    await becomeAdmin(user);
    await enterEditMode(user);

    goTo('#/play/map');
    await user.click(
      await screen.findByRole('button', { name: 'Ajouter un lieu après Grand pré' }, { timeout: 5000 }),
    );
    expect(await screen.findByLabelText(/^Nom du lieu/u)).toHaveValue('Nouveau lieu');

    await waitFor(
      async () => {
        const draft = await ContentService.getDraft();
        const parent = draft.nodes.find((entry) => entry.id === 'prairie-2')!;
        const created = draft.nodes.find((entry) => entry.label === 'Nouveau lieu')!;
        expect(created).toBeDefined();
        expect(created.biomeId).toBe('prairie');
        expect(parent.connections).toContain(created.id);
        expect(created.exerciseTemplateIds).toEqual(parent.exerciseTemplateIds);
      },
      { timeout: 4000 },
    );
  }, 30_000);
});
