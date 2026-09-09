import { IconBase, type IconProps } from './IconBase';

export type { IconProps };

/** Carte du monde (§147). */
export const IconMap = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20Z" />
    <path d="M9 4v13.5M15 6.5V20" />
  </IconBase>
);

/** Pokedex. */
export const IconPokedex = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
    <path d="M8 4v16" />
    <circle cx="14.5" cy="9" r="2.2" />
    <path d="M12 14.5h5" />
  </IconBase>
);

/** Equipe / sac. */
export const IconTeam = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M4 9.5A2.5 2.5 0 0 1 6.5 7h11A2.5 2.5 0 0 1 20 9.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    <path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7" />
    <path d="M4 12.5h16" />
  </IconBase>
);

/** Badge d'Arene. */
export const IconBadge = (p: IconProps) => (
  <IconBase {...p}>
    <path d="m12 3 2.6 1.6 3-.2 1 2.9 2.2 2-1.4 2.7.4 3-2.9 1-2 2.3-2.9-.9-2.9.9-2-2.3-2.9-1 .4-3L3.2 9.3l2.2-2 1-2.9 3 .2Z" />
    <path d="m9.6 12 1.7 1.8 3.2-3.5" />
  </IconBase>
);

/** Professeur. */
export const IconProfessor = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    <path d="M8.5 6.5h7" />
  </IconBase>
);

/** Quetes. */
export const IconQuest = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M6 3.5h9.5L19 7v13.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5Z" />
    <path d="M15 3.5V7h4" />
    <path d="m8.5 13 1.8 1.8 4-4.2" />
  </IconBase>
);

/** Crayon : « modifier ». Utilise par le mode edition (§115). */
export const IconPencil = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M4 20h4l10-10a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6Z" />
    <path d="m14.2 7.2 2.6 2.6" />
  </IconBase>
);

/** Reglages. */
export const IconSettings = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2M12 18.5v2M4.6 7.8l1.8 1M17.6 15.2l1.8 1M4.6 16.2l1.8-1M17.6 8.8l1.8-1" />
  </IconBase>
);

/** Voix disponible (§166 : 🔊). */
export const IconSpeaker = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M5 9.5h3L12 6v12l-4-3.5H5Z" />
    <path d="M15.5 9.5a4 4 0 0 1 0 5" />
    <path d="M18 7.5a7 7 0 0 1 0 9" />
  </IconBase>
);

/** Lecture en cours (§166 : 🔉). */
export const IconSpeakerPlaying = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M5 9.5h3L12 6v12l-4-3.5H5Z" />
    <path d="M15.5 9.5a4 4 0 0 1 0 5" />
  </IconBase>
);

/** Son coupe (§166 : 🔇). */
export const IconSpeakerMuted = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M5 9.5h3L12 6v12l-4-3.5H5Z" />
    <path d="m16 10 4 4M20 10l-4 4" />
  </IconBase>
);

/** Micro (§166 : 🎙️). */
export const IconMic = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="9" y="3" width="6" height="10" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
    <path d="M12 18v3M9 21h6" />
  </IconBase>
);

export const IconBack = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M14.5 5 8 12l6.5 7" />
  </IconBase>
);

export const IconForward = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M9.5 5 16 12l-6.5 7" />
  </IconBase>
);

export const IconPlay = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M8 5.5 18 12 8 18.5Z" />
  </IconBase>
);

export const IconStop = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="6" y="6" width="12" height="12" rx="3" />
  </IconBase>
);

export const IconPause = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="7" y="5.5" width="3.6" height="13" rx="1.6" />
    <rect x="13.4" y="5.5" width="3.6" height="13" rx="1.6" />
  </IconBase>
);

export const IconRecord = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="6.5" />
  </IconBase>
);

export const IconTrash = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M5.5 6.5h13" />
    <path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5" />
    <path d="M7 6.5 7.8 19a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4L17 6.5" />
  </IconBase>
);

export const IconCheck = (p: IconProps) => (
  <IconBase {...p}>
    <path d="m5.5 12.5 4 4L18.5 7" />
  </IconBase>
);

/** Jamais utilisee comme "faux" cotee enfant (§14) : reservee a l'admin. */
export const IconClose = (p: IconProps) => (
  <IconBase {...p}>
    <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
  </IconBase>
);

export const IconLock = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="5" y="10" width="14" height="10" rx="3" />
    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
  </IconBase>
);

export const IconStar = (p: IconProps) => (
  <IconBase {...p}>
    <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8Z" />
  </IconBase>
);

export const IconHome = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M4 11 12 4l8 7" />
    <path d="M6.5 10v9.5h11V10" />
    <path d="M10 19.5v-5h4v5" />
  </IconBase>
);

/** Centre Pokemon (croix de soin). */
export const IconCenter = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="3.5" y="6.5" width="17" height="13" rx="3.5" />
    <path d="M12 9.5v7M8.5 13h7" />
    <path d="m5 6.5 7-3.5 7 3.5" />
  </IconBase>
);

export const IconChart = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M4 19.5h16" />
    <rect x="6" y="11" width="3.4" height="8.5" rx="1.4" />
    <rect x="11.3" y="6.5" width="3.4" height="13" rx="1.4" />
    <rect x="16.6" y="14" width="3.4" height="5.5" rx="1.4" />
  </IconBase>
);

export const IconPlus = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </IconBase>
);

export const IconMinus = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M5.5 12h13" />
  </IconBase>
);

export const IconDownload = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 4v10" />
    <path d="m7.5 10 4.5 4.5L16.5 10" />
    <path d="M4.5 18.5h15" />
  </IconBase>
);

export const IconUpload = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 19V9" />
    <path d="m7.5 13 4.5-4.5L16.5 13" />
    <path d="M4.5 4.5h15" />
  </IconBase>
);

export const IconRefresh = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M19 12a7 7 0 1 1-2.4-5.3" />
    <path d="M19.5 4v4h-4" />
  </IconBase>
);

export const IconHeart = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 19.5S4.5 14.8 4.5 9.9A4 4 0 0 1 12 7.7a4 4 0 0 1 7.5 2.2c0 4.9-7.5 9.6-7.5 9.6Z" />
  </IconBase>
);

/** Ball de capture (motif original, §15). */
export const IconBall = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M3.8 12h16.4" />
    <circle cx="12" cy="12" r="2.6" />
  </IconBase>
);

export const IconSparkle = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 4v5M12 15v5M4 12h5M15 12h5" />
    <path d="m7 7 2.5 2.5M14.5 14.5 17 17M17 7l-2.5 2.5M9.5 14.5 7 17" />
  </IconBase>
);

export const IconArrowLeft = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M19 12H5.5" />
    <path d="M11 5.5 4.5 12l6.5 6.5" />
  </IconBase>
);

export const IconArrowRight = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M5 12h13.5" />
    <path d="M13 5.5 19.5 12 13 18.5" />
  </IconBase>
);

export const IconArrowUp = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 19V5.5" />
    <path d="M5.5 11 12 4.5 18.5 11" />
  </IconBase>
);

export const IconArrowDown = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 5v13.5" />
    <path d="M5.5 13 12 19.5 18.5 13" />
  </IconBase>
);

export const IconWarning = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 4.5 21 19.5H3Z" />
    <path d="M12 10v4M12 16.6v.4" />
  </IconBase>
);

export const IconImage = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="3" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m5 17 4.5-4.5 3.5 3.5 2.5-2 3.5 3.5" />
  </IconBase>
);

export const IconRelease = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 3.5 20 8v8l-8 4.5L4 16V8Z" />
    <path d="M12 12.2 20 8M12 12.2v8.3M12 12.2 4 8" />
  </IconBase>
);

/* ------------------------------------------------------------------ *
 * Pictogrammes de lieux (carte du monde, §11-12).
 * Ils remplacent le cadenas : l'enfant reconnait le TYPE de lieu avant
 * de savoir s'il est ouvert ou non.
 * ------------------------------------------------------------------ */

/** Prairie. */
export const IconFlower = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="11" r="2.6" />
    <path d="M12 8.4c0-2.6 1-4 2.6-4s2.4 1.6 1.5 3.1" />
    <path d="M14.6 11c2.6 0 4 1 4 2.6s-1.6 2.4-3.1 1.5" />
    <path d="M12 13.6c0 2.6-1 4-2.6 4s-2.4-1.6-1.5-3.1" />
    <path d="M9.4 11c-2.6 0-4-1-4-2.6S7 6 8.5 6.9" />
    <path d="M12 17.6V21" />
  </IconBase>
);

/** Foret. */
export const IconLeaf = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M19 5c1 7-3.5 12-9 12a5.5 5.5 0 0 1 0-11c4 0 6-.4 9-1Z" />
    <path d="M14.5 9.5 5 19" />
  </IconBase>
);

/** Riviere. */
export const IconDroplet = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 3.5c4 5 6.5 8 6.5 11a6.5 6.5 0 0 1-13 0c0-3 2.5-6 6.5-11Z" />
    <path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2.6" />
  </IconBase>
);

/** Montagne et chemins rocheux. */
export const IconRock = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M3 19.5 9 8l4.5 7.5" />
    <path d="M10.5 19.5 15.5 10l5.5 9.5Z" />
    <path d="M3 19.5h18" />
  </IconBase>
);

/** Plage et bord de mer. */
export const IconWave = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    <path d="M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    <path d="M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
  </IconBase>
);

/** Neige. */
export const IconSnow = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
  </IconBase>
);

/** Volcan. */
export const IconVolcano = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M9.5 10 3 19.5h18L14.5 10Z" />
    <path d="M9.5 10V6.5M14.5 10V6.5" />
    <path d="M12 3.5v2" />
  </IconBase>
);

/* ------------------------------------------------------------------ *
 * Pictogrammes de lieux (§147) — au choix de l'administrateur.
 * Même grille, même trait : ils se mélangent aux précédents sans heurt.
 * ------------------------------------------------------------------ */

/** Arbre. */
export const IconTree = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 3 6.5 10.5h3L6 16h12l-3.5-5.5h3Z" />
    <path d="M12 16v5" />
  </IconBase>
);

/** Champignon. */
export const IconMushroom = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M3.5 11.5C3.5 7 7.5 3.5 12 3.5s8.5 3.5 8.5 8a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5Z" />
    <path d="M9 13v4.5A2.5 2.5 0 0 0 11.5 20h1a2.5 2.5 0 0 0 2.5-2.5V13" />
    <circle cx="9" cy="8" r="1" />
    <circle cx="14.5" cy="7" r="1" />
  </IconBase>
);

/** Montagne. */
export const IconMountain = (p: IconProps) => (
  <IconBase {...p}>
    <path d="m3 19 6.5-11 3.5 5.5 2-3L21 19Z" />
    <path d="m8 12.5 1.5 1.5 1.5-1.5" />
  </IconBase>
);

/** Pont. */
export const IconBridge = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M3 17V8" />
    <path d="M21 17V8" />
    <path d="M3 12c3-3.5 6-5 9-5s6 1.5 9 5" />
    <path d="M3 17h18" />
    <path d="M8 17v-6.2M12 17v-7M16 17v-6.2" />
  </IconBase>
);

/** Drapeau. */
export const IconFlag = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M6 21V4" />
    <path d="M6 4h11l-2.5 4 2.5 4H6" />
  </IconBase>
);

/** Soleil. */
export const IconSun = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
  </IconBase>
);

/** Lune. */
export const IconMoon = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" />
  </IconBase>
);

/** Poisson. */
export const IconFish = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M3 12c2.5-4 6-6 9.5-6S19 9 21 12c-2 3-5 6-8.5 6S5.5 16 3 12Z" />
    <path d="M17 12h4" />
    <circle cx="8.5" cy="11" r="1" />
  </IconBase>
);

/** Pierre précieuse. */
export const IconGem = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M7 4h10l4 5.5L12 21 3 9.5Z" />
    <path d="M3 9.5h18M9.5 4l2.5 5.5L14.5 4M9.5 9.5 12 21l2.5-11.5" />
  </IconBase>
);

/** Œuf. */
export const IconEgg = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 3c3.5 0 7 5 7 10a7 7 0 0 1-14 0c0-5 3.5-10 7-10Z" />
    <path d="M9 12.5c0-2 1-4.5 2.5-6" />
  </IconBase>
);

/* ------------------------------------------------------------------ *
 * Types de creatures (§147) — un pictogramme par type, meme trait.
 * ------------------------------------------------------------------ */

/** Eclair — type Electrik. */
export const IconBolt = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M13.5 3 6 13.5h5L10.5 21 18 10.5h-5Z" />
  </IconBase>
);

/** Aile — type Vol. */
export const IconWing = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M3 17c4-1 7-3.5 9-7s4.5-5.5 9-6c-.5 6-3 10.5-7 13s-8 1.5-11 0Z" />
    <path d="M8.5 14.5c2-.5 4-2 5.5-4" />
  </IconBase>
);

/** Petite bête — type Insecte. */
export const IconBug = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M8 8a4 4 0 0 1 8 0v5a4 4 0 0 1-8 0Z" />
    <path d="M9.5 5.5 8 3.5M14.5 5.5 16 3.5M8 10H4.5M16 10h3.5M8 14H5M16 14h3" />
  </IconBase>
);

/** Spirale — type Psy. */
export const IconSpiral = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 12a2 2 0 1 1 2.5 1.9A4 4 0 0 1 8.5 12a6.5 6.5 0 1 1 9.9 5.6" />
  </IconBase>
);

/** Croissant sombre — type Ténèbres. */
export const IconCrescent = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M16.5 4a8.5 8.5 0 1 0 3.5 12 7 7 0 0 1-3.5-12Z" />
    <circle cx="9" cy="10" r="1" />
  </IconBase>
);

/** Poing — type Combat. */
export const IconFist = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M5 11a2 2 0 0 1 2-2h9a3 3 0 0 1 3 3v3a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" />
    <path d="M8 9V6.5a1.8 1.8 0 0 1 3.5 0V9M11.5 9V5.8a1.8 1.8 0 0 1 3.5 0V9" />
  </IconBase>
);

/** Sillons — type Sol. */
export const IconFurrow = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M3 9h18M3 14c3-2 6-2 9 0s6 2 9 0M4 19h16" />
  </IconBase>
);

/** Rond simple — type Normal. */
export const IconCircle = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="3" />
  </IconBase>
);

/** Loupe — rechercher dans une liste. */
export const IconSearch = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </IconBase>
);

/** Deux feuilles — dupliquer. */
export const IconCopy = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
  </IconBase>
);
