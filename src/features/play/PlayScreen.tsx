import type { ReactNode } from 'react';
import type { Biome } from '../../types';
import { SceneBackground } from '../../components/SceneBackground';
import { BottomActionBar, IconButton, IconBack } from '../../ui';
import { useNavigation } from '../../app/router';
import type { Route } from '../../app/routes';
import { cn } from '../../utils/cn';
import './play.css';

export interface PlayScreenProps {
  children: ReactNode;
  biome?: Biome | null;
  /** §176 — le retour est TOUJOURS au meme endroit, en bas a gauche. */
  backTo?: Route | null;
  backLabel?: string;
  /** §177 — action principale, a droite. Deux ou trois actions maximum. */
  action?: ReactNode;
  /** Actions supplementaires a gauche (le 🔊 de contexte par exemple). */
  extraLeft?: ReactNode;
  scrim?: 'none' | 'light' | 'soft';
  className?: string;
}

/** Ossature commune de tous les ecrans enfant (§132, §176-177, §184). */
export function PlayScreen({
  children,
  biome,
  backTo = { name: 'center' },
  backLabel = 'Retour',
  action,
  extraLeft,
  scrim = 'light',
  className,
}: PlayScreenProps) {
  const { navigate } = useNavigation();

  return (
    <div className={cn('play', className)}>
      <SceneBackground biome={biome} scrim={scrim} />
      <div className="play__content">{children}</div>
      <BottomActionBar
        className="play__bar"
        left={
          <>
            {backTo ? (
              <IconButton
                large
                label={backLabel}
                icon={<IconBack size={30} />}
                onClick={() => navigate(backTo)}
              />
            ) : null}
            {extraLeft}
          </>
        }
        right={action}
      />
    </div>
  );
}
