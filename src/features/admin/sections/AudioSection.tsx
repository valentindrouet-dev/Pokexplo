import { useMemo, useState } from 'react';
import type { VoiceMessage, VoiceStatus } from '../../../types';
import { voiceDashboard, voiceStatus, voicesToRecord, VOICE_STATUS_LABEL } from '../../../utils/voice';
import { IconMic, PillButton, PrimaryButton, SecondaryButton, SoftPanel } from '../../../ui';
import { useAdminDraft } from '../AdminDraftContext';
import { EntityPane } from '../EntityPane';
import { VoiceTextEditor } from '../VoiceTextEditor';

type Filter = 'ALL' | 'TO_RECORD' | VoiceStatus;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'TO_RECORD', label: 'À enregistrer' },
  { id: 'VOICE_MISSING', label: 'Manquantes' },
  { id: 'VOICE_OUTDATED', label: 'Obsolètes' },
  { id: 'VOICE_OK', label: 'Valides' },
];

/**
 * TABLEAU DE BORD DES VOIX (CONCEPTION §116) et
 * MODE SESSION DE DOUBLAGE (§117).
 */
export function AudioSection() {
  const { draft, update } = useAdminDraft();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [category, setCategory] = useState<string>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dubbing, setDubbing] = useState(false);
  const [dubIndex, setDubIndex] = useState(0);

  const dashboard = useMemo(() => (draft ? voiceDashboard(draft) : null), [draft]);
  const toRecord = useMemo(() => (draft ? voicesToRecord(draft) : []), [draft]);

  const filtered = useMemo(() => {
    if (!draft) return [];
    return draft.voiceMessages.filter((voice) => {
      if (category !== 'ALL' && voice.category !== category) return false;
      const status = voiceStatus(voice);
      if (filter === 'ALL') return true;
      if (filter === 'TO_RECORD') return status === 'VOICE_MISSING' || status === 'VOICE_OUTDATED';
      return status === filter;
    });
  }, [draft, filter, category]);

  if (!draft || !dashboard) return null;

  const patchVoice = (next: VoiceMessage): void => {
    update((current) => ({
      ...current,
      voiceMessages: current.voiceMessages.map((voice) => (voice.id === next.id ? next : voice)),
    }));
  };

  const categories = ['ALL', ...new Set(draft.voiceMessages.map((voice) => voice.category))];

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
  const selected =
    draft.voiceMessages.find((voice) => voice.id === selectedId) ?? filtered[0] ?? null;

  return (
    <>
      <div className="admin__cards">
        <Metric value={dashboard.total} label="textes" />
        <Metric value={dashboard.ok} label="voix valides" />
        <Metric value={dashboard.missing} label="voix manquantes" />
        <Metric value={dashboard.outdated} label="voix obsolètes" />
      </div>

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

      <div className="ds-row">
        {categories.map((item) => (
          <PillButton key={item} active={category === item} onClick={() => setCategory(item)}>
            {item === 'ALL' ? 'Toutes les sections' : item}
          </PillButton>
        ))}
      </div>

      <EntityPane
        title="Voix"
        items={filtered}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
        idOf={(item) => item.id}
        labelOf={(item) => (item.text.length > 48 ? `${item.text.slice(0, 48)}…` : item.text)}
        hintOf={(item) => `${item.category} · ${VOICE_STATUS_LABEL[voiceStatus(item)]}`}
      >
        {selected ? (
          <VoiceTextEditor
            title={`${selected.category} — ${selected.id}`}
            voice={selected}
            onChange={patchVoice}
          />
        ) : (
          <p className="admin__status">Aucune voix ne correspond à ce filtre.</p>
        )}
      </EntityPane>
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
