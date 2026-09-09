import { textHash } from '../utils/hash';

/**
 * AVATAR DE PROFIL (§190).
 *
 * L'enfant doit reconnaître SA place sur l'écran d'accueil sans savoir lire
 * son prénom. On dessine donc une petite frimousse, en SVG original, tirée de
 * son identifiant : elle est stable pour un profil donné, différente d'un
 * enfant à l'autre, et ne coûte aucun asset (CLAUDE.md §5).
 */
const FACES = [
  { skin: 'var(--color-yellow)', hair: 'var(--color-coral)' },
  { skin: 'var(--color-aqua)', hair: 'var(--color-lavender)' },
  { skin: 'var(--color-green)', hair: 'var(--color-yellow)' },
  { skin: 'var(--color-lilac)', hair: 'var(--color-aqua)' },
  { skin: 'var(--color-coral-soft)', hair: 'var(--color-green)' },
  { skin: 'var(--color-lavender-soft)', hair: 'var(--color-coral)' },
];

export function PlayerAvatar({ seed, size = 120 }: { seed: string; size?: number }) {
  // L'empreinte du contenu sert déjà ailleurs : on la réutilise plutôt que
  // d'inventer un second hachage.
  const face = FACES[parseInt(textHash(seed).slice(0, 4), 16) % FACES.length]!;
  return (
    <svg
      className="player-avatar"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="32" r="30" fill={face.skin} />
      {/* Casquette : c'est elle qui distingue le plus vite un profil d'un autre. */}
      <path d="M6 28a26 26 0 0 1 52 0Z" fill={face.hair} />
      <path d="M30 28h28a6 6 0 0 1-6 6H30Z" fill={face.hair} opacity="0.75" />
      <circle cx="23" cy="38" r="3.4" fill="var(--color-text)" />
      <circle cx="41" cy="38" r="3.4" fill="var(--color-text)" />
      <path
        d="M25 46a9 9 0 0 0 14 0"
        stroke="var(--color-text)"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
