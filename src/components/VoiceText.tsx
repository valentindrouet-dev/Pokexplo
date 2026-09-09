import type { VoiceMessageId } from '../types';
import { VoiceButton } from '../ui';
import { useAudio, useAutoVoice } from '../app/providers/AudioProvider';
import { useContent } from '../app/providers/ContentProvider';
import { cn } from '../utils/cn';

export interface VoiceTextProps {
  voiceId: VoiceMessageId | undefined;
  /** Texte de repli si la VoiceMessage n'existe pas encore dans le contenu. */
  fallbackText?: string;
  /** Lecture automatique a l'affichage (§37). */
  autoPlay?: boolean;
  small?: boolean;
  /** Position du bouton 🔊 : toujours la meme dans un contexte donne (§168). */
  buttonPosition?: 'before' | 'after' | 'none';
  className?: string;
  label?: string;
}

/**
 * Bloc « TEXTE + VOIX » (CONCEPTION §36).
 *
 * C'est le seul composant a utiliser pour afficher un texte destine a l'enfant :
 * il garantit qu'un bouton de reecoute est toujours disponible et que
 * l'absence de voix ne casse rien (le texte reste lisible, §127).
 */
export function VoiceText({
  voiceId,
  fallbackText,
  autoPlay = false,
  small = false,
  buttonPosition = 'before',
  className,
  label = 'Écouter',
}: VoiceTextProps) {
  const { voice } = useContent();
  const { speak, buttonState } = useAudio();
  const message = voice(voiceId);
  const text = message?.showText === false ? '' : (message?.text ?? fallbackText ?? '');

  useAutoVoice(voiceId, autoPlay);

  const button =
    buttonPosition === 'none' ? null : (
      <VoiceButton
        state={buttonState(voiceId)}
        onPlay={() => speak(voiceId)}
        label={label}
        small={small}
      />
    );

  return (
    <div className={cn('voice-text', className)}>
      {buttonPosition === 'before' ? button : null}
      <div className="voice-text__body">
        <p className={cn('voice-text__text', small && 'voice-text__text--small')}>{text}</p>
      </div>
      {buttonPosition === 'after' ? button : null}
    </div>
  );
}
