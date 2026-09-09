import type { ComponentType } from 'react';
import type { Biome, BiomeKind, MapNode, PlaceIconKey } from '../../types';
import {
  IconBadge,
  IconBridge,
  IconCenter,
  IconDroplet,
  IconEgg,
  IconFish,
  IconFlag,
  IconFlower,
  IconGem,
  IconHeart,
  IconHome,
  IconLeaf,
  IconMoon,
  IconMountain,
  IconMushroom,
  IconRock,
  IconSnow,
  IconSparkle,
  IconStar,
  IconSun,
  IconTree,
  IconVolcano,
  IconWave,
  type IconProps,
} from '../../ui';

/**
 * PICTOGRAMMES DE LIEUX (§147).
 *
 * L'enfant reconnaît d'abord OÙ il va : une fleur, une feuille, un rocher.
 * Chaque clé de `PlaceIconKey` a ici son dessin et son nom parlé — c'est le
 * seul endroit qui les associe, pour la carte comme pour le sélecteur adulte.
 */
export interface PlaceIconEntry {
  label: string;
  Icon: ComponentType<IconProps>;
}

export const PLACE_ICONS: Record<PlaceIconKey, PlaceIconEntry> = {
  flower: { label: 'Fleur', Icon: IconFlower },
  leaf: { label: 'Feuille', Icon: IconLeaf },
  tree: { label: 'Arbre', Icon: IconTree },
  mushroom: { label: 'Champignon', Icon: IconMushroom },
  droplet: { label: 'Goutte', Icon: IconDroplet },
  wave: { label: 'Vague', Icon: IconWave },
  fish: { label: 'Poisson', Icon: IconFish },
  rock: { label: 'Rocher', Icon: IconRock },
  mountain: { label: 'Montagne', Icon: IconMountain },
  gem: { label: 'Pierre précieuse', Icon: IconGem },
  snow: { label: 'Neige', Icon: IconSnow },
  volcano: { label: 'Volcan', Icon: IconVolcano },
  sun: { label: 'Soleil', Icon: IconSun },
  moon: { label: 'Lune', Icon: IconMoon },
  star: { label: 'Étoile', Icon: IconStar },
  sparkle: { label: 'Étincelle', Icon: IconSparkle },
  bridge: { label: 'Pont', Icon: IconBridge },
  flag: { label: 'Drapeau', Icon: IconFlag },
  egg: { label: 'Œuf', Icon: IconEgg },
  heart: { label: 'Cœur', Icon: IconHeart },
  home: { label: 'Maison', Icon: IconHome },
  center: { label: 'Centre', Icon: IconCenter },
  badge: { label: 'Arène', Icon: IconBadge },
};

export const PLACE_ICON_KEYS = Object.keys(PLACE_ICONS) as PlaceIconKey[];

/** Pictogramme qu'une région donne à ses lieux, faute de choix explicite. */
export function defaultIconForBiome(kind: BiomeKind | undefined): PlaceIconKey {
  switch (kind) {
    case 'FOREST':
      return 'leaf';
    case 'RIVER':
      return 'droplet';
    case 'BEACH':
      return 'wave';
    case 'CAVE':
    case 'MOUNTAIN':
      return 'rock';
    case 'SNOW':
      return 'snow';
    case 'VOLCANO':
      return 'volcano';
    case 'CENTER':
      return 'center';
    case 'PRAIRIE':
    case 'SWAMP':
    case 'CITY':
    default:
      return 'flower';
  }
}

/**
 * Le pictogramme effectif d'un lieu : son choix, sinon ce que dicte sa nature
 * (le Centre, une Arène), sinon sa région.
 */
export function placeIconFor(node: MapNode, biome: Biome | null | undefined): PlaceIconKey {
  if (node.icon && node.icon in PLACE_ICONS) return node.icon;
  if (node.kind === 'CENTER') return 'center';
  if (node.kind === 'GYM') return 'badge';
  return defaultIconForBiome(biome?.kind);
}
