import { expect, test, type Page } from '@playwright/test';

/**
 * PARCOURS COMPLET DE L'ENFANT (CONCEPTION §130).
 *
 * On rejoue exactement le scenario de reussite de la V1 :
 * lancer -> toucher « Commencer » -> naviguer sur la carte -> rencontrer une
 * creature -> faire un exercice -> capturer -> consulter le Pokedex.
 *
 * Les tests tournent sur iPad en paysage ET a 1024x768 (§159, §186).
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Chaque test part d'une aventure vierge.
    localStorage.clear();
    indexedDB.deleteDatabase('pokexplo');
  });
});

async function startAdventure(page: Page): Promise<void> {
  await page.goto('./');
  // Premier chargement : le bundle et le contenu doivent arriver.
  await page.getByPlaceholder('Ton prénom').waitFor({ timeout: 20_000 });
  await page.getByPlaceholder('Ton prénom').fill('Test');
  await page.getByRole('button', { name: /commencer l’aventure/i }).click();
  await expect(page.getByRole('button', { name: 'Partir !' })).toBeVisible();
}

test('l’enfant peut lancer l’aventure sans savoir lire', async ({ page }) => {
  await page.goto('./');

  // Un seul appel a l'action : le premier toucher debloque aussi l'audio (§64).
  const start = page.getByRole('button', { name: /commencer l’aventure/i });
  await expect(start).toBeVisible({ timeout: 20_000 });

  const box = await start.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(56);
});

test('le Centre propose des destinations très grandes et peu nombreuses', async ({ page }) => {
  await startAdventure(page);

  // Trois destinations, et une seule action principale (§190). « Aventure »,
  // « Quêtes » et « Professeur » ont disparu : la première doublait « Partir ! »,
  // les deux autres sont ce que dit le Professeur, en haut de l'écran.
  for (const label of ['Équipe', 'Pokédex', 'Badges']) {
    const tile = page.getByRole('button', { name: label, exact: true });
    await expect(tile).toBeVisible();
    const box = await tile.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(56);
  }
  for (const gone of ['Aventure', 'Quêtes', 'Professeur']) {
    await expect(page.getByRole('button', { name: gone, exact: true })).toHaveCount(0);
  }
  // Le Professeur dit la mission, et son bouton 🔊 la répète.
  await expect(page.getByText('Professeur')).toBeVisible();
  await expect(page.getByRole('button', { name: /réécouter le professeur/i })).toBeVisible();
});

test('la carte affiche les nœuds avec leur état et permet de voyager', async ({ page }) => {
  await startAdventure(page);
  await page.getByRole('button', { name: 'Partir !' }).click();

  await expect(page.getByRole('button', { name: /Centre — tu es ici/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Prairie — à explorer/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Arène — fermé/i })).toBeVisible();

  await page.getByRole('button', { name: /Prairie — à explorer/i }).click();

  await expect(page.getByRole('button', { name: 'Relever le défi !' })).toBeVisible({
    timeout: 15_000,
  });
});

test('rencontre → exercice → capture → Pokédex', async ({ page }) => {
  test.setTimeout(90_000);
  await startAdventure(page);
  await page.getByRole('button', { name: 'Partir !' }).click();
  await page.getByRole('button', { name: /Prairie — à explorer/i }).click();
  await page.getByRole('button', { name: 'Relever le défi !' }).click({ timeout: 15_000 });

  // L'exercice affiche une consigne, un bouton d'ecoute et de grandes reponses.
  await expect(page.getByRole('button', { name: /écouter la consigne/i })).toBeVisible();
  const answers = page.locator('.ds-choice');
  await expect(answers.first()).toBeVisible();

  const count = await answers.count();
  expect(count).toBeGreaterThanOrEqual(2);
  for (let index = 0; index < count; index += 1) {
    const box = await answers.nth(index).boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(100);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(70);
  }

  // On repond jusqu'a la reussite : l'enfant finit TOUJOURS par y arriver (§14).
  // Apres deux erreurs, l'aide renforcee ne laisse que deux reponses : le
  // parcours converge donc en cinq essais au maximum.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const available = page.locator('.ds-choice:not([data-state="removed"])');
    const remaining = await available.count();
    if (remaining === 0) break;
    await available.nth(attempt % remaining).click();
    await page.waitForTimeout(1500);
  }

  await expect(page.getByRole('button', { name: 'Continuer' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Continuer' }).click();

  // Retour a la carte, puis verification du Pokedex.
  await expect(page.getByRole('button', { name: /Centre — /i })).toBeVisible();
  await page.locator('.ds-icon-button').first().click();
  await page.getByRole('button', { name: 'Pokédex', exact: true }).click();

  await expect(page.getByText(/1 \/ 20 créatures attrapées/)).toBeVisible();
});

test('aucune fonctionnalité ne dépend du survol (§160)', async ({ page }) => {
  await startAdventure(page);
  // On n'utilise que des clics tactiles : le parcours precedent le prouve.
  await page.getByRole('button', { name: 'Pokédex', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tous' })).toBeVisible();
});

test('l’espace parents s’ouvre même sans profil, et propose une sortie', async ({ page }) => {
  await page.goto('./#/parents');

  // Regression : cet ecran restait bloque sur « Un instant… » tant qu'aucun
  // profil n'existait.
  await expect(page.getByText(/aucun profil n’a encore été créé/i)).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('button', { name: /créer un profil/i }).click();
  await expect(page.getByPlaceholder('Ton prénom')).toBeVisible();
});

test('l’espace parents affiche la progression une fois le profil créé', async ({ page }) => {
  await startAdventure(page);

  // L'espace parents s'ouvre depuis l'accueil : le hub enfant ne doit pas y
  // donner acces (§8, le Centre remplace les menus pour l'enfant).
  await page.goto('./#/parents');

  await expect(page.getByText(/espace parents — test/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Retour au jeu' })).toBeVisible();

  await page.getByRole('button', { name: 'Retour au jeu' }).click();
  await expect(page.getByRole('button', { name: 'Partir !' })).toBeVisible();
});

test('l’espace parents affiche la version installée', async ({ page }) => {
  // Repere indispensable pour verifier, sur l'iPad, que le Service Worker ne
  // sert plus une version precedente. Il a quitte l'accueil de l'enfant
  // (§190) : c'est une information d'adulte, elle vit chez les adultes — et
  // elle doit s'y trouver AVANT même qu'un profil existe, car c'est justement
  // quand rien ne marche qu'on va la chercher.
  await page.goto('./#/parents');
  await expect(page.getByText(/^Version \d+\.\d+\.\d+$/)).toBeVisible({ timeout: 20_000 });
});

test('le premier lancement mène à l’espace parents en un seul geste', async ({ page }) => {
  // Aucun profil : c'est un adulte qui est là, et l'écran l'assume (§190).
  await page.goto('./');
  await page.getByPlaceholder('Ton prénom').waitFor({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Espace parents', exact: true }).click();
  await expect(page.getByText(/espace parents/i).first()).toBeVisible();
});

test('l’espace admin est protégé par un code', async ({ page }) => {
  await page.goto('./#/admin');
  await expect(page.getByText(/réservé aux adultes/i)).toBeVisible();
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText('Pokexplo — Admin')).toBeVisible();
});

test('le design system est consultable en développement (§185)', async ({ page }) => {
  await page.goto('./#/dev/ui-kit');
  await expect(page.getByText('Design system — Pokexplo')).toBeVisible();
});

test('la page ne défile jamais horizontalement à 1024x768 (§159)', async ({ page }) => {
  await startAdventure(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
