import { FieldGroup } from './fields';
import './forms.css';

/**
 * COULEURS DU DESIGN SYSTEM (§138-139).
 *
 * Ce sont les teintes de `tokens.css`, en clair : un `<input type="color">`
 * ne sait pas lire une variable CSS. Les proposer d'abord évite qu'une
 * créature arrive avec un vert fluo qui jure avec tout le reste.
 */
const PRESETS: Array<{ value: string; label: string }> = [
  { value: '#FFD45C', label: 'Jaune' },
  { value: '#FFE9A2', label: 'Jaune clair' },
  { value: '#FF777F', label: 'Corail' },
  { value: '#FFB0B5', label: 'Corail clair' },
  { value: '#62D7D0', label: 'Turquoise' },
  { value: '#BDEDEA', label: 'Turquoise clair' },
  { value: '#919AEF', label: 'Lavande' },
  { value: '#D7D9FF', label: 'Lavande clair' },
  { value: '#D7B5F5', label: 'Lilas' },
  { value: '#A8D86E', label: 'Vert' },
  { value: '#E0C48C', label: 'Sable' },
  { value: '#FFFDF9', label: 'Crème' },
];

/**
 * Une couleur ne se saisit plus à la main (§196).
 *
 * On tapait `#FFD45C` dans un champ de texte : une faute de frappe donnait un
 * dessin cassé, sans le dire. Il y a maintenant les couleurs du jeu, en
 * grand, et un sélecteur du système pour tout le reste.
 */
export function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const normalized = value.toUpperCase();

  return (
    <FieldGroup label={label} hint={hint}>
      <div className="color-field">
        <input
          className="color-field__native"
          type="color"
          value={/^#[0-9a-f]{6}$/iu.test(value) ? value : '#FFD45C'}
          aria-label={`${label} — choisir librement`}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <div className="color-field__presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className="color-field__swatch"
              style={{ background: preset.value }}
              aria-label={preset.label}
              aria-pressed={normalized === preset.value}
              title={preset.label}
              onClick={() => onChange(preset.value)}
            />
          ))}
        </div>
      </div>
    </FieldGroup>
  );
}
