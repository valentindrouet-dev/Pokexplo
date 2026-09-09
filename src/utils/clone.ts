/**
 * Copie profonde d'une donnée de contenu.
 *
 * `structuredClone` n'existe qu'à partir d'iPadOS 15.4 : sur un iPad plus
 * ancien, l'appeler au premier chargement ferait échouer toute l'application.
 * Le contenu (créatures, nœuds, voix…) est du JSON pur, donc le repli par
 * sérialisation est strictement équivalent ici.
 */
export function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      /* donnée non clonable : on passe au repli */
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
