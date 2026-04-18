export const SESSION_SIZE = 25;
export const RECENT_WORD_COUNT = 25;

export const MASTERY_INTERVALS_DAYS: Record<number, number> = {
  0: 0,
  1: 1,
  2: 3,
  3: 7,
  4: 21,
};

export const XP_CORRECT = 10;
export const XP_WRONG = 2;
export const XP_PERFECT_SESSION_BONUS = 50;

export const ANIMALS = [
  'capybara',
  'axolotl',
  'red-panda',
  'quokka',
  'hedgehog',
  'sloth',
  'chinchilla',
  'fennec',
  'meerkat',
  'pygmy-owl',
  'sugar-glider',
  'slow-loris',
  'binturong',
  'fossa',
  'kinkajou',
  'patagonian-mara',
  'numbat',
  'dik-dik',
  'pika',
  'jerboa',
] as const;

export type AnimalName = (typeof ANIMALS)[number];
