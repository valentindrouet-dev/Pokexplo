import { useEffect, useRef } from 'react';
import type { VoiceMessage, VoiceMessageId } from '../../types';
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
 * l'administrateur peut l'enregistrer, la synthèse la rattrape sinon, et son
 * absence ne fait jamais rien planter.
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
    announced.current = voiceId;
    if (!settings.autoPlayVoices || settings.muted) return;
    const message = voice(voiceId);
    if (!message?.autoPlay) return;
    speak(voiceId);
  }, [voiceId, enabled, settings.autoPlayVoices, settings.muted, speak, voice]);
}

/**
 * NOMMER CE QUE L'ON VIENT DE TOUCHER (§192).
 *
 * « Toute sélection se nomme. » Une créature a une vraie voix de nom (§155) ;
 * un lieu de la carte n'en a pas, et lui en donner une créerait un second
 * endroit où son nom vivrait — donc un endroit où il pourrait diverger.
 *
 * On fabrique donc une voix ÉPHÉMÈRE portant le libellé du contenu lui-même :
 * elle ne peut pas se désynchroniser, et la synthèse la dit. Ce n'est pas une
 * voix codée en dur (CLAUDE.md §3) : le texte vient de la donnée, et une vraie
 * voix enregistrée, quand elle existe, passe toujours en premier.
 */
export function spokenName(id: string, label: string): VoiceMessage {
  return {
    id: `voice.name.${id}`,
    text: label,
    autoPlay: true,
    replayEnabled: true,
    showText: true,
    voiceMode: 'TTS',
    locale: 'fr-FR',
    category: 'ui',
    updatedAt: 0,
  };
}
