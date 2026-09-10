import type { ContentBundle, Creature, ExerciseTemplate } from '../../types';
import { uid } from '../../utils/id';
import { createVoiceMessage } from '../../utils/voice';
import { templateTextBlocks } from './exerciseText';
import { nextCreatureNumber } from './creatureNumber';

/**
 * DUPLIQUER ET SUPPRIMER (UI_DESIGN §196).
 *
 * Dupliquer est l'opération la plus utile de l'édition d'un jeu : « Prairie
 * 02 » se fait en copiant « Prairie 01 », jamais en recommençant à zéro. Elle
 * manquait entièrement.
 *
 * Règle commune à toutes les copies : **les voix suivent**. Une créature
 * dupliquée sans sa `VoiceMessage` pointerait vers celle de l'original, et
 * renommer l'une renommerait ce que dit l'autre.
 */
export interface Duplicated<T> {
  bundle: ContentBundle;
  created: T;
}

export function duplicateCreature(bundle: ContentBundle, creatureId: string): Duplicated<Creature> | null {
  const source = bundle.creatures.find((item) => item.id === creatureId);
  if (!source) return null;

  const id = uid('creature');
  const nameVoiceId = `voice.creature.${id}.name`;
  const name = `${source.name} (copie)`;
  const created: Creature = {
    ...structuredClone(source),
    id,
    // Sans cela, la copie porterait le numero de l'original : deux « #025 ».
    number: nextCreatureNumber(bundle),
    name,
    nameVoiceId,
  };

  return {
    created,
    bundle: {
      ...bundle,
      creatures: [...bundle.creatures, created],
      voiceMessages: [
        ...bundle.voiceMessages,
        createVoiceMessage(nameVoiceId, name, 'adventure', { autoPlay: false }),
      ],
    },
  };
}

/** Pourquoi une créature ne peut pas partir, ou `null` si elle le peut. */
export function creatureBlocker(bundle: ContentBundle, creatureId: string): string | null {
  const usedByNode = bundle.nodes.find((node) =>
    (node.encounters ?? []).some((entry) => entry.creatureId === creatureId),
  );
  if (usedByNode) return `On peut la rencontrer à « ${usedByNode.label} » : retirez-la d’abord.`;

  const usedByGym = bundle.gyms.find((gym) =>
    gym.opponents.some((opponent) => opponent.creatureId === creatureId),
  );
  if (usedByGym) return `Elle défend l’Arène « ${usedByGym.gymName} ».`;

  const usedBySpecial = bundle.specialEncounters.find((item) => item.creatureId === creatureId);
  if (usedBySpecial) return 'Elle est la créature d’une rencontre spéciale.';

  return null;
}

/**
 * Retire une créature. Sa voix RESTE dans le brouillon : on ne supprime jamais
 * un enregistrement dans le dos de l'administrateur (CLAUDE.md §3).
 */
export function removeCreature(bundle: ContentBundle, creatureId: string): ContentBundle {
  return {
    ...bundle,
    creatures: bundle.creatures.filter((item) => item.id !== creatureId),
    exerciseTemplates: bundle.exerciseTemplates.map((template) =>
      template.creaturePool.kind === 'explicit'
        ? {
            ...template,
            creaturePool: {
              kind: 'explicit',
              creatureIds: template.creaturePool.creatureIds.filter((id) => id !== creatureId),
            },
          }
        : template,
    ),
  };
}

export function duplicateTemplate(
  bundle: ContentBundle,
  templateId: string,
): Duplicated<ExerciseTemplate> | null {
  const source = bundle.exerciseTemplates.find((item) => item.id === templateId);
  if (!source) return null;

  const id = uid('ex');
  const voiceId = (suffix: string): string => `voice.ex.${id}.${suffix}`;
  const created = {
    ...structuredClone(source),
    id,
    label: `${source.label} (copie)`,
    audio: {
      question: { voiceId: voiceId('q') },
      hint1: { voiceId: voiceId('h1') },
      hint2: { voiceId: voiceId('h2') },
      success: { voiceId: voiceId('ok') },
    },
  } as ExerciseTemplate;

  // Les quatre textes de la copie repartent de ceux de l'original.
  const locale = source.locale ?? 'fr-FR';
  const suffixes = ['q', 'h1', 'h2', 'ok'] as const;
  const voices = templateTextBlocks(source).map((block, index) =>
    createVoiceMessage(voiceId(suffixes[index]!), block.text, 'exercises', { locale }),
  );

  return {
    created,
    bundle: {
      ...bundle,
      exerciseTemplates: [...bundle.exerciseTemplates, created],
      voiceMessages: [...bundle.voiceMessages, ...voices],
    },
  };
}

/** Pourquoi une matrice ne peut pas partir, ou `null` si elle le peut. */
export function templateBlocker(bundle: ContentBundle, templateId: string): string | null {
  const node = bundle.nodes.find((entry) => (entry.exerciseTemplateIds ?? []).includes(templateId));
  if (node) return `Elle est utilisée à « ${node.label} » : retirez-la d’abord de ce lieu.`;

  const gym = bundle.gyms.find((entry) =>
    entry.opponents.some((opponent) => opponent.exerciseTemplateIds.includes(templateId)),
  );
  if (gym) return `Elle est utilisée par l’Arène « ${gym.gymName} ».`;

  if (bundle.exerciseTemplates.length <= 1) return 'C’est la dernière matrice : le jeu en a besoin.';
  return null;
}

/** Retire une matrice. Ses voix restent, comme pour tout le reste (§3). */
export function removeTemplate(bundle: ContentBundle, templateId: string): ContentBundle {
  return {
    ...bundle,
    exerciseTemplates: bundle.exerciseTemplates.filter((item) => item.id !== templateId),
    specialEncounters: bundle.specialEncounters.map((special) => ({
      ...special,
      exerciseTemplateIds: special.exerciseTemplateIds.filter((id) => id !== templateId),
    })),
  };
}
