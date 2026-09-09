import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { SelectionPointer } from './Selection';

export interface CreatureCardProps {
  /** Nom affiche. Ignore si `state` vaut `unknown`. */
  name: string;
  /**
   * Illustration fournie par l'appelant : le design system ne connait pas le
   * domaine (CLAUDE.md : composants reutilisables).
   */
  media: ReactNode;
  state?: 'unknown' | 'seen' | 'captured';
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  /** Petit contenu additionnel (type, nombre d'exemplaires...). */
  footer?: ReactNode;
}

/** §156 — Carte de creature d'une grille ; silhouette + ??? si inconnue. */
export function CreatureCard({
  name,
  media,
  state = 'captured',
  selected = false,
  onSelect,
  className,
  footer,
}: CreatureCardProps) {
  const unknown = state === 'unknown';
  const label = unknown ? 'Créature inconnue' : name;

  return (
    <button
      type="button"
      data-selected={selected}
      aria-pressed={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn('ds-tap ds-creature-card', className)}
    >
      {selected ? <SelectionPointer /> : null}
      <span className="ds-creature-card__media">{media}</span>
      <span className={cn('ds-creature-card__name', unknown && 'ds-creature-card__unknown')}>
        {unknown ? '???' : name}
      </span>
      {footer}
    </button>
  );
}
