/**
 * Player-related types for BlitzRoom
 */

/** Pre-defined avatar colors for players */
export const AVATAR_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#84CC16', // Lime
  '#6366F1', // Indigo
  '#D946EF', // Fuchsia
  '#F43F5E', // Rose
  '#0EA5E9', // Sky
  '#A855F7', // Violet
  '#FB923C', // Light Orange
  '#22D3EE', // Light Cyan
  '#A3E635', // Light Lime
  '#C084FC', // Light Purple
  '#FDE047', // Yellow
] as const;

export interface Player {
  id: string;
  /** Display name chosen by the player */
  displayName: string;
  /** Hex color for their avatar */
  avatarColor: string;
  /** Whether the player has toggled "ready" */
  isReady: boolean;
  /** Current score in the activity */
  score: number;
  /** When they joined the room */
  joinedAt: number;
  /** Whether this player is the room admin */
  isAdmin: boolean;
  /** Whether this player has finished the active game/activity */
  isDone?: boolean;
  /** Whether this player is currently offline (disconnected) */
  isOffline?: boolean;
  /** Whether this player has been eliminated in an elimination-style game */
  isEliminated?: boolean;
  /** Team identifier for team-based games */
  teamId?: string;
}

export interface PlayerJoinPayload {
  displayName: string;
  avatarColor: string;
}
