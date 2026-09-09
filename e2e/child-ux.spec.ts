import { expect, test, type Page } from '@playwright/test';

/**
 * CHECKLIST DES ÉCRANS ENFANT (docs/UI_DESIGN.md §190, §195).
 *
 * « Un écran destiné à l'enfant ne présente jamais plus de QUATRE actions
 * conceptuellement différentes en même temps. »
 *
 * Une règle écrite dans un document ne tient pas toute seule : ce fichier la
 * mesure sur les écrans réels. Le Centre en présentait sept, dont DEUX menant
 * au même endroit.
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
  await expect(page.getByRole('button', { name: 'Partir !' })).toBeVisible({ timeout: 20_000 });
}

/**
 * Les choix qu'un enfant a réellement devant lui.
 *
 * Ne comptent pas — et c'est la définition de la règle, pas une échappatoire :
 *  - les éléments d'UNE collection (vingt créatures dans une grille sont un
 *    seul choix : « laquelle ? »), ni les réponses d'un exercice ;
 *  - le retour (§176) et le bouton 🔊 (§168), qui sont la même grammaire
 *    partout et n'ont pas à être compris ;
 *  - le cadenas parental, qui n'est pas proposé à l'enfant (appui long).
 */
async function childChoices(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const ignored = [
      '.ds-creature-card',
      '.ds-choice',
      '.map__node',
      '.map__edit',
      '.map__add',
      '.map__zone-edit',
      '.ds-voice',
      '.parent-gate',
      '.edit-bar *',
      '.edit-drawer *',
    ];
    return Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'))
      .filter((el) => !ignored.some((selector) => el.matches(selector) || el.closest(selector)))
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      })
      .map((el) => (el.getAttribute('aria-label') || el.textContent || '?').trim().slice(0, 40));
  });
}

const SCREENS: Array<{ name: string; hash: string; ready: RegExp }> = [
  { name: 'Centre', hash: './#/play', ready: /partir/i },
  { name: 'Carte', hash: './#/play/map', ready: /prairie/i },
  { name: 'Pokédex', hash: './#/play/pokedex', ready: /tous/i },
  { name: 'Équipe', hash: './#/play/team', ready: /équipe|pokémon/i },
  { name: 'Badges', hash: './#/play/badges', ready: /badge/i },
];

for (const screen of SCREENS) {
  test(`${screen.name} : quatre choix au maximum (§190)`, async ({ page }) => {
    await boot(page);
    await page.goto(screen.hash);
    await expect(page.getByText(screen.ready).first()).toBeVisible({ timeout: 20_000 });

    const choices = await childChoices(page);
    // Le retour, présent partout, fait partie de la grammaire : on l'exclut ici.
    const meaningful = choices.filter((label) => !/^retour/i.test(label));
    // Zéro est une bonne réponse : les Badges ne se touchent pas, ils se
    // regardent. C'est le plafond qui compte, pas un plancher.
    expect(meaningful.length, `${screen.name} propose : ${meaningful.join(' · ')}`).toBeLessThanOrEqual(4);
  });
}

test('le Centre ne propose jamais deux chemins vers l’aventure (§190)', async ({ page }) => {
  await boot(page);
  const choices = await childChoices(page);
  // Régression : une tuile « Aventure » ET un bouton « Partir ! ».
  expect(choices.filter((label) => /aventure|partir|carte/i.test(label))).toHaveLength(1);
});

/**
 * Change d'écran SANS recharger la page.
 *
 * `page.goto` relance le script d'amorçage, qui efface la base : le profil
 * créé par `boot` disparaissait, et l'accueil retombait sur l'écran de
 * création. On navigue donc comme le fait l'application elle-même.
 */
async function go(page: Page, hash: string): Promise<void> {
  await page.evaluate((value) => {
    window.location.hash = value;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, hash);
}

test('l’accueil est celui de l’enfant : ni version, ni champ de saisie', async ({ page }) => {
  await boot(page);
  await go(page, '');
  await expect(page.getByRole('button', { name: /jouer/i })).toBeVisible({ timeout: 20_000 });

  await expect(page.getByText(/^Version \d+\.\d+\.\d+$/)).toHaveCount(0);
  await expect(page.getByPlaceholder('Ton prénom')).toHaveCount(0);
  // Le cadenas parental porte « Espace parents — appui long » : c'est l'ancien
  // bouton en clair, au milieu de l'écran, qui ne doit plus exister.
  await expect(page.getByRole('button', { name: 'Espace parents', exact: true })).toHaveCount(0);
  // Son prénom est là, en grand : il reconnaît sa place sans savoir lire.
  await expect(page.getByText('Lucie')).toBeVisible();
});

test('l’espace parents demande un appui maintenu (§190)', async ({ page }) => {
  await boot(page);
  const gate = page.getByRole('button', { name: /espace parents/i });
  const box = (await gate.boundingBox())!;
  // Cible confortable pour un adulte, malgré sa discrétion.
  expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);

  // Un appui bref — celui d'un enfant qui explore — ne fait rien.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Partir !' })).toBeVisible();

  // Maintenu, il ouvre l'espace parents.
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  await expect(page.getByText(/espace parents — lucie/i)).toBeVisible({ timeout: 20_000 });
});

test('chaque écran enfant s’annonce à la voix (§192)', async ({ page }) => {
  await boot(page);

  // On observe ce que l'application demande à la synthèse : c'est la seule
  // preuve que l'enfant entend bien quelque chose en arrivant. Le mouchard est
  // posé sur la page VIVANTE — un rechargement effacerait le profil.
  await page.evaluate(() => {
    const scope = window as unknown as { __spoken: string[] };
    scope.__spoken = [];
    const original = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
      scope.__spoken.push(utterance.text);
      original(utterance);
    };
  });

  for (const [hash, expected] of [
    ['/play/pokedex', /rencontrés/i],
    ['/play/team', /emmener/i],
    ['/play/map', /où veux-tu aller/i],
  ] as const) {
    await go(page, hash);
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => (window as unknown as { __spoken?: string[] }).__spoken ?? [])).join(
            ' | ',
          ),
        { timeout: 15_000 },
      )
      .toMatch(expected);
  }
});
