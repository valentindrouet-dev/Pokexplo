import type {
  ActiveEncounter,
  AudioSettings,
  BadgeId,
  ChapterId,
  CreatureId,
  CurriculumPackId,
  EventId,
  ExerciseResult,
  GymId,
  NodeId,
  QuestId,
} from '../types';

/**
 * CONCEPTION §105 — chaque evenement important possede un identifiant.
 * Une capture envoyee deux fois n'est appliquee qu'une seule fois.
 */
export interface GameEventBase {
  eventId: EventId;
  at: number;
}

export type GameEvent = GameEventBase &
  (
    | { kind: 'TRAVEL'; nodeId: NodeId }
    | { kind: 'NODE_COMPLETED'; nodeId: NodeId }
    | { kind: 'ENCOUNTER_START'; encounter: ActiveEncounter }
    | { kind: 'ENCOUNTER_ATTEMPT'; attempts: number }
    | { kind: 'ENCOUNTER_END' }
    | { kind: 'CREATURE_SEEN'; creatureId: CreatureId }
    | { kind: 'CAPTURE'; creatureId: CreatureId }
    | { kind: 'EXERCISE_RESULT'; result: ExerciseResult }
    | { kind: 'TEAM_SET'; team: CreatureId[] }
    | { kind: 'QUEST_ACCEPT'; questId: QuestId }
    | { kind: 'GYM_START'; gymId: GymId; seed: number }
    | { kind: 'GYM_ATTEMPT'; attempts: number }
    | { kind: 'GYM_OPPONENT_HIT'; gymId: GymId }
    | { kind: 'GYM_WON'; gymId: GymId; badgeId: BadgeId }
    | { kind: 'GYM_LEAVE' }
    | { kind: 'CHAPTER_ADVANCE'; chapterId: ChapterId }
    | { kind: 'AUDIO_SETTINGS'; settings: AudioSettings }
    | { kind: 'PROFILE_UPDATE'; nickname?: string; avatar?: string; packId?: CurriculumPackId | null }
  );
