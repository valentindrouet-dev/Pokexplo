import type { ReactNode } from 'react';
import { Disclosure } from './Disclosure';
import './forms.css';

/**
 * RÉGLAGES AVANCÉS (UI_DESIGN §196).
 *
 * L'Admin doit montrer des INTENTIONS, pas la structure de données. Mais on
 * ne supprime pas ce qui reste nécessaire de temps en temps — un identifiant,
 * un chemin de fichier, une valeur d'énumération : on le replie.
 *
 * Fermé par défaut, et il dit ce qu'il contient : l'adulte sait qu'il ne rate
 * rien en le laissant fermé. C'est un `Disclosure` habillé d'un titre par
 * défaut — le plier/déplier ne vit qu'à un seul endroit.
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
  return (
    <div className="advanced">
      <Disclosure title={title} hint={hint}>
        {children}
      </Disclosure>
    </div>
  );
}
