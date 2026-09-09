import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { parseHash, routeToHash, type Route } from './routes';

/** Petit routeur a hash, sans dependance (§88). */
export function useRouter(): { route: Route; navigate: (route: Route) => void; back: () => void } {
  const [route, setRoute] = useState<Route>(() =>
    parseHash(typeof window === 'undefined' ? '' : window.location.hash),
  );

  useEffect(() => {
    const onChange = (): void => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    const hash = routeToHash(next);
    if (window.location.hash === hash) {
      setRoute(next);
      return;
    }
    window.location.hash = hash;
  }, []);

  const back = useCallback(() => {
    window.history.back();
  }, []);

  return { route, navigate, back };
}

export interface NavigationValue {
  route: Route;
  navigate: (route: Route) => void;
  back: () => void;
}

const NavigationContext = createContext<NavigationValue | null>(null);

export function NavigationProvider({
  value,
  children,
}: {
  value: NavigationValue;
  children: ReactNode;
}) {
  const memo = useMemo(() => value, [value]);
  return <NavigationContext value={memo}>{children}</NavigationContext>;
}

/** Acces a la navigation depuis n'importe quel ecran. */
export function useNavigation(): NavigationValue {
  const context = use(NavigationContext);
  if (!context) throw new Error('useNavigation doit être utilisé dans <NavigationProvider>');
  return context;
}
