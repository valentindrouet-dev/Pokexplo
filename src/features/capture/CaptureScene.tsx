import { useEffect, useState } from 'react';
import type { Creature } from '../../types';
import { IconBall, PrimaryButton, SoftPanel, VoiceButton } from '../../ui';
import { CreatureSprite } from '../../components/CreatureSprite';
import { useAudio } from '../../app/providers/AudioProvider';
import { RARITY_LABELS } from '../../types/content';

export interface CaptureSceneProps {
  creature: Creature;
  /** Deja capturee auparavant : on ne re-annonce pas « nouvelle créature ». */
  alreadyKnown: boolean;
  onDone: () => void;
}

const THROW_MS = 1800;

/**
 * CAPTURE (CONCEPTION §15).
 * Rapide et gratifiante : Ball -> animation -> quelques mouvements -> capture
 * -> revelation Pokedex.
 */
export function CaptureScene({ creature, alreadyKnown, onDone }: CaptureSceneProps) {
  const [phase, setPhase] = useState<'throw' | 'reveal'>('throw');
  const { speak, buttonState } = useAudio();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPhase('reveal');
      speak(alreadyKnown ? creature.nameVoiceId : 'voice.ui.captured');
    }, THROW_MS);
    return () => window.clearTimeout(timer);
  }, [alreadyKnown, creature.nameVoiceId, speak]);

  return (
    <SoftPanel padding="roomy" animated>
      <div className="capture">
        {phase === 'throw' ? (
          <>
            <IconBall size={120} className="capture__ball capture__ball--throw" />
            <p className="exercise__question">Attrape-la !</p>
          </>
        ) : (
          <div className="capture__reveal">
            <CreatureSprite creature={creature} size={220} animated />
            <p className="pokedex__name">{creature.name}</p>
            <p className="start__subtitle">
              {alreadyKnown ? 'Encore une !' : `Nouvelle créature — ${RARITY_LABELS[creature.rarity]}`}
            </p>
            <div className="ds-row">
              <VoiceButton
                state={buttonState(creature.nameVoiceId)}
                onPlay={() => speak(creature.nameVoiceId)}
                label={`Écouter le nom : ${creature.name}`}
              />
              <PrimaryButton large onClick={onDone}>
                Continuer
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </SoftPanel>
  );
}
