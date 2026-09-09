import { SecondaryButton } from '../../ui';
import { useEditMode } from '../../app/providers/EditModeProvider';
import { useNavigation } from '../../app/router';
import { useAdminDraftOptional } from '../admin/AdminDraftContext';
import { DraftOutdatedNotice } from '../admin/DraftOutdatedNotice';
import '../admin/forms.css';
import './edit-mode.css';

/**
 * Bandeau du mode édition.
 *
 * Il dit trois choses, et rien de plus : qu'on édite, que le brouillon est
 * enregistré, et comment sortir. Les erreurs de contenu sont signalées ici
 * parce qu'elles bloqueraient la publication.
 */
export function EditModeBar() {
  const { editing, setEditing } = useEditMode();
  const drafting = useAdminDraftOptional();
  const { navigate } = useNavigation();

  if (!editing) return null;

  const errors =
    drafting?.validation?.issues.filter((issue) => issue.level === 'ERROR').length ?? 0;

  return (
    <div className="edit-bar surface-dense">
      <span className="edit-bar__title">Mode édition</span>
      <span className="edit-bar__status">
        {drafting?.saving
          ? 'Enregistrement…'
          : drafting?.savedAt
            ? 'Brouillon enregistré'
            : 'Brouillon'}
        {errors > 0 ? ` · ${errors} erreur(s)` : ''}
      </span>
      <SecondaryButton onClick={() => navigate({ name: 'admin', section: 'dashboard' })}>
        Menus
      </SecondaryButton>
      <SecondaryButton onClick={() => setEditing(false)}>Quitter l’édition</SecondaryButton>
      <DraftOutdatedNotice />
    </div>
  );
}
