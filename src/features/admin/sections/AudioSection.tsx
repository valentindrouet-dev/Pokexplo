import { useCallback, useEffect, useMemo, useState } from 'react';
import type { VoiceMessage } from '../../../types';
import { AssetService } from '../../../services';
import { voiceDashboard, voiceStatus, voicesToRecord } from '../../../utils/voice';
import {
  IconMic,
  IconSearch,
  IconWarning,
  PillButton,
  PrimaryButton,
  SecondaryButton,
  SoftPanel,
} from '../../../ui';
import { useAdminDraft } from '../AdminDraftContext';
import { VoiceList } from '../VoiceList';
import { VoiceTextEditor } from '../VoiceTextEditor';

type Filter = 'TO_RECORD' | 'RECORDED' | 'ALL';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'TO_RECORD', label: 'À enregistrer' },
  { id: 'RECORDED', label: 'Déjà enregistrées' },
  { id: 'ALL', label: 'Toutes' },
];

/**
 * Les fichiers audio presents sur CET appareil.
 *
 * Une voix enregistree sur l'ordinateur vit dans le magasin de medias du
 * navigateur : elle ne suit pas le contenu sur l'iPad. Sans la synthese vocale
 * pour masquer le trou (§127), ce silence doit se VOIR ici.
 */
function useDeviceVoicePaths(): Set<string> {
  const [paths, setPaths] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const items = await AssetService.list('media/voice/');
    setPaths(new Set(items.map((item) => item.path)));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return paths;
}

/**
 * TABLEAU DE BORD DES VOIX (CONCEPTION §116) et
 * MODE SESSION DE DOUBLAGE (§117).
 *
 * La liste était plate : près de deux cents textes, un panneau à deux colonnes,
 * cinq filtres, et aucune idée de ce qu'on regardait. Elle est désormais rangée
 * en sections dépliables (§196) : on voit ce qu'il reste à faire par famille, on
 * ouvre celle qu'on veut, et l'enregistreur s'ouvre sous le texte concerné.
 */
export function AudioSection() {
  const { draft, update } = useAdminDraft();
  const [filter, setFilter] = useState<Filter>('TO_RECORD');
  const [query, setQuery] = useState('');
  const [dubbing, setDubbing] = useState(false);
  const [dubIndex, setDubIndex] = useState(0);
  const devicePaths = useDeviceVoicePaths();

  const dashboard = useMemo(() => (draft ? voiceDashboard(draft) : null), [draft]);
  const toRecord = useMemo(() => (draft ? voicesToRecord(draft) : []), [draft]);

  /** Voix qui pointent un fichier introuvable ici : elles resteront muettes. */
  const elsewhere = useMemo(() => {
    if (!draft) return [];
    return draft.voiceMessages.filter(
      (voice) => voice.audioPath && !devicePaths.has(voice.audioPath),
    );
  }, [draft, devicePaths]);

  const filtered = useMemo(() => {
    if (!draft) return [];
    const needle = query.trim().toLowerCase();
    return draft.voiceMessages.filter((voice) => {
      if (needle && !voice.text.toLowerCase().includes(needle)) return false;
      const status = voiceStatus(voice);
      if (filter === 'ALL') return true;
      if (filter === 'TO_RECORD') return status === 'VOICE_MISSING' || status === 'VOICE_OUTDATED';
      return status === 'VOICE_OK';
    });
  }, [draft, filter, query]);

  if (!draft || !dashboard) return null;

  const patchVoice = (next: VoiceMessage): void => {
    update((current) => ({
      ...current,
      voiceMessages: current.voiceMessages.map((voice) => (voice.id === next.id ? next : voice)),
    }));
  };

  /* ------------------------- session de doublage ------------------------ */
  if (dubbing) {
    const queue = toRecord;
    const current = queue[Math.min(dubIndex, queue.length - 1)] ?? null;

    return (
      <SoftPanel title="Session de doublage" padding="roomy" className="dubbing">
        {current ? (
          <>
            <p className="dubbing__counter">
              Texte {Math.min(dubIndex + 1, queue.length)} / {queue.length}
            </p>
            <VoiceTextEditor
              title={`${current.category} — ${current.id}`}
              voice={current}
              onChange={patchVoice}
            />
            <div className="ds-row">
              <PrimaryButton onClick={() => setDubIndex((index) => index + 1)}>
                Suivant
              </PrimaryButton>
              <SecondaryButton
                disabled={dubIndex === 0}
                onClick={() => setDubIndex((index) => Math.max(0, index - 1))}
              >
                Précédent
              </SecondaryButton>
              <SecondaryButton onClick={() => setDubbing(false)}>Terminer la session</SecondaryButton>
            </div>
          </>
        ) : (
          <>
            <p>Toutes les voix sont enregistrées. Bravo !</p>
            <PrimaryButton onClick={() => setDubbing(false)}>Retour</PrimaryButton>
          </>
        )}
      </SoftPanel>
    );
  }

  /* ------------------------------ tableau ------------------------------- */
  return (
    <>
      <div className="admin__cards">
        <Metric value={dashboard.total} label="textes" />
        <Metric value={dashboard.ok} label="voix enregistrées" />
        <Metric value={dashboard.missing} label="voix manquantes" />
        <Metric value={dashboard.outdated} label="voix obsolètes" />
      </div>

      {/*
        LE SILENCE SE DIT (§127).
        La voix de synthèse cachait ce cas : un fichier enregistré ailleurs,
        introuvable ici, et une voix de machine parlait à la place. Maintenant
        que rien ne parle, il faut le montrer.
      */}
      {elsewhere.length > 0 ? (
        <SoftPanel tone="soft" padding="tight">
          <p className="admin__issue">
            <IconWarning size={22} />
            {elsewhere.length} voix ont été enregistrées sur un autre appareil : leur fichier
            n’existe pas ici, elles resteront donc muettes. Réenregistrez-les depuis cet appareil,
            ou déposez les fichiers dans <code>public/media/voice/</code> du dépôt pour qu’ils
            suivent le site partout.
          </p>
        </SoftPanel>
      ) : null}

      <div className="ds-row">
        <PrimaryButton
          icon={<IconMic size={26} />}
          disabled={toRecord.length === 0}
          onClick={() => {
            setDubIndex(0);
            setDubbing(true);
          }}
        >
          Enregistrer les voix manquantes ({toRecord.length})
        </PrimaryButton>
        {FILTERS.map((item) => (
          <PillButton key={item.id} active={filter === item.id} onClick={() => setFilter(item.id)}>
            {item.label}
          </PillButton>
        ))}
      </div>

      <label className="entity-search">
        <IconSearch size={22} />
        <input
          className="entity-search__input"
          type="search"
          value={query}
          placeholder="Rechercher un texte…"
          aria-label="Rechercher un texte à enregistrer"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <SoftPanel title={`Voix (${filtered.length})`} padding="tight" className="ds-stack">
        <VoiceList
          voices={filtered}
          onChange={patchVoice}
          emptyLabel={
            query.trim().length > 0
              ? `Aucun texte ne contient « ${query.trim()} ».`
              : 'Rien à enregistrer ici.'
          }
        />
      </SoftPanel>
    </>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <SoftPanel tone="soft" padding="tight">
      <div className="admin__metric">
        <span className="admin__metric-value">{value}</span>
        <span className="admin__metric-label">{label}</span>
      </div>
    </SoftPanel>
  );
}
