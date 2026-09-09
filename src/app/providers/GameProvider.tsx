import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ProfileId, SaveFile } from '../../types';
import type { ApplyResult, GameEffects, GameEvent } from '../../game-engine';
import { SaveService, SyncService } from '../../services';
import { uid } from '../../utils/id';
import { useContent } from './ContentProvider';

/**
 * `Omit` sur une union fusionne les variantes : on distribue explicitement
 * pour conserver l'union discriminee (CONCEPTION §34).
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Un evenement sans son identifiant : le provider le genere (§105). */
export type GameEventInput = DistributiveOmit<GameEvent, 'eventId' | 'at'> & {
  eventId?: string;
  at?: number;
};

export interface GameContextValue {
  save: SaveFile | null;
  profiles: SaveFile[];
  ready: boolean;
  /** Derniers effets produits : capture, quete terminee, badge, fin de chapitre. */
  effects: GameEffects | null;
  clearEffects: () => void;
  dispatch: (event: GameEventInput) => Promise<ApplyResult | null>;
  createProfile: (nickname: string, avatar: string) => Promise<SaveFile | null>;
  selectProfile: (profileId: ProfileId) => Promise<void>;
  refreshProfiles: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { bundle } = useContent();
  const [save, setSave] = useState<SaveFile | null>(null);
  const [profiles, setProfiles] = useState<SaveFile[]>([]);
  const [ready, setReady] = useState(false);
  const [effects, setEffects] = useState<GameEffects | null>(null);
  // Evite qu'un double-tap enfantin ne declenche deux fois le meme evenement.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  /**
   * Reference toujours a jour de la sauvegarde.
   *
   * Indispensable : un ecran enchaine plusieurs evenements dans la meme
   * fonction (capture -> nœud termine -> fin de rencontre). Sans cette
   * reference, chaque `dispatch` repartirait de la sauvegarde figee dans sa
   * closure et effacerait les effets du precedent.
   */
  const saveRef = useRef<SaveFile | null>(null);

  const refreshProfiles = useCallback(async () => {
    const list = await SaveService.listProfiles();
    setProfiles(list);
  }, []);

  useEffect(() => {
    if (!bundle) return;
    let active = true;

    void (async () => {
      SyncService.start();
      const list = await SaveService.listProfiles();
      if (!active) return;
      setProfiles(list);

      const activeId = SaveService.getActiveProfileId();
      const chosen =
        (activeId ? list.find((item) => item.profile.id === activeId) : undefined) ?? list[0] ?? null;

      if (chosen) {
        const loaded = await SaveService.load(chosen.profile.id);
        if (!active) return;
        saveRef.current = loaded;
        setSave(loaded);
        if (loaded) SaveService.setActiveProfileId(loaded.profile.id);
      }
      setReady(true);
    })();

    return () => {
      active = false;
    };
  }, [bundle]);

  const dispatch = useCallback(
    async (input: GameEventInput): Promise<ApplyResult | null> => {
      if (!bundle) return null;

      const run = async (): Promise<ApplyResult | null> => {
        const current = saveRef.current;
        if (!current) return null;
        const event = {
          ...input,
          eventId: input.eventId ?? uid('ev'),
          at: input.at ?? Date.now(),
        } as GameEvent;

        const result = await SaveService.applyEvent(current, event, bundle);
        if (!result.effects.duplicate) {
          // La reference est mise a jour AVANT le rendu : l'evenement suivant
          // de la meme sequence part bien de l'etat le plus recent.
          saveRef.current = result.save;
          setSave(result.save);
          setEffects(result.effects);
        }
        return result;
      };

      const chained = queue.current.then(run, run);
      queue.current = chained.catch(() => undefined);
      return chained;
    },
    [bundle],
  );

  const createProfile = useCallback(
    async (nickname: string, avatar: string) => {
      if (!bundle) return null;
      const created = await SaveService.create(nickname, avatar, bundle);
      saveRef.current = created;
      setSave(created);
      await refreshProfiles();
      return created;
    },
    [bundle, refreshProfiles],
  );

  const selectProfile = useCallback(async (profileId: ProfileId) => {
    const loaded = await SaveService.load(profileId);
    if (loaded) {
      SaveService.setActiveProfileId(profileId);
      saveRef.current = loaded;
      setSave(loaded);
    }
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      save,
      profiles,
      ready,
      effects,
      clearEffects: () => setEffects(null),
      dispatch,
      createProfile,
      selectProfile,
      refreshProfiles,
    }),
    [save, profiles, ready, effects, dispatch, createProfile, selectProfile, refreshProfiles],
  );

  return <GameContext value={value}>{children}</GameContext>;
}

export function useGame(): GameContextValue {
  const context = use(GameContext);
  if (!context) throw new Error('useGame doit être utilisé dans <GameProvider>');
  return context;
}
