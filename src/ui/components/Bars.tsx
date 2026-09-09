import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { TabButton } from './Buttons';

export interface BottomActionBarProps {
  /** Cote gauche : TOUJOURS le retour (§176). */
  left?: ReactNode;
  /** Cote droit : action principale (§177). */
  right?: ReactNode;
  className?: string;
}

/**
 * §184 — Barre d'actions basse.
 * L'enfant ne recoit jamais plus de 2-3 actions simultanees.
 */
export function BottomActionBar({ left, right, className }: BottomActionBarProps) {
  return (
    <div className={cn('ds-bottom-bar', className)}>
      <div className="ds-bottom-bar__side">{left}</div>
      <div className="ds-bottom-bar__side">{right}</div>
    </div>
  );
}

export interface TopTabItem {
  id: string;
  label: string;
  icon: ReactNode;
}

export interface TopTabsProps {
  items: TopTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Barre tres iconographique : les libelles passent en aria-label. */
  compact?: boolean;
  label: string;
  className?: string;
}

/** §149 — Barre d'onglets grands, carres arrondis, espaces. */
export function TopTabs({ items, activeId, onSelect, compact, label, className }: TopTabsProps) {
  return (
    <div className={cn('ds-tabs', className)} role="tablist" aria-label={label}>
      {items.map((item) => (
        <TabButton
          key={item.id}
          label={item.label}
          icon={item.icon}
          compact={compact}
          selected={item.id === activeId}
          onClick={() => onSelect(item.id)}
        />
      ))}
    </div>
  );
}
