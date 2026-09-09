import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentService, localBackend, ReleaseService, setBackend } from '../../src/services';
import { resetDb } from '../../src/services/db';
import { BUNDLED_CONTENT_VERSION, defaultContentBundle } from '../../src/content/defaultContent';
import { voiceDashboard, voicesToRecord } from '../../src/utils/voice';

beforeEach(() => {
  resetDb();
  setBackend(localBackend);
  ContentService.invalidate();
});

describe('Contenu livré avec l’application (CONCEPTION §121)', () => {
  const bundle = defaultContentBundle();

  it('contient le périmètre annoncé pour la V1', () => {
    expect(bundle.creatures.length).toBeGreaterThanOrEqual(15);
    expect(bundle.creatures.length).toBeLessThanOrEqual(20);
    expect(bundle.biomes.map((biome) => biome.id)).toEqual(
      expect.arrayContaining(['centre', 'prairie', 'foret', 'riviere', 'grotte']),
    );
    expect(bundle.gyms).toHaveLength(1);
    expect(bundle.badges[0]?.name).toBe('Badge Roche');
    expect(bundle.chapters.some((chapter) => chapter.isFinal)).toBe(true);
  });

  it('embarque les quatre moteurs de la V1', () => {
    const types = new Set(bundle.exerciseTemplates.map((template) => template.type));
    for (const type of ['COUNT', 'MATCH_IMAGE_WORD', 'MISSING_LETTER', 'LEFT_RIGHT']) {
      expect(types.has(type as never)).toBe(true);
    }
  });

  it('ne contient aucune référence cassée', () => {
    const report = ContentService.validate(bundle);
    const errors = report.issues.filter((issue) => issue.level === 'ERROR');
    expect(errors).toEqual([]);
  });

  it('associe une VoiceMessage à chaque texte destiné à l’enfant (§37)', () => {
    const ids = new Set(bundle.voiceMessages.map((voice) => voice.id));

    for (const template of bundle.exerciseTemplates) {
      expect(ids.has(template.audio.question?.voiceId ?? '')).toBe(true);
      expect(ids.has(template.audio.hint1?.voiceId ?? '')).toBe(true);
      expect(ids.has(template.audio.hint2?.voiceId ?? '')).toBe(true);
      expect(ids.has(template.audio.success?.voiceId ?? '')).toBe(true);
    }
    for (const creature of bundle.creatures) {
      expect(ids.has(creature.nameVoiceId ?? '')).toBe(true);
    }
    for (const node of bundle.nodes) {
      if (node.arrivalVoiceId) expect(ids.has(node.arrivalVoiceId)).toBe(true);
    }
    for (const quest of bundle.quests) {
      expect(ids.has(quest.offerVoiceId ?? '')).toBe(true);
      expect(ids.has(quest.completeVoiceId ?? '')).toBe(true);
    }
  });

  it('livre les voix avec leur texte, prêtes pour la session de doublage (§52)', () => {
    const dashboard = voiceDashboard(bundle);
    expect(dashboard.total).toBeGreaterThan(100);
    // Aucune n'est encore enregistree : c'est exactement la file de travail.
    expect(dashboard.missing).toBe(dashboard.total);
    expect(voicesToRecord(bundle)).toHaveLength(dashboard.total);
    for (const voice of bundle.voiceMessages) {
      expect(voice.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('garde des consignes courtes, lisibles par un enfant de CP (§146)', () => {
    for (const template of bundle.exerciseTemplates) {
      expect(template.prompt.length).toBeLessThanOrEqual(60);
    }
  });
});

describe('Cycle de publication (CONCEPTION §99-100)', () => {
  it('publie automatiquement le contenu initial au premier lancement', async () => {
    const loaded = await ContentService.load(true);
    expect(loaded.meta.currentReleaseId).toBe('release_0001');
    expect(loaded.bundle.creatures.length).toBeGreaterThan(0);
  });

  it('refuse de publier tant que des voix manquent, puis accepte si on force (§53)', async () => {
    await ContentService.load(true);
    const draft = await ContentService.getDraft();

    await expect(ReleaseService.publish(draft, 'Essai')).rejects.toThrow(/voix/iu);

    const published = await ReleaseService.publish(draft, 'Essai forcé', { force: true });
    expect(published.release.id).toBe('release_0002');
    expect(published.meta.currentReleaseId).toBe('release_0002');
  });

  it('refuse une publication contenant une erreur de contenu', async () => {
    await ContentService.load(true);
    const draft = await ContentService.getDraft();
    const broken = {
      ...draft,
      nodes: draft.nodes.map((node) =>
        node.id === 'prairie-1' ? { ...node, connections: ['node-inexistant'] } : node,
      ),
    };
    await expect(ReleaseService.publish(broken, 'Cassé', { force: true })).rejects.toThrow(/erreur/iu);
  });

  it('permet un rollback sans toucher aux sauvegardes (§100)', async () => {
    await ContentService.load(true);
    const draft = await ContentService.getDraft();
    await ReleaseService.publish(draft, 'v2', { force: true });

    const meta = await ReleaseService.rollback('release_0001');
    expect(meta.currentReleaseId).toBe('release_0001');

    const reloaded = await ContentService.load(true);
    expect(reloaded.meta.currentReleaseId).toBe('release_0001');
  });

  it('numérote les releases dans l’ordre', async () => {
    await ContentService.load(true);
    const draft = await ContentService.getDraft();
    await ReleaseService.publish(draft, 'a', { force: true });
    await ReleaseService.publish(draft, 'b', { force: true });
    const releases = await ReleaseService.list();
    expect(releases.map((release) => release.id)).toEqual([
      'release_0003',
      'release_0002',
      'release_0001',
    ]);
  });
});

describe('Jouabilité de la V1 (CONCEPTION §130)', () => {
  const bundle = defaultContentBundle();

  it('rend chaque type exigé par l’Arène réellement capturable', () => {
    const gym = bundle.gyms[0]!;
    const required = gym.requires.effectiveTypes!.types;

    for (const type of required) {
      const reachable = bundle.nodes.some((node) =>
        (node.encounters ?? []).some((entry) => {
          const creature = bundle.creatures.find((item) => item.id === entry.creatureId);
          return creature?.type1 === type || creature?.type2 === type;
        }),
      );
      expect(reachable, `aucune créature de type ${type} n’est rencontrable`).toBe(true);
    }
  });

  it('relie tous les nœuds au Centre, sans lieu inaccessible', () => {
    const links = new Map<string, Set<string>>();
    for (const node of bundle.nodes) links.set(node.id, new Set(node.connections));
    for (const node of bundle.nodes) {
      for (const target of node.connections) links.get(target)?.add(node.id);
    }

    const seen = new Set<string>(['centre']);
    const queue = ['centre'];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbour of links.get(current) ?? []) {
        if (!seen.has(neighbour)) {
          seen.add(neighbour);
          queue.push(neighbour);
        }
      }
    }

    expect(seen.size).toBe(bundle.nodes.length);
  });

  it('mène à une vraie fin : le chapitre final passe par l’Arène', () => {
    const final = bundle.chapters.find((chapter) => chapter.isFinal)!;
    expect(final.goals.some((goal) => goal.kind === 'GYM')).toBe(true);
  });
});

describe('Mise à jour du contenu de référence', () => {
  /** Le site ne propose aucun `content/bundle.json` : réponse 404. */
  function siteWithoutBundle(): void {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 404 })),
    );
  }

  /** Le site propose un contenu déposé dans `public/content/bundle.json`. */
  function siteWithBundle(bundle: unknown): void {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(bundle), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('remplace le contenu livré quand sa version change', async () => {
    siteWithoutBundle();
    const backend = localBackend;
    const first = await ContentService.load(true);
    expect(first.fromDefaults).toBe(true);

    // On simule un appareil resté sur une version antérieure du contenu.
    const stored = await backend.content.getRelease(first.meta.currentReleaseId);
    await backend.content.putRelease({
      ...stored!,
      bundle: { ...stored!.bundle, contentVersion: 'bundled-0' },
    });
    ContentService.invalidate();

    const refreshed = await ContentService.load(true);
    expect(refreshed.bundle.contentVersion).toBe(BUNDLED_CONTENT_VERSION);
    // La carte redessinée est bien celle qui est servie.
    expect(refreshed.bundle.nodes.find((node) => node.id === 'prairie-3')?.label).toBe('Sentier');
  });

  it('utilise le contenu déposé sur le site s’il existe (§91)', async () => {
    const custom = {
      ...defaultContentBundle(),
      contentVersion: 'site-1',
      creatures: defaultContentBundle().creatures.map((creature) =>
        creature.id === 'piloupi'
          ? { ...creature, name: 'Ronflou', imagePath: 'media/creatures/ronflou.png' }
          : creature,
      ),
    };
    siteWithBundle(custom);

    const loaded = await ContentService.load(true);
    expect(loaded.bundle.contentVersion).toBe('site-1');
    const creature = loaded.bundle.creatures.find((item) => item.id === 'piloupi');
    expect(creature?.name).toBe('Ronflou');
    expect(creature?.imagePath).toBe('media/creatures/ronflou.png');
  });

  it('ignore un fichier de contenu illisible plutôt que de casser le jeu', async () => {
    siteWithBundle({ nimporte: 'quoi' });
    const loaded = await ContentService.load(true);
    expect(loaded.bundle.creatures.length).toBeGreaterThan(0);
  });

  it('ne remplace rien quand le site est injoignable (hors ligne)', async () => {
    siteWithoutBundle();
    const first = await ContentService.load(true);
    const stored = await localBackend.content.getRelease(first.meta.currentReleaseId);
    await localBackend.content.putRelease({
      ...stored!,
      bundle: { ...stored!.bundle, contentVersion: 'site-42' },
    });
    ContentService.invalidate();

    // Hors ligne : la requête échoue, on garde ce qui est installé.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const offline = await ContentService.load(true);
    expect(offline.bundle.contentVersion).toBe('site-42');
  });

  it('ne remplace JAMAIS une release publiée depuis l’Admin (§97)', async () => {
    await ContentService.load(true);
    const draft = await ContentService.getDraft();
    const published = await ReleaseService.publish(draft, 'Contenu du Master', { force: true });
    expect(published.release.source).toBe('admin');

    ContentService.invalidate();
    const loaded = await ContentService.load(true);
    expect(loaded.meta.currentReleaseId).toBe(published.release.id);
    expect(loaded.fromDefaults).toBe(false);
  });
});
