/**
 * Find the Impostor — Type Definitions
 */

export type ImpostorCategory =
  | 'locations'
  | 'occupations'
  | 'objects'
  | 'food'
  | 'pop_culture'
  | 'animals'
  | 'all';

export interface SecretWordItem {
  id: string;
  category: ImpostorCategory;
  word: string;
  hint: string; // Generic category hint visible to impostor (e.g. "A place people visit for travel")
  decoys: string[]; // Decoys for impostor guess phase
}

export type ImpostorPhase =
  | 'reveal_role'     // Dramatic card flip showing role & secret word
  | 'clue_giving'     // Turn-based clue giving around the circle
  | 'discussion'      // Free discussion / debate
  | 'voting'          // Secret voting on who is the impostor
  | 'impostor_guess'  // If impostor caught, last-chance guess to steal win
  | 'round_summary'   // Reveal results, vote tally, scores
  | 'game_over';      // Final activity podium

export type PlayerRole = 'detective' | 'impostor';

export interface ImpostorPrivateState {
  role: PlayerRole;
  secretWord: string; // If impostor, may be "???" or hidden
  categoryHint: string;
  category: ImpostorCategory;
}

export interface ClueEntry {
  playerId: string;
  playerName: string;
  clueText: string;
  timestamp: number;
}

export interface DiscussionChatEntry {
  id: string;
  senderId?: string;
  sender: string;
  text: string;
  targetPlayerId?: string;
  targetPlayerName?: string;
  isAccusation?: boolean;
  timestamp: number;
  [key: string]: unknown;
}

export interface ImpostorSyncState {
  phase: ImpostorPhase;
  roundNumber: number;
  totalRounds: number;
  category: ImpostorCategory;
  secretWordId: string;
  currentTurnPlayerId: string;
  turnOrder: string[];
  clues: ClueEntry[];
  votes: Record<string, string>; // voterId -> targetPlayerId
  impostorIds: string[];
  accusedPlayerId: string | null;
  impostorGuessCorrect: boolean | null;
  winner: 'detectives' | 'impostors' | null;
  phaseTimeLeft: number;
  syncTimestamp: number;
}

export interface ImpostorSettingsConfig {
  category: ImpostorCategory;
  impostorCount: 1 | 2 | 'auto';
  rounds: number;
  clueTimePerPlayer: number; // e.g. 20s
  discussionTime: number;    // e.g. 60s
  customWords?: SecretWordItem[];
}

export const IMPOSTOR_CATEGORIES: Array<{
  value: ImpostorCategory;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'all',
    label: 'Mixed Mystery',
    description: 'A wild mix of locations, jobs, objects & pop culture',
    icon: 'shuffle-variant',
  },
  {
    value: 'locations',
    label: 'Locations & Places',
    description: 'Airports, pirate ships, space stations, haunted hotels',
    icon: 'map-marker-radius',
  },
  {
    value: 'occupations',
    label: 'Jobs & Occupations',
    description: 'Astronauts, spies, chefs, deep-sea divers, detectives',
    icon: 'briefcase',
  },
  {
    value: 'objects',
    label: 'Everyday Objects',
    description: 'Microwave, skateboard, umbrella, sunglasses, guitar',
    icon: 'cube-outline',
  },
  {
    value: 'food',
    label: 'Food & Cuisine',
    description: 'Sushi, pizza, chocolate fountain, tacos, cotton candy',
    icon: 'food-fork-drink',
  },
  {
    value: 'pop_culture',
    label: 'Pop Culture & Movies',
    description: 'Superheroes, sci-fi worlds, blockbuster films, viral trends',
    icon: 'filmstrip',
  },
  {
    value: 'animals',
    label: 'Animals & Creatures',
    description: 'Penguin, chameleon, dragon, golden retriever, octopus',
    icon: 'paw',
  },
];
