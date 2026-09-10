import { expect, test, type Page } from '@playwright/test';

/**
 * « MON ENFANT VOIT-IL MES MODIFICATIONS ? »
 *
 * Régression réelle, et la plus coûteuse de toutes : on modifiait l'aventure,
 * on quittait le mode édition, et l'écran revenait à l'ancienne version sans un
 * mot. Deux causes — rien ne disait qu'il fallait publier, et la publication ne
 * rafraîchissait pas le contenu servi.
 *
 * Ces tests suivent la boucle ENTIÈRE, du geste de l'adulte à l'écran de
 * l'enfant. C'est la seule façon de prouver qu'elle est refermée.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    indexedDB.deleteDatabase('pokexplo');
  });
});

async function enterEditMode(page: Page): Promise<void> {
  await page.goto('./');
  await page.getByPlaceholder('Ton prénom').waitFor({ timeout: 20_000 });
  await page.getByPlaceholder('Ton prénom').fill('Lucie');
  await page.getByRole('button', { name: /commencer l’aventure/i }).click();
  await expect(page.getByRole('button', { name: 'Partir à l’aventure !' })).toBeVisible({ timeout: 20_000 });

  await page.goto('./#/admin');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText('Pokexplo — Admin')).toBeVisible({ timeout: 20_000 });

  await page.goto('./#/parents');
  await page.getByRole('button', { name: /modifier l’aventure/i }).click();
  await expect(page.getByText('Mode édition')).toBeVisible({ timeout: 20_000 });
}

/** Renomme « Prairie » depuis la carte, en mode édition. */
async function renamePrairie(page: Page, name: string): Promise<void> {
  await page.goto('./#/play/map');
  await page.getByRole('button', { name: /modifier le lieu prairie/i }).click({ timeout: 20_000 });
  await page.getByLabel(/^Nom du lieu/).fill(name);
  await page.getByRole('button', { name: 'Terminé' }).click();
}

/** Les noms de lieux que l'ENFANT voit, hors mode édition. */
async function childMapLabels(page: Page): Promise<string[]> {
  await page.goto('./#/play/map');
  await expect(page.locator('.map__node').first()).toBeVisible({ timeout: 20_000 });
  return page.locator('.map__node-label').allTextContents();
}

test('publier depuis le bandeau fait arriver la modification chez l’enfant', async ({ page }) => {
  await enterEditMode(page);

  // Rien à publier au départ : on le dit, plutôt que de ne rien dire.
  await page.goto('./#/play/map');
  await expect(page.locator('.edit-bar')).toContainText('Votre enfant voit cette version', {
    timeout: 20_000,
  });

  await renamePrairie(page, 'Grand jardin');

  // La retouche est signalée comme NON PUBLIÉE, avec l'action qui va avec.
  await expect(page.locator('.edit-bar')).toContainText('Non publié');
  await page.getByRole('button', { name: /publier pour mon enfant/i }).click();

  // §53 — des textes sans voix : on propose la voix de synthèse, on ne bloque pas.
  await page.getByRole('button', { name: 'Publier quand même' }).click();
  await expect(page.locator('.edit-bar')).toContainText('votre enfant voit la nouvelle version', {
    timeout: 20_000,
  });

  await page.getByRole('button', { name: /quitter l’édition/i }).click();
  expect(await childMapLabels(page)).toContain('Grand jardin');
});

test('quitter sans publier prévient, au lieu de revenir en arrière sans un mot', async ({
  page,
}) => {
  await enterEditMode(page);
  await renamePrairie(page, 'Pré des Lucioles');

  await page.getByRole('button', { name: /quitter l’édition/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('ne sont pas publiées');

  // On peut partir quand même : le brouillon garde le travail.
  await page.getByRole('button', { name: 'Quitter sans publier' }).click();
  expect(await childMapLabels(page)).toContain('Prairie');

  // Et on le retrouve intact en revenant éditer.
  await page.goto('./#/parents');
  await page.getByRole('button', { name: /modifier l’aventure/i }).click();
  await page.goto('./#/play/map');
  await expect(
    page.getByRole('button', { name: /modifier le lieu pré des lucioles/i }),
  ).toBeVisible({ timeout: 20_000 });
});

test('publier depuis la modale de sortie suffit', async ({ page }) => {
  await enterEditMode(page);
  await renamePrairie(page, 'Clairière fleurie');

  await page.getByRole('button', { name: /quitter l’édition/i }).click();
  await page.getByRole('button', { name: 'Publier puis quitter' }).click();

  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
  expect(await childMapLabels(page)).toContain('Clairière fleurie');
});

test('publier depuis les menus fait la même chose', async ({ page }) => {
  await enterEditMode(page);
  await renamePrairie(page, 'Jardin des Papillons');

  await page.goto('./#/admin/releases');
  await page.getByRole('button', { name: 'Publier', exact: true }).click({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Publier quand même' }).click();

  // Le bandeau partagé doit le savoir : sans cela il affichait encore
  // « Non publié » après une publication réussie, et on republiait en boucle.
  await expect(page.locator('.admin__toolbar')).toContainText(/votre enfant voit/iu, {
    timeout: 20_000,
  });
  await expect(page.locator('.admin__toolbar')).not.toContainText('Non publié');

  // Plus rien n'attend d'être publié : on quitte l'édition sans avertissement.
  await page.goto('./#/play/map');
  await page.getByRole('button', { name: /quitter l’édition/i }).click({ timeout: 20_000 });
  await expect(page.locator('.edit-bar')).toHaveCount(0);

  expect(await childMapLabels(page)).toContain('Jardin des Papillons');
});
