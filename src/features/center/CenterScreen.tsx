import { useMemo, useState } from 'react';
import {
  BadgeChip,
  DialogCard,
  IconBadge,
  IconMap,
  IconPokedex,
  IconProfessor,
  IconQuest,
  IconTeam,
  LoadingBall,
  PrimaryButton,
  ProgressBar,
  SelectionTile,
  SoftPanel,
  VoiceButton,
} from '../../ui';
import { chapterProgress, currentChapter, offerableQuests } from '../../game-engine';
import { CreatureSprite } from '../../components/CreatureSprite';
import { useAudio, useAutoVoice } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useNavigation } from '../../app/router';
import { PlayScreen } from '../play/PlayScreen';

/**
 * CENTRE POKEMON (CONCEPTION §8).
 *
 * C'est le hub : il remplace les menus traditionnels. Cinq destinations
 * maximum, en tres grandes tuiles, plus une phrase du Professeur.
 */
export function CenterScreen() {
  const { navigate } = useNavigation();
  const { bundle, biome, creature } = useContent();
  const { save, dispatch } = useGame();
  const { speak, buttonState } = useAudio();
  const [professorOpen, setProfessorOpen] = useState(false);

  const chapter = useMemo(
    () => (bundle && save ? currentChapter(save, bundle) : null),
    [bundle, save],
  );

  const objective = useMemo(() => {
    if (!bundle || !save) return null;
    const pending = offerableQuests(save, bundle);
    return pending[0] ?? null;
  }, [bundle, save]);

  const professorVoiceId = save?.state.adventureCompleted
    ? 'voice.chapter.1.outro'
    : (objective?.offerVoiceId ?? 'voice.professor.welcome');

  useAutoVoice(professorVoiceId, professorOpen);

  if (!bundle || !save) {
    return (
      <PlayScreen backTo={null}>
        <LoadingBall />
      </PlayScreen>
    );
  }

  const captured = Object.values(save.pokedex).filter((entry) => entry.state === 'CAPTURED').length;
  const teamLead = creature(save.state.team[0]);
  const progress = chapter ? chapterProgress(chapter, save) : 0;

  const acceptQuest = async (): Promise<void> => {
    if (objective) await dispatch({ kind: 'QUEST_ACCEPT', questId: objective.id });
    setProfessorOpen(false);
    navigate({ name: 'map' });
  };

  return (
    <PlayScreen
      biome={biome('centre')}
      backTo={null}
      scrim="light"
      extraLeft={
        <VoiceButton
          state={buttonState(professorVoiceId)}
          onPlay={() => speak(professorVoiceId)}
          label="Écouter le Professeur"
        />
      }
      action={
        <PrimaryButton large icon={<IconMap size={30} />} onClick={() => navigate({ name: 'map' })}>
          Partir !
        </PrimaryButton>
      }
    >
      <SoftPanel padding="tight" tone="soft">
        <div className="center-chapter">
          <p className="center-chapter__title">{chapter?.title ?? 'Ton aventure'}</p>
          <ProgressBar value={progress} label="Progression du chapitre" />
          <div className="ds-row">
            <BadgeChip icon={<IconPokedex size={22} />}>{captured} créatures</BadgeChip>
            <BadgeChip icon={<IconBadge size={22} />}>{save.state.badges.length} badge(s)</BadgeChip>
            {teamLead ? (
              <BadgeChip icon={<CreatureSprite creature={teamLead} size={26} />}>
                {teamLead.name}
              </BadgeChip>
            ) : null}
          </div>
        </div>
      </SoftPanel>

      <div className="center-hub">
        <SelectionTile
          className="center-hub__tile"
          label="Aventure"
          icon={<IconMap size={52} />}
          onClick={() => navigate({ name: 'map' })}
        />
        <SelectionTile
          className="center-hub__tile"
          label="Équipe"
          icon={<IconTeam size={52} />}
          onClick={() => navigate({ name: 'team' })}
        />
        <SelectionTile
          className="center-hub__tile"
          label="Pokédex"
          icon={<IconPokedex size={52} />}
          onClick={() => navigate({ name: 'pokedex' })}
        />
        <SelectionTile
          className="center-hub__tile"
          label="Badges"
          icon={<IconBadge size={52} />}
          onClick={() => navigate({ name: 'badges' })}
        />
        <SelectionTile
          className="center-hub__tile"
          label="Quêtes"
          icon={<IconQuest size={52} />}
          onClick={() => navigate({ name: 'quests' })}
        />
        <SelectionTile
          className="center-hub__tile"
          label="Professeur"
          icon={<IconProfessor size={52} />}
          onClick={() => setProfessorOpen(true)}
        />
      </div>

      {professorOpen ? (
        <DialogCard
          speaker="Professeur"
          portrait={<IconProfessor size={72} />}
          text={
            save.state.adventureCompleted
              ? 'Tu as gagné ton premier badge ! Continue d’explorer si tu veux.'
              : (objective?.title ?? 'Va explorer la prairie et attrape une créature !')
          }
          voiceButton={
            <VoiceButton
              state={buttonState(professorVoiceId)}
              onPlay={() => speak(professorVoiceId)}
              label="Réécouter"
            />
          }
          action={
            <PrimaryButton large onClick={() => void acceptQuest()}>
              J’y vais !
            </PrimaryButton>
          }
        />
      ) : null}
    </PlayScreen>
  );
}
