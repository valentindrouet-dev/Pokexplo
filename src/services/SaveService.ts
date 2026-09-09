import type { ContentBundle, PlayerProfile, ProfileId, SaveFile } from '../types';
import { applyGameEvent, createProfile, createSave, type ApplyResult, type GameEvent } from '../game-engine';
import { getBackend } from './backends';
import { MigrationService } from './MigrationService';
import { SyncService } from './SyncService';

const ACTIVE_PROFILE_KEY = 'pokexplo.activeProfile';
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

/**
 * SAVE SERVICE (CONCEPTION §101-106).
 *
 * Toute ecriture passe par ici. Une sauvegarde n'est JAMAIS supprimee
 * (CLAUDE.md §2) : `archive()` la met de cote sans la detruire.
 */
class SaveServiceImpl {
  async listProfiles(): Promise<SaveFile[]> {
    const backend = await getBackend();
    const saves = await backend.saves.list();
    return saves.filter((save) => !save.profile.id.startsWith('archive:'));
  }

  getActiveProfileId(): ProfileId | null {
    try {
      return (localStorage.getItem(ACTIVE_PROFILE_KEY) as ProfileId | null) ?? null;
    } catch {
      return null;
    }
  }

  setActiveProfileId(profileId: ProfileId | null): void {
    try {
      if (profileId) localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
      else localStorage.removeItem(ACTIVE_PROFILE_KEY);
    } catch {
      /* stockage indisponible : le profil restera choisi pour la session */
    }
  }

  /** Charge une sauvegarde et la migre si necessaire (§113). */
  async load(profileId: ProfileId): Promise<SaveFile | null> {
    const backend = await getBackend();
    const stored = await backend.saves.get(profileId);
    if (!stored) return null;

    if (MigrationService.isFromFutureVersion(stored)) {
      console.warn('[pokexplo] Sauvegarde plus recente que l’application : lecture seule.');
      return stored;
    }
    if (!MigrationService.needsMigration(stored)) return stored;

    const { save, applied } = MigrationService.migrate(stored);
    if (applied.length > 0) await this.persist(save);
    return save;
  }

  async create(
    nickname: string,
    avatar: string,
    content: ContentBundle,
  ): Promise<SaveFile> {
    const profile: PlayerProfile = createProfile(nickname, avatar);
    const save = createSave(profile, content, APP_VERSION);
    await this.persist(save);
    this.setActiveProfileId(save.profile.id);
    return save;
  }

  /** Ecriture locale immediate, puis synchronisation opportuniste (§107). */
  async persist(save: SaveFile): Promise<void> {
    const backend = await getBackend();
    await backend.saves.put(save);
    if (backend.kind !== 'local') void SyncService.push(save);
  }

  /**
   * CONCEPTION §104-105 — applique un evenement puis ecrit le resultat
   * en UNE seule operation (capture + pokedex + progression ensemble).
   */
  async applyEvent(save: SaveFile, event: GameEvent, content: ContentBundle): Promise<ApplyResult> {
    const result = applyGameEvent(save, event, content);
    if (!result.effects.duplicate) await this.persist(result.save);
    return result;
  }

  async archive(profileId: ProfileId): Promise<void> {
    const backend = await getBackend();
    await backend.saves.archive(profileId);
    if (this.getActiveProfileId() === profileId) this.setActiveProfileId(null);
  }

  /** Export JSON, pour une sauvegarde de securite manuelle depuis l'Admin. */
  export(save: SaveFile): string {
    return JSON.stringify(save, null, 2);
  }
}

export const SaveService = new SaveServiceImpl();
