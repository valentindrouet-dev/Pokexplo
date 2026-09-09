import { useCallback, useEffect, useState } from 'react';
import type { ContentRelease } from '../../../types';
import { ReleaseService } from '../../../services';
import { voiceDashboard } from '../../../utils/voice';
import {
  IconRelease,
  IconWarning,
  ModalPanel,
  PrimaryButton,
  SecondaryButton,
  SoftPanel,
} from '../../../ui';
import { useContent } from '../../../app/providers/ContentProvider';
import { useAdminDraft } from '../AdminDraftContext';
import { TextField } from '../fields';

/**
 * RELEASES (CONCEPTION §99-100).
 *
 *   validate -> create release -> copy content -> validate release -> set pointer
 *
 * Le pointeur change EN DERNIER, et un rollback ne touche jamais aux
 * sauvegardes des enfants.
 */
export function ReleasesSection() {
  const { draft, validation, resetFromPublished } = useAdminDraft();
  const { meta, reload } = useContent();
  const [releases, setReleases] = useState<ContentRelease[]>([]);
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [confirmForce, setConfirmForce] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setReleases(await ReleaseService.list());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!draft) return null;

  const voices = voiceDashboard(draft);
  const errors = validation?.issues.filter((issue) => issue.level === 'ERROR') ?? [];

  const publish = async (force: boolean): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await ReleaseService.publish(draft, label || `Publication du ${new Date().toLocaleDateString('fr-FR')}`, { force });
      setMessage(`Publié : ${result.release.id}`);
      setConfirmForce(false);
      await refresh();
      await reload();
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : 'Publication impossible.';
      setMessage(text);
      // §53 : voix manquantes -> on propose de publier quand meme.
      if (text.includes('voix')) setConfirmForce(true);
    } finally {
      setBusy(false);
    }
  };

  const rollback = async (id: string): Promise<void> => {
    setBusy(true);
    await ReleaseService.rollback(id);
    await reload();
    setMessage(`Retour à ${id}. Les sauvegardes sont intactes.`);
    setBusy(false);
  };

  return (
    <>
      <SoftPanel title="Publier le contenu" className="ds-stack">
        <p className="admin__status">
          Release actuellement servie aux joueurs : <strong>{meta?.currentReleaseId ?? '—'}</strong>
        </p>

        {errors.length > 0 ? (
          <p className="admin__issue admin__issue--error">
            <IconWarning size={22} />
            {errors.length} erreur(s) de contenu bloquent la publication. Voir le tableau de bord.
          </p>
        ) : null}

        {voices.missing > 0 ? (
          <p className="admin__issue">
            <IconWarning size={22} />
            {voices.missing} texte(s) destiné(s) à l’enfant n’ont pas de voix. Vous pouvez les
            enregistrer, publier quand même, ou laisser la voix de synthèse prendre le relais.
          </p>
        ) : null}

        <TextField label="Nom de la publication" value={label} onChange={setLabel} />

        <div className="ds-row">
          <PrimaryButton
            icon={<IconRelease size={26} />}
            disabled={busy || errors.length > 0}
            onClick={() => void publish(false)}
          >
            Publier
          </PrimaryButton>
          <SecondaryButton onClick={() => void resetFromPublished()}>
            Repartir de la version publiée
          </SecondaryButton>
        </div>

        {message ? <p className="admin__status">{message}</p> : null}
      </SoftPanel>

      <SoftPanel title="Historique" className="ds-stack">
        {releases.length === 0 ? (
          <p className="admin__status">Aucune release enregistrée.</p>
        ) : (
          releases.map((release) => (
            <div key={release.id} className="ds-list-row">
              <span className="ds-stack">
                <span>
                  {release.id} — {release.label}
                </span>
                <span className="admin__status">
                  {new Date(release.createdAt).toLocaleString('fr-FR')} ·{' '}
                  {release.bundle.creatures.length} créatures · {release.bundle.nodes.length} nœuds
                </span>
              </span>
              {meta?.currentReleaseId === release.id ? (
                <span className="ds-badge-chip">En service</span>
              ) : (
                <SecondaryButton disabled={busy} onClick={() => void rollback(release.id)}>
                  Revenir à cette version
                </SecondaryButton>
              )}
            </div>
          ))
        )}
      </SoftPanel>

      <ModalPanel
        open={confirmForce}
        title="Publier malgré les voix manquantes ?"
        onDismiss={() => setConfirmForce(false)}
        actions={
          <>
            <SecondaryButton onClick={() => setConfirmForce(false)}>Annuler</SecondaryButton>
            <PrimaryButton disabled={busy} onClick={() => void publish(true)}>
              Publier quand même
            </PrimaryButton>
          </>
        }
      >
        <p>
          {voices.missing} texte(s) seront lus par la voix de synthèse en attendant votre
          enregistrement. Le jeu reste parfaitement utilisable.
        </p>
      </ModalPanel>
    </>
  );
}
