import type { Badge, Gym } from '../types';

/**
 * ARENE DE LA V1 (CONCEPTION §22-24, §121).
 *
 * Condition d'acces (§23) : posseder au moins 3 creatures efficaces contre
 * Roche parmi Eau, Plante et Glace. L'ecran « PRÊT POUR PIERRE ? » lit
 * directement `requires.effectiveTypes`.
 */
export const defaultGyms: Gym[] = [
  {
    id: 'gym-pierre',
    masterName: 'Pierre',
    gymName: 'Arène de Pierre',
    type: 'ROCHE',
    nodeId: 'arene-pierre',
    badgeId: 'badge-roche',
    requires: {
      nodes: ['chemin-roche'],
      effectiveTypes: { types: ['EAU', 'PLANTE', 'GLACE'], count: 3 },
    },
    opponents: [
      {
        creatureId: 'rocaillou',
        hearts: 2,
        exerciseTemplateIds: ['count-medium', 'missing-letter-first', 'left-easy'],
      },
      {
        creatureId: 'silexo',
        hearts: 2,
        exerciseTemplateIds: ['count-hard', 'match-image-word-easy', 'right-easy'],
      },
      {
        creatureId: 'granitou',
        hearts: 3,
        exerciseTemplateIds: ['count-hard', 'missing-letter-any', 'syllable-count', 'addition-easy'],
      },
    ],
    introVoiceId: 'voice.gym.pierre.intro',
    requirementVoiceId: 'voice.gym.pierre.requirement',
    victoryVoiceId: 'voice.gym.pierre.victory',
    encourageVoiceId: 'voice.gym.pierre.encourage',
    masterVisual: {
      shape: 'quad',
      palette: ['#C9B79C', '#FFE9A2'],
      accent: '#FF777F',
      ears: 'none',
      eyes: 'happy',
      feature: 'rock',
    },
  },
];

export const defaultBadges: Badge[] = [
  {
    id: 'badge-roche',
    name: 'Badge Roche',
    gymId: 'gym-pierre',
    color: '#C9B79C',
    shape: 'hexagon',
  },
];
