import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AttemptOutcome, ExerciseChoice, ExerciseInstance, HintStep } from '../../types';
import { evaluateAttempt } from '../../exercise-engine';
import { ChoiceButton, VoiceButton, type ChoiceState } from '../../ui';
import { CreatureSprite } from '../../components/CreatureSprite';
import { useAudio } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { cn } from '../../utils/cn';
import { ExercisePresentationView } from './presentations';
import './exercise.css';

export interface ExerciseViewProps {
  instance: ExerciseInstance;
  /** Appele une fois l'exercice reussi (§14 : il l'est toujours au final). */
  onSolved: (result: { attempts: number; outcome: AttemptOutcome; durationMs: number }) => void;
  /** Zone libre au-dessus de la question : creature rencontree, cœurs d'Arene… */
  header?: ReactNode;
  /** Notifie chaque tentative (utilise par l'Arene pour animer les attaques). */
  onAttempt?: (correct: boolean, attempt: number) => void;
}

const SUCCESS_DELAY_MS = 1100;
const COUNT_STEP_MS = 620;

/**
 * ECRAN D'EXERCICE (CONCEPTION §165-167).
 *
 * Tout l'ecran conduit vers UNE seule action. On n'affiche jamais « mauvaise
 * reponse » : on encourage, on donne un indice, puis une aide renforcee (§14).
 */
export function ExerciseView({ instance, onSolved, header, onAttempt }: ExerciseViewProps) {
  const { creature, voice } = useContent();
  const { speak, speakMessage, buttonState } = useAudio();

  const [attempts, setAttempts] = useState(0);
  const [hint, setHint] = useState<HintStep | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const startedAt = useRef(Date.now());

  // Nouvelle instance : on repart d'un ecran propre.
  useEffect(() => {
    setAttempts(0);
    setHint(null);
    setRemoved([]);
    setSelected(null);
    setSolved(false);
    setHighlightIndex(-1);
    startedAt.current = Date.now();
  }, [instance.id]);

  // Consigne lue automatiquement : l'enfant n'a pas besoin de savoir lire (§2).
  useEffect(() => {
    speak(instance.promptVoice?.voiceId);
  }, [instance.id, instance.promptVoice?.voiceId, speak]);

  // Indice « compte-les un par un » : mise en avant sequentielle (§35).
  useEffect(() => {
    if (hint?.type !== 'highlightOneByOne') {
      setHighlightIndex(-1);
      return;
    }
    const total =
      instance.presentation.kind === 'CREATURE_GROUP' ? instance.presentation.items.length : 0;
    if (total === 0) return;

    setHighlightIndex(0);
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      if (index >= total) {
        window.clearInterval(timer);
        return;
      }
      setHighlightIndex(index);
    }, COUNT_STEP_MS);
    return () => window.clearInterval(timer);
  }, [hint, instance.presentation]);

  const handleChoice = useCallback(
    (choice: ExerciseChoice) => {
      if (solved || removed.includes(choice.id)) return;

      const evaluation = evaluateAttempt(instance, choice.id, attempts);
      setAttempts(evaluation.attempt);
      setSelected(choice.id);
      onAttempt?.(evaluation.correct, evaluation.attempt);

      if (evaluation.correct) {
        setSolved(true);
        setHint(null);
        const successVoice = instance.successVoice?.voiceId
          ? voice(instance.successVoice.voiceId)
          : voice(evaluation.message.voiceId);
        speakMessage(successVoice);
        window.setTimeout(() => {
          onSolved({
            attempts: evaluation.attempt,
            outcome: evaluation.outcome ?? 'ASSISTED',
            durationMs: Date.now() - startedAt.current,
          });
        }, SUCCESS_DELAY_MS);
        return;
      }

      setHint(evaluation.hint);
      if (evaluation.removeChoiceIds.length > 0) setRemoved(evaluation.removeChoiceIds);

      // On encourage d'abord, puis on lit l'indice : jamais deux voix ensemble (§127).
      speakMessage(voice(evaluation.message.voiceId));
      const hintVoiceId = evaluation.hint?.voice?.voiceId;
      if (hintVoiceId) {
        window.setTimeout(() => speak(hintVoiceId), 1400);
      }
      window.setTimeout(() => setSelected(null), 700);
    },
    [attempts, instance, onAttempt, onSolved, removed, solved, speak, speakMessage, voice],
  );

  const choiceState = useCallback(
    (choice: ExerciseChoice): ChoiceState => {
      if (removed.includes(choice.id)) return 'removed';
      if (solved && choice.id === instance.correctChoiceId) return 'correct';
      if (selected === choice.id) return solved ? 'correct' : 'retry';
      return 'idle';
    },
    [instance.correctChoiceId, removed, selected, solved],
  );

  const answersClassName = useMemo(
    () => cn('exercise__answers', instance.choicesLayout === 'column' && 'exercise__answers--column'),
    [instance.choicesLayout],
  );

  return (
    <div className="exercise">
      {header}

      <div className="exercise__prompt">
        <VoiceButton
          state={buttonState(instance.promptVoice?.voiceId)}
          onPlay={() => speak(instance.promptVoice?.voiceId)}
          label="Écouter la consigne"
        />
        <p className="exercise__question">{instance.promptText}</p>
      </div>

      <div className="exercise__stage">
        <ExercisePresentationView
          presentation={instance.presentation}
          creature={creature}
          hint={hint}
          highlightIndex={highlightIndex}
        />
      </div>

      {hint ? (
        <p className="exercise__hint">
          <VoiceButton
            small
            state={buttonState(hint.voice?.voiceId)}
            onPlay={() => speak(hint.voice?.voiceId)}
            label="Réécouter l’indice"
          />
          {hint.text}
        </p>
      ) : null}

      <div className={answersClassName}>
        {instance.choices.map((choice) => (
          <ChoiceButton
            key={choice.id}
            label={choiceLabel(choice)}
            accessibleLabel={accessibleLabel(choice)}
            wide={choice.kind === 'TEXT'}
            state={choiceState(choice)}
            onClick={() => handleChoice(choice)}
            media={hasMedia(choice) ? <ChoiceMedia choice={choice} /> : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/** Seules ces reponses portent une illustration ; les autres restent textuelles. */
function hasMedia(choice: ExerciseChoice): boolean {
  return choice.kind === 'CREATURE' || choice.kind === 'GROUP' || choice.kind === 'CELL';
}

function choiceLabel(choice: ExerciseChoice): string {
  return choice.kind === 'CREATURE' || choice.kind === 'GROUP' || choice.kind === 'CELL'
    ? ''
    : choice.label;
}

function accessibleLabel(choice: ExerciseChoice): string {
  switch (choice.kind) {
    case 'GROUP':
      return `Groupe de ${choice.count ?? 0}`;
    case 'CREATURE':
      return 'Cette créature';
    case 'CELL':
      return `Case colonne ${(choice.cell?.x ?? 0) + 1}, ligne ${(choice.cell?.y ?? 0) + 1}`;
    default:
      return choice.label;
  }
}

function ChoiceMedia({ choice }: { choice: ExerciseChoice }) {
  const { creature } = useContent();

  if (choice.kind === 'CREATURE') {
    return <CreatureSprite creature={creature(choice.creatureId)} size={96} />;
  }

  if (choice.kind === 'GROUP') {
    return (
      <span className="choice-group">
        {Array.from({ length: choice.count ?? 0 }, (_, index) => (
          <CreatureSprite key={index} creature={creature(choice.creatureId)} size={40} />
        ))}
      </span>
    );
  }

  if (choice.kind === 'CELL' && choice.cell) {
    const size = 3;
    return (
      <span className="choice-mini-grid" style={{ gridTemplateColumns: `repeat(${size}, auto)` }}>
        {Array.from({ length: size * size }, (_, index) => {
          const x = index % size;
          const y = Math.floor(index / size);
          const on = choice.cell?.x === x && choice.cell?.y === y;
          return (
            <span
              key={index}
              className={cn('choice-mini-grid__cell', on && 'choice-mini-grid__cell--on')}
            />
          );
        })}
      </span>
    );
  }

  return null;
}
