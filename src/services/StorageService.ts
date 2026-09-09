/**
 * STORAGE SERVICE — combien de place l'aventure occupe-t-elle sur l'appareil ?
 *
 * Il n'existe PAS de limite fixe : chaque navigateur applique son propre quota,
 * calcule a partir de l'espace libre du disque. C'est pourquoi ce service
 * *mesure* le quota reel sur l'appareil plutot que d'annoncer un chiffre :
 * la seule reponse juste est celle que donne l'iPad de l'enfant.
 *
 * Ordres de grandeur observes (a titre indicatif seulement) :
 *  - Safari / iPadOS : environ 20 % de l'espace libre du disque, et le
 *    stockage d'un site non installe peut etre efface apres 7 jours sans
 *    visite. Ajouter l'application a l'ecran d'accueil et demander le
 *    stockage persistant evitent cet effacement.
 *  - Chrome / Edge   : jusqu'a 60 % de l'espace libre.
 *
 * Aucune sauvegarde n'est jamais supprimee par ce service (CLAUDE.md §2) :
 * il ne fait que lire une estimation et demander la persistance.
 */
export interface StorageReport {
  /** Faux si le navigateur n'expose pas `navigator.storage` (vieux Safari). */
  supported: boolean;
  /** Octets utilises par l'application sur cet appareil, si connus. */
  usage: number | null;
  /** Quota accorde par le navigateur a ce site, si connu. */
  quota: number | null;
  /** Vrai si le navigateur s'engage a ne pas effacer ces donnees. */
  persisted: boolean;
  /** Part du quota deja utilisee (0 a 1), si les deux valeurs sont connues. */
  ratio: number | null;
}

const EMPTY: StorageReport = {
  supported: false,
  usage: null,
  quota: null,
  persisted: false,
  ratio: null,
};

interface StorageManagerLike {
  estimate?: () => Promise<{ usage?: number; quota?: number }>;
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}

function manager(): StorageManagerLike | null {
  if (typeof navigator === 'undefined') return null;
  const storage = (navigator as Navigator & { storage?: StorageManagerLike }).storage;
  return storage ?? null;
}

class StorageServiceImpl {
  /** Mesure l'occupation reelle. Ne leve jamais : c'est une information. */
  async report(): Promise<StorageReport> {
    const storage = manager();
    if (!storage?.estimate) return EMPTY;

    try {
      const estimate = await storage.estimate();
      const usage = typeof estimate.usage === 'number' ? estimate.usage : null;
      const quota = typeof estimate.quota === 'number' ? estimate.quota : null;
      const persisted = storage.persisted ? await storage.persisted() : false;
      return {
        supported: true,
        usage,
        quota,
        persisted,
        ratio: usage !== null && quota !== null && quota > 0 ? usage / quota : null,
      };
    } catch {
      return EMPTY;
    }
  }

  /**
   * Demande au navigateur de ne PAS effacer les donnees du site.
   *
   * Sur iPadOS, la demande n'aboutit que si l'application a ete ajoutee a
   * l'ecran d'accueil : on renvoie donc simplement le resultat, sans promesse.
   */
  async requestPersistence(): Promise<boolean> {
    const storage = manager();
    if (!storage?.persist) return false;
    try {
      return await storage.persist();
    } catch {
      return false;
    }
  }
}

export const StorageService = new StorageServiceImpl();
