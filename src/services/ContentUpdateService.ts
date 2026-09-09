import { ContentService } from './ContentService';
import { UpdateController } from '../pwa/register';

/**
 * MISE A JOUR AUTOMATIQUE (CONCEPTION §111).
 *
 * L'administrateur modifie le contenu depuis son ordinateur ; l'iPad de
 * l'enfant doit le voir arriver SEUL, sans qu'un adulte ait a recharger la
 * page. Ce service est l'horloge qui declenche la verification :
 *
 *  - au demarrage ;
 *  - a chaque retour au premier plan (c'est le cas le plus frequent sur iPad :
 *    l'application reste ouverte des jours en arriere-plan) ;
 *  - au retour du reseau ;
 *  - et toutes les dix minutes tant que l'application est visible.
 *
 * Il ne decide JAMAIS du moment d'application : il confie la bascule a
 * `UpdateController.runWhenIdle`, qui attend la fin d'un exercice, d'un combat
 * ou d'une capture (§111).
 */
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

class ContentUpdateServiceImpl {
  private apply: (() => Promise<void>) | null = null;

  private timer: ReturnType<typeof setInterval> | null = null;

  private disposers: Array<() => void> = [];

  private pending: Promise<boolean> | null = null;

  /**
   * Demarre la surveillance. `apply` recharge le contenu affiche — c'est le
   * `reload()` du ContentProvider. Renvoie la fonction d'arret.
   */
  start(apply: () => Promise<void>): () => void {
    this.stop();
    this.apply = apply;

    if (typeof window !== 'undefined') {
      const onVisible = (): void => {
        if (document.visibilityState === 'visible') void this.check();
      };
      const onOnline = (): void => void this.check();

      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('online', onOnline);
      window.addEventListener('focus', onVisible);
      this.disposers = [
        () => document.removeEventListener('visibilitychange', onVisible),
        () => window.removeEventListener('online', onOnline),
        () => window.removeEventListener('focus', onVisible),
      ];
      this.timer = setInterval(() => void this.check(), CHECK_INTERVAL_MS);
    }

    void this.check();
    return () => this.stop();
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    for (const dispose of this.disposers) dispose();
    this.disposers = [];
    this.apply = null;
  }

  /**
   * Une seule verification a la fois : un reveil d'iPad declenche souvent
   * `focus` et `visibilitychange` coup sur coup. Les appels qui arrivent
   * pendant une verification en cours attendent son resultat plutot que de la
   * relancer. Renvoie vrai si une mise a jour de contenu a ete programmee.
   */
  check(): Promise<boolean> {
    if (this.pending) return this.pending;
    this.pending = this.run().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async run(): Promise<boolean> {
    if (!this.apply) return false;
    try {
      // Le code de l'application se met a jour par le Service Worker...
      void UpdateController.checkForAppUpdate();
      // ...et le contenu par son numero de version.
      if (!(await ContentService.updateAvailable())) return false;
      const apply = this.apply;
      UpdateController.runWhenIdle(() => void apply());
      return true;
    } catch {
      return false;
    }
  }
}

export const ContentUpdateService = new ContentUpdateServiceImpl();
