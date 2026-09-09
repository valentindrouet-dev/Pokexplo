/** Retire les accents : sert aux comparaisons de lettres et de mots. */
export function deaccent(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/gu, '');
}

/** Majuscule initiale, le reste inchange. */
export function capitalize(input: string): string {
  return input.length === 0 ? input : input[0]!.toUpperCase() + input.slice(1);
}

/** Formate une duree en secondes : "4,3 sec" (§40). */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 10) return `${seconds.toFixed(1).replace('.', ',')} sec`;
  const total = Math.round(seconds);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return min > 0 ? `${min} min ${String(sec).padStart(2, '0')}` : `${sec} sec`;
}

/** Chronometre d'enregistrement : 00:04 (§40). */
export function formatTimer(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Pourcentage arrondi pour le tableau parent (§77). */
export function percent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)} %`;
}

/**
 * Taille de fichier lisible : « 12,4 Mo ».
 *
 * On utilise les unites decimales (Mo = 10^6) : ce sont celles qu'affichent
 * iPadOS et les navigateurs, donc celles que l'administrateur verra ailleurs.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  const units = ['o', 'ko', 'Mo', 'Go', 'To'];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const rounded = unit === 0 || value >= 100 ? Math.round(value) : Number(value.toFixed(1));
  return `${String(rounded).replace('.', ',')} ${units[unit]}`;
}
