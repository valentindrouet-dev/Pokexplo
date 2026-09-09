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
import type { ContentBundle, ValidationReport } from '../../types';
import { ContentService } from '../../services';

export interface AdminDraftValue {
  draft: ContentBundle | null;
  /** Modifie le brouillon (immuable) et declenche l'enregistrement differe. */
  update: (mutate: (draft: ContentBundle) => ContentBundle) => void;
  saving: boolean;
  savedAt: number | null;
  validation: ValidationReport | null;
  revalidate: () => void;
  reload: () => Promise<void>;
  resetFromPublished: () => Promise<void>;
  /** Remplace entierement le brouillon (import d'un contenu exporte). */
  replaceDraft: (bundle: ContentBundle) => Promise<void>;
  /**
   * Le brouillon a ete copie d'un contenu plus ancien que celui publie.
   * Le publier tel quel ferait revenir l'ancienne version : on previent.
   */
  outdated: { basedOn: string | null; published: string } | null;
}

const AdminDraftContext = createContext<AdminDraftValue | null>(null);

const AUTOSAVE_MS = 700;

/**
 * CONCEPTION §99 — le Master travaille toujours sur un BROUILLON.
 * Rien n'est visible par l'enfant tant que la release n'est pas publiee.
 */
export function AdminDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ContentBundle | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [outdated, setOutdated] = useState<AdminDraftValue['outdated']>(null);
  const timer = useRef<number | null>(null);

  const refreshStatus = useCallback(async () => {
    const status = await ContentService.draftStatus();
    setOutdated(status.outdated ? { basedOn: status.basedOn, published: status.published } : null);
  }, []);

  const reload = useCallback(async () => {
    const loaded = await ContentService.getDraft();
    setDraft(loaded);
    setValidation(ContentService.validate(loaded));
    await refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const update = useCallback((mutate: (current: ContentBundle) => ContentBundle) => {
    setDraft((current) => {
      if (!current) return current;
      const next = mutate(current);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setSaving(true);
        void ContentService.saveDraft(next)
          .then(() => setSavedAt(Date.now()))
          .finally(() => setSaving(false));
      }, AUTOSAVE_MS);
      setValidation(ContentService.validate(next));
      return next;
    });
  }, []);

  const replaceDraft = useCallback(async (bundle: ContentBundle) => {
    await ContentService.saveDraft(bundle);
    setDraft(bundle);
    setValidation(ContentService.validate(bundle));
    setSavedAt(Date.now());
  }, []);

  const resetFromPublished = useCallback(async () => {
    const restored = await ContentService.resetDraftFromPublished();
    setDraft(restored);
    setValidation(ContentService.validate(restored));
    await refreshStatus();
  }, [refreshStatus]);

  const value = useMemo<AdminDraftValue>(
    () => ({
      draft,
      update,
      saving,
      savedAt,
      validation,
      revalidate: () => setValidation(draft ? ContentService.validate(draft) : null),
      reload,
      resetFromPublished,
      replaceDraft,
      outdated,
    }),
    [draft, update, saving, savedAt, validation, reload, resetFromPublished, replaceDraft, outdated],
  );

  return <AdminDraftContext value={value}>{children}</AdminDraftContext>;
}

export function useAdminDraft(): AdminDraftValue {
  const context = use(AdminDraftContext);
  if (!context) throw new Error('useAdminDraft doit être utilisé dans <AdminDraftProvider>');
  return context;
}

/**
 * Meme brouillon, mais sans exiger le fournisseur : les ecrans de l'enfant
 * s'affichent normalement hors mode edition, ou aucun brouillon n'est charge.
 */
export function useAdminDraftOptional(): AdminDraftValue | null {
  return use(AdminDraftContext);
}
