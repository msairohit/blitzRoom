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

  // === Add new activities below! ===
  // 'new-activity': {
  //   id: 'new-activity',
  //   name: 'My New Activity',
  //   ...
  // },
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
