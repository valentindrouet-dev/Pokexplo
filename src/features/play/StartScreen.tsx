import { useState } from 'react';
import { LoadingBall, PrimaryButton, SecondaryButton, SoftPanel } from '../../ui';
import { SceneBackground } from '../../components/SceneBackground';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { useAudio } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useNavigation } from '../../app/router';
import { ParentGate } from './ParentGate';
import './play.css';

/**
 * ÉCRAN D'ACCUEIL (CONCEPTION §64, UI_DESIGN §190).
 *
 * Ce premier toucher est INDISPENSABLE : c'est lui qui débloque le contexte
 * audio de Safari/iPad. Sans lui, aucune voix ne pourrait être jouée
 * automatiquement ensuite.
 *
 * Ce n'était pas l'écran de l'enfant : champ de saisie du prénom, « Espace
 * parents », numéro de version. Un enfant de cinq ans y voit maintenant sa
 * frimousse, son prénom, et un seul bouton — ou, s'ils sont plusieurs, la
 * question « Qui joue ? ». Créer un profil est une opération d'adulte : elle
 * n'apparaît que lorsqu'il n'y en a aucun.
 */
export function StartScreen() {
  const { navigate } = useNavigation();
  const { unlock } = useAudio();
  const { biome, loading, error, reload } = useContent();
  const { save, profiles, ready, selectProfile } = useGame();

  /**
   * Le déblocage audio doit partir DU geste (§64), mais la navigation ne
   * l'attend jamais : sur iPadOS, `play()` peut rester sans réponse, et
   * l'enfant se retrouverait devant un bouton qui ne fait rien.
   */
  const play = (profileId?: string): void => {
    void unlock();
    if (profileId && profileId !== save?.profile.id) void selectProfile(profileId);
    navigate({ name: 'center' });
  };

  // Le contenu n'a pas pu être chargé : on ne laisse jamais l'enfant devant un
  // écran de chargement sans fin (§175). Une action simple, et c'est reparti.
  if (error) {
    return (
      <Shell biome={biome('centre')}>
        <p className="start__title">Oups !</p>
        <p className="start__subtitle">L’aventure n’a pas réussi à s’ouvrir.</p>
        <PrimaryButton large onClick={() => void reload()}>
          Réessayer
        </PrimaryButton>
      </Shell>
    );
  }

  if (loading || !ready) {
    return (
      <Shell biome={biome('centre')}>
        <LoadingBall message="On prépare l’aventure…" />
      </Shell>
    );
  }

  // Aucun profil : c'est une installation neuve, et c'est un adulte qui est là.
  if (!save) return <FirstProfile />;

  // Plusieurs enfants : une seule question, et de très grands visages.
  if (profiles.length > 1) {
    return (
      <Shell biome={biome('centre')} wide>
        <h1 className="start__title">Qui joue ?</h1>
        <div className="start__players">
          {profiles.map((profile) => (
            <button
              key={profile.profile.id}
              type="button"
              className="ds-tap start__player"
              onClick={() => play(profile.profile.id)}
            >
              <PlayerAvatar seed={profile.profile.id} size={132} />
              <span className="start__player-name">{profile.profile.nickname}</span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  return (
    <Shell biome={biome('centre')}>
      <h1 className="start__title">Pokexplo</h1>
      <PlayerAvatar seed={save.profile.id} size={148} />
      <p className="start__player-name">{save.profile.nickname}</p>
      <PrimaryButton large onClick={() => play()}>
        Jouer !
      </PrimaryButton>
    </Shell>
  );
}

/**
 * Ossature commune. Le cadenas parental y est posé une fois pour toutes : hors
 * du panneau, dans un coin, où il ne dispute rien à l'action principale.
 */
function Shell({
  children,
  biome,
  wide = false,
}: {
  children: React.ReactNode;
  biome: ReturnType<ReturnType<typeof useContent>['biome']>;
  wide?: boolean;
}) {
  return (
    <div className="play">
      <SceneBackground biome={biome} scrim="light" />
      <div className="play__content start">
        <SoftPanel padding="roomy" animated className={wide ? 'start__panel start__panel--wide' : 'start__panel'}>
          {children}
        </SoftPanel>
      </div>
      <ParentGate />
    </div>
  );
}

/**
 * PREMIER LANCEMENT — écran d'adulte assumé.
 *
 * Créer un profil demande d'écrire un prénom : ce n'est pas un geste d'enfant
 * de cinq ans. On le dit franchement plutôt que de déguiser un formulaire en
 * écran de jeu.
 */
function FirstProfile() {
  const { navigate } = useNavigation();
  const { unlock } = useAudio();
  const { biome } = useContent();
  const { createProfile } = useGame();
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const create = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    void unlock();
    try {
      const created = await createProfile(nickname.trim() || 'Explorateur', 'explorer');
      if (!created) setFailed(true);
      else navigate({ name: 'center' });
    } catch {
      setFailed(true);
    } finally {
      // Toujours relâcher le bouton, même en cas d'échec.
      setBusy(false);
    }
  };

  return (
    <Shell biome={biome('centre')}>
      <h1 className="start__title">Pokexplo</h1>
      <p className="start__subtitle">
        Bonjour ! Créons le profil de votre enfant — c’est la seule étape qui vous demande d’écrire.
      </p>
      <label className="start__subtitle" htmlFor="nickname">
        Son prénom
      </label>
      <input
        id="nickname"
        className="start__field"
        value={nickname}
        maxLength={16}
        autoComplete="off"
        onChange={(event) => setNickname(event.target.value)}
        placeholder="Ton prénom"
      />
      <PrimaryButton large disabled={busy} onClick={() => void create()}>
        Commencer l’aventure
      </PrimaryButton>
      {failed ? <p className="start__subtitle">L’aventure n’a pas pu démarrer. Essayez encore.</p> : null}
      <SecondaryButton onClick={() => navigate({ name: 'parents' })}>Espace parents</SecondaryButton>
    </Shell>
  );
}
