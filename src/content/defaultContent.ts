import type { ContentBundle } from '../types';
import { deepClone } from '../utils/clone';
import { defaultCreatures } from './creatures';
import { defaultBiomes } from './biomes';
import { defaultNodes, defaultSpecialEncounters } from './nodes';
import { defaultExerciseTemplates } from './exercises';
import { defaultSkills, defaultCurriculumPacks } from './skills';
import { defaultBadges, defaultGyms } from './gyms';
import { defaultChapters, defaultQuests } from './quests';
import { creatureNameVoiceId, creatureNameVoices, exerciseVoices, narrativeVoices } from './voices';

/**
 * Version du contenu livre avec l'application.
 *
 * A INCREMENTER des que le contenu par defaut change (carte, creatures,
 * textes...). `ContentService` compare cette valeur a celle du contenu deja
 * installe : sans cela, un appareil qui a deja joue garderait indefiniment
 * l'ancienne version, meme apres une mise a jour de l'application.
 */
export const BUNDLED_CONTENT_VERSION = 'bundled-5';

/**
 * CONTENU LIVRE AVEC L'APPLICATION (release_0001).
 *
 * Il est publie automatiquement au premier lancement (ContentService) pour que
 * l'enfant puisse jouer immediatement. L'administrateur le modifie ensuite
 * depuis /admin, sans nouveau build (§91).
 *
 * On renvoie une COPIE profonde : le bundle par defaut ne doit jamais etre
 * mute par l'Admin.
 */
export function defaultContentBundle(): ContentBundle {
  const creatures = defaultCreatures.map((creature) => ({
    ...creature,
    nameVoiceId: creatureNameVoiceId(creature.id),
  }));

  const bundle: ContentBundle = {
    releaseId: 'release_0001',
    contentVersion: BUNDLED_CONTENT_VERSION,
    createdAt: Date.UTC(2026, 0, 1),
    creatures,
    biomes: defaultBiomes,
    nodes: defaultNodes,
    specialEncounters: defaultSpecialEncounters,
    exerciseTemplates: defaultExerciseTemplates,
    skills: defaultSkills,
    curriculumPacks: defaultCurriculumPacks,
    gyms: defaultGyms,
    badges: defaultBadges,
    quests: defaultQuests,
    chapters: defaultChapters,
    voiceMessages: [
      ...narrativeVoices,
      ...exerciseVoices(defaultExerciseTemplates),
      ...creatureNameVoices(creatures),
    ],
  };

  return deepClone(bundle);
}
