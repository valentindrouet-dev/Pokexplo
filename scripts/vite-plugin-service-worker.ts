import type { Plugin } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Options {
  base: string;
}

/**
 * Genere dist/sw.js a partir de src/pwa/sw.template.js en injectant :
 *  - la liste des fichiers de l'App Shell (JS / CSS / HTML / icones) ;
 *  - le prefixe de deploiement (base) ;
 *  - un identifiant de cache unique par build.
 *
 * Un Service Worker ecrit a la main ne peut pas connaitre les noms de fichiers
 * hashes : ce plugin comble ce trou sans dependance supplementaire.
 */
export function serviceWorkerPlugin({ base }: Options): Plugin {
  let outDir = 'dist';
  let isBuild = false;

  return {
    name: 'pokexplo:service-worker',
    configResolved(config) {
      outDir = config.build.outDir;
      isBuild = config.command === 'build';
    },
    writeBundle(_options, bundle) {
      if (!isBuild) return;

      const precache = new Set<string>([base, `${base}index.html`]);
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.map')) continue;
        if (fileName === 'sw.js') continue;
        // Firebase est charge dynamiquement et seulement si une configuration
        // existe : le precharger couterait 750 Ko a chaque installation.
        if (/firebase/i.test(fileName)) continue;
        const isAsset = chunk.type === 'asset';
        const keep =
          fileName.endsWith('.js') ||
          fileName.endsWith('.css') ||
          fileName.endsWith('.webmanifest') ||
          (isAsset && (fileName.endsWith('.svg') || fileName.endsWith('.png')));
        if (keep) precache.add(base + fileName);
      }

      const template = readFileSync(
        resolve(process.cwd(), 'src/pwa/sw.template.js'),
        'utf8',
      );
      const buildId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const output = template
        .replace('__PRECACHE_MANIFEST__', JSON.stringify([...precache], null, 2))
        .replace(/__SW_BASE__/g, JSON.stringify(base))
        .replace(/__SW_BUILD_ID__/g, JSON.stringify(buildId));

      writeFileSync(resolve(process.cwd(), outDir, 'sw.js'), output, 'utf8');
    },
  };
}
