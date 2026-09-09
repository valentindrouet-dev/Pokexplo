import type { Plugin } from 'vite';
import { readFileSync } from 'node:fs';

/**
 * Injecte APP_VERSION / BUILD_ID a la compilation.
 * APP_VERSION vient de package.json, BUILD_ID est unique par build : il sert de
 * cle de cache pour le Service Worker (voir docs/TECHNICAL_SPEC.md).
 */
export function appVersionPlugin(): Plugin {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  };
  const buildId = `${pkg.version}-${Date.now().toString(36)}`;

  return {
    name: 'pokexplo:app-version',
    config() {
      return {
        define: {
          __APP_VERSION__: JSON.stringify(pkg.version),
          __BUILD_ID__: JSON.stringify(buildId),
        },
      };
    },
  };
}
