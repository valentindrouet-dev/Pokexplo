import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { IconBall, IconHeart, IconImage } from '../icons';

export interface LoadingBallProps {
  /** Message court. Jamais « Loading… » comme ecran principal enfant (§175). */
  message?: string;
}

/** §175 — Chargement dans l'univers du jeu : une petite Ball qui tourne. */
export function LoadingBall({ message = 'Un instant…' }: LoadingBallProps) {
  return (
    <div className="ds-loading" role="status">
      <IconBall size={56} className="ds-loading__ball" />
      <span>{message}</span>
    </div>
  );
}

export interface MissingMediaProps {
  /** Cote admin on assume le message technique ; cote enfant on reste neutre. */
  admin?: boolean;
}

/** §174 — Jamais « ERROR 404 ASSET MISSING ». */
export function MissingMedia({ admin = false }: MissingMediaProps) {
  return (
    <div className="ds-missing-media" role="img" aria-label={admin ? 'Image manquante' : 'Illustration'}>
      <IconImage size={admin ? 28 : 40} />
      {admin ? <span className="ds-creature-card__name">Image manquante</span> : null}
    </div>
  );
}

export interface HeartsProps {
  total: number;
  left: number;
}

/** §24 — Cœurs de l'adversaire d'Arene. */
export function Hearts({ total, left }: HeartsProps) {
  return (
    <div className="ds-hearts" role="img" aria-label={`${left} cœurs sur ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <IconHeart
          key={index}
          size={32}
          tone={index < left ? 'currentColor' : 'none'}
          className={index < left ? undefined : 'ds-heart--empty'}
        />
      ))}
    </div>
  );
}

export interface ProgressBarProps {
  /** Valeur entre 0 et 1. */
  value: number;
  tone?: 'nature' | 'navigation' | 'collection';
  label: string;
}

export function ProgressBar({ value, tone = 'nature', label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      className="ds-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-label={label}
    >
      <div
        className={cn(
          'ds-progress__fill',
          tone === 'navigation' && 'ds-progress__fill--nav',
          tone === 'collection' && 'ds-progress__fill--collection',
        )}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}

export interface BadgeChipProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function BadgeChip({ children, icon, className }: BadgeChipProps) {
  return (
    <span className={cn('ds-badge-chip', className)}>
      {icon}
      {children}
    </span>
  );
}
