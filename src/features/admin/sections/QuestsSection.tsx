import { useState } from 'react';
import type { Chapter, Quest, QuestObjective, VoiceMessage } from '../../../types';
import { TYPE_LABELS } from '../../../types/content';
import { PillButton, SoftPanel } from '../../../ui';
import { useAdminDraft } from '../AdminDraftContext';
import { EntityPane } from '../EntityPane';
import { NumberField, SelectField, TextField } from '../fields';
import { VoiceTextEditor } from '../VoiceTextEditor';

const OBJECTIVE_KINDS: Array<{ value: QuestObjective['kind']; label: string }> = [
  { value: 'CAPTURE_COUNT', label: 'Capturer N créatures' },
  { value: 'CAPTURE_TYPE', label: 'Capturer N créatures d’un type' },
  { value: 'CAPTURE_NAME_STARTS_WITH', label: 'Capturer une créature commençant par…' },
  { value: 'CAPTURE_SYLLABLE_COUNT', label: 'Capturer une créature de N syllabes' },
  { value: 'COMPLETE_NODES', label: 'Terminer des lieux' },
  { value: 'WIN_GYM', label: 'Gagner une Arène' },
];

/** QUETES ET CHAPITRES (CONCEPTION §6, §25). */
export function QuestsSection() {
  const { draft, update } = useAdminDraft();
  const [selectedId, setSelectedId] = useState<string | null>(draft?.quests[0]?.id ?? null);
  if (!draft) return null;

  const quest = draft.quests.find((item) => item.id === selectedId) ?? draft.quests[0] ?? null;

  const patch = (changes: Partial<Quest>): void => {
    if (!quest) return;
    update((current) => ({
      ...current,
      quests: current.quests.map((item) => (item.id === quest.id ? { ...item, ...changes } : item)),
    }));
  };

  const patchVoice = (next: VoiceMessage): void =>
    update((current) => ({
      ...current,
      voiceMessages: current.voiceMessages.map((voice) => (voice.id === next.id ? next : voice)),
    }));

  const voiceById = (id: string | undefined): VoiceMessage | null =>
    draft.voiceMessages.find((voice) => voice.id === id) ?? null;

  const setObjectiveKind = (kind: QuestObjective['kind']): void => {
    if (!quest) return;
    const objective: QuestObjective =
      kind === 'CAPTURE_TYPE'
        ? { kind, type: 'PLANTE', count: 3 }
        : kind === 'CAPTURE_COUNT'
          ? { kind, count: 3 }
          : kind === 'CAPTURE_NAME_STARTS_WITH'
            ? { kind, letter: 'C', count: 1 }
            : kind === 'CAPTURE_SYLLABLE_COUNT'
              ? { kind, syllables: 3, count: 1 }
              : kind === 'COMPLETE_NODES'
                ? { kind, nodeIds: [] }
                : { kind, gymId: draft.gyms[0]?.id ?? '' };
    patch({ objective });
  };

  return (
    <>
      <EntityPane
        title="Quêtes"
        items={draft.quests}
        selectedId={quest?.id ?? null}
        onSelect={setSelectedId}
        idOf={(item) => item.id}
        labelOf={(item) => item.title}
        hintOf={(item) => item.objective.kind}
      >
        {quest ? (
          <>
            <TextField label="Titre" value={quest.title} onChange={(title) => patch({ title })} />
            <SelectField
              label="Objectif"
              value={quest.objective.kind}
              options={OBJECTIVE_KINDS}
              onChange={setObjectiveKind}
            />

            {quest.objective.kind === 'CAPTURE_TYPE' ? (
              <div className="field__row">
                <SelectField
                  label="Type"
                  value={quest.objective.type}
                  options={(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map(
                    (type) => ({ value: type, label: TYPE_LABELS[type] }),
                  )}
                  onChange={(type) =>
                    patch({ objective: { kind: 'CAPTURE_TYPE', type, count: quest.objective.kind === 'CAPTURE_TYPE' ? quest.objective.count : 3 } })
                  }
                />
                <NumberField
                  label="Nombre"
                  value={quest.objective.count}
                  min={1}
                  onChange={(count) =>
                    patch({
                      objective: {
                        kind: 'CAPTURE_TYPE',
                        type: quest.objective.kind === 'CAPTURE_TYPE' ? quest.objective.type : 'PLANTE',
                        count,
                      },
                    })
                  }
                />
              </div>
            ) : null}

            {quest.objective.kind === 'CAPTURE_COUNT' ? (
              <NumberField
                label="Nombre de créatures"
                value={quest.objective.count}
                min={1}
                onChange={(count) => patch({ objective: { kind: 'CAPTURE_COUNT', count } })}
              />
            ) : null}

            {quest.objective.kind === 'CAPTURE_NAME_STARTS_WITH' ? (
              <div className="field__row">
                <TextField
                  label="Lettre"
                  value={quest.objective.letter}
                  onChange={(letter) =>
                    patch({
                      objective: {
                        kind: 'CAPTURE_NAME_STARTS_WITH',
                        letter: letter.slice(0, 1).toUpperCase(),
                        count: quest.objective.kind === 'CAPTURE_NAME_STARTS_WITH' ? quest.objective.count : 1,
                      },
                    })
                  }
                />
              </div>
            ) : null}

            {quest.objective.kind === 'CAPTURE_SYLLABLE_COUNT' ? (
              <NumberField
                label="Nombre de syllabes"
                value={quest.objective.syllables}
                min={1}
                max={5}
                onChange={(syllables) =>
                  patch({ objective: { kind: 'CAPTURE_SYLLABLE_COUNT', syllables, count: 1 } })
                }
              />
            ) : null}

            {quest.objective.kind === 'WIN_GYM' ? (
              <SelectField
                label="Arène"
                value={quest.objective.gymId}
                options={draft.gyms.map((gym) => ({ value: gym.id, label: gym.gymName }))}
                onChange={(gymId) => patch({ objective: { kind: 'WIN_GYM', gymId } })}
              />
            ) : null}

            <div className="field">
              <span className="field__label">Débloque des lieux</span>
              <div className="ds-row">
                {draft.nodes.map((node) => (
                  <PillButton
                    key={node.id}
                    active={quest.unlocksNodes?.includes(node.id) ?? false}
                    onClick={() =>
                      patch({
                        unlocksNodes: quest.unlocksNodes?.includes(node.id)
                          ? quest.unlocksNodes.filter((id) => id !== node.id)
                          : [...(quest.unlocksNodes ?? []), node.id],
                      })
                    }
                  >
                    {node.label}
                  </PillButton>
                ))}
              </div>
            </div>

            {[
              { voice: voiceById(quest.offerVoiceId), title: 'Proposition de la quête' },
              { voice: voiceById(quest.completeVoiceId), title: 'Quête réussie' },
            ].map(({ voice, title }) =>
              voice ? (
                <VoiceTextEditor key={voice.id} title={title} voice={voice} onChange={patchVoice} />
              ) : null,
            )}
          </>
        ) : null}
      </EntityPane>

      <SoftPanel title="Chapitres" tone="soft" padding="tight">
        {draft.chapters.map((chapter: Chapter) => (
          <div key={chapter.id} className="ds-list-row">
            <span>
              {chapter.title} — {chapter.goals.length} objectif(s)
              {chapter.isFinal ? ' · chapitre final' : ''}
            </span>
          </div>
        ))}
      </SoftPanel>
    </>
  );
}
