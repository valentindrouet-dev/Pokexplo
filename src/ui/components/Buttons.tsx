import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>;

export type ButtonTone = 'action' | 'navigation' | 'challenge' | 'nature' | 'collection' | 'neutral';

const TONE_CLASS: Record<ButtonTone, string> = {
  action: 'ds-button--primary',
  navigation: 'ds-button--nav',
  challenge: 'ds-button--challenge',
  nature: 'ds-button--nature',
  collection: 'ds-button--collection',
  neutral: 'ds-button--secondary',
};

export interface ButtonProps extends NativeButtonProps {
  children: ReactNode;
  /** Icone placee avant le libelle. Jamais seule sans libelle (§186). */
  icon?: ReactNode;
  /** Icone placee apres le libelle (fleche « CONTINUER → », §177). */
  iconAfter?: ReactNode;
  large?: boolean;
  block?: boolean;
  className?: string;
}

/** §151 — Action principale : jaune, min-height 64px, coins tres arrondis. */
export function PrimaryButton({ children, icon, iconAfter, large, block, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'ds-tap ds-button ds-button--primary',
        large && 'ds-button--large',
        block && 'ds-button--block',
        className,
      )}
    >
      {icon}
      <span>{children}</span>
      {iconAfter}
    </button>
  );
}

export interface SecondaryButtonProps extends ButtonProps {
  tone?: ButtonTone;
}

/** §151 — Action secondaire : blanc ou pastel tres leger. */
export function SecondaryButton({
  children,
  icon,
  iconAfter,
  large,
  block,
  tone = 'neutral',
  className,
  ...rest
}: SecondaryButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'ds-tap ds-button',
        TONE_CLASS[tone],
        large && 'ds-button--large',
        block && 'ds-button--block',
        className,
      )}
    >
      {icon}
      <span>{children}</span>
      {iconAfter}
    </button>
  );
}

export interface IconButtonProps extends NativeButtonProps {
  /** Obligatoire : une icone n'est jamais sans alternative comprehensible. */
  label: string;
  icon: ReactNode;
  large?: boolean;
  ghost?: boolean;
  accent?: boolean;
  className?: string;
}

/** Bouton purement iconographique, toujours etiquete pour l'accessibilite. */
export function IconButton({ label, icon, large, ghost, accent, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn(
        'ds-tap ds-icon-button',
        large && 'ds-icon-button--large',
        ghost && 'ds-icon-button--ghost',
        accent && 'ds-icon-button--accent',
        className,
      )}
    >
      {icon}
    </button>
  );
}

export interface PillButtonProps extends NativeButtonProps {
  children: ReactNode;
  /** Etat actif d'un filtre ([ Tous ] [ Eau ] [ Plante ], §152). */
  active?: boolean;
  icon?: ReactNode;
  className?: string;
}

/** §152 — Bouton pilule : filtres, petits choix, categories. */
export function PillButton({ children, active = false, icon, className, ...rest }: PillButtonProps) {
  return (
    <button type="button" aria-pressed={active} {...rest} className={cn('ds-tap ds-pill', className)}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

export interface TabButtonProps extends NativeButtonProps {
  label: string;
  icon: ReactNode;
  selected: boolean;
  /** Masque le libelle textuel sur les barres tres iconographiques (§149). */
  compact?: boolean;
  className?: string;
}

/** §149 — Onglet grand, carre arrondi, principalement iconographique. */
export function TabButton({ label, icon, selected, compact, className, ...rest }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-label={compact ? label : undefined}
      {...rest}
      className={cn('ds-tap ds-tab', className)}
    >
      {icon}
      {compact ? null : <span>{label}</span>}
      <span className="ds-tab__marker" aria-hidden="true" />
    </button>
  );
}

export type ChoiceState = 'idle' | 'selected' | 'correct' | 'retry' | 'removed';

export interface ChoiceButtonProps extends NativeButtonProps {
  /** Libelle lisible : nombre, mot, lettre. Peut etre vide si `media` porte l'info. */
  label: string;
  /** Illustration (creature, direction...) pour les reponses visuelles. */
  media?: ReactNode;
  state?: ChoiceState;
  /** Elargit la carte pour les mots longs. */
  wide?: boolean;
  /** Libelle accessible si le texte visible ne suffit pas. */
  accessibleLabel?: string;
  className?: string;
}

/**
 * §153 / §167 — Reponse d'exercice : une vraie grosse carte tactile.
 * Jamais de checkbox ni de radio HTML cote enfant.
 */
export function ChoiceButton({
  label,
  media,
  state = 'idle',
  wide,
  accessibleLabel,
  className,
  ...rest
}: ChoiceButtonProps) {
  return (
    <button
      type="button"
      data-state={state}
      data-media={media ? 'true' : undefined}
      aria-label={accessibleLabel ?? (label || undefined)}
      aria-disabled={state === 'removed' ? true : undefined}
      {...rest}
      className={cn('ds-tap ds-choice', wide && 'ds-choice--wide', className)}
    >
      {media ? <span className="ds-choice__media">{media}</span> : null}
      {label ? (
        <span className={cn('ds-choice__label', Boolean(media) && 'ds-choice__label--small')}>
          {label}
        </span>
      ) : null}
    </button>
  );
}
