import { useMemo } from 'react';
import { MAX_TEAM_SIZE } from '../../game-engine';
import { CreatureCard, IconBall, IconCheck, LoadingBall, SoftPanel } from '../../ui';
import { CreatureSprite } from '../../components/CreatureSprite';
import { useAudio } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useScreenVoice } from '../../app/providers/useScreenVoice';
import { SCREEN_VOICES } from '../../content/voices';
import { PlayScreen } from '../play/PlayScreen';

/**
 * ÉQUIPE (CONCEPTION §20, UI_DESIGN §190-192).
 *
 * C'était deux panneaux — « Ton équipe » et « Ta collection » — plus une
 * sélection, plus un bouton « Mettre dans l'équipe / Retirer de l'équipe » en
 * bas de l'écran. Trois idées à relier avant le premier geste.
 *
 * Désormais : l'équipe en haut, la collection en dessous, et **un seul
 * geste**. Toucher une créature l'emmène ; la retoucher la laisse à la
 * maison. Chaque geste dit le nom de la créature (§192).
 */
export function TeamScreen() {
  // §192 — l'écran dit ce qu'on peut y faire, à l'arrivée.
  useScreenVoice(SCREEN_VOICES.team);
  const { bundle, creature } = useContent();
  const { save, dispatch } = useGame();
  const { speak } = useAudio();

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
  const full = team.length >= MAX_TEAM_SIZE;

  /**
   * Un seul geste : dedans, dehors.
   *
   * L'équipe est pleine ? On ne bloque pas en silence — on le dit à la voix,
   * qui est le seul canal que l'enfant comprend à coup sûr (§192).
   */
  const toggle = async (creatureId: string): Promise<void> => {
    const inTeam = team.includes(creatureId);
    const named = creature(creatureId);
    if (!inTeam && full) {
      speak('voice.ui.team.full');
      return;
    }
    speak(named?.nameVoiceId);
    await dispatch({
      kind: 'TEAM_SET',
      team: inTeam ? team.filter((id) => id !== creatureId) : [...team, creatureId],
    });
  };

  return (
    <PlayScreen scrim="soft">
      {/* L'équipe : six places, toujours visibles, même vides. */}
      <SoftPanel padding="tight" tone="soft" className="team">
        <div className="team__slots" data-choice-group="équipe" role="group" aria-label="Ton équipe">
          {Array.from({ length: MAX_TEAM_SIZE }, (_, index) => {
            const member = creature(team[index]);
            if (!member) {
              return (
                <span key={index} className="team__empty" aria-label="Place libre">
                  <IconBall size={44} />
                </span>
              );
            }
            return (
              <button
                key={member.id}
                type="button"
                className="ds-tap team__member"
                aria-label={`${member.name} — dans ton équipe. Touche pour le laisser à la maison.`}
                onClick={() => void toggle(member.id)}
              >
                <CreatureSprite creature={member} size={72} />
                <span className="ds-creature-card__name">{member.name}</span>
              </button>
            );
          })}
        </div>
      </SoftPanel>

      <SoftPanel padding="tight" fill className="pokedex">
        {collection.length === 0 ? (
          /* Un écran vide n'est pas une erreur : on dit quoi faire, au milieu. */
          <div className="collection-empty">
            <IconBall size={96} />
            <p className="start__subtitle">Attrape ta première créature dans la prairie !</p>
          </div>
        ) : (
          <div className="pokedex__grid" data-choice-group="collection">
            {collection.map((item) => {
              const inTeam = team.includes(item.id);
              return (
                <CreatureCard
                  key={item.id}
                  name={item.name}
                  selected={inTeam}
                  onSelect={() => void toggle(item.id)}
                  media={<CreatureSprite creature={item} size={92} />}
                  footer={
                    /*
                      Une coche, pas seulement une couleur : la sélection doit
                      se voir autrement (CLAUDE.md §4, §142).
                    */
                    inTeam ? (
                      <span className="team__mark" aria-hidden="true">
                        <IconCheck size={24} />
                      </span>
                    ) : null
                  }
                />
              );
            })}
          </div>
        )}
      </SoftPanel>
    </PlayScreen>
  );
}
