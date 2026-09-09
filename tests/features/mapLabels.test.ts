import { describe, expect, it } from 'vitest';
import {
  MIN_NODE_GAP,
  NODE_BOUNDS,
  NODE_R,
  NODE_R_GYM,
  PROJECTIONS,
  crowdedPairs,
  freeSpotNear,
  isCrowded,
  layoutLabels,
  type Box,
  type LabelNode,
  type LabelZone,
  type PlacedNode,
} from '../../src/features/world-map/mapGeometry';
import { defaultContentBundle } from '../../src/content/defaultContent';

/**
 * LES TEXTES DE LA CARTE NE SE CHEVAUCHENT JAMAIS.
 *
 * L'administrateur déplace et renomme les lieux librement : une étiquette
 * « toujours dessous » finissait sur le titre de la région voisine. Ces tests
 * posent les étiquettes sur le contenu livré ET sur des cartes volontairement
 * serrées, dans les deux orientations, et vérifient qu'aucun rectangle n'en
 * recouvre un autre.
 */
const ORIENTATIONS = ['landscape', 'portrait'] as const;

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Prépare lieux et régions dans le repère d'une orientation. */
function scene(
  nodes: Array<{ id: string; biomeId: string; x: number; y: number; label: string; gym?: boolean }>,
  orientation: (typeof ORIENTATIONS)[number],
  zoneNames: Record<string, string>,
): { labelNodes: LabelNode[]; zones: LabelZone[]; frame: { w: number; h: number } } {
  const { toView, w, h } = PROJECTIONS[orientation];
  const labelNodes = nodes.map((node) => ({
    id: node.id,
    at: toView(node),
    radius: node.gym ? NODE_R_GYM : NODE_R,
    label: node.label,
  }));
  const zones = Object.entries(zoneNames)
    .map(([biomeId, label]) => ({
      id: biomeId,
      points: nodes.filter((node) => node.biomeId === biomeId).map(toView),
      label,
    }))
    .filter((zone) => zone.points.length > 1);
  return { labelNodes, zones, frame: { w, h } };
}

function collisions(
  layout: ReturnType<typeof layoutLabels>,
  labelNodes: LabelNode[],
  frame: { w: number; h: number },
): string[] {
  const boxes: Array<{ id: string; box: Box }> = [
    ...[...layout.nodes].map(([id, placed]) => ({ id: `lieu ${id}`, box: placed.box })),
    ...[...layout.zones].map(([id, placed]) => ({ id: `région ${id}`, box: placed.box })),
  ];
  const found: string[] = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const area = overlap(boxes[i]!.box, boxes[j]!.box);
      if (area > 0.5) found.push(`${boxes[i]!.id} ↔ ${boxes[j]!.id} (${area.toFixed(1)})`);
    }
    const box = boxes[i]!.box;
    if (box.left < -0.5 || box.top < -0.5 || box.right > frame.w + 0.5 || box.bottom > frame.h + 0.5) {
      found.push(`${boxes[i]!.id} sort du cadre`);
    }
    // Une étiquette ne passe jamais sur le pictogramme d'un lieu.
    for (const node of labelNodes) {
      const circle: Box = {
        left: node.at.x - node.radius,
        right: node.at.x + node.radius,
        top: node.at.y - node.radius,
        bottom: node.at.y + node.radius,
      };
      if (overlap(box, circle) > 0.5) found.push(`${boxes[i]!.id} recouvre le lieu ${node.id}`);
    }
  }
  return found;
}

const ZONE_NAMES: Record<string, string> = {
  prairie: 'Prairie',
  foret: 'Forêt',
  riviere: 'Rivière',
  grotte: 'Rochers',
};

describe('Contenu livré', () => {
  for (const orientation of ORIENTATIONS) {
    it(`${orientation} : aucune étiquette n’en recouvre une autre`, () => {
      const nodes = defaultContentBundle().nodes;
      const { labelNodes, zones, frame } = scene(
        nodes.map((node) => ({ ...node, gym: node.kind === 'GYM' })),
        orientation,
        ZONE_NAMES,
      );
      const layout = layoutLabels(labelNodes, zones, frame);
      expect(layout.nodes.size).toBe(nodes.length);
      expect(layout.zones.size).toBe(4);
      expect(collisions(layout, labelNodes, frame)).toEqual([]);
    });
  }
});

describe('Cartes serrées', () => {
  /*
   * La situation du rapport de bogue : un titre de région long, posé
   * au-dessus du lieu le plus à gauche… juste sur le nom d'un lieu voisin.
   */
  const crowded = [
    { id: 'centre', biomeId: 'centre', x: 7, y: 50, label: 'Centre' },
    { id: 'p1', biomeId: 'prairie', x: 19, y: 50, label: 'Prairie' },
    { id: 'p2', biomeId: 'prairie', x: 29, y: 63, label: 'Pré' },
    { id: 'p3', biomeId: 'prairie', x: 40, y: 55, label: 'Chemin' },
    { id: 'r1', biomeId: 'riviere', x: 52, y: 40, label: 'Rivière' },
    { id: 'r2', biomeId: 'riviere', x: 60, y: 62, label: 'Cascade' },
    { id: 'g1', biomeId: 'grotte', x: 68, y: 24, label: 'Arène de Pierre', gym: true },
    { id: 'g2', biomeId: 'grotte', x: 78, y: 48, label: 'Montagne' },
    { id: 'f1', biomeId: 'foret', x: 22, y: 20, label: 'Clairière' },
    { id: 'f2', biomeId: 'foret', x: 36, y: 16, label: 'Sous-bois' },
    { id: 'f3', biomeId: 'foret', x: 50, y: 18, label: 'Lisière' },
  ];
  const longNames = {
    prairie: 'Prairie des Premiers Pas',
    foret: 'Forêt de Jade',
    riviere: 'Rivière Claire',
    grotte: 'Chemin des Pierres',
  };

  for (const orientation of ORIENTATIONS) {
    it(`${orientation} : titres longs et lieux rapprochés, sans chevauchement`, () => {
      const { labelNodes, zones, frame } = scene(crowded, orientation, longNames);
      const layout = layoutLabels(labelNodes, zones, frame);
      expect(collisions(layout, labelNodes, frame)).toEqual([]);
    });
  }

  it('déplace une étiquette au lieu de la laisser sur celle d’un voisin', () => {
    // Deux lieux côte à côte, à la distance minimale : « dessous » pour les
    // deux ne tient pas, l'un des deux change de côté.
    const pair = [
      { id: 'a', biomeId: 'prairie', x: 40, y: 50, label: 'Grand jardin' },
      { id: 'b', biomeId: 'prairie', x: 50, y: 50, label: 'Grand pré' },
    ];
    const { labelNodes, zones, frame } = scene(pair, 'landscape', ZONE_NAMES);
    const layout = layoutLabels(labelNodes, zones, frame);
    expect(collisions(layout, labelNodes, frame)).toEqual([]);
    const anchors = [layout.nodes.get('a')!, layout.nodes.get('b')!].map((l) => `${l.anchor}@${l.y}`);
    expect(new Set(anchors).size).toBe(2);
  });

  it('est déterministe : le même contenu donne la même disposition', () => {
    const { labelNodes, zones, frame } = scene(crowded, 'landscape', longNames);
    const first = layoutLabels(labelNodes, zones, frame);
    const second = layoutLabels([...labelNodes].reverse(), zones, frame);
    expect([...second.nodes]).toEqual([...first.nodes]);
  });

  it('rattache par un trait une étiquette partie loin, et pas les autres', () => {
    const { labelNodes, zones, frame } = scene(crowded, 'landscape', longNames);
    const layout = layoutLabels(labelNodes, zones, frame);
    // Une carte tenable : personne n'a eu besoin de partir loin.
    expect([...layout.nodes.values()].every((label) => label.leader === null)).toBe(true);

    // Six lieux serrés autour du même point : quelqu'un devra s'éloigner.
    const pile = Array.from({ length: 6 }, (_, index) => ({
      id: `n${index}`,
      biomeId: 'prairie',
      x: 40 + (index % 3) * 6,
      y: 45 + Math.floor(index / 3) * 6,
      label: `Lieu très long numéro ${index}`,
    }));
    const dense = scene(pile, 'landscape', ZONE_NAMES);
    const tight = layoutLabels(dense.labelNodes, dense.zones, dense.frame);
    const far = [...tight.nodes.values()].filter((label) => label.leader !== null);
    expect(far.length).toBeGreaterThan(0);
    // Le trait part du bord du lieu et s'arrête au bord de l'étiquette.
    for (const label of far) {
      const leader = label.leader!;
      expect(Math.hypot(leader.to.x - leader.from.x, leader.to.y - leader.from.y)).toBeGreaterThan(0);
      expect(leader.to.x).toBeGreaterThanOrEqual(label.box.left - 2);
      expect(leader.to.x).toBeLessThanOrEqual(label.box.right + 2);
    }
  });

  it('contourne ce qu’on lui demande d’éviter (le personnage)', () => {
    const one = [{ id: 'a', biomeId: 'prairie', x: 40, y: 50, label: 'Prairie' }];
    const { labelNodes, zones, frame } = scene(one, 'landscape', ZONE_NAMES);
    const at = labelNodes[0]!.at;
    // Un obstacle posé exactement là où l'étiquette irait « dessous ».
    const below: Box = { left: at.x - 12, right: at.x + 12, top: at.y + NODE_R, bottom: at.y + NODE_R + 8 };
    const layout = layoutLabels(labelNodes, zones, frame, [below]);
    expect(overlap(layout.nodes.get('a')!.box, below)).toBe(0);
  });
});

describe('Lieux trop proches', () => {
  const nodes: PlacedNode[] = [
    { id: 'a', biomeId: 'prairie', x: 30, y: 50 },
    { id: 'b', biomeId: 'prairie', x: 50, y: 50 },
  ];

  it('signale deux lieux qui se touchent, dans une orientation ou l’autre', () => {
    expect(crowdedPairs(nodes)).toEqual([]);
    // Même abscisse, ordonnées voisines : ils se touchent en paysage.
    expect(crowdedPairs([nodes[0]!, { id: 'c', biomeId: 'prairie', x: 30, y: 58 }])).toHaveLength(1);
    // Écartés en paysage (×1.6) mais empilés en portrait (×0.88).
    expect(isCrowded({ x: 30, y: 62 }, nodes, null)).toBe(true);
  });

  it('ignore le lieu que l’on déplace lui-même', () => {
    expect(isCrowded({ x: 31, y: 51 }, nodes, 'a')).toBe(false);
  });

  it('freeSpotNear rend la place demandée quand elle est libre', () => {
    expect(freeSpotNear({ x: 30, y: 50 }, nodes, null, { x: 70, y: 40 })).toEqual({ x: 70, y: 40 });
  });

  it('freeSpotNear écarte un lieu lâché sur un autre', () => {
    const spot = freeSpotNear({ x: 30, y: 50 }, nodes, null, { x: 51, y: 50 });
    expect(isCrowded(spot, nodes, null)).toBe(false);
    expect(spot.x).toBeGreaterThanOrEqual(NODE_BOUNDS.minX);
    expect(spot.x).toBeLessThanOrEqual(NODE_BOUNDS.maxX);
    expect(spot.y).toBeGreaterThanOrEqual(NODE_BOUNDS.minY);
    expect(spot.y).toBeLessThanOrEqual(NODE_BOUNDS.maxY);
    // Il reste du côté où on l'a lâché.
    expect(Math.hypot(spot.x - 51, spot.y - 50)).toBeLessThan(MIN_NODE_GAP * 1.5);
  });

  it('freeSpotNear trouve une place à côté d’un voisin, pour un nouveau lieu', () => {
    const bundle = defaultContentBundle();
    const parent = bundle.nodes.find((node) => node.id === 'prairie-2')!;
    const spot = freeSpotNear(parent, bundle.nodes, null, { x: parent.x + 10, y: parent.y });
    expect(isCrowded(spot, bundle.nodes, null)).toBe(false);
    expect(Math.hypot(spot.x - parent.x, spot.y - parent.y)).toBeLessThan(30);
  });
});
