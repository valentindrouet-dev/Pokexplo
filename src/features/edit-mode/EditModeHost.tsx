import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useEditMode } from '../../app/providers/EditModeProvider';
import { useNavigation } from '../../app/router';
import { AdminDraftProvider, useAdminDraft } from '../admin/AdminDraftContext';

/*
 * Le tiroir embarque les formulaires adultes (VoiceTextEditor, champs) : on
 * ne les fait entrer dans le bundle de l'enfant que si un administrateur
 * ouvre effectivement quelque chose.
 */
const EditDrawer = lazy(() => import('./EditDrawer'));

/**
 * Rend le BROUILLON disponible partout où l'on peut éditer.
 *
 * Deux surfaces le partagent : les menus de `/admin` et le mode édition posé
 * sur les écrans de l'enfant. Un seul fournisseur pour les deux — c'est ce qui
 * fait que l'un reflète immédiatement l'autre, sans synchronisation à écrire.
 *
 * Il n'est monté que pour un administrateur, et seulement quand il sert : un
 * enfant ne charge jamais le brouillon.
 */
export function EditModeHost({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  const { editing } = useEditMode();
  const { route } = useNavigation();
  const needed = isAdmin && (editing || route.name === 'admin');

  if (!needed) return <>{children}</>;

  return (
    <AdminDraftProvider>
      <DraftPreviewBridge>{children}</DraftPreviewBridge>
    </AdminDraftProvider>
  );
}

/**
 * CONCEPTION §118 — en mode édition, les écrans de l'enfant affichent le
 * brouillon et non la release publiée. C'est le mécanisme déjà utilisé par
 * « Prévisualiser » : on le réutilise plutôt que d'en inventer un second.
 */
function DraftPreviewBridge({ children }: { children: ReactNode }) {
  const { editing } = useEditMode();
  const { draft } = useAdminDraft();
  const { preview } = useContent();

  useEffect(() => {
    if (!editing) return undefined;
    if (draft) preview(draft);
    // En sortant, l'enfant retrouve exactement ce qui est publié.
    return () => preview(null);
  }, [editing, draft, preview]);

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <EditDrawer />
      </Suspense>
    </>
  );
}
