import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceMessage, VoiceStatus } from '../../types';
import { AudioService, MicrophoneError, VoiceRecorderService, IMPORT_ACCEPT } from '../../services';
import type { MicPermission, RecordingTake } from '../../services';
import { formatDuration, formatTimer } from '../../utils/text';
import { voiceStatus, VOICE_STATUS_LABEL } from '../../utils/voice';
import {
  IconCheck,
  IconMic,
  IconPlay,
  IconRecord,
  IconRefresh,
  IconStop,
  IconTrash,
  IconUpload,
  IconWarning,
  PillButton,
  PrimaryButton,
  SecondaryButton,
} from '../../ui';
import { cn } from '../../utils/cn';
import { AdvancedPanel } from './AdvancedPanel';

export interface VoiceTextEditorProps {
  /** Le bloc « texte + voix » edite. */
  voice: VoiceMessage;
  onChange: (voice: VoiceMessage) => void;
  /** Titre du bloc : « Dialogue du Professeur », « Consigne »… */
  title: string;
  /** Empeche l'edition du texte quand il vient d'ailleurs (matrice d'exercice). */
  readOnlyText?: boolean;
}

type Phase = 'idle' | 'recording' | 'review' | 'denied';

const STATUS_CLASS: Record<VoiceStatus, string> = {
  VOICE_OK: 'vte__status--ok',
  VOICE_OUTDATED: 'vte__status--outdated',
  VOICE_MISSING: 'vte__status--missing',
  TEXT_ONLY: '',
  NO_TEXT: '',
};

/**
 * COMPOSANT ADMIN GENERIQUE (CONCEPTION §38-42, §128).
 *
 * C'est LE point d'entree unique pour associer une voix a un texte
 * (CLAUDE.md §3 : ne jamais recoder un enregistreur ailleurs).
 *
 * Workflow : écrire le texte -> 🎙 Enregistrer -> autoriser le micro ->
 * parler -> ⏹ Stop -> ▶ Préécouter -> ✅ Utiliser cette voix.
 *
 * Points de vigilance tenus ici :
 *  - le micro n'est demande QUE sur clic explicite (§62) ;
 *  - un refus n'empeche jamais de travailler : on propose l'import (§63) ;
 *  - la prise precedente n'est supprimee qu'apres validation (§42) ;
 *  - le `textHash` est enregistre pour detecter un texte modifie (§50).
 */
export function VoiceTextEditor({ voice, onChange, title, readOnlyText = false }: VoiceTextEditorProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [permission, setPermission] = useState<MicPermission | null>(null);
  const [take, setTake] = useState<RecordingTake | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const previewAudio = useRef<HTMLAudioElement | null>(null);

  const status = voiceStatus(voice);

  useEffect(() => {
    if (phase !== 'recording') return undefined;
    const timer = window.setInterval(() => setElapsed(VoiceRecorderService.elapsedSeconds()), 200);
    return () => window.clearInterval(timer);
  }, [phase]);

  // On libere l'URL de preecoute quand la prise est abandonnee.
  useEffect(
    () => () => {
      if (take) VoiceRecorderService.releasePreview(take);
    },
    [take],
  );

  const startRecording = useCallback(async () => {
    setError(null);
    // §62 : c'est ce clic — et uniquement lui — qui demande le microphone.
    const granted = await VoiceRecorderService.requestMicrophonePermission();
    setPermission(granted);
    if (granted !== 'granted') {
      setPhase('denied');
      setError(
        granted === 'unsupported'
          ? 'Ce navigateur ne permet pas l’enregistrement. Importez un fichier audio.'
          : 'Accès au microphone refusé.',
      );
      return;
    }
    try {
      // Une voix ne doit jamais jouer pendant l'enregistrement.
      AudioService.stopAll();
      await VoiceRecorderService.startRecording();
      setElapsed(0);
      setPhase('recording');
    } catch (cause) {
      setPhase('denied');
      setError(cause instanceof MicrophoneError ? cause.message : 'Enregistrement impossible.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      const recorded = await VoiceRecorderService.stopRecording();
      setTake(recorded);
      setPhase('review');
    } catch {
      setPhase('idle');
      setError('L’enregistrement n’a pas pu être terminé.');
    }
  }, []);

  const cancelRecording = useCallback(() => {
    VoiceRecorderService.cancelRecording();
    setPhase('idle');
  }, []);

  const playPreview = useCallback(() => {
    if (!take) return;
    previewAudio.current?.pause();
    const audio = new Audio(take.previewUrl);
    previewAudio.current = audio;
    void audio.play().catch(() => setError('Lecture impossible sur ce navigateur.'));
  }, [take]);

  /** ✅ « Utiliser cette prise » — l'ancienne est conservee jusqu'ici (§42). */
  const acceptTake = useCallback(async () => {
    if (!take) return;
    setBusy(true);
    try {
      const stored = await VoiceRecorderService.upload(voice.id, take, {
        text: voice.text,
        category: voice.category,
      });
      const previous =
        voice.audioPath && voice.mimeType && voice.textHash
          ? {
              audioPath: voice.audioPath,
              mimeType: voice.mimeType,
              duration: voice.duration ?? 0,
              textHash: voice.textHash,
              recordedAt: voice.updatedAt,
            }
          : undefined;

      onChange({
        ...voice,
        audioPath: stored.audioPath,
        mimeType: stored.mimeType,
        duration: stored.duration,
        textHash: stored.textHash,
        voiceMode: 'RECORDED',
        updatedAt: Date.now(),
        ...(previous ? { previousTake: previous } : {}),
      });

      VoiceRecorderService.releasePreview(take);
      setTake(null);
      setPhase('idle');
    } catch {
      setError('L’enregistrement n’a pas pu être sauvegardé.');
    } finally {
      setBusy(false);
    }
  }, [onChange, take, voice]);

  /** « Garder l'ancienne » — la nouvelle prise est simplement jetee. */
  const discardTake = useCallback(() => {
    if (take) VoiceRecorderService.releasePreview(take);
    setTake(null);
    setPhase('idle');
  }, [take]);

  /** Restaure la prise precedente (§42). */
  const restorePrevious = useCallback(() => {
    if (!voice.previousTake) return;
    const previous = voice.previousTake;
    const { previousTake: _dropped, ...rest } = voice;
    onChange({
      ...rest,
      audioPath: previous.audioPath,
      mimeType: previous.mimeType,
      duration: previous.duration,
      textHash: previous.textHash,
      voiceMode: 'RECORDED',
      updatedAt: Date.now(),
    });
  }, [onChange, voice]);

  /** §43 — import d'un fichier prepare ailleurs (Logic, Audacity, telephone…). */
  const importFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const imported = await VoiceRecorderService.importFile(file);
        setTake(imported);
        setPhase('review');
      } catch {
        setError('Ce fichier audio n’a pas pu être lu.');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const deleteVoice = useCallback(async () => {
    await VoiceRecorderService.delete(voice.audioPath);
    const { audioPath: _a, mimeType: _m, duration: _d, textHash: _t, ...rest } = voice;
    onChange({ ...rest, updatedAt: Date.now() });
  }, [onChange, voice]);

  const playStored = useCallback(() => {
    void AudioService.unlock().then(() => AudioService.playVoice(voice));
  }, [voice]);

  return (
    <div className="vte">
      <div className="vte__head">
        <span className="vte__title">{title}</span>
        <span className={cn('vte__status', STATUS_CLASS[status])}>{VOICE_STATUS_LABEL[status]}</span>
      </div>

      <label className="field">
        <span className="field__label">Texte</span>
        <textarea
          className="field__textarea"
          value={voice.text}
          readOnly={readOnlyText}
          onChange={(event) => onChange({ ...voice, text: event.target.value, updatedAt: Date.now() })}
        />
      </label>

      {/* §50 — le texte a change depuis la prise : la voix ne colle plus. */}
      {status === 'VOICE_OUTDATED' ? (
        <p className="vte__warning">
          <IconWarning size={26} />
          Le texte a été modifié depuis l’enregistrement de la voix.
        </p>
      ) : null}

      {error ? (
        <p className="vte__warning">
          <IconWarning size={26} />
          {error}
        </p>
      ) : null}

      {/*
        DEUX ÉTATS, ET RIEN D'AUTRE (UI_DESIGN §196).

        Tout était visible en même temps : enregistrer, importer, supprimer,
        restaurer, lecture auto, afficher le texte, voix de synthèse. Sept
        possibilités pour un geste qui en demande une. Ce qui reste s'ouvre
        sous « Options avancées ».
      */}
      {voice.audioPath ? (
        <div className="vte__take">
          <span className="vte__done">
            <IconCheck size={22} />
            Voix enregistrée — {formatDuration(voice.duration ?? 0)}
          </span>
          <SecondaryButton icon={<IconPlay size={24} />} onClick={playStored}>
            Écouter
          </SecondaryButton>
          <SecondaryButton icon={<IconRefresh size={24} />} onClick={() => void startRecording()}>
            Réenregistrer
          </SecondaryButton>
        </div>
      ) : null}

      {/* Nouvelle prise en attente de validation (§42) */}
      {phase === 'review' && take ? (
        <div className="vte__take">
          <span className="admin__status">
            Nouvelle prise — {formatDuration(take.duration)}
          </span>
          <SecondaryButton icon={<IconPlay size={24} />} onClick={playPreview}>
            Préécouter
          </SecondaryButton>
          <PrimaryButton
            icon={<IconCheck size={24} />}
            disabled={busy}
            onClick={() => void acceptTake()}
          >
            {voice.audioPath ? 'Utiliser la nouvelle' : 'Utiliser cette prise'}
          </PrimaryButton>
          <SecondaryButton onClick={discardTake}>
            {voice.audioPath ? 'Garder l’ancienne' : 'Annuler'}
          </SecondaryButton>
        </div>
      ) : null}

      {/* Aucune voix encore : une seule action évidente. */}
      {!voice.audioPath && phase !== 'recording' && phase !== 'review' ? (
        <div className="vte__actions">
          <PrimaryButton icon={<IconMic size={26} />} onClick={() => void startRecording()}>
            Enregistrer la voix
          </PrimaryButton>
          <SecondaryButton
            icon={<IconUpload size={24} />}
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            ou importer un fichier
          </SecondaryButton>
          {phase === 'denied' && permission === 'denied' ? (
            <SecondaryButton onClick={() => void startRecording()}>Réessayer</SecondaryButton>
          ) : null}
        </div>
      ) : null}

      <input
        ref={fileInput}
        type="file"
        className="vte__hidden-input"
        accept={IMPORT_ACCEPT}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importFile(file);
          event.target.value = '';
        }}
      />

      <AdvancedPanel
        title="Options avancées"
        hint="lecture automatique, voix de synthèse, prise précédente"
      >
        <div className="ds-row">
          <PillButton
            active={voice.autoPlay}
            onClick={() => onChange({ ...voice, autoPlay: !voice.autoPlay })}
          >
            Lecture automatique
          </PillButton>
          <PillButton
            active={voice.showText}
            onClick={() => onChange({ ...voice, showText: !voice.showText })}
          >
            Afficher le texte à l’enfant
          </PillButton>
          <PillButton
            active={voice.voiceMode === 'TTS'}
            onClick={() =>
              onChange({ ...voice, voiceMode: voice.voiceMode === 'TTS' ? 'RECORDED' : 'TTS' })
            }
          >
            Voix de synthèse
          </PillButton>
        </div>

        <div className="ds-row">
          {voice.audioPath ? (
            <SecondaryButton
              icon={<IconUpload size={24} />}
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              Importer un fichier
            </SecondaryButton>
          ) : null}
          {/* §42 — la prise précédente est conservée tant qu'on n'a rien décidé. */}
          {voice.previousTake ? (
            <SecondaryButton onClick={restorePrevious}>
              Revenir à la prise précédente
            </SecondaryButton>
          ) : null}
          {voice.audioPath ? (
            <SecondaryButton icon={<IconTrash size={24} />} onClick={() => void deleteVoice()}>
              Supprimer la voix
            </SecondaryButton>
          ) : null}
        </div>
      </AdvancedPanel>

      {/* §41 — PROMPTEUR : le texte en très grand pendant l'enregistrement. */}
      {phase === 'recording' ? (
        <div className="prompter" role="dialog" aria-label="Enregistrement en cours">
          <p className="prompter__head">
            <IconRecord size={28} />
            Enregistrement
            <span className="prompter__timer">{formatTimer(elapsed)}</span>
          </p>
          <p className="prompter__text">{voice.text}</p>
          <div className="ds-row">
            <PrimaryButton large icon={<IconStop size={30} />} onClick={() => void stopRecording()}>
              Terminer
            </PrimaryButton>
            <SecondaryButton large onClick={cancelRecording}>
              Annuler
            </SecondaryButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
