import type { Word, WordProgress, SessionWord, SessionResult } from '../models/types.js';
import {
  SESSION_SIZE,
  RECENT_WORD_COUNT,
  MASTERY_INTERVALS_DAYS,
  XP_CORRECT,
  XP_WRONG,
  XP_PERFECT_SESSION_BONUS,
  ANIMALS,
} from '../models/config.js';
import type { AnimalState } from '../models/types.js';

export function selectSessionWords(
  words: Word[],
  progress: Map<string, WordProgress>,
  sessionSize = SESSION_SIZE,
  recentCount = RECENT_WORD_COUNT,
): SessionWord[] {
  if (words.length === 0) return [];

  const now = new Date();
  const recentThreshold = Math.max(0, words.length - recentCount);

  const weighted = words.map((word) => {
    const p = progress.get(word.id);
    const mastery = p?.masteryLevel ?? 0;
    const isRecent = word.index >= recentThreshold;
    const isDue = p ? new Date(p.nextReview) <= now : true;

    let w = isRecent ? 3 : 1;
    w *= (5 - mastery);
    if (isDue) w *= 2;
    return { word, weight: w };
  });

  const selected: Word[] = [];
  const pool = [...weighted];

  for (let i = 0; i < Math.min(sessionSize, pool.length); i++) {
    const total = pool.reduce((s, x) => s + x.weight, 0);
    let rand = Math.random() * total;
    const idx = pool.findIndex(({ weight }) => {
      rand -= weight;
      return rand <= 0;
    });
    const safeIdx = idx === -1 ? pool.length - 1 : idx;
    selected.push(pool[safeIdx].word);
    pool.splice(safeIdx, 1);
  }

  // ~60% hu-to-en (primary), ~40% en-to-hu
  return selected.map((word, i) => ({
    word,
    direction: i % 5 < 3 ? 'hu-to-en' : 'en-to-hu',
    progress: progress.get(word.id) ?? null,
  }));
}

export function applySessionResults(
  results: SessionResult[],
  progress: Map<string, WordProgress>,
): Map<string, WordProgress> {
  const updated = new Map(progress);
  const now = new Date().toISOString();

  for (const result of results) {
    const existing = updated.get(result.wordId);
    const prev: WordProgress = existing ?? {
      wordId: result.wordId,
      masteryLevel: 0,
      timesCorrect: 0,
      timesWrong: 0,
      lastReviewed: now,
      nextReview: now,
    };

    const newMastery = (result.correct
      ? Math.min(4, prev.masteryLevel + 1)
      : Math.max(0, prev.masteryLevel - 1)) as 0 | 1 | 2 | 3 | 4;

    const intervalDays = MASTERY_INTERVALS_DAYS[newMastery];
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervalDays);

    updated.set(result.wordId, {
      wordId: result.wordId,
      masteryLevel: newMastery,
      timesCorrect: prev.timesCorrect + (result.correct ? 1 : 0),
      timesWrong: prev.timesWrong + (result.correct ? 0 : 1),
      lastReviewed: now,
      nextReview: nextReview.toISOString(),
    });
  }

  return updated;
}

export function calculateSessionXP(results: SessionResult[]): number {
  const base = results.reduce(
    (sum, r) => sum + (r.correct ? XP_CORRECT : XP_WRONG),
    0,
  );
  const perfect = results.every((r) => r.correct) ? XP_PERFECT_SESSION_BONUS : 0;
  return base + perfect;
}

export function xpToLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50));
}

export function levelThreshold(level: number): number {
  return level * level * 50;
}

export function getAnimalForWord(wordIndex: number): string {
  return ANIMALS[wordIndex % ANIMALS.length];
}

export function getAnimalState(prog: WordProgress | null | undefined): AnimalState {
  if (!prog) return 'locked';
  if (prog.masteryLevel >= 4) return 'befriended';
  return 'peeking';
}

export function updateStreak(
  profile: { streak: number; lastLoginDate: string },
): { streak: number; lastLoginDate: string } {
  const today = new Date().toISOString().slice(0, 10);
  const last = profile.lastLoginDate?.slice(0, 10);

  if (last === today) return { streak: profile.streak, lastLoginDate: profile.lastLoginDate };

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const newStreak = last === yesterday ? profile.streak + 1 : 1;
  return { streak: newStreak, lastLoginDate: today };
}

export function checkNewBadges(
  profile: { badges: string[]; streak: number },
  updatedProgress: Map<string, WordProgress>,
  sessionResults: SessionResult[],
  totalWords: number,
): string[] {
  const earned: string[] = [];
  const has = (id: string) => profile.badges.includes(id);

  const befriendedCount = [...updatedProgress.values()].filter(
    (p) => p.masteryLevel >= 4,
  ).length;

  if (!has('first-befriend') && befriendedCount >= 1) earned.push('first-befriend');
  if (!has('perfect-session') && sessionResults.every((r) => r.correct))
    earned.push('perfect-session');
  if (!has('streak-5') && profile.streak >= 5) earned.push('streak-5');
  if (!has('streak-30') && profile.streak >= 30) earned.push('streak-30');
  if (!has('full-zoo') && totalWords > 0 && befriendedCount >= totalWords)
    earned.push('full-zoo');

  return earned;
}

export function normalizeAnswer(s: string): string {
  return s.toLowerCase().trim();
}
