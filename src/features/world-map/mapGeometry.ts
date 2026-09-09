import type { Orientation } from '../../utils/useOrientation';

/**
 * GÉOMÉTRIE DE LA CARTE.
 *
 * Les positions du contenu sont en POURCENTAGES (§159) : c'est ainsi que
 * l'administrateur les saisit, et elles ne dépendent d'aucune résolution.
 * L'écran, lui, change de forme — d'où deux projections.
 *
 * Tout ce qui suit est pur : aucune dépendance à React ni au DOM. La carte s'en
 * sert pour dessiner, et le glisser-déposer pour faire le chemin inverse.
 */
export interface Point {
  x: number;
  y: number;
}

export interface ZoneLabel extends Point {
  anchor: 'start' | 'middle' | 'end';
}

/* ------------------------------------------------------------------ *
 * Tailles, en unités du repère : elles grandissent avec le panneau.
 * ------------------------------------------------------------------ */
export const NODE_R = 5.6;
export const NODE_R_GYM = 6.6;
export const HIT_R = 10;
export const ZONE_R = 11;
export const ZONE_LINK_W = 22;
/** Distance du bas de l'étiquette d'un lieu à son centre. */
export const LABEL_DROP = NODE_R_GYM + 6.2;

/** Pas de la grille de placement, en pourcentages. */
export const GRID = 1;

/**
 * Boîte utile, en pourcentages.
 *
 * Au-delà, la bulle de région ou l'étiquette d'un lieu dépasse du cadre — dans
 * une orientation ou dans l'autre. `tests/features/mapGeometry.test.ts` vérifie
 * cette promesse sur les deux projections : ces quatre nombres ne se règlent
 * pas au jugé.
 */
export const NODE_BOUNDS = { minX: 7, maxX: 93, minY: 11, maxY: 87 } as const;

/* ------------------------------------------------------------------ *
 * Projections
 * ------------------------------------------------------------------ */

/** Paysage : le chemin Centre → Arène va vers la DROITE. */
const L_SX = 1.6;

/**
 * Portrait : la carte est TRANSPOSÉE, le même chemin DESCEND. Sans cela, la
 * carte paysage flottait, minuscule, au milieu d'un panneau vide.
 * Les marges laissent la place au personnage, qui se tient au-dessus du lieu
 * courant (§11), et empêchent les bulles d'affleurer les bords.
 */
const P_X0 = 6;
const P_SX = 0.88;
const P_Y0 = 12;
const P_SY = 1.34;

export interface Projection {
  w: number;
  h: number;
  /** Pourcentages → repère de dessin. */
  toView: (node: Point) => Point;
  /** Repère de dessin → pourcentages. Exactement l'inverse de `toView`. */
  fromView: (point: Point) => Point;
  /**
   * Position du titre d'une région. `points` sont ses lieux, `all` tous les
   * lieux de la carte : on s'en sert pour poser le titre du côté libre.
   */
  labelFor: (points: Point[], all: Point[]) => ZoneLabel;
}

export const PROJECTIONS: Record<Orientation, Projection> = {
  landscape: {
    w: 160,
    h: 100,
    toView: (node) => ({ x: node.x * L_SX, y: node.y }),
    fromView: (point) => ({ x: point.x / L_SX, y: point.y }),
    // Au-dessus du lieu le plus à gauche : le milieu d'une bulle est souvent
    // traversé par un chemin, qui couperait le titre.
    labelFor: (points) => {
      const left = points.reduce((best, point) => (point.x < best.x ? point : best), points[0]!);
      return { x: left.x, y: Math.max(4, left.y - ZONE_R - 3), anchor: 'middle' };
    },
  },
  portrait: {
    w: 100,
    h: 150,
    toView: (node) => ({ x: P_X0 + node.y * P_SX, y: P_Y0 + node.x * P_SY }),
    fromView: (point) => ({ x: (point.y - P_Y0) / P_SY, y: (point.x - P_X0) / P_SX }),
    // Les régions s'empilent : un titre « au-dessus » tomberait sur la région
    // précédente. On le pose À CÔTÉ du lieu le plus haut, du côté où la carte
    // est vide — à l'opposé de l'axe des lieux.
    labelFor: (points, all) => {
      const top = points.reduce((best, point) => (point.y < best.y ? point : best), points[0]!);
      const axis = all.reduce((sum, point) => sum + point.x, 0) / Math.max(1, all.length);
      const right = top.x >= axis;
      return {
        x: right ? Math.min(96, top.x + NODE_R + 4) : Math.max(4, top.x - NODE_R - 4),
        y: top.y - 1.5,
        anchor: right ? 'start' : 'end',
      };
    },
  },
};

/* ------------------------------------------------------------------ *
 * Placement
 * ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Range une position lâchée : sur la grille, et dans le cadre.
 *
 * La grille évite les « presque alignés » qui font l'effet d'un accident, et
 * les bornes garantissent qu'un lieu reste visible dans les DEUX orientations —
 * l'adulte n'en édite qu'une à la fois, l'enfant peut ouvrir l'autre.
 */
export function placeNode(position: Point): Point {
  return {
    x: clamp(Math.round(position.x / GRID) * GRID, NODE_BOUNDS.minX, NODE_BOUNDS.maxX),
    y: clamp(Math.round(position.y / GRID) * GRID, NODE_BOUNDS.minY, NODE_BOUNDS.maxY),
  };
}

/** Ce dont `ZoneShape` a besoin pour dessiner la bulle d'une region. */
export interface Zone {
  points: Point[];
  inner: Array<{ a: Point; b: Point }>;
}

export interface PlacedNode extends Point {
  id: string;
  biomeId: string;
}

/**
 * La région dans laquelle un lieu vient d'être lâché, s'il a atterri chez une
 * AUTRE que la sienne.
 *
 * Sans cela, la bulle de sa région d'origine s'étire pour aller le chercher et
 * traverse la région voisine : la carte devient illisible. On ne réaffecte
 * jamais tout seul — on le propose (§115 : l'administrateur décide).
 *
 * Le critère est celui que l'œil applique : le lieu est dans le rayon d'une
 * bulle étrangère, et il en est plus proche que de la sienne.
 */
export function foreignBiomeAt(
  position: Point,
  nodes: PlacedNode[],
  moved: { id: string; biomeId: string },
  toView: Projection['toView'],
): string | null {
  const here = toView(position);
  const distanceTo = (node: PlacedNode): number => {
    const there = toView(node);
    return Math.hypot(here.x - there.x, here.y - there.y);
  };

  let foreign: { biomeId: string; distance: number } | null = null;
  let home = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    if (node.id === moved.id) continue;
    const distance = distanceTo(node);
    if (node.biomeId === moved.biomeId) {
      home = Math.min(home, distance);
    } else if (!foreign || distance < foreign.distance) {
      foreign = { biomeId: node.biomeId, distance };
    }
  }

  if (!foreign || foreign.distance > ZONE_R) return null;
  return foreign.distance < home ? foreign.biomeId : null;
}
