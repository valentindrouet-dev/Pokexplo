import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Biome, BiomeKind, MapNode, NodeState } from '../../types';
import { canTravelTo, nodeState, pathBetween } from '../../game-engine';
import {
  BadgeChip,
  IconBadge,
  IconCenter,
  IconDroplet,
  IconFlower,
  IconLeaf,
  IconLock,
  IconPencil,
  IconRock,
  IconSnow,
  IconSparkle,
  IconVolcano,
  IconWave,
  LoadingBall,
  SoftPanel,
  VoiceButton,
} from '../../ui';
import { useAudio } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useNavigation } from '../../app/router';
import { useEditMode } from '../../app/providers/EditModeProvider';
import { PlayScreen } from '../play/PlayScreen';

/**
 * La carte est dessinee dans un repere 160 x 100 (paysage), alors que les
 * positions du contenu sont en pourcentage (§159). `SCALE_X` fait le pont :
 * l'administrateur continue de raisonner en pourcentages.
 */
const VIEW_W = 160;
const VIEW_H = 100;
const SCALE_X = VIEW_W / 100;

const NODE_R = 5.6;
const NODE_R_GYM = 6.6;
const HIT_R = 10;
const ZONE_R = 11;
const ZONE_LINK_W = 22;
const TRAVEL_STEP_MS = 320;

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
 */
function PlaceIcon({ node, biome }: { node: MapNode; biome: Biome | null }) {
  const size = 24;
  if (node.kind === 'CENTER') return <IconCenter size={size} />;
  if (node.kind === 'GYM') return <IconBadge size={size} />;

  const kind: BiomeKind = biome?.kind ?? 'PRAIRIE';
  switch (kind) {
    case 'FOREST':
      return <IconLeaf size={size} />;
    case 'RIVER':
      return <IconDroplet size={size} />;
    case 'BEACH':
      return <IconWave size={size} />;
    case 'CAVE':
    case 'MOUNTAIN':
      return <IconRock size={size} />;
    case 'SNOW':
      return <IconSnow size={size} />;
    case 'VOLCANO':
      return <IconVolcano size={size} />;
    case 'CENTER':
      return <IconCenter size={size} />;
    case 'PRAIRIE':
    case 'SWAMP':
    case 'CITY':
    default:
      return <IconFlower size={size} />;
  }
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
}: {
  x: number;
  y: number;
  label: string;
  onOpen: () => void;
}) {
  return (
    <g
      className="map__edit"
      role="button"
      tabIndex={0}
      aria-label={`Modifier ${label}`}
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
      <circle className="map__edit-dot" cx={x} cy={y} r={3.4} />
      <g transform={`translate(${x - 2.2} ${y - 2.2}) scale(0.183)`} pointerEvents="none">
        <IconPencil size={24} />
      </g>
    </g>
  );
}

interface Point {
  x: number;
  y: number;
}

interface Zone {
  points: Point[];
  inner: Array<{ a: Point; b: Point }>;
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
  zone: Zone;
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

function toView(node: MapNode): Point {
  return { x: node.x * SCALE_X, y: node.y };
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
  const { navigate } = useNavigation();
  const { editing, open: openEditor } = useEditMode();
  const { bundle, biome } = useContent();
  const { save, dispatch } = useGame();
  const { speak, buttonState } = useAudio();
  const [walking, setWalking] = useState<string[] | null>(null);
  const [step, setStep] = useState(0);

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
        const points = nodes.map(toView);
        const inner = links
          .filter((link) => link.from.biomeId === item.id && link.to.biomeId === item.id)
          .map((link) => ({ a: toView(link.from), b: toView(link.to) }));
        // On ancre l'etiquette sur le lieu le plus a gauche : le milieu d'une
        // bulle est souvent traverse par un chemin, qui couperait le titre.
        const anchor = points.reduce((left, point) => (point.x < left.x ? point : left), points[0]!);
        return {
          biome: item,
          points,
          inner,
          // Une region d'un seul lieu n'a pas besoin d'etiquette : le nom du
          // lieu, juste en dessous, suffit et evite un chevauchement.
          showLabel: nodes.length > 1,
          label: { x: anchor.x, y: Math.max(4, anchor.y - ZONE_R - 3) },
        };
      })
      .filter((zone): zone is NonNullable<typeof zone> => zone !== null);
  }, [bundle, links]);

  const currentNode = bundle?.nodes.find((node) => node.id === save?.state.currentNode) ?? null;
  const currentBiome = biome(currentNode?.biomeId);

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

  const travelTo = (node: MapNode): void => {
    if (!canTravelTo(node.id, save, bundle) || walking) return;
    setStep(0);
    setWalking(pathBetween(save.state.currentNode, node.id, save, bundle));
  };

  const walkingNodeId = walking?.[step] ?? save.state.currentNode;
  const avatarNode = bundle.nodes.find((node) => node.id === walkingNodeId) ?? currentNode;
  const avatar = avatarNode ? toView(avatarNode) : null;

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
          className="map__svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          role="presentation"
        >
          {/* --- Bulles de region : elles regroupent les lieux voisins ------ */}
          {/*
            Chaque region est dessinee DEUX fois : un contour legerement plus
            large, puis le remplissage par-dessus. Il ne reste qu'un liseré,
            ce qui separe nettement deux regions de couleurs proches — sans les
            coutures qu'un vrai contour laisserait sur une union de cercles.
          */}
          {zones.map((zone) => (
            <g key={zone.biome.id}>
              <ZoneShape zone={zone} color={zone.biome.accent} grow={1.5} className="map__zone-edge" />
              <ZoneShape zone={zone} color={zone.biome.ground} grow={0} className="map__zone" />
            </g>
          ))}

          {/* --- Chemins : ils montrent la progression possible ------------- */}
          {links.map((link) => {
            const from = toView(link.from);
            const to = toView(link.to);
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
            .map((zone) => (
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
                      x={zone.label.x - 24}
                      y={zone.label.y - 4.6}
                      width={48}
                      height={6.4}
                      fill="transparent"
                    />
                    <text
                      className="map__zone-label map__zone-label--editable"
                      x={zone.label.x}
                      y={zone.label.y}
                    >
                      {zone.biome.shortName ?? zone.biome.name}
                    </text>
                  </g>
                ) : (
                  <text className="map__zone-label" x={zone.label.x} y={zone.label.y}>
                    {zone.biome.shortName ?? zone.biome.name}
                  </text>
                )}
              </g>
            ))}

          {/* --- Lieux ------------------------------------------------------ */}
          {bundle.nodes.map((node) => {
            const state = states.get(node.id) ?? 'LOCKED';
            const point = toView(node);
            const radius = node.kind === 'GYM' ? NODE_R_GYM : NODE_R;
            const locked = state === 'LOCKED';
            return (
              <g
                key={node.id}
                className={`map__node${locked ? ' map__node--locked' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`${node.label} — ${describeState(state)}`}
                onClick={() => travelTo(node)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') travelTo(node);
                }}
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
                    transform={`translate(${point.x + radius * 0.85} ${point.y - radius * 0.85})`}
                    pointerEvents="none"
                  >
                    <circle r={3.1} />
                    <g transform="translate(-2.1 -2.1) scale(0.175)">
                      <IconSparkle size={24} />
                    </g>
                  </g>
                ) : null}
                <text className="map__node-label" x={point.x} y={point.y + radius + 5.2}>
                  {node.label}
                </text>
                {editing ? (
                  <MapEditBadge
                    x={point.x - radius * 0.95}
                    y={point.y - radius * 0.95}
                    label={`le lieu ${node.label}`}
                    onOpen={() => openEditor({ kind: 'node', id: node.id })}
                  />
                ) : null}
              </g>
            );
          })}

          {/* --- Personnage ------------------------------------------------- */}
          {avatar ? (
            <g className="map__avatar" transform={`translate(${avatar.x} ${avatar.y - 9.5})`}>
              <circle r={3.2} />
              <circle className="map__avatar-dot" r={1.3} cy={-0.5} />
            </g>
          ) : null}
        </svg>
      </SoftPanel>
    </PlayScreen>
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
