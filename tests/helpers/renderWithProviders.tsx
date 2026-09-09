import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { DEFAULT_AUDIO_SETTINGS } from '../../src/types/audio';
import { ContentProvider } from '../../src/app/providers/ContentProvider';
import { AudioProvider } from '../../src/app/providers/AudioProvider';
import { AuthProvider } from '../../src/app/providers/AuthProvider';
import { EditModeProvider } from '../../src/app/providers/EditModeProvider';

function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <EditModeProvider>
        <ContentProvider>
          <AudioProvider settings={{ ...DEFAULT_AUDIO_SETTINGS }} onSettingsChange={() => undefined}>
            {children}
          </AudioProvider>
        </ContentProvider>
      </EditModeProvider>
    </AuthProvider>
  );
}

/** Rend un composant avec le contenu publié et le service audio branchés. */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(ui, { wrapper: Providers });
}
