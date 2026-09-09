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
      return {
        x: left.x,
        y: Math.max(4, left.y - ZONE_R - 3),
        anchor: 'middle',
      };
    },
  },
  portrait: {
    w: 100,
    h: 150,
    toView: (node) => ({ x: P_X0 + node.y * P_SX, y: P_Y0 + node.x * P_SY }),
    fromView: (point) => ({
      x: (point.y - P_Y0) / P_SY,
      y: (point.x - P_X0) / P_SX,
    }),
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
/** Distance en deca de laquelle un lieu est « chez » une region etrangere. */
export const STRAY_REACH = ZONE_R * 2;

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

  // A portee d'une bulle etrangere : un lieu ne se pose jamais SUR un autre
  // (il s'ecarte), il atterrit donc toujours a cote — d'ou ce rayon large.
  if (!foreign || foreign.distance > STRAY_REACH) return null;
  return foreign.distance < home ? foreign.biomeId : null;
}

/* ------------------------------------------------------------------ *
 * Étiquettes : elles ne se chevauchent JAMAIS.
 * ------------------------------------------------------------------ */

/**
 * Métriques du texte, en unités du repère.
 *
 * On ne mesure pas le texte rendu : ce serait un second passage de rendu, et
 * le résultat dépendrait de la police chargée. On l'ESTIME, avec de la marge,
 * à partir des tailles de `play.css` — et le test de bout en bout mesure les
 * vrais rectangles pour vérifier que l'estimation reste du bon côté.
 */
export const NODE_LABEL_FONT = 3.6;
export const ZONE_LABEL_FONT = 3.4;
/** Largeur moyenne d'un caractère, en em : gras arrondi, minuscules. */
const NODE_CHAR_EM = 0.64;
/** Capitales espacées (letter-spacing 0.08em) : nettement plus larges. */
const ZONE_CHAR_EM = 0.86;
/*
 * Hauteur d'une ligne, CALIBRÉE sur le rendu réel (sonde iPad, police 3.6) :
 * 3.36 unité au-dessus de la ligne de base, 0.92 au-dessous, halo compris.
 *
 * Surestimer coûte cher : la place « dessous », qui est la bonne, était
 * comptée comme touchant le pictogramme du lieu, et chaque étiquette partait
 * se loger de travers. On garde une petite marge, pas une grosse.
 */
const ASCENT = 0.86;
const DESCENT = 0.26;
/** Halo clair autour des lettres (`stroke-width` de `play.css`), et la marge. */
const HALO = 0.3;

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface PlacedLabel extends ZoneLabel {
  box: Box;
  /** Le texte, sur une ou deux lignes (titres de région longs). */
  lines: string[];
  /**
   * Le point auquel rattacher l'étiquette par un trait, quand elle a dû aller
   * chercher sa place loin de son lieu. `null` la plupart du temps : une
   * étiquette posée juste sous son lieu se passe de trait.
   */
  leader: { from: Point; to: Point } | null;
}

/** Interligne d'un titre de région sur deux lignes, en unités du repère. */
export const ZONE_LINE_H = ZONE_LABEL_FONT * 1.15;

/**
 * Un titre de région long tient sur DEUX lignes : « Prairie des Premiers Pas »
 * d'un seul tenant occupe près de la moitié de la carte et ne trouve plus de
 * place libre. On coupe à l'espace le plus proche du milieu.
 */
export function wrapZoneLabel(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= 10 || !trimmed.includes(' ')) return [trimmed];
  const middle = trimmed.length / 2;
  let cut = -1;
  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed[i] === ' ' && (cut < 0 || Math.abs(i - middle) < Math.abs(cut - middle))) cut = i;
  }
  return cut < 0 ? [trimmed] : [trimmed.slice(0, cut), trimmed.slice(cut + 1)];
}

function textBox(
  x: number,
  baseline: number,
  anchor: ZoneLabel['anchor'],
  width: number,
  font: number,
  extraLines = 0,
  lineHeight = 0,
): Box {
  const left = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
  return {
    left: left - HALO,
    right: left + width + HALO,
    // `baseline` est celle de la PREMIÈRE ligne : les ascendantes au-dessus,
    // un peu de descendante au-dessous, plus les lignes suivantes.
    top: baseline - font * ASCENT - HALO,
    bottom: baseline + font * DESCENT + HALO + extraLines * lineHeight,
  };
}

export function nodeLabelWidth(text: string): number {
  return Math.max(1, text.length) * NODE_LABEL_FONT * NODE_CHAR_EM;
}

export function zoneLabelWidth(text: string): number {
  return Math.max(1, text.length) * ZONE_LABEL_FONT * ZONE_CHAR_EM;
}

function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

function outsideArea(box: Box, w: number, h: number): number {
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  const dx = Math.max(0, -box.left) + Math.max(0, box.right - w);
  const dy = Math.max(0, -box.top) + Math.max(0, box.bottom - h);
  return dx * height + dy * width;
}

function centreOf(box: Box): Point {
  return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
}

function contains(box: Box, point: Point): boolean {
  return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
}

function circleBox(centre: Point, r: number): Box {
  return {
    left: centre.x - r,
    right: centre.x + r,
    top: centre.y - r,
    bottom: centre.y + r,
  };
}

/**
 * Ce qu'une étiquette doit contourner, et à quel prix.
 *
 * Les poids ne se comparent pas entre eux à surface égale : recouvrir un
 * PICTOGRAMME est rédhibitoire — l'enfant ne reconnaîtrait plus le lieu —
 * alors que deux textes qui se frôlent restent le dernier recours acceptable.
 * D'où un écart d'un ordre de grandeur, et non un simple facteur trois : sans
 * cela, un petit chevauchement d'icône l'emportait sur un grand de texte.
 */
interface Obstacle {
  box: Box;
  weight: number;
  /**
   * `area` (défaut) : le prix est proportionnel à la surface recouverte.
   * `centre` : prix forfaitaire si le milieu de l'étiquette tombe dedans.
   *
   * Une bulle de région fait plusieurs centaines d'unités carrées : comptée
   * en surface, l'éviter écrasait tout le reste et envoyait les titres à
   * l'autre bout de la carte. Ce qui compte pour eux est binaire — « ce titre
   * a l'air de désigner la région voisine » — d'où ce second mode.
   */
  mode?: 'area' | 'centre';
}

/** Sortir du cadre est le pire : l'étiquette serait rognée, donc illisible. */
const WEIGHT_OUTSIDE = 90;
const WEIGHT_ICON = 60;
const WEIGHT_AVATAR = 30;
const WEIGHT_TEXT = 1;
/** Titre posé DANS la bulle d'une autre région : trompeur, donc à éviter. */
const WEIGHT_FOREIGN_BUBBLE = 6;

interface Candidate extends ZoneLabel {
  box: Box;
  /**
   * Distance du lieu (ou de la bulle) à l'étiquette : à chevauchement égal, la
   * plus proche gagne. MESURÉE, jamais devinée d'après l'ordre d'essai — sinon
   * « à gauche » coûtait plus cher que « à droite » sans aucune raison.
   */
  slide: number;
}

/** Distance d'un point au bord d'une boîte (0 s'il est dedans). */
function distanceToBox(box: Box, point: Point): number {
  const dx = Math.max(box.left - point.x, 0, point.x - box.right);
  const dy = Math.max(box.top - point.y, 0, point.y - box.bottom);
  return Math.hypot(dx, dy);
}

/**
 * Choisit, parmi des emplacements candidats classés par préférence, le premier
 * qui ne recouvre RIEN. Faute de mieux, celui qui recouvre le moins : une
 * carte trop dense ne peut pas être parfaite, mais elle reste la plus lisible
 * possible — et la validation du contenu signale les lieux trop proches.
 */
function pickCandidate(
  candidates: Candidate[],
  obstacles: Obstacle[],
  w: number,
  h: number,
): Candidate {
  let best = candidates[0]!;
  let bestScore = Number.POSITIVE_INFINITY;
  candidates.forEach((candidate, index) => {
    let score = outsideArea(candidate.box, w, h) * WEIGHT_OUTSIDE;
    for (const obstacle of obstacles) {
      score +=
        obstacle.mode === 'centre'
          ? contains(obstacle.box, centreOf(candidate.box))
            ? obstacle.weight
            : 0
          : overlapArea(candidate.box, obstacle.box) * obstacle.weight;
    }
    // À score égal, la place la plus proche l'emporte, puis l'ordre de préférence.
    // (Une unité de glissement pèse moins qu'un recouvrement d'un carré d'unité.)
    score += candidate.slide * 0.06 + index * 1e-4;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  return best;
}

/**
 * Au-dela de cette distance entre le bord d'un lieu et son etiquette, le lien
 * ne va plus de soi : on le trace.
 */
const LEADER_FROM = 8;

/** Trait de rattachement, si l'etiquette a du s'eloigner de son lieu. */
function leaderFor(at: Point, radius: number, label: Candidate): PlacedLabel['leader'] {
  const anchorPoint: Point = {
    x:
      label.anchor === 'start'
        ? label.box.left
        : label.anchor === 'end'
          ? label.box.right
          : (label.box.left + label.box.right) / 2,
    y: (label.box.top + label.box.bottom) / 2,
  };
  const dx = anchorPoint.x - at.x;
  const dy = anchorPoint.y - at.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= radius + LEADER_FROM) return null;
  const unit = { x: dx / distance, y: dy / distance };
  return {
    from: {
      x: at.x + unit.x * (radius + 1.2),
      y: at.y + unit.y * (radius + 1.2),
    },
    to: { x: anchorPoint.x - unit.x * 1.2, y: anchorPoint.y - unit.y * 1.2 },
  };
}

export interface LabelNode {
  id: string;
  /** Centre du lieu, en unités du repère. */
  at: Point;
  radius: number;
  label: string;
}

export interface LabelZone {
  id: string;
  /** Lieux de la région, dans le repère, le lieu préféré pour le titre en premier. */
  points: Point[];
  label: string;
}

export interface LabelLayout {
  nodes: Map<string, PlacedLabel>;
  zones: Map<string, PlacedLabel>;
}

/**
 * Pose toutes les étiquettes de la carte sans qu'aucune n'en recouvre une autre.
 *
 * L'administrateur déplace les lieux librement ; une étiquette « toujours
 * dessous » finissait sur le titre de la région voisine ou sur le nom d'un
 * autre lieu. Ici, chaque nom de lieu essaie DESSOUS, puis dessus, à droite,
 * à gauche, en coin — dans cet ordre — et prend la première place libre. Les
 * titres de région passent en dernier : ils sont les moins importants pour
 * l'enfant, et prennent la place qui reste autour de leur bulle.
 *
 * `avoid` : ce que les étiquettes doivent aussi contourner (le personnage).
 */
export function layoutLabels(
  nodes: LabelNode[],
  zones: LabelZone[],
  frame: { w: number; h: number },
  avoid: Box[] = [],
): LabelLayout {
  const { w, h } = frame;
  // Les lieux eux-mêmes : une étiquette ne passe jamais sur un pictogramme.
  const obstacles: Obstacle[] = [
    ...avoid.map((box) => ({ box, weight: WEIGHT_AVATAR })),
    // L'anneau dessiné vaut `radius + 1.4` : on protège juste un peu plus.
    ...nodes.map((node) => ({
      box: circleBox(node.at, node.radius + 1.5),
      weight: WEIGHT_ICON,
    })),
  ];
  const placedNodes = new Map<string, PlacedLabel>();
  /** Index de l'obstacle posé par chaque étiquette : il est remplacé au 2ᵉ tour. */
  const slotOf = new Map<string, number>();

  // Ordre de lecture : le résultat ne dépend pas de l'ordre du contenu.
  const ordered = [...nodes].sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x);
  /*
   * DEUX TOURS.
   *
   * Au premier, les derniers servis n'ont plus que des places lointaines. Au
   * second, chacun rejoue son choix sans compter sa propre étiquette : les
   * places libérées entre-temps le rapprochent de son lieu. Sans cela, un nom
   * partait à l'autre bout de la carte alors qu'une place s'était libérée
   * juste à côté.
   */
  const PASSES = 2;
  for (let pass = 0; pass < PASSES; pass += 1) {
    for (const node of ordered) {
      const width = nodeLabelWidth(node.label);
      const { x, y } = node.at;
      const r = node.radius;
      const f = NODE_LABEL_FONT;
      const make = (cx: number, baseline: number, anchor: ZoneLabel['anchor']): Candidate => {
        const box = textBox(cx, baseline, anchor, width, f);
        return { x: cx, y: baseline, anchor, box, slide: distanceToBox(box, node.at) };
      };
      const candidates: Candidate[] = [
        make(x, y + r + 5.2, 'middle'),
        make(x, y - r - 2.4, 'middle'),
        make(x + r + 2.4, y + 1.3, 'start'),
        make(x - r - 2.4, y + 1.3, 'end'),
        make(x + r * 0.6, y + r + 5.2, 'start'),
        make(x - r * 0.6, y + r + 5.2, 'end'),
        make(x + r * 0.6, y - r - 2.4, 'start'),
        make(x - r * 0.6, y - r - 2.4, 'end'),
        // Un cran plus loin, quand tout est pris autour du lieu.
        make(x, y + r + 9.6, 'middle'),
        make(x, y - r - 6.8, 'middle'),
        make(x + r + 2.4, y + 5.6, 'start'),
        make(x - r - 2.4, y + 5.6, 'end'),
        make(x + r + 2.4, y - 3.2, 'start'),
        make(x - r - 2.4, y - 3.2, 'end'),
      ];
      /*
       * Puis toute une couronne, tous les 30°, a deux distances : c'est elle
       * qui trouve une place quand quatre voisins entourent le lieu. L'ancrage
       * suit l'angle, pour que le texte parte du lieu au lieu de le traverser.
       */
      for (const extra of [0, 4.5, 9, 14, 19]) {
        for (let step = 0; step < 24; step += 1) {
          const angle = (step * Math.PI) / 12;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const distance = r + 2.6 + extra;
          const anchor: ZoneLabel['anchor'] = cos > 0.35 ? 'start' : cos < -0.35 ? 'end' : 'middle';
          // Sur l'axe vertical, on ecarte la ligne de base du lieu selon le sens.
          const dy = sin > 0.35 ? f * 0.85 : sin < -0.35 ? 0 : f * 0.35;
          candidates.push(
            make(x + cos * distance, y + sin * distance + dy, anchor),
          );
        }
      }
      // Au second tour, sa propre étiquette ne se fait pas obstacle à elle-même.
      const slot = slotOf.get(node.id);
      const others =
        slot === undefined ? obstacles : obstacles.filter((_, index) => index !== slot);
      const chosen = pickCandidate(candidates, others, w, h);
      placedNodes.set(node.id, {
        ...chosen,
        lines: [node.label],
        leader: leaderFor(node.at, r, chosen),
      });
      if (slot === undefined) {
        slotOf.set(node.id, obstacles.length);
        obstacles.push({ box: chosen.box, weight: WEIGHT_TEXT });
      } else {
        obstacles[slot] = { box: chosen.box, weight: WEIGHT_TEXT };
      }
    }
  }

  const placedZones = new Map<string, PlacedLabel>();
  for (const zone of zones) {
    if (zone.points.length === 0) continue;
    // Un titre pose DANS la bulle d'une AUTRE region la designerait a tort.
    const foreignBubbles: Obstacle[] = zones
      .filter((other) => other.id !== zone.id)
      .flatMap((other) =>
        other.points.map((p) => ({
          box: circleBox(p, ZONE_R),
          weight: WEIGHT_FOREIGN_BUBBLE,
          mode: 'centre' as const,
        })),
      );
    const lines = wrapZoneLabel(zone.label);
    const width = Math.max(...lines.map(zoneLabelWidth));
    const extra = lines.length - 1;
    const f = ZONE_LABEL_FONT;
    const blockHeight = extra * ZONE_LINE_H;
    const make = (
      cx: number,
      baseline: number,
      anchor: ZoneLabel['anchor'],
      from: Point,
    ): Candidate => {
      const box = textBox(cx, baseline, anchor, width, f, extra, ZONE_LINE_H);
      return { x: cx, y: baseline, anchor, box, slide: distanceToBox(box, from) };
    };
    /*
     * Autour de chaque lieu de la région : au-dessus, au-dessous, à droite, à
     * gauche — et, pour chaque côté, en GLISSANT le long de la bulle. C'est
     * ce glissement qui trouve la place libre entre deux étiquettes voisines.
     */
    const SLIDES = [0, -6, 6, -12, 12, -18, 18, -24, 24, -30, 30, -36, 36];
    const candidates: Candidate[] = [];
    for (const p of zone.points) {
      for (const away of [0, 5, 10, 16]) {
        for (const slide of SLIDES) {
          candidates.push(
            make(p.x + slide, p.y - ZONE_R - 3 - blockHeight - away, 'middle', p),
            make(p.x + slide, p.y + ZONE_R + 4.6 + away, 'middle', p),
          );
        }
        for (const slide of [0, -4, 4, -8, 8, -12, 12, -16, 16]) {
          candidates.push(
            make(p.x + ZONE_R + 2 + away, p.y + 1.2 + slide - blockHeight / 2, 'start', p),
            make(p.x - ZONE_R - 2 - away, p.y + 1.2 + slide - blockHeight / 2, 'end', p),
          );
        }
      }
    }
    const chosen = pickCandidate(candidates, [...obstacles, ...foreignBubbles], w, h);
    placedZones.set(zone.id, { ...chosen, lines, leader: null });
    obstacles.push({ box: chosen.box, weight: WEIGHT_TEXT });
  }

  return { nodes: placedNodes, zones: placedZones };
}

/* ------------------------------------------------------------------ *
 * Lieux trop proches
 * ------------------------------------------------------------------ */

/**
 * En deçà de cette distance (unités du repère, entre centres), deux lieux se
 * touchent et aucune disposition d'étiquettes ne peut plus être propre.
 */
export const MIN_NODE_GAP = NODE_R * 2 + 3.3;

function tooClose(a: Point, b: Point, toView: Projection['toView']): boolean {
  const va = toView(a);
  const vb = toView(b);
  return Math.hypot(va.x - vb.x, va.y - vb.y) < MIN_NODE_GAP;
}

/** Vrai si `position` est trop proche d'un autre lieu, dans UNE des orientations. */
export function isCrowded(position: Point, nodes: PlacedNode[], ignoreId: string | null): boolean {
  return nodes.some(
    (node) =>
      node.id !== ignoreId &&
      (tooClose(position, node, PROJECTIONS.landscape.toView) ||
        tooClose(position, node, PROJECTIONS.portrait.toView)),
  );
}

/** Paires de lieux trop proches — pour la validation du contenu. */
export function crowdedPairs<T extends PlacedNode>(nodes: T[]): Array<[T, T]> {
  const pairs: Array<[T, T]> = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      if (
        tooClose(a, b, PROJECTIONS.landscape.toView) ||
        tooClose(a, b, PROJECTIONS.portrait.toView)
      ) {
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

/**
 * Une place LIBRE près d'un point : sur la grille, dans le cadre, et à bonne
 * distance de tous les autres lieux — dans les deux orientations.
 *
 * Sert à poser un nouveau lieu à côté de son voisin, et à écarter un lieu
 * qu'on lâche sur un autre : on ne pose jamais deux lieux l'un sur l'autre.
 * On cherche en anneaux de plus en plus larges ; la première place libre
 * l'emporte, et faute de place on rend simplement la position rangée.
 */
export function freeSpotNear(
  origin: Point,
  nodes: PlacedNode[],
  ignoreId: string | null = null,
  preferred: Point | null = null,
): Point {
  const start = placeNode(preferred ?? origin);
  if (!isCrowded(start, nodes, ignoreId)) return start;

  const DIRECTIONS = 16;
  for (let ring = 1; ring <= 6; ring += 1) {
    const distance = ring * 6;
    // On part de la direction qui va de l'origine vers la place souhaitée :
    // le lieu se retrouve du côté où l'adulte l'a lâché.
    const base = preferred ? Math.atan2(preferred.y - origin.y, preferred.x - origin.x) : 0;
    for (let step = 0; step < DIRECTIONS; step += 1) {
      const angle = base + (step * 2 * Math.PI) / DIRECTIONS;
      const spot = placeNode({
        x: start.x + Math.cos(angle) * distance,
        y: start.y + Math.sin(angle) * distance,
      });
      if (!isCrowded(spot, nodes, ignoreId)) return spot;
    }
  }
  return start;
}
