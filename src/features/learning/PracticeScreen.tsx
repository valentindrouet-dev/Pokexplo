import { useState } from 'react';
import type { ExerciseInstance } from '../../types';
import { generateExercise, selectTemplate } from '../../exercise-engine';
import { createRng, randomSeed } from '../../utils/rng';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useScreenVoice } from '../../app/providers/useScreenVoice';
import { SCREEN_VOICES } from '../../content/voices';
import { IconPencil, LoadingBall, PrimaryButton, SoftPanel } from '../../ui';
import { PlayScreen } from '../play/PlayScreen';
import { ExerciseView } from './ExerciseView';

/** Entraînement libre : réutilise les matrices et le niveau du profil. */
export function PracticeScreen() {
  const { bundle } = useContent();
  const { save } = useGame();
  const [instance, setInstance] = useState<ExerciseInstance | null>(null);
  const [finished, setFinished] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useScreenVoice(SCREEN_VOICES.practice, !instance);

  const next = (): void => {
    if (!bundle || !save) return;
    const seed = randomSeed();
    const template = selectTemplate({
      templates: bundle.exerciseTemplates,
      learning: save.learning,
      pack: bundle.curriculumPacks.find((pack) => pack.id === save.profile.packId) ?? null,
      recentTemplateIds: instance ? [instance.templateId] : [],
      rng: createRng(seed),
    });
    if (!template || bundle.creatures.length === 0) {
      setUnavailable(true);
      return;
    }
    try {
      const exercise = generateExercise(template, seed, {
        creatures: bundle.creatures,
        capturedIds: Object.values(save.pokedex).filter((entry) => entry.state === 'CAPTURED').map((entry) => entry.creatureId),
      });
      setInstance(exercise);
      setFinished(false);
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    }
  };

  if (!bundle || !save) return <PlayScreen><LoadingBall /></PlayScreen>;

  return (
    <PlayScreen scrim="soft">
      {instance && !finished ? (
        <SoftPanel padding="roomy" className="encounter">
          <ExerciseView key={instance.id} instance={instance} onSolved={() => setFinished(true)} />
        </SoftPanel>
      ) : (
        <SoftPanel title={finished ? 'Bravo !' : 'Exercices'} padding="roomy">
          <p>{unavailable ? 'Aucun exercice disponible pour le moment.' : 'Entraîne-toi à ton rythme !'}</p>
          <PrimaryButton large icon={<IconPencil size={32} />} onClick={next}>
            {finished ? 'Encore un exercice !' : 'Commencer'}
          </PrimaryButton>
        </SoftPanel>
      )}
    </PlayScreen>
  );
}
