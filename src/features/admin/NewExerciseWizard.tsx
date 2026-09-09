import { useState } from 'react';
import type { ExerciseType, PedagogyCategory } from '../../types';
import { EXERCISE_TYPES } from '../../exercise-engine';
import { ModalPanel, PrimaryButton, SecondaryButton, SelectionTile } from '../../ui';
import {
  CATEGORY_LABELS,
  EXERCISE_TYPE_LABELS,
  LEVEL_LABELS,
  type ExerciseLevel,
} from './templateFactory';
import './forms.css';

/**
 * ASSISTANT DE CRÉATION D'EXERCICE (UI_DESIGN §196).
 *
 * Créer une matrice demandait de choisir dans une liste de douze valeurs
 * (`COUNT`, `GRID_MOVE`, `ENGLISH_WORD`…), puis de comprendre `difficulty`,
 * `hintType` et `skillId` avant d'obtenir quoi que ce soit de jouable.
 *
 * Deux questions suffisent : **qu'est-ce que ça fait travailler**, et
 * **à quel point c'est difficile**. Le reste est déduit — et reste modifiable
 * ensuite, dans la fiche.
 */

/** Le domaine de chaque type, pour ranger les propositions. */
const TYPE_CATEGORY: Record<ExerciseType, PedagogyCategory> = {
  COUNT: 'MATH',
  ADDITION: 'MATH',
  SUBTRACTION: 'MATH',
  COMPARE: 'MATH',
  NUMBER_SEQUENCE: 'MATH',
  CHOOSE_WORD: 'READING',
  MATCH_IMAGE_WORD: 'READING',
  MISSING_LETTER: 'READING',
  SYLLABLE: 'READING',
  LEFT_RIGHT: 'SPATIAL',
  GRID_MOVE: 'SPATIAL',
  ENGLISH_WORD: 'ENGLISH',
};

const ORDER: PedagogyCategory[] = ['MATH', 'READING', 'SPATIAL', 'ENGLISH'];

export function NewExerciseWizard({
  open,
  onCancel,
  onCreate,
}: {
  open: boolean;
  onCancel: () => void;
  onCreate: (type: ExerciseType, level: ExerciseLevel) => void;
}) {
  const [type, setType] = useState<ExerciseType | null>(null);
  const [level, setLevel] = useState<ExerciseLevel>('easy');

  const close = (): void => {
    setType(null);
    setLevel('easy');
    onCancel();
  };

  return (
    <ModalPanel
      open={open}
      title={type === null ? 'Que voulez-vous faire travailler ?' : 'À quel point est-ce difficile ?'}
      onDismiss={close}
      actions={
        type === null ? (
          <SecondaryButton onClick={close}>Annuler</SecondaryButton>
        ) : (
          <>
            <SecondaryButton onClick={() => setType(null)}>Revenir</SecondaryButton>
            <PrimaryButton
              onClick={() => {
                onCreate(type, level);
                setType(null);
                setLevel('easy');
              }}
            >
              Créer l’exercice
            </PrimaryButton>
          </>
        )
      }
    >
      {type === null ? (
        <div className="wizard ds-stack">
          {ORDER.map((category) => (
            <div key={category} className="ds-stack">
              <span className="field__label">{CATEGORY_LABELS[category]}</span>
              <div className="wizard__grid">
                {EXERCISE_TYPES.filter((entry) => TYPE_CATEGORY[entry] === category).map((entry) => (
                  <SelectionTile
                    key={entry}
                    label={EXERCISE_TYPE_LABELS[entry]}
                    onClick={() => setType(entry)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ds-stack">
          <p className="admin__status">{EXERCISE_TYPE_LABELS[type]}</p>
          <div className="wizard__grid">
            {(['easy', 'medium', 'hard'] as ExerciseLevel[]).map((entry) => (
              <SelectionTile
                key={entry}
                label={LEVEL_LABELS[entry]}
                selected={level === entry}
                onClick={() => setLevel(entry)}
              />
            ))}
          </div>
          <p className="admin__status">
            La difficulté règle les bornes de l’exercice — compter jusqu’à 5, 8 ou 12 — et le
            nombre de réponses proposées. Tout reste modifiable ensuite.
          </p>
        </div>
      )}
    </ModalPanel>
  );
}
