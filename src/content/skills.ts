import type { CurriculumPack, Skill } from '../types';

/** CONCEPTION §26, §74 — competences suivies par le moteur pedagogique. */
export const defaultSkills: Skill[] = [
  { id: 'math.counting', label: 'Dénombrer', category: 'MATH', parentLabel: 'Maths' },
  { id: 'math.addition', label: 'Additionner', category: 'MATH', parentLabel: 'Maths' },
  { id: 'math.subtraction', label: 'Soustraire', category: 'MATH', parentLabel: 'Maths' },
  { id: 'math.compare', label: 'Comparer', category: 'MATH', parentLabel: 'Maths' },
  { id: 'math.sequence', label: 'Suite numérique', category: 'MATH', parentLabel: 'Maths' },
  { id: 'reading.words', label: 'Reconnaître un mot', category: 'READING', parentLabel: 'Lecture' },
  { id: 'reading.letters', label: 'Reconnaître une lettre', category: 'READING', parentLabel: 'Lecture' },
  { id: 'reading.syllables', label: 'Syllabes', category: 'READING', parentLabel: 'Lecture' },
  { id: 'spatial.leftRight', label: 'Gauche et droite', category: 'SPATIAL', parentLabel: 'Repérage' },
  { id: 'spatial.aboveBelow', label: 'Dessus et dessous', category: 'SPATIAL', parentLabel: 'Repérage' },
  { id: 'spatial.grid', label: 'Se déplacer sur une grille', category: 'SPATIAL', parentLabel: 'Repérage' },
  { id: 'english.basics', label: 'Premiers mots anglais', category: 'ENGLISH', parentLabel: 'Anglais' },
];

/** CONCEPTION §76 — packs pedagogiques (plafonds de difficulte par periode). */
export const defaultCurriculumPacks: CurriculumPack[] = [
  {
    id: 'pack-cp-1',
    label: 'CP — période 1',
    level: 'CP1',
    skillIds: [
      'math.counting',
      'math.compare',
      'reading.words',
      'reading.letters',
      'reading.syllables',
      'spatial.leftRight',
      'spatial.aboveBelow',
    ],
    maxDifficulty: {
      'math.counting': 2,
      'math.compare': 2,
      'reading.words': 2,
      'reading.letters': 2,
      'reading.syllables': 2,
      'spatial.leftRight': 2,
      'spatial.aboveBelow': 2,
    },
    active: true,
  },
  {
    id: 'pack-cp-2',
    label: 'CP — période 2',
    level: 'CP2',
    skillIds: [
      'math.counting',
      'math.addition',
      'math.subtraction',
      'math.compare',
      'math.sequence',
      'reading.words',
      'reading.letters',
      'reading.syllables',
      'spatial.leftRight',
      'spatial.aboveBelow',
      'spatial.grid',
      'english.basics',
    ],
    maxDifficulty: {
      'math.counting': 4,
      'math.addition': 3,
      'math.subtraction': 3,
      'math.compare': 3,
      'math.sequence': 3,
      'reading.words': 3,
      'reading.letters': 3,
      'reading.syllables': 3,
      'spatial.leftRight': 3,
      'spatial.aboveBelow': 3,
      'spatial.grid': 2,
      'english.basics': 2,
    },
    active: false,
  },
];
