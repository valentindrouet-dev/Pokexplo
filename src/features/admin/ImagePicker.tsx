import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { MediaRecordMeta } from '../../services';
import { AssetService } from '../../services';
import { IconImage, IconUpload, IconWarning, SecondaryButton } from '../../ui';
import { uid } from '../../utils/id';
import { FieldGroup } from './fields';
import { loadCatalog, type CatalogImage } from './mediaCatalog';
import './forms.css';

export type ImageOrigin = 'generated' | 'repository' | 'external' | 'device';

export const ORIGIN_LABELS: Record<ImageOrigin, string> = {
  generated: 'Dessin généré',
  repository: 'Fichier du site',
  external: 'Adresse externe',
  device: 'Cet appareil uniquement',
};

/** D'où vient une image (docs/MEDIA.md) — les trois origines n'ont pas les mêmes suites. */
export function imageOrigin(path: string | undefined, devicePaths: Set<string>): ImageOrigin {
  if (!path) return 'generated';
  if (/^https?:/iu.test(path)) return 'external';
  return devicePaths.has(path) ? 'device' : 'repository';
}

/** Les images importées sur CET appareil : elles ne voyagent pas avec le contenu. */
export function useDeviceImages(): { paths: Set<string>; items: MediaRecordMeta[]; refresh: () => Promise<void> } {
  const [items, setItems] = useState<MediaRecordMeta[]>([]);

  const refresh = useCallback(async () => {
    setItems(await AssetService.list('media/'));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, paths: new Set(items.map((item) => item.path)), refresh };
}

/**
 * L'IMAGE S'ÉDITE DANS L'ENTITÉ (UI_DESIGN §196).
 *
 * Pour changer l'illustration d'une créature, il fallait quitter sa fiche,
 * ouvrir la section « Images », y retrouver la créature, et saisir un chemin
 * `media/creatures/…` à la main. Trois écrans et un chemin de fichier pour un
 * geste qui devrait en être un.
 *
 * Tout est ici : l'aperçu, le remplacement, le retour au dessin généré, et la
 * mise en garde quand l'image ne quittera pas cet appareil. Le chemin brut
 * reste disponible sous « Réglages avancés », pour qui en a besoin.
 */
/** L'inventaire des images du dépôt, chargé une fois par écran. */
export function useCatalogImages(): CatalogImage[] {
  const [images, setImages] = useState<CatalogImage[]>([]);
  useEffect(() => {
    void loadCatalog().then(setImages);
  }, []);
  return images;
}

export function ImagePicker({
  label = 'Illustration',
  preview,
  path,
  onChange,
  folder,
  deviceImages,
  catalog = [],
  onPickCatalog,
}: {
  label?: string;
  /** Ce que l'on voit aujourd'hui : image fournie, ou dessin généré. */
  preview: ReactNode;
  path: string | undefined;
  onChange: (path: string | undefined) => void;
  /** Sous-dossier du magasin de médias (« creatures », « biomes »…). */
  folder: string;
  deviceImages: ReturnType<typeof useDeviceImages>;
  /** Images déposées dans le dépôt, proposées en vignettes. */
  catalog?: CatalogImage[];
  /**
   * Appelé au choix d'une image du dépôt. Le nom du fichier porte plus que
   * le chemin — « 0025_pikachu.png » dit aussi un numéro et un nom — et c'est
   * l'appelant qui décide quoi en faire.
   */
  onPickCatalog?: (image: CatalogImage) => void;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const origin = imageOrigin(path, deviceImages.paths);

  const upload = async (file: File): Promise<void> => {
    setBusy(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png';
      const stored = `media/${folder}/${uid('img')}.${extension}`;
      await AssetService.put(stored, file, { mimeType: file.type || `image/${extension}` });
      onChange(stored);
      await deviceImages.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <FieldGroup label={label}>
      <div className="image-picker">
        <div className="image-picker__preview">{preview}</div>

        <div className="ds-stack image-picker__actions">
          <span className="admin__status">{ORIGIN_LABELS[origin]}</span>

          <div className="ds-row">
            <SecondaryButton
              icon={<IconUpload size={22} />}
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {path ? 'Remplacer l’image' : 'Ajouter une image'}
            </SecondaryButton>
            {path ? (
              <SecondaryButton icon={<IconImage size={22} />} onClick={() => onChange(undefined)}>
                Revenir au dessin généré
              </SecondaryButton>
            ) : null}
          </div>

          <input
            ref={input}
            type="file"
            className="vte__hidden-input"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = '';
            }}
          />

          {origin === 'device' ? (
            <p className="admin__issue">
              <IconWarning size={22} />
              <span>
                Cette image n’existe que sur cet appareil : elle n’apparaîtra pas sur l’iPad. Pour
                qu’elle voyage, déposez le fichier dans <code>public/media/{folder}/</code> du dépôt
                (docs/MEDIA.md).
              </span>
            </p>
          ) : null}
          {origin === 'generated' ? (
            <span className="admin__status">
              Sans image, la créature garde son dessin généré : elle n’est jamais vide.
            </span>
          ) : null}
        </div>
      </div>

      {/*
        LES IMAGES DU DÉPÔT (§198).

        Elles sont déposées dans `public/media/creatures/` et voyagent avec le
        site : ce sont les seules qui apparaîtront sur l'iPad. On les CHOISIT
        en vignettes — jamais en retapant `media/creatures/0025_pikachu.png`.
      */}
      {catalog.length > 0 ? (
        <div className="catalog">
          <span className="admin__status">
            {catalog.length} image(s) déposée(s) dans <code>public/media/{folder}/</code>. Elles
            voyagent avec le site.
          </span>
          <div className="catalog__grid">
            {catalog.map((image) => (
              <button
                key={image.path}
                type="button"
                className="ds-tap catalog__item"
                aria-pressed={path === image.path}
                aria-label={
                  image.number === undefined
                    ? image.name
                    : `${image.name}, numéro ${image.number}`
                }
                onClick={() => {
                  onChange(image.path);
                  onPickCatalog?.(image);
                }}
              >
                <img
                  className="catalog__image"
                  src={`${import.meta.env.BASE_URL}${image.path}`}
                  alt=""
                  loading="lazy"
                />
                <span className="catalog__name">{image.name}</span>
                {image.number === undefined ? null : (
                  <span className="catalog__number">
                    #{String(image.number).padStart(3, '0')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </FieldGroup>
  );
}
