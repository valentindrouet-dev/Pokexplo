import { useState } from 'react';
import { PrimaryButton, SecondaryButton, SoftPanel } from '../../../ui';
import { useContent } from '../../../app/providers/ContentProvider';
import { useNavigation } from '../../../app/router';
import { useAdminDraft } from '../AdminDraftContext';

/**
 * PREVISUALISATION (CONCEPTION §118).
 *
 * L'Admin peut jouer le BROUILLON avant publication : le contenu affiche par
 * le jeu est temporairement remplace, sans toucher a la release en service ni
 * aux sauvegardes.
 */
export function PreviewSection() {
  const { draft, validation } = useAdminDraft();
  const { preview, previewing, meta } = useContent();
  const { navigate } = useNavigation();
  const [note, setNote] = useState<string | null>(null);

  if (!draft) return null;

  const start = (): void => {
    preview(draft);
    setNote('Le jeu affiche maintenant le brouillon. Il reviendra à la version publiée si vous arrêtez la prévisualisation.');
  };

  const stop = (): void => {
    preview(null);
    setNote('Prévisualisation arrêtée.');
  };

  return (
    <SoftPanel title="Prévisualiser le brouillon" className="ds-stack">
      <p>
        Vous pouvez essayer les dialogues, les animations, les voix, les exercices, les biomes et les
        rencontres avant de publier quoi que ce soit.
      </p>
      <p className="admin__status">
        Version en service : {meta?.currentReleaseId ?? '—'} · brouillon :{' '}
        {draft.creatures.length} créatures, {draft.exerciseTemplates.length} matrices,{' '}
        {validation?.missingVoices ?? 0} voix manquantes
      </p>

      <div className="ds-row">
        {previewing ? (
          <SecondaryButton onClick={stop}>Arrêter la prévisualisation</SecondaryButton>
        ) : (
          <PrimaryButton onClick={start}>Prévisualiser le brouillon</PrimaryButton>
        )}
        <SecondaryButton onClick={() => navigate({ name: 'center' })}>
          Ouvrir le Centre
        </SecondaryButton>
        <SecondaryButton onClick={() => navigate({ name: 'map' })}>Ouvrir la carte</SecondaryButton>
        <SecondaryButton onClick={() => navigate({ name: 'uikit' })}>
          Design system
        </SecondaryButton>
      </div>

      {note ? <p className="admin__status">{note}</p> : null}
    </SoftPanel>
  );
}
