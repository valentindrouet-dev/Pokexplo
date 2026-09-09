import { expect, test, type Page } from '@playwright/test';

/**
 * GARDE-FOUS DE MISE EN PAGE (docs/UI_DESIGN.md §158-159, §164, §167).
 *
 * Ces tests verrouillent une famille de défauts qui a réellement cassé
 * l'application sur iPad : des éléments qui se chevauchent parce qu'un bouton
 * ne grandit pas avec son contenu, ou parce qu'un enfant de colonne flex se
 * compresse dans un conteneur qui défile.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    indexedDB.deleteDatabase('pokexplo');
  });
});

async function boot(page: Page): Promise<void> {
  await page.goto('./');
  await page.getByPlaceholder('Ton prénom').waitFor({ timeout: 20_000 });
  await page.getByPlaceholder('Ton prénom').fill('Lucie');
  await page.getByRole('button', { name: /commencer l’aventure/i }).click();
  await expect(page.getByRole('button', { name: 'Partir !' })).toBeVisible();
}

/** Vérifie qu'aucun élément de la sélection n'en recouvre un autre. */
async function expectNoOverlap(page: Page, selector: string, minimum = 2): Promise<void> {
  const overlaps = await page.evaluate(
    ({ sel }) => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(sel));
      const rects = nodes.map((node) => node.getBoundingClientRect());
      const found: string[] = [];
      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          const a = rects[i]!;
          const b = rects[j]!;
          if (a.width === 0 || b.width === 0) continue;
          // Une tolérance d'un pixel absorbe les arrondis de rendu.
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapX > 1 && overlapY > 1) {
            found.push(`${i}↔${j} (${Math.round(overlapX)}×${Math.round(overlapY)} px)`);
          }
        }
      }
      return { count: nodes.length, found: found.slice(0, 5) };
    },
    { sel: selector },
  );

  expect(overlaps.count, `aucun élément « ${selector} » trouvé`).toBeGreaterThanOrEqual(minimum);
  expect(overlaps.found, `des éléments « ${selector} » se chevauchent`).toEqual([]);
}

test('les cartes du Pokédex ne se chevauchent jamais', async ({ page }) => {
  await boot(page);
  await page.goto('./#/play/pokedex');
  await expect(page.getByRole('button', { name: 'Tous' })).toBeVisible();

  await expectNoOverlap(page, '.ds-creature-card', 6);

  // Chaque carte doit afficher son illustration ET son nom.
  const card = page.locator('.ds-creature-card').first();
  const box = await card.boundingBox();
  const media = await card.locator('.ds-creature-card__media').boundingBox();
  expect(box!.height).toBeGreaterThan(media!.height);
});

test('la scène d’exercice ne déborde jamais sur les réponses', async ({ page }) => {
  await boot(page);
  await page.goto('./#/play/map');
  await page.getByRole('button', { name: /Prairie — à explorer/i }).click();
  await page.getByRole('button', { name: 'Relever le défi !' }).click({ timeout: 20_000 });
  await expect(page.locator('.ds-choice').first()).toBeVisible();

  const clash = await page.evaluate(() => {
    const stage = document.querySelector('.exercise__stage')!.getBoundingClientRect();
    const answers = document.querySelector('.exercise__answers')!.getBoundingClientRect();
    return Math.min(stage.bottom, answers.bottom) - Math.max(stage.top, answers.top);
  });
  expect(clash).toBeLessThanOrEqual(1);

  await expectNoOverlap(page, '.ds-choice');
});

test('les listes de l’admin ne se chevauchent jamais', async ({ page }) => {
  await page.goto('./#/admin/audio');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText(/^Voix \(/)).toBeVisible({ timeout: 20_000 });

  await expectNoOverlap(page, '.admin__scroll-list .ds-list-row', 3);
});

test('toutes les sections de l’admin sont atteignables sans défilement caché', async ({ page }) => {
  await page.goto('./#/admin');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText('Pokexplo — Admin')).toBeVisible({ timeout: 20_000 });

  // Les deux actions de bas de colonne restent visibles quoi qu'il arrive.
  await expect(page.getByRole('button', { name: 'Voir le jeu' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Quitter l’admin' })).toBeInViewport();

  // La dernière section est accessible (visible, ou par défilement de la liste).
  const last = page.getByRole('button', { name: 'Prévisualiser' });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
});

test('l’espace parents tient sur un écran d’iPad', async ({ page }) => {
  await boot(page);
  await page.goto('./#/parents');
  await expect(page.getByText(/espace parents — lucie/i)).toBeVisible({ timeout: 20_000 });

  // L'en-tête et ses actions restent visibles sans défiler.
  await expect(page.getByRole('button', { name: 'Retour au jeu' })).toBeInViewport();

  // Les panneaux d'information ne se recouvrent pas.
  await expectNoOverlap(page, '.parent__grid > .ds-panel', 4);

  // Aucun défilement horizontal, jamais (§159).
  const scrollsX = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(scrollsX).toBe(false);
});

test('le Centre donne accès à l’espace parents', async ({ page }) => {
  await boot(page);

  // Regression : depuis le Centre, aucun chemin ne menait à l'espace parents.
  await page.getByRole('button', { name: 'Espace parents' }).click();
  await expect(page.getByText(/espace parents — lucie/i)).toBeVisible({ timeout: 20_000 });
});
