import type { ReactNode } from 'react';
import { PrimaryButton, SoftPanel, TwoPaneLayout } from '../../ui';
import { cn } from '../../utils/cn';

export interface EntityPaneProps<T> {
  title: string;
  items: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  idOf: (item: T) => string;
  labelOf: (item: T) => string;
  /** Deuxieme ligne facultative dans la liste (type, statut…). */
  hintOf?: (item: T) => string;
  onCreate?: () => void;
  createLabel?: string;
  /** Réglage qui accompagne la création (le type d'une nouvelle matrice). */
  createExtra?: ReactNode;
  children: ReactNode;
}

/** Liste + editeur : structure commune a toutes les sections de l'Admin. */
export function EntityPane<T>({
  title,
  items,
  selectedId,
  onSelect,
  idOf,
  labelOf,
  hintOf,
  onCreate,
  createLabel = 'Ajouter',
  createExtra,
  children,
}: EntityPaneProps<T>) {
  return (
    <TwoPaneLayout
      leftLabel={title}
      rightLabel="Édition"
      left={
        <SoftPanel title={`${title} (${items.length})`} padding="tight" className="ds-stack">
          {createExtra}
          {onCreate ? <PrimaryButton onClick={onCreate}>{createLabel}</PrimaryButton> : null}
          <div className="admin__scroll-list">
            {items.map((item) => {
              const id = idOf(item);
              return (
                <button
                  key={id}
                  type="button"
                  className={cn('ds-tap', 'ds-list-row')}
                  data-selected={id === selectedId}
                  aria-pressed={id === selectedId}
                  onClick={() => onSelect(id)}
                >
                  <span className="ds-stack">
                    <span>{labelOf(item)}</span>
                    {hintOf ? <span className="admin__status">{hintOf(item)}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </SoftPanel>
      }
      right={
        <SoftPanel padding="roomy" className="admin__editor ds-scroll">
          {children}
        </SoftPanel>
      }
    />
  );
}
