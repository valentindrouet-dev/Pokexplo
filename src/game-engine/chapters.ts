import type { Chapter, ContentBundle, SaveFile } from '../types';

/** CONCEPTION §6 — le chapitre est termine quand tous ses objectifs le sont. */
export function isChapterComplete(chapter: Chapter, save: SaveFile): boolean {
  return chapter.goals.every((goal) => {
    switch (goal.kind) {
      case 'QUEST':
        return save.state.quests[goal.questId]?.status === 'COMPLETED';
      case 'GYM':
        return save.state.gymsCompleted.includes(goal.gymId);
      case 'CAPTURES':
        return (
          Object.values(save.pokedex).filter((entry) => entry.state === 'CAPTURED').length >=
          goal.count
        );
      default:
        return false;
    }
  });
}

export function currentChapter(save: SaveFile, content: ContentBundle): Chapter | null {
  return content.chapters.find((chapter) => chapter.id === save.state.chapterId) ?? null;
}

export function nextChapter(save: SaveFile, content: ContentBundle): Chapter | null {
  const chapter = currentChapter(save, content);
  if (!chapter) return null;
  return (
    content.chapters
      .filter((item) => item.index > chapter.index)
      .sort((a, b) => a.index - b.index)[0] ?? null
  );
}

/** Progression du chapitre, affichee au Centre (0..1). */
export function chapterProgress(chapter: Chapter, save: SaveFile): number {
  if (chapter.goals.length === 0) return 1;
  const done = chapter.goals.filter((goal) => {
    switch (goal.kind) {
      case 'QUEST':
        return save.state.quests[goal.questId]?.status === 'COMPLETED';
      case 'GYM':
        return save.state.gymsCompleted.includes(goal.gymId);
      case 'CAPTURES':
        return (
          Object.values(save.pokedex).filter((entry) => entry.state === 'CAPTURED').length >=
          goal.count
        );
      default:
        return false;
    }
  }).length;
  return done / chapter.goals.length;
}
