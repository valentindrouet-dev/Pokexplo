import type { ReactNode } from 'react';

export interface IconProps {
  /** Taille en pixels (carre). Par defaut : suit la taille du texte. */
  size?: number;
  /** Aplat pastel de remplissage (§148). */
  tone?: string;
  className?: string;
  /**
   * Les icones sont decoratives par defaut : le libelle accessible est porte
   * par le bouton qui les contient (CLAUDE.md : jamais d'icone sans
   * alternative comprehensible).
   */
  title?: string;
}

interface IconBaseProps extends IconProps {
  children: ReactNode;
}

/**
 * Base commune a toutes les icones du design system (§148).
 * Meme grille (24), meme epaisseur de trait, memes extremites arrondies :
 * on n'utilise jamais d'icones venant de plusieurs bibliotheques.
 */
export function IconBase({ size = 28, tone = 'none', className, title, children }: IconBaseProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={tone}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}
