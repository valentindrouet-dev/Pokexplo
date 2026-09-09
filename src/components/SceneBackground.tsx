import type { Biome } from '../types';
import { cn } from '../utils/cn';

export interface SceneBackgroundProps {
  biome: Biome | null | undefined;
  /** Attenue le decor quand un grand panneau est pose par-dessus (§133). */
  scrim?: 'none' | 'light' | 'soft';
  className?: string;
}

/**
 * Decor du biome, dessine en SVG.
 *
 * §133 : le monde reste VISIBLE derriere les menus — l'enfant doit toujours
 * pouvoir se dire « je suis dans la forêt ». On ne floute jamais massivement.
 */
export function SceneBackground({ biome, scrim = 'light', className }: SceneBackgroundProps) {
  const sky = biome?.sky ?? ['#FFF8EC', '#FFE9A2'];
  const ground = biome?.ground ?? '#A8D86E';
  const accent = biome?.accent ?? '#62D7D0';
  const kind = biome?.kind ?? 'PRAIRIE';

  return (
    <div className={cn('ds-scene', className)} aria-hidden="true">
      <svg className="scene" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="scene-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sky[0]} />
            <stop offset="100%" stopColor={sky[1]} />
          </linearGradient>
        </defs>
        <rect width="160" height="100" fill="url(#scene-sky)" />
        <circle cx="132" cy="18" r="10" fill={accent} opacity="0.35" />

        {kind === 'CAVE' || kind === 'MOUNTAIN' ? (
          <path d="M0 66 34 34l24 20 22-24 30 26 50-18v62H0Z" fill={ground} opacity="0.9" />
        ) : (
          <path d="M0 70c26-10 42 6 66 0s44-16 94-4v34H0Z" fill={ground} opacity="0.9" />
        )}

        {kind === 'RIVER' ? (
          <path d="M0 84c30-8 48 8 74 2s52-14 86-6v20H0Z" fill={accent} opacity="0.65" />
        ) : null}

        {kind === 'FOREST' ? (
          <g fill={accent} opacity="0.55">
            <circle cx="24" cy="60" r="14" />
            <circle cx="46" cy="54" r="11" />
            <circle cx="118" cy="58" r="13" />
            <circle cx="140" cy="63" r="9" />
          </g>
        ) : null}

        {kind === 'PRAIRIE' || kind === 'CENTER' ? (
          <g fill={accent} opacity="0.4">
            <circle cx="30" cy="88" r="3" />
            <circle cx="70" cy="92" r="2.4" />
            <circle cx="112" cy="86" r="3.2" />
          </g>
        ) : null}
      </svg>
      {scrim === 'none' ? null : (
        <div className={cn('ds-scene__scrim', scrim === 'soft' && 'ds-scene__scrim--soft')} />
      )}
    </div>
  );
}
