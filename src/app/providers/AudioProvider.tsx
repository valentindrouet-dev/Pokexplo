import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AudioSettings, VoiceMessage, VoiceMessageId } from '../../types';
import { AudioService, type AudioState } from '../../services';
import type { VoiceButtonState } from '../../ui';
import { useContent } from './ContentProvider';

export interface AudioContextValue {
  state: AudioState;
  settings: AudioSettings;
  setSettings: (settings: AudioSettings) => void;
  /** Debloque l'audio iPad au premier toucher (§64). */
  unlock: () => Promise<void>;
  /** Joue une voix par identifiant de contenu. Silencieux si elle n'existe pas. */
  speak: (voiceId: VoiceMessageId | undefined) => void;
  speakMessage: (voice: VoiceMessage | null | undefined) => void;
  stop: () => void;
  /** Etat a passer a <VoiceButton /> (§168). */
  buttonState: (voiceId: VoiceMessageId | undefined) => VoiceButtonState;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({
  children,
  settings,
  onSettingsChange,
}: {
  children: ReactNode;
  settings: AudioSettings;
  onSettingsChange: (settings: AudioSettings) => void;
}) {
  const { voice } = useContent();
  const [state, setState] = useState<AudioState>(() => AudioService.getState());

  useEffect(() => AudioService.subscribe(setState), []);

  useEffect(() => {
    AudioService.setSettings(settings);
  }, [settings]);

  const speakMessage = useCallback((message: VoiceMessage | null | undefined) => {
    if (!message) return;
    void AudioService.playVoice(message);
  }, []);

  const speak = useCallback(
    (voiceId: VoiceMessageId | undefined) => {
      speakMessage(voice(voiceId));
    },
    [speakMessage, voice],
  );

  const value = useMemo<AudioContextValue>(
    () => ({
      state,
      settings,
      setSettings: onSettingsChange,
      unlock: () => AudioService.unlock(),
      speak,
      speakMessage,
      stop: () => AudioService.stopVoice(),
      buttonState: (voiceId) => {
        if (!voiceId) return 'unavailable';
        const message = voice(voiceId);
        if (!message || message.voiceMode === 'NONE') return 'unavailable';
        if (settings.muted) return 'muted';
        return state.playingVoiceId === voiceId ? 'playing' : 'available';
      },
    }),
    [state, settings, onSettingsChange, speak, speakMessage, voice],
  );

  return <AudioContext value={value}>{children}</AudioContext>;
}

export function useAudio(): AudioContextValue {
  const context = use(AudioContext);
  if (!context) throw new Error('useAudio doit être utilisé dans <AudioProvider>');
  return context;
}

/**
 * Joue une voix une seule fois a l'affichage, si elle est en lecture
 * automatique et si le parent ne l'a pas desactivee (§37).
 */
export function useAutoVoice(voiceId: VoiceMessageId | undefined, enabled = true): void {
  const { speak, settings } = useAudio();
  const { voice } = useContent();

  useEffect(() => {
    if (!enabled || !voiceId || !settings.autoPlayVoices || settings.muted) return;
    const message = voice(voiceId);
    if (!message?.autoPlay) return;
    speak(voiceId);
  }, [voiceId, enabled, settings.autoPlayVoices, settings.muted, speak, voice]);
}
