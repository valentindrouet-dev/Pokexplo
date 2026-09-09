import { describe, expect, it } from 'vitest';
import {
  LABEL_DROP,
  NODE_BOUNDS,
  PROJECTIONS,
  ZONE_R,
  foreignBiomeAt,
  placeNode,
  type PlacedNode,
} from '../../src/features/world-map/mapGeometry';
import { defaultContentBundle } from '../../src/content/defaultContent';

/**
 * GÉOMÉTRIE DE LA CARTE.
 *
 * L'adulte déplace les lieux dans UNE orientation ; l'enfant peut ouvrir
 * l'autre. Ces tests tiennent la promesse correspondante : une position rangée
 * par `placeNode` reste lisible en paysage COMME en portrait.
 */
const ORIENTATIONS = ['landscape', 'portrait'] as const;

describe('Projections', () => {
  for (const orientation of ORIENTATIONS) {
    const { toView, fromView } = PROJECTIONS[orientation];

    it(`${orientation} : fromView défait exactement toView`, () => {
      for (const point of [
        { x: 0, y: 0 },
        { x: 6, y: 50 },
        { x: 43, y: 11 },
        { x: 91, y: 76 },
        { x: 100, y: 100 },
      ]) {
        const back = fromView(toView(point));
        expect(back.x).toBeCloseTo(point.x, 6);
        expect(back.y).toBeCloseTo(point.y, 6);
      }
    });
  }
});

describe('Boîte utile (NODE_BOUNDS)', () => {
  /** Toute la boîte, échantillonnée : on ne se contente pas des quatre coins. */
  const samples: Array<{ x: number; y: number }> = [];
  for (let x = NODE_BOUNDS.minX; x <= NODE_BOUNDS.maxX; x += 4.3) {
    for (let y = NODE_BOUNDS.minY; y <= NODE_BOUNDS.maxY; y += 4.3) samples.push({ x, y });
  }
  samples.push(
    { x: NODE_BOUNDS.minX, y: NODE_BOUNDS.minY },
    { x: NODE_BOUNDS.maxX, y: NODE_BOUNDS.maxY },
    { x: NODE_BOUNDS.minX, y: NODE_BOUNDS.maxY },
    { x: NODE_BOUNDS.maxX, y: NODE_BOUNDS.minY },
  );

  for (const orientation of ORIENTATIONS) {
    const { w, h, toView } = PROJECTIONS[orientation];

    it(`${orientation} : la bulle de région ne dépasse jamais du cadre`, () => {
      const outside = samples
        .map((point) => ({ point, view: toView(point) }))
        .filter(
          ({ view }) =>
            view.x - ZONE_R < 0 || view.x + ZONE_R > w || view.y - ZONE_R < 0 || view.y + ZONE_R > h,
        );
      expect(outside).toEqual([]);
    });

    it(`${orientation} : l’étiquette d’un lieu reste dans le cadre`, () => {
      const clipped = samples
        .map((point) => ({ point, bottom: toView(point).y + LABEL_DROP }))
        .filter(({ bottom }) => bottom > h);
      expect(clipped).toEqual([]);
    });
  }
});

describe('Ranger une position lâchée', () => {
  it('pose le lieu sur la grille', () => {
    expect(placeNode({ x: 42.4, y: 50.6 })).toEqual({ x: 42, y: 51 });
  });

  it('ramène dans le cadre un lieu lâché au bord', () => {
    expect(placeNode({ x: -20, y: 300 })).toEqual({ x: NODE_BOUNDS.minX, y: NODE_BOUNDS.maxY });
    expect(placeNode({ x: 999, y: -8 })).toEqual({ x: NODE_BOUNDS.maxX, y: NODE_BOUNDS.minY });
  });

  it('est idempotent : ranger deux fois ne bouge plus rien', () => {
    const once = placeNode({ x: 63.7, y: 12.2 });
    expect(placeNode(once)).toEqual(once);
  });
});

describe('Cohérence des régions', () => {
  const nodes: PlacedNode[] = [
    { id: 'prairie-1', biomeId: 'prairie', x: 19, y: 50 },
    { id: 'prairie-2', biomeId: 'prairie', x: 29, y: 63 },
    { id: 'foret-1', biomeId: 'foret', x: 31, y: 20 },
    { id: 'foret-2', biomeId: 'foret', x: 43, y: 11 },
  ];
  const { toView } = PROJECTIONS.landscape;
  const moved = { id: 'prairie-2', biomeId: 'prairie' };

  it('ne dit rien tant que le lieu reste chez lui', () => {
    expect(foreignBiomeAt({ x: 27, y: 58 }, nodes, moved, toView)).toBeNull();
  });

  it('signale la région d’accueil quand le lieu y est lâché', () => {
    // Posé sur foret-1 : la bulle de la prairie irait le chercher là-haut.
    expect(foreignBiomeAt({ x: 32, y: 21 }, nodes, moved, toView)).toBe('foret');
  });

  it('ne dit rien pour un lieu lâché loin de toute région', () => {
    expect(foreignBiomeAt({ x: 85, y: 85 }, nodes, moved, toView)).toBeNull();
  });

  it('ignore le lieu déplacé lui-même', () => {
    const alone: PlacedNode[] = [{ id: 'seul', biomeId: 'prairie', x: 40, y: 40 }];
    expect(foreignBiomeAt({ x: 40, y: 40 }, alone, { id: 'seul', biomeId: 'prairie' }, toView)).toBeNull();
  });
});

describe('Contenu livré', () => {
  it('place tous ses lieux dans la boîte utile', () => {
    const outside = defaultContentBundle()
      .nodes.filter(
        (node) =>
          node.x < NODE_BOUNDS.minX ||
          node.x > NODE_BOUNDS.maxX ||
          node.y < NODE_BOUNDS.minY ||
          node.y > NODE_BOUNDS.maxY,
      )
      .map((node) => `${node.label} (${node.x}, ${node.y})`);
    expect(outside).toEqual([]);
  });
});
