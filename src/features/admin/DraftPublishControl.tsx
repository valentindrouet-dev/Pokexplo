import { useState } from 'react';
import { IconCheck, IconRelease, IconWarning, PrimaryButton, SecondaryButton } from '../../ui';
import { useAdminDraftOptional } from './AdminDraftContext';
import './forms.css';

/**
 * « MON ENFANT VOIT-IL MES MODIFICATIONS ? »
 *
 * C'est la seule question qui compte après une retouche, et rien n'y répondait :
 * on modifiait, on quittait l'édition, et l'écran revenait à l'ancienne version
 * sans un mot. Les modifications vivent dans un brouillon (§99) — c'est voulu,
 * une retouche à moitié faite ne doit pas atterrir sur l'iPad en pleine partie —
 * mais il faut le DIRE, et rendre la publication accessible d'un geste.
 *
 * Ce bloc s'affiche partout où l'on édite : bandeau du mode édition et menus.
 */
export function DraftPublishControl() {
  const drafting = useAdminDraftOptional();
  const [note, setNote] = useState<string | null>(null);
  /** Voix manquantes : §53 dit qu'on peut publier quand même. On le propose. */
  const [confirmVoices, setConfirmVoices] = useState<string | null>(null);

  if (!drafting) return null;

  const errors = drafting.validation?.issues.filter((issue) => issue.level === 'ERROR').length ?? 0;

  const publish = async (force: boolean): Promise<void> => {
    setNote(null);
    setConfirmVoices(null);
    const result = await drafting.publish({ force });
    if (result.ok) {
      setNote(result.message);
      return;
    }
    // Le seul refus rattrapable : des textes sans voix enregistrée.
    if (/voix/iu.test(result.message)) setConfirmVoices(result.message);
    else setNote(result.message);
  };

  if (errors > 0) {
    return (
      <span className="draft-publish draft-publish--blocked">
        <IconWarning size={20} />
        {errors} erreur(s) de contenu — corrigez-les avant de publier.
      </span>
    );
  }

  if (confirmVoices) {
    return (
      <span className="draft-publish draft-publish--confirm">
        <span>
          {drafting.validation?.missingVoices ?? 0} texte(s) resteront muets : aucune voix n’y est
          encore enregistrée.
        </span>
        <PrimaryButton disabled={drafting.publishing} onClick={() => void publish(true)}>
          Publier quand même
        </PrimaryButton>
        <SecondaryButton onClick={() => setConfirmVoices(null)}>Annuler</SecondaryButton>
      </span>
    );
  }

  if (!drafting.unpublished) {
    return (
      <span className="draft-publish draft-publish--clean">
        <IconCheck size={20} />
        {note ?? 'Votre enfant voit cette version.'}
      </span>
    );
  }

  return (
    <span className="draft-publish">
      <span className="draft-publish__badge">Non publié</span>
      <PrimaryButton
        icon={<IconRelease size={22} />}
        disabled={drafting.publishing}
        onClick={() => void publish(false)}
      >
        {drafting.publishing ? 'Publication…' : 'Publier pour mon enfant'}
      </PrimaryButton>
      {note ? <span>{note}</span> : null}
    </span>
  );
}
