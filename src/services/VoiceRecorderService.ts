import type { MediaPath, VoiceMessageId } from '../types';
import { voiceFileName } from '../utils/id';
import { textHash } from '../utils/hash';
import { AssetService } from './AssetService';

export type MicPermission = 'granted' | 'denied' | 'unsupported';

export interface RecordingTake {
  blob: Blob;
  mimeType: string;
  extension: string;
  duration: number;
  /** URL de preecoute, a revoquer via `releasePreview`. */
  previewUrl: string;
}

export interface StoredTake {
  audioPath: MediaPath;
  mimeType: string;
  duration: number;
  textHash: string;
  recordedAt: number;
}

/**
 * CONCEPTION §45-46 — strategie de format.
 * L'administrateur n'a JAMAIS a choisir un codec.
 */
const MIME_PRIORITY: Array<{ mimeType: string; extension: string }> = [
  { mimeType: 'audio/mp4', extension: 'm4a' },
  { mimeType: 'audio/mp4;codecs=mp4a.40.2', extension: 'm4a' },
  { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
  { mimeType: 'audio/webm', extension: 'webm' },
  { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
];

/** CONCEPTION §44 — formats acceptes a l'import manuel. */
export const IMPORTABLE_EXTENSIONS = ['m4a', 'mp3', 'wav', 'webm', 'ogg', 'aac', 'mp4'] as const;

export const IMPORT_ACCEPT = 'audio/*,.m4a,.mp3,.wav,.webm,.ogg,.aac';

export class MicrophoneError extends Error {
  constructor(
    message: string,
    readonly permission: MicPermission,
  ) {
    super(message);
    this.name = 'MicrophoneError';
  }
}

/**
 * VOICE RECORDER SERVICE (CONCEPTION §61-63).
 *
 * Le microphone n'est demande QUE lorsque l'administrateur clique reellement
 * sur « 🎙 Enregistrer » — jamais au chargement de l'Admin (§62).
 */
class VoiceRecorderServiceImpl {
  private recorder: MediaRecorder | null = null;

  private stream: MediaStream | null = null;

  private chunks: Blob[] = [];

  private startedAt = 0;

  /** Format retenu par le navigateur courant (§46). */
  getSupportedMimeType(): { mimeType: string; extension: string } {
    if (typeof MediaRecorder === 'undefined') {
      return { mimeType: '', extension: 'webm' };
    }
    for (const candidate of MIME_PRIORITY) {
      try {
        if (MediaRecorder.isTypeSupported(candidate.mimeType)) return candidate;
      } catch {
        /* certains navigateurs levent : on continue */
      }
    }
    // Format natif : on laisse le navigateur decider.
    return { mimeType: '', extension: 'webm' };
  }

  isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  /**
   * CONCEPTION §63 — en cas de refus, l'application ne plante pas :
   * l'appelant propose « reessayer » ou « importer un fichier ».
   */
  async requestMicrophonePermission(): Promise<MicPermission> {
    if (!this.isSupported()) return 'unsupported';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      this.stream = stream;
      return 'granted';
    } catch {
      return 'denied';
    }
  }

  async startRecording(): Promise<void> {
    if (!this.isSupported()) {
      throw new MicrophoneError("Ce navigateur ne permet pas l'enregistrement.", 'unsupported');
    }
    if (!this.stream) {
      const permission = await this.requestMicrophonePermission();
      if (permission !== 'granted') {
        throw new MicrophoneError('Accès au microphone refusé.', permission);
      }
    }

    const { mimeType } = this.getSupportedMimeType();
    const stream = this.stream;
    if (!stream) {
      throw new MicrophoneError('Microphone indisponible.', 'denied');
    }

    this.chunks = [];
    this.recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.startedAt = Date.now();
    this.recorder.start();
  }

  isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }

  /** Duree ecoulee, pour le chronometre du prompteur (§41). */
  elapsedSeconds(): number {
    return this.startedAt === 0 ? 0 : (Date.now() - this.startedAt) / 1000;
  }

  async stopRecording(): Promise<RecordingTake> {
    const recorder = this.recorder;
    if (!recorder) throw new MicrophoneError('Aucun enregistrement en cours.', 'denied');

    const { extension } = this.getSupportedMimeType();
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorder.stop();
    });

    const duration = await this.measureDuration(blob, (Date.now() - this.startedAt) / 1000);
    this.recorder = null;
    this.releaseStream();

    return {
      blob,
      mimeType: blob.type || 'audio/webm',
      extension,
      duration,
      previewUrl: URL.createObjectURL(blob),
    };
  }

  /** Annulation : on jette la prise sans rien ecrire. */
  cancelRecording(): void {
    try {
      if (this.recorder && this.recorder.state !== 'inactive') {
        this.recorder.onstop = null;
        this.recorder.stop();
      }
    } catch {
      /* ignore */
    }
    this.recorder = null;
    this.chunks = [];
    this.releaseStream();
  }

  private releaseStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  /**
   * CONCEPTION §47 — pas de transcodage : on releve simplement la duree.
   * Si le navigateur ne sait pas la lire, on garde la duree mesuree au chrono.
   */
  private async measureDuration(blob: Blob, fallback: number): Promise<number> {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(blob);
        const audio = new Audio();
        const done = (value: number): void => {
          URL.revokeObjectURL(url);
          resolve(Number.isFinite(value) && value > 0 ? value : Math.max(0, fallback));
        };
        audio.onloadedmetadata = () => done(audio.duration);
        audio.onerror = () => done(fallback);
        // Certains navigateurs renvoient Infinity sur les blobs WebM.
        setTimeout(() => done(audio.duration || fallback), 1500);
        audio.src = url;
      } catch {
        resolve(Math.max(0, fallback));
      }
    });
  }

  /** CONCEPTION §43 — import d'un fichier prepare dans un autre logiciel. */
  async importFile(file: File): Promise<RecordingTake> {
    const extension = (file.name.split('.').pop() ?? 'mp3').toLowerCase();
    const duration = await this.measureDuration(file, 0);
    return {
      blob: file,
      mimeType: file.type || `audio/${extension}`,
      extension,
      duration,
      previewUrl: URL.createObjectURL(file),
    };
  }

  /**
   * CONCEPTION §48, §71 — le fichier est nomme, range et associe automatiquement.
   * L'administrateur ne gere jamais les noms de fichiers.
   */
  async upload(
    voiceId: VoiceMessageId,
    take: RecordingTake,
    options: { text: string; category: string },
  ): Promise<StoredTake> {
    const path = `media/voice/${options.category}/${voiceFileName(voiceId, take.extension)}`;
    await AssetService.put(path, take.blob, { mimeType: take.mimeType, duration: take.duration });
    return {
      audioPath: path,
      mimeType: take.mimeType,
      duration: take.duration,
      textHash: textHash(options.text),
      recordedAt: Date.now(),
    };
  }

  /** Supprime un fichier audio devenu inutile (ancienne prise abandonnee, §42). */
  async delete(path: MediaPath | undefined): Promise<void> {
    if (!path) return;
    await AssetService.remove(path).catch(() => undefined);
  }

  releasePreview(take: RecordingTake | null): void {
    if (take?.previewUrl) URL.revokeObjectURL(take.previewUrl);
  }
}

export const VoiceRecorderService = new VoiceRecorderServiceImpl();
