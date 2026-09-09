import { useCallback, useEffect, useState } from 'react';
import type { SaveFile } from '../../../types';
import { SaveService } from '../../../services';
import { masteryByCategory, skillsToPractice } from '../../../exercise-engine';
import { ProgressBar, SoftPanel } from '../../../ui';
import { percent } from '../../../utils/text';
import { useAdminDraft } from '../AdminDraftContext';

/** SUIVI DE PROGRESSION (CONCEPTION §77, §115). */
export function ProgressSection() {
  const { draft } = useAdminDraft();
  const [profiles, setProfiles] = useState<SaveFile[]>([]);

  const refresh = useCallback(async () => {
    setProfiles(await SaveService.listProfiles());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!draft) return null;

  const categoryOf: Record<string, string> = {};
  for (const skill of draft.skills) categoryOf[skill.id] = skill.parentLabel;

  return (
    <>
      {profiles.map((save) => {
        const categories = masteryByCategory(save.learning, categoryOf);
        const toPractice = skillsToPractice(save.learning, 5);
        return (
          <SoftPanel key={save.profile.id} title={save.profile.nickname} className="ds-stack">
            {Object.entries(categories).length === 0 ? (
              <p className="admin__status">Aucun exercice réalisé pour l’instant.</p>
            ) : (
              Object.entries(categories).map(([label, value]) => (
                <div key={label} className="admin__metric">
                  <div className="parent__stat-head">
                    <span>{label}</span>
                    <span>{percent(value)}</span>
                  </div>
                  <ProgressBar value={value} label={label} />
                </div>
              ))
            )}

            {toPractice.length > 0 ? (
              <>
                <p className="field__label">À retravailler</p>
                {toPractice.map((stats) => (
                  <div key={stats.skillId} className="ds-list-row">
                    <span>{draft.skills.find((skill) => skill.id === stats.skillId)?.label}</span>
                    <span className="admin__status">
                      {percent(stats.mastery)} · {stats.attemptCount} exercices · difficulté{' '}
                      {stats.currentDifficulty}
                    </span>
                  </div>
                ))}
              </>
            ) : null}
          </SoftPanel>
        );
      })}
      {profiles.length === 0 ? (
        <SoftPanel title="Progression">
          <p className="admin__status">Aucun profil enregistré.</p>
        </SoftPanel>
      ) : null}
    </>
  );
}
