import { useEffect, useRef } from 'react';
import type { VoiceMessageId } from '../../types';
import { useAudio } from './AudioProvider';
import { useContent } from './ContentProvider';

/**
 * LA VOIX GUIDE AUSSI LA NAVIGATION (UI_DESIGN §192).
 *
 * Le moteur vocal ne servait qu'aux exercices : l'enfant devait donc
 * comprendre les mots « Pokédex », « Équipe » ou « Quêtes » pour se servir du
 * jeu. Chaque écran annonce désormais ce qu'on peut y faire, à l'arrivée, une
 * seule fois — et se tait si la même voix est déjà celle de l'écran.
 *
 * C'est une `VoiceMessage` du contenu comme les autres (CLAUDE.md §3) :
 * l'administrateur l'enregistre depuis « Voix de cette page », et son absence
 * ne fait jamais rien planter — l'écran reste simplement muet.
 */
export function useScreenVoice(voiceId: VoiceMessageId | undefined, enabled = true): void {
  const { speak, settings } = useAudio();
  const { voice } = useContent();
  const announced = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !voiceId) return;
    // Une seule annonce par arrivée : revenir sur l'écran la rejoue, un simple
    // re-rendu (une créature capturée, un filtre touché) ne la rejoue pas.
    if (announced.current === voiceId) return;
    if (!settings.autoPlayVoices || settings.muted) return;
    const message = voice(voiceId);
    /*
     * L'annonce n'est marquée « faite » que lorsqu'elle a vraiment lieu.
     * L'écran pouvait s'afficher avant que le contenu ne soit là : la voix
     * était alors notée comme dite, et l'écran restait muet pour toujours.
     */
    if (!message?.autoPlay) return;
    announced.current = voiceId;
    speak(voiceId);
  }, [voiceId, enabled, settings.autoPlayVoices, settings.muted, speak, voice]);
}
