import type { AdminSection, Route } from '../../app/routes';
import type { ContentBundle, ExerciseTemplate, VoiceMessage, VoiceMessageId } from '../../types';
import { SCREEN_VOICES } from '../../content/voices';

/**
 * LES VOIX DE LA PAGE QU'ON A SOUS LES YEUX.
 *
 * Enregistrer une voix demandait de quitter l'écran, d'ouvrir « Voix », et de
 * retrouver un texte dans une liste de près de deux cents entrées — sans savoir
 * lequel appartenait à l'écran d'où l'on venait. On voyait donc ce qu'il fallait
 * enregistrer, et on ne savait pas OÙ l'enregistrer.
 *
 * Ce module répond à une seule question : « quelles voix parlent ICI ? » Il la
 * répond pour un écran de l'aventure comme pour une page des menus, sans rien
 * deviner : chaque identifiant vient du contenu ou du code de l'écran, jamais
 * d'une convention de nommage.
 */
export interface PageVoices {
  /** Ce que l'adulte a sous les yeux : « la carte », « le Pokédex »… */
  title: string;
  voices: VoiceMessage[];
}

function templateVoiceIds(template: ExerciseTemplate): Array<VoiceMessageId | undefined> {
  return [
    template.audio.question?.voiceId,
    template.audio.hint1?.voiceId,
    template.audio.hint2?.voiceId,
    template.audio.success?.voiceId,
  ];
}

function templatesFor(bundle: ContentBundle, ids: string[] | undefined): ExerciseTemplate[] {
  if (!ids?.length) return [];
  return bundle.exerciseTemplates.filter((template) => ids.includes(template.id));
}

/** Identifiants des voix presentes sur un ecran de l'aventure. */
function playVoiceIds(bundle: ContentBundle, route: Route): Array<VoiceMessageId | undefined> {
  switch (route.name) {
    case 'start':
      return ['voice.ui.start', 'voice.professor.welcome'];

    case 'center':
      // Le Professeur EST la consigne de cet ecran : selon l'avancement, il
      // propose une quete, accueille, ou conclut l'aventure.
      return [
        'voice.professor.welcome',
        ...bundle.quests.map((quest) => quest.offerVoiceId),
        ...bundle.chapters.flatMap((chapter) => [chapter.introVoiceId, chapter.outroVoiceId]),
      ];

    case 'map':
      return [
        SCREEN_VOICES.map,
        'voice.ui.newPath',
        ...bundle.nodes.map((node) => node.arrivalVoiceId),
        ...bundle.biomes.map((biome) => biome.introVoiceId),
      ];

    case 'pokedex':
      return [SCREEN_VOICES.pokedex, ...bundle.creatures.map((creature) => creature.nameVoiceId)];

    case 'team':
      return [
        SCREEN_VOICES.team,
        'voice.ui.team.full',
        ...bundle.creatures.map((creature) => creature.nameVoiceId),
      ];

    case 'badges':
      return [SCREEN_VOICES.badges];

    case 'items':
      return [SCREEN_VOICES.items];

    case 'quests':
      return [
        SCREEN_VOICES.quests,
        ...bundle.quests.flatMap((quest) => [quest.offerVoiceId, quest.completeVoiceId]),
      ];

    case 'practice':
      return [
        SCREEN_VOICES.practice,
        ...bundle.exerciseTemplates.flatMap(templateVoiceIds),
      ];

    case 'encounter': {
      const node = bundle.nodes.find((item) => item.id === route.nodeId);
      const special = bundle.specialEncounters?.find((item) => item.nodeId === route.nodeId);
      const creatureIds = new Set([
        ...(node?.encounters?.map((entry) => entry.creatureId) ?? []),
        ...(special ? [special.creatureId] : []),
      ]);
      return [
        node?.arrivalVoiceId,
        special?.announceVoiceId,
        ...templatesFor(bundle, node?.exerciseTemplateIds).flatMap(templateVoiceIds),
        'voice.ui.captured',
        ...bundle.creatures
          .filter((creature) => creatureIds.has(creature.id))
          .map((creature) => creature.nameVoiceId),
      ];
    }

    case 'gym': {
      const gym = bundle.gyms.find((item) => item.id === route.gymId);
      const chapter = bundle.chapters.find((item) =>
        item.goals.some((goal) => goal.kind === 'GYM' && goal.gymId === route.gymId),
      );
      return [
        gym?.introVoiceId,
        gym?.requirementVoiceId,
        gym?.encourageVoiceId,
        gym?.victoryVoiceId,
        chapter?.outroVoiceId,
        ...templatesFor(
          bundle,
          gym?.opponents.flatMap((opponent) => opponent.exerciseTemplateIds ?? []),
        ).flatMap(templateVoiceIds),
      ];
    }

    default:
      return [];
  }
}

/** Identifiants des voix qu'on modifie depuis une page des menus. */
function adminVoiceIds(
  bundle: ContentBundle,
  section: AdminSection,
): Array<VoiceMessageId | undefined> {
  switch (section) {
    case 'creatures':
      return bundle.creatures.map((creature) => creature.nameVoiceId);

    case 'exercises':
      return bundle.exerciseTemplates.flatMap(templateVoiceIds);

    case 'world':
      return [
        ...bundle.nodes.map((node) => node.arrivalVoiceId),
        ...bundle.biomes.map((biome) => biome.introVoiceId),
        ...(bundle.specialEncounters ?? []).map((special) => special.announceVoiceId),
      ];

    case 'story':
      return [
        ...bundle.chapters.flatMap((chapter) => [chapter.introVoiceId, chapter.outroVoiceId]),
        ...bundle.quests.flatMap((quest) => [quest.offerVoiceId, quest.completeVoiceId]),
        ...bundle.gyms.flatMap((gym) => [
          gym.introVoiceId,
          gym.requirementVoiceId,
          gym.encourageVoiceId,
          gym.victoryVoiceId,
        ]),
      ];

    default:
      // « Voix » montre déjà tout ; les autres pages ne portent aucun texte
      // destiné à l'enfant.
      return [];
  }
}

const PAGE_TITLES: Record<string, string> = {
  start: 'l’accueil',
  center: 'le Centre',
  map: 'la carte',
  pokedex: 'le Pokédex',
  team: 'l’équipe',
  badges: 'les badges',
  items: 'le sac',
  practice: 'l’entraînement',
  quests: 'les missions',
  encounter: 'la rencontre',
  gym: 'l’Arène',
  creatures: 'les créatures',
  exercises: 'les exercices',
  world: 'le monde',
  story: 'l’histoire et les Arènes',
};

/**
 * Les voix presentes sur la page courante, dans l'ordre ou l'enfant les
 * entend. Les identifiants inconnus du contenu sont ignores : une page ne doit
 * jamais casser parce qu'une voix a ete supprimee.
 */
export function pageVoices(bundle: ContentBundle | null, route: Route): PageVoices {
  if (!bundle) return { title: 'cette page', voices: [] };

  const ids = route.name === 'admin' ? adminVoiceIds(bundle, route.section) : playVoiceIds(bundle, route);
  const key = route.name === 'admin' ? route.section : route.name;

  const seen = new Set<VoiceMessageId>();
  const voices: VoiceMessage[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const message = bundle.voiceMessages.find((voice) => voice.id === id);
    if (message) voices.push(message);
  }

  return { title: PAGE_TITLES[key] ?? 'cette page', voices };
}
