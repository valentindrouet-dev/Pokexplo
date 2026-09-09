import type { MapNode, SpecialEncounter } from '../types';

/**
 * CARTE DE LA V1 (CONCEPTION §10, §121).
 *
 *          🌲 FORET
 *          ●──●──●
 *         /
 * 🏥 ●──●──●──● 💧 RIVIERE
 * CENTRE          │
 *                 ●
 *                 │
 *                🏆 ARENE
 *
 * Les coordonnees sont en pourcentage : la carte s'adapte a toutes les tailles
 * d'iPad sans position codee en dur (§159).
 */
export const defaultNodes: MapNode[] = [
  {
    id: 'centre',
    biomeId: 'centre',
    label: 'Centre',
    kind: 'CENTER',
    x: 8,
    y: 52,
    connections: ['prairie-1'],
    arrivalVoiceId: 'voice.node.centre',
  },
  {
    id: 'prairie-1',
    biomeId: 'prairie',
    label: 'Prairie',
    kind: 'ENCOUNTER',
    x: 21,
    y: 52,
    connections: ['prairie-2'],
    encounters: [
      { creatureId: 'piloupi', weight: 3 },
      { creatureId: 'zibulle', weight: 2 },
      { creatureId: 'moustiflor', weight: 2 },
    ],
    exerciseTemplateIds: ['count-easy', 'match-image-word-easy', 'left-easy'],
    arrivalVoiceId: 'voice.node.prairie1',
  },
  {
    id: 'prairie-2',
    biomeId: 'prairie',
    label: 'Grand pré',
    kind: 'ENCOUNTER',
    x: 33,
    y: 52,
    connections: ['prairie-3', 'foret-1'],
    encounters: [
      { creatureId: 'piloupi', weight: 2 },
      { creatureId: 'moustiflor', weight: 3 },
      { creatureId: 'ventoline', weight: 2 },
      { creatureId: 'herbibou', weight: 1 },
    ],
    exerciseTemplateIds: ['count-easy', 'count-medium', 'missing-letter-first', 'right-easy'],
    arrivalVoiceId: 'voice.node.prairie2',
  },
  {
    id: 'prairie-3',
    biomeId: 'prairie',
    label: 'Chemin fleuri',
    kind: 'ENCOUNTER',
    x: 45,
    y: 52,
    connections: ['riviere-1'],
    requires: { nodes: ['prairie-2'] },
    encounters: [
      { creatureId: 'moustiflor', weight: 3 },
      { creatureId: 'ventoline', weight: 2 },
      { creatureId: 'zibulle', weight: 2 },
    ],
    exerciseTemplateIds: ['count-medium', 'match-image-word-easy', 'syllable-count'],
    arrivalVoiceId: 'voice.node.prairie3',
  },

  {
    id: 'foret-1',
    biomeId: 'foret',
    label: 'Lisière',
    kind: 'ENCOUNTER',
    x: 30,
    y: 26,
    connections: ['foret-2'],
    requires: { nodes: ['prairie-2'] },
    encounters: [
      { creatureId: 'feuillou', weight: 3 },
      { creatureId: 'noizette', weight: 3 },
      { creatureId: 'herbibou', weight: 2 },
    ],
    exerciseTemplateIds: ['count-medium', 'missing-letter-first', 'match-image-word-easy'],
    arrivalVoiceId: 'voice.node.foret1',
  },
  {
    id: 'foret-2',
    biomeId: 'foret',
    label: 'Sous-bois',
    kind: 'ENCOUNTER',
    x: 42,
    y: 20,
    connections: ['foret-3'],
    encounters: [
      { creatureId: 'feuillou', weight: 3 },
      { creatureId: 'chamouss', weight: 2 },
      { creatureId: 'noizette', weight: 2 },
      { creatureId: 'papilune', weight: 1 },
    ],
    exerciseTemplateIds: ['missing-letter-any', 'syllable-count', 'left-easy', 'addition-easy'],
    arrivalVoiceId: 'voice.node.foret2',
  },
  {
    id: 'foret-3',
    biomeId: 'foret',
    label: 'Clairière',
    kind: 'EVENT',
    x: 54,
    y: 24,
    connections: [],
    encounters: [
      { creatureId: 'papilune', weight: 2 },
      { creatureId: 'chamouss', weight: 2 },
    ],
    exerciseTemplateIds: ['missing-letter-any', 'count-medium', 'compare-more'],
    specialEncounterId: 'special-lianou',
    arrivalVoiceId: 'voice.node.foret3',
  },

  {
    id: 'riviere-1',
    biomeId: 'riviere',
    label: 'Rivière',
    kind: 'ENCOUNTER',
    x: 58,
    y: 52,
    connections: ['riviere-2'],
    requires: { nodes: ['prairie-3'] },
    encounters: [
      { creatureId: 'goutlin', weight: 3 },
      { creatureId: 'nageo', weight: 3 },
      { creatureId: 'crapotin', weight: 2 },
      // Brumo (Eau/Glace) apparait des la riviere : c'est la seule famille
      // Glace accessible, et l'Arene de Pierre en demande une (§23).
      { creatureId: 'brumo', weight: 1 },
    ],
    exerciseTemplateIds: ['count-medium', 'match-image-word-word', 'right-easy', 'addition-easy'],
    arrivalVoiceId: 'voice.node.riviere1',
  },
  {
    id: 'riviere-2',
    biomeId: 'riviere',
    label: 'Cascade',
    kind: 'ENCOUNTER',
    x: 70,
    y: 50,
    connections: ['chemin-roche'],
    encounters: [
      { creatureId: 'cascadin', weight: 3 },
      { creatureId: 'brumo', weight: 4 },
      { creatureId: 'goutlin', weight: 2 },
      { creatureId: 'cristalin', weight: 1 },
    ],
    exerciseTemplateIds: ['count-hard', 'syllable-first', 'above-easy', 'number-next'],
    arrivalVoiceId: 'voice.node.riviere2',
  },

  {
    id: 'chemin-roche',
    biomeId: 'grotte',
    label: 'Chemin des Pierres',
    kind: 'ENCOUNTER',
    x: 71,
    y: 70,
    connections: ['arene-pierre'],
    requires: { nodes: ['riviere-2'] },
    encounters: [
      { creatureId: 'rocaillou', weight: 3 },
      { creatureId: 'silexo', weight: 2 },
      { creatureId: 'granitou', weight: 2 },
      { creatureId: 'volcanou', weight: 1 },
    ],
    exerciseTemplateIds: ['count-hard', 'missing-letter-last', 'grid-easy', 'english-color-blue'],
    arrivalVoiceId: 'voice.node.cheminRoche',
  },
  {
    id: 'arene-pierre',
    biomeId: 'grotte',
    label: 'Arène de Pierre',
    kind: 'GYM',
    x: 72,
    y: 88,
    connections: [],
    gymId: 'gym-pierre',
    requires: {
      nodes: ['chemin-roche'],
      effectiveTypes: { types: ['EAU', 'PLANTE', 'GLACE'], count: 3 },
    },
    arrivalVoiceId: 'voice.node.arene',
  },
];

/** CONCEPTION §17 — rencontre visible posee comme un objectif sur la carte. */
export const defaultSpecialEncounters: SpecialEncounter[] = [
  {
    id: 'special-lianou',
    creatureId: 'lianou',
    nodeId: 'foret-3',
    announceVoiceId: 'voice.special.lianou',
    exerciseTemplateIds: ['syllable-count', 'missing-letter-any', 'count-medium'],
    persistent: true,
  },
];
