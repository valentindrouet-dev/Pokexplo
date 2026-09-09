import { useEffect, useRef, useState } from 'react';
import { IconLock } from '../../ui';
import { useNavigation } from '../../app/router';
import './play.css';

/** Durée d'appui, en millisecondes : trop longue pour un geste d'enfant. */
const HOLD_MS = 1200;

/**
 * ACCÈS ADULTE, HORS DE PORTÉE DE L'ENFANT (UI_DESIGN §190).
 *
 * « Espace parents » était un bouton comme un autre au milieu de l'écran de
 * l'enfant : un choix de plus à comprendre, et une porte ouverte. C'est
 * désormais un petit cadenas discret, dans un coin, qui demande un **appui
 * maintenu** — un geste qu'un enfant de cinq ans ne fait pas par hasard, et
 * qu'un parent trouve du premier coup.
 *
 * Il ne compte pas dans les quatre choix de l'écran : il n'est pas proposé à
 * l'enfant. L'anneau se remplit pendant l'appui, pour que l'adulte comprenne
 * qu'il se passe quelque chose.
 */
export function ParentGate() {
  const { navigate } = useNavigation();
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);

  const cancel = (): void => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };

  // Un appui interrompu par un changement d'écran ne doit rien déclencher.
  useEffect(() => cancel, []);

  const start = (): void => {
    if (timer.current !== null) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      cancel();
      navigate({ name: 'parents' });
    }, HOLD_MS);
  };

  return (
    <button
      type="button"
      className="parent-gate"
      data-holding={holding}
      aria-label="Espace parents — appui long"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      /* Au clavier, l'appui long n'a pas de sens : Entrée suffit. */
      onKeyDown={(event) => {
        if (event.key === 'Enter') navigate({ name: 'parents' });
      }}
    >
      <span className="parent-gate__ring" aria-hidden="true" />
      <IconLock size={22} />
    </button>
  );
}
