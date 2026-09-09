import { expect, test, type Page } from '@playwright/test';

/**
 * DÉPLACER LES LIEUX SUR LA CARTE (mode édition).
 *
 * Ces tests s'exécutent dans les trois formats du projet — paysage, portrait et
 * 1024 × 768 — parce que la carte se REPROJETTE : un glissement doit donner le
 * même résultat quel que soit le sens dans lequel on tient l'iPad.
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
  await expect(page.getByRole('button', { name: 'Partir !' })).toBeVisible();

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

/** Centre d'un lieu, en pixels d'écran. */
async function centreOf(page: Page, label: string): Promise<{ x: number; y: number }> {
  const box = await page.locator(`.map__node[aria-label^="${label}"]`).boundingBox();
  if (!box) throw new Error(`lieu « ${label} » introuvable`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function dragBy(page: Page, label: string, dx: number, dy: number): Promise<void> {
  const from = await centreOf(page, label);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // Plusieurs étapes : c'est ce qui distingue un glissement d'un appui.
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 12 });
  await page.mouse.up();
}

interface DraftNode {
  id: string;
  x: number;
  y: number;
  biomeId: string;
}

/**
 * Le nœud tel qu'il est ENREGISTRÉ dans le brouillon.
 *
 * L'écriture est différée de quelques centaines de millisecondes : on interroge
 * donc toujours ce brouillon par sondage (`expect.poll`), jamais une seule fois.
 */
async function draftNode(page: Page, id: string): Promise<DraftNode> {
  return page.evaluate(
    (nodeId) =>
      new Promise<DraftNode>((resolve, reject) => {
        const request = indexedDB.open('pokexplo');
        request.onerror = () => reject(new Error('IndexedDB indisponible'));
        request.onsuccess = () => {
          const read = request.result.transaction('kv', 'readonly').objectStore('kv').get('draft');
          read.onsuccess = () => {
            const draft = read.result as { nodes: DraftNode[] } | undefined;
            const node = draft?.nodes.find((entry) => entry.id === nodeId);
            if (!node) reject(new Error(`nœud ${nodeId} absent du brouillon`));
            else resolve({ id: node.id, x: node.x, y: node.y, biomeId: node.biomeId });
          };
          read.onerror = () => reject(new Error('brouillon illisible'));
        };
      }),
    id,
  );
}

test('un lieu se déplace au doigt, et sa région suit', async ({ page }) => {
  await openMapInEditMode(page);

  const before = await draftNode(page, 'prairie-2');
  const bubble = page.locator('[data-biome="prairie"] .map__zone');
  const bubbleBefore = await bubble.boundingBox();

  await dragBy(page, 'Grand pré', 90, -40);

  // La position est écrite dans le brouillon, rangée sur la grille (§115).
  await expect
    .poll(async () => (await draftNode(page, 'prairie-2')).x, { timeout: 10_000 })
    .not.toBe(before.x);
  const after = await draftNode(page, 'prairie-2');
  expect(Number.isInteger(after.x)).toBe(true);
  expect(Number.isInteger(after.y)).toBe(true);
  // Le lieu ne change pas de région tant qu'on ne le demande pas.
  expect(after.biomeId).toBe('prairie');

  // La bulle de sa région s'est reformée autour de sa nouvelle place.
  expect(await bubble.boundingBox()).not.toEqual(bubbleBefore);
});

test('un simple appui reste un voyage, même en mode édition', async ({ page }) => {
  await openMapInEditMode(page);
  const before = await draftNode(page, 'prairie-1');

  await page.locator('.map__node[aria-label^="Prairie"]').click();

  // On part en voyage : l'adulte peut parcourir l'aventure tout en l'éditant.
  await expect(page).toHaveURL(/#\/play\/encounter\/prairie-1/, { timeout: 20_000 });
  expect(await draftNode(page, 'prairie-1')).toEqual(before);
});

test('un lieu ne peut pas être lâché hors du cadre', async ({ page }) => {
  await openMapInEditMode(page);

  // On tire jusqu'au coin du panneau : la position est ramenée dans la boîte.
  const map = (await page.locator('.map').boundingBox())!;
  const from = await centreOf(page, 'Grand pré');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(map.x + 2, map.y + 2, { steps: 14 });
  await page.mouse.up();

  await expect
    .poll(async () => (await draftNode(page, 'prairie-2')).x, { timeout: 10_000 })
    .not.toBe(29);

  const at = await draftNode(page, 'prairie-2');
  expect(at.x).toBeGreaterThanOrEqual(7);
  expect(at.y).toBeGreaterThanOrEqual(11);

  // Le lieu et sa bulle restent entièrement dans le panneau de la carte.
  const node = (await page.locator('.map__node[aria-label^="Grand pré"]').boundingBox())!;
  expect(node.x).toBeGreaterThanOrEqual(map.x - 1);
  expect(node.y).toBeGreaterThanOrEqual(map.y - 1);
});

test('un lieu lâché chez une autre région propose de la rejoindre', async ({ page }) => {
  await openMapInEditMode(page);

  const from = await centreOf(page, 'Grand pré');
  const onto = await centreOf(page, 'Lisière');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(onto.x, onto.y, { steps: 14 });
  await page.mouse.up();

  // On le signale, on ne réaffecte jamais dans le dos de l'administrateur.
  const prompt = page.getByRole('status');
  await expect(prompt).toContainText(/Grand pré.*Forêt de Jade/s, { timeout: 10_000 });

  await page.getByRole('button', { name: 'Rattacher à cette région' }).click();
  await expect(prompt).toHaveCount(0);

  await expect
    .poll(async () => (await draftNode(page, 'prairie-2')).biomeId, { timeout: 10_000 })
    .toBe('foret');
  // La bulle de la forêt englobe désormais ce lieu.
  await expect(page.locator('[data-biome="foret"] .map__zone').first()).toBeVisible();
});

test('l’enfant ne peut jamais déplacer un lieu', async ({ page }) => {
  await page.goto('./');
  await page.getByPlaceholder('Ton prénom').waitFor({ timeout: 20_000 });
  await page.getByPlaceholder('Ton prénom').fill('Lucie');
  await page.getByRole('button', { name: /commencer l’aventure/i }).click();
  // Le profil doit exister avant d'ouvrir la carte : sans lui, elle est vide.
  await expect(page.getByRole('button', { name: 'Partir !' })).toBeVisible({ timeout: 20_000 });
  await page.goto('./#/play/map');
  await expect(page.locator('.map__node').first()).toBeVisible({ timeout: 20_000 });

  await expect(page.locator('.map__node--draggable')).toHaveCount(0);

  // « Grand pré » est encore fermé : le toucher ne déclenche aucun voyage, on
  // observe donc le seul effet possible d'un glissement — aucun.
  const node = page.locator('.map__node[aria-label^="Grand pré"]');
  const before = await node.boundingBox();
  await dragBy(page, 'Grand pré', 120, -70);
  await page.waitForTimeout(500);

  expect((await node.boundingBox())?.x).toBeCloseTo(before?.x ?? 0, 0);
  await expect(page).toHaveURL(/#\/play\/map$/);
});
