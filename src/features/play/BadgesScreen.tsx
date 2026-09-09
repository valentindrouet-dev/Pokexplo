import type { Badge } from '../../types';
import { LoadingBall, SoftPanel } from '../../ui';
import { useContent } from '../../app/providers/ContentProvider';
import { useGame } from '../../app/providers/GameProvider';
import { PlayScreen } from './PlayScreen';

/** BADGES (CONCEPTION §22) — la preuve visible des Arènes remportées. */
export function BadgesScreen() {
  const { bundle, gym } = useContent();
  const { save } = useGame();

  if (!bundle || !save) {
    return (
      <PlayScreen>
        <LoadingBall />
      </PlayScreen>
    );
  }

  return (
    <PlayScreen scrim="soft">
      <SoftPanel title="Tes badges" padding="roomy" fill className="ds-scroll">
        <div className="badges">
          {bundle.badges.map((badge) => {
            const owned = save.state.badges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`badge-medal${owned ? '' : ' badge-medal--locked'}`}
                aria-label={`${badge.name} — ${owned ? 'obtenu' : 'pas encore obtenu'}`}
              >
                <BadgeShape badge={badge} />
                <p className="ds-creature-card__name">{badge.name}</p>
                <p className="start__subtitle">{gym(badge.gymId)?.gymName}</p>
              </div>
            );
          })}
        </div>
        {save.state.badges.length === 0 ? (
          <p className="start__subtitle">
            Va défier Pierre à l’Arène pour gagner ton premier badge !
          </p>
        ) : null}
      </SoftPanel>
    </PlayScreen>
  );
}

/** Badge dessine en SVG : aucune image externe (§147). */
function BadgeShape({ badge }: { badge: Badge }) {
  const path =
    badge.shape === 'hexagon'
      ? 'M50 8 86 29v42L50 92 14 71V29Z'
      : badge.shape === 'drop'
        ? 'M50 8c18 22 28 34 28 46a28 28 0 0 1-56 0c0-12 10-24 28-46Z'
        : badge.shape === 'shield'
          ? 'M50 8 86 20v34c0 20-16 32-36 38-20-6-36-18-36-38V20Z'
          : 'M50 6 62 36l32 3-24 22 7 32-27-17-27 17 7-32-24-22 32-3Z';

  return (
    <svg width={110} height={110} viewBox="0 0 100 100" aria-hidden="true">
      <path d={path} fill={badge.color} stroke="rgba(70,60,55,0.16)" strokeWidth={2} />
      <circle cx="50" cy="48" r="14" fill="var(--color-surface)" opacity="0.85" />
    </svg>
  );
}
