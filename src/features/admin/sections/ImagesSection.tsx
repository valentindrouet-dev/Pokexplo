import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaRecordMeta } from '../../../services';
import { AssetService } from '../../../services';
import { IconTrash, IconUpload, PrimaryButton, SecondaryButton, SoftPanel } from '../../../ui';
import { uid } from '../../../utils/id';
import { useAdminDraft } from '../AdminDraftContext';

/** IMAGES ET MEDIAS (CONCEPTION §114-115). */
export function ImagesSection() {
  const { draft, update } = useAdminDraft();
  const [items, setItems] = useState<MediaRecordMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setItems(await AssetService.list('media/'));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = async (file: File): Promise<void> => {
    setBusy(true);
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const path = `media/creatures/${uid('img')}.${extension}`;
    await AssetService.put(path, file, { mimeType: file.type || `image/${extension}` });
    await refresh();
    setBusy(false);
  };

  const assignTo = (path: string, creatureId: string): void => {
    update((current) => ({
      ...current,
      creatures: current.creatures.map((creature) =>
        creature.id === creatureId ? { ...creature, imagePath: path } : creature,
      ),
    }));
  };

  return (
    <SoftPanel title="Images et médias" className="ds-stack">
      <div className="ds-row">
        <PrimaryButton icon={<IconUpload size={24} />} disabled={busy} onClick={() => input.current?.click()}>
          Importer une image
        </PrimaryButton>
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
        <span className="admin__status">
          Les fichiers restent dans le magasin de médias ; le contenu ne stocke que leur chemin (§72).
        </span>
      </div>

      <div className="admin__scroll-list">
        {items.length === 0 ? (
          <p className="admin__status">Aucun média importé. Les créatures utilisent leur dessin SVG.</p>
        ) : (
          items.map((item) => (
            <div key={item.path} className="ds-list-row">
              <span className="ds-stack">
                <span>{item.path}</span>
                <span className="admin__status">
                  {item.mimeType} · {(item.size / 1024).toFixed(0)} Ko
                </span>
              </span>
              <select
                className="field__select"
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) assignTo(item.path, event.target.value);
                }}
              >
                <option value="">Associer à une créature…</option>
                {draft?.creatures.map((creature) => (
                  <option key={creature.id} value={creature.id}>
                    {creature.name}
                  </option>
                ))}
              </select>
              <SecondaryButton
                icon={<IconTrash size={22} />}
                onClick={() => void AssetService.remove(item.path).then(refresh)}
              >
                Supprimer
              </SecondaryButton>
            </div>
          ))
        )}
      </div>
    </SoftPanel>
  );
}
