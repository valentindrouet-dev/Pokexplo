import type { ContentBundle, PlayerProfile, ProfileId, SaveFile } from '../types';
import { DEFAULT_AUDIO_SETTINGS } from '../types/audio';
import { SAVE_SCHEMA_VERSION } from '../types/save';
import { uid } from '../utils/id';

export const MAX_TEAM_SIZE = 6;

export function createProfile(nickname: string, avatar = 'explorer'): PlayerProfile {
  return {
    id: uid('profile') as ProfileId,
    nickname,
    avatar,
    createdAt: Date.now(),
    audioSettings: { ...DEFAULT_AUDIO_SETTINGS },
    packId: null,
  };
}

/**
 * Nouvelle sauvegarde.
 * Le premier nœud est le Centre : le jeu a un vrai debut (§6).
 */
export function createSave(profile: PlayerProfile, content: ContentBundle, appVersion: string): SaveFile {
  const start =
    content.nodes.find((node) => node.kind === 'CENTER') ?? content.nodes[0] ?? null;
  const firstChapter = [...content.chapters].sort((a, b) => a.index - b.index)[0] ?? null;
  const pack = content.curriculumPacks.find((item) => item.active) ?? content.curriculumPacks[0];

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    profile: { ...profile, packId: profile.packId ?? pack?.id ?? null },
    state: {
      currentNode: start?.id ?? '',
      unlockedNodes: start ? [start.id] : [],
      completedNodes: [],
      regionsUnlocked: start ? [start.biomeId] : [],
      team: [],
      badges: [],
      quests: {},
      gymsCompleted: [],
      chapterId: firstChapter?.id ?? '',
      chaptersCompleted: [],
      adventureCompleted: false,
      activeEncounter: null,
      activeGymBattle: null,
      lastPlayedAt: Date.now(),
      saveRevision: 1,
    },
    pokedex: {},
    learning: { skills: {}, activePackId: pack?.id ?? null },
    history: [],
    appliedEvents: [],
    contentReleaseId: content.releaseId,
    meta: { migrations: [], appVersion },
  };
}
