import { describe, expect, it } from 'vitest';
import { defaultContentBundle } from '../../src/content/defaultContent';
import {
  creatureNumber,
  formatCreatureNumber,
  nextCreatureNumber,
} from '../../src/features/admin/creatureNumber';
import { duplicateCreature } from '../../src/features/admin/entityActions';
import { readMediaCatalog } from '../../scripts/vite-plugin-media-catalog';
import { ContentService } from '../../src/services';

/**
 * NUMÉROS ET IMAGES DÉPOSÉES (§198).
 *
 * Les images du dépôt sont nommées « 0025_pikachu.png ». Ce nom porte trois
 * choses — un chemin, un numéro, un nom — et c'est ce qui permet de les
 * choisir en vignettes plutôt que de retaper leur chemin.
 */
describe('Numéros de créatures', () => {
  it('en donne un à chaque créature livrée, tous différents', () => {
    const bundle = defaultContentBundle();
    const numbers = bundle.creatures.map((creature) => creature.number);
    expect(numbers.every((value) => typeof value === 'number')).toBe(true);
    expect(new Set(numbers).size).toBe(bundle.creatures.length);
  });

  it('retombe sur le rang quand un contenu ancien n’en a pas', () => {
    const bundle = defaultContentBundle();
    // Un contenu écrit avant les numéros : on ne le réécrit pas, on l'affiche.
    const orphan = { ...bundle.creatures[2]!, number: undefined };
    const older = { ...bundle, creatures: bundle.creatures.map((c, i) => (i === 2 ? orphan : c)) };
    expect(creatureNumber(older, orphan)).toBe(3);
  });

  it('s’affiche comme sur une carte', () => {
    expect(formatCreatureNumber(25)).toBe('#025');
    expect(formatCreatureNumber(7)).toBe('#007');
    expect(formatCreatureNumber(140)).toBe('#140');
  });

  it('donne un numéro libre à une copie : jamais deux fois le même', () => {
    const bundle = defaultContentBundle();
    const copy = duplicateCreature(bundle, 'piloupi')!;
    const original = bundle.creatures.find((creature) => creature.id === 'piloupi')!;
    expect(copy.created.number).not.toBe(original.number);

    const numbers = copy.bundle.creatures.map((creature) => creature.number);
    expect(new Set(numbers).size).toBe(copy.bundle.creatures.length);
    expect(nextCreatureNumber(copy.bundle)).toBeGreaterThan(copy.created.number!);
  });

  it('signale deux créatures au même numéro', () => {
    const bundle = defaultContentBundle();
    const twin = { ...bundle.creatures[1]!, id: 'jumeau', number: bundle.creatures[0]!.number };
    bundle.creatures.push(twin);
    const warnings = ContentService.validate(bundle).issues.filter(
      (issue) => issue.code === 'CREATURE_NUMBER',
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.level).toBe('WARNING');
  });
});

describe('Inventaire des images du dépôt', () => {
  /*
   * L'inventaire est écrit au build par un greffon Vite : sans lui, l'Admin ne
   * pourrait pas proposer les images de `public/media/creatures/`, puisqu'un
   * navigateur ne sait pas lister un dossier.
   */
  it('lit le numéro et le nom dans « 0025_pikachu.png »', () => {
    const entry = readMediaCatalog().find((image) => image.file.startsWith('0025'));
    expect(entry).toBeDefined();
    expect(entry!.number).toBe(25);
    expect(entry!.name).toBe('Pikachu');
    expect(entry!.path).toBe('media/creatures/0025_pikachu.png');
  });

  it('accepte une image sans numéro, sans rien casser', () => {
    const entry = readMediaCatalog().find((image) => image.file === 'exemple.svg');
    expect(entry).toBeDefined();
    expect(entry!.number).toBeUndefined();
    expect(entry!.name).toBe('Exemple');
  });

  it('ne propose que des images, jamais l’inventaire lui-même', () => {
    const files = readMediaCatalog().map((image) => image.file);
    expect(files).not.toContain('index.json');
    expect(files.every((file) => /\.(png|jpe?g|webp|gif|avif|svg)$/iu.test(file))).toBe(true);
  });
});
