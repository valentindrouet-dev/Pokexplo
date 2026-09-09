import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Biome, MapNode, NodeState } from '../../types';
import { canTravelTo, nodeState, pathBetween } from '../../game-engine';
import {
  BadgeChip,
  IconBadge,
  IconLock,
  IconPencil,
  IconPlus,
  IconSparkle,
  LoadingBall,
  PrimaryButton,
  SecondaryButton,
  SoftPanel,
  VoiceButton,
} from '../../ui';
import { spokenName } from '../../app/providers/useScreenVoice';
import { useAudio } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useNavigation } from '../../app/router';
import { useEditMode } from '../../app/providers/EditModeProvider';
import { PlayScreen } from '../play/PlayScreen';
import { useScreenVoice } from '../../app/providers/useScreenVoice';
import { SCREEN_VOICES } from '../../content/voices';
import { useOrientation } from '../../utils/useOrientation';
import { useAdminDraftOptional } from '../admin/AdminDraftContext';
import { createNodeAfter } from '../admin/nodeFactory';
import { uid } from '../../utils/id';
import {
  HIT_R,
  NODE_R,
  NODE_R_GYM,
  PROJECTIONS,
  ZONE_LINE_H,
  ZONE_LINK_W,
  ZONE_R,
  foreignBiomeAt,
  freeSpotNear,
  layoutLabels,
  placeNode,
  type Box,
  type LabelZone,
  type PlacedLabel,
  type Point,
  type Zone as ZoneShapeData,
} from './mapGeometry';
import { PLACE_ICONS, placeIconFor } from './placeIcons';

const TRAVEL_STEP_MS = 320;

/**
 * Au-dela de ce deplacement (en unites du repere), on ne considere plus le
 * geste comme un appui : c'est un glisser. En deca, l'adulte peut continuer a
 * parcourir l'aventure d'une simple touche, meme en mode edition.
 */
const DRAG_THRESHOLD = 2;

/** Un pas de clavier : la meme distance dans les deux orientations. */
const NUDGE_STEP = 2;

interface DragState {
  id: string;
  pointerId: number;
  /** Position courante, en pourcentages, deja rangee sur la grille. */
  at: Point;
  /** Point de depart, en unites du repere : sert a mesurer le seuil. */
  origin: Point;
  moved: boolean;
}

/** Couleur de fond du nœud selon son etat (§11). */
const STATE_FILL: Record<NodeState, string> = {
  LOCKED: 'var(--color-locked)',
  AVAILABLE: 'var(--color-aqua)',
  CURRENT: 'var(--color-yellow)',
  COMPLETED: 'var(--color-green)',
  SPECIAL_EVENT: 'var(--color-lavender)',
};

/**
 * Pictogramme de lieu (§147).
 *
 * On n'affiche PLUS un cadenas a la place du lieu : l'enfant doit reconnaitre
 * d'abord OU il va (une fleur, une feuille, un rocher…). L'etat « ferme » est
 * porte par la couleur, la transparence et une petite pastille en coin (§142).
 * Le dessin vient de `placeIcons` : celui choisi par l'administrateur, sinon
 * celui de la region.
 */
function PlaceIcon({ node, biome }: { node: MapNode; biome: Biome | null }) {
  const { Icon } = PLACE_ICONS[placeIconFor(node, biome)];
  return <Icon size={24} />;
}

/**
 * Pastille d'édition, en SVG.
 *
 * La carte est un dessin : une pastille HTML ne peut pas s'y poser. On la
 * dessine donc dans le même repère, avec sa propre zone tactile — et le lieu
 * garde son action de jeu, pour que l'adulte puisse continuer à parcourir
 * l'aventure tout en la modifiant.
 */
function MapEditBadge({
  x,
  y,
  label,
  onOpen,
  variant = 'edit',
}: {
  x: number;
  y: number;
  label: string;
  onOpen: () => void;
  /** `add` : le « + » qui pose un nouveau lieu à côté de celui-ci. */
  variant?: 'edit' | 'add';
}) {
  return (
    <g
      className={variant === 'add' ? 'map__add' : 'map__edit'}
      role="button"
      tabIndex={0}
      aria-label={label}
      /*
       * Le crayon est POSE sur le lieu : sans cela, l'appui demarrait un
       * deplacement, la carte capturait le pointeur, et le `click` du crayon
       * n'etait jamais emis — toucher le crayon lancait un voyage.
       */
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.stopPropagation();
          onOpen();
        }
      }}
    >
      <circle cx={x} cy={y} r={6} fill="transparent" />
      <circle className={variant === 'add' ? 'map__add-dot' : 'map__edit-dot'} cx={x} cy={y} r={3.4} />
      <g transform={`translate(${x - 2.2} ${y - 2.2}) scale(0.183)`} pointerEvents="none">
        {variant === 'add' ? <IconPlus size={24} /> : <IconPencil size={24} />}
      </g>
    </g>
  );
}

/**
 * Forme souple d'une region : l'union de cercles poses sur les lieux et de
 * liaisons epaisses entre eux. L'opacite est portee par le groupe, sinon les
 * recouvrements s'assombriraient et laisseraient voir les coutures.
 */
function ZoneShape({
  zone,
  color,
  grow,
  className,
}: {
  zone: ZoneShapeData;
  color: string;
  grow: number;
  className: string;
}) {
  return (
    <g className={className} style={{ color }}>
      {zone.inner.map((segment, index) => (
        <line
          key={index}
          x1={segment.a.x}
          y1={segment.a.y}
          x2={segment.b.x}
          y2={segment.b.y}
          strokeWidth={ZONE_LINK_W + grow * 2}
          strokeLinecap="round"
          stroke="currentColor"
        />
      ))}
      {zone.points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r={ZONE_R + grow} fill="currentColor" />
      ))}
    </g>
  );
}

/**
 * CARTE DU MONDE (CONCEPTION §10-11).
 *
 * Pas de monde ouvert : l'enfant touche une destination et son personnage s'y
 * rend automatiquement, en suivant les chemins ouverts.
 *
 * Lecture de la carte :
 *  - une BULLE souple regroupe les lieux d'une meme region ;
 *  - un CHEMIN epais relie les lieux et montre la progression possible ;
 *  - un PICTOGRAMME dit de quel type de lieu il s'agit.
 */
export function MapScreen() {
  // §192 — l'écran dit ce qu'on peut y faire, à l'arrivée.
  useScreenVoice(SCREEN_VOICES.map);
  const { navigate } = useNavigation();
  const { editing, open: openEditor } = useEditMode();
  const { bundle, biome } = useContent();
  const { save, dispatch } = useGame();
  const { speak, speakMessage, buttonState } = useAudio();
  const [walking, setWalking] = useState<string[] | null>(null);
  const [step, setStep] = useState(0);
  const orientation = useOrientation();
  const { w: VIEW_W, h: VIEW_H, toView, fromView } = PROJECTIONS[orientation];

  /*
   * DÉPLACER LES LIEUX (mode édition).
   *
   * Tant que le doigt est posé, la position vit ICI et non dans le brouillon :
   * on ne réécrit pas le contenu soixante fois par seconde. Tout ce qui est
   * dessiné à partir d'un lieu — bulles de région, chemins, étiquettes — passe
   * par `place()`, si bien que la région se reforme sous le doigt et que
   * l'adulte voit tout de suite ce qu'il fabrique.
   */
  const drafting = useAdminDraftOptional();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  /** Lieu lâché chez une autre région : on propose de l'y rattacher. */
  const [strayNodeId, setStrayNodeId] = useState<string | null>(null);
  const [strayBiomeId, setStrayBiomeId] = useState<string | null>(null);
  /*
   * Position ecrite, en attendant que le brouillon revienne.
   *
   * Le chemin est long — brouillon, previsualisation, contenu — et dure une ou
   * deux images. Sans ce relais, le lieu revenait a son ancienne place juste
   * apres le lacher, puis sautait a la nouvelle.
   */
  const [pending, setPending] = useState<{ id: string; at: Point } | null>(null);

  /**
   * SÉLECTION EN DEUX TEMPS (UI_DESIGN §193).
   *
   * Un simple toucher partait aussitôt en voyage : un doigt qui glisse sur
   * l'écran suffisait à quitter le Centre. Le premier toucher SÉLECTIONNE et
   * dit le nom du lieu ; « Y aller ! » — ou un second toucher sur le même
   * lieu — lance le déplacement.
   */
  const [pickedId, setPickedId] = useState<string | null>(null);

  const positionOf = useCallback(
    (node: MapNode): Point => {
      if (drag?.id === node.id) return drag.at;
      if (pending?.id === node.id) return pending.at;
      return node;
    },
    [drag, pending],
  );
  const place = useCallback((node: MapNode): Point => toView(positionOf(node)), [toView, positionOf]);

  const states = useMemo(() => {
    if (!bundle || !save) return new Map<string, NodeState>();
    return new Map(bundle.nodes.map((node) => [node.id, nodeState(node, save, bundle)]));
  }, [bundle, save]);

  /** Les liens sont dedupliques : un chemin A→B et B→A n'est trace qu'une fois. */
  const links = useMemo(() => {
    if (!bundle) return [];
    const byId = new Map(bundle.nodes.map((node) => [node.id, node]));
    const seen = new Set<string>();
    const result: Array<{ key: string; from: MapNode; to: MapNode }> = [];
    for (const node of bundle.nodes) {
      for (const targetId of node.connections) {
        const target = byId.get(targetId);
        if (!target) continue;
        const key = [node.id, targetId].sort().join('~');
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ key, from: node, to: target });
      }
    }
    return result;
  }, [bundle]);

  /** Une bulle par region : cercles et liaisons epaisses fusionnes visuellement. */
  const zones = useMemo(() => {
    if (!bundle) return [];
    return bundle.biomes
      .map((item) => {
        const nodes = bundle.nodes.filter((node) => node.biomeId === item.id);
        if (nodes.length === 0) return null;
        const points = nodes.map(place);
        const inner = links
          .filter((link) => link.from.biomeId === item.id && link.to.biomeId === item.id)
          .map((link) => ({ a: place(link.from), b: place(link.to) }));
        return {
          biome: item,
          points,
          inner,
          // Une region d'un seul lieu n'a pas besoin d'etiquette : le nom du
          // lieu, juste en dessous, suffit et evite un chevauchement.
          showLabel: nodes.length > 1,
          // Le lieu prefere pour le titre en premier : au-dessus du plus a
          // gauche en paysage, a cote du plus haut en portrait.
          preferred: [...points].sort((a, b) =>
            orientation === 'portrait' ? a.y - b.y || a.x - b.x : a.x - b.x || a.y - b.y,
          ),
        };
      })
      .filter((zone): zone is NonNullable<typeof zone> => zone !== null);
  }, [bundle, links, place, orientation]);

  const currentNode = bundle?.nodes.find((node) => node.id === save?.state.currentNode) ?? null;
  const currentBiome = biome(currentNode?.biomeId);

  const walkingNodeId = walking?.[step] ?? save?.state.currentNode ?? null;
  const avatarNode =
    bundle?.nodes.find((node) => node.id === walkingNodeId) ?? currentNode ?? null;
  const avatar = avatarNode ? place(avatarNode) : null;

  /*
   * LES TEXTES NE SE CHEVAUCHENT JAMAIS.
   *
   * Noms de lieux et titres de region sont poses ensemble, apres coup, par
   * `layoutLabels` : chaque nom prend la premiere place libre autour de son
   * lieu, les titres prennent ce qui reste autour de leur bulle. Recalcule a
   * chaque image pendant un glisser : l'adulte voit les etiquettes s'ecarter.
   */
  const labels = useMemo(() => {
    if (!bundle) return { nodes: new Map<string, PlacedLabel>(), zones: new Map<string, PlacedLabel>() };
    const labelNodes = bundle.nodes.map((node) => ({
      id: node.id,
      at: place(node),
      radius: node.kind === 'GYM' ? NODE_R_GYM : NODE_R,
      label: node.label,
    }));
    const labelZones: LabelZone[] = zones
      .filter((zone) => zone.showLabel)
      .map((zone) => ({
        id: zone.biome.id,
        points: zone.preferred,
        label: zone.biome.shortName ?? zone.biome.name,
      }));
    // Le personnage se tient au-dessus du lieu courant : on ne le recouvre pas.
    const avoid: Box[] = avatar
      ? [{ left: avatar.x - 3.6, right: avatar.x + 3.6, top: avatar.y - 13.2, bottom: avatar.y - 5.9 }]
      : [];
    /*
     * En edition, le crayon et le « + » sont des pastilles PLEINES posees sur
     * la carte : une etiquette passant dessous serait masquee. Elles comptent
     * donc parmi les obstacles — d'ou des etiquettes qui s'ecartent un peu
     * quand on entre en edition, et reviennent en sortant.
     */
    if (editing) {
      for (const node of labelNodes) {
        const r = node.radius;
        for (const side of [-1, 1]) {
          const cx = node.at.x + side * r * 0.95;
          const cy = node.at.y - r * 0.95;
          avoid.push({ left: cx - 4.2, right: cx + 4.2, top: cy - 4.2, bottom: cy + 4.2 });
        }
      }
    }
    return layoutLabels(labelNodes, labelZones, { w: VIEW_W, h: VIEW_H }, avoid);
  }, [bundle, zones, place, avatar, editing, VIEW_W, VIEW_H]);

  const arrive = useCallback(
    async (nodeId: string): Promise<void> => {
      if (!bundle) return;
      const node = bundle.nodes.find((item) => item.id === nodeId);
      if (!node) return;
      await dispatch({ kind: 'TRAVEL', nodeId });
      speak(node.arrivalVoiceId);

      if (node.kind === 'GYM' && node.gymId) {
        navigate({ name: 'gym', gymId: node.gymId });
        return;
      }
      if (node.kind === 'CENTER') {
        navigate({ name: 'center' });
        return;
      }
      navigate({ name: 'encounter', nodeId });
    },
    [bundle, dispatch, navigate, speak],
  );

  useEffect(() => {
    if (!pending) return;
    const node = bundle?.nodes.find((entry) => entry.id === pending.id);
    if (node && node.x === pending.at.x && node.y === pending.at.y) setPending(null);
  }, [bundle, pending]);

  useEffect(() => {
    if (!walking) return undefined;
    if (step >= walking.length - 1) {
      const destination = walking[walking.length - 1];
      const timer = window.setTimeout(() => {
        setWalking(null);
        setStep(0);
        if (destination) void arrive(destination);
      }, TRAVEL_STEP_MS);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), TRAVEL_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [walking, step, arrive]);

  if (!bundle || !save) {
    return (
      <PlayScreen backTo={{ name: 'center' }}>
        <LoadingBall />
      </PlayScreen>
    );
  }

  /** Départ effectif : c'est le second geste, jamais le premier. */
  const travelTo = (node: MapNode): void => {
    if (!canTravelTo(node.id, save, bundle) || walking) return;
    setPickedId(null);
    setStep(0);
    setWalking(pathBetween(save.state.currentNode, node.id, save, bundle));
  };

  /**
   * Premier geste : on sélectionne et on NOMME (§192). Un second geste sur le
   * même lieu part — l'enfant qui a compris n'a pas à viser le bouton.
   */
  const pickNode = (node: MapNode): void => {
    if (walking) return;
    if (pickedId === node.id) {
      travelTo(node);
      return;
    }
    setPickedId(node.id);
    speakMessage(spokenName(node.id, node.label));
  };

  const draggable = editing && drafting !== null;

  /**
   * Position du doigt, en pourcentages.
   *
   * `getScreenCTM` fait tout le travail : il tient compte du `viewBox`, de la
   * mise a l'echelle du panneau et du defilement de la page. Absent d'un
   * environnement de test sans rendu — on renvoie alors `null` plutot que de
   * calculer faux.
   */
  const pointerAt = (event: { clientX: number; clientY: number }): Point | null => {
    const svg = svgRef.current;
    if (!svg || typeof svg.getScreenCTM !== 'function' || typeof DOMPoint === 'undefined') return null;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return fromView({ x: local.x, y: local.y });
  };

  /** Ecrit la nouvelle position dans le brouillon, et signale un lieu egare. */
  const moveNodeTo = (node: MapNode, position: Point): void => {
    if (!drafting) return;
    // Jamais deux lieux l'un sur l'autre : lache sur un voisin, il s'ecarte.
    const at = freeSpotNear(node, bundle.nodes, node.id, placeNode(position));
    if (at.x === node.x && at.y === node.y) return;

    setPending({ id: node.id, at });
    drafting.update((current) => ({
      ...current,
      nodes: current.nodes.map((entry) => (entry.id === node.id ? { ...entry, ...at } : entry)),
    }));

    const foreign = foreignBiomeAt(at, bundle.nodes, node, toView);
    setStrayNodeId(foreign ? node.id : null);
    setStrayBiomeId(foreign);
  };

  /**
   * La capture est posee sur le <svg>, jamais sur le lieu.
   *
   * Le lieu qu'on deplace passe par-dessus les autres, donc il change de place
   * dans le document — et le navigateur relache alors la capture. Le geste
   * s'interrompait des que le doigt sortait du lieu, par exemple quand la
   * position butait sur le bord du cadre.
   */
  const startDrag = (node: MapNode, event: ReactPointerEvent<SVGGElement>): void => {
    if (!draggable || walking) return;
    const svg = svgRef.current;
    if (svg && typeof svg.setPointerCapture === 'function') svg.setPointerCapture(event.pointerId);
    setStrayNodeId(null);
    setStrayBiomeId(null);
    setDrag({
      id: node.id,
      pointerId: event.pointerId,
      at: { x: node.x, y: node.y },
      origin: toView(node),
      moved: false,
    });
  };

  const continueDrag = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const at = pointerAt(event);
    if (!at) return;
    const view = toView(at);
    const moved =
      drag.moved || Math.hypot(view.x - drag.origin.x, view.y - drag.origin.y) > DRAG_THRESHOLD;
    // On range des le glissement : l'adulte voit exactement ou le lieu tombera.
    setDrag({ ...drag, moved, at: moved ? placeNode(at) : drag.at });
  };

  /**
   * C'est le LACHER qui decide, et non un `click`.
   *
   * Des qu'on capture le pointeur — indispensable pour que le lieu suive le
   * doigt hors de sa zone tactile — le navigateur n'emet plus de `click` du
   * tout. Toucher un lieu en mode edition ne faisait donc plus rien.
   */
  const endDrag = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dropped = drag;
    const node = bundle.nodes.find((entry) => entry.id === dropped.id);
    setDrag(null);
    if (!node) return;
    if (dropped.moved) moveNodeTo(node, dropped.at);
    // Un appui reste un appui : l'adulte parcourt l'aventure tout en l'editant.
    else if (event.isPrimary) pickNode(node);
  };

  /** Clavier : les fleches suivent l'ECRAN, pas les donnees (§159). */
  const nudge = (node: MapNode, dx: number, dy: number): void => {
    const view = toView(node);
    moveNodeTo(node, fromView({ x: view.x + dx, y: view.y + dy }));
  };

  const onNodeKeyDown = (node: MapNode, event: React.KeyboardEvent<SVGGElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      pickNode(node);
      return;
    }
    if (!draggable) return;
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-NUDGE_STEP, 0],
      ArrowRight: [NUDGE_STEP, 0],
      ArrowUp: [0, -NUDGE_STEP],
      ArrowDown: [0, NUDGE_STEP],
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    nudge(node, step[0], step[1]);
  };

  /*
   * Le lieu que l'on deplace passe par-dessus les autres : sans cela, un voisin
   * dessine plus tard le recouvrait en cours de route.
   */
  const orderedNodes = drag
    ? [...bundle.nodes.filter((node) => node.id !== drag.id), ...bundle.nodes.filter((node) => node.id === drag.id)]
    : bundle.nodes;

  /**
   * « + » : un nouveau lieu a cote de celui-ci, dans sa region, relie a lui,
   * avec ses creatures et ses exercices — et son tiroir s'ouvre aussitot pour
   * le nommer. L'adulte cree ainsi une rencontre sans quitter la carte.
   */
  const addNodeAfter = (parent: MapNode): void => {
    if (!drafting) return;
    // L'identifiant est tire ICI : la mise a jour du brouillon est differee,
    // et le tiroir doit s'ouvrir sur ce lieu des maintenant.
    const id = uid('node');
    drafting.update(
      (current) =>
        createNodeAfter(
          current,
          parent.id,
          {
            x: parent.x + (orientation === 'portrait' ? 0 : 10),
            y: parent.y + (orientation === 'portrait' ? 8 : 0),
          },
          id,
        ).bundle,
    );
    openEditor({ kind: 'node', id });
  };

  const picked = bundle.nodes.find((node) => node.id === pickedId) ?? null;
  const strayNode = bundle.nodes.find((node) => node.id === strayNodeId) ?? null;
  const strayBiome = bundle.biomes.find((item) => item.id === strayBiomeId) ?? null;
  const strayHome = bundle.biomes.find((item) => item.id === strayNode?.biomeId) ?? null;

  const attachStray = (): void => {
    if (!drafting || !strayNode || !strayBiome) return;
    drafting.update((current) => ({
      ...current,
      nodes: current.nodes.map((entry) =>
        entry.id === strayNode.id ? { ...entry, biomeId: strayBiome.id } : entry,
      ),
    }));
    setStrayNodeId(null);
    setStrayBiomeId(null);
  };

  return (
    <PlayScreen
      biome={currentBiome}
      backTo={{ name: 'center' }}
      scrim="none"
      extraLeft={
        currentNode?.arrivalVoiceId ? (
          <VoiceButton
            state={buttonState(currentNode.arrivalVoiceId)}
            onPlay={() => speak(currentNode.arrivalVoiceId)}
            label="Écouter"
          />
        ) : null
      }
      action={
        <BadgeChip icon={<IconBadge size={22} />}>{save.state.badges.length} badge(s)</BadgeChip>
      }
    >
      <SoftPanel padding="tight" tone="soft" className="map">
        <svg
          ref={svgRef}
          className="map__svg"
          data-choice-group="lieux"
          data-editing={draggable}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          role="presentation"
          onPointerMove={continueDrag}
          onPointerUp={endDrag}
          onPointerCancel={() => setDrag(null)}
        >
          {/* --- Bulles de region : elles regroupent les lieux voisins ------ */}
          {/*
            Chaque region est dessinee DEUX fois : un contour legerement plus
            large, puis le remplissage par-dessus. Il ne reste qu'un liseré,
            ce qui separe nettement deux regions de couleurs proches — sans les
            coutures qu'un vrai contour laisserait sur une union de cercles.
          */}
          {zones.map((zone) => (
            <g
              key={zone.biome.id}
              data-biome={zone.biome.id}
              /* La region que l'on remodele s'affirme : on voit ce qu'on fait. */
              className={
                drag && bundle.nodes.find((node) => node.id === drag.id)?.biomeId === zone.biome.id
                  ? 'map__zone-group map__zone-group--active'
                  : 'map__zone-group'
              }
            >
              <ZoneShape zone={zone} color={zone.biome.accent} grow={1.5} className="map__zone-edge" />
              <ZoneShape zone={zone} color={zone.biome.ground} grow={0} className="map__zone" />
            </g>
          ))}

          {/* --- Chemins : ils montrent la progression possible ------------- */}
          {links.map((link) => {
            const from = place(link.from);
            const to = place(link.to);
            const open =
              states.get(link.from.id) !== 'LOCKED' && states.get(link.to.id) !== 'LOCKED';
            const done =
              save.state.completedNodes.includes(link.from.id) &&
              save.state.completedNodes.includes(link.to.id);
            return (
              <g key={link.key}>
                <line
                  className="map__path-shadow"
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
                <line
                  className={`map__path${done ? ' map__path--done' : open ? '' : ' map__path--locked'}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
              </g>
            );
          })}

          {zones
            .filter((zone) => zone.showLabel)
            .map((zone) => ({ zone, label: labels.zones.get(zone.biome.id) }))
            .filter((entry): entry is { zone: (typeof zones)[number]; label: PlacedLabel } =>
              entry.label !== undefined,
            )
            .map(({ zone, label }) => (
              <g key={`${zone.biome.id}-label`}>
                {/*
                  Le titre d'une region ne fait rien pour l'enfant : en mode
                  edition, il devient donc lui-meme le bouton. Une pastille
                  posee a cote viendrait barrer le texte.
                */}
                {editing ? (
                  <g
                    className="map__zone-edit"
                    role="button"
                    tabIndex={0}
                    aria-label={`Modifier la région ${zone.biome.name}`}
                    onClick={() => openEditor({ kind: 'biome', id: zone.biome.id })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        openEditor({ kind: 'biome', id: zone.biome.id });
                      }
                    }}
                  >
                    <rect
                      x={label.box.left}
                      y={label.box.top}
                      width={label.box.right - label.box.left}
                      height={label.box.bottom - label.box.top}
                      fill="transparent"
                    />
                    <ZoneLabelText label={label} editable />
                  </g>
                ) : (
                  <ZoneLabelText label={label} />
                )}
              </g>
            ))}

          {/* --- Lieux ------------------------------------------------------ */}
          {orderedNodes.map((node) => {
            const state = states.get(node.id) ?? 'LOCKED';
            const point = place(node);
            const radius = node.kind === 'GYM' ? NODE_R_GYM : NODE_R;
            const locked = state === 'LOCKED';
            return (
              <g
                key={node.id}
                className={[
                  'map__node',
                  locked ? 'map__node--locked' : '',
                  // Les destinations ouvertes respirent : c'est ce qui dit
                  // « touche-moi » a un enfant qui ne lit pas (§193).
                  state === 'AVAILABLE' || state === 'SPECIAL_EVENT' ? 'map__node--open' : '',
                  draggable ? 'map__node--draggable' : '',
                  drag?.id === node.id ? 'map__node--dragging' : '',
                  pickedId === node.id ? 'map__node--picked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="button"
                tabIndex={0}
                aria-label={
                  draggable
                    ? `${node.label} — ${describeState(state)}. Faites glisser pour déplacer ce lieu.`
                    : `${node.label} — ${describeState(state)}`
                }
                // Hors edition, le clic natif suffit — et reste accessible.
                onClick={() => {
                  if (!draggable) pickNode(node);
                }}
                onKeyDown={(event) => onNodeKeyDown(node, event)}
                onPointerDown={(event) => startDrag(node, event)}
              >
                {/* Zone tactile large, bien au-dela du dessin (§4). */}
                <circle cx={point.x} cy={point.y} r={HIT_R} fill="transparent" />
                <circle
                  className="map__node-ring"
                  cx={point.x}
                  cy={point.y}
                  r={radius + 1.4}
                />
                <circle cx={point.x} cy={point.y} r={radius} fill={STATE_FILL[state]} />
                <g
                  transform={`translate(${point.x - radius * 0.72} ${point.y - radius * 0.72}) scale(${(radius * 1.44) / 24})`}
                  pointerEvents="none"
                >
                  <PlaceIcon node={node} biome={biome(node.biomeId)} />
                </g>
                {/*
                  Le pictogramme du lieu reste ENTIEREMENT visible : la petite
                  pastille est posee en coin, elle indique seulement que
                  l'endroit n'est pas encore ouvert (§173).
                */}
                {locked ? (
                  <g
                    className="map__badge"
                    transform={`translate(${point.x + radius * 0.85} ${point.y + radius * 0.85})`}
                    pointerEvents="none"
                  >
                    <circle r={2.4} />
                    <g transform="translate(-1.5 -1.5) scale(0.125)">
                      <IconLock size={24} />
                    </g>
                  </g>
                ) : null}
                {state === 'SPECIAL_EVENT' ? (
                  <g
                    className="map__badge map__badge--event"
                    /* En edition, le coin haut-droit est pris par le « + ». */
                    transform={`translate(${editing ? point.x - radius * 0.85 : point.x + radius * 0.85} ${
                      editing ? point.y + radius * 0.85 : point.y - radius * 0.85
                    })`}
                    pointerEvents="none"
                  >
                    <circle r={3.1} />
                    <g transform="translate(-2.1 -2.1) scale(0.175)">
                      <IconSparkle size={24} />
                    </g>
                  </g>
                ) : null}
                {(() => {
                  const label = labels.nodes.get(node.id);
                  return (
                    <>
                      {/* Etiquette partie loin faute de place : on la rattache. */}
                      {label?.leader ? (
                        <line
                          className="map__label-leader"
                          x1={label.leader.from.x}
                          y1={label.leader.from.y}
                          x2={label.leader.to.x}
                          y2={label.leader.to.y}
                        />
                      ) : null}
                      <text
                        className="map__node-label"
                        x={label?.x ?? point.x}
                        y={label?.y ?? point.y + radius + 5.2}
                        textAnchor={label?.anchor ?? 'middle'}
                      >
                        {node.label}
                      </text>
                    </>
                  );
                })()}
                {editing ? (
                  <>
                    <MapEditBadge
                      x={point.x - radius * 0.95}
                      y={point.y - radius * 0.95}
                      label={`Modifier le lieu ${node.label}`}
                      onOpen={() => openEditor({ kind: 'node', id: node.id })}
                    />
                    <MapEditBadge
                      variant="add"
                      x={point.x + radius * 0.95}
                      y={point.y - radius * 0.95}
                      label={`Ajouter un lieu après ${node.label}`}
                      onOpen={() => addNodeAfter(node)}
                    />
                  </>
                ) : null}
              </g>
            );
          })}

          {/* --- Personnage ------------------------------------------------- */}
          {avatar ? (
            /*
              LE DRESSEUR (§193). C'etait un petit rond corail au-dessus du
              lieu courant : on ne se reconnaissait pas dedans. C'est
              maintenant une silhouette — tete, casquette, corps — assez
              grande pour qu'un enfant sache tout de suite ou il se trouve.
            */
            <g className="map__avatar" transform={`translate(${avatar.x} ${avatar.y - 11.5})`}>
              <ellipse className="map__avatar-shadow" cy={9.4} rx={3.4} ry={1.1} />
              <path className="map__avatar-body" d="M-2.9 9.2v-3.4a2.9 2.9 0 0 1 5.8 0v3.4Z" />
              <circle className="map__avatar-head" r={3.1} cy={2.2} />
              <path className="map__avatar-cap" d="M-3.1 1.4a3.1 3.1 0 0 1 6.2 0Z" />
              <path className="map__avatar-cap" d="M0.6 1.4h3.7a1 1 0 0 1-1 1H0.6Z" />
            </g>
          ) : null}
        </svg>

        {/*
          Un lieu lâché chez une autre région : sa bulle d'origine irait le
          chercher là-bas et traverserait la voisine. On le dit, et on propose —
          jamais de réaffectation dans le dos de l'administrateur.
        */}
        {/*
          CE QUE L'ON VIENT DE CHOISIR, ET CE QU'ON PEUT EN FAIRE (§193).
          Un lieu fermé se dit aussi : l'enfant apprend qu'il existe, sans se
          demander pourquoi rien ne se passe.
        */}
        {picked && !strayNode ? (
          <div className="map__pick surface-dense" role="status">
            <span className="map__pick-icon" aria-hidden="true">
              <PlaceIcon node={picked} biome={biome(picked.biomeId)} />
            </span>
            <span className="map__pick-name">{picked.label}</span>
            {canTravelTo(picked.id, save, bundle) ? (
              <PrimaryButton large onClick={() => travelTo(picked)}>
                Y aller !
              </PrimaryButton>
            ) : (
              <span className="map__pick-locked">
                <IconLock size={22} />
                Pas encore ouvert
              </span>
            )}
            <SecondaryButton onClick={() => setPickedId(null)}>Fermer</SecondaryButton>
          </div>
        ) : null}

        {strayNode && strayBiome ? (
          <div className="map__stray surface-dense" role="status">
            <span>
              « {strayNode.label} » est posé dans {strayBiome.name}.
            </span>
            <PrimaryButton onClick={attachStray}>Rattacher à cette région</PrimaryButton>
            <SecondaryButton onClick={() => setStrayNodeId(null)}>
              Garder {strayHome?.name ?? 'sa région'}
            </SecondaryButton>
          </div>
        ) : null}
      </SoftPanel>
    </PlayScreen>
  );
}

/** Titre de region, sur une ou deux lignes selon `layoutLabels`. */
function ZoneLabelText({ label, editable = false }: { label: PlacedLabel; editable?: boolean }) {
  return (
    <text
      className={editable ? 'map__zone-label map__zone-label--editable' : 'map__zone-label'}
      x={label.x}
      y={label.y}
      textAnchor={label.anchor}
    >
      {label.lines.map((line, index) => (
        <tspan key={index} x={label.x} dy={index === 0 ? 0 : ZONE_LINE_H}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function describeState(state: NodeState): string {
  switch (state) {
    case 'CURRENT':
      return 'tu es ici';
    case 'COMPLETED':
      return 'déjà exploré';
    case 'AVAILABLE':
      return 'à explorer';
    case 'SPECIAL_EVENT':
      return 'quelque chose de spécial';
    case 'LOCKED':
    default:
      return 'fermé pour l’instant';
  }
}
