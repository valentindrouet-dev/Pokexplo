import { useState, type ReactNode } from 'react';
import './forms.css';

/**
 * RÉGLAGES AVANCÉS (UI_DESIGN §196).
 *
 * L'Admin doit montrer des INTENTIONS, pas la structure de données. Mais on
 * ne supprime pas ce qui reste nécessaire de temps en temps — un identifiant,
 * un chemin de fichier, une valeur d'énumération : on le replie.
 *
 * Fermé par défaut, et il dit ce qu'il contient : l'adulte sait qu'il ne rate
 * rien en le laissant fermé.
 */
export function AdvancedPanel({
  title = 'Réglages avancés',
  hint,
  children,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="advanced">
      <button
        type="button"
        className="ds-tap advanced__toggle"
        aria-expanded={open}
        /*
         * Le nom accessible reste le TITRE : sans cela, l'indice s'y ajoutait
         * et le bouton s'appelait « Options avancées lecture automatique,
         * voix de synthèse, prise précédente ».
         */
        aria-label={title}
        onClick={() => setOpen(!open)}
      >
        <span className="advanced__chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <span>{title}</span>
        {hint ? <span className="admin__status">{hint}</span> : null}
      </button>
      {open ? <div className="advanced__body ds-stack">{children}</div> : null}
    </div>
  );
}
