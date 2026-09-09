import { vi } from 'vitest';

/** Double de MediaRecorder pour tester l'enregistrement sans navigateur reel. */
export class FakeMediaRecorder {
  static supported = new Set<string>(['audio/webm;codecs=opus', 'audio/webm']);

  static isTypeSupported(mimeType: string): boolean {
    return FakeMediaRecorder.supported.has(mimeType);
  }

  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  readonly mimeType: string;

  constructor(_stream: MediaStream, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType ?? 'audio/webm';
  }

  start(): void {
    this.state = 'recording';
  }

  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['voix-de-test'], { type: this.mimeType }) });
    this.onstop?.();
  }
}

export function installMediaRecorder(): void {
  Object.defineProperty(globalThis, 'MediaRecorder', {
    configurable: true,
    writable: true,
    value: FakeMediaRecorder,
  });
}

export function installMicrophone(granted: boolean): void {
  const getUserMedia = granted
    ? vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      } as unknown as MediaStream)
    : vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    writable: true,
    value: { getUserMedia },
  });
}

export function removeMicrophone(): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    writable: true,
    value: undefined,
  });
}
