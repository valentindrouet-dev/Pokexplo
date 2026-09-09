import { useEffect, useState } from 'react';
import type { Creature, CreatureVisual } from '../types';
import { AssetService } from '../services/AssetService';
import { cn } from '../utils/cn';

export interface CreatureSpriteProps {
  creature: Creature | null | undefined;
  size?: number;
  /** Pokedex : creature inconnue -> silhouette uniquement (§156). */
  silhouette?: boolean;
  className?: string;
  /** Petite animation de respiration, reservee a l'element mis en avant (§163). */
  animated?: boolean;
}

/**
 * Illustration d'une creature.
 *
 * Deux sources possibles :
 *  1. `creature.imagePath` : image fournie par l'administrateur (prioritaire) ;
 *  2. sinon un dessin ORIGINAL genere en SVG a partir de `creature.visual`.
 *
 * Cette seconde voie permet de livrer un jeu complet sans aucun asset externe
 * et sans jamais afficher « image manquante » a l'enfant (§174).
 */
export function CreatureSprite({
  creature,
  size = 96,
  silhouette = false,
  className,
  animated = false,
}: CreatureSpriteProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    if (creature?.imagePath && !silhouette) {
      void AssetService.getUrl(creature.imagePath).then((resolved) => {
        if (active) setUrl(resolved);
      });
    }
    return () => {
      active = false;
    };
  }, [creature?.imagePath, silhouette]);

  if (!creature) {
    return <span style={{ width: size, height: size, display: 'inline-block' }} aria-hidden="true" />;
  }

  if (url) {
    return (
      <img
        src={url}
        alt={creature.name}
        width={size}
        height={size}
        className={cn('creature-sprite', className)}
        style={{ objectFit: 'contain' }}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn('creature-sprite', animated && 'creature-sprite--breathe', className)}
      role="img"
      aria-label={silhouette ? 'Créature inconnue' : creature.name}
    >
      <CreatureShape visual={creature.visual} silhouette={silhouette} />
    </svg>
  );
}

const SILHOUETTE = '#B9B2AC';

function CreatureShape({ visual, silhouette }: { visual: CreatureVisual; silhouette: boolean }) {
  const main = silhouette ? SILHOUETTE : visual.palette[0];
  const belly = silhouette ? SILHOUETTE : visual.palette[1];
  const accent = silhouette ? SILHOUETTE : visual.accent;
  const outline = silhouette ? 'transparent' : 'rgba(81, 74, 75, 0.25)';

  return (
    <g stroke={outline} strokeWidth={1.5} strokeLinejoin="round">
      <Ears visual={visual} color={main} />
      <Body shape={visual.shape} main={main} belly={belly} />
      <Feature visual={visual} accent={accent} hidden={silhouette} />
      {silhouette ? null : <Eyes kind={visual.eyes} />}
      {silhouette ? null : <Mouth />}
    </g>
  );
}

function Body({ shape, main, belly }: { shape: CreatureVisual['shape']; main: string; belly: string }) {
  switch (shape) {
    case 'round':
      return (
        <>
          <circle cx="50" cy="56" r="30" fill={main} />
          <ellipse cx="50" cy="66" rx="18" ry="16" fill={belly} stroke="none" />
        </>
      );
    case 'blob':
      return (
        <>
          <path
            d="M50 24c17 0 30 14 30 31 0 15-13 25-30 25S20 70 20 55c0-17 13-31 30-31Z"
            fill={main}
          />
          <ellipse cx="50" cy="66" rx="17" ry="13" fill={belly} stroke="none" />
        </>
      );
    case 'quad':
      return (
        <>
          <rect x="26" y="56" width="9" height="20" rx="4" fill={main} />
          <rect x="65" y="56" width="9" height="20" rx="4" fill={main} />
          <rect x="20" y="34" width="60" height="38" rx="19" fill={main} />
          <ellipse cx="50" cy="58" rx="18" ry="12" fill={belly} stroke="none" />
        </>
      );
    case 'serpent':
      return (
        <>
          <path
            d="M28 78c0-16 12-16 12-28S26 36 34 26c6-8 22-8 30 2"
            fill="none"
            stroke={main}
            strokeWidth={16}
            strokeLinecap="round"
          />
          <circle cx="62" cy="34" r="21" fill={main} />
          <ellipse cx="62" cy="41" rx="12" ry="9" fill={belly} stroke="none" />
        </>
      );
    case 'bird':
      return (
        <>
          <path d="M18 54c10-12 22-6 26 2-8 10-20 12-26-2Z" fill={belly} />
          <path d="M82 54c-10-12-22-6-26 2 8 10 20 12 26-2Z" fill={belly} />
          <ellipse cx="50" cy="52" rx="25" ry="28" fill={main} />
          <ellipse cx="50" cy="62" rx="14" ry="12" fill={belly} stroke="none" />
        </>
      );
    case 'rock':
    default:
      return (
        <>
          <path d="M50 22 78 40l-6 34H28l-6-34Z" fill={main} />
          <path d="M38 52h24l-3 18H41Z" fill={belly} stroke="none" />
        </>
      );
  }
}

function Ears({ visual, color }: { visual: CreatureVisual; color: string }) {
  switch (visual.ears) {
    case 'pointy':
      return (
        <>
          <path d="M32 34 28 12l17 13Z" fill={color} />
          <path d="M68 34 72 12 55 25Z" fill={color} />
        </>
      );
    case 'round':
      return (
        <>
          <circle cx="30" cy="28" r="10" fill={color} />
          <circle cx="70" cy="28" r="10" fill={color} />
        </>
      );
    case 'long':
      return (
        <>
          <rect x="33" y="6" width="9" height="26" rx="4.5" fill={color} />
          <rect x="58" y="6" width="9" height="26" rx="4.5" fill={color} />
        </>
      );
    case 'fin':
      return <path d="M50 16c8 6 12 12 12 18H38c0-6 4-12 12-18Z" fill={color} />;
    case 'none':
    default:
      return null;
  }
}

function Eyes({ kind }: { kind: CreatureVisual['eyes'] }) {
  const dark = '#514A4B';
  switch (kind) {
    case 'happy':
      return (
        <g stroke={dark} strokeWidth={3} fill="none" strokeLinecap="round">
          <path d="M38 50c2-3 6-3 8 0" />
          <path d="M54 50c2-3 6-3 8 0" />
        </g>
      );
    case 'big':
      return (
        <g stroke="none">
          <circle cx="42" cy="50" r="7" fill={dark} />
          <circle cx="58" cy="50" r="7" fill={dark} />
          <circle cx="44" cy="47" r="2.4" fill="#FFFDF9" />
          <circle cx="60" cy="47" r="2.4" fill="#FFFDF9" />
        </g>
      );
    case 'sleepy':
      return (
        <g stroke={dark} strokeWidth={3} fill="none" strokeLinecap="round">
          <path d="M38 52c3 2 6 2 9 0" />
          <path d="M53 52c3 2 6 2 9 0" />
        </g>
      );
    case 'dot':
    default:
      return (
        <g stroke="none">
          <circle cx="42" cy="50" r="4" fill={dark} />
          <circle cx="58" cy="50" r="4" fill={dark} />
        </g>
      );
  }
}

function Mouth() {
  return (
    <path
      d="M46 62c2 3 6 3 8 0"
      fill="none"
      stroke="#514A4B"
      strokeWidth={2.4}
      strokeLinecap="round"
    />
  );
}

function Feature({
  visual,
  accent,
  hidden,
}: {
  visual: CreatureVisual;
  accent: string;
  hidden: boolean;
}) {
  if (hidden || visual.feature === 'none') return null;
  switch (visual.feature) {
    case 'spark':
      return <path d="M74 22 62 34h9l-6 12 14-14h-9Z" fill={accent} />;
    case 'leaf':
      return <path d="M50 16c10 2 15 9 14 18-10 1-16-5-14-18Z" fill={accent} />;
    case 'flame':
      return <path d="M50 10c6 8 10 12 10 18a10 10 0 0 1-20 0c0-6 4-10 10-18Z" fill={accent} />;
    case 'fin':
      return <path d="M78 60c8 2 12 8 10 16-8 0-13-5-10-16Z" fill={accent} />;
    case 'rock':
      return (
        <g fill={accent} stroke="none">
          <circle cx="34" cy="40" r="4" />
          <circle cx="66" cy="42" r="3" />
        </g>
      );
    case 'snow':
      return (
        <g stroke={accent} strokeWidth={2.6} strokeLinecap="round">
          <path d="M74 20v14M67 27h14M69 22l10 10M79 22l-10 10" />
        </g>
      );
    case 'wing':
      return <path d="M20 44c8-10 18-10 24-2-8 8-18 10-24 2Z" fill={accent} />;
    default:
      return null;
  }
}
