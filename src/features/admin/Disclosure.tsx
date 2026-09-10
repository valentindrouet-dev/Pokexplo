import { useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import './forms.css';

export interface DisclosureProps {
  /** Le nom accessible du bouton : lui seul, jamais l'indice. */
  title: string;
  /** Compte ou statut, à droite du titre. */
  hint?: ReactNode;
  /** Ouvert dès l'affichage, quand il n'y a qu'un groupe à montrer. */
  defaultOpen?: boolean;
  /** Piloté par le parent : accordéon, « tout déplier », « tout replier ». */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  /** `group` pour un titre de famille, `item` pour une ligne dans la famille. */
  level?: 'group' | 'item';
  children: ReactNode;
}

/**
 * SOUS-MENU DÉPLIABLE (UI_DESIGN §196).
 *
 * Une liste de cent quatre-vingts textes à enregistrer ne se lit pas : elle
 * s'endure. Ce composant est la brique qui la rend parcourable — on voit
 * d'abord les familles, on ouvre celle qu'on cherche, et on ne travaille que
 * sur une seule à la fois (§191).
 *
 * Il ne s'occupe QUE du plier/déplier. Ce qu'il y a dedans ne le regarde pas :
 * c'est ce qui lui permet de servir aussi bien aux « Réglages avancés » qu'aux
 * groupes de voix.
 */
export function Disclosure({
  title,
  hint,
  defaultOpen = false,
  open,
  onToggle,
  level = 'group',
  children,
}: DisclosureProps) {
  const [internal, setInternal] = useState(defaultOpen);
  // Piloté par le parent dès que `open` est fourni : sinon chaque bloc garde
  // son propre état, ce qui est le bon défaut pour des familles indépendantes.
  const isOpen = open ?? internal;

  const toggle = (): void => {
    if (onToggle) onToggle(!isOpen);
    else setInternal(!isOpen);
  };

  return (
    <div className={cn('disclosure', level === 'item' ? 'disclosure--item' : 'disclosure--group')}>
      <button
        type="button"
        className="ds-tap disclosure__toggle"
        aria-expanded={isOpen}
        /*
         * Le nom accessible reste le TITRE. Sans cela, le compte s'y ajoutait
         * et le bouton s'appelait « Le Professeur 3 à enregistrer · 8 voix ».
         */
        aria-label={title}
        onClick={toggle}
      >
        <span className="disclosure__chevron" aria-hidden="true">
          {isOpen ? '▾' : '▸'}
        </span>
        <span className="disclosure__title">{title}</span>
        {hint ? <span className="disclosure__hint">{hint}</span> : null}
      </button>
      {isOpen ? <div className="disclosure__body ds-stack">{children}</div> : null}
    </div>
  );
}
