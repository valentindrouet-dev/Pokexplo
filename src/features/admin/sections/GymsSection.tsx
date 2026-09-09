import { useState } from 'react';
import type { Gym, VoiceMessage } from '../../../types';
import { TYPE_LABELS } from '../../../types/content';
import type { CreatureType } from '../../../types';
import { NumberField, SelectField, TextField } from '../fields';
import { PillButton, SoftPanel } from '../../../ui';
import { useAdminDraft } from '../AdminDraftContext';
import { EntityPane } from '../EntityPane';
import { VoiceTextEditor } from '../VoiceTextEditor';

const TYPES = Object.keys(TYPE_LABELS) as CreatureType[];

/** ARENES (CONCEPTION §22-23) — Maître, type, condition d'accès, adversaires, badge. */
export function GymsSection() {
  const { draft, update } = useAdminDraft();
  const [selectedId, setSelectedId] = useState<string | null>(draft?.gyms[0]?.id ?? null);
  if (!draft) return null;

  const gym = draft.gyms.find((item) => item.id === selectedId) ?? draft.gyms[0] ?? null;

  const patch = (changes: Partial<Gym>): void => {
    if (!gym) return;
    update((current) => ({
      ...current,
      gyms: current.gyms.map((item) => (item.id === gym.id ? { ...item, ...changes } : item)),
    }));
  };

  const patchVoice = (next: VoiceMessage): void =>
    update((current) => ({
      ...current,
      voiceMessages: current.voiceMessages.map((voice) => (voice.id === next.id ? next : voice)),
    }));

  const voiceById = (id: string | undefined): VoiceMessage | null =>
    draft.voiceMessages.find((voice) => voice.id === id) ?? null;

  const requirement = gym?.requires.effectiveTypes;

  return (
    <EntityPane
      title="Arènes"
      items={draft.gyms}
      selectedId={gym?.id ?? null}
      onSelect={setSelectedId}
      idOf={(item) => item.id}
      labelOf={(item) => item.gymName}
      hintOf={(item) => `${item.masterName} · ${TYPE_LABELS[item.type]}`}
    >
      {gym ? (
        <>
          <div className="field__row">
            <TextField label="Nom de l’Arène" value={gym.gymName} onChange={(gymName) => patch({ gymName })} />
            <TextField label="Maître" value={gym.masterName} onChange={(masterName) => patch({ masterName })} />
            <SelectField
              label="Type"
              value={gym.type}
              options={TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type] }))}
              onChange={(type) => patch({ type })}
            />
          </div>

          <div className="field__row">
            <SelectField
              label="Nœud"
              value={gym.nodeId}
              options={draft.nodes.map((node) => ({ value: node.id, label: node.label }))}
              onChange={(nodeId) => patch({ nodeId })}
            />
            <SelectField
              label="Badge"
              value={gym.badgeId}
              options={draft.badges.map((badge) => ({ value: badge.id, label: badge.name }))}
              onChange={(badgeId) => patch({ badgeId })}
            />
          </div>

          <SoftPanel tone="soft" padding="tight" className="ds-stack">
            <span className="field__label">
              Condition d’accès — « PRÊT POUR {gym.masterName.toUpperCase()} ? » (§23)
            </span>
            <div className="ds-row">
              {TYPES.map((type) => (
                <PillButton
                  key={type}
                  active={requirement?.types.includes(type) ?? false}
                  onClick={() => {
                    const types = requirement?.types ?? [];
                    const next = types.includes(type)
                      ? types.filter((item) => item !== type)
                      : [...types, type];
                    patch({
                      requires: {
                        ...gym.requires,
                        effectiveTypes: { types: next, count: requirement?.count ?? next.length },
                      },
                    });
                  }}
                >
                  {TYPE_LABELS[type]}
                </PillButton>
              ))}
            </div>
            <NumberField
              label="Nombre de types requis"
              value={requirement?.count ?? 0}
              min={0}
              onChange={(count) =>
                patch({
                  requires: {
                    ...gym.requires,
                    effectiveTypes: { types: requirement?.types ?? [], count },
                  },
                })
              }
            />
          </SoftPanel>

          <SoftPanel tone="soft" padding="tight" className="ds-stack">
            <span className="field__label">Adversaires (§24)</span>
            {gym.opponents.map((opponent, index) => (
              <div key={`${opponent.creatureId}-${index}`} className="field__row">
                <SelectField
                  label={`Adversaire ${index + 1}`}
                  value={opponent.creatureId}
                  options={draft.creatures.map((creature) => ({
                    value: creature.id,
                    label: creature.name,
                  }))}
                  onChange={(creatureId) =>
                    patch({
                      opponents: gym.opponents.map((item, position) =>
                        position === index ? { ...item, creatureId } : item,
                      ),
                    })
                  }
                />
                <NumberField
                  label="Cœurs"
                  value={opponent.hearts}
                  min={1}
                  max={5}
                  onChange={(hearts) =>
                    patch({
                      opponents: gym.opponents.map((item, position) =>
                        position === index ? { ...item, hearts } : item,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </SoftPanel>

          {[
            { voice: voiceById(gym.introVoiceId), title: 'Présentation du Maître' },
            { voice: voiceById(gym.requirementVoiceId), title: 'Condition d’accès' },
            { voice: voiceById(gym.victoryVoiceId), title: 'Victoire' },
            { voice: voiceById(gym.encourageVoiceId), title: 'Encouragement' },
          ].map(({ voice, title }) =>
            voice ? (
              <VoiceTextEditor key={voice.id} title={title} voice={voice} onChange={patchVoice} />
            ) : null,
          )}
        </>
      ) : null}
    </EntityPane>
  );
}
