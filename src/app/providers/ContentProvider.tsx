import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  AppMeta,
  Biome,
  ContentBundle,
  Creature,
  Gym,
  MapNode,
  VoiceMessage,
} from '../../types';
import { ContentService, ContentUpdateService } from '../../services';
import { failAfter } from '../../utils/async';

/**
 * Au-dela de ce delai, on considere le chargement perdu et on propose de
 * reessayer : l'enfant ne doit jamais rester devant « Un instant… » (§175).
 */
const LOAD_TIMEOUT_MS = 12_000;

export interface ContentContextValue {
  bundle: ContentBundle | null;
  meta: AppMeta | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Remplace le contenu affiche (previsualisation d'un brouillon, §118). */
  preview: (bundle: ContentBundle | null) => void;
  previewing: boolean;
  creature: (id: string | undefined) => Creature | null;
  node: (id: string | undefined) => MapNode | null;
  biome: (id: string | undefined) => Biome | null;
  gym: (id: string | undefined) => Gym | null;
  voice: (id: string | undefined) => VoiceMessage | null;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<ContentBundle | null>(null);
  const [previewBundle, setPreviewBundle] = useState<ContentBundle | null>(null);
  const [meta, setMeta] = useState<AppMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await failAfter(ContentService.load(true), LOAD_TIMEOUT_MS, 'Le contenu');
      setBundle(loaded.bundle);
      setMeta(loaded.meta);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Contenu indisponible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /*
   * §111 — l'iPad suit tout seul le contenu publie depuis l'ordinateur.
   * La verification est silencieuse et la bascule attend un moment sur :
   * jamais pendant un exercice, un combat ou une capture.
   */
  useEffect(() => ContentUpdateService.start(reload), [reload]);

  const active = previewBundle ?? bundle;

  const value = useMemo<ContentContextValue>(() => {
    const creatures = new Map(active?.creatures.map((item) => [item.id, item]) ?? []);
    const nodes = new Map(active?.nodes.map((item) => [item.id, item]) ?? []);
    const biomes = new Map(active?.biomes.map((item) => [item.id, item]) ?? []);
    const gyms = new Map(active?.gyms.map((item) => [item.id, item]) ?? []);
    const voices = new Map(active?.voiceMessages.map((item) => [item.id, item]) ?? []);

    return {
      bundle: active,
      meta,
      loading,
      error,
      reload,
      preview: setPreviewBundle,
      previewing: previewBundle !== null,
      creature: (id) => (id ? (creatures.get(id) ?? null) : null),
      node: (id) => (id ? (nodes.get(id) ?? null) : null),
      biome: (id) => (id ? (biomes.get(id) ?? null) : null),
      gym: (id) => (id ? (gyms.get(id) ?? null) : null),
      voice: (id) => (id ? (voices.get(id) ?? null) : null),
    };
  }, [active, meta, loading, error, reload, previewBundle]);

  return <ContentContext value={value}>{children}</ContentContext>;
}

export function useContent(): ContentContextValue {
  const context = use(ContentContext);
  if (!context) throw new Error('useContent doit être utilisé dans <ContentProvider>');
  return context;
}
