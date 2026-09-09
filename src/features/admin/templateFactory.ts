import type {
  ContentBundle,
  ExerciseTemplate,
  ExerciseType,
  Skill,
  VoiceMessage,
} from '../../types';
import { uid } from '../../utils/id';
import { createVoiceMessage } from '../../utils/voice';

/**
 * NOUVELLE MATRICE D'EXERCICE (§31-32).
 *
 * On ne code jamais un exercice : on crée une MATRICE d'un des douze types,
 * avec des réglages qui produisent tout de suite un exercice jouable et des
 * textes génériques (§57) que l'adulte reformule ensuite dans le
 * `VoiceTextEditor`. La même fabrique sert aux menus et au mode édition.
 */
export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  COUNT: 'Compter des créatures',
  ADDITION: 'Additionner',
  SUBTRACTION: 'Soustraire',
  COMPARE: 'Comparer deux groupes',
  NUMBER_SEQUENCE: 'Suite de nombres',
  CHOOSE_WORD: 'Choisir le bon mot',
  MATCH_IMAGE_WORD: 'Associer image et mot',
  MISSING_LETTER: 'Lettre manquante',
  SYLLABLE: 'Syllabes',
  LEFT_RIGHT: 'Gauche, droite, dessus, dessous',
  GRID_MOVE: 'Suivre un chemin sur une grille',
  ENGLISH_WORD: 'Un mot en anglais',
};

/** La compétence la plus naturelle pour chaque type, si elle existe. */
const PREFERRED_SKILL: Record<ExerciseType, string> = {
  COUNT: 'math.counting',
  ADDITION: 'math.addition',
  SUBTRACTION: 'math.subtraction',
  COMPARE: 'math.compare',
  NUMBER_SEQUENCE: 'math.sequence',
  CHOOSE_WORD: 'reading.words',
  MATCH_IMAGE_WORD: 'reading.words',
  MISSING_LETTER: 'reading.letters',
  SYLLABLE: 'reading.syllables',
  LEFT_RIGHT: 'spatial.leftRight',
  GRID_MOVE: 'spatial.grid',
  ENGLISH_WORD: 'english.basics',
};

function pickSkill(type: ExerciseType, skills: Skill[]): Skill | null {
  return skills.find((skill) => skill.id === PREFERRED_SKILL[type]) ?? skills[0] ?? null;
}

interface Specific {
  /** Les champs propres au type (bornes, sens, position…). */
  fields: Record<string, unknown>;
  prompt: string;
  hint1Text: string;
  hint2Text: string;
  successText: string;
  hintType: ExerciseTemplate['hintType'];
  answerCount: number;
  locale?: 'fr-FR' | 'en-GB';
}

function specifics(type: ExerciseType): Specific {
  const common = {
    hint2Text: 'Il n’en reste que deux : regarde bien.',
    successText: 'Bravo !',
  };
  switch (type) {
    case 'COUNT':
      return {
        ...common,
        fields: { minValue: 2, maxValue: 5 },
        prompt: 'Combien vois-tu de créatures ?',
        hint1Text: 'Compte-les doucement, une par une.',
        hintType: 'highlightOneByOne',
        answerCount: 3,
      };
    case 'ADDITION':
      return {
        ...common,
        fields: { maxTerm: 3, maxSum: 5, showObjects: true },
        prompt: 'Combien y en a-t-il en tout ?',
        hint1Text: 'Compte d’abord le premier groupe, puis continue.',
        hintType: 'showObjects',
        answerCount: 3,
      };
    case 'SUBTRACTION':
      return {
        ...common,
        fields: { maxValue: 6, showObjects: true },
        prompt: 'Combien en reste-t-il ?',
        hint1Text: 'Enlève-les une par une.',
        hintType: 'showObjects',
        answerCount: 3,
      };
    case 'COMPARE':
      return {
        ...common,
        fields: { maxValue: 6, question: 'more' },
        prompt: 'Où y en a-t-il le plus ?',
        hint1Text: 'Compte chaque groupe.',
        hintType: 'highlightOneByOne',
        answerCount: 2,
      };
    case 'NUMBER_SEQUENCE':
      return {
        ...common,
        fields: { minValue: 1, maxValue: 20, mode: 'next', length: 4 },
        prompt: 'Quel nombre vient après ?',
        hint1Text: 'Relis la suite à voix haute.',
        hintType: 'highlightOneByOne',
        answerCount: 3,
      };
    case 'CHOOSE_WORD':
      return {
        ...common,
        fields: { distractors: 'sameFirstLetter' },
        prompt: 'Quel mot va avec cette créature ?',
        hint1Text: 'Les mots se ressemblent : regarde le début.',
        hintType: 'splitSyllables',
        answerCount: 3,
      };
    case 'MATCH_IMAGE_WORD':
      return {
        ...common,
        fields: { direction: 'imageToWord' },
        prompt: 'Quel est son nom ?',
        hint1Text: 'Regarde la première lettre du mot.',
        hintType: 'splitSyllables',
        answerCount: 3,
      };
    case 'MISSING_LETTER':
      return {
        ...common,
        fields: { position: 'first' },
        prompt: 'Quelle lettre manque au début ?',
        hint1Text: 'Écoute le début du mot.',
        hintType: 'splitSyllables',
        answerCount: 3,
      };
    case 'SYLLABLE':
      return {
        ...common,
        fields: { mode: 'countSyllables' },
        prompt: 'Combien y a-t-il de syllabes ?',
        hint1Text: 'Tape dans tes mains à chaque syllabe.',
        hintType: 'splitSyllables',
        answerCount: 3,
      };
    case 'LEFT_RIGHT':
      return {
        ...common,
        fields: { axis: 'leftRight', target: 'LEFT' },
        prompt: 'Touche la créature qui est à gauche.',
        hint1Text: 'La gauche, c’est du côté de ta main qui tient la feuille.',
        hint2Text: 'Regarde la flèche.',
        hintType: 'highlightDirection',
        answerCount: 2,
      };
    case 'GRID_MOVE':
      return {
        ...common,
        fields: { gridSize: 3, steps: 2 },
        prompt: 'Où arrive la créature ?',
        hint1Text: 'Suis les flèches avec ton doigt.',
        hintType: 'highlightDirection',
        answerCount: 3,
      };
    case 'ENGLISH_WORD':
    default:
      return {
        fields: { mode: 'color', color: 'bleu' },
        prompt: 'Touch the blue creature.',
        hint1Text: 'Blue is the colour of the sky.',
        hint2Text: 'Only two left: look carefully.',
        successText: 'Well done!',
        hintType: 'removeWrongAnswer',
        answerCount: 3,
        locale: 'en-GB',
      };
  }
}

export interface CreatedTemplate {
  template: ExerciseTemplate;
  voices: VoiceMessage[];
}

/** Fabrique une matrice du type demandé, prête à jouer, et ses quatre voix. */
export function createTemplate(type: ExerciseType, skills: Skill[]): CreatedTemplate {
  const id = uid('ex');
  const skill = pickSkill(type, skills);
  const spec = specifics(type);
  const locale = spec.locale ?? 'fr-FR';
  const voiceId = (suffix: string): string => `voice.ex.${id}.${suffix}`;

  const template = {
    id,
    type,
    label: EXERCISE_TYPE_LABELS[type],
    category: skill?.category ?? 'MATH',
    skillId: skill?.id ?? '',
    difficulty: 1,
    answerCount: spec.answerCount,
    hintType: spec.hintType,
    creaturePool: { kind: 'random' },
    prompt: spec.prompt,
    hint1Text: spec.hint1Text,
    hint2Text: spec.hint2Text,
    successText: spec.successText,
    audio: {
      question: { voiceId: voiceId('q') },
      hint1: { voiceId: voiceId('h1') },
      hint2: { voiceId: voiceId('h2') },
      success: { voiceId: voiceId('ok') },
    },
    ...(spec.locale ? { locale: spec.locale } : {}),
    ...spec.fields,
  } as ExerciseTemplate;

  const voices = [
    createVoiceMessage(voiceId('q'), spec.prompt, 'exercises', { locale }),
    createVoiceMessage(voiceId('h1'), spec.hint1Text, 'exercises', { locale }),
    createVoiceMessage(voiceId('h2'), spec.hint2Text, 'exercises', { locale }),
    createVoiceMessage(voiceId('ok'), spec.successText, 'exercises', { locale }),
  ];

  return { template, voices };
}

/** Ajoute la matrice et ses voix au brouillon ; `nodeId` l'attache à un lieu. */
export function addTemplate(
  bundle: ContentBundle,
  created: CreatedTemplate,
  nodeId: string | null = null,
): ContentBundle {
  return {
    ...bundle,
    exerciseTemplates: [...bundle.exerciseTemplates, created.template],
    voiceMessages: [...bundle.voiceMessages, ...created.voices],
    nodes: nodeId
      ? bundle.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                exerciseTemplateIds: [...(node.exerciseTemplateIds ?? []), created.template.id],
              }
            : node,
        )
      : bundle.nodes,
  };
}
