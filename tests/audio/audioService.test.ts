import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetService, AudioService, localBackend, setBackend } from '../../src/services';
import { resetDb } from '../../src/services/db';
import { createVoiceMessage } from '../../src/utils/voice';
import { DEFAULT_AUDIO_SETTINGS } from '../../src/types/audio';

async function storeVoice(id: string): Promise<string> {
  const path = `media/voice/ui/${id}.webm`;
  await AssetService.put(path, new Blob(['son'], { type: 'audio/webm' }), {
    mimeType: 'audio/webm',
    duration: 1.2,
  });
  return path;
}

beforeEach(() => {
  resetDb();
  setBackend(localBackend);
  AssetService.invalidate();
  AudioService.reset();
  AudioService.setSettings({ ...DEFAULT_AUDIO_SETTINGS });
});

describe('AudioService (CONCEPTION §60, §64, §127)', () => {
  it('n’est débloqué qu’après le premier toucher (§64)', async () => {
    expect(AudioService.isUnlocked()).toBe(false);
    await AudioService.unlock();
    expect(AudioService.isUnlocked()).toBe(true);
  });

  it('se débloque même si le navigateur ne répond jamais à play() (iPadOS)', async () => {
    // Sur iPadOS, `play()` peut rester indéfiniment en attente : le déblocage
    // ne doit surtout pas bloquer l'écran d'accueil.
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockReturnValue(new Promise<void>(() => undefined));

    const started = Date.now();
    await AudioService.unlock();

    expect(AudioService.isUnlocked()).toBe(true);
    expect(Date.now() - started).toBeLessThan(3000);
    expect(play).toHaveBeenCalled();
  });

  it('se débloque même si play() échoue', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(
      new DOMException('NotAllowedError'),
    );
    await expect(AudioService.unlock()).resolves.toBeUndefined();
    expect(AudioService.isUnlocked()).toBe(true);
  });

  it('amorce les trois canaux dans le geste, pas seulement la voix (§67)', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play');
    await AudioService.unlock();
    // voix + musique + bruitages : sinon musique et sons resteraient muets.
    expect(play).toHaveBeenCalledTimes(3);
  });

  it('joue une voix enregistrée et publie son état', async () => {
    await AudioService.unlock();
    const audioPath = await storeVoice('bravo');
    const voice = createVoiceMessage('voice.bravo', 'Bravo !', 'ui', {
      audioPath,
      mimeType: 'audio/webm',
      duration: 1.2,
    });

    const states: Array<string | null> = [];
    const unsubscribe = AudioService.subscribe((state) => states.push(state.playingVoiceId));

    await AudioService.playVoice(voice);
    expect(states).toContain('voice.bravo');
    unsubscribe();
  });

  it('ne laisse jamais deux voix parler en même temps (§127)', async () => {
    await AudioService.unlock();
    const first = createVoiceMessage('voice.a', 'Première phrase', 'ui', {
      audioPath: await storeVoice('a'),
    });
    const second = createVoiceMessage('voice.b', 'Deuxième phrase', 'ui', {
      audioPath: await storeVoice('b'),
    });

    await AudioService.playVoice(first);
    await AudioService.playVoice(second);

    // Une seule voix reste active : la plus recente.
    expect(AudioService.getState().playingVoiceId === 'voice.a').toBe(false);
  });

  it('retombe sur la synthèse vocale quand aucun fichier n’existe (§59)', async () => {
    await AudioService.unlock();
    const speak = vi.spyOn(speechSynthesis, 'speak');
    const voice = createVoiceMessage('voice.tts', 'Bienvenue dans la forêt !', 'adventure');

    await AudioService.playVoice(voice);
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it('ne dit rien si le TTS de secours est désactivé, mais ne plante pas', async () => {
    await AudioService.unlock();
    AudioService.setSettings({ ...DEFAULT_AUDIO_SETTINGS, ttsFallback: false });
    const speak = vi.spyOn(speechSynthesis, 'speak');

    await AudioService.playVoice(createVoiceMessage('voice.none', 'Sans voix', 'ui'));
    expect(speak).not.toHaveBeenCalled();
    expect(AudioService.getState().playingVoiceId).toBeNull();
  });

  it('reste silencieux quand le son est coupé, sans casser le jeu (§127)', async () => {
    await AudioService.unlock();
    AudioService.mute();
    const speak = vi.spyOn(speechSynthesis, 'speak');

    await AudioService.playVoice(createVoiceMessage('voice.muted', 'Coupé', 'ui'));
    expect(speak).not.toHaveBeenCalled();
    expect(AudioService.getState().muted).toBe(true);

    AudioService.unmute();
    expect(AudioService.getState().muted).toBe(false);
  });

  it('ne joue rien pour un mode NONE', async () => {
    await AudioService.unlock();
    const speak = vi.spyOn(speechSynthesis, 'speak');
    await AudioService.playVoice(
      createVoiceMessage('voice.silent', 'Texte seul', 'ui', { voiceMode: 'NONE' }),
    );
    expect(speak).not.toHaveBeenCalled();
  });

  it('permet de réécouter la dernière voix (§65)', async () => {
    await AudioService.unlock();
    const speak = vi.spyOn(speechSynthesis, 'speak');
    const voice = createVoiceMessage('voice.replay', 'Écoute encore', 'ui');

    await AudioService.playVoice(voice);
    await AudioService.replay();
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('gère des volumes séparés par canal (§67)', () => {
    AudioService.setVolume('voice', 0.4);
    AudioService.setVolume('music', 0.2);
    AudioService.setVolume('sfx', 0.9);
    const settings = AudioService.getSettings();
    expect(settings.voicesVolume).toBeCloseTo(0.4);
    expect(settings.musicVolume).toBeCloseTo(0.2);
    expect(settings.sfxVolume).toBeCloseTo(0.9);
  });

  it('borne les volumes entre 0 et 1', () => {
    AudioService.setVolume('voice', 5);
    expect(AudioService.getSettings().voicesVolume).toBe(1);
    AudioService.setVolume('voice', -2);
    expect(AudioService.getSettings().voicesVolume).toBe(0);
  });

  it('ne lève jamais quand un média est absent (§127)', async () => {
    await AudioService.unlock();
    const voice = createVoiceMessage('voice.broken', 'Fichier introuvable', 'ui', {
      audioPath: 'media/voice/ui/inexistant.m4a',
    });
    await expect(AudioService.playVoice(voice)).resolves.toBeUndefined();
    await expect(AudioService.playVoice(null)).resolves.toBeUndefined();
    await expect(AudioService.playMusic(undefined)).resolves.toBeUndefined();
    expect(() => AudioService.stopAll()).not.toThrow();
  });

  it('précharge sans échouer même si un fichier manque (§69)', async () => {
    const path = await storeVoice('preload');
    await expect(
      AudioService.preload([path, 'media/voice/ui/absent.m4a', undefined]),
    ).resolves.toBeUndefined();
  });
});
