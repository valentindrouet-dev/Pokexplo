import { useMemo } from 'react';
import {
  IconMap,
  LoadingBall,
  PrimaryButton,
  ProgressBar,
  SelectionTile,
  SoftPanel,
} from '../../ui';
import { chapterProgress, currentChapter, offerableQuests } from '../../game-engine';
import { useAutoVoice } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useNavigation } from '../../app/router';
import { PlayScreen } from '../play/PlayScreen';
import { ParentGate } from '../play/ParentGate';
import { Editable } from '../edit-mode/Editable';

/** Accueil : départ pleine largeur, puis six destinations carrées. */
function MenuIcon({ name }: { name: string }) {
  return <img className="center-hub__icon" src={`${import.meta.env.BASE_URL}images/menu/${name}.png`} alt="" aria-hidden="true" />;
}

export function CenterScreen() {
  const { navigate } = useNavigation();
  const { bundle, biome } = useContent();
  const { save, dispatch } = useGame();

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
      className="center-screen"
    >
      {/*
        Le Professeur ne prend plus la moitié de l'écran : sa mission se dit
        À LA VOIX, en arrivant (§192), et l'enfant la retrouve auprès de lui
        sur la carte. L'écran n'est plus qu'un départ et six destinations.
      */}
      <div className="center-menu">
        <PrimaryButton className="center-menu__adventure" large icon={<IconMap size={32} />} onClick={() => void leave()}>
          Partir à l’aventure !
        </PrimaryButton>
        <nav className="center-hub" aria-label="Menu principal">
          <SelectionTile className="center-hub__tile" label="Équipe" icon={<MenuIcon name="team" />} onClick={() => navigate({ name: 'team' })} />
          <SelectionTile className="center-hub__tile" label="Pokédex" icon={<MenuIcon name="pokedex" />} onClick={() => navigate({ name: 'pokedex' })} />
          <SelectionTile className="center-hub__tile" label="Objets" icon={<MenuIcon name="items" />} onClick={() => navigate({ name: 'items' })} />
          <SelectionTile className="center-hub__tile" label="Exercices" icon={<MenuIcon name="exercises" />} onClick={() => navigate({ name: 'practice' })} />
          <SelectionTile className="center-hub__tile" label="Carte" icon={<MenuIcon name="map" />} onClick={() => navigate({ name: 'map' })} />
          <ParentGate tileIcon={<MenuIcon name="parents" />} />
        </nav>
      </div>

      {/*
        La progression reste, mais discrète : le titre du chapitre et une jauge
        sans chiffre. Ce n'est pas un choix — rien n'appelle un geste — et
        c'est là que l'adulte modifie le chapitre en mode édition.
      */}
      {chapter ? (
        <SoftPanel padding="tight" tone="soft" className="center-chapter-panel">
          <Editable target={{ kind: 'chapter', id: chapter.id }} label="le chapitre">
            <div className="center-chapter">
              <p className="center-chapter__title">{chapter.title}</p>
              <ProgressBar value={progress} label={`Progression : ${chapter.title}`} />
            </div>
          </Editable>
        </SoftPanel>
      ) : null}



    </PlayScreen>
  );
}
