import { useMemo } from 'react';
import {
  DialogCard,
  IconBadge,
  IconMap,
  IconPokedex,
  IconProfessor,
  IconTeam,
  LoadingBall,
  PrimaryButton,
  ProgressBar,
  SelectionTile,
  SoftPanel,
  VoiceButton,
} from '../../ui';
import { chapterProgress, currentChapter, offerableQuests } from '../../game-engine';
import { useAudio, useAutoVoice } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useNavigation } from '../../app/router';
import { PlayScreen } from '../play/PlayScreen';
import { ParentGate } from '../play/ParentGate';
import { Editable } from '../edit-mode/Editable';

/**
 * CENTRE POKÉMON (CONCEPTION §8, UI_DESIGN §190).
 *
 * C'est le hub. Il en présentait trop : progression chiffrée, créatures,
 * badges, meneur d'équipe, six tuiles, et DEUX chemins vers l'aventure — la
 * tuile « Aventure » et le bouton « Partir ! ».
 *
 * Il tient maintenant en quatre choix, dont un seul est l'action principale :
 *
 *   le Professeur dit quoi faire  →  PARTIR !
 *   puis, plus bas : Pokédex · Équipe · Badges
 *
 * Les quêtes ne sont plus une destination : ce sont les missions que donne le
 * Professeur, là où l'enfant les entend.
 */
export function CenterScreen() {
  const { navigate } = useNavigation();
  const { bundle, biome } = useContent();
  const { save, dispatch } = useGame();
  const { speak, buttonState } = useAudio();

  const chapter = useMemo(
    () => (bundle && save ? currentChapter(save, bundle) : null),
    [bundle, save],
  );

  const objective = useMemo(() => {
    if (!bundle || !save) return null;
    return offerableQuests(save, bundle)[0] ?? null;
  }, [bundle, save]);

  const professorVoiceId = save?.state.adventureCompleted
    ? 'voice.chapter.1.outro'
    : (objective?.offerVoiceId ?? 'voice.professor.welcome');

  // Le Professeur parle en arrivant : c'est LUI la consigne de l'écran (§192).
  useAutoVoice(professorVoiceId);

  if (!bundle || !save) {
    return (
      <PlayScreen backTo={null}>
        <LoadingBall />
      </PlayScreen>
    );
  }

  const progress = chapter ? chapterProgress(chapter, save) : 0;
  const said = save.state.adventureCompleted
    ? 'Tu as gagné ton premier badge ! Continue d’explorer si tu veux.'
    : (objective?.title ?? 'Va explorer la prairie et attrape une créature !');

  /**
   * PARTIR accepte la mission au passage.
   *
   * Le Professeur proposait « J'y vais ! » et le bandeau « Partir ! » : deux
   * boutons, une seule destination (§190). L'enfant n'a plus qu'un geste, et
   * la quête est acceptée pour lui — c'est ce qu'il vient d'entendre.
   */
  const leave = async (): Promise<void> => {
    if (objective) await dispatch({ kind: 'QUEST_ACCEPT', questId: objective.id });
    navigate({ name: 'map' });
  };

  return (
    <PlayScreen
      biome={biome('centre')}
      backTo={null}
      scrim="light"
      action={
        <PrimaryButton large icon={<IconMap size={30} />} onClick={() => void leave()}>
          Partir !
        </PrimaryButton>
      }
    >
      {/*
        Le Professeur EST le haut de l'écran : sa phrase remplace le titre de
        chapitre, les compteurs et la tuile « Professeur ».
      */}
      <Editable
        target={objective ? { kind: 'quest', id: objective.id } : { kind: 'chapter', id: chapter?.id ?? '' }}
        label="ce que dit le Professeur"
      >
        <DialogCard
          speaker="Professeur"
          portrait={<IconProfessor size={72} />}
          text={said}
          voiceButton={
            <VoiceButton
              state={buttonState(professorVoiceId)}
              onPlay={() => speak(professorVoiceId)}
              label="Réécouter le Professeur"
            />
          }
        />
      </Editable>

      {/* Trois destinations, et rien d'autre. */}
      <div className="center-hub">
        <SelectionTile
          className="center-hub__tile"
          label="Pokédex"
          icon={<IconPokedex size={56} />}
          onClick={() => navigate({ name: 'pokedex' })}
        />
        <SelectionTile
          className="center-hub__tile"
          label="Équipe"
          icon={<IconTeam size={56} />}
          onClick={() => navigate({ name: 'team' })}
        />
        <SelectionTile
          className="center-hub__tile"
          label="Badges"
          icon={<IconBadge size={56} />}
          onClick={() => navigate({ name: 'badges' })}
        />
      </div>

      {/*
        La progression reste, mais discrète : le titre du chapitre et une jauge
        sans chiffre. Ce n'est pas un choix — rien n'appelle un geste — et
        c'est là que l'adulte modifie le chapitre en mode édition.
      */}
      {chapter ? (
        <SoftPanel padding="tight" tone="soft">
          <Editable target={{ kind: 'chapter', id: chapter.id }} label="le chapitre">
            <div className="center-chapter">
              <p className="center-chapter__title">{chapter.title}</p>
              <ProgressBar value={progress} label={`Progression : ${chapter.title}`} />
            </div>
          </Editable>
        </SoftPanel>
      ) : null}


      <ParentGate />
    </PlayScreen>
  );
}
