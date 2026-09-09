import { describe, expect, it } from 'vitest';
import { defaultContentBundle } from '../../src/content/defaultContent';
import {
  applyGameEvent,
  createProfile,
  createSave,
  gymReadiness,
  MAX_TEAM_SIZE,
  nodeState,
  pathBetween,
} from '../../src/game-engine';
import type { GameEvent } from '../../src/game-engine';
import type { SaveFile } from '../../src/types';

const bundle = defaultContentBundle();

function freshSave(): SaveFile {
  return createSave(createProfile('Test'), bundle, '1.0.0');
}

/** `Omit` fusionnerait l'union : on distribue pour garder chaque variante. */
type EventInput<T = GameEvent> = T extends unknown ? Omit<T, 'eventId' | 'at'> : never;

let counter = 0;
function event(input: EventInput): GameEvent {
  counter += 1;
  return { ...input, eventId: `ev-${counter}`, at: 1_700_000_000_000 + counter } as GameEvent;
}

describe('Progression (CONCEPTION §104-106)', () => {
  it('démarre l’aventure au Centre', () => {
    const save = freshSave();
    expect(save.state.currentNode).toBe('centre');
    expect(save.state.saveRevision).toBe(1);
    expect(save.schemaVersion).toBe(3);
  });

  it('incrémente saveRevision à chaque événement appliqué', () => {
    const save = freshSave();
    const first = applyGameEvent(save, event({ kind: 'TRAVEL', nodeId: 'prairie-1' }), bundle);
    expect(first.save.state.saveRevision).toBe(2);
    const second = applyGameEvent(
      first.save,
      event({ kind: 'NODE_COMPLETED', nodeId: 'prairie-1' }),
      bundle,
    );
    expect(second.save.state.saveRevision).toBe(3);
  });

  it('est idempotent : une capture envoyée deux fois n’est appliquée qu’une fois', () => {
    const save = freshSave();
    const capture = event({ kind: 'CAPTURE', creatureId: 'piloupi' });

    const once = applyGameEvent(save, capture, bundle);
    expect(once.save.pokedex['piloupi']?.captureCount).toBe(1);
    expect(once.effects.duplicate).toBe(false);

    const twice = applyGameEvent(once.save, capture, bundle);
    expect(twice.effects.duplicate).toBe(true);
    expect(twice.save).toBe(once.save);
    expect(twice.save.pokedex['piloupi']?.captureCount).toBe(1);
    expect(twice.save.state.saveRevision).toBe(once.save.state.saveRevision);
  });

  it('écrit capture + pokédex + équipe + progression en une seule fois (§104)', () => {
    const save = freshSave();
    const result = applyGameEvent(save, event({ kind: 'CAPTURE', creatureId: 'goutlin' }), bundle);

    expect(result.save.pokedex['goutlin']?.state).toBe('CAPTURED');
    expect(result.save.state.team).toContain('goutlin');
    expect(result.save.history.some((entry) => entry.kind === 'CAPTURE')).toBe(true);
    expect(result.effects.captured).toBe('goutlin');
  });

  it('ne dépasse jamais six créatures dans l’équipe (§20)', () => {
    let save = freshSave();
    for (const creature of bundle.creatures.slice(0, 8)) {
      save = applyGameEvent(save, event({ kind: 'CAPTURE', creatureId: creature.id }), bundle).save;
    }
    expect(save.state.team.length).toBe(MAX_TEAM_SIZE);
  });

  it('marque une créature « rencontrée » avant de la capturer (§18)', () => {
    const save = freshSave();
    const seen = applyGameEvent(save, event({ kind: 'CREATURE_SEEN', creatureId: 'lianou' }), bundle);
    expect(seen.save.pokedex['lianou']?.state).toBe('SEEN');

    const captured = applyGameEvent(
      seen.save,
      event({ kind: 'CAPTURE', creatureId: 'lianou' }),
      bundle,
    );
    expect(captured.save.pokedex['lianou']?.state).toBe('CAPTURED');
    expect(captured.save.pokedex['lianou']?.firstSeenAt).toBe(seen.save.pokedex['lianou']?.firstSeenAt);
  });

  it('fait progresser puis terminer une quête (§25)', () => {
    let save = freshSave();
    save = applyGameEvent(save, event({ kind: 'QUEST_ACCEPT', questId: 'quest-plantes' }), bundle).save;
    expect(save.state.quests['quest-plantes']?.target).toBe(3);

    let result = applyGameEvent(save, event({ kind: 'CAPTURE', creatureId: 'feuillou' }), bundle);
    expect(result.save.state.quests['quest-plantes']?.progress).toBe(1);
    expect(result.effects.questsCompleted).toHaveLength(0);

    result = applyGameEvent(result.save, event({ kind: 'CAPTURE', creatureId: 'noizette' }), bundle);
    result = applyGameEvent(result.save, event({ kind: 'CAPTURE', creatureId: 'moustiflor' }), bundle);

    expect(result.save.state.quests['quest-plantes']?.status).toBe('COMPLETED');
    expect(result.effects.questsCompleted.map((quest) => quest.id)).toContain('quest-plantes');
  });

  it('accorde le badge et termine le chapitre à la victoire d’Arène (§6, §22)', () => {
    let save = freshSave();
    for (const creatureId of ['piloupi', 'feuillou', 'noizette', 'moustiflor']) {
      save = applyGameEvent(save, event({ kind: 'CAPTURE', creatureId }), bundle).save;
    }
    save = applyGameEvent(save, event({ kind: 'QUEST_ACCEPT', questId: 'quest-premiers-pas' }), bundle).save;
    save = applyGameEvent(save, event({ kind: 'QUEST_ACCEPT', questId: 'quest-plantes' }), bundle).save;
    save = applyGameEvent(save, event({ kind: 'CAPTURE', creatureId: 'herbibou' }), bundle).save;

    const result = applyGameEvent(
      save,
      event({ kind: 'GYM_WON', gymId: 'gym-pierre', badgeId: 'badge-roche' }),
      bundle,
    );

    expect(result.save.state.badges).toContain('badge-roche');
    expect(result.save.state.gymsCompleted).toContain('gym-pierre');
    expect(result.save.state.completedNodes).toContain('arene-pierre');
    expect(result.effects.badgeEarned).toBe('badge-roche');
    expect(result.save.state.adventureCompleted).toBe(true);
    expect(result.effects.chapterCompleted?.id).toBe('chapitre-1');
  });

  it('met à jour les statistiques pédagogiques sans les montrer à l’enfant', () => {
    const save = freshSave();
    const result = applyGameEvent(
      save,
      event({
        kind: 'EXERCISE_RESULT',
        result: {
          instanceId: 'x',
          templateId: 'count-easy',
          skillId: 'math.counting',
          difficulty: 1,
          attempts: 1,
          outcome: 'FIRST_TRY',
          durationMs: 3200,
          at: Date.now(),
        },
      }),
      bundle,
    );
    expect(result.save.learning.skills['math.counting']?.firstTrySuccesses).toBe(1);
    expect(result.save.history.some((entry) => entry.kind === 'EXERCISE')).toBe(true);
  });
});

describe('Carte et nœuds (CONCEPTION §10-11)', () => {
  it('donne les cinq états attendus', () => {
    const save = freshSave();
    const node = (id: string) => bundle.nodes.find((item) => item.id === id)!;

    expect(nodeState(node('centre'), save, bundle)).toBe('CURRENT');
    expect(nodeState(node('prairie-1'), save, bundle)).toBe('AVAILABLE');
    expect(nodeState(node('arene-pierre'), save, bundle)).toBe('LOCKED');

    const explored = applyGameEvent(
      save,
      event({ kind: 'NODE_COMPLETED', nodeId: 'prairie-1' }),
      bundle,
    ).save;
    expect(nodeState(node('prairie-1'), explored, bundle)).toBe('COMPLETED');
  });

  it('signale la rencontre visible comme un événement spécial (§17)', () => {
    let save = freshSave();
    for (const nodeId of ['prairie-1', 'prairie-2', 'foret-1', 'foret-2']) {
      save = applyGameEvent(save, event({ kind: 'NODE_COMPLETED', nodeId }), bundle).save;
    }
    const clairiere = bundle.nodes.find((item) => item.id === 'foret-3')!;
    expect(nodeState(clairiere, save, bundle)).toBe('SPECIAL_EVENT');

    const afterCapture = applyGameEvent(
      save,
      event({ kind: 'CAPTURE', creatureId: 'lianou' }),
      bundle,
    ).save;
    expect(nodeState(clairiere, afterCapture, bundle)).not.toBe('SPECIAL_EVENT');
  });

  it('calcule un chemin de proche en proche', () => {
    let save = freshSave();
    for (const nodeId of ['prairie-1', 'prairie-2']) {
      save = applyGameEvent(save, event({ kind: 'NODE_COMPLETED', nodeId }), bundle).save;
    }
    const path = pathBetween('centre', 'prairie-3', save, bundle);
    expect(path[0]).toBe('centre');
    expect(path[path.length - 1]).toBe('prairie-3');
    expect(path).toContain('prairie-2');
  });
});

describe('Condition d’accès à l’Arène (CONCEPTION §23)', () => {
  const gym = bundle.gyms[0]!;

  it('liste chaque type efficace avec sa coche', () => {
    const save = freshSave();
    const readiness = gymReadiness(gym, save, bundle);
    expect(readiness.rows.map((row) => row.label)).toEqual(['Eau', 'Plante', 'Glace']);
    expect(readiness.rows.every((row) => row.ok === false)).toBe(true);
    expect(readiness.have).toBe(0);
    expect(readiness.need).toBe(3);
    expect(readiness.ready).toBe(false);
  });

  it('devient « prêt » quand les trois types sont possédés', () => {
    let save = freshSave();
    // Goutlin = Eau, Feuillou = Plante, Brumo = Eau/Glace.
    for (const creatureId of ['goutlin', 'feuillou', 'brumo']) {
      save = applyGameEvent(save, event({ kind: 'CAPTURE', creatureId }), bundle).save;
    }
    const readiness = gymReadiness(gym, save, bundle);
    expect(readiness.have).toBe(3);
    expect(readiness.ready).toBe(true);
  });
});
