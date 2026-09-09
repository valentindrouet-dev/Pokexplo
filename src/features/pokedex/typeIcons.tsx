import type { ComponentType } from 'react';
import type { CreatureType } from '../../types';
import {
  IconBolt,
  IconBug,
  IconCircle,
  IconCrescent,
  IconDroplet,
  IconFist,
  IconFurrow,
  IconLeaf,
  IconRock,
  IconSnow,
  IconSparkle,
  IconSpiral,
  IconVolcano,
  IconWing,
  type IconProps,
} from '../../ui';

/**
 * UN PICTOGRAMME PAR TYPE (§147, §192).
 *
 * Les filtres du Pokédex disaient « Eau », « Plante », « Roche » : trois mots
 * à lire avant de pouvoir trier sa collection. Chaque type a désormais son
 * dessin — le mot reste, pour l'adulte et pour l'enfant qui commence à lire,
 * mais il n'est plus la seule information.
 */
export const TYPE_ICONS: Record<CreatureType, ComponentType<IconProps>> = {
  NORMAL: IconCircle,
  FEU: IconVolcano,
  EAU: IconDroplet,
  PLANTE: IconLeaf,
  ELECTRIK: IconBolt,
  GLACE: IconSnow,
  ROCHE: IconRock,
  SOL: IconFurrow,
  VOL: IconWing,
  INSECTE: IconBug,
  PSY: IconSpiral,
  TENEBRES: IconCrescent,
  FEE: IconSparkle,
  COMBAT: IconFist,
};

export function TypeIcon({ type, size = 26 }: { type: CreatureType; size?: number }) {
  const Icon = TYPE_ICONS[type];
  return <Icon size={size} />;
}
