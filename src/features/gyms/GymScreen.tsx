import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ExerciseInstance } from '../../types';
import { generateExercise, selectTemplate } from '../../exercise-engine';
import { gymReadiness } from '../../game-engine';
import { createRng, randomSeed } from '../../utils/rng';
import {
  DialogCard,
  Hearts,
  IconBadge,
  IconCheck,
  IconClose,
  IconProfessor,
  LoadingBall,
  PrimaryButton,
  SoftPanel,
  VoiceButton,
} from '../../ui';
import { CreatureSprite } from '../../components/CreatureSprite';
import { useAudio, useAutoVoice } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useNavigation } from '../../app/router';
import { ExerciseView } from '../learning/ExerciseView';
import { PlayScreen } from '../play/PlayScreen';

/**
 * ARENE (CONCEPTION §22-24).
 *
 * 1. « PRÊT POUR PIERRE ? » : la condition d'acces est montree en clair (§23).
 * 2. Combat : chaque bonne reponse retire un cœur a l'adversaire (§24).
 * 3. Victoire : badge, puis fin de chapitre (§6).
 */
export function GymScreen({ gymId }: { gymId: string }) {
  const { navigate } = useNavigation();
  const { bundle, biome, gym: gymById, creature } = useContent();
  const { save, dispatch, effects } = useGame();
  const { speak, buttonState } = useAudio();
  const [attackAnim, setAttackAnim] = useState(false);
  const [victory, setVictory] = useState(false);

  const gym = gymById(gymId);
  const battle = save?.state.activeGymBattle?.gymId === gymId ? save.state.activeGymBattle : null;

  const readiness = useMemo(
    () => (gym && save && bundle ? gymReadiness(gym, save, bundle) : null),
    [gym, save, bundle],
  );

  const opponent = gym?.opponents[battle?.opponentIndex ?? 0] ?? null;
  const opponentCreature = creature(opponent?.creatureId);

  useAutoVoice(readiness?.ready ? gym?.introVoiceId : gym?.requirementVoiceId, !battle && !victory);

  const instance: ExerciseInstance | null = useMemo(() => {
    if (!bundle || !save || !battle || !opponent) return null;
    const templates = bundle.exerciseTemplates.filter((template) =>
      opponent.exerciseTemplateIds.includes(template.id),
    );
    // Seed derive de l'etat du combat : la meme question revient a l'identique
    // si l'application est fermee puis rouverte (§33).
    const seed = (battle.seed + battle.opponentIndex * 9973 + battle.heartsLeft * 131) >>> 0;
    const rng = createRng(seed);
    const template = selectTemplate({
      templates: templates.length > 0 ? templates : bundle.exerciseTemplates,
      learning: save.learning,
      pack: bundle.curriculumPacks.find((pack) => pack.id === save.profile.packId) ?? null,
      rng,
    });
    if (!template) return null;
    return generateExercise(template, seed, {
      creatures: bundle.creatures,
      capturedIds: Object.values(save.pokedex)
        .filter((entry) => entry.state === 'CAPTURED')
        .map((entry) => entry.creatureId),
    });
  }, [bundle, save, battle, opponent]);

  const startBattle = useCallback(async () => {
    await dispatch({ kind: 'GYM_START', gymId, seed: randomSeed() });
  }, [dispatch, gymId]);

  const onSolved = useCallback(
    async (result: { attempts: number; outcome: 'FIRST_TRY' | 'ASSISTED' | 'FAILED' }) => {
      if (!instance || !gym || !battle) return;

      await dispatch({
        kind: 'EXERCISE_RESULT',
        result: {
          instanceId: instance.id,
          templateId: instance.templateId,
          skillId: instance.skillId,
          difficulty: instance.difficulty,
          attempts: result.attempts,
          outcome: result.outcome,
          durationMs: 0,
          at: Date.now(),
        },
      });

      const lastOpponent = battle.opponentIndex >= gym.opponents.length - 1;
      const lastHeart = battle.heartsLeft <= 1;

      await dispatch({ kind: 'GYM_OPPONENT_HIT', gymId });

      if (lastOpponent && lastHeart) {
        await dispatch({ kind: 'GYM_WON', gymId, badgeId: gym.badgeId });
        speak(gym.victoryVoiceId);
        setVictory(true);
      }
    },
    [battle, dispatch, gym, instance, speak],
  );

  useEffect(() => {
    if (!attackAnim) return undefined;
    const timer = window.setTimeout(() => setAttackAnim(false), 500);
    return () => window.clearTimeout(timer);
  }, [attackAnim]);

  if (!bundle || !save || !gym) {
    return (
      <PlayScreen backTo={{ name: 'map' }}>
        <LoadingBall />
      </PlayScreen>
    );
  }

  const gymBiome = biome(bundle.nodes.find((node) => node.id === gym.nodeId)?.biomeId);

  /* ------------------------------- victoire ------------------------------ */
  if (victory || (effects?.badgeEarned === gym.badgeId && !battle)) {
    const chapterDone = save.state.adventureCompleted;
    return (
      <PlayScreen biome={gymBiome} backTo={null} scrim="soft">
        <SoftPanel padding="roomy" animated>
          <div className="ending">
            <IconBadge size={110} />
            <p className="ending__title">Badge Roche !</p>
            <VoiceButton
              state={buttonState(chapterDone ? 'voice.chapter.1.outro' : gym.victoryVoiceId)}
              onPlay={() => speak(chapterDone ? 'voice.chapter.1.outro' : gym.victoryVoiceId)}
              label="Réécouter"
            />
            <p className="exercise__question">
              {chapterDone
                ? 'Tu as terminé ton aventure ! Tu peux continuer à explorer et compléter ton Pokédex.'
                : 'Bravo ! Tu as gagné le Badge Roche !'}
            </p>
            <PrimaryButton large onClick={() => navigate({ name: 'center' })}>
              Retour au Centre
            </PrimaryButton>
          </div>
        </SoftPanel>
      </PlayScreen>
    );
  }

  /* --------------------------- condition d'acces -------------------------- */
  if (!battle && readiness && !readiness.ready) {
    return (
      <PlayScreen biome={gymBiome} backTo={{ name: 'map' }} scrim="soft">
        <SoftPanel title={`Prêt pour ${gym.masterName} ?`} padding="roomy" animated className="ds-stack">
          <VoiceButton
            state={buttonState(gym.requirementVoiceId)}
            onPlay={() => speak(gym.requirementVoiceId)}
            label="Écouter Pierre"
          />
          <div className="gym-check">
            {readiness.rows.map((row) => (
              <div key={row.type} className="gym-check__row">
                <span>{row.label}</span>
                {row.ok ? <IconCheck size={32} /> : <IconClose size={32} />}
              </div>
            ))}
          </div>
          <p className="gym-check__score">
            {readiness.have} / {readiness.need}
          </p>
          <p className="start__subtitle">
            Reviens avec {readiness.need} créatures fortes contre la Roche.
          </p>
        </SoftPanel>
      </PlayScreen>
    );
  }

  /* ------------------------------ presentation ---------------------------- */
  if (!battle) {
    return (
      <PlayScreen biome={gymBiome} backTo={{ name: 'map' }} scrim="soft">
        <DialogCard
          speaker={gym.masterName}
          portrait={<IconProfessor size={72} />}
          text="Je suis Pierre, le Maître de l’Arène. Montre-moi ce que tu sais faire !"
          voiceButton={
            <VoiceButton
              state={buttonState(gym.introVoiceId)}
              onPlay={() => speak(gym.introVoiceId)}
              label="Réécouter"
            />
          }
          action={
            <PrimaryButton large onClick={() => void startBattle()}>
              Je suis prêt !
            </PrimaryButton>
          }
        />
      </PlayScreen>
    );
  }

  /* -------------------------------- combat -------------------------------- */
  return (
    <PlayScreen
      biome={gymBiome}
      backTo={{ name: 'map' }}
      backLabel="Quitter l’Arène"
      scrim="soft"
      extraLeft={
        <VoiceButton
          state={buttonState(gym.encourageVoiceId)}
          onPlay={() => speak(gym.encourageVoiceId)}
          label="Écouter Pierre"
        />
      }
    >
      <SoftPanel padding="roomy" className="encounter" animated>
        {instance ? (
          <ExerciseView
            instance={instance}
            header={
              <div className={`gym-battle${attackAnim ? ' gym-battle__attack' : ''}`}>
                <div className="gym-battle__opponent">
                  <CreatureSprite creature={opponentCreature} size={120} animated />
                  <p className="encounter__name">{opponentCreature?.name}</p>
                  <Hearts total={opponent?.hearts ?? 3} left={battle.heartsLeft} />
                </div>
              </div>
            }
            onAttempt={(correct, attempts) => {
              if (correct) setAttackAnim(true);
              void dispatch({ kind: 'GYM_ATTEMPT', attempts });
            }}
            onSolved={(result) => void onSolved(result)}
          />
        ) : (
          <LoadingBall />
        )}
      </SoftPanel>
    </PlayScreen>
  );
}
