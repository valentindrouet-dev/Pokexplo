/**
 * MOTEUR DE JEU — la boucle de CONCEPTION §5 :
 * Centre -> Carte -> Destination -> Deplacement -> Evenement -> Rencontre ->
 * Exercice -> Reussite/Aide -> Capture -> Collection -> Exploration ->
 * Quete -> Arene -> Badge -> Nouvelle region.
 */
export {
  isConditionMet,
  isReachable,
  nodeState,
  computeUnlockedNodes,
  canTravelTo,
  pathBetween,
  ownedTypeCount,
} from './world';
export { rollEncounter, prepareEncounter, templatesForNode } from './encounters';
export type { EncounterDraft } from './encounters';
export { questTarget, questProgress, evaluateQuests, offerableQuests } from './quests';
export { gymReadiness, currentOpponent, isGymCleared } from './gyms';
export type { GymReadiness, GymReadinessRow } from './gyms';
export { isChapterComplete, currentChapter, nextChapter, chapterProgress } from './chapters';
export { applyGameEvent, applyGameEvents } from './progression';
export type { ApplyResult, GameEffects } from './progression';
export { createSave, createProfile, MAX_TEAM_SIZE } from './save';
export type { GameEvent, GameEventBase } from './events';
