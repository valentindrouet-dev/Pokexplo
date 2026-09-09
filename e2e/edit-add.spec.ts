import { expect, test, type Page } from '@playwright/test';

/**
 * AJOUTER, CHOISIR UN PICTOGRAMME, ET NE JAMAIS SUPERPOSER LES TEXTES.
 *
 * Trois demandes de l'éditeur visuel, suivies de bout en bout jusqu'à l'écran
 * de l'enfant, dans les trois formats du projet :
 *  - le « + » d'un lieu crée un lieu jouable à côté, relié, et l'ouvre ;
 *  - le pictogramme choisi dans le tiroir se voit sur la carte de l'enfant ;
 *  - une carte volontairement serrée garde des étiquettes lisibles.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    indexedDB.deleteDatabase('pokexplo');
  });
});

async function openMapInEditMode(page: Page): Promise<void> {
  await page.goto('./');
  await page.getByPlaceholder('Ton prénom').waitFor({ timeout: 20_000 });
  await page.getByPlaceholder('Ton prénom').fill('Lucie');
  await page.getByRole('button', { name: /commencer l’aventure/i }).click();
  await expect(page.getByRole('button', { name: 'Partir !' })).toBeVisible({ timeout: 20_000 });

  await page.goto('./#/admin');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText('Pokexplo — Admin')).toBeVisible({ timeout: 20_000 });

  await page.goto('./#/parents');
  await page.getByRole('button', { name: /modifier l’aventure/i }).click();
  await expect(page.getByText('Mode édition')).toBeVisible({ timeout: 20_000 });

  await page.goto('./#/play/map');
  await expect(page.locator('.map__node').first()).toBeVisible({ timeout: 20_000 });
}

/** Aucun texte de la carte n'en recouvre un autre, ni un pictogramme. */
async function expectMapTextsApart(page: Page): Promise<void> {
  const found = await page.evaluate(() => {
    const texts = Array.from(
      document.querySelectorAll<SVGTextElement>('.map__node-label, .map__zone-label'),
    );
    const icons = Array.from(document.querySelectorAll<SVGCircleElement>('.map__node-ring'));
    const rect = (el: Element): DOMRect => el.getBoundingClientRect();
    const clashes: string[] = [];
    const overlap = (a: DOMRect, b: DOMRect): number => {
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      return w > 0 && h > 0 ? Math.min(w, h) : 0;
    };
    for (let i = 0; i < texts.length; i += 1) {
      for (let j = i + 1; j < texts.length; j += 1) {
        const depth = overlap(rect(texts[i]!), rect(texts[j]!));
        if (depth > 1) clashes.push(`${texts[i]!.textContent} ↔ ${texts[j]!.textContent} (${Math.round(depth)} px)`);
      }
      for (const icon of icons) {
        const depth = overlap(rect(texts[i]!), rect(icon));
        if (depth > 2) clashes.push(`${texts[i]!.textContent} sur un pictogramme (${Math.round(depth)} px)`);
      }
    }
    return { count: texts.length, clashes };
  });
  expect(found.count).toBeGreaterThan(8);
  expect(found.clashes, 'des textes de la carte se chevauchent').toEqual([]);
}

async function centreOf(page: Page, label: string): Promise<{ x: number; y: number }> {
  // L'anneau du lieu, et non le groupe entier : celui-ci contient aussi
  // l'etiquette (qui change de cote) et les pastilles d'edition.
  const box = await page.locator(`.map__node[aria-label^="${label}"] .map__node-ring`).boundingBox();
  if (!box) throw new Error(`lieu « ${label} » introuvable`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function dragTo(page: Page, label: string, to: { x: number; y: number }): Promise<void> {
  const from = await centreOf(page, label);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 14 });
  await page.mouse.up();
}

test('le « + » d’un lieu en crée un autre à côté, relié, et l’ouvre pour le nommer', async ({
  page,
}) => {
  await openMapInEditMode(page);
  const before = await page.locator('.map__node').count();

  await page.getByRole('button', { name: 'Ajouter un lieu après Grand pré' }).click();

  // Le tiroir s'ouvre sur le nouveau lieu : on le nomme sans chercher.
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('Nouveau lieu');
  const name = page.getByLabel(/^Nom du lieu/);
  await expect(name).toHaveValue('Nouveau lieu');
  await name.fill('Verger');
  // Il hérite des créatures et des exercices de son voisin : jouable tout de suite.
  await expect(drawer.getByRole('button', { name: 'Piloupi', pressed: true })).toBeVisible();
  await page.getByRole('button', { name: 'Terminé' }).click();

  await expect(page.locator('.map__node')).toHaveCount(before + 1);
  const node = page.locator('.map__node[aria-label^="Verger"]');
  await expect(node).toBeVisible();
  // Un chemin de plus : il est relié à « Grand pré ».
  await expectMapTextsApart(page);

  // L'enfant le voit après publication, avec son chemin.
  await page.getByRole('button', { name: /publier pour mon enfant/i }).click();
  await page.getByRole('button', { name: 'Publier quand même' }).click();
  await expect(page.locator('.edit-bar')).toContainText('votre enfant voit la nouvelle version', {
    timeout: 20_000,
  });
  await page.getByRole('button', { name: /quitter l’édition/i }).click();
  await expect(page.locator('.map__node[aria-label^="Verger"]')).toBeVisible();
});

test('le pictogramme choisi se voit sur la carte de l’enfant', async ({ page }) => {
  await openMapInEditMode(page);

  await page.getByRole('button', { name: 'Modifier le lieu Prairie' }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('button', { name: 'Pictogramme de la région', pressed: true })).toBeVisible();
  await drawer.getByRole('button', { name: 'Champignon', exact: true }).click();
  await expect(drawer.getByRole('button', { name: 'Champignon', pressed: true })).toBeVisible();
  await expect(drawer).toContainText('Actuellement : Champignon');
  await page.getByRole('button', { name: 'Terminé' }).click();

  /** Le dessin du lieu, pour le comparer avant / après. */
  const iconOf = (label: string): Promise<string> =>
    page.evaluate(
      (name) =>
        Array.from(
          document.querySelector(`.map__node[aria-label^="${name}"] g[pointer-events="none"] svg`)
            ?.querySelectorAll('path') ?? [],
        )
          .map((p) => p.getAttribute('d'))
          .join('|'),
      label,
    );
  const chosen = await iconOf('Prairie');
  const neighbour = await iconOf('Grand pré');
  expect(chosen).not.toBe(neighbour);

  await page.getByRole('button', { name: /publier pour mon enfant/i }).click();
  await page.getByRole('button', { name: 'Publier quand même' }).click();
  await expect(page.locator('.edit-bar')).toContainText('votre enfant voit la nouvelle version', {
    timeout: 20_000,
  });
  await page.getByRole('button', { name: /quitter l’édition/i }).click();
  await expect(page.locator('.map__node--draggable')).toHaveCount(0);
  expect(await iconOf('Prairie')).toBe(chosen);
});

test('une carte serrée garde des textes lisibles, et deux lieux ne se posent jamais l’un sur l’autre', async ({
  page,
}) => {
  await openMapInEditMode(page);

  // On rapproche tout le monde de « Sentier » : voisins et région d'à côté.
  const target = await centreOf(page, 'Sentier');
  await dragTo(page, 'Grand pré', { x: target.x - 40, y: target.y + 10 });
  await dragTo(page, 'Rivière', { x: target.x + 45, y: target.y - 5 });
  await dragTo(page, 'Lisière', { x: target.x + 5, y: target.y - 50 });
  // Et un lieu lâché EXACTEMENT sur un autre : il doit s'écarter.
  await dragTo(page, 'Cascade', target);

  await page.waitForTimeout(400);
  await expectMapTextsApart(page);

  const sentier = await centreOf(page, 'Sentier');
  const cascade = await centreOf(page, 'Cascade');
  expect(Math.hypot(sentier.x - cascade.x, sentier.y - cascade.y)).toBeGreaterThan(40);
});
