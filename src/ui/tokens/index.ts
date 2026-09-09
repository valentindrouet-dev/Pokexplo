/**
 * Échelles du design system côté TypeScript (docs/UI_DESIGN.md §179).
 *
 * `src/ui/theme/tokens.css` reste la source de vérité pour le rendu ; ces
 * constantes servent au code qui a besoin d'une valeur numérique (tailles de
 * sprites, calculs de grille, assertions de tests). Le test
 * `tests/ui/design-tokens.test.ts` vérifie qu'elles ne divergent jamais du CSS.
 */

/** Cible tactile minimale imposée par CONCEPTION §4. */
export const TOUCH_MIN = 56;
export const TOUCH_COMFORT = 64;
export const TOUCH_LARGE = 88;

/** Dimensions minimales d'une réponse d'exercice (§167). */
export const ANSWER_MIN_WIDTH = 120;
export const ANSWER_MIN_HEIGHT = 80;

/** Hauteur minimale d'une ligne de liste (§164). */
export const LIST_ROW_MIN = 64;

/** Échelle d'espacement (§157). */
export const SPACE = [2, 4, 8, 12, 16, 24, 32, 48, 64] as const;

/** Rayons (§135). */
export const RADIUS = {
  xs: 6,
  sm: 12,
  md: 18,
  lg: 28,
  xl: 34,
  panel: 32,
  pill: 999,
} as const;

/** Durées d'animation en millisecondes (§161-162). */
export const DURATION = {
  tap: 140,
  fast: 160,
  panel: 220,
  slow: 420,
} as const;

/** Résolution plancher à respecter (§159). */
export const MIN_VIEWPORT = { width: 1024, height: 768 } as const;
