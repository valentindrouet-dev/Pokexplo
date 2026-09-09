import { useMemo, useState } from 'react';
import { MAX_TEAM_SIZE } from '../../game-engine';
import { CreatureCard, LoadingBall, PrimaryButton, SoftPanel, TwoPaneLayout } from '../../ui';
import { CreatureSprite } from '../../components/CreatureSprite';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { PlayScreen } from '../play/PlayScreen';
import { TypeChip } from '../pokedex/PokedexScreen';

/**
 * EQUIPE (CONCEPTION §20).
 * Six creatures maximum. Ajouter / retirer / remplacer, sans aucune
 * statistique complexe.
 */
export function TeamScreen() {
  const { bundle, creature } = useContent();
  const { save, dispatch } = useGame();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const collection = useMemo(() => {
    if (!bundle || !save) return [];
    return bundle.creatures.filter((item) => save.pokedex[item.id]?.state === 'CAPTURED');
  }, [bundle, save]);

  if (!bundle || !save) {
    return (
      <PlayScreen>
        <LoadingBall />
      </PlayScreen>
    );
  }

  const team = save.state.team;
  const selected = creature(selectedId ?? undefined);
  const inTeam = selected ? team.includes(selected.id) : false;

  const toggle = async (): Promise<void> => {
    if (!selected) return;
    const next = inTeam
      ? team.filter((id) => id !== selected.id)
      : [...team, selected.id].slice(0, MAX_TEAM_SIZE);
    await dispatch({ kind: 'TEAM_SET', team: next });
  };

  return (
    <PlayScreen
      scrim="soft"
      action={
        selected ? (
          <PrimaryButton large disabled={!inTeam && team.length >= MAX_TEAM_SIZE} onClick={() => void toggle()}>
            {inTeam ? 'Retirer de l’équipe' : 'Mettre dans l’équipe'}
          </PrimaryButton>
        ) : null
      }
    >
      <TwoPaneLayout
        leftLabel="Ton équipe"
        rightLabel="Ta collection"
        left={
          <SoftPanel title="Ton équipe" padding="tight" fill className="ds-scroll">
            <div className="team__slots">
              {Array.from({ length: MAX_TEAM_SIZE }, (_, index) => {
                const member = creature(team[index]);
                if (!member) {
                  return (
                    <div key={index} className="team__empty">
                      +
                    </div>
                  );
                }
                return (
                  <CreatureCard
                    key={member.id}
                    name={member.name}
                    selected={selected?.id === member.id}
                    onSelect={() => setSelectedId(member.id)}
                    media={<CreatureSprite creature={member} size={80} />}
                  />
                );
              })}
            </div>
            {selected ? (
              <div className="pokedex__meta">
                <TypeChip type={selected.type1} />
                {selected.type2 ? <TypeChip type={selected.type2} /> : null}
              </div>
            ) : null}
          </SoftPanel>
        }
        right={
          <SoftPanel title="Ta collection" padding="tight" fill>
            {collection.length === 0 ? (
              <p className="start__subtitle">Attrape ta première créature dans la prairie !</p>
            ) : (
              <div className="pokedex__grid">
                {collection.map((item) => (
                  <CreatureCard
                    key={item.id}
                    name={item.name}
                    selected={selected?.id === item.id}
                    onSelect={() => setSelectedId(item.id)}
                    media={<CreatureSprite creature={item} size={84} />}
                    footer={
                      team.includes(item.id) ? (
                        <span className="ds-creature-card__name">Dans l’équipe</span>
                      ) : null
                    }
                  />
                ))}
              </div>
            )}
          </SoftPanel>
        }
      />
    </PlayScreen>
  );
}
