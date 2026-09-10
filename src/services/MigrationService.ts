import type { SaveFile } from '../types';
import { DEFAULT_AUDIO_SETTINGS } from '../types/audio';
import { SAVE_SCHEMA_VERSION } from '../types/save';

type LooseSave = SaveFile & Record<string, unknown>;

interface Migration {
  from: number;
  to: number;
  label: string;
  apply: (save: LooseSave) => LooseSave;
}

/**
 * MIGRATION SERVICE (CONCEPTION §113).
 *
 * Regle absolue (CLAUDE.md §2) : une migration n'est JAMAIS destructive.
 * On ajoute des champs manquants, on ne supprime jamais une donnee existante.
 */
const MIGRATIONS: Migration[] = [
  {
    from: 1,
    to: 2,
    label: 'quests + journal idempotent + saveRevision',
    apply: (save) => ({
      ...save,
      state: {
        ...save.state,
        quests: save.state.quests ?? {},
        gymsCompleted: save.state.gymsCompleted ?? [],
        chaptersCompleted: save.state.chaptersCompleted ?? [],
        regionsUnlocked: save.state.regionsUnlocked ?? [],
        adventureCompleted: save.state.adventureCompleted ?? false,
        activeGymBattle: save.state.activeGymBattle ?? null,
        saveRevision: save.state.saveRevision ?? 1,
      },
      appliedEvents: save.appliedEvents ?? [],
      history: save.history ?? [],
    }),
  },
  {
    from: 2,
    to: 3,
    label: 'statistiques pedagogiques + reglages audio',
    apply: (save) => ({
      ...save,
      learning: save.learning ?? { skills: {}, activePackId: null },
      profile: {
        ...save.profile,
        audioSettings: save.profile?.audioSettings ?? { ...DEFAULT_AUDIO_SETTINGS },
        packId: save.profile?.packId ?? null,
      },
      pokedex: save.pokedex ?? {},
    }),
  },
  {
    from: 3,
    to: 4,
    label: 'retrait de la voix de synthese',
    /*
     * La synthese vocale du navigateur a ete retiree (§127) : `ttsFallback`
     * n'est plus lu. On ne l'efface PAS — une migration n'est jamais
     * destructive (CLAUDE.md §2) — on garantit seulement que les reglages que
     * l'application lit encore sont tous presents.
     */
    apply: (save) => ({
      ...save,
      profile: {
        ...save.profile,
        audioSettings: {
          ...DEFAULT_AUDIO_SETTINGS,
          ...(save.profile?.audioSettings ?? {}),
        },
      },
    }),
  },
];

export interface MigrationResult {
  save: SaveFile;
  applied: Array<{ from: number; to: number; at: number }>;
}

class MigrationServiceImpl {
  readonly targetVersion = SAVE_SCHEMA_VERSION;

  needsMigration(save: SaveFile): boolean {
    return (save.schemaVersion ?? 1) < SAVE_SCHEMA_VERSION;
  }

  /** Applique en sequence toutes les migrations n -> n+1. */
  migrate(save: SaveFile): MigrationResult {
    let current = save as LooseSave;
    let version = current.schemaVersion ?? 1;
    const applied: Array<{ from: number; to: number; at: number }> = [];

    while (version < SAVE_SCHEMA_VERSION) {
      const migration = MIGRATIONS.find((item) => item.from === version);
      if (!migration) break;
      current = migration.apply(current);
      applied.push({ from: migration.from, to: migration.to, at: Date.now() });
      version = migration.to;
    }

    const migrated: SaveFile = {
      ...(current as SaveFile),
      schemaVersion: version,
      meta: {
        ...current.meta,
        migrations: [...(current.meta?.migrations ?? []), ...applied],
      },
    };

    return { save: migrated, applied };
  }

  /**
   * Une sauvegarde plus recente que l'application ne doit jamais etre ecrasee :
   * on la renvoie telle quelle et l'appelant invite a mettre a jour l'app (§112).
   */
  isFromFutureVersion(save: SaveFile): boolean {
    return (save.schemaVersion ?? 1) > SAVE_SCHEMA_VERSION;
  }
}

export const MigrationService = new MigrationServiceImpl();
