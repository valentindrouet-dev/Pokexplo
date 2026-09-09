import { useMemo, useState } from 'react';
import type { ExerciseTemplate, HintType, PedagogyCategory, VoiceMessage } from '../../../types';
import { generateExercise } from '../../../exercise-engine';
import { randomSeed } from '../../../utils/rng';
import { createVoiceMessage } from '../../../utils/voice';
import { IconRefresh, SecondaryButton, SoftPanel } from '../../../ui';
import { ExerciseView } from '../../learning/ExerciseView';
import { useAdminDraft } from '../AdminDraftContext';
import { EntityPane } from '../EntityPane';
import { NumberField, SelectField, TextAreaField, TextField } from '../fields';
import { VoiceTextEditor } from '../VoiceTextEditor';

const HINT_TYPES: HintType[] = [
  'highlightOneByOne',
  'splitSyllables',
  'showObjects',
  'highlightDirection',
  'removeWrongAnswer',
];

const CATEGORIES: PedagogyCategory[] = ['READING', 'MATH', 'SPATIAL', 'ENGLISH', 'LOGIC', 'MEMORY'];

/**
 * MATRICES D'EXERCICES (CONCEPTION §31-32).
 *
 * On n'edite jamais un exercice : on edite une MATRICE, et l'apercu montre
 * une instance tiree au hasard parmi les centaines qu'elle peut produire.
 */
export function ExercisesSection() {
  const { draft, update } = useAdminDraft();
  const [selectedId, setSelectedId] = useState<string | null>(
    draft?.exerciseTemplates[0]?.id ?? null,
  );
  const [seed, setSeed] = useState(() => randomSeed());

  const template =
    draft?.exerciseTemplates.find((item) => item.id === selectedId) ??
    draft?.exerciseTemplates[0] ??
    null;

  const preview = useMemo(() => {
    if (!draft || !template) return null;
    try {
      return generateExercise(template, seed, { creatures: draft.creatures, capturedIds: [] });
    } catch {
      return null;
    }
  }, [draft, template, seed]);

  if (!draft) return null;

  const patch = (changes: Partial<ExerciseTemplate>): void => {
    if (!template) return;
    update((current) => ({
      ...current,
      exerciseTemplates: current.exerciseTemplates.map((item) =>
        item.id === template.id ? ({ ...item, ...changes } as ExerciseTemplate) : item,
      ),
    }));
  };

  const patchVoice = (next: VoiceMessage): void => {
    update((current) => ({
      ...current,
      voiceMessages: current.voiceMessages.map((voice) => (voice.id === next.id ? next : voice)),
    }));
  };

  /** Cree la VoiceMessage manquante d'une matrice (question, indices, reussite). */
  const ensureVoice = (voiceId: string, text: string): VoiceMessage => {
    const existing = draft.voiceMessages.find((voice) => voice.id === voiceId);
    if (existing) return existing;
    const created = createVoiceMessage(voiceId, text, 'exercises', {
      locale: template?.locale ?? 'fr-FR',
    });
    update((current) => ({ ...current, voiceMessages: [...current.voiceMessages, created] }));
    return created;
  };

  return (
    <EntityPane
      title="Matrices d’exercices"
      items={draft.exerciseTemplates}
      selectedId={template?.id ?? null}
      onSelect={setSelectedId}
      idOf={(item) => item.id}
      labelOf={(item) => item.label}
      hintOf={(item) => `${item.type} · niveau ${item.difficulty}`}
    >
      {template ? (
        <>
          <div className="field__row">
            <TextField label="Libellé" value={template.label} onChange={(label) => patch({ label })} />
            <SelectField
              label="Domaine"
              value={template.category}
              options={CATEGORIES.map((category) => ({ value: category, label: category }))}
              onChange={(category) => patch({ category })}
            />
            <SelectField
              label="Compétence"
              value={template.skillId}
              options={draft.skills.map((skill) => ({ value: skill.id, label: skill.label }))}
              onChange={(skillId) => patch({ skillId })}
            />
          </div>

          <div className="field__row">
            <NumberField
              label="Difficulté (1 à 5)"
              value={template.difficulty}
              min={1}
              max={5}
              onChange={(difficulty) => patch({ difficulty })}
            />
            <NumberField
              label="Nombre de réponses"
              value={template.answerCount}
              min={2}
              max={4}
              onChange={(answerCount) => patch({ answerCount })}
              hint="2 à 4 : au-delà, l’écran devient illisible pour un enfant de CP."
            />
            <SelectField
              label="Type d’indice"
              value={template.hintType}
              options={HINT_TYPES.map((hint) => ({ value: hint, label: hint }))}
              onChange={(hintType) => patch({ hintType })}
            />
          </div>

          <TypeSpecificFields template={template} patch={patch} />

          <TextAreaField
            label="Consigne (générique)"
            value={template.prompt}
            onChange={(prompt) => patch({ prompt })}
            hint="Formulez-la sans nommer la créature : une seule voix suffira pour toutes les instances (§57)."
          />
          <div className="field__row">
            <TextField label="Indice 1" value={template.hint1Text} onChange={(hint1Text) => patch({ hint1Text })} />
            <TextField label="Indice 2" value={template.hint2Text} onChange={(hint2Text) => patch({ hint2Text })} />
            <TextField
              label="Réussite"
              value={template.successText}
              onChange={(successText) => patch({ successText })}
            />
          </div>

          <SoftPanel title="Voix de l’exercice" tone="soft" padding="tight" className="ds-stack">
            <VoiceTextEditor
              title="Question"
              voice={ensureVoice(`voice.ex.${template.id}.q`, template.prompt)}
              onChange={patchVoice}
            />
            <VoiceTextEditor
              title="Indice 1"
              voice={ensureVoice(`voice.ex.${template.id}.h1`, template.hint1Text)}
              onChange={patchVoice}
            />
            <VoiceTextEditor
              title="Indice 2"
              voice={ensureVoice(`voice.ex.${template.id}.h2`, template.hint2Text)}
              onChange={patchVoice}
            />
            <VoiceTextEditor
              title="Réussite"
              voice={ensureVoice(`voice.ex.${template.id}.ok`, template.successText)}
              onChange={patchVoice}
            />
          </SoftPanel>

          <SoftPanel title="Aperçu" tone="soft" padding="tight" className="ds-stack">
            <div className="ds-row">
              <SecondaryButton icon={<IconRefresh size={24} />} onClick={() => setSeed(randomSeed())}>
                Tirer une autre instance
              </SecondaryButton>
              <span className="admin__status">seed {seed}</span>
            </div>
            {preview ? (
              <ExerciseView instance={preview} onSolved={() => setSeed(randomSeed())} />
            ) : (
              <p className="admin__status">
                Aperçu impossible : vérifiez la source de créatures de cette matrice.
              </p>
            )}
          </SoftPanel>
        </>
      ) : null}
    </EntityPane>
  );
}

/** Champs propres a chaque moteur : l'union discriminee guide l'edition (§34). */
function TypeSpecificFields({
  template,
  patch,
}: {
  template: ExerciseTemplate;
  patch: (changes: Partial<ExerciseTemplate>) => void;
}) {
  switch (template.type) {
    case 'COUNT':
      return (
        <div className="field__row">
          <NumberField
            label="Minimum"
            value={template.minValue}
            min={1}
            onChange={(minValue) => patch({ minValue } as Partial<ExerciseTemplate>)}
          />
          <NumberField
            label="Maximum"
            value={template.maxValue}
            min={1}
            onChange={(maxValue) => patch({ maxValue } as Partial<ExerciseTemplate>)}
          />
        </div>
      );
    case 'ADDITION':
      return (
        <div className="field__row">
          <NumberField
            label="Terme maximum"
            value={template.maxTerm}
            onChange={(maxTerm) => patch({ maxTerm } as Partial<ExerciseTemplate>)}
          />
          <NumberField
            label="Somme maximum"
            value={template.maxSum}
            onChange={(maxSum) => patch({ maxSum } as Partial<ExerciseTemplate>)}
          />
        </div>
      );
    case 'SUBTRACTION':
    case 'COMPARE':
      return (
        <NumberField
          label="Valeur maximum"
          value={template.maxValue}
          onChange={(maxValue) => patch({ maxValue } as Partial<ExerciseTemplate>)}
        />
      );
    case 'NUMBER_SEQUENCE':
      return (
        <div className="field__row">
          <NumberField
            label="Minimum"
            value={template.minValue}
            onChange={(minValue) => patch({ minValue } as Partial<ExerciseTemplate>)}
          />
          <NumberField
            label="Maximum"
            value={template.maxValue}
            onChange={(maxValue) => patch({ maxValue } as Partial<ExerciseTemplate>)}
          />
          <NumberField
            label="Longueur de la suite"
            value={template.length}
            min={3}
            onChange={(length) => patch({ length } as Partial<ExerciseTemplate>)}
          />
        </div>
      );
    case 'MISSING_LETTER':
      return (
        <SelectField
          label="Position de la lettre"
          value={template.position}
          options={[
            { value: 'first', label: 'Première' },
            { value: 'last', label: 'Dernière' },
            { value: 'any', label: 'N’importe où' },
          ]}
          onChange={(position) => patch({ position } as Partial<ExerciseTemplate>)}
        />
      );
    case 'SYLLABLE':
      return (
        <SelectField
          label="Mode"
          value={template.mode}
          options={[
            { value: 'countSyllables', label: 'Compter les syllabes' },
            { value: 'pickFirstSyllable', label: 'Première syllabe' },
          ]}
          onChange={(mode) => patch({ mode } as Partial<ExerciseTemplate>)}
        />
      );
    case 'MATCH_IMAGE_WORD':
      return (
        <SelectField
          label="Sens"
          value={template.direction}
          options={[
            { value: 'imageToWord', label: 'Image → mot' },
            { value: 'wordToImage', label: 'Mot → image' },
          ]}
          onChange={(direction) => patch({ direction } as Partial<ExerciseTemplate>)}
        />
      );
    case 'LEFT_RIGHT':
      return (
        <div className="field__row">
          <SelectField
            label="Axe"
            value={template.axis}
            options={[
              { value: 'leftRight', label: 'Gauche / droite' },
              { value: 'aboveBelow', label: 'Dessus / dessous' },
            ]}
            onChange={(axis) => patch({ axis } as Partial<ExerciseTemplate>)}
          />
          <SelectField
            label="Côté demandé"
            value={template.target}
            options={[
              { value: 'LEFT', label: 'Gauche' },
              { value: 'RIGHT', label: 'Droite' },
              { value: 'UP', label: 'Dessus' },
              { value: 'DOWN', label: 'Dessous' },
            ]}
            onChange={(target) => patch({ target } as Partial<ExerciseTemplate>)}
          />
        </div>
      );
    case 'GRID_MOVE':
      return (
        <div className="field__row">
          <NumberField
            label="Taille de la grille"
            value={template.gridSize}
            min={3}
            max={5}
            onChange={(gridSize) => patch({ gridSize } as Partial<ExerciseTemplate>)}
          />
          <NumberField
            label="Nombre de déplacements"
            value={template.steps}
            min={1}
            onChange={(steps) => patch({ steps } as Partial<ExerciseTemplate>)}
          />
        </div>
      );
    case 'CHOOSE_WORD':
      return (
        <SelectField
          label="Mauvaises réponses"
          value={template.distractors}
          options={[
            { value: 'random', label: 'Au hasard' },
            { value: 'sameFirstLetter', label: 'Même première lettre' },
            { value: 'sameLength', label: 'Longueur proche' },
          ]}
          onChange={(distractors) => patch({ distractors } as Partial<ExerciseTemplate>)}
        />
      );
    case 'ENGLISH_WORD':
      return (
        <p className="admin__status">
          Mode « {template.mode} ». La cible (couleur ou nombre) est portée par la matrice pour
          qu’une seule voix anglaise suffise.
        </p>
      );
    default:
      return null;
  }
}
