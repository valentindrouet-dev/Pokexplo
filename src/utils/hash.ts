/**
 * Empreinte stable d'un texte (FNV-1a 64 bits simule sur deux mots de 32 bits).
 *
 * CONCEPTION §50 : c'est cette empreinte qui permet de detecter qu'un texte a
 * ete modifie apres l'enregistrement de sa voix (statut VOICE_OUTDATED).
 */
export function textHash(input: string): string {
  const normalized = normalizeForHash(input);
  let h1 = 0x811c9dc5;
  let h2 = 0xc2b2ae35;
  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'));
}

/**
 * Les differences insignifiantes (espaces multiples, espaces en trop) ne doivent
 * pas rendre une voix obsolete : on normalise avant de hacher.
 */
export function normalizeForHash(input: string): string {
  return input.replace(/\s+/gu, ' ').trim();
}

/** Vrai si le texte courant correspond encore a l'empreinte enregistree. */
export function matchesHash(text: string, hash: string | undefined): boolean {
  if (!hash) return false;
  return textHash(text) === hash;
}
