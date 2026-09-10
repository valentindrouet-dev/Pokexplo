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
import { ContentService, ReleaseService } from '../../services';
import { useContent } from '../../app/providers/ContentProvider';

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
  /**
   * Des modifications attendent d'etre publiees : l'enfant ne les voit PAS
   * encore. C'est la question que se pose l'adulte apres chaque retouche.
   */
  unpublished: boolean;
  /**
   * Publie le brouillon pour l'enfant. `force` accepte les voix manquantes :
   * ces textes resteront muets (§53). `label` nomme la release.
   */
  publish: (options?: {
    force?: boolean;
    label?: string;
  }) => Promise<{ ok: boolean; message: string; releaseId?: string }>;
  publishing: boolean;
}

const AdminDraftContext = createContext<AdminDraftValue | null>(null);

const AUTOSAVE_MS = 700;

/**
 * CONCEPTION §99 — le Master travaille toujours sur un BROUILLON.
 * Rien n'est visible par l'enfant tant que la release n'est pas publiee.
 */
export function AdminDraftProvider({ children }: { children: ReactNode }) {
  /*
   * Publier change ce que joue l'enfant : le contenu affiche doit etre relu.
   * Sans cela, la publication reussissait, le brouillon se marquait « a jour »,
   * et l'ecran de l'enfant continuait pourtant d'afficher l'ancienne version.
   */
  const { reload: reloadContent } = useContent();
  const [draft, setDraft] = useState<ContentBundle | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [outdated, setOutdated] = useState<AdminDraftValue['outdated']>(null);
  const [unpublished, setUnpublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const timer = useRef<number | null>(null);
  /** Brouillon en attente d'ecriture, tant que le delai n'est pas ecoule. */
  const pending = useRef<ContentBundle | null>(null);

  const refreshStatus = useCallback(async () => {
    const status = await ContentService.draftStatus();
    setOutdated(status.outdated ? { basedOn: status.basedOn, published: status.published } : null);
    setUnpublished(status.unpublished);
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

  /**
   * Ecrit sans attendre le delai. Renvoie une promesse : l'appelant peut
   * s'assurer que le brouillon est sur le disque avant de continuer.
   */
  const flush = useCallback(async (): Promise<void> => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    const bundle = pending.current;
    pending.current = null;
    if (!bundle) return;
    setSaving(true);
    try {
      await ContentService.saveDraft(bundle);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }, []);

  /*
   * On n'abandonne JAMAIS une ecriture en attente.
   *
   * Le fournisseur est demonte des qu'on quitte le mode edition. En annulant
   * simplement le minuteur, une retouche faite moins d'une seconde avant de
   * sortir etait perdue en silence — et l'adulte croyait l'avoir enregistree.
   * Meme chose quand l'iPad passe en arriere-plan.
   */
  useEffect(() => {
    const onHidden = (): void => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      void flush();
    };
  }, [flush]);

  const update = useCallback((mutate: (current: ContentBundle) => ContentBundle) => {
    // L'enfant ne verra rien tant qu'on n'a pas publie : on le dit des la
    // premiere retouche, sans attendre l'enregistrement differe.
    setUnpublished(true);
    setDraft((current) => {
      if (!current) return current;
      const next = mutate(current);
      pending.current = next;
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), AUTOSAVE_MS);
      setValidation(ContentService.validate(next));
      return next;
    });
  }, [flush]);

  const replaceDraft = useCallback(async (bundle: ContentBundle) => {
    pending.current = null;
    await ContentService.saveDraft(bundle);
    setDraft(bundle);
    setValidation(ContentService.validate(bundle));
    setSavedAt(Date.now());
    setUnpublished(true);
  }, []);

  const resetFromPublished = useCallback(async () => {
    pending.current = null;
    if (timer.current !== null) window.clearTimeout(timer.current);
    const restored = await ContentService.resetDraftFromPublished();
    setDraft(restored);
    setValidation(ContentService.validate(restored));
    await refreshStatus();
  }, [refreshStatus]);

  /**
   * Publier, depuis n'importe ou : le bandeau d'edition comme les menus.
   *
   * On renvoie un message plutot que de lever : l'appelant l'affiche tel quel,
   * et le cas « voix manquantes » (§53) se distingue par `ok: false` suivi d'un
   * second appel avec `force`.
   */
  const publish = useCallback(
    async (options: { force?: boolean; label?: string } = {}) => {
      if (!draft) return { ok: false, message: 'Aucun brouillon à publier.' };
      setPublishing(true);
      try {
        // La derniere retouche peut encore attendre son ecriture differee.
        await flush();
        const label = options.label || `Publication du ${new Date().toLocaleString('fr-FR')}`;
        const { release } = await ReleaseService.publish(draft, label, {
          force: options.force,
        });
        await reloadContent();
        await refreshStatus();
        return {
          ok: true,
          message: 'Publié : votre enfant voit la nouvelle version.',
          releaseId: release.id,
        };
      } catch (cause) {
        return {
          ok: false,
          message: cause instanceof Error ? cause.message : 'Publication impossible.',
        };
      } finally {
        setPublishing(false);
      }
    },
    [draft, refreshStatus, reloadContent, flush],
  );

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
      unpublished,
      publish,
      publishing,
    }),
    [
      draft,
      update,
      saving,
      savedAt,
      validation,
      reload,
      resetFromPublished,
      replaceDraft,
      outdated,
      unpublished,
      publish,
      publishing,
    ],
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
