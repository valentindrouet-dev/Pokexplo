import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthService, type SessionUser } from '../../services';

export interface AuthContextValue {
  user: SessionUser | null;
  isAdmin: boolean;
  elevate: (secret: string) => Promise<void>;
  signOutAdmin: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** CONCEPTION §93 — deux roles seulement : ADMIN et PLAYER. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => AuthService.subscribe(setUser), []);

  const elevate = useCallback(async (secret: string) => {
    try {
      setUser(await AuthService.elevate(secret));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Accès refusé');
    }
  }, []);

  const signOutAdmin = useCallback(async () => {
    setUser(await AuthService.signOutAdmin());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAdmin: user?.role === 'ADMIN', elevate, signOutAdmin, error }),
    [user, elevate, signOutAdmin, error],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return context;
}
