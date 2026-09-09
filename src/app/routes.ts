/**
 * ROUTAGE (CONCEPTION §88) — Hash Router.
 *
 * Indispensable sur GitHub Pages : aucune configuration serveur n'est
 * necessaire pour servir des URL profondes.
 */
export type AdminSection =
  | 'dashboard'
  | 'creatures'
  | 'exercises'
  | 'biomes'
  | 'nodes'
  | 'gyms'
  | 'quests'
  | 'packs'
  | 'audio'
  | 'images'
  | 'releases'
  | 'profiles'
  | 'progress'
  | 'preview';

export type Route =
  | { name: 'start' }
  | { name: 'center' }
  | { name: 'map' }
  | { name: 'pokedex' }
  | { name: 'team' }
  | { name: 'badges' }
  | { name: 'quests' }
  | { name: 'encounter'; nodeId: string }
  | { name: 'gym'; gymId: string }
  | { name: 'parents' }
  | { name: 'admin'; section: AdminSection }
  | { name: 'uikit' };

const ADMIN_SECTIONS: AdminSection[] = [
  'dashboard',
  'creatures',
  'exercises',
  'biomes',
  'nodes',
  'gyms',
  'quests',
  'packs',
  'audio',
  'images',
  'releases',
  'profiles',
  'progress',
  'preview',
];

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#/u, '').replace(/^\//u, '');
  const parts = clean.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'start' };

  if (parts[0] === 'play') {
    switch (parts[1]) {
      case undefined:
        return { name: 'center' };
      case 'map':
        return { name: 'map' };
      case 'pokedex':
        return { name: 'pokedex' };
      case 'team':
        return { name: 'team' };
      case 'badges':
        return { name: 'badges' };
      case 'quests':
        return { name: 'quests' };
      case 'encounter':
        return { name: 'encounter', nodeId: parts[2] ?? '' };
      case 'gym':
        return { name: 'gym', gymId: parts[2] ?? '' };
      default:
        return { name: 'center' };
    }
  }

  if (parts[0] === 'parents') return { name: 'parents' };

  if (parts[0] === 'admin') {
    const section = (parts[1] ?? 'dashboard') as AdminSection;
    return { name: 'admin', section: ADMIN_SECTIONS.includes(section) ? section : 'dashboard' };
  }

  if (parts[0] === 'dev' && parts[1] === 'ui-kit') return { name: 'uikit' };

  return { name: 'start' };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'start':
      return '#/';
    case 'center':
      return '#/play';
    case 'map':
      return '#/play/map';
    case 'pokedex':
      return '#/play/pokedex';
    case 'team':
      return '#/play/team';
    case 'badges':
      return '#/play/badges';
    case 'quests':
      return '#/play/quests';
    case 'encounter':
      return `#/play/encounter/${route.nodeId}`;
    case 'gym':
      return `#/play/gym/${route.gymId}`;
    case 'parents':
      return '#/parents';
    case 'admin':
      return route.section === 'dashboard' ? '#/admin' : `#/admin/${route.section}`;
    case 'uikit':
      return '#/dev/ui-kit';
    default:
      return '#/';
  }
}

/** Vrai pour les ecrans enfant : ils suivent integralement docs/UI_DESIGN.md. */
export function isPlayRoute(route: Route): boolean {
  return ['start', 'center', 'map', 'pokedex', 'team', 'badges', 'quests', 'encounter', 'gym'].includes(
    route.name,
  );
}
