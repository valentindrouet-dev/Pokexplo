import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { DEFAULT_AUDIO_SETTINGS } from '../../src/types/audio';
import { ContentProvider } from '../../src/app/providers/ContentProvider';
import { AudioProvider } from '../../src/app/providers/AudioProvider';

function Providers({ children }: { children: ReactNode }) {
  return (
    <ContentProvider>
      <AudioProvider settings={{ ...DEFAULT_AUDIO_SETTINGS }} onSettingsChange={() => undefined}>
        {children}
      </AudioProvider>
    </ContentProvider>
  );
}

/** Rend un composant avec le contenu publié et le service audio branchés. */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(ui, { wrapper: Providers });
}
