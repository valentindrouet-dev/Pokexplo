import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ContentService,
  ContentUpdateService,
  localBackend,
  ReleaseService,
  setBackend,
} from '../../src/services';
import { UpdateController } from '../../src/pwa/register';
import { resetDb } from '../../src/services/db';
import { defaultContentBundle } from '../../src/content/defaultContent';

/**
 * MISE A JOUR AUTOMATIQUE SUR L'IPAD (CONCEPTION §91, §111).
 *
 * Le parent modifie le contenu depuis son ordinateur ; l'iPad doit le voir
 * arriver seul, mais JAMAIS au milieu d'un exercice ou d'un combat.
 */
function siteServing(bundle: unknown): void {
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

beforeEach(() => {
  resetDb();
  setBackend(localBackend);
  ContentService.invalidate();
  UpdateController.setBusy(false);
});

afterEach(() => {
  ContentUpdateService.stop();
  UpdateController.setBusy(false);
  vi.unstubAllGlobals();
});

describe('Détection d’un contenu plus récent', () => {
  it('signale une mise à jour quand le site sert une autre version', async () => {
    siteServing({ ...defaultContentBundle(), contentVersion: 'site-1' });
    await ContentService.load(true);
    expect(await ContentService.updateAvailable()).toBe(false);

    // Le parent republie depuis son ordinateur.
    siteServing({ ...defaultContentBundle(), contentVersion: 'site-2' });
    expect(await ContentService.updateAvailable()).toBe(true);
  });

  it('ne signale rien quand le site est injoignable (hors ligne)', async () => {
    siteServing({ ...defaultContentBundle(), contentVersion: 'site-1' });
    await ContentService.load(true);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await ContentService.updateAvailable()).toBe(false);
  });

  it('ne remplace jamais une release publiée depuis l’Admin de cet appareil (§97)', async () => {
    siteServing({ ...defaultContentBundle(), contentVersion: 'site-1' });
    await ContentService.load(true);
    const draft = await ContentService.getDraft();
    await ReleaseService.publish(draft, 'Contenu local', { force: true });
    await ContentService.load(true);

    siteServing({ ...defaultContentBundle(), contentVersion: 'site-9' });
    expect(await ContentService.updateAvailable()).toBe(false);
  });
});

describe('Application de la mise à jour (CONCEPTION §111)', () => {
  it('recharge le contenu dès qu’une nouvelle version est publiée', async () => {
    siteServing({ ...defaultContentBundle(), contentVersion: 'site-1' });
    await ContentService.load(true);
    siteServing({ ...defaultContentBundle(), contentVersion: 'site-2' });

    const apply = vi.fn().mockResolvedValue(undefined);
    ContentUpdateService.start(apply);
    await ContentUpdateService.check();

    expect(apply).toHaveBeenCalled();
  });

  it('attend la fin d’un exercice ou d’un combat avant de basculer', async () => {
    siteServing({ ...defaultContentBundle(), contentVersion: 'site-1' });
    await ContentService.load(true);
    siteServing({ ...defaultContentBundle(), contentVersion: 'site-2' });

    // L'enfant est en plein exercice : on ne touche a rien.
    UpdateController.setBusy(true);
    const apply = vi.fn().mockResolvedValue(undefined);
    ContentUpdateService.start(apply);
    await ContentUpdateService.check();
    expect(apply).not.toHaveBeenCalled();

    // Il revient au Centre : la bascule se fait alors, sans qu'il l'ait vue.
    UpdateController.setBusy(false);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('ne fait rien quand le contenu installé est déjà le bon', async () => {
    siteServing({ ...defaultContentBundle(), contentVersion: 'site-1' });
    await ContentService.load(true);

    const apply = vi.fn().mockResolvedValue(undefined);
    ContentUpdateService.start(apply);
    expect(await ContentUpdateService.check()).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });

  it('vérifie de nouveau au retour au premier plan de l’iPad', async () => {
    siteServing({ ...defaultContentBundle(), contentVersion: 'site-1' });
    await ContentService.load(true);
    const apply = vi.fn().mockResolvedValue(undefined);
    ContentUpdateService.start(apply);

    siteServing({ ...defaultContentBundle(), contentVersion: 'site-2' });
    document.dispatchEvent(new Event('visibilitychange'));
    // Le contrôle est asynchrone : on laisse la micro-tâche se terminer.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(apply).toHaveBeenCalled();
  });
});
