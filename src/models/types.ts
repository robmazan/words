export interface Word {
  id: string;
  english: string;
  hungarian: string;
  exampleSentence: string;
  dateAdded: string;
  index: number;
}

export interface WordProgress {
  wordId: string;
  masteryLevel: 0 | 1 | 2 | 3 | 4;
  timesCorrect: number;
  timesWrong: number;
  lastReviewed: string;
  nextReview: string;
}

export interface UserProfile {
  userId: string;
  xp: number;
  level: number;
  streak: number;
  lastLoginDate: string;
  badges: string[];
}

export type TranslationDirection = 'hu-to-en' | 'en-to-hu';

export interface SessionWord {
  word: Word;
  direction: TranslationDirection;
  progress: WordProgress | null;
}

export interface SessionResult {
  wordId: string;
  direction: TranslationDirection;
  correct: boolean;
  responseTimeMs: number;
}

export type GameMode = 'flashcard' | 'spelling' | 'match' | 'quickfire';

export type AnimalState = 'locked' | 'peeking' | 'befriended';

export interface BadgeDefinition {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export function wordId(english: string): string {
  return english.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}
