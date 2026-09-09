import type { Biome, MapNode, PlaceIconKey } from '../../types';
import { PLACE_ICONS, PLACE_ICON_KEYS, placeIconFor } from '../world-map/placeIcons';
import './forms.css';

/**
 * CHOIX DU PICTOGRAMME D'UN LIEU (§147).
 *
 * « Région » laisse le lieu suivre sa région (feuille en forêt, goutte en
 * rivière…) : c'est le réglage de départ, et il reste le bon pour la plupart
 * des lieux. Les autres cases remplacent ce dessin, pour ce lieu seulement.
 * Le même sélecteur sert au tiroir d'édition et aux menus.
 */
export function PlaceIconPicker({
  node,
  biome,
  onChange,
}: {
  node: MapNode;
  biome: Biome | null;
  onChange: (icon: PlaceIconKey | undefined) => void;
}) {
  const effective = placeIconFor(node, biome);
  const Auto = PLACE_ICONS[placeIconFor({ ...node, icon: undefined }, biome)].Icon;

  return (
    <div className="field">
      <span className="field__label">Pictogramme sur la carte</span>
      <div className="icon-picker" role="group" aria-label="Pictogramme sur la carte">
        <button
          type="button"
          className="icon-picker__item icon-picker__auto"
          aria-pressed={node.icon === undefined}
          aria-label="Pictogramme de la région"
          onClick={() => onChange(undefined)}
        >
          <Auto size={22} />
          <span>Région</span>
        </button>
        {PLACE_ICON_KEYS.map((key) => {
          const { label, Icon } = PLACE_ICONS[key];
          return (
            <button
              key={key}
              type="button"
              className="icon-picker__item"
              aria-pressed={node.icon === key}
              aria-label={label}
              title={label}
              onClick={() => onChange(key)}
            >
              <Icon size={26} />
            </button>
          );
        })}
      </div>
      <span className="admin__status">
        Actuellement : {PLACE_ICONS[effective].label}
        {node.icon === undefined ? ' (celui de la région)' : ''}.
      </span>
    </div>
  );
}
