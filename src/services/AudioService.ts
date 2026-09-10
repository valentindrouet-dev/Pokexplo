import type { AudioChannel, AudioSettings, MediaPath, VoiceMessage, VoiceMessageId } from '../types';
import { DEFAULT_AUDIO_SETTINGS } from '../types/audio';
import { settleWithin } from '../utils/async';
import { AssetService } from './AssetService';

export interface AudioState {
  /** Voix en cours de lecture, `null` si le canal voix est libre. */
  playingVoiceId: VoiceMessageId | null;
  muted: boolean;
  unlocked: boolean;
}

type Listener = (state: AudioState) => void;

/** Attenuation de la musique pendant une voix (§68). */
const MUSIC_DUCK_FACTOR = 0.3;
/** Silence WAV minimal, utilise pour debloquer l'audio iPad au premier toucher. */
const SILENCE =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

/**
 * Delai maximal accorde au deblocage audio.
 *
 * Sur iPadOS, `play()` peut rester indefiniment en attente. L'interface ne
 * doit JAMAIS dependre de cette reponse : passe ce delai, on continue sans
 * son plutot que de bloquer l'enfant sur l'ecran d'accueil.
 */
const UNLOCK_TIMEOUT_MS = 600;

/**
 * AUDIO SERVICE (CONCEPTION §60, §64, §67, §68).
 *
 * Regles tenues par ce service :
 *  - deux voix ne parlent JAMAIS en meme temps ;
 *  - une nouvelle voix arrete la precedente ;
 *  - la musique est attenuee pendant une voix, jamais l'inverse ;
 *  - l'absence de fichier ne fait jamais planter le jeu : on se tait, le texte reste ;
 *  - le contexte audio n'est debloque qu'au premier toucher (Safari/iPad).
 */
class AudioServiceImpl {
  private settings: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS };

  private unlocked = false;

  private voiceElement: HTMLAudioElement | null = null;

  private musicElement: HTMLAudioElement | null = null;

  private sfxElement: HTMLAudioElement | null = null;

  private playingVoiceId: VoiceMessageId | null = null;

  private lastVoice: VoiceMessage | null = null;

  private readonly listeners = new Set<Listener>();

  private voiceToken = 0;

  /* -------------------------------------------------- etat -------------- */

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  getState(): AudioState {
    return {
      playingVoiceId: this.playingVoiceId,
      muted: this.settings.muted,
      unlocked: this.unlocked,
    };
  }

  private emit(): void {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  setSettings(settings: AudioSettings): void {
    this.settings = { ...settings };
    if (this.musicElement) this.musicElement.volume = this.volumeFor('music');
    if (this.voiceElement) this.voiceElement.volume = this.volumeFor('voice');
    if (this.settings.muted) this.stopAll();
    this.emit();
  }

  setVolume(channel: AudioChannel, value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.settings = {
      ...this.settings,
      ...(channel === 'voice' ? { voicesVolume: clamped } : {}),
      ...(channel === 'music' ? { musicVolume: clamped } : {}),
      ...(channel === 'sfx' ? { sfxVolume: clamped } : {}),
    };
    if (channel === 'music' && this.musicElement) this.musicElement.volume = this.volumeFor('music');
    if (channel === 'voice' && this.voiceElement) this.voiceElement.volume = this.volumeFor('voice');
    this.emit();
  }

  mute(): void {
    this.setSettings({ ...this.settings, muted: true });
  }

  unmute(): void {
    this.setSettings({ ...this.settings, muted: false });
  }

  private volumeFor(channel: AudioChannel): number {
    if (this.settings.muted) return 0;
    if (channel === 'voice') return this.settings.voicesVolume;
    if (channel === 'sfx') return this.settings.sfxVolume;
    return this.settings.musicVolume;
  }

  /* -------------------------------------------------- deblocage --------- */

  /**
   * CONCEPTION §64 — appele par le PREMIER toucher (« Commencer l'aventure »).
   * Safari/iPad refuse toute lecture automatique avant une interaction.
   *
   * Cette methode se resout TOUJOURS, et vite : l'appelant ne doit jamais
   * attendre le navigateur pour continuer l'aventure.
   */
  async unlock(): Promise<void> {
    if (this.unlocked) return;

    // On considere l'audio debloque immediatement : si le navigateur refuse,
    // le jeu reste jouable sans son (§127) et le texte reste affiche.
    this.unlocked = true;
    this.emit();

    try {
      this.voiceElement = this.createElement();
      this.musicElement = this.createElement(true);
      this.sfxElement = this.createElement();

      // iOS n'autorise que les elements demarres PENDANT le geste : on amorce
      // les trois canaux, sinon musique et bruitages resteraient muets.
      await Promise.all([
        this.prime(this.voiceElement),
        this.prime(this.musicElement),
        this.prime(this.sfxElement),
      ]);
    } catch {
      /* l'audio restera indisponible : le jeu doit rester jouable (§127) */
    }
  }

  /** Amorce un canal avec un silence, sans jamais bloquer plus que le delai. */
  private async prime(element: HTMLAudioElement): Promise<void> {
    try {
      element.muted = true;
      element.src = SILENCE;
      await settleWithin(element.play(), UNLOCK_TIMEOUT_MS, undefined);
    } catch {
      /* le canal restera silencieux */
    } finally {
      try {
        element.pause();
        element.currentTime = 0;
        element.muted = false;
      } catch {
        /* rien a faire */
      }
    }
  }

  private createElement(loop = false): HTMLAudioElement {
    const element = new Audio();
    element.preload = 'auto';
    element.loop = loop;
    // Pas de `crossOrigin` : nous ne lisons jamais les donnees audio, et
    // l'exiger ferait echouer la lecture des fichiers servis sans en-tete CORS.
    return element;
  }

  /* -------------------------------------------------- voix -------------- */

  /**
   * Joue une voix. Toute voix en cours est arretee avant (§127).
   *
   * ON NE LIT QUE CE QUI A ETE ENREGISTRE.
   *
   * Il y avait un repli sur la synthese vocale du navigateur : un fichier
   * absent, un fichier introuvable sur CET appareil, et une voix robotique
   * prenait la place de celle de l'adulte — sans le dire. On croyait entendre
   * sa prise ; on entendait la machine.
   *
   * Le silence est plus honnete : il se voit dans l'Admin (« voix manquante »),
   * il se corrige en une prise, et il ne fait jamais passer une voix pour une
   * autre. L'absence de voix ne casse rien (CLAUDE.md §3) : le texte reste
   * affiche et le jeu reste jouable sans le son.
   */
  async playVoice(voice: VoiceMessage | null | undefined): Promise<void> {
    if (!voice) return;
    this.lastVoice = voice;

    this.stopVoice();
    if (this.settings.muted || voice.voiceMode === 'NONE') return;
    /*
     * Rien d'enregistre : on sort AVANT de toucher a l'etat. Sinon la musique
     * s'attenuait et le bouton passait « en lecture » le temps d'un rendu,
     * pour une voix qui n'allait jamais se faire entendre.
     *
     * `voiceMode` valait autrefois 'TTS' pour les textes confies a la
     * synthese. On ne le produit plus nulle part, mais d'anciennes donnees en
     * portent : elles ne doivent pas empecher une vraie prise d'etre jouee.
     * Seul 'NONE' — « texte seul », decide par l'adulte — fait taire la voix.
     */
    if (!voice.audioPath) return;

    const token = ++this.voiceToken;
    this.playingVoiceId = voice.id;
    this.emit();
    this.duckMusic(true);

    const finish = (): void => {
      if (this.voiceToken !== token) return;
      this.playingVoiceId = null;
      this.duckMusic(false);
      this.emit();
    };

    const url = await AssetService.getUrl(voice.audioPath);
    if (this.voiceToken !== token) return;

    if (!url || !this.voiceElement) {
      finish();
      return;
    }

    try {
      const element = this.voiceElement;
      element.onended = finish;
      // Fichier illisible ou absent de cet appareil : on se tait, on ne
      // substitue rien.
      element.onerror = finish;
      element.src = url;
      element.volume = this.volumeFor('voice');
      await element.play();
    } catch {
      finish();
    }
  }

  /** CONCEPTION §65 — bouton 🔊 : rejouer autant de fois que necessaire. */
  async replay(): Promise<void> {
    if (this.lastVoice) await this.playVoice(this.lastVoice);
  }

  stopVoice(): void {
    this.voiceToken += 1;
    try {
      if (this.voiceElement) {
        this.voiceElement.onended = null;
        this.voiceElement.onerror = null;
        this.voiceElement.pause();
        this.voiceElement.currentTime = 0;
      }
    } catch {
      /* rien a faire : l'arret ne doit jamais lever */
    }
    if (this.playingVoiceId !== null) {
      this.playingVoiceId = null;
      this.duckMusic(false);
      this.emit();
    }
  }

  pause(): void {
    this.voiceElement?.pause();
    this.musicElement?.pause();
  }

  /* -------------------------------------------------- musique / sfx ----- */

  async playMusic(path: MediaPath | undefined): Promise<void> {
    if (!path || !this.musicElement || this.settings.muted) return;
    const url = await AssetService.getUrl(path);
    if (!url) return;
    try {
      if (this.musicElement.src === url && !this.musicElement.paused) return;
      this.musicElement.src = url;
      this.musicElement.volume = this.volumeFor('music');
      await this.musicElement.play();
    } catch {
      /* la musique est un confort, jamais une obligation */
    }
  }

  stopMusic(): void {
    try {
      this.musicElement?.pause();
    } catch {
      /* ignore */
    }
  }

  async playSfx(path: MediaPath | undefined): Promise<void> {
    if (!path || !this.sfxElement || this.settings.muted) return;
    const url = await AssetService.getUrl(path);
    if (!url) return;
    try {
      this.sfxElement.src = url;
      this.sfxElement.volume = this.volumeFor('sfx');
      await this.sfxElement.play();
    } catch {
      /* ignore */
    }
  }

  private duckMusic(active: boolean): void {
    if (!this.musicElement) return;
    const base = this.volumeFor('music');
    this.musicElement.volume = active ? base * MUSIC_DUCK_FACTOR : base;
  }

  stopAll(): void {
    this.stopVoice();
    this.stopMusic();
    try {
      this.sfxElement?.pause();
    } catch {
      /* ignore */
    }
  }

  /* -------------------------------------------------- prechargement ----- */

  /** CONCEPTION §69 — precharge les voix de la region courante. */
  async preload(paths: Array<MediaPath | undefined>): Promise<void> {
    await Promise.all(
      paths
        .filter((path): path is MediaPath => Boolean(path))
        .map((path) => AssetService.getUrl(path).catch(() => null)),
    );
  }

  /** Tests : remet le service dans son etat initial. */
  reset(): void {
    this.stopAll();
    this.settings = { ...DEFAULT_AUDIO_SETTINGS };
    this.unlocked = false;
    this.lastVoice = null;
    this.playingVoiceId = null;
    this.voiceElement = null;
    this.musicElement = null;
    this.sfxElement = null;
    this.listeners.clear();
  }
}

export const AudioService = new AudioServiceImpl();
