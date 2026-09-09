import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SITE_BUNDLE_PATH, SitePublishService, localBackend, setBackend } from '../../src/services';
import { resetDb } from '../../src/services/db';
import { defaultContentBundle } from '../../src/content/defaultContent';

/**
 * PUBLICATION DU CONTENU SUR LE SITE (CONCEPTION §91).
 *
 * Le parent modifie l'aventure depuis son ordinateur, appuie sur un bouton, et
 * l'iPad de l'enfant suit. Ce qui compte ici : un numero de version NEUF (sans
 * lui, l'iPad ne verrait rien), un contenu valide, et aucun secret ailleurs que
 * dans ce navigateur.
 */
beforeEach(() => {
  resetDb();
  setBackend(localBackend);
  SitePublishService.forgetToken();
});

afterEach(() => {
  vi.unstubAllGlobals();
  SitePublishService.forgetToken();
});

describe('Estampille du contenu', () => {
  it('donne un numéro de version neuf à chaque envoi', () => {
    const bundle = defaultContentBundle();
    const first = SitePublishService.stamp(bundle, 1_700_000_000_000);
    const second = SitePublishService.stamp(bundle, 1_700_000_060_000);

    expect(first.contentVersion).not.toBe(bundle.contentVersion);
    expect(second.contentVersion).not.toBe(first.contentVersion);
    // Sans cela, `ContentService.updateAvailable()` ne verrait aucune difference.
    expect(first.contentVersion.startsWith('site-')).toBe(true);
  });

  it('ne modifie pas le contenu d’origine', () => {
    const bundle = defaultContentBundle();
    const before = bundle.contentVersion;
    SitePublishService.stamp(bundle);
    expect(bundle.contentVersion).toBe(before);
  });

  it('refuse un contenu qui casserait le jeu sur tous les appareils', () => {
    const bundle = defaultContentBundle();
    const broken = {
      ...bundle,
      nodes: bundle.nodes.map((node) =>
        node.id === 'prairie-1' ? { ...node, connections: ['node-inexistant'] } : node,
      ),
    };
    expect(() => SitePublishService.assertPublishable(broken)).toThrow(/erreur/iu);
    expect(() => SitePublishService.assertPublishable(bundle)).not.toThrow();
  });
});

describe('Envoi vers le dépôt GitHub', () => {
  const target = { owner: 'un-compte', repo: 'Pokexplo', branch: '' };

  function githubServer(existingSha: string | null) {
    return vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === undefined) {
        return existingSha === null
          ? new Response('', { status: 404 })
          : Response.json({ sha: existingSha });
      }
      return Response.json({ commit: { html_url: `https://github.com/x/commit/abc` } });
    });
  }

  it('écrit le contenu au seul emplacement qui alimente le site', async () => {
    const fetchMock = githubServer(null);
    vi.stubGlobal('fetch', fetchMock);

    const result = await SitePublishService.publishToGitHub(
      defaultContentBundle(),
      target,
      'jeton-de-test',
    );

    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe(
      `https://api.github.com/repos/un-compte/Pokexplo/contents/${SITE_BUNDLE_PATH}`,
    );
    expect(init?.method).toBe('PUT');

    const body = JSON.parse(String(init?.body)) as { content: string; sha?: string };
    // Le fichier n'existait pas : pas de `sha` a fournir.
    expect(body.sha).toBeUndefined();
    const written = JSON.parse(atob(body.content)) as { contentVersion: string };
    expect(written.contentVersion).toBe(result.contentVersion);
  });

  it('fournit le sha du fichier existant pour ne rien écraser par accident', async () => {
    const fetchMock = githubServer('sha-existant');
    vi.stubGlobal('fetch', fetchMock);

    await SitePublishService.publishToGitHub(defaultContentBundle(), target, 'jeton-de-test');

    const body = JSON.parse(String(fetchMock.mock.calls[1]![1]?.body)) as { sha?: string };
    expect(body.sha).toBe('sha-existant');
  });

  it('explique clairement un jeton refusé', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));
    await expect(
      SitePublishService.publishToGitHub(defaultContentBundle(), target, 'mauvais-jeton'),
    ).rejects.toThrow(/Contents/u);
  });

  it('refuse de publier sans jeton ni dépôt', async () => {
    await expect(
      SitePublishService.publishToGitHub(defaultContentBundle(), target, ''),
    ).rejects.toThrow(/jeton/iu);
    await expect(
      SitePublishService.publishToGitHub(
        defaultContentBundle(),
        { owner: '', repo: '', branch: '' },
        'jeton',
      ),
    ).rejects.toThrow(/dépôt/iu);
  });

  it('n’envoie jamais un contenu invalide sur tous les appareils', async () => {
    const fetchMock = githubServer(null);
    vi.stubGlobal('fetch', fetchMock);
    const bundle = defaultContentBundle();
    const broken = { ...bundle, nodes: [] };

    await expect(SitePublishService.publishToGitHub(broken, target, 'jeton')).rejects.toThrow(
      /erreur/iu,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Jeton GitHub', () => {
  it('reste sur cet ordinateur et peut être oublié', () => {
    SitePublishService.saveToken('  jeton-secret  ');
    expect(SitePublishService.readToken()).toBe('jeton-secret');

    SitePublishService.forgetToken();
    expect(SitePublishService.readToken()).toBe('');
  });

  it('n’apparaît jamais dans le contenu envoyé', () => {
    SitePublishService.saveToken('jeton-secret');
    const serialized = SitePublishService.serialize(
      SitePublishService.stamp(defaultContentBundle()),
    );
    expect(serialized).not.toContain('jeton-secret');
  });
});
