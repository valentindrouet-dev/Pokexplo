import { useState, type ReactNode } from 'react';
import type {
  Biome,
  Chapter,
  ContentBundle,
  Creature,
  ExerciseTemplate,
  ExerciseType,
  MapNode,
  Quest,
  VoiceMessage,
} from '../../types';
import type { AdminSection } from '../../app/routes';
import { CreatureSprite } from '../../components/CreatureSprite';
import {
  IconClose,
  IconButton,
  IconPlus,
  IconTrash,
  ModalPanel,
  PillButton,
  PrimaryButton,
  SecondaryButton,
} from '../../ui';
import { useEditMode, type EditTarget } from '../../app/providers/EditModeProvider';
import { useNavigation } from '../../app/router';
import { useAdminDraftOptional } from '../admin/AdminDraftContext';
import { SelectField, TextAreaField, TextField } from '../admin/fields';
import { applyTemplateVoice, templateTextBlocks } from '../admin/exerciseText';
import { removalBlocker, removeNode } from '../admin/nodeFactory';
import { PlaceIconPicker } from '../admin/PlaceIconPicker';
import { addTemplate, createTemplate, type ExerciseLevel } from '../admin/templateFactory';
import { NewExerciseWizard } from '../admin/NewExerciseWizard';
import { VoiceTextEditor } from '../admin/VoiceTextEditor';
import '../admin/forms.css';
import './edit-mode.css';

/**
 * TIROIR D'ÉDITION.
 *
 * Il ouvre, sur place, ce qu'on a sous les yeux : le nom d'un lieu, la
 * consigne d'un exercice, la réplique du Professeur, le nom d'une créature.
 *
 * Il ne remplace PAS les menus de `/admin` : tout ce qui est structurel
 * (créer, supprimer, relier des nœuds, composer une Arène) y reste, et chaque
 * tiroir propose d'y aller en un geste. Les deux écrivent dans le même
 * brouillon, donc l'un reflète toujours l'autre.
 *
 * Les textes passent tous par `VoiceTextEditor` : c'est le seul point d'entrée
 * pour associer une voix à un texte (CLAUDE.md §3), et c'est lui qui marque une
 * voix obsolète quand le texte change.
 */
export default function EditDrawer() {
  const { target, close, open } = useEditMode();
  const drafting = useAdminDraftOptional();
  const { navigate } = useNavigation();

  if (!target || !drafting?.draft) return null;
  const { draft, update } = drafting;
  const found = describe(target, draft);

  return (
    <div
      className="edit-drawer"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="edit-drawer__panel surface-dense" role="dialog" aria-label={found.title}>
        <div className="edit-drawer__head">
          <span className="edit-drawer__title">{found.title}</span>
          <IconButton label="Fermer" icon={<IconClose size={24} />} onClick={close} />
        </div>

        <div className="edit-drawer__body ds-stack">
          {found.body ?? <p>Cet élément n’existe plus dans le brouillon.</p>}
        </div>

        <div className="edit-drawer__foot">
          <SecondaryButton
            onClick={() => {
              close();
              navigate({ name: 'admin', section: found.section });
            }}
          >
            Ouvrir dans les menus
          </SecondaryButton>
          <SecondaryButton onClick={close}>Terminé</SecondaryButton>
        </div>
      </div>
    </div>
  );

  /** Choisit le formulaire à afficher selon ce qui a été touché à l'écran. */
  function describe(
    item: EditTarget,
    bundle: ContentBundle,
  ): { title: string; section: AdminSection; body: ReactNode } {
    switch (item.kind) {
      case 'node': {
        const node = bundle.nodes.find((entry) => entry.id === item.id);
        return {
          title: node ? `Lieu — ${node.label}` : 'Lieu',
          section: 'world',
          body: node ? (
            <NodeForm node={node} bundle={bundle} update={update} open={open} close={close} />
          ) : null,
        };
      }
      case 'biome': {
        const biome = bundle.biomes.find((entry) => entry.id === item.id);
        return {
          title: biome ? `Région — ${biome.name}` : 'Région',
          section: 'world',
          body: biome ? <BiomeForm biome={biome} update={update} /> : null,
        };
      }
      case 'creature': {
        const creature = bundle.creatures.find((entry) => entry.id === item.id);
        return {
          title: creature ? `Créature — ${creature.name}` : 'Créature',
          section: 'creatures',
          body: creature ? <CreatureForm creature={creature} bundle={bundle} update={update} /> : null,
        };
      }
      case 'template': {
        const template = bundle.exerciseTemplates.find((entry) => entry.id === item.id);
        return {
          title: template ? `Exercice — ${template.label}` : 'Exercice',
          section: 'exercises',
          body: template ? <TemplateForm template={template} bundle={bundle} update={update} /> : null,
        };
      }
      case 'quest': {
        const quest = bundle.quests.find((entry) => entry.id === item.id);
        return {
          title: quest ? `Quête — ${quest.title}` : 'Quête',
          section: 'story',
          body: quest ? <QuestForm quest={quest} bundle={bundle} update={update} /> : null,
        };
      }
      case 'chapter':
      default: {
        const chapter = bundle.chapters.find((entry) => entry.id === item.id);
        return {
          title: chapter ? `Chapitre — ${chapter.title}` : 'Chapitre',
          section: 'story',
          body: chapter ? <ChapterForm chapter={chapter} bundle={bundle} update={update} /> : null,
        };
      }
    }
  }
}

type Update = (mutate: (draft: ContentBundle) => ContentBundle) => void;

/**
 * Édite une `VoiceMessage` du brouillon, ou explique son absence.
 * On ne crée jamais de voix ici : c'est la matrice ou l'entité qui la déclare.
 */
function VoiceBlock({
  voiceId,
  title,
  bundle,
  update,
  onChange,
  fallbackText,
}: {
  voiceId: string | undefined;
  title: string;
  bundle: ContentBundle;
  /** Écriture par défaut : on ne touche qu'à la `VoiceMessage`. */
  update?: Update;
  /** Écriture sur mesure, quand le texte vit aussi ailleurs (une matrice). */
  onChange?: (voice: VoiceMessage) => void;
  /** Texte à utiliser si la voix n'a pas encore été créée. */
  fallbackText?: string;
}) {
  const voice = bundle.voiceMessages.find((entry) => entry.id === voiceId);
  if (!voice) {
    return (
      <p className="admin__status">
        {title} : {fallbackText ? `« ${fallbackText} » — ` : ''}aucune voix n’est encore rattachée
        à ce texte. Enregistrez-la depuis « Voix ».
      </p>
    );
  }

  const write =
    onChange ??
    ((next: VoiceMessage): void =>
      update?.((current) => ({
        ...current,
        voiceMessages: current.voiceMessages.map((entry) => (entry.id === next.id ? next : entry)),
      })));

  return <VoiceTextEditor voice={voice} onChange={write} title={title} />;
}

function NodeForm({
  node,
  bundle,
  update,
  open,
  close,
}: {
  node: MapNode;
  bundle: ContentBundle;
  update: Update;
  open: (target: EditTarget) => void;
  close: () => void;
}) {
  const [wizard, setWizard] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const biome = bundle.biomes.find((entry) => entry.id === node.biomeId) ?? null;

  const patch = (changes: Partial<MapNode>): void =>
    update((current) => ({
      ...current,
      nodes: current.nodes.map((entry) => (entry.id === node.id ? { ...entry, ...changes } : entry)),
    }));

  const templates = node.exerciseTemplateIds ?? [];
  const encounters = node.encounters ?? [];
  const blocker = removalBlocker(bundle, node.id);

  /*
   * « + » : une NOUVELLE matrice, du type choisi, attachée à ce lieu et
   * ouverte aussitôt pour en reformuler les textes. On ne code jamais un
   * exercice : on crée une matrice (CLAUDE.md §2), ici comme dans les menus.
   */
  const addExercise = (type: ExerciseType, level: ExerciseLevel): void => {
    const created = createTemplate(type, bundle.skills, level);
    update((current) => addTemplate(current, created, node.id));
    setWizard(false);
    open({ kind: 'template', id: created.template.id });
  };

  return (
    <>
      <TextField
        label="Nom du lieu"
        value={node.label}
        onChange={(label) => patch({ label })}
        hint="C’est ce que l’enfant entend et voit sur la carte."
      />
      <SelectField
        label="Région"
        value={node.biomeId}
        options={bundle.biomes.map((entry) => ({ value: entry.id, label: entry.name }))}
        onChange={(biomeId) => patch({ biomeId })}
      />

      <PlaceIconPicker node={node} biome={biome} onChange={(icon) => patch({ icon })} />

      <div className="field">
        <span className="field__label">Créatures que l’on peut y rencontrer</span>
        <div className="ds-row">
          {bundle.creatures.map((creature) => {
            const present = encounters.some((entry) => entry.creatureId === creature.id);
            return (
              <PillButton
                key={creature.id}
                active={present}
                onClick={() =>
                  patch({
                    encounters: present
                      ? encounters.filter((entry) => entry.creatureId !== creature.id)
                      : [...encounters, { creatureId: creature.id, weight: 2 }],
                  })
                }
              >
                {creature.name}
              </PillButton>
            );
          })}
        </div>
        {encounters.length === 0 ? (
          <span className="admin__status">
            Aucune créature : l’enfant ne rencontrera personne ici. Touchez-en une ou plusieurs.
          </span>
        ) : null}
      </div>

      <div className="field">
        <span className="field__label">Exercices possibles ici</span>
        <div className="ds-row">
          {bundle.exerciseTemplates.map((template) => (
            <PillButton
              key={template.id}
              active={templates.includes(template.id)}
              onClick={() =>
                patch({
                  exerciseTemplateIds: templates.includes(template.id)
                    ? templates.filter((id) => id !== template.id)
                    : [...templates, template.id],
                })
              }
            >
              {template.label}
            </PillButton>
          ))}
        </div>
        <PrimaryButton icon={<IconPlus size={22} />} onClick={() => setWizard(true)}>
          Créer un exercice pour ce lieu
        </PrimaryButton>
        <NewExerciseWizard
          open={wizard}
          onCancel={() => setWizard(false)}
          onCreate={addExercise}
        />
      </div>

      <VoiceBlock
        voiceId={node.arrivalVoiceId}
        title="Phrase à l’arrivée"
        bundle={bundle}
        update={update}
      />

      <div className="ds-row">
        <SecondaryButton
          icon={<IconTrash size={22} />}
          disabled={blocker !== null}
          onClick={() => setConfirmRemove(true)}
        >
          Retirer ce lieu de la carte
        </SecondaryButton>
        {blocker ? <span className="admin__status">{blocker}</span> : null}
      </div>

      <ModalPanel
        open={confirmRemove}
        title={`Retirer « ${node.label} » ?`}
        onDismiss={() => setConfirmRemove(false)}
        actions={
          <>
            <SecondaryButton onClick={() => setConfirmRemove(false)}>Annuler</SecondaryButton>
            <PrimaryButton
              onClick={() => {
                update((current) => removeNode(current, node.id));
                setConfirmRemove(false);
                close();
              }}
            >
              Retirer
            </PrimaryButton>
          </>
        }
      >
        <p>
          Les chemins qui y menaient disparaissent. Sa phrase d’arrivée reste enregistrée. Les
          sauvegardes de votre enfant ne sont pas touchées.
        </p>
      </ModalPanel>
    </>
  );
}

function BiomeForm({ biome, update }: { biome: Biome; update: Update }) {
  const patch = (changes: Partial<Biome>): void =>
    update((current) => ({
      ...current,
      biomes: current.biomes.map((entry) => (entry.id === biome.id ? { ...entry, ...changes } : entry)),
    }));

  return (
    <>
      <TextField label="Nom de la région" value={biome.name} onChange={(name) => patch({ name })} />
      <TextField
        label="Nom sur la carte"
        value={biome.shortName ?? ''}
        onChange={(shortName) => patch({ shortName: shortName || undefined })}
        hint="Court, sinon il chevauche les noms des lieux voisins."
      />
    </>
  );
}

function CreatureForm({
  creature,
  bundle,
  update,
}: {
  creature: Creature;
  bundle: ContentBundle;
  update: Update;
}) {
  const patch = (changes: Partial<Creature>): void =>
    update((current) => ({
      ...current,
      creatures: current.creatures.map((entry) =>
        entry.id === creature.id ? { ...entry, ...changes } : entry,
      ),
    }));

  return (
    <>
      <div className="ds-row">
        <CreatureSprite creature={creature} size={120} />
        <span className="admin__status">
          Silhouette, couleurs, types et rareté se règlent dans « Créatures ».
        </span>
      </div>

      <TextField label="Nom" value={creature.name} onChange={(name) => patch({ name })} />
      <TextField
        label="Habitat"
        value={creature.habitat}
        onChange={(habitat) => patch({ habitat })}
        hint="Affiché dans le Pokédex : « Trouvée dans… »"
      />
      <TextField
        label="Syllabes"
        value={creature.syllables.join('-')}
        onChange={(value) =>
          patch({ syllables: value.split('-').map((part) => part.trim()).filter(Boolean) })
        }
        hint="Séparées par un tiret (Pi-lou-pi). Les exercices s’en servent."
      />
      <TextAreaField
        label="Description"
        value={creature.description ?? ''}
        onChange={(description) => patch({ description })}
      />

      <VoiceBlock
        voiceId={creature.nameVoiceId}
        title="Nom prononcé"
        bundle={bundle}
        update={update}
      />
    </>
  );
}

function TemplateForm({
  template,
  bundle,
  update,
}: {
  template: ExerciseTemplate;
  bundle: ContentBundle;
  update: Update;
}) {
  return (
    <>
      <p className="admin__status">
        Ces textes valent pour TOUTES les questions produites par cette matrice : les nombres, les
        mots et les créatures, eux, changent à chaque fois (§57). Le type d’exercice, la difficulté
        et le nombre de réponses se règlent dans « Exercices ».
      </p>

      {templateTextBlocks(template).map((block) => (
        <VoiceBlock
          key={block.field}
          voiceId={block.voiceId}
          title={block.title}
          bundle={bundle}
          fallbackText={block.text}
          onChange={(voice) =>
            update((current) => applyTemplateVoice(current, template.id, block.field, voice))
          }
        />
      ))}
    </>
  );
}

function QuestForm({ quest, bundle, update }: { quest: Quest; bundle: ContentBundle; update: Update }) {
  const patch = (changes: Partial<Quest>): void =>
    update((current) => ({
      ...current,
      quests: current.quests.map((entry) => (entry.id === quest.id ? { ...entry, ...changes } : entry)),
    }));

  return (
    <>
      <TextField label="Titre de la quête" value={quest.title} onChange={(title) => patch({ title })} />
      <VoiceBlock
        voiceId={quest.offerVoiceId}
        title="Ce que dit le Professeur"
        bundle={bundle}
        update={update}
      />
      <VoiceBlock
        voiceId={quest.completeVoiceId}
        title="Quand la quête est réussie"
        bundle={bundle}
        update={update}
      />
    </>
  );
}

function ChapterForm({
  chapter,
  bundle,
  update,
}: {
  chapter: Chapter;
  bundle: ContentBundle;
  update: Update;
}) {
  const patch = (changes: Partial<Chapter>): void =>
    update((current) => ({
      ...current,
      chapters: current.chapters.map((entry) =>
        entry.id === chapter.id ? { ...entry, ...changes } : entry,
      ),
    }));

  return (
    <>
      <TextField
        label="Titre du chapitre"
        value={chapter.title}
        onChange={(title) => patch({ title })}
      />
      <VoiceBlock
        voiceId={chapter.introVoiceId}
        title="Ouverture du chapitre"
        bundle={bundle}
        update={update}
      />
      <VoiceBlock
        voiceId={chapter.outroVoiceId}
        title="Fin du chapitre"
        bundle={bundle}
        update={update}
      />
    </>
  );
}
