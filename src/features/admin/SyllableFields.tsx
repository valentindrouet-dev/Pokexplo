import { FieldGroup } from './fields';
import './forms.css';

/** Assez pour les noms les plus longs, jamais assez pour encombrer l'écran. */
const MAX_SYLLABLES = 8;

/**
 * LES SYLLABES, UNE PAR CASE (§198).
 *
 * On les saisissait dans un seul champ, séparées par des tirets :
 * « Pi-lou-pi ». Un tiret oublié, un espace en trop, et l'exercice découpait
 * le nom n'importe comment — sans rien dire, parce qu'une chaîne reste une
 * chaîne. Une case par syllabe rend le découpage VISIBLE, et il devient
 * impossible de se tromper de séparateur.
 *
 * Les cases vides du milieu sont refermées à l'écriture : le contenu ne garde
 * jamais de trou.
 */
export function SyllableFields({
  value,
  onChange,
  label = 'Syllabes',
}: {
  value: string[];
  onChange: (syllables: string[]) => void;
  label?: string;
}) {
  const cells = Array.from({ length: MAX_SYLLABLES }, (_, index) => value[index] ?? '');

  const write = (index: number, text: string): void => {
    const next = [...cells];
    next[index] = text;
    onChange(next.map((part) => part.trim()).filter((part) => part !== ''));
  };

  return (
    <FieldGroup
      label={label}
      hint={`Une syllabe par case, dans l’ordre. Les exercices et les quêtes s’en servent — ${
        value.length === 0 ? 'aucune pour l’instant' : `${value.length} pour l’instant`
      }.`}
    >
      <div className="syllables">
        {cells.map((cell, index) => (
          <input
            key={index}
            className="field__input syllables__cell"
            value={cell}
            maxLength={8}
            aria-label={`Syllabe ${index + 1}`}
            placeholder={index === 0 ? 'Pi' : ''}
            onChange={(event) => write(index, event.target.value)}
          />
        ))}
      </div>
      {/* Ce que l'enfant entendra découpé, tel quel. */}
      {value.length > 0 ? <p className="syllables__preview">{value.join(' · ')}</p> : null}
    </FieldGroup>
  );
}
