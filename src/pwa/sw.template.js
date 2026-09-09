/**
 * SERVICE WORKER (CONCEPTION §110).
 *
 * Ce fichier est un MODELE : `scripts/vite-plugin-service-worker.ts` y injecte
 * au build la liste des fichiers hashes, le prefixe de deploiement et un
 * identifiant de version. Ne pas l'importer depuis l'application.
 *
 * Deux caches :
 *  - APP SHELL (JS, CSS, HTML, icones)  -> cache first, mise a jour en fond ;
 *  - RUNTIME (images, voix, musiques)   -> stale-while-revalidate.
 */

const BASE = __SW_BASE__;
const BUILD_ID = __SW_BUILD_ID__;
const SHELL_CACHE = `pokexplo-shell-${BUILD_ID}`;
const RUNTIME_CACHE = 'pokexplo-runtime';
const PRECACHE = __PRECACHE_MANIFEST__;

const MEDIA_PATTERN = /\.(?:png|jpe?g|webp|gif|svg|mp3|m4a|wav|webm|ogg|aac|mp4|woff2?)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // On ne fait pas echouer l'installation si un fichier manque.
      await Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('pokexplo-shell-') && key !== SHELL_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/**
 * §111 — la mise a jour n'est jamais brutale : c'est l'application qui decide
 * du moment (lancement, Centre Pokemon, entre deux sequences).
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigation : reseau d'abord, repli sur l'App Shell en cache (mode avion).
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await cache.match(`${BASE}index.html`)) ||
            (await cache.match(BASE)) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Medias (images, voix, musiques) : stale-while-revalidate, y compris
  // depuis Cloud Storage. C'est ce qui rend l'aventure jouable hors ligne (§69).
  if (MEDIA_PATTERN.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response && (response.ok || response.type === 'opaque')) {
              void cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => null);
        return cached || (await network) || Response.error();
      })(),
    );
    return;
  }

  // App Shell : cache d'abord.
  if (sameOrigin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) void cache.put(request, response.clone());
          return response;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
  }
});
