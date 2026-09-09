import { IconWarning, SoftPanel } from '../../../ui';
import { voiceDashboard } from '../../../utils/voice';
import { useAdminDraft } from '../AdminDraftContext';

/** CONCEPTION §115-116 — tableau de bord de l'Admin. */
export function DashboardSection() {
  const { draft, validation } = useAdminDraft();
  if (!draft) return null;

  const voices = voiceDashboard(draft);
  const errors = validation?.issues.filter((issue) => issue.level === 'ERROR') ?? [];
  const warnings = validation?.issues.filter((issue) => issue.level === 'WARNING') ?? [];

  const metrics = [
    { value: draft.creatures.length, label: 'Créatures' },
    { value: draft.nodes.length, label: 'Nœuds de carte' },
    { value: draft.exerciseTemplates.length, label: 'Matrices d’exercices' },
    { value: draft.gyms.length, label: 'Arènes' },
    { value: draft.quests.length, label: 'Quêtes' },
    { value: voices.total, label: 'Textes destinés à l’enfant' },
    { value: voices.ok, label: 'Voix valides' },
    { value: voices.missing, label: 'Voix manquantes' },
    { value: voices.outdated, label: 'Voix obsolètes' },
  ];

  return (
    <>
      <div className="admin__cards">
        {metrics.map((metric) => (
          <SoftPanel key={metric.label} tone="soft" padding="tight">
            <div className="admin__metric">
              <span className="admin__metric-value">{metric.value}</span>
              <span className="admin__metric-label">{metric.label}</span>
            </div>
          </SoftPanel>
        ))}
      </div>

      <SoftPanel title="Validation du contenu">
        {errors.length === 0 && warnings.length === 0 ? (
          <p>Aucun problème détecté. Le contenu peut être publié.</p>
        ) : (
          <div className="ds-stack">
            {[...errors, ...warnings].map((issue, index) => (
              <p
                key={`${issue.code}-${index}`}
                className={`admin__issue${issue.level === 'ERROR' ? ' admin__issue--error' : ''}`}
              >
                <IconWarning size={22} />
                <span>
                  <strong>{issue.level === 'ERROR' ? 'Erreur' : 'Avertissement'}</strong> —{' '}
                  {issue.message}
                  {issue.ref ? ` (${issue.ref})` : ''}
                </span>
              </p>
            ))}
          </div>
        )}
      </SoftPanel>
    </>
  );
}
