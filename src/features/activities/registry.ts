/**
 * Activity Registry for BlitzRoom.
 * 
 * To add a new activity:
 * 1. Create a folder under src/features/activities/<activity-id>/
 * 2. Implement SettingsComponent and GameComponent
 * 3. Add an entry to ACTIVITY_REGISTRY below
 * 
 * That's it! The activity will automatically appear in the picker.
 */

import type { ActivityDefinition } from '@/src/types/activity';
import { QuizSettings } from './quiz/QuizSettings';
import { QuizGame } from './quiz/QuizGame';
import { TruthOrDareSettings } from './truth-or-dare/TruthOrDareSettings';
import { TruthOrDareGame } from './truth-or-dare/TruthOrDareGame';
import { WouldYouRatherSettings } from './would-you-rather/WouldYouRatherSettings';
import { WouldYouRatherGame } from './would-you-rather/WouldYouRatherGame';
import { ImpostorSettings } from './impostor/ImpostorSettings';
import { ImpostorGame } from './impostor/ImpostorGame';
import { WhoAmISettings } from './who-am-i/WhoAmISettings';
import { WhoAmIGame } from './who-am-i/WhoAmIGame';
import { UnoSettings } from './uno/UnoSettings';
import { UnoGame } from './uno/UnoGame';

export const ACTIVITY_REGISTRY: Record<string, ActivityDefinition> = {
  quiz: {
    id: 'quiz',
    name: 'Quiz Battle',
    description: 'Test your knowledge! Answer questions fast to score points.',
    icon: 'brain',
    minPlayers: 2,
    maxPlayers: 20,
    SettingsComponent: QuizSettings,
    GameComponent: QuizGame,
    category: 'trivia',
    estimatedDuration: '5-15 min',
    defaultSettings: {
      numberOfQuestions: 10,
      timePerQuestion: 15,
      category: 'general',
      difficulty: 'medium',
    },
  },

  'truth-or-dare': {
    id: 'truth-or-dare',
    name: 'Truth or Dare',
    description: 'Classic party game! Choose truth or dare and face the challenge.',
    icon: 'cards-playing-spade-multiple',
    minPlayers: 2,
    maxPlayers: 20,
    SettingsComponent: TruthOrDareSettings,
    GameComponent: TruthOrDareGame,
    category: 'party',
    estimatedDuration: '10-30 min',
    defaultSettings: {
      category: 'fun',
      includeCustomPrompts: false,
      customPrompts: [],
      rounds: 0, // 0 = unlimited
    },
  },

  'would-you-rather': {
    id: 'would-you-rather',
    name: 'Would You Rather?',
    description: 'Impossible dilemmas & chaotic choices! Vote with majority or rebel.',
    icon: 'scale-balance',
    minPlayers: 2,
    maxPlayers: 20,
    SettingsComponent: WouldYouRatherSettings,
    GameComponent: WouldYouRatherGame,
    category: 'party',
    estimatedDuration: '5-15 min',
    defaultSettings: {
      category: 'all',
      mode: 'majority',
      rounds: 8,
      timePerDilemma: 15,
      autoAdvance: true,
      customDilemmas: [],
    },
  },

  impostor: {
    id: 'impostor',
    name: 'Find the Impostor',
    description: 'Deception & deduction! Give subtle clues, interrogate suspects, and catch the spy.',
    icon: 'incognito',
    minPlayers: 3,
    maxPlayers: 20,
    SettingsComponent: ImpostorSettings,
    GameComponent: ImpostorGame,
    category: 'deduction',
    estimatedDuration: '10-20 min',
    defaultSettings: {
      category: 'all',
      impostorCount: 'auto',
      rounds: 5,
      clueTimePerPlayer: 20,
      discussionTime: 60,
      customWords: [],
    },
  },

  'who-am-i': {
    id: 'who-am-i',
    name: 'Who Am I?',
    description: 'Sticky note party game! Ask questions to guess your secret identity on your forehead.',
    icon: 'account-question',
    minPlayers: 2,
    maxPlayers: 20,
    SettingsComponent: WhoAmISettings,
    GameComponent: WhoAmIGame,
    category: 'social',
    estimatedDuration: '10-25 min',
    defaultSettings: {
      category: 'all',
      timePerTurn: 90,
      roundsPerPlayer: 1,
      maxHintsAllowed: 3,
      customPersonas: [],
    },
  },

  uno: {
    id: 'uno',
    name: 'Blitz Uno',
    description: 'The classic card-shedding race! Match colors & numbers, stack penalties, and shout UNO!',
    icon: 'cards-playing-outline',
    minPlayers: 2,
    maxPlayers: 10,
    SettingsComponent: UnoSettings,
    GameComponent: UnoGame,
    category: 'game',
    estimatedDuration: '5-20 min',
    defaultSettings: {
      cardsPerPlayer: 7,
      allowStacking: true,
      timePerTurn: 20,
      drawRule: 'draw-to-play',
      targetScore: 0,
    },
  },
};

/** Get all activities as an ordered array */
export function getActivityList(): ActivityDefinition[] {
  return Object.values(ACTIVITY_REGISTRY);
}

/** Get a single activity by ID */
export function getActivity(id: string): ActivityDefinition | undefined {
  return ACTIVITY_REGISTRY[id];
}

/** Get activities filtered by category */
export function getActivitiesByCategory(category: ActivityDefinition['category']): ActivityDefinition[] {
  return Object.values(ACTIVITY_REGISTRY).filter((a) => a.category === category);
}
