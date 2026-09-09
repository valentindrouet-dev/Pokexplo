import type { Creature, ExerciseTemplate, VoiceMessage } from '../types';
import { createVoiceMessage } from '../utils/voice';
import { SYSTEM_ENCOURAGEMENTS } from '../exercise-engine/feedback';

/**
 * VOIX DE LA V1 (CONCEPTION §36-37, §52).
 *
 * Toutes les VoiceMessage sont livrees AVEC leur texte et SANS fichier audio :
 * leur statut est donc `VOICE_MISSING`. C'est volontaire — c'est exactement la
 * liste de travail que /admin > VOIX propose d'enregistrer en une session de
 * doublage (§117). En attendant, le TTS de secours prend le relais (§59) :
 * l'enfant peut jouer des le premier lancement.
 */

/** Dialogues du Professeur (§9) — toujours tres courts. */
const professorVoices: VoiceMessage[] = [
  createVoiceMessage(
    'voice.professor.welcome',
    'Bonjour ! Je suis le Professeur. Aujourd’hui, tu pars à l’aventure !',
    'professor',
  ),
  createVoiceMessage(
    'voice.professor.tutorial.map',
    'Touche un endroit sur la carte pour t’y rendre.',
    'tutorials',
  ),
  createVoiceMessage(
    'voice.professor.tutorial.encounter',
    'Une créature ! Réponds bien et tu pourras l’attraper.',
    'tutorials',
  ),
  createVoiceMessage(
    'voice.professor.tutorial.capture',
    'Lance la Ball pour l’attraper !',
    'tutorials',
  ),
  createVoiceMessage(
    'voice.professor.tutorial.pokedex',
    'Ton Pokédex garde toutes les créatures que tu rencontres.',
    'tutorials',
  ),
  createVoiceMessage(
    'voice.professor.tutorial.voice',
    'Si tu n’as pas compris, touche le haut-parleur pour réécouter.',
    'tutorials',
  ),
  createVoiceMessage(
    'voice.professor.gymHint',
    'Pierre est très fort. Prends des créatures Eau, Plante ou Glace !',
    'professor',
  ),
];

/** Arrivees sur les nœuds (§10) et presentations de biomes (§12). */
const worldVoices: VoiceMessage[] = [
  createVoiceMessage('voice.biome.centre', 'Te voilà au Centre. Ici, tu es en sécurité.', 'adventure'),
  createVoiceMessage('voice.biome.prairie', 'La prairie ! Il y a des créatures partout.', 'adventure'),
  createVoiceMessage('voice.biome.foret', 'Nous voilà dans la forêt ! Regarde bien.', 'adventure'),
  createVoiceMessage('voice.biome.riviere', 'Écoute la rivière. Des créatures d’Eau vivent ici.', 'adventure'),
  createVoiceMessage('voice.biome.grotte', 'Attention, le chemin devient rocheux.', 'adventure'),

  createVoiceMessage('voice.node.centre', 'Tu es au Centre.', 'adventure'),
  createVoiceMessage('voice.node.prairie1', 'La prairie ! Cherche une créature.', 'adventure'),
  createVoiceMessage('voice.node.prairie2', 'Le grand pré. Il y a du monde ici !', 'adventure'),
  createVoiceMessage('voice.node.prairie3', 'Le chemin fleuri mène à la rivière.', 'adventure'),
  createVoiceMessage('voice.node.foret1', 'La lisière de la forêt. Avance doucement.', 'adventure'),
  createVoiceMessage('voice.node.foret2', 'Le sous-bois est plein de surprises.', 'adventure'),
  createVoiceMessage('voice.node.foret3', 'La clairière. Quelque chose bouge…', 'adventure'),
  createVoiceMessage('voice.node.riviere1', 'La rivière ! L’eau est très claire.', 'adventure'),
  createVoiceMessage('voice.node.riviere2', 'La cascade fait beaucoup de bruit !', 'adventure'),
  createVoiceMessage('voice.node.cheminRoche', 'Le chemin des pierres. L’Arène est tout près.', 'adventure'),
  createVoiceMessage('voice.node.arene', 'L’Arène de Pierre ! Es-tu prêt ?', 'adventure'),

  createVoiceMessage(
    'voice.special.lianou',
    'Une créature rare est apparue dans la forêt !',
    'adventure',
  ),
];

/** Arene et fin de chapitre (§22, §6). */
const gymVoices: VoiceMessage[] = [
  createVoiceMessage(
    'voice.gym.pierre.intro',
    'Je suis Pierre, le Maître de l’Arène. Montre-moi ce que tu sais faire !',
    'gyms',
  ),
  createVoiceMessage(
    'voice.gym.pierre.requirement',
    'Reviens avec trois créatures fortes contre la Roche.',
    'gyms',
  ),
  createVoiceMessage(
    'voice.gym.pierre.victory',
    'Bravo ! Tu as gagné le Badge Roche !',
    'gyms',
  ),
  createVoiceMessage('voice.gym.pierre.encourage', 'Continue, tu y es presque !', 'gyms'),
  createVoiceMessage(
    'voice.chapter.1.intro',
    'Ton aventure commence ! Trouve des créatures et gagne ton premier badge.',
    'adventure',
  ),
  createVoiceMessage(
    'voice.chapter.1.outro',
    'Tu as gagné ton premier badge ! Bravo, jeune explorateur !',
    'adventure',
  ),
];

/** Quetes (§25). */
const questVoices: VoiceMessage[] = [
  createVoiceMessage('voice.quest.premiersPas.offer', 'Attrape trois créatures pour commencer !', 'quests'),
  createVoiceMessage('voice.quest.premiersPas.done', 'Trois créatures ! Tu es un vrai explorateur.', 'quests'),
  createVoiceMessage('voice.quest.plantes.offer', 'Trouve trois créatures de type Plante.', 'quests'),
  createVoiceMessage('voice.quest.plantes.done', 'Bravo ! Trois créatures Plante !', 'quests'),
  createVoiceMessage('voice.quest.eau.offer', 'Capture deux créatures d’Eau à la rivière.', 'quests'),
  createVoiceMessage('voice.quest.eau.done', 'Super ! Deux créatures d’Eau !', 'quests'),
  createVoiceMessage('voice.quest.lettreC.offer', 'Trouve une créature dont le nom commence par C.', 'quests'),
  createVoiceMessage('voice.quest.lettreC.done', 'Bravo ! Tu as trouvé la lettre C !', 'quests'),
  createVoiceMessage('voice.quest.syllabes.offer', 'Trouve une créature avec trois syllabes.', 'quests'),
  createVoiceMessage('voice.quest.syllabes.done', 'Bravo ! Trois syllabes, tu as bien écouté !', 'quests'),
  createVoiceMessage('voice.quest.arene.offer', 'Va défier Pierre à l’Arène !', 'quests'),
  createVoiceMessage('voice.quest.arene.done', 'Le Badge Roche est à toi !', 'quests'),
];

/** Voix d'interface communes (§65-66). */
const uiVoices: VoiceMessage[] = [
  createVoiceMessage('voice.ui.start', 'Touche pour commencer l’aventure !', 'ui'),
  createVoiceMessage('voice.ui.captured', 'Tu as attrapé une nouvelle créature !', 'ui'),
  createVoiceMessage('voice.ui.newPath', 'Un nouveau chemin s’est ouvert !', 'ui'),
];

/**
 * LA VOIX GUIDE AUSSI LA NAVIGATION (UI_DESIGN §192).
 *
 * Une phrase par ecran enfant, dite a l'arrivee. Sans elle, il fallait
 * comprendre les mots « Pokedex », « Equipe » ou « Quetes » pour se servir du
 * jeu. Ce sont des VoiceMessage comme les autres : enregistrables, rattrapees
 * par la synthese, et leur absence ne casse jamais rien.
 */
export const SCREEN_VOICES = {
  map: 'voice.ui.screen.map',
  pokedex: 'voice.ui.screen.pokedex',
  team: 'voice.ui.screen.team',
  badges: 'voice.ui.screen.badges',
  quests: 'voice.ui.screen.quests',
} as const;

const screenVoices: VoiceMessage[] = [
  createVoiceMessage(SCREEN_VOICES.map, 'Où veux-tu aller ?', 'ui'),
  createVoiceMessage(SCREEN_VOICES.pokedex, 'Voici tous les Pokémon que tu as rencontrés !', 'ui'),
  createVoiceMessage(
    SCREEN_VOICES.team,
    'Choisis les Pokémon que tu veux emmener avec toi !',
    'ui',
  ),
  createVoiceMessage(SCREEN_VOICES.badges, 'Voici tes badges !', 'ui'),
  createVoiceMessage(SCREEN_VOICES.quests, 'Voici tes missions !', 'ui'),
  // On ne bloque jamais en silence : l'equipe pleine se DIT (§192).
  createVoiceMessage(
    'voice.ui.team.full',
    'Ton équipe est complète ! Laisse une créature à la maison pour en prendre une autre.',
    'ui',
  ),
];

/** CONCEPTION §54 — quatre voix par matrice : question, indice 1, indice 2, réussite. */
export function exerciseVoices(templates: ExerciseTemplate[]): VoiceMessage[] {
  return templates.flatMap((template) => {
    const locale = template.locale ?? 'fr-FR';
    return [
      createVoiceMessage(`voice.ex.${template.id}.q`, template.prompt, 'exercises', { locale }),
      createVoiceMessage(`voice.ex.${template.id}.h1`, template.hint1Text, 'exercises', { locale }),
      createVoiceMessage(`voice.ex.${template.id}.h2`, template.hint2Text, 'exercises', { locale }),
      createVoiceMessage(`voice.ex.${template.id}.ok`, template.successText, 'exercises', {
        locale,
        autoPlay: true,
        showText: true,
      }),
    ];
  });
}

/** CONCEPTION §155 — bouton 🔊 du Pokedex : entendre le nom de la creature. */
export function creatureNameVoices(creatures: Creature[]): VoiceMessage[] {
  return creatures.map((creature) =>
    createVoiceMessage(creatureNameVoiceId(creature.id), creature.name, 'adventure', {
      autoPlay: false,
      showText: true,
    }),
  );
}

export function creatureNameVoiceId(creatureId: string): string {
  return `voice.creature.${creatureId}.name`;
}

/** Voix systeme d'encouragement (§14). */
const feedbackVoices: VoiceMessage[] = SYSTEM_ENCOURAGEMENTS.map((item) =>
  createVoiceMessage(item.voiceId, item.text, 'ui'),
);

export const narrativeVoices: VoiceMessage[] = [
  ...professorVoices,
  ...worldVoices,
  ...gymVoices,
  ...questVoices,
  ...uiVoices,
  ...screenVoices,
  ...feedbackVoices,
];
