import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthService, type AdminCredentials, type SessionUser } from '../../services';
import { hasFirebaseConfig } from '../../firebase/config';

export interface AuthContextValue {
  user: SessionUser | null;
  isAdmin: boolean;
  elevate: (credentials: AdminCredentials) => Promise<void>;
  signOutAdmin: () => Promise<void>;
  error: string | null;
  /**
   * Comment on entre dans l'Admin : un simple code sur cet appareil, ou le
   * compte administrateur du projet Firebase. L'ecran de connexion s'y adapte.
   */
  mode: 'local' | 'firebase';
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** CONCEPTION §93 — deux roles seulement : ADMIN et PLAYER. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => AuthService.subscribe(setUser), []);

  const elevate = useCallback(async (credentials: AdminCredentials) => {
    try {
      setUser(await AuthService.elevate(credentials));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Accès refusé');
    }
  }, []);

  const signOutAdmin = useCallback(async () => {
    setUser(await AuthService.signOutAdmin());
  }, []);

  const mode: 'local' | 'firebase' = hasFirebaseConfig() ? 'firebase' : 'local';

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAdmin: user?.role === 'ADMIN', elevate, signOutAdmin, error, mode }),
    [user, elevate, signOutAdmin, error, mode],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return context;
}
