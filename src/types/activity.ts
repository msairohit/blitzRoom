/**
 * Activity plugin types for BlitzRoom
 * Defines the interface all activities must implement to be registered.
 */

import React from 'react';
import type { Player } from './player';

/** Settings component receives these props */
export interface ActivitySettingsProps {
  /** Current settings value */
  settings: Record<string, unknown>;
  /** Called when user changes a setting */
  onSettingsChange: (settings: Record<string, unknown>) => void;
  /** Current theme colors (for styling) */
}

/** Game component receives these props */
export interface ActivityGameProps {
  /** Current room ID */
  roomId: string;
  /** Room join code */
  roomCode: string;
  /** Current player's ID */
  currentPlayerId: string;
  /** Whether the current player is the admin */
  isAdmin: boolean;
  /** All players in the room */
  players: Player[];
  /** Activity-specific settings */
  settings: Record<string, unknown>;
  /** Called when the activity is complete */
  onActivityEnd: (results: ActivityResults) => void;
  /** Broadcast a game event to all players */
  broadcastEvent: (event: GameEvent) => void;
  /** Subscribe to game events from other players */
  onGameEvent: (callback: (event: GameEvent) => void) => () => void;
}

/** Results when an activity finishes */
export interface ActivityResults {
  /** Player scores, ordered by rank */
  scores: Array<{
    playerId: string;
    displayName: string;
    score: number;
    rank: number;
  }>;
  /** Activity-specific result data */
  metadata?: Record<string, unknown>;
}

/** A game event broadcast to all players */
export interface GameEvent {
  type: string;
  senderId: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

/** Definition of an activity plugin */
export interface ActivityDefinition {
  /** Unique identifier (e.g., 'quiz', 'truth-or-dare') */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** MaterialCommunityIcons icon name */
  icon: string;
  /** Minimum players required */
  minPlayers: number;
  /** Maximum players supported */
  maxPlayers: number;
  /** Component for configuring activity settings */
  SettingsComponent: React.ComponentType<ActivitySettingsProps>;
  /** Component for playing the activity */
  GameComponent: React.ComponentType<ActivityGameProps>;
  /** Default settings for this activity */
  defaultSettings: Record<string, unknown>;
  /** Category for grouping in the picker */
  category: 'game' | 'social' | 'trivia' | 'party';
  /** Estimated duration label */
  estimatedDuration: string;
}
