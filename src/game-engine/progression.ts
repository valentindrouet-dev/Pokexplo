import type {
  Chapter,
  ContentBundle,
  NodeId,
  PokedexEntry,
  Quest,
  SaveFile,
  HistoryEntry,
} from '../types';
import { createSkillStats, updateSkillStats } from '../exercise-engine';
import { tail, withUnique } from '../utils/array';
import type { GameEvent } from './events';
import { evaluateQuests, questTarget } from './quests';
import { computeUnlockedNodes } from './world';
import { chapterProgress, currentChapter, isChapterComplete, nextChapter } from './chapters';
import { MAX_TEAM_SIZE } from './save';

const MAX_HISTORY = 200;
const MAX_APPLIED_EVENTS = 400;

/** Effets derives d'un evenement : ils pilotent les animations et les dialogues. */
export interface GameEffects {
  questsCompleted: Quest[];
  chapterCompleted: Chapter | null;
  adventureCompleted: boolean;
  nodesUnlocked: NodeId[];
  badgeEarned: string | null;
  captured: string | null;
  /** Vrai quand l'evenement etait deja applique (§105). */
  duplicate: boolean;
}

export interface ApplyResult {
  save: SaveFile;
  effects: GameEffects;
}

const NO_EFFECTS: GameEffects = {
  questsCompleted: [],
  chapterCompleted: null,
  adventureCompleted: false,
  nodesUnlocked: [],
  badgeEarned: null,
  captured: null,
  duplicate: false,
};

function pushHistory(save: SaveFile, entry: HistoryEntry): HistoryEntry[] {
  return tail([...save.history, entry], MAX_HISTORY);
}

/**
 * CONCEPTION §104-106 — application d'un evenement de jeu.
 *
 * - IDEMPOTENT : un evenement deja applique ne change rien.
 * - TRANSACTIONNEL : capture + pokedex + quetes + progression sont produits
 *   dans un seul objet, donc ecrits en une seule fois.
 * - `saveRevision` est incremente a chaque modification importante.
 */
export function applyGameEvent(
  save: SaveFile,
  event: GameEvent,
  content: ContentBundle,
): ApplyResult {
  if (save.appliedEvents.includes(event.eventId)) {
    return { save, effects: { ...NO_EFFECTS, duplicate: true } };
  }

  let draft: SaveFile = { ...save, state: { ...save.state } };
  let badgeEarned: string | null = null;
  let captured: string | null = null;

  switch (event.kind) {
    case 'TRAVEL': {
      const node = content.nodes.find((item) => item.id === event.nodeId);
      draft.state.currentNode = event.nodeId;
      if (node) draft.state.regionsUnlocked = withUnique(draft.state.regionsUnlocked, node.biomeId);
      break;
    }

    case 'NODE_COMPLETED': {
      draft.state.completedNodes = withUnique(draft.state.completedNodes, event.nodeId);
      const node = content.nodes.find((item) => item.id === event.nodeId);
      draft.history = pushHistory(draft, {
        id: event.eventId,
        at: event.at,
        kind: 'NODE_COMPLETED',
        label: node?.label ?? event.nodeId,
      });
      break;
    }

    case 'ENCOUNTER_START':
      draft.state.activeEncounter = event.encounter;
      break;

    case 'ENCOUNTER_ATTEMPT':
      draft.state.activeEncounter = draft.state.activeEncounter
        ? { ...draft.state.activeEncounter, attempts: event.attempts }
        : null;
      break;

    case 'ENCOUNTER_END':
      draft.state.activeEncounter = null;
      break;

    case 'CREATURE_SEEN': {
      const existing = draft.pokedex[event.creatureId];
      if (!existing) {
        const entry: PokedexEntry = {
          creatureId: event.creatureId,
          state: 'SEEN',
          firstSeenAt: event.at,
          captureCount: 0,
        };
        draft.pokedex = { ...draft.pokedex, [event.creatureId]: entry };
      }
      break;
    }

    case 'CAPTURE': {
      const previous = draft.pokedex[event.creatureId];
      const entry: PokedexEntry = {
        creatureId: event.creatureId,
        state: 'CAPTURED',
        firstSeenAt: previous?.firstSeenAt ?? event.at,
        capturedAt: previous?.capturedAt ?? event.at,
        captureCount: (previous?.captureCount ?? 0) + 1,
      };
      draft.pokedex = { ...draft.pokedex, [event.creatureId]: entry };

      // Les six premieres captures rejoignent l'equipe automatiquement :
      // un enfant de CP ne doit pas avoir a gerer un menu pour jouer (§20).
      if (draft.state.team.length < MAX_TEAM_SIZE && !draft.state.team.includes(event.creatureId)) {
        draft.state.team = [...draft.state.team, event.creatureId];
      }

      const creature = content.creatures.find((item) => item.id === event.creatureId);
      captured = event.creatureId;
      draft.history = pushHistory(draft, {
        id: event.eventId,
        at: event.at,
        kind: 'CAPTURE',
        label: creature?.name ?? event.creatureId,
      });
      break;
    }

    case 'EXERCISE_RESULT': {
      const { result } = event;
      const stats = draft.learning.skills[result.skillId] ?? createSkillStats(result.skillId);
      draft.learning = {
        ...draft.learning,
        skills: {
          ...draft.learning.skills,
          [result.skillId]: updateSkillStats(stats, result.outcome, result.at),
        },
      };
      draft.history = pushHistory(draft, {
        id: event.eventId,
        at: event.at,
        kind: 'EXERCISE',
        label: result.templateId,
        skillId: result.skillId,
        outcome: result.outcome,
      });
      break;
    }

    case 'TEAM_SET':
      draft.state.team = event.team.slice(0, MAX_TEAM_SIZE);
      break;

    case 'QUEST_ACCEPT': {
      const quest = content.quests.find((item) => item.id === event.questId);
      if (quest && !draft.state.quests[quest.id]) {
        draft.state.quests = {
          ...draft.state.quests,
          [quest.id]: {
            questId: quest.id,
            status: 'ACTIVE',
            progress: 0,
            target: questTarget(quest.objective),
            startedAt: event.at,
          },
        };
      }
      break;
    }

    case 'GYM_START': {
      const gym = content.gyms.find((item) => item.id === event.gymId);
      draft.state.activeGymBattle = {
        gymId: event.gymId,
        opponentIndex: 0,
        heartsLeft: gym?.opponents[0]?.hearts ?? 3,
        seed: event.seed,
        attempts: 0,
      };
      break;
    }

    case 'GYM_ATTEMPT':
      draft.state.activeGymBattle = draft.state.activeGymBattle
        ? { ...draft.state.activeGymBattle, attempts: event.attempts }
        : null;
      break;

    case 'GYM_OPPONENT_HIT': {
      const battle = draft.state.activeGymBattle;
      if (battle) {
        const gym = content.gyms.find((item) => item.id === battle.gymId);
        const heartsLeft = battle.heartsLeft - 1;
        if (heartsLeft > 0) {
          draft.state.activeGymBattle = { ...battle, heartsLeft, attempts: 0 };
        } else {
          const nextIndex = battle.opponentIndex + 1;
          const opponent = gym?.opponents[nextIndex];
          draft.state.activeGymBattle = opponent
            ? { ...battle, opponentIndex: nextIndex, heartsLeft: opponent.hearts, attempts: 0 }
            : { ...battle, opponentIndex: nextIndex, heartsLeft: 0, attempts: 0 };
        }
      }
      break;
    }

    case 'GYM_WON': {
      const gym = content.gyms.find((item) => item.id === event.gymId);
      draft.state.gymsCompleted = withUnique(draft.state.gymsCompleted, event.gymId);
      draft.state.badges = withUnique(draft.state.badges, event.badgeId);
      draft.state.activeGymBattle = null;
      if (gym) draft.state.completedNodes = withUnique(draft.state.completedNodes, gym.nodeId);
      badgeEarned = event.badgeId;
      draft.history = pushHistory(draft, {
        id: event.eventId,
        at: event.at,
        kind: 'GYM_WON',
        label: gym?.gymName ?? event.gymId,
      });
      break;
    }

    case 'GYM_LEAVE':
      draft.state.activeGymBattle = null;
      break;

    case 'CHAPTER_ADVANCE':
      draft.state.chapterId = event.chapterId;
      break;

    case 'AUDIO_SETTINGS':
      draft.profile = { ...draft.profile, audioSettings: event.settings };
      break;

    case 'PROFILE_UPDATE':
      draft.profile = {
        ...draft.profile,
        ...(event.nickname !== undefined ? { nickname: event.nickname } : {}),
        ...(event.avatar !== undefined ? { avatar: event.avatar } : {}),
        ...(event.packId !== undefined ? { packId: event.packId } : {}),
      };
      if (event.packId !== undefined) {
        draft.learning = { ...draft.learning, activePackId: event.packId };
      }
      break;

    default:
      break;
  }

  // --- Derivations communes : quetes, deblocages, chapitre ------------------
  const { quests, completed } = evaluateQuests(draft, content, event.at);
  draft.state.quests = { ...draft.state.quests, ...quests };

  for (const quest of completed) {
    draft.history = pushHistory(draft, {
      id: `${event.eventId}:quest:${quest.id}`,
      at: event.at,
      kind: 'QUEST_COMPLETED',
      label: quest.title,
    });
    for (const nodeId of quest.unlocksNodes ?? []) {
      draft.state.unlockedNodes = withUnique(draft.state.unlockedNodes, nodeId);
    }
  }

  const previousUnlocked = new Set(save.state.unlockedNodes);
  const unlocked = computeUnlockedNodes(draft, content);
  draft.state.unlockedNodes = unlocked;
  const nodesUnlocked = unlocked.filter((nodeId) => !previousUnlocked.has(nodeId));

  let chapterCompleted: Chapter | null = null;
  let adventureCompleted = draft.state.adventureCompleted;
  const chapter = currentChapter(draft, content);
  if (chapter && !draft.state.chaptersCompleted.includes(chapter.id) && isChapterComplete(chapter, draft)) {
    chapterCompleted = chapter;
    draft.state.chaptersCompleted = withUnique(draft.state.chaptersCompleted, chapter.id);
    draft.history = pushHistory(draft, {
      id: `${event.eventId}:chapter:${chapter.id}`,
      at: event.at,
      kind: 'CHAPTER_COMPLETED',
      label: chapter.title,
    });
    if (chapter.isFinal) {
      adventureCompleted = true;
    } else {
      const following = nextChapter(draft, content);
      if (following) draft.state.chapterId = following.id;
    }
    draft.state.adventureCompleted = adventureCompleted;
  }

  draft = {
    ...draft,
    appliedEvents: tail([...draft.appliedEvents, event.eventId], MAX_APPLIED_EVENTS),
    state: {
      ...draft.state,
      lastPlayedAt: event.at,
      saveRevision: save.state.saveRevision + 1,
    },
  };

  return {
    save: draft,
    effects: {
      questsCompleted: completed,
      chapterCompleted,
      adventureCompleted: chapterCompleted?.isFinal ?? false,
      nodesUnlocked,
      badgeEarned,
      captured,
      duplicate: false,
    },
  };
}

/** Applique une suite d'evenements (rejeu d'une file hors ligne). */
export function applyGameEvents(
  save: SaveFile,
  events: GameEvent[],
  content: ContentBundle,
): SaveFile {
  return events.reduce((current, event) => applyGameEvent(current, event, content).save, save);
}

export { chapterProgress };
