import type { SaveFile } from '../types';
import { db, STORES } from './db';
import { getBackend } from './backends';

const QUEUE_KEY = 'pendingSaves';

/**
 * SYNC SERVICE (CONCEPTION §107).
 *
 * Le jeu ecrit TOUJOURS en local d'abord : l'enfant ne doit jamais attendre le
 * reseau. La file est rejouee des que la connexion revient.
 *
 * Conflit : la revision la plus haute gagne (§106). On ne supprime jamais une
 * sauvegarde distante, on la remplace uniquement si elle est plus ancienne.
 */
class SyncServiceImpl {
  private flushing = false;

  private listening = false;

  start(): void {
    if (this.listening || typeof window === 'undefined') return;
    this.listening = true;
    window.addEventListener('online', () => {
      void this.flush();
    });
  }

  isOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  }

  /** Empile une sauvegarde a synchroniser plus tard. */
  async enqueue(save: SaveFile): Promise<void> {
    const queue = (await db().get<SaveFile[]>(STORES.queue, QUEUE_KEY)) ?? [];
    const others = queue.filter((item) => item.profile.id !== save.profile.id);
    await db().put(STORES.queue, QUEUE_KEY, [...others, save]);
  }

  async pendingCount(): Promise<number> {
    const queue = (await db().get<SaveFile[]>(STORES.queue, QUEUE_KEY)) ?? [];
    return queue.length;
  }

  /** Pousse une sauvegarde vers le backend, ou l'empile si le reseau manque. */
  async push(save: SaveFile): Promise<'pushed' | 'queued'> {
    const backend = await getBackend();
    if (backend.kind === 'local') return 'pushed';
    if (!this.isOnline()) {
      await this.enqueue(save);
      return 'queued';
    }
    try {
      const remote = await backend.saves.get(save.profile.id);
      if (remote && remote.state.saveRevision > save.state.saveRevision) {
        // Le distant est plus recent : on ne l'ecrase pas.
        return 'pushed';
      }
      await backend.saves.put(save);
      return 'pushed';
    } catch {
      await this.enqueue(save);
      return 'queued';
    }
  }

  async flush(): Promise<number> {
    if (this.flushing || !this.isOnline()) return 0;
    const backend = await getBackend();
    if (backend.kind === 'local') return 0;

    this.flushing = true;
    try {
      const queue = (await db().get<SaveFile[]>(STORES.queue, QUEUE_KEY)) ?? [];
      const remaining: SaveFile[] = [];
      let pushed = 0;

      for (const save of queue) {
        try {
          await backend.saves.put(save);
          pushed += 1;
        } catch {
          remaining.push(save);
        }
      }

      await db().put(STORES.queue, QUEUE_KEY, remaining);
      return pushed;
    } finally {
      this.flushing = false;
    }
  }

  /** Choisit la sauvegarde a conserver entre locale et distante (§106). */
  resolve(local: SaveFile | null, remote: SaveFile | null): SaveFile | null {
    if (!local) return remote;
    if (!remote) return local;
    return remote.state.saveRevision > local.state.saveRevision ? remote : local;
  }
}

export const SyncService = new SyncServiceImpl();
