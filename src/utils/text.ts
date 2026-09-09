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
