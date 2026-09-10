import { describe, expect, it } from 'vitest';
import { MigrationService } from '../../src/services';
import { SAVE_SCHEMA_VERSION } from '../../src/types/save';
import type { SaveFile } from '../../src/types';

/** Sauvegarde telle qu'elle existait au schema 1. */
function legacySave(): SaveFile {
  return {
    schemaVersion: 1,
    profile: {
      id: 'profile_legacy',
      nickname: 'Lucie',
      avatar: 'explorer',
      createdAt: 1,
      // Ni reglages audio ni pack a l'epoque : la migration doit les ajouter.
    },
    state: {
      currentNode: 'prairie-1',
      unlockedNodes: ['centre', 'prairie-1'],
      completedNodes: ['centre'],
      team: ['piloupi'],
      badges: [],
      activeEncounter: null,
      lastPlayedAt: 10,
    },
    pokedex: {
      piloupi: { creatureId: 'piloupi', state: 'CAPTURED', captureCount: 1, capturedAt: 5 },
    },
    history: [],
    contentReleaseId: 'release_0001',
    meta: { migrations: [], appVersion: '0.1.0' },
  } as unknown as SaveFile;
}

describe('MigrationService (CONCEPTION §113)', () => {
  it('détecte une sauvegarde à migrer', () => {
    expect(MigrationService.needsMigration(legacySave())).toBe(true);
  });

  it('migre jusqu’à la version courante', () => {
    const { save, applied } = MigrationService.migrate(legacySave());
    expect(save.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(applied.map((step) => `${step.from}->${step.to}`)).toEqual(['1->2', '2->3', '3->4']);
    expect(save.meta.migrations).toHaveLength(3);
  });

  it('n’est jamais destructive : la progression existante est conservée', () => {
    const before = legacySave();
    const { save } = MigrationService.migrate(before);

    expect(save.profile.nickname).toBe('Lucie');
    expect(save.state.currentNode).toBe('prairie-1');
    expect(save.state.completedNodes).toEqual(['centre']);
    expect(save.state.team).toEqual(['piloupi']);
    expect(save.pokedex['piloupi']?.captureCount).toBe(1);
    expect(save.contentReleaseId).toBe('release_0001');
  });

  it('ajoute les champs manquants avec des valeurs sûres', () => {
    const { save } = MigrationService.migrate(legacySave());
    expect(save.state.quests).toEqual({});
    expect(save.state.gymsCompleted).toEqual([]);
    expect(save.state.chaptersCompleted).toEqual([]);
    expect(save.state.adventureCompleted).toBe(false);
    expect(save.state.activeGymBattle).toBeNull();
    expect(save.state.saveRevision).toBeGreaterThanOrEqual(1);
    expect(save.appliedEvents).toEqual([]);
    expect(save.learning).toEqual({ skills: {}, activePackId: null });
    expect(save.profile.audioSettings.voicesVolume).toBe(1);
  });

  it('garde les réglages audio d’avant le retrait de la voix de synthèse (3→4)', () => {
    // Une migration n'est jamais destructive (CLAUDE.md §2) : `ttsFallback`
    // n'est plus lu, mais on ne l'efface pas, et les volumes sont conservés.
    const before = {
      ...legacySave(),
      schemaVersion: 3,
      profile: {
        ...legacySave().profile,
        audioSettings: { voicesVolume: 0.6, ttsFallback: true },
      },
    } as unknown as SaveFile;

    const { save } = MigrationService.migrate(before);

    expect(save.profile.audioSettings.voicesVolume).toBeCloseTo(0.6);
    expect(save.profile.audioSettings.musicVolume).toBe(0.45);
    expect((save.profile.audioSettings as unknown as Record<string, unknown>).ttsFallback).toBe(
      true,
    );
  });

  it('est idempotente : migrer deux fois ne change plus rien', () => {
    const once = MigrationService.migrate(legacySave()).save;
    const twice = MigrationService.migrate(once);
    expect(twice.applied).toHaveLength(0);
    expect(twice.save.meta.migrations).toHaveLength(3);
  });

  it('refuse d’écraser une sauvegarde plus récente que l’application (§112)', () => {
    const future = { ...legacySave(), schemaVersion: SAVE_SCHEMA_VERSION + 5 } as SaveFile;
    expect(MigrationService.isFromFutureVersion(future)).toBe(true);
    expect(MigrationService.needsMigration(future)).toBe(false);
  });
});
