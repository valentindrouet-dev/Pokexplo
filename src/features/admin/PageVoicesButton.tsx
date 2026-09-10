import { useMemo, useState } from 'react';
import type { VoiceMessage } from '../../types';
import { IconMic, ModalPanel, SecondaryButton } from '../../ui';
import { useNavigation } from '../../app/router';
import { voiceStatus } from '../../utils/voice';
import { useAdminDraftOptional } from './AdminDraftContext';
import { pageVoices } from './pageVoices';
import { VoiceList } from './VoiceList';
import './forms.css';

/**
 * « LES VOIX DE CETTE PAGE » — enregistrer là où l'on est.
 *
 * Pour donner sa voix à un texte, il fallait quitter l'écran, ouvrir les menus,
 * aller dans « Voix », et retrouver le bon texte parmi près de deux cents —
 * sans savoir lequel appartenait à l'écran d'où l'on venait. Le travail était
 * possible, il n'était pas praticable.
 *
 * Ce bouton renverse le sens : il part de ce qu'on a sous les yeux. En mode
 * édition comme dans les menus, il ouvre les voix de la page courante, avec
 * l'enregistreur habituel (CLAUDE.md §3), et ce qui reste à faire annoncé sur
 * le bouton lui-même.
 *
 * Il disparaît quand la page ne porte aucune voix : un bouton qui ouvre une
 * liste vide est un bouton de trop (§190).
 */
export function PageVoicesButton() {
  const drafting = useAdminDraftOptional();
  const { route } = useNavigation();
  const [open, setOpen] = useState(false);

  const page = useMemo(() => pageVoices(drafting?.draft ?? null, route), [drafting?.draft, route]);

  const toRecord = page.voices.filter((voice) => {
    const status = voiceStatus(voice);
    return status === 'VOICE_MISSING' || status === 'VOICE_OUTDATED';
  }).length;

  if (!drafting || page.voices.length === 0) return null;

  const patch = (next: VoiceMessage): void => {
    drafting.update((current) => ({
      ...current,
      voiceMessages: current.voiceMessages.map((voice) => (voice.id === next.id ? next : voice)),
    }));
  };

  return (
    <>
      <SecondaryButton icon={<IconMic size={22} />} onClick={() => setOpen(true)}>
        {toRecord > 0
          ? `Voix de cette page (${toRecord} à enregistrer)`
          : `Voix de cette page (${page.voices.length})`}
      </SecondaryButton>

      <ModalPanel
        open={open}
        title={`Les voix de ${page.title}`}
        onDismiss={() => setOpen(false)}
        actions={<SecondaryButton onClick={() => setOpen(false)}>Fermer</SecondaryButton>}
      >
        <p className="admin__status">
          {toRecord > 0
            ? 'Touchez un texte pour l’enregistrer. Ce qui n’est pas enregistré reste muet.'
            : 'Toutes les voix de cette page sont enregistrées.'}
        </p>
        <div className="page-voices__list">
          <VoiceList
            voices={page.voices}
            onChange={patch}
            // Une page en porte quelques-unes : les grouper n'ajouterait qu'un
            // niveau à ouvrir.
            grouped={false}
            openFirst={page.voices.length === 1}
          />
        </div>
      </ModalPanel>
    </>
  );
}
