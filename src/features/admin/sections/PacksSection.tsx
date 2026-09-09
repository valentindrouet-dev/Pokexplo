import { useState } from 'react';
import type { CurriculumPack } from '../../../types';
import { PillButton } from '../../../ui';
import { useAdminDraft } from '../AdminDraftContext';
import { EntityPane } from '../EntityPane';
import { NumberField, TextField } from '../fields';

/** PACKS PEDAGOGIQUES (CONCEPTION §76) — ils plafonnent la difficulté proposée. */
export function PacksSection() {
  const { draft, update } = useAdminDraft();
  const [selectedId, setSelectedId] = useState<string | null>(draft?.curriculumPacks[0]?.id ?? null);
  if (!draft) return null;

  const pack =
    draft.curriculumPacks.find((item) => item.id === selectedId) ?? draft.curriculumPacks[0] ?? null;

  const patch = (changes: Partial<CurriculumPack>): void => {
    if (!pack) return;
    update((current) => ({
      ...current,
      curriculumPacks: current.curriculumPacks.map((item) =>
        item.id === pack.id ? { ...item, ...changes } : item,
      ),
    }));
  };

  return (
    <EntityPane
      title="Packs pédagogiques"
      items={draft.curriculumPacks}
      selectedId={pack?.id ?? null}
      onSelect={setSelectedId}
      idOf={(item) => item.id}
      labelOf={(item) => item.label}
      hintOf={(item) => `${item.level}${item.active ? ' · actif' : ''}`}
    >
      {pack ? (
        <>
          <TextField label="Libellé" value={pack.label} onChange={(label) => patch({ label })} />
          <PillButton active={pack.active} onClick={() => patch({ active: !pack.active })}>
            Pack proposé par défaut
          </PillButton>

          <div className="field">
            <span className="field__label">Compétences travaillées</span>
            <div className="ds-row">
              {draft.skills.map((skill) => (
                <PillButton
                  key={skill.id}
                  active={pack.skillIds.includes(skill.id)}
                  onClick={() =>
                    patch({
                      skillIds: pack.skillIds.includes(skill.id)
                        ? pack.skillIds.filter((id) => id !== skill.id)
                        : [...pack.skillIds, skill.id],
                    })
                  }
                >
                  {skill.label}
                </PillButton>
              ))}
            </div>
          </div>

          <div className="field__row">
            {pack.skillIds.map((skillId) => (
              <NumberField
                key={skillId}
                label={`Difficulté max — ${draft.skills.find((skill) => skill.id === skillId)?.label ?? skillId}`}
                value={pack.maxDifficulty[skillId] ?? 3}
                min={1}
                max={5}
                onChange={(value) =>
                  patch({ maxDifficulty: { ...pack.maxDifficulty, [skillId]: value } })
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </EntityPane>
  );
}
