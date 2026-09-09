import { cn } from '../../utils/cn';
import { IconSpeaker, IconSpeakerMuted, IconSpeakerPlaying } from '../icons';

export type VoiceButtonState = 'available' | 'playing' | 'muted' | 'unavailable';

export interface VoiceButtonProps {
  state: VoiceButtonState;
  onPlay: () => void;
  /** Libelle accessible : « Écouter la consigne », « Écouter le nom »... */
  label?: string;
  small?: boolean;
  className?: string;
}

/**
 * §168-169 — Composant visuel officiel du design system.
 * Rond, 56-64 px, toujours au meme endroit dans un meme contexte.
 * Pendant la lecture il pulse legerement : pas d'animation agressive.
 *
 * L'absence de voix ne fait jamais planter l'application (CLAUDE.md §3) :
 * l'etat `unavailable` reste affiche mais inactif.
 */
export function VoiceButton({
  state,
  onPlay,
  label = 'Écouter',
  small = false,
  className,
}: VoiceButtonProps) {
  const size = small ? 26 : 30;
  const icon =
    state === 'muted' ? (
      <IconSpeakerMuted size={size} />
    ) : state === 'playing' ? (
      <IconSpeakerPlaying size={size} />
    ) : (
      <IconSpeaker size={size} />
    );

  return (
    <button
      type="button"
      data-state={state}
      aria-label={label}
      title={label}
      disabled={state === 'unavailable'}
      onClick={onPlay}
      className={cn('ds-tap ds-voice', small && 'ds-voice--small', className)}
    >
      {icon}
    </button>
  );
}
