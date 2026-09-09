import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { serviceWorkerPlugin } from './scripts/vite-plugin-service-worker';
import { appVersionPlugin } from './scripts/vite-plugin-app-version';

/**
 * GitHub Pages sert le site sous /<repo>/ ; on garde la possibilite de
 * surcharger via BASE_PATH pour un hebergement a la racine.
 */
const base = process.env.BASE_PATH ?? '/Pokexplo/';

export default defineConfig({
  base,
  plugins: [react(), appVersionPlugin(), serviceWorkerPlugin({ base })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Le SDK Firebase depasse 500 ko, mais il est charge dynamiquement et
    // seulement si une configuration existe : il n'entre jamais dans le
    // demarrage de l'enfant (docs/TECHNICAL_SPEC.md, « Backends »).
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase';
          }
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    css: false,
    restoreMocks: true,
  },
});
