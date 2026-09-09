import { IconCheck, IconQuest, LoadingBall, ProgressBar, SoftPanel, VoiceButton } from '../../ui';
import { questTarget } from '../../game-engine';
import { useAudio } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { PlayScreen } from '../play/PlayScreen';
import { useScreenVoice } from '../../app/providers/useScreenVoice';
import { SCREEN_VOICES } from '../../content/voices';

/** QUETES (CONCEPTION §25) — objectifs courts, comprehensibles sans lire. */
export function QuestsScreen() {
  // §192 — l'écran dit ce qu'on peut y faire, à l'arrivée.
  useScreenVoice(SCREEN_VOICES.quests);
  const { bundle } = useContent();
  const { save } = useGame();
  const { speak, buttonState } = useAudio();

  if (!bundle || !save) {
    return (
      <PlayScreen>
        <LoadingBall />
      </PlayScreen>
    );
  }

  const quests = bundle.quests.filter((quest) => save.state.quests[quest.id]);

  return (
    <PlayScreen scrim="soft">
      <SoftPanel title="Tes quêtes" padding="roomy" fill>
        {quests.length === 0 ? (
          <p className="start__subtitle">
            Va voir le Professeur au Centre : il a sûrement une mission pour toi !
          </p>
        ) : (
          <div className="quests">
            {quests.map((quest) => {
              const progress = save.state.quests[quest.id];
              const target = progress?.target ?? questTarget(quest.objective);
              const value = progress?.progress ?? 0;
              const done = progress?.status === 'COMPLETED';
              return (
                <div key={quest.id} className="quest-row">
                  <VoiceButton
                    small
                    state={buttonState(done ? quest.completeVoiceId : quest.offerVoiceId)}
                    onPlay={() => speak(done ? quest.completeVoiceId : quest.offerVoiceId)}
                    label="Écouter la quête"
                  />
                  <div className="quest-row__body">
                    <span>{quest.title}</span>
                    <ProgressBar
                      value={target === 0 ? 0 : value / target}
                      tone={done ? 'nature' : 'navigation'}
                      label={quest.title}
                    />
                  </div>
                  <span className="quest-row__count">
                    {done ? <IconCheck size={34} /> : `${value} / ${target}`}
                  </span>
                  {done ? null : <IconQuest size={30} />}
                </div>
              );
            })}
          </div>
        )}
      </SoftPanel>
    </PlayScreen>
  );
}
