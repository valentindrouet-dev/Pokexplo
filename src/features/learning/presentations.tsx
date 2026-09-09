import type { ExercisePresentation, HintStep } from '../../types';
import type { Creature } from '../../types';
import { CreatureSprite } from '../../components/CreatureSprite';
import { IconArrowDown, IconArrowLeft, IconArrowRight, IconArrowUp } from '../../ui';
import { cn } from '../../utils/cn';

export interface PresentationProps {
  presentation: ExercisePresentation;
  creature: (id: string | undefined) => Creature | null;
  /** Indice actif : il pilote les aides visuelles (§35). */
  hint: HintStep | null;
  /** Index mis en avant par l'indice « compte-les un par un ». */
  highlightIndex: number;
}

/**
 * Rendu generique d'une presentation d'exercice.
 *
 * Un SEUL composant sait afficher les douze moteurs : c'est ce qui empeche de
 * coder les exercices un par un (CONCEPTION §31).
 */
export function ExercisePresentationView({
  presentation,
  creature,
  hint,
  highlightIndex,
}: PresentationProps) {
  switch (presentation.kind) {
    case 'CREATURE_GROUP':
      return (
        <div className="stage-group">
          {presentation.items.map((item, index) => (
            <span
              key={item.key}
              className="stage-group__item"
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
              data-highlight={hint?.type === 'highlightOneByOne' && index <= highlightIndex}
            >
              <CreatureSprite
                creature={creature(item.creatureId)}
                size={Math.round(74 * item.scale)}
              />
            </span>
          ))}
        </div>
      );

    case 'CREATURE_SINGLE':
      return <CreatureSprite creature={creature(presentation.creatureId)} size={160} animated />;

    case 'WORD':
      return (
        <div className="stage-word">
          {presentation.letters.map((letter, index) => (
            <span
              key={`${letter.char}-${index}`}
              className={cn('stage-word__letter', letter.hidden && 'stage-word__letter--hidden')}
            >
              {letter.hidden ? '?' : letter.char}
            </span>
          ))}
        </div>
      );

    case 'SYLLABLES':
      return (
        <div className="stage-syllables">
          <CreatureSprite creature={creature(presentation.creatureId)} size={160} />
          {hint?.type === 'splitSyllables' ? (
            <div className="stage-syllables__row">
              {presentation.syllables.map((syllable, index) => (
                <span key={`${syllable}-${index}`} className="stage-syllables__chunk">
                  {syllable}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      );

    case 'NUMBER_LINE':
      return (
        <div className="stage-numbers">
          {presentation.values.map((value, index) => (
            <span
              key={index}
              className={cn('stage-numbers__cell', value === null && 'stage-numbers__cell--hole')}
            >
              {value === null ? '?' : value}
            </span>
          ))}
        </div>
      );

    case 'OPERATION': {
      const showObjects = presentation.showObjects || hint?.type === 'showObjects';
      const target = creature(presentation.creatureId);
      return (
        <div className="stage-operation">
          <OperationSide count={presentation.left} creature={target} showObjects={showObjects} />
          <span className="stage-operation__sign">{presentation.operator}</span>
          <OperationSide count={presentation.right} creature={target} showObjects={showObjects} />
          <span className="stage-operation__sign">=</span>
          <span className="stage-operation__value">?</span>
        </div>
      );
    }

    case 'GRID': {
      const target = creature(presentation.creatureId);
      return (
        <div className="stage-grid">
          <div
            className="stage-grid__board"
            style={{ gridTemplateColumns: `repeat(${presentation.size}, auto)` }}
          >
            {Array.from({ length: presentation.size * presentation.size }, (_, index) => {
              const x = index % presentation.size;
              const y = Math.floor(index / presentation.size);
              const isStart = x === presentation.start.x && y === presentation.start.y;
              return (
                <span
                  key={index}
                  className={cn('stage-grid__cell', isStart && 'stage-grid__cell--start')}
                >
                  {isStart ? <CreatureSprite creature={target} size={44} /> : null}
                </span>
              );
            })}
          </div>
          <div className="stage-grid__path">
            {presentation.path.map((direction, index) => (
              <DirectionArrow key={index} direction={direction} />
            ))}
          </div>
        </div>
      );
    }

    case 'NONE':
    default:
      return null;
  }
}

function OperationSide({
  count,
  creature,
  showObjects,
}: {
  count: number;
  creature: Creature | null;
  showObjects: boolean;
}) {
  return (
    <span className="stage-operation__side">
      {showObjects ? (
        <span className="stage-operation__objects">
          {Array.from({ length: count }, (_, index) => (
            <CreatureSprite key={index} creature={creature} size={44} />
          ))}
        </span>
      ) : null}
      <span className="stage-operation__value">{count}</span>
    </span>
  );
}

export function DirectionArrow({ direction }: { direction: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' }) {
  const size = 34;
  switch (direction) {
    case 'LEFT':
      return <IconArrowLeft size={size} />;
    case 'RIGHT':
      return <IconArrowRight size={size} />;
    case 'UP':
      return <IconArrowUp size={size} />;
    case 'DOWN':
    default:
      return <IconArrowDown size={size} />;
  }
}
