import { useMemo, useState, type ReactNode } from 'react';
import {
  IconCopy,
  IconSearch,
  IconTrash,
  ModalPanel,
  PrimaryButton,
  SecondaryButton,
  SoftPanel,
  TwoPaneLayout,
} from '../../ui';
import { cn } from '../../utils/cn';

export interface EntityPaneProps<T> {
  title: string;
  items: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  idOf: (item: T) => string;
  labelOf: (item: T) => string;
  /** Deuxieme ligne facultative dans la liste (type, statut…). */
  hintOf?: (item: T) => string;
  onCreate?: () => void;
  createLabel?: string;
  /** Réglage qui accompagne la création (le type d'une nouvelle matrice). */
  createExtra?: ReactNode;
  /**
   * Duplique l'élément sélectionné. C'est l'opération la plus utile de
   * l'édition d'un jeu : « Prairie 02 » se fait en copiant « Prairie 01 »,
   * jamais en recommençant à zéro.
   */
  onDuplicate?: (id: string) => void;
  /**
   * Retire l'élément sélectionné. Renvoie une raison quand c'est impossible —
   * on explique le refus au lieu de désactiver un bouton sans un mot.
   */
  onDelete?: (id: string) => void;
  deleteBlocker?: (id: string) => string | null;
  children: ReactNode;
}

/**
 * LISTE + ÉDITEUR : structure commune à toutes les sections de l'Admin.
 *
 * Il manquait les trois opérations les plus banales d'un éditeur de contenu
 * (UI_DESIGN §196) : **chercher**, **dupliquer**, **supprimer**. Sans elles,
 * une liste de vingt créatures se parcourt à l'œil, et créer une variante
 * demande de tout ressaisir.
 */
export function EntityPane<T>({
  title,
  items,
  selectedId,
  onSelect,
  idOf,
  labelOf,
  hintOf,
  onCreate,
  createLabel = 'Ajouter',
  createExtra,
  onDuplicate,
  onDelete,
  deleteBlocker,
  children,
}: EntityPaneProps<T>) {
  const [query, setQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  /** Recherche tolérante : la casse et les accents ne doivent rien changer. */
  const normalize = (value: string): string =>
    value
      .toLocaleLowerCase('fr')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');

  const shown = useMemo(() => {
    const needle = normalize(query.trim());
    if (needle === '') return items;
    // On cherche dans le libellé ET dans l'indice : « ENCOUNTER », « prairie »
    // ou « Grand pré » trouvent tous le même nœud.
    return items.filter((item) => normalize(`${labelOf(item)} ${hintOf?.(item) ?? ''}`).includes(needle));
  }, [items, query, labelOf, hintOf]);

  const selected = items.find((item) => idOf(item) === selectedId) ?? null;
  const blocker = selected && deleteBlocker ? deleteBlocker(idOf(selected)) : null;

  return (
    <TwoPaneLayout
      leftLabel={title}
      rightLabel="Édition"
      left={
        <SoftPanel title={`${title} (${items.length})`} padding="tight" className="ds-stack">
          {createExtra}
          {onCreate ? <PrimaryButton onClick={onCreate}>{createLabel}</PrimaryButton> : null}

          {/* La recherche n'apparaît que lorsqu'elle sert vraiment. */}
          {items.length > 6 ? (
            <label className="entity-search">
              <IconSearch size={22} />
              <input
                className="entity-search__input"
                type="search"
                value={query}
                placeholder="Rechercher…"
                aria-label={`Rechercher dans ${title}`}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          ) : null}

          <div className="admin__scroll-list">
            {shown.length === 0 ? (
              <p className="admin__status">Rien ne correspond à « {query} ».</p>
            ) : null}
            {shown.map((item) => {
              const id = idOf(item);
              return (
                <button
                  key={id}
                  type="button"
                  className={cn('ds-tap', 'ds-list-row')}
                  data-selected={id === selectedId}
                  aria-pressed={id === selectedId}
                  onClick={() => onSelect(id)}
                >
                  <span className="ds-stack">
                    <span>{labelOf(item)}</span>
                    {hintOf ? <span className="admin__status">{hintOf(item)}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Agir sur la sélection : dupliquer, retirer. */}
          {selected && (onDuplicate || onDelete) ? (
            <div className="ds-row">
              {onDuplicate ? (
                <SecondaryButton
                  icon={<IconCopy size={22} />}
                  onClick={() => onDuplicate(idOf(selected))}
                >
                  Dupliquer
                </SecondaryButton>
              ) : null}
              {onDelete ? (
                <SecondaryButton
                  icon={<IconTrash size={22} />}
                  disabled={blocker !== null}
                  onClick={() => setConfirmDelete(true)}
                >
                  Supprimer
                </SecondaryButton>
              ) : null}
            </div>
          ) : null}
          {blocker ? <p className="admin__status">{blocker}</p> : null}
        </SoftPanel>
      }
      right={
        <SoftPanel padding="roomy" className="admin__editor ds-scroll">
          {children}
          <ModalPanel
            open={confirmDelete && selected !== null}
            title={selected ? `Supprimer « ${labelOf(selected)} » ?` : ''}
            onDismiss={() => setConfirmDelete(false)}
            actions={
              <>
                <SecondaryButton onClick={() => setConfirmDelete(false)}>Annuler</SecondaryButton>
                <PrimaryButton
                  onClick={() => {
                    if (selected) onDelete?.(idOf(selected));
                    setConfirmDelete(false);
                  }}
                >
                  Supprimer
                </PrimaryButton>
              </>
            }
          >
            <p>
              L’élément quitte le brouillon. Rien n’est publié tant que vous ne l’avez pas demandé,
              et les sauvegardes de votre enfant ne sont jamais touchées.
            </p>
          </ModalPanel>
        </SoftPanel>
      }
    />
  );
}
