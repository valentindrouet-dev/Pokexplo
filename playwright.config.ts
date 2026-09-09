import { defineConfig, devices } from '@playwright/test';

/**
 * Les tests E2E ciblent la cible reelle du projet : un iPad en paysage.
 * On verifie aussi la resolution plancher 1024x768 (docs/UI_DESIGN.md).
 */
/**
 * Certains environnements fournissent deja un Chromium (conteneurs de CI,
 * postes verrouilles). `PLAYWRIGHT_CHROMIUM_PATH` permet de l'utiliser au lieu
 * de retelecharger un navigateur.
 */
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const launchOptions = chromiumPath ? { executablePath: chromiumPath } : {};

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/Pokexplo/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      // Emulation iPad paysage. On force Chromium : WebKit n'est pas toujours
      // disponible en CI, et le vrai Safari/iPad se teste a la main (§120).
      name: 'ipad-landscape',
      use: {
        ...devices['iPad (gen 7) landscape'],
        browserName: 'chromium',
        launchOptions,
      },
    },
    {
      // Un iPad se tient aussi debout : meme exigence de lisibilite (§159).
      name: 'ipad-portrait',
      use: {
        ...devices['iPad (gen 7)'],
        browserName: 'chromium',
        launchOptions,
      },
    },
    {
      // Resolution plancher imposee par docs/UI_DESIGN.md §159.
      name: 'ipad-1024x768',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
        isMobile: false,
        launchOptions,
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/Pokexplo/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
