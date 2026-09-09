import { useEffect, useState } from 'react';

export type Orientation = 'landscape' | 'portrait';

const QUERY = '(orientation: portrait)';

/** `matchMedia` peut manquer (vieux WebKit) ou renvoyer n'importe quoi (mock). */
function query(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  const media = window.matchMedia(QUERY) as MediaQueryList | undefined;
  return media && typeof media.matches === 'boolean' ? media : null;
}

function read(): Orientation {
  return query()?.matches ? 'portrait' : 'landscape';
}

/**
 * Orientation de l'ecran, suivie en direct.
 *
 * Un iPad se tient dans les deux sens ; certains ecrans (la carte) ne peuvent
 * pas se contenter d'un CSS fluide et doivent se REPROJETER. Ce hook est la
 * seule source de verite : pas de calcul d'aspect ailleurs.
 */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(read);

  useEffect(() => {
    const media = query();
    if (!media) return undefined;
    const update = (): void => setOrientation(media.matches ? 'portrait' : 'landscape');
    update();
    // iPadOS anterieur a 14 ne connait que l'ancienne API.
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return orientation;
}
