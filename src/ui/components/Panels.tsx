import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type PanelTone = 'main' | 'soft' | 'muted';
type PanelPadding = 'tight' | 'normal' | 'roomy';

export interface SoftPanelProps {
  children: ReactNode;
  /** Titre optionnel, rendu avec la typographie de titre du systeme. */
  title?: string;
  tone?: PanelTone;
  padding?: PanelPadding;
  flat?: boolean;
  /**
   * Le panneau occupe la hauteur disponible et laisse defiler son contenu.
   * A utiliser des qu'il contient une grille ou une liste (§154).
   */
  fill?: boolean;
  className?: string;
  /** Anime l'apparition (fade + scale .97 -> 1, §162). */
  animated?: boolean;
  id?: string;
}

/**
 * §183 — Composant principal du design system.
 * Blanc chaud, coins tres arrondis, legere ombre, beaucoup de padding.
 */
export function SoftPanel({
  children,
  title,
  tone = 'main',
  padding = 'normal',
  flat = false,
  fill = false,
  className,
  animated = false,
  id,
}: SoftPanelProps) {
  return (
    <section
      id={id}
      className={cn(
        'ds-panel',
        tone === 'soft' && 'ds-panel--soft',
        tone === 'muted' && 'ds-panel--muted',
        padding === 'tight' && 'ds-panel--tight',
        padding === 'roomy' && 'ds-panel--roomy',
        flat && 'ds-panel--flat',
        fill && 'ds-panel--fill',
        animated && 'ds-anim-panel-in',
        className,
      )}
    >
      {title ? <h2 className="ds-panel__title">{title}</h2> : null}
      {children}
    </section>
  );
}

export interface ModalPanelProps {
  open: boolean;
  title?: string;
  children: ReactNode;
  /** §172 : une ou deux actions maximum. */
  actions?: ReactNode;
  /** Fermeture par la touche Echap / clic sur le fond (admin surtout). */
  onDismiss?: () => void;
  labelledBy?: string;
}

/** §172 — Modale rare : fond attenue, grande carte centrale, 1-2 actions. */
export function ModalPanel({ open, title, children, actions, onDismiss, labelledBy }: ModalPanelProps) {
  if (!open) return null;
  return (
    <div
      className="ds-modal-scrim"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss?.();
      }}
    >
      {/*
        Une modale sans nom accessible est annoncee « dialogue » et rien de
        plus : son titre etait a l'interieur, jamais rattache. Faute d'un
        `labelledBy` fourni, le titre affiche sert de nom.
      */}
      <div
        className="ds-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : title}
      >
        <SoftPanel title={title} padding="roomy">
          {children}
          {actions ? <div className="ds-modal__actions">{actions}</div> : null}
        </SoftPanel>
      </div>
    </div>
  );
}

export interface DialogCardProps {
  /** Nom du personnage : PROFESSEUR, PIERRE... */
  speaker: string;
  /** Portrait dessine (SVG) — jamais une image manquante brute (§174). */
  portrait?: ReactNode;
  /** Texte court : 1 a 3 lignes (§146). */
  text: string;
  /** Bouton 🔊 fourni par l'appelant (VoiceButton). */
  voiceButton?: ReactNode;
  /** Action contextualisee : « J'Y VAIS ! », jamais « OK » (§171). */
  action?: ReactNode;
}

/** §170 — Grande carte de dialogue tres claire. */
export function DialogCard({ speaker, portrait, text, voiceButton, action }: DialogCardProps) {
  return (
    <div className="ds-dialog ds-anim-panel-in">
      {portrait ? <div className="ds-dialog__portrait">{portrait}</div> : null}
      <SoftPanel className="ds-dialog__body" padding="roomy">
        <p className="ds-dialog__speaker">{speaker}</p>
        <p className="ds-dialog__text">{text}</p>
        <div className="ds-dialog__row">
          <div>{voiceButton}</div>
          <div>{action}</div>
        </div>
      </SoftPanel>
    </div>
  );
}

export interface TwoPaneLayoutProps {
  left: ReactNode;
  right: ReactNode;
  className?: string;
  leftLabel?: string;
  rightLabel?: string;
}

/** §154 — Deux grandes colonnes 45 % / 55 %. */
export function TwoPaneLayout({ left, right, className, leftLabel, rightLabel }: TwoPaneLayoutProps) {
  return (
    <div className={cn('ds-two-pane', className)}>
      <div className="ds-two-pane__pane" aria-label={leftLabel}>
        {left}
      </div>
      <div className="ds-two-pane__pane" aria-label={rightLabel}>
        {right}
      </div>
    </div>
  );
}
