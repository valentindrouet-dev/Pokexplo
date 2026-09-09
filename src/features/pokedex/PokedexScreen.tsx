import { useMemo, useState } from 'react';
import type { Creature, CreatureType } from '../../types';
import { TYPE_COLORS, TYPE_LABELS } from '../../types/content';
import {
  CreatureCard,
  LoadingBall,
  PillButton,
  SoftPanel,
  TwoPaneLayout,
  VoiceButton,
} from '../../ui';
import { CreatureSprite } from '../../components/CreatureSprite';
import { useAudio } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { PlayScreen } from '../play/PlayScreen';
import { useScreenVoice } from '../../app/providers/useScreenVoice';
import { SCREEN_VOICES } from '../../content/voices';
import { Editable } from '../edit-mode/Editable';

const FILTERS: Array<{ id: 'ALL' | CreatureType; label: string }> = [
  { id: 'ALL', label: 'Tous' },
  { id: 'EAU', label: 'Eau' },
  { id: 'PLANTE', label: 'Plante' },
  { id: 'ROCHE', label: 'Roche' },
];

/**
 * POKEDEX (CONCEPTION §18, §154-156).
 *
 * Structure en deux colonnes 45 % / 55 % : grille a gauche, tres grande image
 * et informations a droite. Une creature inconnue reste une silhouette « ??? ».
 */
export function PokedexScreen() {
  // §192 — l'écran dit ce qu'on peut y faire, à l'arrivée.
  useScreenVoice(SCREEN_VOICES.pokedex);
  const { bundle } = useContent();
  const { save } = useGame();
  const { speak, buttonState } = useAudio();
  const [filter, setFilter] = useState<'ALL' | CreatureType>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const creatures = useMemo(() => {
    const list = bundle?.creatures ?? [];
    if (filter === 'ALL') return list;
    return list.filter((item) => item.type1 === filter || item.type2 === filter);
  }, [bundle, filter]);

  if (!bundle || !save) {
    return (
      <PlayScreen>
        <LoadingBall />
      </PlayScreen>
    );
  }

  const selected: Creature | null =
    creatures.find((item) => item.id === selectedId) ?? creatures[0] ?? null;
  const selectedState = selected ? (save.pokedex[selected.id]?.state ?? 'UNKNOWN') : 'UNKNOWN';
  const captured = Object.values(save.pokedex).filter((entry) => entry.state === 'CAPTURED').length;

  return (
    <PlayScreen scrim="soft">
      <TwoPaneLayout
        className="pokedex"
        leftLabel="Créatures"
        rightLabel="Détail"
        left={
          <SoftPanel padding="tight" fill>
            <div className="ds-row pokedex__filters">
              {FILTERS.map((item) => (
                <PillButton
                  key={item.id}
                  active={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </PillButton>
              ))}
            </div>
            <div className="pokedex__grid">
              {creatures.map((item) => {
                const state = save.pokedex[item.id]?.state ?? 'UNKNOWN';
                return (
                  <CreatureCard
                    key={item.id}
                    name={item.name}
                    state={state === 'CAPTURED' ? 'captured' : state === 'SEEN' ? 'seen' : 'unknown'}
                    selected={selected?.id === item.id}
                    onSelect={() => setSelectedId(item.id)}
                    media={
                      <CreatureSprite creature={item} size={84} silhouette={state === 'UNKNOWN'} />
                    }
                  />
                );
              })}
            </div>
          </SoftPanel>
        }
        right={
          <SoftPanel padding="roomy" fill className="ds-scroll">
            {selected ? (
              <div className="pokedex__detail">
                <CreatureSprite
                  creature={selected}
                  size={240}
                  silhouette={selectedState === 'UNKNOWN'}
                  animated={selectedState === 'CAPTURED'}
                />
                <div className="pokedex__detail-text">
                <Editable
                  target={{ kind: 'creature', id: selected.id }}
                  label={`la créature ${selected.name}`}
                >
                  <p className="pokedex__name">
                    {selectedState === 'UNKNOWN' ? '???' : selected.name}
                  </p>
                </Editable>

                {selectedState === 'UNKNOWN' ? (
                  <p className="start__subtitle">Tu ne l’as pas encore rencontrée.</p>
                ) : (
                  <>
                    <div className="pokedex__meta">
                      <TypeChip type={selected.type1} />
                      {selected.type2 ? <TypeChip type={selected.type2} /> : null}
                    </div>
                    {selectedState === 'CAPTURED' ? (
                      <>
                        <p className="start__subtitle">Trouvée dans : {selected.habitat}</p>
                        <p>{selected.description}</p>
                        <VoiceButton
                          state={buttonState(selected.nameVoiceId)}
                          onPlay={() => speak(selected.nameVoiceId)}
                          label={`Écouter : ${selected.name}`}
                        />
                      </>
                    ) : (
                      <p className="start__subtitle">Rencontrée — attrape-la pour tout savoir !</p>
                    )}
                  </>
                )}
                </div>
              </div>
            ) : null}
            <p className="start__subtitle pokedex__count">
              {captured} / {bundle.creatures.length} créatures attrapées
            </p>
          </SoftPanel>
        }
      />
    </PlayScreen>
  );
}

export function TypeChip({ type }: { type: CreatureType }) {
  return (
    <span className="type-chip" style={{ background: TYPE_COLORS[type] }}>
      {TYPE_LABELS[type]}
    </span>
  );
}
