import { beforeEach, describe, expect, it } from 'vitest';
import { AssetService, localBackend, setBackend } from '../../src/services';
import { resetDb } from '../../src/services/db';

/**
 * Origine des medias (docs/MEDIA.md).
 *
 * Trois provenances, avec des consequences differentes sur la portabilite :
 * adresse externe, magasin de medias (local a l'appareil), fichier du site.
 */
/** Prefixe de deploiement : `/Pokexplo/` sur GitHub Pages. */
const BASE = import.meta.env.BASE_URL || '/';

beforeEach(() => {
  resetDb();
  setBackend(localBackend);
  AssetService.invalidate();
});

describe('AssetService — résolution des images', () => {
  it('renvoie une adresse externe telle quelle', async () => {
    const url = 'https://exemple.org/pikachu.png';
    expect(await AssetService.getUrl(url)).toBe(url);
    expect(await AssetService.getUrl('data:image/png;base64,AAAA')).toBe(
      'data:image/png;base64,AAAA',
    );
  });

  it('sert un fichier importé sur l’appareil depuis le magasin de médias', async () => {
    await AssetService.put('media/creatures/locale.png', new Blob(['x'], { type: 'image/png' }), {
      mimeType: 'image/png',
    });
    const url = await AssetService.getUrl('media/creatures/locale.png');
    expect(url).toMatch(/^blob:/u);
  });

  it('retombe sur le fichier livré avec le site quand rien n’est importé', async () => {
    // C'est ce repli qui permet a une image d'exister sur TOUS les appareils
    // sans Firebase : elle est publiee avec le site.
    const url = await AssetService.getUrl('media/creatures/exemple.svg');
    // Le chemin est prefixe par la base du deploiement : indispensable sur
    // GitHub Pages, ou le site est servi sous /Pokexplo/.
    expect(url).toBe(`${BASE}media/creatures/exemple.svg`);
  });

  it('ne renvoie rien pour un chemin absent', async () => {
    expect(await AssetService.getUrl(undefined)).toBeNull();
  });

  it('privilégie le fichier importé sur celui du site', async () => {
    const path = 'media/creatures/exemple.svg';
    expect(await AssetService.getUrl(path)).toBe(`${BASE}media/creatures/exemple.svg`);

    AssetService.invalidate();
    await AssetService.put(path, new Blob(['y'], { type: 'image/svg+xml' }), {
      mimeType: 'image/svg+xml',
    });
    expect(await AssetService.getUrl(path)).toMatch(/^blob:/u);
  });
});
