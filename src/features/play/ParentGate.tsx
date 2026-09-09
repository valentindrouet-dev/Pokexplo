import { useEffect, useRef, useState } from 'react';
import { IconLock, ModalPanel, PrimaryButton, SecondaryButton } from '../../ui';
import { useNavigation } from '../../app/router';
import './play.css';

/** Durée d'appui, en millisecondes : trop longue pour un geste d'enfant. */
const HOLD_MS = 1200;

/**
 * ACCÈS ADULTE, HORS DE PORTÉE DE L'ENFANT (UI_DESIGN §190).
 *
 * « Espace parents » était un bouton comme un autre au milieu de l'écran de
 * l'enfant : un choix de plus à comprendre. C'est désormais un petit cadenas
 * discret, dans un coin.
 *
 * L'APPUI MAINTENU SEUL NE SUFFISAIT PAS. Un appui bref ne faisait rien du
 * tout — ni action, ni retour visuel : le cadenas était indiscernable d'un
 * bouton cassé, et un parent ne pouvait plus entrer chez lui. Un appui bref
 * ouvre donc une petite carte qui explique et propose l'entrée ; l'appui
 * maintenu reste le raccourci de celui qui connaît le geste.
 *
 * Ce n'est pas la vraie serrure : `/admin` est protégé par un code (§93).
 * Celle-ci sert seulement à ce qu'un enfant ne tombe pas là par hasard.
 */
export function ParentGate() {
  const { navigate } = useNavigation();
  const [holding, setHolding] = useState(false);
  const [asking, setAsking] = useState(false);
  const timer = useRef<number | null>(null);
  /** Vrai quand l'appui maintenu a déjà ouvert : le relâchement ne doit rien faire. */
  const opened = useRef(false);

  const cancel = (): void => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };

  // Un appui interrompu par un changement d'écran ne doit rien déclencher.
  useEffect(() => cancel, []);

  const open = (): void => {
    setAsking(false);
    navigate({ name: 'parents' });
  };

  const start = (): void => {
    if (timer.current !== null) return;
    opened.current = false;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      opened.current = true;
      cancel();
      open();
    }, HOLD_MS);
  };

  /** Relâché avant la fin : c'est un appui bref, on explique. */
  const release = (): void => {
    const wasHolding = timer.current !== null;
    cancel();
    if (wasHolding && !opened.current) setAsking(true);
  };

  return (
    <>
      <button
        type="button"
        className="parent-gate"
        data-holding={holding}
        aria-label="Espace parents"
        onPointerDown={start}
        onPointerUp={release}
        /* Sortir du bouton annule sans rien ouvrir : ce n'était pas un appui. */
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') setAsking(true);
        }}
      >
        <span className="parent-gate__ring" aria-hidden="true" />
        <IconLock size={22} />
      </button>

      <ModalPanel
        open={asking}
        title="Espace parents"
        onDismiss={() => setAsking(false)}
        actions={
          <>
            <SecondaryButton onClick={() => setAsking(false)}>Retour au jeu</SecondaryButton>
            <PrimaryButton onClick={open}>Ouvrir l’espace parents</PrimaryButton>
          </>
        }
      >
        <p>
          Progression de votre enfant, réglages du son, et de quoi modifier l’aventure.
        </p>
        <p className="start__subtitle">
          Astuce : maintenez le cadenas appuyé une seconde pour entrer directement.
        </p>
      </ModalPanel>
    </>
  );
}
