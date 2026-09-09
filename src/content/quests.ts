import type { Chapter, Quest } from '../types';

/** CONCEPTION §25 — mini-quetes de la V1. */
export const defaultQuests: Quest[] = [
  {
    id: 'quest-premiers-pas',
    title: 'Attrape tes trois premières créatures',
    objective: { kind: 'CAPTURE_COUNT', count: 3 },
    offerVoiceId: 'voice.quest.premiersPas.offer',
    completeVoiceId: 'voice.quest.premiersPas.done',
    chapterId: 'chapitre-1',
  },
  {
    id: 'quest-plantes',
    title: 'Trouve trois créatures Plante',
    objective: { kind: 'CAPTURE_TYPE', type: 'PLANTE', count: 3 },
    offerVoiceId: 'voice.quest.plantes.offer',
    completeVoiceId: 'voice.quest.plantes.done',
    chapterId: 'chapitre-1',
  },
  {
    id: 'quest-eau',
    title: 'Capture deux créatures Eau',
    objective: { kind: 'CAPTURE_TYPE', type: 'EAU', count: 2 },
    offerVoiceId: 'voice.quest.eau.offer',
    completeVoiceId: 'voice.quest.eau.done',
    chapterId: 'chapitre-1',
  },
  {
    id: 'quest-lettre-c',
    title: 'Trouve une créature dont le nom commence par C',
    objective: { kind: 'CAPTURE_NAME_STARTS_WITH', letter: 'C', count: 1 },
    offerVoiceId: 'voice.quest.lettreC.offer',
    completeVoiceId: 'voice.quest.lettreC.done',
    chapterId: 'chapitre-1',
  },
  {
    id: 'quest-syllabes',
    title: 'Trouve une créature avec trois syllabes',
    objective: { kind: 'CAPTURE_SYLLABLE_COUNT', syllables: 3, count: 1 },
    offerVoiceId: 'voice.quest.syllabes.offer',
    completeVoiceId: 'voice.quest.syllabes.done',
    chapterId: 'chapitre-1',
  },
  {
    id: 'quest-arene',
    title: 'Gagne le Badge Roche',
    objective: { kind: 'WIN_GYM', gymId: 'gym-pierre' },
    offerVoiceId: 'voice.quest.arene.offer',
    completeVoiceId: 'voice.quest.arene.done',
    chapterId: 'chapitre-1',
  },
];

/**
 * CONCEPTION §6 — le jeu a un vrai debut et une vraie fin.
 * La V1 se termine sur le Badge Roche ; l'exploration continue ensuite.
 */
export const defaultChapters: Chapter[] = [
  {
    id: 'chapitre-1',
    index: 1,
    title: 'Chapitre 1 — Le Badge Roche',
    introVoiceId: 'voice.chapter.1.intro',
    outroVoiceId: 'voice.chapter.1.outro',
    goals: [
      { kind: 'QUEST', questId: 'quest-premiers-pas' },
      { kind: 'QUEST', questId: 'quest-plantes' },
      { kind: 'GYM', gymId: 'gym-pierre' },
    ],
    isFinal: true,
  },
];
