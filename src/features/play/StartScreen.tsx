import { useState } from 'react';
import { PrimaryButton, SecondaryButton, SelectionTile, SoftPanel, LoadingBall, IconPlay } from '../../ui';
import { SceneBackground } from '../../components/SceneBackground';
import { useAudio } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useNavigation } from '../../app/router';
import './play.css';

/**
 * ECRAN D'ACCUEIL (CONCEPTION §64).
 *
 * Ce premier toucher est INDISPENSABLE : c'est lui qui debloque le contexte
 * audio de Safari/iPad. Sans lui, aucune voix ne pourrait etre jouee
 * automatiquement ensuite.
 */
export function StartScreen() {
  const { navigate } = useNavigation();
  const { unlock } = useAudio();
  const { biome, loading, error, reload } = useContent();
  const { save, profiles, ready, createProfile, selectProfile } = useGame();
  const [nickname, setNickname] = useState('');
  const [creating, setCreating] = useState(false);

  const start = async (): Promise<void> => {
    // Le deblocage audio DOIT se produire dans le geste de l'utilisateur.
    await unlock();
    navigate({ name: 'center' });
  };

  const create = async (): Promise<void> => {
    setCreating(true);
    await unlock();
    await createProfile(nickname.trim() || 'Explorateur', 'explorer');
    setCreating(false);
    navigate({ name: 'center' });
  };

  // Le contenu n'a pas pu etre charge : on ne laisse jamais l'enfant devant un
  // ecran de chargement sans fin (§175). Une action simple, et c'est reparti.
  if (error) {
    return (
      <div className="play">
        <SceneBackground biome={biome('centre')} scrim="light" />
        <div className="play__content start">
          <SoftPanel padding="roomy" className="start__panel">
            <p className="start__title">Oups !</p>
            <p className="start__subtitle">L’aventure n’a pas réussi à s’ouvrir.</p>
            <PrimaryButton large icon={<IconPlay size={32} />} onClick={() => void reload()}>
              Réessayer
            </PrimaryButton>
          </SoftPanel>
        </div>
      </div>
    );
  }

  if (loading || !ready) {
    return (
      <div className="play">
        <SceneBackground biome={biome('centre')} scrim="light" />
        <div className="play__content start">
          <LoadingBall message="On prépare l’aventure…" />
        </div>
      </div>
    );
  }

  return (
    <div className="play">
      <SceneBackground biome={biome('centre')} scrim="light" />
      <div className="play__content start">
        <SoftPanel padding="roomy" animated className="start__panel">
          <h1 className="start__title">Pokexplo</h1>
          <p className="start__subtitle">Une aventure pour apprendre en s’amusant</p>

          {save ? (
            <>
              <PrimaryButton large icon={<IconPlay size={32} />} onClick={() => void start()}>
                Commencer l’aventure
              </PrimaryButton>
              {profiles.length > 1 ? (
                <div className="start__profiles">
                  {profiles.map((profile) => (
                    <SelectionTile
                      key={profile.profile.id}
                      label={profile.profile.nickname}
                      selected={profile.profile.id === save.profile.id}
                      onClick={() => void selectProfile(profile.profile.id)}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <label className="start__subtitle" htmlFor="nickname">
                Comment t’appelles-tu ?
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
              <PrimaryButton
                large
                icon={<IconPlay size={32} />}
                disabled={creating}
                onClick={() => void create()}
              >
                Commencer l’aventure
              </PrimaryButton>
            </>
          )}

          <SecondaryButton onClick={() => (window.location.hash = '#/parents')}>
            Espace parents
          </SecondaryButton>
        </SoftPanel>
      </div>
    </div>
  );
}
