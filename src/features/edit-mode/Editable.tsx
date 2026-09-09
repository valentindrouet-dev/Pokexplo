import type { ReactNode } from 'react';
import { IconPencil } from '../../ui';
import { useEditMode, type EditTarget } from '../../app/providers/EditModeProvider';
import { cn } from '../../utils/cn';
import './edit-mode.css';

/**
 * ZONES ÉDITABLES SUR L'ÉCRAN DE L'ENFANT.
 *
 * Deux formes, selon ce que l'élément fait déjà :
 *
 *  - `Editable` — pour ce qui ne fait RIEN quand on le touche : un titre, une
 *    consigne, une réplique du Professeur. En mode édition, toute la zone
 *    devient un bouton qui ouvre l'éditeur.
 *  - `EditBadge` — pour ce qui a déjà une action : un lieu de la carte, une
 *    carte de créature. L'action est préservée (l'adulte doit pouvoir
 *    parcourir l'aventure) et une pastille « crayon » est posée en coin.
 *
 * Hors mode édition, ces composants n'ajoutent STRICTEMENT rien au rendu de
 * l'enfant : ni classe, ni conteneur, ni écouteur (§186 — l'interface enfant
 * ne doit pas payer le prix de l'outillage adulte).
 */
export interface EditableProps {
  target: EditTarget;
  /** Ce qu'on va modifier, lu par les lecteurs d'écran : « la consigne ». */
  label: string;
  children: ReactNode;
  className?: string;
}

export function Editable({ target, label, children, className }: EditableProps) {
  const { editing, open } = useEditMode();
  if (!editing) return <>{children}</>;

  return (
    <button
      type="button"
      className={cn('edit-zone', className)}
      aria-label={`Modifier ${label}`}
      onClick={() => open(target)}
    >
      {children}
      <span className="edit-zone__pencil" aria-hidden="true">
        <IconPencil size={20} />
      </span>
    </button>
  );
}

/**
 * Pastille d'édition posée sur un élément qui garde son action de jeu.
 * À placer dans un conteneur `position: relative`.
 */
export function EditBadge({ target, label }: { target: EditTarget; label: string }) {
  const { editing, open } = useEditMode();
  if (!editing) return null;

  return (
    <button
      type="button"
      className="edit-badge"
      aria-label={`Modifier ${label}`}
      onClick={(event) => {
        // L'élément porteur a sa propre action : on ne la déclenche pas.
        event.stopPropagation();
        event.preventDefault();
        open(target);
      }}
    >
      <IconPencil size={20} />
    </button>
  );
}
