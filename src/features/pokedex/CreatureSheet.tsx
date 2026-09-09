import type { Creature, PokedexState } from '../../types';
import { TYPE_COLORS, TYPE_LABELS } from '../../types/content';
import { IconClose, IconButton, SoftPanel, VoiceButton } from '../../ui';
import { CreatureSprite } from '../../components/CreatureSprite';
import { useAudio } from '../../app/providers/AudioProvider';
import { Editable } from '../edit-mode/Editable';
import { TypeIcon } from './typeIcons';

/**
 * FICHE D'UNE CRÉATURE, PAR-DESSUS LA COLLECTION (UI_DESIGN §191).
 *
 * Le Pokédex montrait en permanence deux panneaux : la grille à gauche, la
 * fiche à droite. Un enfant de cinq ans doit alors comprendre que la droite
 * parle de ce qu'il a touché à gauche. On montre désormais **une chose à la
 * fois, en grand** : la grille, puis la fiche par-dessus, qu'un seul geste
 * referme.
 */
export function CreatureSheet({
  creature,
  state,
  onClose,
}: {
  creature: Creature;
  state: PokedexState;
  onClose: () => void;
}) {
  const { speak, buttonState } = useAudio();
  const unknown = state === 'UNKNOWN';

  return (
    <div
      className="sheet"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <SoftPanel padding="roomy" animated className="sheet__panel">
        <div className="sheet__close">
          <IconButton large label="Fermer" icon={<IconClose size={30} />} onClick={onClose} />
        </div>

        <CreatureSprite
          creature={creature}
          size={240}
          silhouette={unknown}
          animated={state === 'CAPTURED'}
        />

        <Editable target={{ kind: 'creature', id: creature.id }} label={`la créature ${creature.name}`}>
          <p className="sheet__name">{unknown ? '???' : creature.name}</p>
        </Editable>

        {unknown ? (
          <p className="start__subtitle">Tu ne l’as pas encore rencontrée.</p>
        ) : (
          <>
            {/* Type : le dessin d'abord, le mot ensuite (§147). */}
            <div className="pokedex__meta">
              <TypeChip type={creature.type1} />
              {creature.type2 ? <TypeChip type={creature.type2} /> : null}
            </div>

            {/* Entendre son nom : c'est le geste le plus utile de cet écran. */}
            <VoiceButton
              state={buttonState(creature.nameVoiceId)}
              onPlay={() => speak(creature.nameVoiceId)}
              label={`Écouter : ${creature.name}`}
            />

            {state === 'CAPTURED' ? (
              <p className="start__subtitle">Trouvée dans : {creature.habitat}</p>
            ) : (
              <p className="start__subtitle">Attrape-la pour tout savoir !</p>
            )}
          </>
        )}
      </SoftPanel>
    </div>
  );
}

export function TypeChip({ type }: { type: Creature['type1'] }) {
  return (
    <span className="type-chip" style={{ background: TYPE_COLORS[type] }}>
      <TypeIcon type={type} size={24} />
      {TYPE_LABELS[type]}
    </span>
  );
}
