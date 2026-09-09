import { getBackend } from './backends';
import type { SessionUser } from './backends';

type Listener = (user: SessionUser) => void;

/**
 * AUTH SERVICE (CONCEPTION §93).
 *
 * Deux roles : ADMIN (contenu, images, voix, publication, progression) et
 * PLAYER (lire le contenu, jouer, sauvegarder). En mode local, le passage en
 * ADMIN est une simple barriere pour eviter qu'un enfant n'ouvre l'Admin ;
 * en mode Firebase, le role vient de Firestore et est protege par les regles.
 */
class AuthServiceImpl {
  private user: SessionUser | null = null;

  private readonly listeners = new Set<Listener>();

  async current(): Promise<SessionUser> {
    if (this.user) return this.user;
    const backend = await getBackend();
    this.user = await backend.auth.currentUser();
    return this.user;
  }

  async isAdmin(): Promise<boolean> {
    return (await this.current()).role === 'ADMIN';
  }

  async elevate(secret: string): Promise<SessionUser> {
    const backend = await getBackend();
    this.user = await backend.auth.elevate(secret);
    this.emit();
    return this.user;
  }

  async signOutAdmin(): Promise<SessionUser> {
    const backend = await getBackend();
    this.user = await backend.auth.signOutAdmin();
    this.emit();
    return this.user;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    void this.current().then((user) => listener(user));
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    if (!this.user) return;
    for (const listener of this.listeners) listener(this.user);
  }
}

export const AuthService = new AuthServiceImpl();
