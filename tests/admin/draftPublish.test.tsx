import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import {
  ContentProvider,
  useContent,
  type ContentContextValue,
} from '../../src/app/providers/ContentProvider';
import {
  AdminDraftProvider,
  useAdminDraft,
  type AdminDraftValue,
} from '../../src/features/admin/AdminDraftContext';
import { ContentService, localBackend, setBackend } from '../../src/services';
import { resetDb } from '../../src/services/db';

/**
 * « MON ENFANT VOIT-IL MES MODIFICATIONS ? »
 *
 * Deux promesses, et ce sont les deux qui étaient rompues :
 *  - publier change RÉELLEMENT ce que joue l'enfant, et l'indicateur le dit ;
 *  - une retouche faite juste avant de sortir n'est JAMAIS abandonnée.
 *
 * On travaille ici sur le fournisseur lui-même : c'est le seul endroit où l'on
 * peut sortir de l'écran sans laisser au minuteur d'enregistrement le temps de
 * partir — exactement ce que fait un adulte pressé.
 */
beforeEach(() => {
  resetDb();
  setBackend(localBackend);
  ContentService.invalidate();
  localStorage.clear();
});

/** Donne accès au brouillon depuis le test, sans passer par l'interface. */
function Probe({ onValue }: { onValue: (value: AdminDraftValue) => void }) {
  const value = useAdminDraft();
  useEffect(() => {
    onValue(value);
  }, [value, onValue]);
  return null;
}

function labelOf(nodes: Array<{ id: string; label: string }>): string | undefined {
  return nodes.find((node) => node.id === 'prairie-1')?.label;
}

/** Ce que le joueur a réellement à l'écran, tel que le sert le fournisseur. */
function ServedProbe({ onValue }: { onValue: (value: ContentContextValue) => void }) {
  const value = useContent();
  useEffect(() => {
    onValue(value);
  }, [value, onValue]);
  return null;
}

async function mountDraft(): Promise<{
  api: () => AdminDraftValue;
  served: () => ContentContextValue;
  unmount: () => void;
}> {
  let latest: AdminDraftValue | null = null;
  let content: ContentContextValue | null = null;
  const view = render(
    <ContentProvider>
      <ServedProbe
        onValue={(value) => {
          content = value;
        }}
      />
      <AdminDraftProvider>
        <Probe
          onValue={(value) => {
            latest = value;
          }}
        />
      </AdminDraftProvider>
    </ContentProvider>,
  );
  await waitFor(() => expect(latest?.draft).toBeTruthy(), { timeout: 5000 });
  return {
    api: () => latest as unknown as AdminDraftValue,
    served: () => content as unknown as ContentContextValue,
    unmount: () => view.unmount(),
  };
}

function rename(api: AdminDraftValue, label: string): void {
  act(() => {
    api.update((draft) => ({
      ...draft,
      nodes: draft.nodes.map((node) => (node.id === 'prairie-1' ? { ...node, label } : node)),
    }));
  });
}

describe('Publier depuis n’importe où', () => {
  it('efface « non publié » et change ce que voit l’enfant', async () => {
    const { api, served } = await mountDraft();
    expect(api().unpublished).toBe(false);

    rename(api(), 'Grand jardin');
    // Dit dès la première retouche, sans attendre l'enregistrement différé.
    await waitFor(() => expect(api().unpublished).toBe(true));

    // §53 — des textes sans voix ne bloquent pas : la synthèse prend le relais.
    const result = await act(async () => api().publish({ force: true }));
    expect(result.ok).toBe(true);

    await waitFor(() => expect(api().unpublished).toBe(false));
    const published = await ContentService.load(true);
    expect(labelOf(published.bundle.nodes)).toBe('Grand jardin');

    /*
     * Et surtout : le contenu SERVI a été relu. C'est la cause exacte du
     * « mes modifications ne prennent pas effet » — la release partait bien,
     * mais l'écran continuait d'afficher le bundle chargé au démarrage.
     */
    await waitFor(() => expect(labelOf(served().bundle?.nodes ?? [])).toBe('Grand jardin'));
  }, 20_000);

  it('enregistre la retouche en attente avant de publier', async () => {
    const { api } = await mountDraft();
    // Aucune attente entre la retouche et la publication : l'écriture différée
    // n'est pas partie. Publier doit tout de même la faire aboutir sur disque.
    rename(api(), 'Clairière fleurie');
    await act(async () => api().publish({ force: true }));

    expect(labelOf((await ContentService.getDraft()).nodes)).toBe('Clairière fleurie');
  }, 20_000);
});

describe('Une retouche n’est jamais perdue', () => {
  it('enregistre ce qui attendait, même si l’on quitte aussitôt', async () => {
    const { api, unmount } = await mountDraft();
    rename(api(), 'Pré des Lucioles');

    // On quitte le mode édition dans la seconde : le minuteur n'a pas fini.
    // L'ancienne version l'annulait — la retouche disparaissait en silence.
    unmount();

    await waitFor(async () => {
      expect(labelOf((await ContentService.getDraft()).nodes)).toBe('Pré des Lucioles');
    });
  }, 20_000);
});
