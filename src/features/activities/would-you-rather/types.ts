/**
 * Would You Rather — Activity Types
 */

export type WouldYouRatherCategory = 'funny' | 'deep' | 'party' | 'superpower' | 'daily';

export type WouldYouRatherMode = 'majority' | 'minority' | 'party';

export interface Dilemma {
  id: string;
  category: WouldYouRatherCategory;
  optionA: string;
  optionB: string;
  iconA?: string;
  iconB?: string;
}

export interface WouldYouRatherCategoryInfo {
  value: WouldYouRatherCategory | 'all';
  label: string;
  emoji: string;
  description: string;
}

export const WYR_CATEGORIES: WouldYouRatherCategoryInfo[] = [
  {
    value: 'all',
    label: 'Wild Mix',
    emoji: '🎲',
    description: 'A random blend of all categories for maximum unpredictability!',
  },
  {
    value: 'funny',
    label: 'Hilarious & Absurd',
    emoji: '🤪',
    description: 'Ridiculous dilemmas, embarrassing moments, and utter nonsense.',
  },
  {
    value: 'deep',
    label: 'Deep & Moral',
    emoji: '🧠',
    description: 'Tough philosophical choices, ethics, and life-altering decisions.',
  },
  {
    value: 'party',
    label: 'Party & Chaos',
    emoji: '🥳',
    description: 'Spicy secrets, daring tradeoffs, and chaotic social situations.',
  },
  {
    value: 'superpower',
    label: 'Superpowers & Sci-Fi',
    emoji: '⚡',
    description: 'Cosmic abilities, time travel, and superhuman dilemmas.',
  },
  {
    value: 'daily',
    label: 'Everyday & Food',
    emoji: '🍕',
    description: 'Food sins, daily habits, technology, and pet peeves.',
  },
];

export interface WouldYouRatherModeInfo {
  value: WouldYouRatherMode;
  label: string;
  icon: string;
  description: string;
}

export const WYR_MODES: WouldYouRatherModeInfo[] = [
  {
    value: 'majority',
    label: 'Majority Rules',
    icon: 'account-group',
    description: '+100 pts for voting with the majority of the room!',
  },
  {
    value: 'minority',
    label: 'Minority Rebel',
    icon: 'fire',
    description: '+100 pts for boldly picking the underdog option!',
  },
  {
    value: 'party',
    label: 'Casual Social',
    icon: 'emoticon-happy-outline',
    description: 'Pure discussion & laughter. No points, just fun debate.',
  },
];

export interface WouldYouRatherSettingsState {
  category: WouldYouRatherCategory | 'all';
  mode: WouldYouRatherMode;
  rounds: number;
  timePerDilemma: number;
  autoAdvance?: boolean;
  customDilemmas?: Dilemma[];
}

export type WouldYouRatherPhase = 'countdown' | 'voting' | 'reveal' | 'finished';

export interface WouldYouRatherSyncState {
  phase: WouldYouRatherPhase;
  dilemmaIndex: number;
  votes: Record<string, 'A' | 'B'>;
  dilemmas: Dilemma[];
  roundStartTime?: number;
  roundCount: number;
  syncId: string;
  isTimerPaused?: boolean;
  revealTimer?: number;
}
