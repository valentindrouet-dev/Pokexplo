/** Identifiant court, lisible et unique (sans dependance externe). */
export function uid(prefix = ''): string {
  const random =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/gu, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-6);
  return prefix ? `${prefix}_${random}` : random;
}

/**
 * Nom de fichier audio genere automatiquement (§48).
 * L'administrateur ne gere jamais les noms de fichiers a la main.
 */
export function voiceFileName(voiceId: string, extension: string): string {
  const short = voiceId.replace(/[^a-z0-9]/giu, '').slice(-8) || uid();
  return `voice_${short}_${uid().slice(0, 6)}.${extension}`;
}

/** Numerote une release : release_0001, release_0002... (§97) */
export function releaseId(index: number): string {
  return `release_${String(index).padStart(4, '0')}`;
}
