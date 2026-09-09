import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthProvider';

/**
 * MODE ÉDITION — éditer l'aventure DANS l'aventure.
 *
 * Les menus de `/admin` restent la référence pour tout ce qui est structurel
 * (créer, supprimer, relier). Mais pour changer un nom, une consigne, une
 * phrase du Professeur ou une voix, il est bien plus simple de le faire là où
 * on la voit : sur l'écran de l'enfant.
 *
 * Les deux vues travaillent sur le MÊME brouillon (`AdminDraftProvider`) :
 * ce qui est modifié ici apparaît immédiatement dans les menus, et
 * réciproquement. Rien n'est visible par l'enfant tant que la release n'est
 * pas publiée (§99).
 *
 * Le mode n'est jamais mémorisé d'une session à l'autre : un enfant ne doit
 * pas retrouver l'interface d'édition en ouvrant l'application.
 */
export type EditTarget =
  | { kind: 'node'; id: string }
  | { kind: 'biome'; id: string }
  | { kind: 'creature'; id: string }
  | { kind: 'template'; id: string }
  | { kind: 'quest'; id: string }
  | { kind: 'chapter'; id: string };

export interface EditModeValue {
  /** Vrai si la personne connectée a le droit d'éditer (§93). */
  available: boolean;
  editing: boolean;
  setEditing: (on: boolean) => void;
  /** Ce qui est ouvert dans le tiroir d'édition, s'il y a lieu. */
  target: EditTarget | null;
  open: (target: EditTarget) => void;
  close: () => void;
}

const EditModeContext = createContext<EditModeValue | null>(null);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  const [editing, setEditingState] = useState(false);
  const [target, setTarget] = useState<EditTarget | null>(null);

  // Sortie de l'admin : le mode édition s'arrête aussitôt.
  useEffect(() => {
    if (!isAdmin) {
      setEditingState(false);
      setTarget(null);
    }
  }, [isAdmin]);

  const setEditing = useCallback(
    (on: boolean) => {
      setEditingState(on && isAdmin);
      if (!on) setTarget(null);
    },
    [isAdmin],
  );

  const value = useMemo<EditModeValue>(
    () => ({
      available: isAdmin,
      editing: editing && isAdmin,
      setEditing,
      target: editing && isAdmin ? target : null,
      open: setTarget,
      close: () => setTarget(null),
    }),
    [isAdmin, editing, setEditing, target],
  );

  return <EditModeContext value={value}>{children}</EditModeContext>;
}

/**
 * Mode édition désactivé : ce que voit un enfant, et ce que voit un écran
 * monté hors de l'application complète (un test, le kit UI).
 *
 * On renvoie ce repli plutôt que de lever : l'outillage adulte ne doit jamais
 * pouvoir empêcher un écran de l'enfant de s'afficher.
 */
const DISABLED: EditModeValue = {
  available: false,
  editing: false,
  setEditing: () => undefined,
  target: null,
  open: () => undefined,
  close: () => undefined,
};

export function useEditMode(): EditModeValue {
  return use(EditModeContext) ?? DISABLED;
}
