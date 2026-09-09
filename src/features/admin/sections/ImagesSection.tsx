import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Creature } from '../../../types';
import type { MediaRecordMeta } from '../../../services';
import { AssetService } from '../../../services';
import { CreatureSprite } from '../../../components/CreatureSprite';
import {
  IconTrash,
  IconUpload,
  IconWarning,
  PrimaryButton,
  SecondaryButton,
  SoftPanel,
} from '../../../ui';
import { uid } from '../../../utils/id';
import { useAdminDraft } from '../AdminDraftContext';
import { EntityPane } from '../EntityPane';
import { TextField } from '../fields';

/**
 * IMAGES ET MEDIAS (CONCEPTION §114-115).
 *
 * Trois manieres de donner une image a une creature, expliquees ici meme car
 * elles n'ont PAS les memes consequences (voir docs/MEDIA.md) :
 *
 *  1. `media/…` deposee dans le depot (`public/media/…`)  → visible partout ;
 *  2. `https://…`                                          → visible partout,
 *     mais dependante d'un site externe et indisponible hors connexion ;
 *  3. import depuis cet appareil                           → visible ICI seulement.
 */
export function ImagesSection() {
  const { draft, update } = useAdminDraft();
  const [items, setItems] = useState<MediaRecordMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setItems(await AssetService.list('media/'));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const localPaths = useMemo(() => new Set(items.map((item) => item.path)), [items]);

  if (!draft) return null;

  const creature =
    draft.creatures.find((item) => item.id === selectedId) ?? draft.creatures[0] ?? null;

  const setImagePath = (value: string): void => {
    if (!creature) return;
    update((current) => ({
      ...current,
      creatures: current.creatures.map((item) =>
        item.id === creature.id ? { ...item, imagePath: value.trim() || undefined } : item,
      ),
    }));
  };

  /** Import depuis cet appareil : pratique pour essayer, local par nature. */
  const upload = async (file: File): Promise<void> => {
    if (!creature) return;
    setBusy(true);
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const path = `media/creatures/${uid('img')}.${extension}`;
    await AssetService.put(path, file, { mimeType: file.type || `image/${extension}` });
    setImagePath(path);
    await refresh();
    setBusy(false);
  };

  const origin = (path: string | undefined): string => {
    if (!path) return 'Dessin généré';
    if (/^https?:/iu.test(path)) return 'Adresse externe';
    if (localPaths.has(path)) return 'Cet appareil uniquement';
    return 'Fichier du site';
  };

  return (
    <>
      <SoftPanel title="Trois façons d’ajouter une image" tone="soft" padding="tight">
        <ul className="ds-list">
          <li className="ds-list-row">
            <strong>Fichier du site (recommandé)</strong> — déposez l’image dans
            <code> public/media/creatures/</code> du dépôt, puis indiquez ici
            <code> media/creatures/mon-image.png</code>. Elle apparaît sur tous les appareils, même
            hors connexion.
          </li>
          <li className="ds-list-row">
            <strong>Adresse externe</strong> — collez une adresse commençant par
            <code> https://</code>. Visible partout, mais dépend d’un site tiers et ne fonctionne
            pas hors connexion.
          </li>
          <li className="ds-list-row">
            <strong>Import depuis cet appareil</strong> — pratique pour essayer, mais l’image reste
            sur cet appareil : elle n’apparaîtra pas ailleurs.
          </li>
        </ul>
      </SoftPanel>

      <EntityPane
        title="Créatures"
        items={draft.creatures}
        selectedId={creature?.id ?? null}
        onSelect={setSelectedId}
        idOf={(item: Creature) => item.id}
        labelOf={(item: Creature) => item.name}
        hintOf={(item: Creature) => origin(item.imagePath)}
      >
        {creature ? (
          <>
            <div className="ds-row">
              <CreatureSprite creature={creature} size={140} />
              <div className="ds-stack">
                <span className="admin__status">{origin(creature.imagePath)}</span>
                <span className="admin__status">
                  Sans image, la créature garde son dessin généré : elle n’est jamais vide.
                </span>
              </div>
            </div>

            <TextField
              label="Image de la créature"
              value={creature.imagePath ?? ''}
              onChange={setImagePath}
              placeholder="media/creatures/mon-image.png"
              hint="Chemin d’un fichier du site, ou adresse https://…. Laissez vide pour le dessin généré."
            />

            {creature.imagePath && localPaths.has(creature.imagePath) ? (
              <p className="admin__issue">
                <IconWarning size={22} />
                Cette image n’existe que sur cet appareil. Pour qu’elle apparaisse partout, déposez
                le fichier dans <code>public/media/creatures/</code> du dépôt et indiquez son chemin.
              </p>
            ) : null}

            <div className="ds-row">
              <SecondaryButton
                icon={<IconUpload size={24} />}
                disabled={busy}
                onClick={() => input.current?.click()}
              >
                Importer depuis cet appareil
              </SecondaryButton>
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
              {creature.imagePath ? (
                <SecondaryButton onClick={() => setImagePath('')}>
                  Revenir au dessin généré
                </SecondaryButton>
              ) : null}
            </div>
          </>
        ) : null}
      </EntityPane>

      <SoftPanel title={`Images importées sur cet appareil (${items.length})`} padding="tight">
        {items.length === 0 ? (
          <p className="admin__status">
            Aucune image importée. Les créatures utilisent leur dessin généré.
          </p>
        ) : (
          <div className="ds-list">
            {items.map((item) => (
              <div key={item.path} className="ds-list-row">
                <span className="ds-stack">
                  <span>{item.path}</span>
                  <span className="admin__status">
                    {item.mimeType} · {(item.size / 1024).toFixed(0)} Ko
                  </span>
                </span>
                <PrimaryButton onClick={() => setImagePath(item.path)}>
                  Utiliser pour {creature?.name}
                </PrimaryButton>
                <SecondaryButton
                  icon={<IconTrash size={22} />}
                  onClick={() => void AssetService.remove(item.path).then(refresh)}
                >
                  Supprimer
                </SecondaryButton>
              </div>
            ))}
          </div>
        )}
      </SoftPanel>
    </>
  );
}
