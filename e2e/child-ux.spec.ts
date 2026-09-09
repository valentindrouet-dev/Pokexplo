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
    /*
     * Un GROUPE compte pour un seul choix.
     *
     * Une rangée de filtres, une grille de créatures, les six places d'une
     * équipe : ce sont autant de réponses à UNE question — « lequel ? ». Ce
     * qui fatigue un enfant, ce sont les questions différentes, pas le nombre
     * de réponses. Le groupe est déclaré dans le code (`data-choice-group`),
     * pas deviné ici.
     */
    const groups = new Set<string>();
    const ignored = [
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
      .filter((el) => {
        const group = el.closest<HTMLElement>('[data-choice-group]')?.dataset.choiceGroup;
        if (!group) return true;
        if (groups.has(group)) return false;
        groups.add(group);
        return true;
      })
      .map((el) => {
        const group = el.closest<HTMLElement>('[data-choice-group]')?.dataset.choiceGroup;
        return group ?? (el.getAttribute('aria-label') || el.textContent || '?').trim().slice(0, 40);
      });
  });
}

const SCREENS: Array<{ name: string; hash: string; ready: string }> = [
  { name: 'Centre', hash: './#/play', ready: '.center-hub' },
  { name: 'Carte', hash: './#/play/map', ready: '.map__node' },
  { name: 'Pokédex', hash: './#/play/pokedex', ready: '.pokedex__grid' },
  { name: 'Équipe', hash: './#/play/team', ready: '.team__slots' },
  { name: 'Badges', hash: './#/play/badges', ready: '.badges' },
];

for (const screen of SCREENS) {
  test(`${screen.name} : quatre choix au maximum (§190)`, async ({ page }) => {
    await boot(page);
    await page.goto(screen.hash);
    await expect(page.locator(screen.ready).first()).toBeVisible({ timeout: 20_000 });

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
  // Le cadenas discret reste ; c'est l'ancien bouton en clair, au milieu de
  // l'écran de l'enfant, qui ne doit plus exister.
  await expect(page.locator('.play__content').getByRole('button', { name: 'Espace parents' })).toHaveCount(0);
  // Son prénom est là, en grand : il reconnaît sa place sans savoir lire.
  await expect(page.getByText('Lucie')).toBeVisible();
});

test('le cadenas répond toujours, et mène à l’espace parents (§190)', async ({ page }) => {
  await boot(page);
  const gate = page.getByRole('button', { name: 'Espace parents' });
  const box = (await gate.boundingBox())!;
  // Cible confortable pour un adulte, malgré sa discrétion.
  expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);

  /*
   * RÉGRESSION VÉCUE : un appui bref ne faisait RIEN — ni action, ni retour
   * visuel. Le cadenas était indiscernable d'un bouton cassé, et un parent ne
   * pouvait plus entrer chez lui. Un appui bref explique désormais le geste,
   * et propose l'entrée.
   */
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.up();

  const dialog = page.getByRole('dialog', { name: 'Espace parents' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/maintenez le cadenas/i);
  // On n'y est pas encore : le jeu est toujours là derrière.
  await expect(page.getByRole('button', { name: 'Partir !' })).toBeVisible();

  await page.getByRole('button', { name: /ouvrir l’espace parents/i }).click();
  await expect(page.getByText(/espace parents — lucie/i)).toBeVisible({ timeout: 20_000 });
});

test('le cadenas maintenu entre directement (§190)', async ({ page }) => {
  await boot(page);
  const box = (await page.getByRole('button', { name: 'Espace parents' }).boundingBox())!;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();

  // Le raccourci de celui qui connaît le geste : pas de carte intermédiaire.
  await expect(page.getByText(/espace parents — lucie/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('dialog', { name: 'Espace parents' })).toHaveCount(0);
});

test('les tuiles du Centre ne s’étirent pas sur un grand écran', async ({ page }) => {
  await boot(page);
  // Régression : sur un écran haut, elles devenaient de hauts rectangles
  // blancs avec un petit pictogramme perdu au milieu.
  await page.setViewportSize({ width: 1600, height: 1300 });
  await expect(page.locator('.center-hub__tile').first()).toBeVisible();

  const tiles = await page
    .locator('.center-hub__tile')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  for (const height of tiles) {
    expect(height).toBeGreaterThanOrEqual(120);
    expect(height).toBeLessThanOrEqual(280);
  }
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

/**
 * POKÉDEX ET ÉQUIPE — une chose à la fois, un seul geste (§191, §190).
 */
test('le Pokédex montre la grille, puis la fiche par-dessus', async ({ page }) => {
  await boot(page);
  await go(page, '/play/pokedex');
  await expect(page.locator('.ds-creature-card').first()).toBeVisible({ timeout: 20_000 });

  // Régression : deux panneaux permanents, dont un parlait de l'autre.
  await expect(page.locator('.ds-two-pane')).toHaveCount(0);
  await expect(page.locator('.sheet')).toHaveCount(0);

  // Les filtres sont d'abord des dessins (§147).
  const all = page.getByRole('button', { name: 'Tous' });
  await expect(all.locator('svg')).toHaveCount(1);

  await page.locator('.ds-creature-card').first().click();
  const sheet = page.locator('.sheet');
  await expect(sheet).toBeVisible();
  // La fiche couvre vraiment la collection : elle est en grand, par-dessus.
  const box = (await sheet.locator('.sheet__panel').boundingBox())!;
  expect(box.width).toBeGreaterThan(320);

  await page.getByRole('button', { name: 'Fermer' }).click();
  await expect(sheet).toHaveCount(0);
});

test('l’Équipe se compose d’un seul geste', async ({ page }) => {
  await boot(page);

  // On attrape une créature : sans collection, l'écran n'a rien à montrer.
  await go(page, '/play/map');
  await page.locator('.map__node[aria-label^="Prairie"]').first().click();
  await page.getByRole('button', { name: 'Y aller !' }).click({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Relever le défi !' }).click({ timeout: 20_000 });
  await page.locator('.ds-choice').first().waitFor({ timeout: 20_000 });
  // On répond jusqu'à la capture : la bonne réponse finit toujours par venir (§14).
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const choices = page.locator('.ds-choice:not([data-state="removed"])');
    const count = await choices.count();
    if (count === 0) break;
    await choices.nth(attempt % count).click();
    await page.waitForTimeout(1500);
    if ((await page.getByRole('button', { name: 'Continuer' }).count()) > 0) break;
  }
  await page.getByRole('button', { name: 'Continuer' }).click({ timeout: 20_000 });
  await expect(page.locator('.map__node').first()).toBeVisible({ timeout: 20_000 });

  await go(page, '/play/team');
  const card = page.locator('.pokedex__grid .ds-creature-card').first();
  await expect(card).toBeVisible({ timeout: 20_000 });

  // Régression : il fallait sélectionner, puis viser un bouton en bas d'écran.
  await expect(page.getByRole('button', { name: /mettre dans l’équipe/i })).toHaveCount(0);

  /*
   * La créature qu'on vient d'attraper rejoint l'équipe toute seule : on part
   * donc de l'état réel, et on vérifie que LE MÊME geste fait l'aller ET le
   * retour. C'est tout ce qui compte : un seul geste, réversible.
   */
  const members = page.locator('.team__member');
  const before = await members.count();
  const wasInTeam = (await card.locator('.team__mark').count()) > 0;

  await card.click();
  await expect(members).toHaveCount(wasInTeam ? before - 1 : before + 1);
  // La coche suit : une sélection ne se lit jamais à la seule couleur (§142).
  await expect(card.locator('.team__mark')).toHaveCount(wasInTeam ? 0 : 1);

  await card.click();
  await expect(members).toHaveCount(before);
  await expect(card.locator('.team__mark')).toHaveCount(wasInTeam ? 1 : 0);
});

/**
 * LA CARTE — sélection en deux temps, et un dresseur qu'on reconnaît (§193).
 */
test('un lieu se choisit, puis se rejoint', async ({ page }) => {
  await boot(page);
  await go(page, '/play/map');
  await expect(page.locator('.map__node').first()).toBeVisible({ timeout: 20_000 });

  // Régression : un doigt qui effleure la carte partait en voyage.
  await page.getByRole('button', { name: /Prairie — à explorer/i }).click();
  await expect(page).toHaveURL(/#\/play\/map$/);

  // On voit ce qu'on vient de choisir, en toutes lettres et en pictogramme.
  const pick = page.locator('.map__pick');
  await expect(pick).toContainText('Prairie');
  await expect(pick.locator('.map__pick-icon svg')).toBeVisible();

  // Un second toucher sur LE MÊME lieu part : pas besoin de viser le bouton.
  await page.getByRole('button', { name: /Prairie — à explorer/i }).click();
  await expect(page).toHaveURL(/#\/play\/encounter\//, { timeout: 20_000 });
});

test('un lieu fermé se nomme quand même, sans faire semblant', async ({ page }) => {
  await boot(page);
  await go(page, '/play/map');
  await page.getByRole('button', { name: /^Arène — fermé/i }).click({ timeout: 20_000 });

  const pick = page.locator('.map__pick');
  await expect(pick).toContainText('Arène');
  await expect(pick).toContainText(/pas encore ouvert/i);
  // On ne propose jamais un départ qui n'aurait pas lieu.
  await expect(page.getByRole('button', { name: 'Y aller !' })).toHaveCount(0);
  await expect(page).toHaveURL(/#\/play\/map$/);
});

test('le dresseur est visible sur la carte, et assez grand', async ({ page }) => {
  await boot(page);
  await go(page, '/play/map');
  const avatar = page.locator('.map__avatar');
  await expect(avatar).toBeVisible({ timeout: 20_000 });

  // Régression : un petit rond corail, qu'on ne repérait pas.
  const box = (await avatar.boundingBox())!;
  expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(24);
  // Une tête, un corps, une casquette : plus qu'une pastille.
  expect(await avatar.locator('path, circle, ellipse').count()).toBeGreaterThanOrEqual(4);
});

/**
 * HIÉRARCHIE D'UN ÉCRAN D'EXERCICE (§194) : 🔊, la scène, les réponses.
 */
test('l’exercice met la voix et la scène devant la consigne écrite', async ({ page }) => {
  await boot(page);
  await go(page, '/play/map');
  await page.locator('.map__node[aria-label^="Prairie"]').first().click();
  await page.getByRole('button', { name: 'Y aller !' }).click({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Relever le défi !' }).click({ timeout: 20_000 });
  await expect(page.locator('.ds-choice').first()).toBeVisible({ timeout: 20_000 });

  const measured = await page.evaluate(() => {
    const box = (selector: string): DOMRect =>
      document.querySelector(selector)!.getBoundingClientRect();
    const question = document.querySelector('.exercise__question')!;
    return {
      voice: box('.exercise__prompt .ds-voice'),
      question: box('.exercise__question'),
      stage: box('.exercise__stage'),
      answer: box('.ds-choice'),
      questionFont: parseFloat(getComputedStyle(question).fontSize),
    };
  });

  // Le haut-parleur vient AVANT la consigne écrite, et reste une grande cible.
  expect(measured.voice.top).toBeLessThan(measured.question.top);
  expect(Math.min(measured.voice.width, measured.voice.height)).toBeGreaterThanOrEqual(56);

  // Régression : la consigne écrite était l'élément le plus gros de l'écran.
  expect(measured.questionFont).toBeLessThanOrEqual(26);
  expect(measured.stage.height).toBeGreaterThan(measured.question.height * 2);

  // Et les réponses restent immenses (§167).
  expect(measured.answer.width).toBeGreaterThanOrEqual(100);
  expect(measured.answer.height).toBeGreaterThanOrEqual(70);

  // L'indice, quand il arrive, ne devient pas le nouvel élément dominant.
  await page.locator('.ds-choice').first().click();
  await page.locator('.ds-choice').nth(1).click();
  const hint = page.locator('.exercise__hint');
  if ((await hint.count()) > 0) {
    const hintBox = (await hint.boundingBox())!;
    const stage = (await page.locator('.exercise__stage').boundingBox())!;
    expect(hintBox.height).toBeLessThan(stage.height);
  }
});
