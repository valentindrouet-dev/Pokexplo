import { useState } from 'react';
import { ModalPanel, PrimaryButton, SecondaryButton } from '../../ui';
import { useEditMode } from '../../app/providers/EditModeProvider';
import { useNavigation } from '../../app/router';
import { useAdminDraftOptional } from '../admin/AdminDraftContext';
import { DraftOutdatedNotice } from '../admin/DraftOutdatedNotice';
import { DraftPublishControl } from '../admin/DraftPublishControl';
import { PageVoicesButton } from '../admin/PageVoicesButton';
import '../admin/forms.css';
import './edit-mode.css';

/**
 * Bandeau du mode édition.
 *
 * Il dit ce qu'il faut, et rien de plus : qu'on édite, ce que l'enfant voit,
 * les voix de l'écran sous les yeux, et comment sortir. Les erreurs de contenu
 * sont signalées ici parce qu'elles bloqueraient la publication.
 */
export function EditModeBar() {
  const { editing, setEditing } = useEditMode();
  const drafting = useAdminDraftOptional();
  const { navigate } = useNavigation();
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (!editing) return null;

  /*
   * Quitter avec des modifications non publiees, c'est retrouver l'ancienne
   * version a l'ecran. On le dit AVANT, au lieu de laisser croire a une perte.
   */
  const leave = (): void => {
    if (drafting?.unpublished) setConfirmLeave(true);
    else setEditing(false);
  };

  return (
    <div className="edit-bar surface-dense">
      <span className="edit-bar__title">Mode édition</span>
      {/*
        Publier est ICI, pas au fond d'un menu : sans cela, on modifiait,
        on quittait, et l'ecran revenait a l'ancienne version sans un mot.
      */}
      <DraftPublishControl />
      {/*
        Les voix de l'écran, ICI : c'est en le regardant qu'on entend ce qui
        manque, et c'est là qu'il faut pouvoir l'enregistrer.
      */}
      <PageVoicesButton />
      <SecondaryButton onClick={() => navigate({ name: 'admin', section: 'dashboard' })}>
        Menus
      </SecondaryButton>
      <SecondaryButton onClick={leave}>Quitter l’édition</SecondaryButton>
      <DraftOutdatedNotice />

      <ModalPanel
        open={confirmLeave}
        title="Vos modifications ne sont pas publiées"
        onDismiss={() => setConfirmLeave(false)}
        actions={
          <>
            <SecondaryButton
              onClick={() => {
                setConfirmLeave(false);
                setEditing(false);
              }}
            >
              Quitter sans publier
            </SecondaryButton>
            <PrimaryButton
              disabled={drafting?.publishing}
              onClick={() => {
                void drafting?.publish({ force: true }).then(() => {
                  setConfirmLeave(false);
                  setEditing(false);
                });
              }}
            >
              Publier puis quitter
            </PrimaryButton>
          </>
        }
      >
        <p>
          Votre enfant continuera de jouer la version publiée. Vos modifications sont conservées
          dans le brouillon : vous les retrouverez en revenant en mode édition.
        </p>
      </ModalPanel>
    </div>
  );
}
