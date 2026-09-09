import { Suspense, lazy, useEffect, useMemo } from 'react';
import { LoadingBall } from '../ui';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { UpdateController } from '../pwa/register';
import { AppProviders } from './providers/AppProviders';
import { NavigationProvider, useRouter } from './router';
import { isPlayRoute } from './routes';
import { StartScreen } from '../features/play/StartScreen';
import { CenterScreen } from '../features/center/CenterScreen';
import { MapScreen } from '../features/world-map/MapScreen';
import { EncounterScreen } from '../features/encounters/EncounterScreen';
import { PokedexScreen } from '../features/pokedex/PokedexScreen';
import { TeamScreen } from '../features/team/TeamScreen';
import { BadgesScreen } from '../features/play/BadgesScreen';
import { QuestsScreen } from '../features/quests/QuestsScreen';
import { GymScreen } from '../features/gyms/GymScreen';
import { ParentDashboard } from '../features/parent-dashboard/ParentDashboard';
import { EditModeHost } from '../features/edit-mode/EditModeHost';

// L'Admin et le kit UI ne sont jamais charges par l'enfant : ils sont
// decoupes en chunks separes pour garder le demarrage rapide sur iPad.
const AdminApp = lazy(() =>
  import('../features/admin/AdminApp').then((module) => ({ default: module.AdminApp })),
);
const UiKitPage = lazy(() =>
  import('../features/dev/UiKitPage').then((module) => ({ default: module.UiKitPage })),
);

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <Routes />
      </AppProviders>
    </ErrorBoundary>
  );
}

function Routes() {
  const router = useRouter();
  const { route } = router;

  // §178 — l'Admin est une interface adulte : on l'annonce au CSS de base.
  useEffect(() => {
    document.body.dataset.surface = route.name === 'admin' ? 'admin' : 'play';
  }, [route.name]);

  // §111 — pas de mise a jour pendant un exercice, un combat ou une capture.
  useEffect(() => {
    const busy = route.name === 'encounter' || route.name === 'gym';
    UpdateController.setBusy(busy);
  }, [route.name]);

  const screen = useMemo(() => {
    switch (route.name) {
      case 'start':
        return <StartScreen />;
      case 'center':
        return <CenterScreen />;
      case 'map':
        return <MapScreen />;
      case 'encounter':
        return <EncounterScreen nodeId={route.nodeId} />;
      case 'pokedex':
        return <PokedexScreen />;
      case 'team':
        return <TeamScreen />;
      case 'badges':
        return <BadgesScreen />;
      case 'quests':
        return <QuestsScreen />;
      case 'gym':
        return <GymScreen gymId={route.gymId} />;
      case 'parents':
        return <ParentDashboard />;
      case 'admin':
        return <AdminApp section={route.section} />;
      case 'uikit':
        return <UiKitPage />;
      default:
        return <StartScreen />;
    }
  }, [route]);

  return (
    <NavigationProvider value={router}>
      {/* Le brouillon et le tiroir d'édition n'existent que pour un adulte. */}
      <EditModeHost>
        <div className="app-root" data-surface={isPlayRoute(route) ? 'play' : 'admin'}>
          <Suspense fallback={<LoadingBall />}>{screen}</Suspense>
        </div>
      </EditModeHost>
    </NavigationProvider>
  );
}
