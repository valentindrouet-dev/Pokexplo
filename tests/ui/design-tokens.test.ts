import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * GARDE-FOU DU DESIGN SYSTEM (docs/UI_DESIGN.md §181).
 *
 * « Claude ne doit pas choisir au hasard : border-radius 17px ici, 23px
 * ailleurs. Tous les composants doivent utiliser les tokens communs. »
 *
 * Ce test echoue si un fichier CSS introduit une couleur ou un rayon en dur.
 * Seul `src/ui/theme/tokens.css` a le droit de definir des valeurs brutes.
 */

// Vitest s'execute depuis la racine du projet.
const ROOT = join(process.cwd(), 'src');
const TOKENS_FILE = 'ui/theme/tokens.css';

function cssFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) return cssFiles(full);
    return full.endsWith('.css') ? [full] : [];
  });
}

const files = cssFiles(ROOT)
  .map((file) => ({ path: relative(ROOT, file), source: readFileSync(file, 'utf8') }))
  .filter((file) => file.path !== TOKENS_FILE);

/** Retire les commentaires : ils citent souvent les valeurs des tokens. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '');
}

describe('Design tokens (docs/UI_DESIGN.md §181)', () => {
  it('trouve bien les fichiers CSS du projet', () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it('n’utilise aucune couleur hexadécimale hors des tokens', () => {
    const offenders = files
      .map((file) => ({
        path: file.path,
        matches: withoutComments(file.source).match(/#[0-9a-fA-F]{3,8}\b/gu) ?? [],
      }))
      .filter((file) => file.matches.length > 0);

    expect(offenders).toEqual([]);
  });

  it('n’utilise aucune couleur rgb/rgba hors des tokens', () => {
    const offenders = files
      .map((file) => ({
        path: file.path,
        matches: withoutComments(file.source).match(/\brgba?\(/gu) ?? [],
      }))
      .filter((file) => file.matches.length > 0);

    expect(offenders).toEqual([]);
  });

  it('n’utilise aucun rayon en dur : border-radius passe toujours par un token', () => {
    const offenders = files
      .map((file) => ({
        path: file.path,
        matches: [...withoutComments(file.source).matchAll(/border-radius:\s*([^;]+);/gu)]
          .map((match) => (match[1] ?? '').trim())
          .filter((value) => !value.startsWith('var(') && value !== '0' && value !== 'inherit'),
      }))
      .filter((file) => file.matches.length > 0);

    expect(offenders).toEqual([]);
  });

  it('définit bien tous les tokens imposés par la conception', () => {
    const tokens = readFileSync(join(ROOT, TOKENS_FILE), 'utf8');
    const required = [
      '--color-surface',
      '--color-surface-soft',
      '--color-yellow',
      '--color-coral',
      '--color-aqua',
      '--color-lavender',
      '--color-green',
      '--color-text',
      '--color-text-soft',
      '--radius-sm',
      '--radius-md',
      '--radius-lg',
      '--radius-xl',
      '--radius-pill',
      '--space-1',
      '--space-2',
      '--space-3',
      '--space-4',
      '--space-5',
      '--space-6',
      '--space-7',
      '--touch-min',
      '--safe-top',
      '--safe-bottom',
    ];
    for (const token of required) {
      expect(tokens).toContain(`${token}:`);
    }
  });

  it('respecte la cible tactile minimale de 56 px (§4)', () => {
    const tokens = readFileSync(join(ROOT, TOKENS_FILE), 'utf8');
    const match = tokens.match(/--touch-min:\s*(\d+)px/u);
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(56);
  });

  it('n’utilise jamais le noir pur pour le texte (§144)', () => {
    const tokens = readFileSync(join(ROOT, TOKENS_FILE), 'utf8');
    const textColor = tokens.match(/--color-text:\s*(#[0-9a-f]{6})/iu)?.[1]?.toLowerCase();
    expect(textColor).not.toBe('#000000');
    expect(textColor).toBe('#514a4b');
  });
});
