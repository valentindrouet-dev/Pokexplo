/**
 * Enregistrement du Service Worker et gestion de la mise a jour.
 *
 * CONCEPTION §111 : ne JAMAIS recharger brutalement pendant un exercice, un
 * combat ou une capture. L'application declare ses moments « occupes » et la
 * mise a jour n'est appliquee qu'au lancement, au Centre, ou entre deux
 * sequences.
 */

type UpdateListener = (ready: boolean) => void;

class UpdateControllerImpl {
  private waiting: ServiceWorker | null = null;

  private busy = false;

  private readonly listeners = new Set<UpdateListener>();

  private reloading = false;

  subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.waiting !== null);
    return () => this.listeners.delete(listener);
  }

  /** Marque une sequence pendant laquelle aucune mise a jour ne doit s'appliquer. */
  setBusy(busy: boolean): void {
    this.busy = busy;
    if (!busy) this.applyIfPossible();
  }

  isUpdateReady(): boolean {
    return this.waiting !== null;
  }

  setWaiting(worker: ServiceWorker | null): void {
    this.waiting = worker;
    for (const listener of this.listeners) listener(worker !== null);
    this.applyIfPossible();
  }

  /** Applique la mise a jour maintenant (appele depuis le Centre Pokemon). */
  applyUpdate(): void {
    if (!this.waiting) return;
    this.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  private applyIfPossible(): void {
    if (!this.busy && this.waiting) this.applyUpdate();
  }

  markReloading(): boolean {
    if (this.reloading) return false;
    this.reloading = true;
    return true;
  }
}

export const UpdateController = new UpdateControllerImpl();

export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    const url = `${import.meta.env.BASE_URL}sw.js`;
    /*
     * A la toute premiere visite, le Service Worker prend la main via
     * `clients.claim()` : `controllerchange` se declenche alors qu'il ne
     * s'agit PAS d'une mise a jour. Recharger a ce moment-la relançait la page
     * juste apres son ouverture — l'application semblait « ne rien charger ».
     */
    const hadController = Boolean(navigator.serviceWorker.controller);
    void navigator.serviceWorker
      .register(url, { scope: import.meta.env.BASE_URL })
      .then((registration) => {
        if (registration.waiting) UpdateController.setWaiting(registration.waiting);

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              UpdateController.setWaiting(installing);
            }
          });
        });
      })
      .catch((error: unknown) => {
        console.warn('[pokexplo] Service Worker non enregistré', error);
      });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      if (UpdateController.markReloading()) window.location.reload();
    });
  });
}
