import { useState } from 'react';
import { PrimaryButton, SecondaryButton, SelectionTile, SoftPanel, LoadingBall, IconPlay } from '../../ui';
import { SceneBackground } from '../../components/SceneBackground';
import { useAudio } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useNavigation } from '../../app/router';
import './play.css';

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

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
  const [createError, setCreateError] = useState<string | null>(null);

  /**
   * Le deblocage audio doit partir DU geste (§64), mais la navigation ne
   * l'attend jamais : sur iPadOS, `play()` peut rester sans reponse, et
   * l'enfant se retrouverait devant un bouton qui ne fait rien.
   */
  const start = (): void => {
    void unlock();
    navigate({ name: 'center' });
  };

  const create = async (): Promise<void> => {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    void unlock();
    try {
      const created = await createProfile(nickname.trim() || 'Explorateur', 'explorer');
      if (!created) {
        setCreateError('L’aventure n’a pas pu démarrer. Essaie encore !');
        return;
      }
      navigate({ name: 'center' });
    } catch {
      setCreateError('L’aventure n’a pas pu démarrer. Essaie encore !');
    } finally {
      // Toujours relacher le bouton, meme en cas d'echec.
      setCreating(false);
    }
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
              <PrimaryButton large icon={<IconPlay size={32} />} onClick={start}>
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
              {createError ? <p className="start__subtitle">{createError}</p> : null}
            </>
          )}

          <SecondaryButton onClick={() => navigate({ name: 'parents' })}>
            Espace parents
          </SecondaryButton>

          {/*
            Repere de version : permet de verifier d'un coup d'œil, sur l'iPad,
            quelle build est reellement installee (le Service Worker pouvant
            servir une version precedente tant qu'elle n'a pas ete remplacee).
          */}
          <p className="start__version">Version {APP_VERSION}</p>
        </SoftPanel>
      </div>
    </div>
  );
}
