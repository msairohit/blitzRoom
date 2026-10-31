/**
 * Who Am I? — Type Definitions
 * The classic secret persona & 20 questions guessing party game.
 */

export type WhoAmICategory =
  | 'celebrities'
  | 'characters'
  | 'historical'
  | 'gaming_anime'
  | 'animals_objects'
  | 'all';

export interface PersonaItem {
  id: string;
  category: WhoAmICategory;
  name: string;
  tagline: string; // e.g. "Marvel Superhero / Web-Slinger"
  hints: string[]; // [Hint 1 (Vague), Hint 2 (Medium), Hint 3 (Direct)]
  icon: string;
  decoys: string[]; // For multiple choice assistance
}

export type WhoAmIPhase =
  | 'intro'         // Dramatic reveal of active guesser
  | 'questioning'   // Guesser asks questions / guesses, others give answers & clues
  | 'reveal'        // Identity reveal, score calculation
  | 'round_summary' // Round points, next player preview
  | 'game_over';    // Final podium

export interface WhoAmIPrivateState {
  isGuesser: boolean;
  secretPersona?: PersonaItem | null; // null for the active guesser, defined for everyone else!
}

export interface PlayerClue {
  [key: string]: unknown;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

export interface ReactionPing {
  [key: string]: unknown;
  id: string;
  senderId: string;
  senderName: string;
  type: 'yes' | 'no' | 'maybe' | 'hot' | 'cold';
  timestamp: number;
}

export interface WhoAmISyncState {
  phase: WhoAmIPhase;
  roundNumber: number;
  totalRounds: number;
  guesserPlayerId: string;
  personaId: string;
  hintsRevealedCount: number;
  guessesRemaining: number;
  guessAttempts: string[];
  isGuessedCorrectly: boolean | null;
  phaseTimeLeft: number;
  clues: PlayerClue[];
  syncTimestamp: number;
}

export interface WhoAmISettingsConfig {
  category: WhoAmICategory;
  timePerTurn: number; // e.g. 60s, 90s, 120s
  maxHintsAllowed: number;
  roundsPerPlayer: number; // e.g. 1 or 2
  customPersonas?: PersonaItem[];
}

export const WHO_AM_I_CATEGORIES: Array<{
  value: WhoAmICategory;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'all',
    label: 'Party Mix',
    description: 'Wild mix of superheroes, celebrities, icons & legends',
    icon: 'shuffle-variant',
  },
  {
    value: 'characters',
    label: 'Movies & Superheroes',
    description: 'Spider-Man, Harry Potter, Darth Vader, Elsa, Sherlock',
    icon: 'movie-filter',
  },
  {
    value: 'celebrities',
    label: 'Celebrities & Stars',
    description: 'Taylor Swift, Lionel Messi, Beyoncé, Elon Musk, The Rock',
    icon: 'star-face',
  },
  {
    value: 'gaming_anime',
    label: 'Gaming & Anime',
    description: 'Pikachu, Mario, Goku, Master Chief, Sonic, Naruto',
    icon: 'gamepad-variant',
  },
  {
    value: 'historical',
    label: 'Historical Icons',
    description: 'Einstein, Cleopatra, Da Vinci, Shakespeare, Gandhi',
    icon: 'feather',
  },
  {
    value: 'animals_objects',
    label: 'Animals & Inventions',
    description: 'Tyrannosaurus Rex, Smartphone, Dolphin, Lightning Bolt',
    icon: 'creation',
  },
];
