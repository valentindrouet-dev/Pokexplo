import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActiveEncounter, Creature, ExerciseInstance } from '../../types';
import { generateExercise } from '../../exercise-engine';
import { prepareEncounter } from '../../game-engine';
import { createRng, randomSeed } from '../../utils/rng';
import { LoadingBall, PrimaryButton, SoftPanel, VoiceButton } from '../../ui';
import { CreatureSprite } from '../../components/CreatureSprite';
import { useAudio } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useNavigation } from '../../app/router';
import { ExerciseView } from '../learning/ExerciseView';
import { PlayScreen } from '../play/PlayScreen';
import { CaptureScene } from '../capture/CaptureScene';

type Phase = 'intro' | 'exercise' | 'capture';

/**
 * RENCONTRE (CONCEPTION §13).
 *
 * apparition -> animation -> phrase vocale -> exercice -> reponse -> aide ->
 * reussite -> capture. Par defaut : exercice reussi = capture reussie.
 *
 * La rencontre est PERSISTEE (creature + matrice + seed) : si l'application se
 * ferme, elle reprend a l'identique (§33).
 */
export function EncounterScreen({ nodeId }: { nodeId: string }) {
  const { navigate } = useNavigation();
  const { bundle, biome, creature: creatureById } = useContent();
  const { save, dispatch } = useGame();
  const { speak, buttonState } = useAudio();
  const [phase, setPhase] = useState<Phase>('intro');
  const [preparing, setPreparing] = useState(false);

  const node = bundle?.nodes.find((item) => item.id === nodeId) ?? null;
  const active: ActiveEncounter | null =
    save?.state.activeEncounter?.nodeId === nodeId ? save.state.activeEncounter : null;

  const special = useMemo(() => {
    if (!bundle || !node?.specialEncounterId || !save) return null;
    const found = bundle.specialEncounters.find((item) => item.id === node.specialEncounterId);
    if (!found) return null;
    return save.pokedex[found.creatureId]?.state === 'CAPTURED' ? null : found;
  }, [bundle, node?.specialEncounterId, save]);

  // Preparation de la rencontre : une seule fois par visite.
  useEffect(() => {
    if (!bundle || !save || !node || active || preparing) return;
    setPreparing(true);

    void (async () => {
      const rng = createRng(randomSeed());
      const draft = prepareEncounter(node, bundle, save, save.learning, rng, {
        ...(special ? { creatureId: special.creatureId } : {}),
        ...(special ? { templateIds: special.exerciseTemplateIds } : {}),
      });

      if (!draft) {
        navigate({ name: 'map' });
        return;
      }

      const encounter: ActiveEncounter = {
        encounterId: `${node.id}:${draft.seed}`,
        nodeId: node.id,
        creatureId: draft.creatureId,
        templateId: draft.templateId,
        seed: draft.seed,
        attempts: 0,
        startedAt: Date.now(),
      };

      await dispatch({ kind: 'ENCOUNTER_START', encounter });
      await dispatch({ kind: 'CREATURE_SEEN', creatureId: draft.creatureId });
      setPreparing(false);
    })();
  }, [bundle, save, node, active, preparing, special, dispatch, navigate]);

  const creature: Creature | null = creatureById(active?.creatureId);

  const instance: ExerciseInstance | null = useMemo(() => {
    if (!bundle || !save || !active) return null;
    const template = bundle.exerciseTemplates.find((item) => item.id === active.templateId);
    if (!template) return null;
    return generateExercise(template, active.seed, {
      creatures: bundle.creatures,
      capturedIds: Object.values(save.pokedex)
        .filter((entry) => entry.state === 'CAPTURED')
        .map((entry) => entry.creatureId),
      ...(node?.biomeId ? { biomeId: node.biomeId } : {}),
    });
  }, [bundle, save, active, node?.biomeId]);

  const onSolved = useCallback(
    async (result: { attempts: number; outcome: 'FIRST_TRY' | 'ASSISTED' | 'FAILED'; durationMs: number }) => {
      if (!instance) return;
      await dispatch({
        kind: 'EXERCISE_RESULT',
        result: {
          instanceId: instance.id,
          templateId: instance.templateId,
          skillId: instance.skillId,
          difficulty: instance.difficulty,
          attempts: result.attempts,
          outcome: result.outcome,
          durationMs: result.durationMs,
          at: Date.now(),
        },
      });
      setPhase('capture');
    },
    [dispatch, instance],
  );

  const finishCapture = useCallback(async () => {
    if (!active || !node) return;
    await dispatch({ kind: 'CAPTURE', creatureId: active.creatureId });
    await dispatch({ kind: 'NODE_COMPLETED', nodeId: node.id });
    await dispatch({ kind: 'ENCOUNTER_END' });
    navigate({ name: 'map' });
  }, [active, node, dispatch, navigate]);

  if (!bundle || !save || !node) {
    return (
      <PlayScreen backTo={{ name: 'map' }}>
        <LoadingBall />
      </PlayScreen>
    );
  }

  if (!active || !creature || !instance) {
    return (
      <PlayScreen backTo={{ name: 'map' }} biome={biome(node.biomeId)}>
        <LoadingBall message="Une créature approche…" />
      </PlayScreen>
    );
  }

  const alreadyKnown = (save.pokedex[creature.id]?.captureCount ?? 0) > 0;
  const announceVoiceId = special?.announceVoiceId ?? node.arrivalVoiceId;

  return (
    <PlayScreen
      biome={biome(node.biomeId)}
      backTo={phase === 'capture' ? null : { name: 'map' }}
      backLabel="Revenir à la carte"
      scrim="light"
      extraLeft={
        phase === 'intro' && announceVoiceId ? (
          <VoiceButton
            state={buttonState(announceVoiceId)}
            onPlay={() => speak(announceVoiceId)}
            label="Réécouter"
          />
        ) : null
      }
    >
      {phase === 'intro' ? (
        <SoftPanel padding="roomy" animated>
          <div className="encounter__creature">
            <CreatureSprite creature={creature} size={220} animated />
            <p className="encounter__name">
              {special ? <span className="encounter__rare">Une créature rare ! </span> : null}
              Une créature apparaît !
            </p>
            <PrimaryButton large onClick={() => setPhase('exercise')}>
              Relever le défi !
            </PrimaryButton>
          </div>
        </SoftPanel>
      ) : null}

      {phase === 'exercise' ? (
        <SoftPanel padding="roomy" className="encounter" animated>
          <ExerciseView
            instance={instance}
            header={
              <div className="encounter__creature">
                <CreatureSprite creature={creature} size={88} animated />
              </div>
            }
            onAttempt={(_correct, attempts) => {
              void dispatch({ kind: 'ENCOUNTER_ATTEMPT', attempts });
            }}
            onSolved={(result) => void onSolved(result)}
          />
        </SoftPanel>
      ) : null}

      {phase === 'capture' ? (
        <CaptureScene
          creature={creature}
          alreadyKnown={alreadyKnown}
          onDone={() => void finishCapture()}
        />
      ) : null}
    </PlayScreen>
  );
}
