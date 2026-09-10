import { readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * INVENTAIRE DES IMAGES DÉPOSÉES DANS LE DÉPÔT.
 *
 * Un navigateur ne sait pas lister un dossier : `public/media/creatures/` est
 * servi tel quel, fichier par fichier. Sans inventaire, l'Admin ne pourrait
 * donc PAS proposer les images qu'on y a déposées — il faudrait retaper leur
 * nom à la main, ce que §196 interdit.
 *
 * Ce greffon écrit `public/media/creatures/index.json` au démarrage du serveur
 * de développement et avant chaque build. Déposer une image et relancer suffit
 * donc à la voir apparaître dans l'Admin ; la CI la publie de la même façon.
 */
const FOLDER = join('public', 'media', 'creatures');
const CATALOG = join(FOLDER, 'index.json');
const IMAGES = /\.(png|jpe?g|webp|gif|avif|svg)$/iu;

/** `0025_pikachu.png` → numéro 25, nom « Pikachu ». */
export interface CatalogEntry {
  file: string;
  path: string;
  number?: number;
  name: string;
}

export function readMediaCatalog(root = process.cwd()): CatalogEntry[] {
  const folder = join(root, FOLDER);
  if (!existsSync(folder)) return [];

  return readdirSync(folder)
    .filter((file) => IMAGES.test(file) && file !== 'index.json')
    .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
    .map((file) => {
      const bare = file.replace(IMAGES, '');
      // Convention du dossier : « 0000_nom ». Le préfixe est facultatif —
      // une image sans numéro reste proposée, elle n'en suggère simplement
      // aucun.
      const match = /^(\d+)[_-](.*)$/u.exec(bare);
      const rest = (match?.[2] ?? bare).replace(/[_-]+/gu, ' ').trim();
      return {
        file,
        path: `media/creatures/${file}`,
        ...(match ? { number: Number.parseInt(match[1]!, 10) } : {}),
        name: rest.charAt(0).toLocaleUpperCase('fr') + rest.slice(1),
      };
    });
}

function write(root: string): void {
  const folder = join(root, FOLDER);
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true });
  writeFileSync(join(root, CATALOG), `${JSON.stringify(readMediaCatalog(root), null, 2)}\n`, 'utf8');
}

export function mediaCatalogPlugin(): Plugin {
  return {
    name: 'pokexplo-media-catalog',
    buildStart() {
      write(process.cwd());
    },
    configureServer(server) {
      write(process.cwd());
      // Déposer une image pendant que le serveur tourne suffit : l'inventaire
      // se réécrit, sans redémarrage.
      server.watcher.add(join(process.cwd(), FOLDER));
      const refresh = (file: string): void => {
        if (file.includes(FOLDER) && !file.endsWith('index.json')) write(process.cwd());
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}
