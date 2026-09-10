/**
 * LES IMAGES DÉPOSÉES DANS LE DÉPÔT (§198).
 *
 * `public/media/creatures/` est servi fichier par fichier : un navigateur ne
 * sait pas lister un dossier. `scripts/vite-plugin-media-catalog.ts` écrit
 * donc un inventaire à côté des images, au démarrage du serveur comme avant
 * chaque build. C'est lui qu'on lit ici.
 *
 * Sans cet inventaire — dossier vide, fichier absent, hors ligne — on ne
 * casse rien : la liste est simplement vide, et l'import depuis l'appareil
 * reste disponible.
 */
export interface CatalogImage {
  /** Nom du fichier, tel qu'il est dans le dépôt. */
  file: string;
  /** Chemin à stocker dans le contenu : `media/creatures/0025_pikachu.png`. */
  path: string;
  /** Numéro lu dans le nom du fichier (« 0025_… »), s'il y en a un. */
  number?: number;
  /** Nom lisible tiré du fichier : « Pikachu ». */
  name: string;
}

const CATALOG_URL = 'media/creatures/index.json';

export async function loadCatalog(): Promise<CatalogImage[]> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${CATALOG_URL}`, { cache: 'no-cache' });
    if (!response.ok) return [];
    const parsed: unknown = await response.json();
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is CatalogImage =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as CatalogImage).path === 'string' &&
        typeof (entry as CatalogImage).file === 'string',
    );
  } catch {
    return [];
  }
}
