/**
 * Deck generation, shuffling, game rules, and Bot AI for Uno.
 */

import type { UnoActiveColor, UnoCard, UnoColor, UnoValue } from './types';

const BASE_COLORS: UnoActiveColor[] = ['red', 'blue', 'green', 'yellow'];

/**
 * Generates an authentic 108-card Uno deck.
 */
export function generateFullDeck(): UnoCard[] {
  const cards: UnoCard[] = [];
  let seq = 1;

  for (const color of BASE_COLORS) {
    // Exactly 1 '0' per color
    cards.push({
      id: `c_${color}_0_${seq++}`,
      color,
      value: 0,
      score: 0,
    });

    // Exactly 2 of '1' through '9' per color
    for (let num = 1; num <= 9; num++) {
      for (let copy = 0; copy < 2; copy++) {
        cards.push({
          id: `c_${color}_${num}_${copy}_${seq++}`,
          color,
          value: num as UnoValue,
          score: num,
        });
      }
    }

    // Exactly 2 of 'skip', 'reverse', 'draw2' per color
    const actionTypes: Array<{ val: UnoValue; score: number }> = [
      { val: 'skip', score: 20 },
      { val: 'reverse', score: 20 },
      { val: 'draw2', score: 20 },
    ];

    for (const action of actionTypes) {
      for (let copy = 0; copy < 2; copy++) {
        cards.push({
          id: `c_${color}_${action.val}_${copy}_${seq++}`,
          color,
          value: action.val,
          score: action.score,
        });
      }
    }
  }

  // 4 Wild cards
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `c_wild_${i}_${seq++}`,
      color: 'wild',
      value: 'wild',
      score: 50,
    });
  }

  // 4 Wild Draw Four cards
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `c_wild4_${i}_${seq++}`,
      color: 'wild',
      value: 'wild4',
      score: 50,
    });
  }

  return cards;
}

/**
 * Fisher-Yates array shuffle.
 */
export function shuffleDeck<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Validates whether a card can be legally played on top of the current discard card.
 */
/**
 * Validates whether a card can be legally played on top of the current discard card.
 */
export function canPlayCard(
  card?: UnoCard | null,
  activeCard?: UnoCard | null,
  activeColor?: UnoActiveColor | null,
  pendingDrawCount: number = 0,
  allowStacking: boolean = true
): boolean {
  if (!card) return false;
  if (!activeCard) return true;

  const currentActiveColor = activeColor || (activeCard.color === 'wild' ? 'red' : activeCard.color);

  // If there is an active stacked draw penalty (+2 or +4)
  if (pendingDrawCount > 0) {
    if (!allowStacking) return false;

    // Stacking rules: +2 can be placed on +2, +4 on +4
    if (activeCard.value === 'draw2' && card.value === 'draw2') {
      return true;
    }
    if (activeCard.value === 'wild4' && card.value === 'wild4') {
      return true;
    }
    return false;
  }

  // Wild cards can always be played
  if (card.color === 'wild' || card.value === 'wild' || card.value === 'wild4') {
    return true;
  }

  // Matching color
  if (card.color === currentActiveColor) {
    return true;
  }

  // Matching value / symbol (e.g., Red 7 on Blue 7, or Blue Skip on Green Skip)
  if (card.value === activeCard.value) {
    return true;
  }

  return false;
}

/**
 * Selects the optimal color for a bot when playing a Wild card.
 * Chooses the color the bot has the highest count of in its hand.
 */
export function chooseBestColorForHand(hand?: UnoCard[] | null): UnoActiveColor {
  const cleanHand = Array.isArray(hand) ? hand : [];
  const counts: Record<UnoActiveColor, number> = {
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0,
  };

  for (const card of cleanHand) {
    if (card && card.color !== 'wild' && counts[card.color as UnoActiveColor] !== undefined) {
      counts[card.color as UnoActiveColor]++;
    }
  }

  let bestColor: UnoActiveColor = 'red';
  let maxCount = -1;

  for (const color of BASE_COLORS) {
    if (counts[color] > maxCount) {
      maxCount = counts[color];
      bestColor = color;
    }
  }

  return bestColor;
}

/**
 * Intelligent Bot AI for choosing moves in Uno.
 */
export function chooseBotMove(
  botHand?: UnoCard[] | null,
  activeCard?: UnoCard | null,
  activeColor?: UnoActiveColor | null,
  pendingDrawCount: number = 0,
  allowStacking: boolean = true
): { action: 'play'; card: UnoCard; chosenColor?: UnoActiveColor } | { action: 'draw' } {
  const cleanHand = Array.isArray(botHand) ? botHand : [];

  // Filter all playable cards
  const playableCards = cleanHand.filter((c) =>
    canPlayCard(c, activeCard, activeColor, pendingDrawCount, allowStacking)
  );

  if (playableCards.length === 0) {
    return { action: 'draw' };
  }

  // Stacking active: must play the matching stacking card
  if (pendingDrawCount > 0) {
    const stackCard = playableCards[0];
    const chosenColor =
      stackCard.color === 'wild' ? chooseBestColorForHand(cleanHand) : undefined;
    return { action: 'play', card: stackCard, chosenColor };
  }

  // Prioritize action cards (+2, Skip, Reverse) to disrupt opponents
  const actionCard = playableCards.find(
    (c) => c.value === 'draw2' || c.value === 'skip' || c.value === 'reverse'
  );
  if (actionCard) {
    return { action: 'play', card: actionCard };
  }

  // Then play standard number cards (prefer highest value to reduce penalty risk)
  const numberCards = playableCards
    .filter((c) => typeof c.value === 'number')
    .sort((a, b) => (b.value as number) - (a.value as number));

  if (numberCards.length > 0) {
    return { action: 'play', card: numberCards[0] };
  }

  // Finally play wild cards
  const wildCard = playableCards.find(
    (c) => c.value === 'wild' || c.value === 'wild4'
  );
  if (wildCard) {
    const chosenColor = chooseBestColorForHand(botHand);
    return { action: 'play', card: wildCard, chosenColor };
  }

  return { action: 'play', card: playableCards[0] };
}
