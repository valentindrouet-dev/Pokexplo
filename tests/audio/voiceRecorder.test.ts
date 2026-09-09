import { beforeEach, describe, expect, it } from 'vitest';
import { AssetService, localBackend, setBackend, VoiceRecorderService } from '../../src/services';
import { resetDb } from '../../src/services/db';
import { textHash } from '../../src/utils/hash';
import { voiceStatus } from '../../src/utils/voice';
import { createVoiceMessage } from '../../src/utils/voice';
import { FakeMediaRecorder, installMediaRecorder, installMicrophone, removeMicrophone } from './mediaMocks';

/**
 * CONCEPTION §119 — tests audio indispensables.
 * Enregistrement, stop, préécoute, nouvelle prise, annulation, upload,
 * lecture, lecture hors ligne, texte modifié, voix obsolète, voix absente,
 * permission micro refusée.
 */
beforeEach(() => {
  resetDb();
  setBackend(localBackend);
  AssetService.invalidate();
  installMediaRecorder();
  installMicrophone(true);
});

describe('VoiceRecorderService (CONCEPTION §45-46, §61-63)', () => {
  it('1. enregistre depuis le microphone après autorisation explicite', async () => {
    expect(VoiceRecorderService.isRecording()).toBe(false);
    await VoiceRecorderService.startRecording();
    expect(VoiceRecorderService.isRecording()).toBe(true);
  });

  it('2. arrête l’enregistrement et renvoie une prise exploitable', async () => {
    await VoiceRecorderService.startRecording();
    const take = await VoiceRecorderService.stopRecording();
    expect(take.blob.size).toBeGreaterThan(0);
    expect(take.mimeType).toContain('audio/');
    expect(VoiceRecorderService.isRecording()).toBe(false);
  });

  it('3. fournit une URL de préécoute puis sait la libérer', async () => {
    await VoiceRecorderService.startRecording();
    const take = await VoiceRecorderService.stopRecording();
    expect(take.previewUrl).toMatch(/^blob:/u);
    expect(() => VoiceRecorderService.releasePreview(take)).not.toThrow();
  });

  it('4. permet d’enchaîner une nouvelle prise', async () => {
    await VoiceRecorderService.startRecording();
    const first = await VoiceRecorderService.stopRecording();
    await VoiceRecorderService.startRecording();
    const second = await VoiceRecorderService.stopRecording();
    expect(second).not.toBe(first);
    expect(second.blob.size).toBeGreaterThan(0);
  });

  it('5. annule une prise sans rien écrire', async () => {
    await VoiceRecorderService.startRecording();
    VoiceRecorderService.cancelRecording();
    expect(VoiceRecorderService.isRecording()).toBe(false);
    await expect(VoiceRecorderService.stopRecording()).rejects.toThrow();
  });

  it('6. téléverse la prise, nomme le fichier et calcule l’empreinte du texte', async () => {
    await VoiceRecorderService.startRecording();
    const take = await VoiceRecorderService.stopRecording();
    const stored = await VoiceRecorderService.upload('voice.professor.welcome', take, {
      text: 'Bonjour !',
      category: 'professor',
    });

    // §48 / §71 : nom genere automatiquement, range par categorie.
    expect(stored.audioPath).toMatch(/^media\/voice\/professor\/voice_[a-z0-9_]+\.\w+$/u);
    expect(stored.textHash).toBe(textHash('Bonjour !'));
    expect(await AssetService.getBlob(stored.audioPath)).not.toBeNull();
  });

  it('7. relit le fichier stocké (lecture)', async () => {
    await VoiceRecorderService.startRecording();
    const take = await VoiceRecorderService.stopRecording();
    const stored = await VoiceRecorderService.upload('voice.test', take, {
      text: 'Bravo !',
      category: 'ui',
    });
    const url = await AssetService.getUrl(stored.audioPath);
    expect(url).toMatch(/^blob:/u);
  });

  it('8. reste disponible hors ligne : le média vient du stockage local', async () => {
    await VoiceRecorderService.startRecording();
    const take = await VoiceRecorderService.stopRecording();
    const stored = await VoiceRecorderService.upload('voice.offline', take, {
      text: 'Hors ligne',
      category: 'ui',
    });

    // Aucun réseau n'est sollicité : le blob est déjà sur l'appareil.
    const blob = await AssetService.getBlob(stored.audioPath);
    expect(blob?.size).toBeGreaterThan(0);
  });

  it('12. ne plante pas si l’accès au microphone est refusé (§63)', async () => {
    installMicrophone(false);
    const permission = await VoiceRecorderService.requestMicrophonePermission();
    expect(permission).toBe('denied');
    await expect(VoiceRecorderService.startRecording()).rejects.toThrow(/microphone/iu);
  });

  it('signale un navigateur sans enregistrement et propose l’import', async () => {
    removeMicrophone();
    expect(VoiceRecorderService.isSupported()).toBe(false);
    expect(await VoiceRecorderService.requestMicrophonePermission()).toBe('unsupported');
    installMicrophone(true);
  });

  it('choisit le meilleur format disponible sans demander à l’administrateur (§46)', () => {
    FakeMediaRecorder.supported = new Set(['audio/mp4', 'audio/webm']);
    expect(VoiceRecorderService.getSupportedMimeType()).toEqual({
      mimeType: 'audio/mp4',
      extension: 'm4a',
    });

    FakeMediaRecorder.supported = new Set(['audio/webm;codecs=opus']);
    expect(VoiceRecorderService.getSupportedMimeType().extension).toBe('webm');

    FakeMediaRecorder.supported = new Set();
    expect(VoiceRecorderService.getSupportedMimeType().mimeType).toBe('');
    FakeMediaRecorder.supported = new Set(['audio/webm;codecs=opus', 'audio/webm']);
  });

  it('importe un fichier préparé dans un autre logiciel (§43)', async () => {
    const file = new File(['son-importe'], 'prise.m4a', { type: 'audio/mp4' });
    const take = await VoiceRecorderService.importFile(file);
    expect(take.extension).toBe('m4a');
    expect(take.mimeType).toBe('audio/mp4');
    expect(take.blob.size).toBeGreaterThan(0);
  });

  it('supprime un fichier devenu inutile sans lever', async () => {
    await expect(VoiceRecorderService.delete(undefined)).resolves.toBeUndefined();
    await expect(VoiceRecorderService.delete('media/voice/absent.m4a')).resolves.toBeUndefined();
  });
});

describe('Statut des voix (CONCEPTION §50-51)', () => {
  it('9. et 10. détecte un texte modifié après enregistrement → voix obsolète', () => {
    const voice = createVoiceMessage('voice.x', 'Bravo !', 'ui', {
      audioPath: 'media/voice/ui/voice_x.m4a',
      mimeType: 'audio/mp4',
      duration: 1.2,
      textHash: textHash('Bravo !'),
    });
    expect(voiceStatus(voice)).toBe('VOICE_OK');

    const edited = { ...voice, text: 'Bravo, tu as réussi !' };
    expect(voiceStatus(edited)).toBe('VOICE_OUTDATED');
  });

  it('11. détecte une voix absente sans casser quoi que ce soit', () => {
    const voice = createVoiceMessage('voice.y', 'Une phrase sans voix', 'ui');
    expect(voiceStatus(voice)).toBe('VOICE_MISSING');
    expect(voiceStatus(createVoiceMessage('voice.z', '', 'ui'))).toBe('NO_TEXT');
    expect(voiceStatus(createVoiceMessage('voice.w', 'Texte seul', 'ui', { voiceMode: 'NONE' }))).toBe(
      'TEXT_ONLY',
    );
    expect(voiceStatus(null)).toBe('NO_TEXT');
  });
});
