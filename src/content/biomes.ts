import type { Biome } from '../types';

/**
 * BIOMES DE LA V1 (CONCEPTION §12, §121).
 * Chaque biome porte les couleurs de son decor : `SceneBackground` dessine le
 * paysage en SVG, ce qui evite tout asset externe et reste lisible derriere
 * les panneaux (§133).
 */
export const defaultBiomes: Biome[] = [
  {
    id: 'centre',
    name: 'Centre',
    kind: 'CENTER',
    sky: ['#FFF8EC', '#FFE9A2'],
    ground: '#D6EDB6',
    accent: '#FF777F',
    introVoiceId: 'voice.biome.centre',
  },
  {
    id: 'prairie',
    name: 'Prairie des Premiers Pas',
    kind: 'PRAIRIE',
    sky: ['#BDEDEA', '#FFF8EC'],
    ground: '#A8D86E',
    accent: '#FFD45C',
    introVoiceId: 'voice.biome.prairie',
  },
  {
    id: 'foret',
    name: 'Forêt de Jade',
    kind: 'FOREST',
    sky: ['#D6EDB6', '#FFF8EC'],
    ground: '#7FB85A',
    accent: '#62D7D0',
    introVoiceId: 'voice.biome.foret',
    requires: { nodes: ['prairie-2'] },
  },
  {
    id: 'riviere',
    name: 'Rivière Claire',
    kind: 'RIVER',
    sky: ['#BDEDEA', '#D7D9FF'],
    ground: '#7FC4F5',
    accent: '#62D7D0',
    introVoiceId: 'voice.biome.riviere',
    requires: { nodes: ['prairie-3'] },
  },
  {
    id: 'grotte',
    name: 'Chemin des Pierres',
    kind: 'CAVE',
    sky: ['#E0C48C', '#FFF8EC'],
    ground: '#C9B79C',
    accent: '#FF777F',
    introVoiceId: 'voice.biome.grotte',
    requires: { nodes: ['riviere-2'] },
  },
];
