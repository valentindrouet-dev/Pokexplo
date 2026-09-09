import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Environnement de test.
 *
 * jsdom n'implemente ni la lecture audio, ni MediaRecorder, ni la synthese
 * vocale : on fournit des doubles realistes pour pouvoir tester les douze
 * scenarios audio imposes par CONCEPTION §119.
 */

// Lecture audio
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  writable: true,
  value: vi.fn(),
});
Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

/**
 * jsdom ne charge jamais de metadonnees audio : sans cela, chaque mesure de
 * duree attendrait le delai de securite de VoiceRecorderService. On simule un
 * chargement immediat, comme le ferait un vrai navigateur avec un Blob local.
 */
Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
  configurable: true,
  get(): number {
    return 1.5;
  },
});

Object.defineProperty(HTMLMediaElement.prototype, 'src', {
  configurable: true,
  get(this: HTMLMediaElement): string {
    return this.getAttribute('src') ?? '';
  },
  set(this: HTMLMediaElement, value: string) {
    this.setAttribute('src', value);
    setTimeout(() => {
      const element = this as HTMLMediaElement & { onloadedmetadata?: (() => void) | null };
      element.onloadedmetadata?.();
    }, 0);
  },
});

// URL des blobs
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:pokexplo/test');
}
if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = vi.fn();
}

// Synthese vocale (TTS de secours, §59)
class FakeUtterance {
  text: string;
  lang = 'fr-FR';
  volume = 1;
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const spoken: FakeUtterance[] = [];
Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
  configurable: true,
  writable: true,
  value: FakeUtterance,
});
Object.defineProperty(globalThis, 'speechSynthesis', {
  configurable: true,
  writable: true,
  value: {
    speak: (utterance: FakeUtterance) => {
      spoken.push(utterance);
      utterance.onend?.();
    },
    cancel: vi.fn(),
    getVoices: () => [],
  },
});

export function spokenUtterances(): FakeUtterance[] {
  return spoken;
}

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  cleanup();
  spoken.length = 0;
});
