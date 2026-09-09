import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MapNode, NodeState } from '../../types';
import { canTravelTo, nodeState, pathBetween } from '../../game-engine';
import {
  BadgeChip,
  IconBadge,
  IconBall,
  IconCenter,
  IconLock,
  IconSparkle,
  LoadingBall,
  SoftPanel,
  VoiceButton,
} from '../../ui';
import { useAudio } from '../../app/providers/AudioProvider';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { useNavigation } from '../../app/router';
import { PlayScreen } from '../play/PlayScreen';

/** Couleur d'etat d'un nœud (§11). La forme et l'icone completent la couleur (§142). */
const STATE_FILL: Record<NodeState, string> = {
  LOCKED: 'var(--color-locked)',
  AVAILABLE: 'var(--color-aqua)',
  CURRENT: 'var(--color-yellow)',
  COMPLETED: 'var(--color-green)',
  SPECIAL_EVENT: 'var(--color-lavender)',
};

const TRAVEL_STEP_MS = 340;

/**
 * CARTE DU MONDE (CONCEPTION §10-11).
 *
 * Pas de monde ouvert ni de joystick : l'enfant touche une destination et son
 * personnage s'y rend automatiquement, en suivant les chemins ouverts.
 */
export function MapScreen() {
  const { navigate } = useNavigation();
  const { bundle, biome } = useContent();
  const { save, dispatch } = useGame();
  const { speak, buttonState } = useAudio();
  const [walking, setWalking] = useState<string[] | null>(null);
  const [step, setStep] = useState(0);

  const states = useMemo(() => {
    if (!bundle || !save) return new Map<string, NodeState>();
    return new Map(bundle.nodes.map((node) => [node.id, nodeState(node, save, bundle)]));
  }, [bundle, save]);

  const currentNode = bundle?.nodes.find((node) => node.id === save?.state.currentNode) ?? null;
  const currentBiome = biome(currentNode?.biomeId);

  /** Arrivee sur un nœud : dialogue, puis Arene / Centre / rencontre. */
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

  // Animation de deplacement : le personnage traverse les nœuds un par un.
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
    const path = pathBetween(save.state.currentNode, node.id, save, bundle);
    setStep(0);
    setWalking(path);
  };

  const walkingNodeId = walking?.[step] ?? save.state.currentNode;
  const avatarNode = bundle.nodes.find((node) => node.id === walkingNodeId) ?? currentNode;

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
        <svg className="map__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {bundle.nodes.flatMap((node) =>
            node.connections.map((targetId) => {
              const target = bundle.nodes.find((item) => item.id === targetId);
              if (!target) return null;
              const locked =
                states.get(node.id) === 'LOCKED' || states.get(target.id) === 'LOCKED';
              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={node.x}
                  y1={node.y}
                  x2={target.x}
                  y2={target.y}
                  className={`map__link${locked ? ' map__link--locked' : ''}`}
                />
              );
            }),
          )}

          {bundle.nodes.map((node) => {
            const state = states.get(node.id) ?? 'LOCKED';
            return (
              <g
                key={node.id}
                className="map__node"
                role="button"
                tabIndex={0}
                aria-label={`${node.label} — ${describeState(state)}`}
                onClick={() => travelTo(node)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') travelTo(node);
                }}
              >
                {/* Zone tactile large : bien au-dela du dessin (§4). */}
                <circle cx={node.x} cy={node.y} r={7.5} fill="transparent" />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.kind === 'GYM' ? 5.2 : 4.2}
                  fill={STATE_FILL[state]}
                  stroke="var(--color-surface)"
                  strokeWidth={1}
                />
                <NodeGlyph node={node} state={state} />
                <text className="map__node-label" x={node.x} y={node.y + 9}>
                  {node.label}
                </text>
              </g>
            );
          })}

          {avatarNode ? (
            <g className="map__avatar" transform={`translate(${avatarNode.x} ${avatarNode.y - 7})`}>
              <circle r={2.6} fill="var(--color-coral)" />
              <circle r={1.1} cy={-0.4} fill="var(--color-surface)" />
            </g>
          ) : null}
        </svg>
      </SoftPanel>

      <div className="map__legend">
        <BadgeChip icon={<IconBall size={20} />}>À explorer</BadgeChip>
        <BadgeChip icon={<IconSparkle size={20} />}>Événement</BadgeChip>
        <BadgeChip icon={<IconLock size={20} />}>Fermé</BadgeChip>
      </div>
    </PlayScreen>
  );
}

/**
 * Pictogramme pose sur le nœud.
 * §142 : l'etat n'est jamais porte par la seule couleur — il y a toujours une
 * forme ou une icone qui le rend comprehensible.
 */
function NodeGlyph({ node, state }: { node: MapNode; state: NodeState }) {
  const icon =
    state === 'LOCKED' ? (
      <IconLock size={24} />
    ) : state === 'SPECIAL_EVENT' ? (
      <IconSparkle size={24} />
    ) : node.kind === 'CENTER' ? (
      <IconCenter size={24} />
    ) : node.kind === 'GYM' ? (
      <IconBadge size={24} />
    ) : null;

  if (!icon) return null;
  // L'icone fait 24 unites : on la ramene a 6 unites de la carte.
  return (
    <g transform={`translate(${node.x - 3} ${node.y - 3}) scale(0.25)`} pointerEvents="none">
      {icon}
    </g>
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
