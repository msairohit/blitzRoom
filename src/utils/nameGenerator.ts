/**
 * Fun display name generator for BlitzRoom.
 * Generates random names like "SwiftFalcon42" or "CoolPanda7".
 */

const adjectives = [
  'Swift', 'Cool', 'Brave', 'Lucky', 'Wild',
  'Mighty', 'Clever', 'Cosmic', 'Epic', 'Turbo',
  'Funky', 'Mega', 'Super', 'Ultra', 'Hyper',
  'Sneaky', 'Blazing', 'Cheeky', 'Jolly', 'Zappy',
];

const nouns = [
  'Falcon', 'Panda', 'Dragon', 'Phoenix', 'Tiger',
  'Ninja', 'Wizard', 'Knight', 'Shark', 'Wolf',
  'Raven', 'Fox', 'Lion', 'Hawk', 'Bear',
  'Viper', 'Storm', 'Bolt', 'Flame', 'Star',
];

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random fun display name.
 * @returns Name like "SwiftFalcon42"
 */
export function generateDisplayName(): string {
  const adj = randomFrom(adjectives);
  const noun = randomFrom(nouns);
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}
