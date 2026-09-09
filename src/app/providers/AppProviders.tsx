import { useCallback, type ReactNode } from 'react';
import type { AudioSettings } from '../../types';
import { DEFAULT_AUDIO_SETTINGS } from '../../types/audio';
import { ContentProvider } from './ContentProvider';
import { GameProvider, useGame } from './GameProvider';
import { AudioProvider } from './AudioProvider';
import { AuthProvider } from './AuthProvider';

/**
 * Les reglages audio vivent dans la sauvegarde du profil (§101) : ce pont les
 * transmet a AudioProvider et renvoie les changements dans le moteur de jeu.
 */
function AudioSettingsBridge({ children }: { children: ReactNode }) {
  const { save, dispatch } = useGame();
  const settings: AudioSettings = save?.profile.audioSettings ?? DEFAULT_AUDIO_SETTINGS;

  const onSettingsChange = useCallback(
    (next: AudioSettings) => {
      void dispatch({ kind: 'AUDIO_SETTINGS', settings: next });
    },
    [dispatch],
  );

  return (
    <AudioProvider settings={settings} onSettingsChange={onSettingsChange}>
      {children}
    </AudioProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ContentProvider>
        <GameProvider>
          <AudioSettingsBridge>{children}</AudioSettingsBridge>
        </GameProvider>
      </ContentProvider>
    </AuthProvider>
  );
}
