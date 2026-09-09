import { useCallback, useEffect, useState } from 'react';
import type { SaveFile } from '../../../types';
import { SaveService } from '../../../services';
import { IconDownload, PrimaryButton, SecondaryButton, SoftPanel } from '../../../ui';

/**
 * PROFILS (CONCEPTION §101).
 * Une sauvegarde n'est JAMAIS supprimee : « Archiver » la met de côté
 * (CLAUDE.md §2).
 */
export function ProfilesSection() {
  const [profiles, setProfiles] = useState<SaveFile[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setProfiles(await SaveService.listProfiles());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const exportSave = (save: SaveFile): void => {
    const blob = new Blob([SaveService.export(save)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pokexplo-${save.profile.nickname}-${save.state.saveRevision}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Sauvegarde de ${save.profile.nickname} exportée.`);
  };

  return (
    <SoftPanel title="Profils et sauvegardes" className="ds-stack">
      {profiles.length === 0 ? (
        <p className="admin__status">Aucun profil pour l’instant.</p>
      ) : (
        profiles.map((save) => (
          <div key={save.profile.id} className="ds-list-row">
            <span className="ds-stack">
              <span>{save.profile.nickname}</span>
              <span className="admin__status">
                révision {save.state.saveRevision} · schéma v{save.schemaVersion} ·{' '}
                {Object.values(save.pokedex).filter((entry) => entry.state === 'CAPTURED').length}{' '}
                créatures · {save.state.badges.length} badge(s)
              </span>
            </span>
            <PrimaryButton icon={<IconDownload size={22} />} onClick={() => exportSave(save)}>
              Exporter
            </PrimaryButton>
            <SecondaryButton
              onClick={() => void SaveService.archive(save.profile.id).then(refresh)}
            >
              Archiver
            </SecondaryButton>
          </div>
        ))
      )}
      {message ? <p className="admin__status">{message}</p> : null}
      <p className="admin__status">
        Archiver conserve la sauvegarde : elle est simplement retirée de la liste des profils actifs.
      </p>
    </SoftPanel>
  );
}
