import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { IconLock } from '../icons';

export interface SelectionPointerProps {
  /** `inline` retire la marge automatique (pointeur pose a cote d'un element). */
  inline?: boolean;
  className?: string;
}

/**
 * §141 — Petit triangle doux qui flotte au-dessus de l'element choisi.
 * C'est lui qui permet a un enfant de comprendre « c'est celui-la »
 * meme s'il ne distingue pas bien les couleurs (§142).
 */
export function SelectionPointer({ inline, className }: SelectionPointerProps) {
  return (
    <svg
      className={cn('ds-pointer', inline && 'ds-pointer--inline', className)}
      viewBox="0 0 24 16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 3.5c0-1.6 1.3-2.6 2.7-2L12 4l5.3-2.5c1.4-.6 2.7.4 2.7 2 0 .5-.2 1-.5 1.4l-5.6 7.4a2.4 2.4 0 0 1-3.8 0L4.5 4.9A2.3 2.3 0 0 1 4 3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export interface SelectionTileProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  label: string;
  icon?: ReactNode;
  selected?: boolean;
  locked?: boolean;
  /** Ligne d'information courte sous le libelle. */
  hint?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * §140 — Une tuile selectionnee ne recoit pas une petite bordure :
 * elle change franchement de surface, grossit legerement et porte un pointeur.
 */
export function SelectionTile({
  label,
  icon,
  selected = false,
  locked = false,
  hint,
  className,
  children,
  ...rest
}: SelectionTileProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-disabled={locked || undefined}
      data-selected={selected}
      {...rest}
      className={cn('ds-tap ds-tile', locked && 'ds-tile--locked', className)}
    >
      {selected ? <SelectionPointer /> : null}
      {locked ? <IconLock size={28} /> : icon}
      <span>{label}</span>
      {hint ? <span className="ds-creature-card__name">{hint}</span> : null}
      {children}
    </button>
  );
}
