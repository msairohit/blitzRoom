/**
 * Room-related types for BlitzRoom
 */

export type RoomStatus = 'waiting' | 'configuring' | 'active' | 'finished';

export interface Room {
  id: string;
  /** 6-character uppercase join code */
  code: string;
  /** User ID of the room admin */
  adminId: string;
  /** Current room status */
  status: RoomStatus;
  /** Activity type key (e.g., 'quiz', 'truth-or-dare') */
  activityType: string;
  /** Activity-specific settings */
  activitySettings: Record<string, unknown>;
  /** Maximum number of players allowed */
  maxPlayers: number;
  /** Timestamp when the room was created */
  createdAt: number;
  /** Number of current players (denormalized for quick display) */
  playerCount: number;
}

export interface RoomCreatePayload {
  activityType: string;
  activitySettings: Record<string, unknown>;
  maxPlayers: number;
  adminDisplayName: string;
}
