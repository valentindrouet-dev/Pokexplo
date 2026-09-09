import { useState } from 'react';
import { IconWarning, PrimaryButton } from '../../ui';
import { useAdminDraftOptional } from './AdminDraftContext';

/**
 * Le brouillon a été copié d'un contenu plus ancien que celui du site.
 *
 * Cas réel : l'application se met à jour (nouvelle carte, nouveaux lieux),
 * mais le brouillon de l'ordinateur date de la version précédente. Le
 * publier tel quel ferait REVENIR l'ancienne aventure sur l'iPad. On le dit
 * clairement, aux deux endroits où l'on édite — menus et mode édition — avec
 * la seule action utile.
 */
export function DraftOutdatedNotice() {
  const drafting = useAdminDraftOptional();
  const [busy, setBusy] = useState(false);
  if (!drafting?.outdated) return null;

  const reset = async (): Promise<void> => {
    setBusy(true);
    try {
      await drafting.resetFromPublished();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin__issue admin__issue--error draft-outdated" role="status">
      <IconWarning size={22} />
      <span className="draft-outdated__text">
        Ce brouillon vient d’une version plus ancienne du contenu (
        {drafting.outdated.basedOn ?? '?'} → {drafting.outdated.published}). Le publier ferait
        revenir l’ancienne aventure.
      </span>
      <PrimaryButton disabled={busy} onClick={() => void reset()}>
        Repartir de la version publiée
      </PrimaryButton>
    </div>
  );
}
