/**
 * Types and interfaces for the Uno Game in BlitzRoom.
 */

export type UnoColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type UnoActiveColor = 'red' | 'blue' | 'green' | 'yellow';

export type UnoValue =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild4';

export interface UnoCard {
  id: string;
  color: UnoColor;
  value: UnoValue;
  score: number;
}

export type UnoPhase =
  | 'countdown'
  | 'playing'
  | 'round_over'
  | 'game_over';

export interface UnoActionLog {
  id: string;
  playerId: string;
  playerName: string;
  type: 'play' | 'draw' | 'pass' | 'uno' | 'catch_uno' | 'timeout';
  card?: UnoCard;
  chosenColor?: UnoActiveColor;
  description: string;
  timestamp: number;
}

export interface UnoSettingsConfig {
  cardsPerPlayer: number; // 5, 7, 10
  allowStacking: boolean; // Stack +2 on +2, +4 on +4
  timePerTurn: number; // 15, 20, 25, 30
  drawRule: 'draw-to-play' | 'draw-until-match';
  targetScore: number; // 0 for single-round blitz, 250, 500
}

export interface UnoGameState {
  phase: UnoPhase;
  roundNumber: number;
  turnOrder: string[];
  currentTurnPlayerId: string;
  turnDirection: 1 | -1;
  activeCard: UnoCard;
  activeColor: UnoActiveColor;
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  hands: Record<string, UnoCard[]>;
  unoCallers: Record<string, boolean>;
  unoVulnerable: string | null;
  pendingDrawCount: number;
  hasDrawnThisTurn: boolean;
  lastAction: UnoActionLog | null;
  phaseTimeLeft: number;
  winnerId: string | null;
  roundScores: Record<string, number>;
  syncTimestamp: number;
  version?: number;
}
