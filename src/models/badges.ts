import type { BadgeDefinition } from './types.js';

export const BADGES: BadgeDefinition[] = [
  {
    id: 'first-befriend',
    label: 'First Friend',
    description: 'Befriend your first animal',
    icon: 'paw',
  },
  {
    id: 'perfect-session',
    label: 'Perfect Session',
    description: 'Get every answer right in a session',
    icon: 'star',
  },
  {
    id: 'streak-5',
    label: '5-Day Streak',
    description: 'Practice 5 days in a row',
    icon: 'flame',
  },
  {
    id: 'streak-30',
    label: '30-Day Streak',
    description: 'Practice 30 days in a row',
    icon: 'fire',
  },
  {
    id: 'full-zoo',
    label: 'Full Zoo',
    description: 'Befriend every animal in the zoo',
    icon: 'zoo',
  },
];
