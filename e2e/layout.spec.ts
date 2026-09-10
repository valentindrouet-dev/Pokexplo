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
  await expect(page.getByRole('button', { name: 'Partir à l’aventure !' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Y aller !' }).click({ timeout: 20_000 });
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
  await page.goto('./#/admin/creatures');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText(/^Créatures \(/)).toBeVisible({ timeout: 20_000 });

  await expectNoOverlap(page, '.admin__scroll-list .ds-list-row', 3);
});

test('les sections de voix se déplient sans se chevaucher', async ({ page }) => {
  await page.goto('./#/admin/audio');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText(/^Voix \(/)).toBeVisible({ timeout: 20_000 });

  // Repliées, les sections tiennent les unes sous les autres.
  await expectNoOverlap(page, '.disclosure--group > .disclosure__toggle', 3);

  // Dépliée, la section pousse les suivantes au lieu de leur passer dessus.
  await page.locator('.disclosure--group > .disclosure__toggle').first().click();
  await expect(page.locator('.disclosure--item').first()).toBeVisible();
  await expectNoOverlap(page, '.disclosure--group > .disclosure__toggle', 3);
  await expectNoOverlap(page, '.disclosure--item > .disclosure__toggle', 2);
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
  const last = page.getByRole('button', { name: 'Progression' });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
});

test('les sections de l’admin sont rangées en quatre familles (§196)', async ({ page }) => {
  await page.goto('./#/admin');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText('Pokexplo — Admin')).toBeVisible({ timeout: 20_000 });

  // Régression : treize entrées à plat, et la question « dans quel menu ? ».
  const families = await page.locator('.admin__nav-family').allTextContents();
  expect(families).toEqual(['Contenu', 'Médias', 'Tester & publier', 'Famille']);
  const entries = await page.locator('.admin__nav-item').count();
  expect(entries).toBeLessThanOrEqual(11);

  // Les fusions ne retirent aucune possibilité : elles la rangent ailleurs.
  await page.getByRole('button', { name: 'Histoire & Arènes' }).click();
  await expect(page.getByRole('button', { name: /arènes et badges/i })).toBeVisible();
  await page.getByRole('button', { name: 'Exercices' }).click();
  await expect(page.getByRole('button', { name: /packs pédagogiques/i })).toBeVisible();
});

test('les anciennes adresses de l’admin mènent toujours quelque part', async ({ page }) => {
  await page.goto('./#/admin');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText('Pokexplo — Admin')).toBeVisible({ timeout: 20_000 });

  // Un signet, un lien mis de côté : rien ne doit tomber sur une page vide.
  for (const [old, expected] of [
    ['biomes', 'Monde'],
    ['nodes', 'Monde'],
    ['gyms', 'Histoire & Arènes'],
    ['quests', 'Histoire & Arènes'],
    ['packs', 'Exercices'],
    ['releases', 'Publication'],
  ] as const) {
    await page.goto(`./#/admin/${old}`);
    await expect(
      page.getByRole('button', { name: expected, exact: true }),
      `« ${old} » doit mener à « ${expected} »`,
    ).toHaveAttribute('aria-current', 'true');
  }
});

test('l’Admin affiche sa version et ramène à l’accueil', async ({ page }) => {
  await page.goto('./#/admin');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText('Pokexplo — Admin')).toBeVisible({ timeout: 20_000 });

  // La version installée est lisible sous le nom, sans ouvrir de menu.
  const version = page.locator('.admin__version');
  await expect(version).toHaveText(/^Version \S+/);
  await expect(version).toBeInViewport();

  // L'en-tête ne recouvre pas la première section de la liste.
  await expectNoOverlap(page, '.admin__head, .admin__nav-list');

  await page.getByRole('button', { name: 'Accueil' }).click();
  await expect(page.getByPlaceholder('Ton prénom')).toBeVisible();
});

test('le panneau d’envoi vers le site tient dans la colonne de l’Admin', async ({ page }) => {
  await page.goto('./#/admin/releases');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByRole('button', { name: 'Envoyer sur le site' })).toBeVisible({
    timeout: 20_000,
  });

  // Les quatre champs de configuration ne se chevauchent pas.
  await expectNoOverlap(page, '.admin__grid-2 > .field', 4);

  // Le jeton n'est jamais affiché en clair.
  await expect(page.getByLabel('Jeton GitHub')).toHaveAttribute('type', 'password');

  // Aucun défilement horizontal, jamais (§159).
  const scrollsX = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(scrollsX).toBe(false);
});

test('aucun panneau de l’Admin n’est écrasé par la colonne qui défile', async ({ page }) => {
  await page.goto('./#/admin/releases');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByRole('button', { name: 'Envoyer sur le site' })).toBeVisible({
    timeout: 20_000,
  });

  /*
   * Régression réelle : dans une colonne `overflow: auto`, un panneau plus
   * haut que l'écran était comprimé par le navigateur et son texte passait
   * sous le panneau suivant. On vérifie que chacun occupe bien sa hauteur.
   */
  const squashed = await page.evaluate(() => {
    const main = document.querySelector('.admin__main');
    if (!main) return ['.admin__main introuvable'];
    return Array.from(main.children)
      .filter((child) => child.scrollHeight > child.clientHeight + 2)
      .map((child) => `${child.className} (${child.clientHeight} < ${child.scrollHeight} px)`);
  });
  expect(squashed, 'des panneaux de l’Admin sont écrasés').toEqual([]);
});

test('le mode édition se pose sur l’écran de l’enfant sans le masquer', async ({ page }) => {
  await boot(page);

  // Seul un adulte identifié peut éditer (§93).
  await page.goto('./#/admin');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText('Pokexplo — Admin')).toBeVisible({ timeout: 20_000 });

  await page.goto('./#/parents');
  await page.getByRole('button', { name: /modifier l’aventure/i }).click();
  await expect(page.getByText('Mode édition')).toBeVisible({ timeout: 20_000 });

  // Le bandeau ne recouvre pas le contenu du jeu.
  await expectNoOverlap(page, '.edit-bar, .play__content');

  await page.goto('./#/play/map');
  const badge = page.getByRole('button', { name: /modifier le lieu centre/i });
  await expect(badge).toBeVisible({ timeout: 20_000 });

  // La cible tactile de la pastille reste confortable sur un écran d'iPad.
  const box = await badge.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await badge.click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect(page.getByLabel(/^Nom du lieu/)).toBeVisible();

  // Le tiroir tient dans l'écran : ni débordement, ni défilement horizontal.
  const viewport = page.viewportSize()!;
  const panel = await drawer.boundingBox();
  expect(panel!.height).toBeLessThanOrEqual(viewport.height + 1);
  const scrollsX = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(scrollsX).toBe(false);

  // En quittant, l'écran redevient exactement celui de l'enfant.
  await page.getByRole('button', { name: 'Terminé' }).click();
  await page.getByRole('button', { name: /quitter l’édition/i }).click();
  await expect(page.getByText('Mode édition')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Modifier le lieu/ })).toHaveCount(0);
});

/*
 * ORIENTATION (docs/UI_DESIGN.md §159, retours iPad).
 *
 * Un iPad se tient dans les deux sens. Ces garde-fous s'executent dans les
 * projets paysage ET portrait : ce qui suit doit tenir quel que soit le sens.
 */

test('la carte remplit son cadre dans les deux orientations', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Partir à l’aventure !' }).click();
  await expect(page.getByRole('button', { name: /Prairie — à explorer/ })).toBeVisible();

  // Regression : en portrait, la carte paysage flottait, minuscule, au milieu
  // d'un panneau vide. On mesure la part du cadre reellement occupee.
  const fill = await page.evaluate(() => {
    const panel = document.querySelector('.map')!.getBoundingClientRect();
    const nodes = Array.from(document.querySelectorAll<SVGGElement>('.map__node')).map((node) =>
      node.getBoundingClientRect(),
    );
    const left = Math.min(...nodes.map((r) => r.left));
    const right = Math.max(...nodes.map((r) => r.right));
    const top = Math.min(...nodes.map((r) => r.top));
    const bottom = Math.max(...nodes.map((r) => r.bottom));
    return {
      width: (right - left) / panel.width,
      height: (bottom - top) / panel.height,
      // Taille reelle d'un lieu sous le doigt.
      node: Math.min(...nodes.map((r) => r.width)),
    };
  });

  expect(fill.width, 'la carte n’occupe pas la largeur du cadre').toBeGreaterThan(0.6);
  expect(fill.height, 'la carte n’occupe pas la hauteur du cadre').toBeGreaterThan(0.5);
  // Zone tactile d'un lieu : jamais sous le minimum enfant (§4).
  expect(fill.node).toBeGreaterThanOrEqual(56);
});

test('la consigne d’un exercice reste lisible, dans les deux orientations', async ({ page }) => {
  await boot(page);
  await page.goto('./#/play/map');
  await page.locator('.map__node[aria-label*="Prairie"]').first().click();
  await page.getByRole('button', { name: 'Y aller !' }).click({ timeout: 20_000 });
  await page.getByRole('button', { name: /relever le défi/i }).click({ timeout: 20_000 });

  const question = page.locator('.exercise__question');
  await expect(question).toBeVisible();
  /*
   * Deux bornes, et les deux comptent :
   *  - régression d'origine — indexée sur la largeur, la typographie tombait
   *    à 19 px en portrait, illisible ;
   *  - §194 — elle ne doit pas redevenir l'élément dominant de l'écran, ce
   *    que vérifie `e2e/child-ux.spec.ts`.
   */
  const size = await question.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(20);
  expect(size).toBeLessThanOrEqual(26);

  // Les reponses restent des cibles enfant (§4).
  const answers = page.locator('.exercise__answers .ds-choice');
  const boxes = await answers.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  for (const height of boxes) expect(height).toBeGreaterThanOrEqual(56);
});

test('la fiche d’une créature tient dans l’écran, sans rien superposer', async ({ page }) => {
  await boot(page);
  await page.goto('./#/play/pokedex');
  await expect(page.getByRole('button', { name: 'Tous' })).toBeVisible();

  /*
   * La fiche s'ouvre désormais PAR-DESSUS la grille (§191) : le risque n'est
   * plus qu'un compteur passe sur elle, c'est qu'elle déborde de l'écran — et
   * en portrait, la place manque vite.
   */
  await page.locator('.ds-creature-card').first().click();
  const panel = page.locator('.sheet__panel');
  await expect(panel).toBeVisible();

  const viewport = page.viewportSize()!;
  const box = (await panel.boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);

  await expectNoOverlap(page, '.sheet__panel > *', 3);
  // Fermer reste une cible confortable, au même endroit qu'ailleurs.
  const close = (await page.getByRole('button', { name: 'Fermer' }).boundingBox())!;
  expect(Math.min(close.width, close.height)).toBeGreaterThanOrEqual(56);
});

test('la navigation de l’Admin reste compacte quand l’écran est étroit', async ({ page }) => {
  const viewport = page.viewportSize()!;
  test.skip(viewport.width >= 900, 'colonne laterale : non concerne');

  await page.goto('./#/admin');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText('Pokexplo — Admin')).toBeVisible({ timeout: 20_000 });

  // Regression : la liste des treize sections empilee prenait 700 px de hauteur.
  const nav = await page.locator('.admin__nav').boundingBox();
  expect(nav!.height).toBeLessThanOrEqual(200);
  const main = await page.locator('.admin__main').boundingBox();
  expect(main!.height / viewport.height).toBeGreaterThan(0.6);

  // Toutes les sections restent atteignables par defilement horizontal.
  const last = page.getByRole('button', { name: 'Progression' });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
});

test('l’espace parents tient sur un écran d’iPad', async ({ page }) => {
  await boot(page);
  await page.goto('./#/parents');
  await expect(page.getByText(/espace parents — lucie/i)).toBeVisible({ timeout: 20_000 });

  // L'en-tête et ses actions restent visibles sans défiler.
  await expect(page.getByRole('button', { name: 'Retour au jeu' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Accueil' })).toBeInViewport();

  // Les panneaux d'information ne se recouvrent pas.
  await expectNoOverlap(page, '.parent__grid > .ds-panel', 4);

  // Aucun défilement horizontal, jamais (§159).
  const scrollsX = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(scrollsX).toBe(false);
});

test('la carte regroupe les lieux en régions lisibles', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Partir à l’aventure !' }).click();
  await expect(page.getByRole('button', { name: /Prairie — à explorer/ })).toBeVisible();

  const map = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll<SVGGElement>('.map__node'));
    return {
      zones: document.querySelectorAll('.map__zone').length,
      zoneLabels: Array.from(document.querySelectorAll('.map__zone-label')).map(
        (el) => el.textContent ?? '',
      ),
      paths: document.querySelectorAll('.map__path').length,
      // Chaque lieu porte un pictogramme : un cadenas ne remplace jamais l'icone.
      nodesWithIcon: nodes.filter((node) => node.querySelectorAll('path').length > 0).length,
      nodes: nodes.length,
    };
  });

  // Une bulle par région, avec son titre (§12).
  expect(map.zones).toBeGreaterThanOrEqual(4);
  expect(map.zoneLabels).toEqual(expect.arrayContaining(['Prairie', 'Forêt', 'Rivière']));
  // Des chemins visibles entre les lieux (§10).
  expect(map.paths).toBeGreaterThanOrEqual(map.nodes - 1);
  // Un pictogramme thématique sur chaque lieu, ouvert ou non (§147).
  expect(map.nodesWithIcon).toBe(map.nodes);
});

test('les titres de la carte ne se chevauchent jamais', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Partir à l’aventure !' }).click();
  await expect(page.getByRole('button', { name: /Prairie — à explorer/ })).toBeVisible();

  // Regression : « Grand pré », « Chemin fleuri » et « Rivière » se
  // superposaient au point d'être illisibles.
  await expectNoOverlap(page, '.map__node-label, .map__zone-label', 10);
});

test('le Centre donne accès à l’espace parents', async ({ page }) => {
  await boot(page);

  // Regression : depuis le Centre, aucun chemin ne menait à l'espace parents.
  // Il y mène désormais par un cadenas discret (§190), qui demande un appui
  // maintenu — le détail du geste est vérifié dans e2e/child-ux.spec.ts.
  const gate = page.getByRole('button', { name: 'Espace parents' });
  await gate.click();
  await page.getByRole('button', { name: /ouvrir l’espace parents/i }).click();
  await expect(page.getByText(/espace parents — lucie/i)).toBeVisible({ timeout: 20_000 });
});

test('l’Admin sait chercher, dupliquer et supprimer (§196)', async ({ page }) => {
  await page.goto('./#/admin/creatures');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByRole('button', { name: 'Nouvelle créature' })).toBeVisible({
    timeout: 20_000,
  });

  // Chercher : la casse et les accents ne changent rien.
  const search = page.getByRole('searchbox', { name: /rechercher dans créatures/i });
  await search.fill('PILOUPI');
  await expect(page.locator('.ds-list-row')).toHaveCount(1);
  await search.fill('');

  // Dupliquer : une action, et la copie est sélectionnée pour être renommée.
  const before = await page.locator('.ds-list-row').count();
  await page.locator('.ds-list-row', { hasText: 'Piloupi' }).first().click();
  await page.getByRole('button', { name: 'Dupliquer' }).click();
  await expect(page.locator('.ds-list-row')).toHaveCount(before + 1);
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Piloupi (copie)');

  // Supprimer : l'original est refusé — on rencontre Piloupi dans la Prairie —
  // et le refus s'EXPLIQUE au lieu de griser un bouton sans un mot.
  await page.locator('.ds-list-row', { hasText: /^Piloupi/ }).first().click();
  await expect(page.getByText(/on peut la rencontrer à/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Supprimer' })).toBeDisabled();

  // La copie, elle, ne sert nulle part : elle peut partir.
  await page.locator('.ds-list-row', { hasText: 'Piloupi (copie)' }).first().click();
  await page.getByRole('button', { name: 'Supprimer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.locator('.ds-list-row')).toHaveCount(before);
});

test('l’image et les couleurs s’éditent dans la fiche, jamais par un chemin (§196)', async ({
  page,
}) => {
  await page.goto('./#/admin/creatures');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByRole('button', { name: 'Nouvelle créature' })).toBeVisible({
    timeout: 20_000,
  });

  /*
   * Régression : pour changer l'illustration, il fallait quitter la fiche,
   * ouvrir « Images », y retrouver la créature et saisir `media/creatures/…`.
   */
  await expect(page.getByRole('button', { name: /ajouter une image/i })).toBeVisible();
  await expect(page.locator('.image-picker__preview svg')).toBeVisible();
  await expect(page.getByText('Dessin généré').first()).toBeVisible();

  // Ce qui reste technique est replié, et le dit.
  const advanced = page.getByRole('button', { name: 'Réglages avancés' });
  await expect(advanced).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByLabel('Chemin de l’image')).toHaveCount(0);
  await advanced.click();
  await expect(page.getByLabel('Chemin de l’image')).toBeVisible();
});

test('les couleurs d’une région se choisissent, jamais en hexadécimal (§196)', async ({ page }) => {
  await page.goto('./#/admin/world');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await page.getByRole('button', { name: 'Biomes' }).click({ timeout: 20_000 });

  /*
   * Les créatures ne se dessinent plus à la main (§198) : leurs couleurs ont
   * disparu de l'Admin. Une région, elle, garde les siennes — et elles se
   * choisissent, on ne tape plus « #FFD45C » dans un champ de texte (§196).
   */
  await expect(page.getByRole('button', { name: 'Jaune', exact: true }).first()).toBeVisible();
  await expect(page.getByLabel(/^Sol — choisir librement/i)).toHaveAttribute('type', 'color');
});

test('la page « Images » vérifie l’ensemble au lieu d’éditer (§196)', async ({ page }) => {
  await page.goto('./#/admin/images');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText('Où en sont les images ?')).toBeVisible({ timeout: 20_000 });

  // Elle répond à ce qu'une fiche ne peut pas voir : l'état de l'ensemble.
  await expect(page.getByText(/20 dessin\(s\) généré\(s\)/)).toBeVisible();
  await expect(page.getByText(/0 sur cet appareil seulement/)).toBeVisible();
  // Et elle ne propose plus de saisir un chemin.
  await expect(page.getByLabel('Image de la créature')).toHaveCount(0);
});

test('une créature se numérote et prend une image du dépôt (§198)', async ({ page }) => {
  await page.goto('./#/admin/creatures');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByRole('button', { name: 'Nouvelle créature' })).toBeVisible({
    timeout: 20_000,
  });

  // Chaque créature porte un numéro, éditable, et visible dans la liste.
  await expect(page.getByLabel(/^Numéro/)).toHaveValue('1');
  await expect(page.locator('.ds-list-row').first()).toContainText('#001');

  /*
   * Les images déposées dans `public/media/creatures/` se CHOISISSENT en
   * vignettes : un navigateur ne sait pas lister un dossier, c'est
   * l'inventaire écrit au build qui les rend visibles ici.
   */
  const pikachu = page.getByRole('button', { name: /pikachu, numéro 25/i });
  await expect(pikachu).toBeVisible();
  await pikachu.click();

  // Le nom du fichier porte le numéro : on le reprend, c'est sa raison d'être.
  await expect(page.getByLabel(/^Numéro/)).toHaveValue('25');
  // Le nom déjà écrit n'est jamais écrasé.
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Piloupi');
  await expect(page.getByRole('button', { name: /remplacer l’image/i })).toBeVisible();

  // On ne dessine plus les créatures soi-même.
  await expect(page.getByLabel('Silhouette')).toHaveCount(0);
  await expect(page.getByLabel('Couleur principale — choisir librement')).toHaveCount(0);
});

test('les syllabes se saisissent une par case (§198)', async ({ page }) => {
  await page.goto('./#/admin/creatures');
  await page.getByLabel('Code d’accès').fill('parent');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByRole('button', { name: 'Nouvelle créature' })).toBeVisible({
    timeout: 20_000,
  });

  // Régression : un seul champ « Pi-lou-pi », et un tiret oublié découpait le
  // nom n'importe comment, sans rien dire.
  await expect(page.getByLabel('Syllabe 1')).toHaveValue('Pi');
  await expect(page.getByLabel('Syllabe 8')).toBeVisible();
  await expect(page.getByLabel('Syllabe 8')).toHaveValue('');

  await page.getByLabel('Syllabe 4').fill('nou');
  // Le découpage se lit, tel que l'enfant l'entendra.
  await expect(page.locator('.syllables__preview')).toContainText('Pi · lou · pi · nou');
});
