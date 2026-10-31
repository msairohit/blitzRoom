/**
 * Uno Game Component
 * Real-time multiplayer Uno with RTDB state synchronization, bot AI,
 * stacking penalties, Uno declarations, and high-fidelity visual cards.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated as RNAnimated,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import type { ActivityGameProps, ActivityResults } from '@/src/types/activity';
import type { Player } from '@/src/types/player';
import type {
  UnoActionLog,
  UnoActiveColor,
  UnoCard,
  UnoGameState,
  UnoPhase,
  UnoValue,
} from './types';
import {
  canPlayCard,
  chooseBestColorForHand,
  chooseBotMove,
  generateFullDeck,
  shuffleDeck,
} from './deck';
import { UnoCardView, UNO_COLOR_PALETTES } from './components/UnoCardView';
import { ColorPickerModal } from './components/ColorPickerModal';
import { UnoOpponentView } from './components/UnoOpponentView';
import { haptics } from '@/src/utils/haptics';
import { historyService } from '@/src/services/historyService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function toArray<T>(val: unknown): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'object') return Object.values(val).filter(Boolean) as T[];
  return [];
}

export function UnoGame({
  roomId,
  roomCode,
  currentPlayerId,
  isAdmin,
  players,
  settings,
  onActivityEnd,
  syncGameState,
  onGameState,
}: ActivityGameProps) {
  const { colors, spacing, radius, typography } = useTheme();

  // Oldest active human player acts as effective host if admin is absent or disconnected
  const isEffectiveAdmin = useMemo(() => {
    if (isAdmin) return true;
    const humanPlayers = players.filter((p) => !p.id.startsWith('bot_') && !p.isOffline);
    return humanPlayers.length > 0 && humanPlayers[0].id === currentPlayerId;
  }, [isAdmin, players, currentPlayerId]);

  // Settings
  const cardsPerPlayer = (settings.cardsPerPlayer as number) ?? 7;
  const allowStacking = (settings.allowStacking as boolean) ?? true;
  const timePerTurn = (settings.timePerTurn as number) ?? 20;
  const drawRule = (settings.drawRule as 'draw-to-play' | 'draw-until-match') ?? 'draw-to-play';
  const targetScore = (settings.targetScore as number) ?? 0;

  // Active players
  const activePlayers = useMemo(
    () => players.filter((p) => !p.isOffline),
    [players]
  );

  // Local Game State
  const [phase, setPhase] = useState<UnoPhase>('countdown');
  const [countdownVal, setCountdownVal] = useState(3);
  const [roundNumber, setRoundNumber] = useState(1);
  const [turnOrder, setTurnOrder] = useState<string[]>([]);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string>('');
  const [turnDirection, setTurnDirection] = useState<1 | -1>(1);
  const [activeCard, setActiveCard] = useState<UnoCard | null>(null);
  const [activeColor, setActiveColor] = useState<UnoActiveColor>('red');
  const [drawPile, setDrawPile] = useState<UnoCard[]>([]);
  const [discardPile, setDiscardPile] = useState<UnoCard[]>([]);
  const [hands, setHands] = useState<Record<string, UnoCard[]>>({});
  const [unoCallers, setUnoCallers] = useState<Record<string, boolean>>({});
  const [unoVulnerable, setUnoVulnerable] = useState<string | null>(null);
  const [pendingDrawCount, setPendingDrawCount] = useState<number>(0);
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState<boolean>(false);
  const [lastAction, setLastAction] = useState<UnoActionLog | null>(null);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(timePerTurn);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [roundScores, setRoundScores] = useState<Record<string, number>>({});

  // UI States
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [unoCelebrationText, setUnoCelebrationText] = useState<string | null>(null);

  // Animations & Refs
  const didInitRef = useRef(false);
  const lastAppliedKeyRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTurnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSavedHistory = useRef(false);
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const bannerAnim = useRef(new RNAnimated.Value(0)).current;

  // Mutable state ref for callbacks and timers to avoid closure stale state
  const stateRef = useRef<UnoGameState>({
    phase: 'countdown',
    roundNumber: 1,
    turnOrder: [],
    currentTurnPlayerId: '',
    turnDirection: 1,
    activeCard: { id: 'init', color: 'red', value: 0, score: 0 },
    activeColor: 'red',
    drawPile: [],
    discardPile: [],
    hands: {},
    unoCallers: {},
    unoVulnerable: null,
    pendingDrawCount: 0,
    hasDrawnThisTurn: false,
    lastAction: null,
    phaseTimeLeft: timePerTurn,
    winnerId: null,
    roundScores: {},
    syncTimestamp: Date.now(),
  });

  // Keep stateRef in sync with latest local state
  useEffect(() => {
    stateRef.current = {
      phase,
      roundNumber,
      turnOrder,
      currentTurnPlayerId,
      turnDirection,
      activeCard: activeCard || stateRef.current.activeCard,
      activeColor,
      drawPile,
      discardPile,
      hands,
      unoCallers,
      unoVulnerable,
      pendingDrawCount,
      hasDrawnThisTurn,
      lastAction,
      phaseTimeLeft: turnTimeLeft,
      winnerId,
      roundScores,
      syncTimestamp: Date.now(),
    };
  });

  const isMyTurn = currentTurnPlayerId === currentPlayerId;
  const myHand = hands[currentPlayerId] || [];

  // Continuous pulse animation for active turn or UNO button
  useEffect(() => {
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Push state to RTDB
  const pushSyncState = useCallback(
    (newState: Partial<UnoGameState>) => {
      if (!syncGameState) return;

      const current = stateRef.current;
      const nextVersion = (current.version || 0) + 1;
      const fullState: UnoGameState = {
        phase: newState.phase ?? current.phase,
        roundNumber: newState.roundNumber ?? current.roundNumber,
        turnOrder: newState.turnOrder ?? current.turnOrder,
        currentTurnPlayerId: newState.currentTurnPlayerId ?? current.currentTurnPlayerId,
        turnDirection: newState.turnDirection ?? current.turnDirection,
        activeCard: newState.activeCard ?? current.activeCard,
        activeColor: newState.activeColor ?? current.activeColor,
        drawPile: newState.drawPile ?? current.drawPile,
        discardPile: newState.discardPile ?? current.discardPile,
        hands: newState.hands ?? current.hands,
        unoCallers: newState.unoCallers ?? current.unoCallers,
        unoVulnerable: newState.unoVulnerable !== undefined ? newState.unoVulnerable : current.unoVulnerable,
        pendingDrawCount: newState.pendingDrawCount ?? current.pendingDrawCount,
        hasDrawnThisTurn: newState.hasDrawnThisTurn ?? current.hasDrawnThisTurn,
        lastAction: newState.lastAction !== undefined ? newState.lastAction : current.lastAction,
        phaseTimeLeft: newState.phaseTimeLeft ?? current.phaseTimeLeft,
        winnerId: newState.winnerId !== undefined ? newState.winnerId : current.winnerId,
        roundScores: newState.roundScores ?? current.roundScores,
        syncTimestamp: Date.now(),
        version: nextVersion,
      };

      // Keep stateRef immediately in sync so subsequent operations read latest state
      stateRef.current = fullState;

      // Track state key to prevent processing redundant echoes
      const stateKey = `${nextVersion}_${fullState.currentTurnPlayerId}_${fullState.activeCard?.id}_${fullState.discardPile?.length}_${fullState.lastAction?.id}`;
      lastAppliedKeyRef.current = stateKey;

      syncGameState(fullState as unknown as Record<string, unknown>);
    },
    [syncGameState]
  );

  // Helper: Next Player in Turn Order (with full fallback to active players)
  const getNextPlayerId = useCallback(
    (currentId: string, order: string[], direction: 1 | -1, skipCount = 1): string => {
      const activeIds = players.filter((p) => !p.isOffline).map((p) => p.id);
      let effectiveOrder = order.filter((id) => activeIds.includes(id));
      if (effectiveOrder.length < 2) {
        effectiveOrder = activeIds;
      }
      if (effectiveOrder.length === 0) return currentId;
      if (effectiveOrder.length === 1) return effectiveOrder[0];

      const currentIndex = effectiveOrder.indexOf(currentId);
      if (currentIndex === -1) {
        return effectiveOrder.find((id) => id !== currentId) || effectiveOrder[0];
      }

      const len = effectiveOrder.length;
      let nextIndex = (currentIndex + direction * skipCount) % len;
      if (nextIndex < 0) nextIndex += len;
      return effectiveOrder[nextIndex];
    },
    [players]
  );

  // Helper: Reshuffle discard pile into draw pile if draw pile runs low
  const ensureDrawPileCards = useCallback(
    (deck: unknown, discard: unknown, requiredCount: number): { draw: UnoCard[]; discard: UnoCard[] } => {
      const cleanDeck = toArray<UnoCard>(deck);
      const cleanDiscard = toArray<UnoCard>(discard);

      if (cleanDeck.length >= requiredCount) {
        return { draw: cleanDeck, discard: cleanDiscard };
      }

      // Keep top active card in discard pile, reshuffle the rest
      const topDiscard = cleanDiscard.length > 0 ? cleanDiscard[cleanDiscard.length - 1] : null;
      const cardsToReshuffle = cleanDiscard.slice(0, Math.max(0, cleanDiscard.length - 1));
      let recycledCards = shuffleDeck([...cleanDeck, ...cardsToReshuffle]);

      // If still fewer than required, generate fresh cards from a new deck so the game NEVER runs out of cards!
      if (recycledCards.length < requiredCount) {
        const freshDeck = shuffleDeck(generateFullDeck());
        recycledCards = [...recycledCards, ...freshDeck];
      }

      return {
        draw: recycledCards,
        discard: topDiscard ? [topDiscard] : [],
      };
    },
    []
  );

  // ==========================================
  // Deal & Initialize Round (Admin Only)
  // ==========================================
  const startNewRound = useCallback(
    (newRoundNum: number) => {
      if (!isEffectiveAdmin) return;

      const fullDeck = shuffleDeck(generateFullDeck());
      const allActive = players.filter((p) => !p.isOffline);
      const playerList = allActive.length >= 2 ? allActive : players;
      const shuffledTurnOrder = shuffleDeck(playerList.map((p) => p.id));

      // Deal hands
      const dealtHands: Record<string, UnoCard[]> = {};
      let deckPointer = 0;

      for (const pId of shuffledTurnOrder) {
        dealtHands[pId] = fullDeck.slice(deckPointer, deckPointer + cardsPerPlayer);
        deckPointer += cardsPerPlayer;
      }

      // Flip first non-wild card for discard pile
      let startCardIdx = deckPointer;
      while (
        startCardIdx < fullDeck.length &&
        (fullDeck[startCardIdx].color === 'wild' || fullDeck[startCardIdx].value === 'wild4')
      ) {
        startCardIdx++;
      }

      const startingCard: UnoCard =
        startCardIdx < fullDeck.length
          ? fullDeck[startCardIdx]
          : { id: 'c_red_1_start', color: 'red', value: 1 as UnoValue, score: 1 };

      const remainingDeck = [
        ...fullDeck.slice(deckPointer, startCardIdx),
        ...fullDeck.slice(startCardIdx + 1),
      ];

      const initialActiveColor: UnoActiveColor =
        startingCard.color === 'wild' ? 'red' : (startingCard.color as UnoActiveColor);

      const firstPlayer = shuffledTurnOrder[0];

      const initialAction: UnoActionLog = {
        id: `act_${Date.now()}`,
        playerId: 'system',
        playerName: 'Dealer',
        type: 'play',
        card: startingCard,
        description: `Game started with ${startingCard.color.toUpperCase()} ${startingCard.value}`,
        timestamp: Date.now(),
      };

      // Apply locally
      setPhase('countdown');
      setCountdownVal(3);
      setRoundNumber(newRoundNum);
      setTurnOrder(shuffledTurnOrder);
      setCurrentTurnPlayerId(firstPlayer);
      setTurnDirection(1);
      setActiveCard(startingCard);
      setActiveColor(initialActiveColor);
      setDrawPile(remainingDeck);
      setDiscardPile([startingCard]);
      setHands(dealtHands);
      setUnoCallers({});
      setUnoVulnerable(null);
      setPendingDrawCount(0);
      setHasDrawnThisTurn(false);
      setLastAction(initialAction);
      setTurnTimeLeft(timePerTurn);
      setWinnerId(null);

      pushSyncState({
        phase: 'countdown',
        roundNumber: newRoundNum,
        turnOrder: shuffledTurnOrder,
        currentTurnPlayerId: firstPlayer,
        turnDirection: 1,
        activeCard: startingCard,
        activeColor: initialActiveColor,
        drawPile: remainingDeck,
        discardPile: [startingCard],
        hands: dealtHands,
        unoCallers: {},
        unoVulnerable: null,
        pendingDrawCount: 0,
        hasDrawnThisTurn: false,
        lastAction: initialAction,
        phaseTimeLeft: timePerTurn,
        winnerId: null,
      });
    },
    [isAdmin, activePlayers, players, cardsPerPlayer, timePerTurn, pushSyncState]
  );

  // Initialize once on mount (only when players list has populated)
  useEffect(() => {
    if (didInitRef.current || !isAdmin) return;
    if (players.length < 2) return;
    didInitRef.current = true;
    startNewRound(1);
  }, [isAdmin, players, startNewRound]);

  // Subscribe to RTDB game state
  useEffect(() => {
    if (!onGameState) return;

    const unsubscribe = onGameState((raw) => {
      const incoming = raw as unknown as UnoGameState;
      if (!incoming || !incoming.phase) return;

      const stateKey = `${incoming.version ?? 0}_${incoming.currentTurnPlayerId}_${incoming.activeCard?.id}_${incoming.discardPile?.length}_${incoming.lastAction?.id}`;
      if (stateKey === lastAppliedKeyRef.current) return;
      lastAppliedKeyRef.current = stateKey;

      didInitRef.current = true;

      const cleanHands: Record<string, UnoCard[]> = {};
      if (incoming.hands && typeof incoming.hands === 'object') {
        for (const [pId, h] of Object.entries(incoming.hands)) {
          cleanHands[pId] = toArray<UnoCard>(h);
        }
      }

      const cleanDrawPile = toArray<UnoCard>(incoming.drawPile);
      const cleanDiscardPile = toArray<UnoCard>(incoming.discardPile);
      const cleanTurnOrder = toArray<string>(incoming.turnOrder);

      // Immediately synchronize mutable state ref
      stateRef.current = {
        ...stateRef.current,
        ...incoming,
        hands: cleanHands,
        drawPile: cleanDrawPile,
        discardPile: cleanDiscardPile,
        turnOrder: cleanTurnOrder,
      };

      setPhase(incoming.phase);
      setRoundNumber(incoming.roundNumber);
      setTurnOrder(cleanTurnOrder);
      setCurrentTurnPlayerId(incoming.currentTurnPlayerId);
      setTurnDirection(incoming.turnDirection || 1);
      if (incoming.activeCard) setActiveCard(incoming.activeCard);
      if (incoming.activeColor) setActiveColor(incoming.activeColor);
      setDrawPile(cleanDrawPile);
      setDiscardPile(cleanDiscardPile);
      setHands(cleanHands);
      setUnoCallers(incoming.unoCallers || {});
      setUnoVulnerable(incoming.unoVulnerable || null);
      setPendingDrawCount(incoming.pendingDrawCount || 0);
      setHasDrawnThisTurn(incoming.hasDrawnThisTurn || false);
      setLastAction(incoming.lastAction || null);
      setTurnTimeLeft(incoming.phaseTimeLeft);
      setWinnerId(incoming.winnerId || null);
      setRoundScores(incoming.roundScores || {});

      // Haptic feedback when it becomes current player's turn
      if (
        incoming.currentTurnPlayerId === currentPlayerId &&
        incoming.phase === 'playing'
      ) {
        haptics.heavy();
      }
    });

    return () => unsubscribe();
  }, [onGameState, currentPlayerId]);

  // Safety guard: ensure currentTurnPlayerId is always a valid active player
  useEffect(() => {
    if (phase !== 'playing') return;
    const activeIds = players.filter((p) => !p.isOffline).map((p) => p.id);
    if (activeIds.length > 0 && (!currentTurnPlayerId || !activeIds.includes(currentTurnPlayerId))) {
      const fallbackId = activeIds[0];
      setCurrentTurnPlayerId(fallbackId);
      if (isEffectiveAdmin) {
        pushSyncState({ currentTurnPlayerId: fallbackId });
      }
    }
  }, [phase, currentTurnPlayerId, players, isEffectiveAdmin, pushSyncState]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'countdown') return;

    const interval = setInterval(() => {
      setCountdownVal((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isAdmin) {
            setPhase('playing');
            pushSyncState({ phase: 'playing', phaseTimeLeft: timePerTurn });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, isAdmin, timePerTurn, pushSyncState]);

  // Helper: Detect whether a player ID is a simulated bot
  const isBotPlayer = useCallback(
    (id: string): boolean => {
      if (!id) return false;
      if (id.startsWith('bot_')) return true;
      const p = players.find((pl) => pl.id === id);
      return (
        !!p &&
        (p.displayName.toLowerCase().includes('bot') ||
          p.displayName.includes('🤖') ||
          p.displayName.includes('🦊'))
      );
    },
    [players]
  );

  // ==========================================
  // Execute Card Play Logic
  // ==========================================
  const executePlayCard = useCallback(
    (
      playerId: string,
      card: UnoCard,
      chosenWildColor?: UnoActiveColor,
      playerCalledUno = false
    ) => {
      const current = stateRef.current;
      const playerHand = current.hands[playerId] || [];
      const playerName =
        players.find((p) => p.id === playerId)?.displayName || 'Player';

      // 1. Remove card from player hand
      let cardIndex = playerHand.findIndex((c) => c.id === card.id);
      if (cardIndex === -1) {
        // Fallback: match by color and value if ID differed
        cardIndex = playerHand.findIndex(
          (c) => c.color === card.color && c.value === card.value
        );
      }

      if (cardIndex === -1) {
        // If card genuinely wasn't found in hand, advance turn to prevent hanging
        console.warn(`[UnoGame] Card not found in player hand for ${playerId}, advancing turn.`);
        const nextPlayerId = getNextPlayerId(playerId, current.turnOrder, current.turnDirection, 1);
        setCurrentTurnPlayerId(nextPlayerId);
        pushSyncState({ currentTurnPlayerId: nextPlayerId });
        return;
      }

      const newHand = [
        ...playerHand.slice(0, cardIndex),
        ...playerHand.slice(cardIndex + 1),
      ];
      const updatedHands = {
        ...current.hands,
        [playerId]: newHand,
      };

      // 2. New active color
      let nextActiveColor: UnoActiveColor = current.activeColor;
      if (card.color === 'wild' || card.value === 'wild' || card.value === 'wild4') {
        nextActiveColor = chosenWildColor || 'red';
      } else {
        nextActiveColor = card.color as UnoActiveColor;
      }

      // 3. New discard pile
      const updatedDiscardPile = [...current.discardPile, card];

      // 4. UNO tracking
      const updatedUnoCallers = { ...current.unoCallers };
      let updatedUnoVulnerable = current.unoVulnerable;

      if (newHand.length === 1) {
        if (playerCalledUno) {
          updatedUnoCallers[playerId] = true;
          updatedUnoVulnerable = null;
          showCelebration(`${playerName} called UNO! 🔥`);
        } else {
          updatedUnoCallers[playerId] = false;
          updatedUnoVulnerable = playerId;
        }
      } else {
        delete updatedUnoCallers[playerId];
        if (updatedUnoVulnerable === playerId) {
          updatedUnoVulnerable = null;
        }
      }

      // 5. Win Check
      if (newHand.length === 0) {
        haptics.success();
        // Calculate points
        let roundPoints = 0;
        for (const [pId, h] of Object.entries(updatedHands)) {
          if (pId !== playerId) {
            for (const c of h) {
              roundPoints += c.score;
            }
          }
        }

        const newScores = {
          ...current.roundScores,
          [playerId]: (current.roundScores[playerId] || 0) + roundPoints,
        };

        const isGameOver =
          targetScore > 0
            ? newScores[playerId] >= targetScore
            : true; // Single round blitz finishes immediately

        const winAction: UnoActionLog = {
          id: `act_${Date.now()}`,
          playerId,
          playerName,
          type: 'play',
          card,
          description: `🏆 ${playerName} won the round with ${roundPoints} points!`,
          timestamp: Date.now(),
        };

        setWinnerId(playerId);
        setRoundScores(newScores);
        setHands(updatedHands);
        setDiscardPile(updatedDiscardPile);
        setActiveCard(card);
        setActiveColor(nextActiveColor);
        setPhase(isGameOver ? 'game_over' : 'round_over');
        setLastAction(winAction);

        pushSyncState({
          phase: isGameOver ? 'game_over' : 'round_over',
          winnerId: playerId,
          roundScores: newScores,
          hands: updatedHands,
          discardPile: updatedDiscardPile,
          activeCard: card,
          activeColor: nextActiveColor,
          lastAction: winAction,
        });

        // Record history
        if (!hasSavedHistory.current) {
          hasSavedHistory.current = true;
          historyService
            .saveGameHistory({
              activityType: 'uno',
              roomCode,
              score: newScores[currentPlayerId] || 0,
              rank: playerId === currentPlayerId ? 1 : 2,
              totalPlayers: players.length,
            })
            .catch(() => {});
        }
        return;
      }

      // 6. Handle Card Action Effects & Turn Progression
      let nextDirection = current.turnDirection;
      let skipSteps = 1;
      let nextPendingDraw = 0;
      let nextDrawPile = current.drawPile;
      let nextDiscardPile = updatedDiscardPile;

      const activeIds = players.filter((p) => !p.isOffline).map((p) => p.id);
      const isTwoPlayer = current.turnOrder.length === 2 || activeIds.length === 2;

      if (card.value === 'reverse') {
        if (isTwoPlayer) {
          // In 2 players, reverse passes turn to the other player
          skipSteps = 1;
        } else {
          nextDirection = (current.turnDirection * -1) as 1 | -1;
          skipSteps = 1;
        }
      } else if (card.value === 'skip') {
        // Skip jumps over next player (in 2 players: skips opponent so you play again)
        skipSteps = 2;
      } else if (card.value === 'draw2') {
        if (allowStacking) {
          nextPendingDraw = current.pendingDrawCount + 2;
          skipSteps = 1;
        } else {
          const targetPlayerId = getNextPlayerId(playerId, current.turnOrder, nextDirection, 1);
          const { draw: updatedDeck, discard: cleanDiscard } = ensureDrawPileCards(
            current.drawPile,
            updatedDiscardPile,
            2
          );
          const drawnCards = updatedDeck.slice(0, 2);
          nextDrawPile = updatedDeck.slice(2);
          nextDiscardPile = cleanDiscard;

          updatedHands[targetPlayerId] = [
            ...(updatedHands[targetPlayerId] || []),
            ...drawnCards,
          ];
          skipSteps = isTwoPlayer ? 1 : 2;
        }
      } else if (card.value === 'wild4') {
        if (allowStacking) {
          nextPendingDraw = current.pendingDrawCount + 4;
          skipSteps = 1;
        } else {
          const targetPlayerId = getNextPlayerId(playerId, current.turnOrder, nextDirection, 1);
          const { draw: updatedDeck, discard: cleanDiscard } = ensureDrawPileCards(
            current.drawPile,
            updatedDiscardPile,
            4
          );
          const drawnCards = updatedDeck.slice(0, 4);
          nextDrawPile = updatedDeck.slice(4);
          nextDiscardPile = cleanDiscard;

          updatedHands[targetPlayerId] = [
            ...(updatedHands[targetPlayerId] || []),
            ...drawnCards,
          ];
          skipSteps = isTwoPlayer ? 1 : 2;
        }
      }

      const nextPlayerId = getNextPlayerId(
        playerId,
        current.turnOrder,
        nextDirection,
        skipSteps
      );

      // Action log description
      let actionDesc = `${playerName} played ${card.color.toUpperCase()} ${card.value}`;
      if (card.color === 'wild') {
        actionDesc = `${playerName} played WILD → ${nextActiveColor.toUpperCase()}`;
      } else if (card.value === 'skip') {
        actionDesc = isTwoPlayer
          ? `${playerName} played SKIP! Opponent skipped, ${playerName} goes again! 🚫`
          : `${playerName} skipped next turn! 🚫`;
      } else if (card.value === 'reverse') {
        actionDesc = `${playerName} reversed direction! 🔄`;
      } else if (card.value === 'draw2') {
        actionDesc = allowStacking
          ? `${playerName} played +2 (Stack: ${nextPendingDraw})!`
          : `${playerName} gave +2 cards!`;
      } else if (card.value === 'wild4') {
        actionDesc = allowStacking
          ? `${playerName} played WILD +4 (Stack: ${nextPendingDraw}) → ${nextActiveColor.toUpperCase()}!`
          : `${playerName} gave WILD +4 → ${nextActiveColor.toUpperCase()}!`;
      }

      const actionLog: UnoActionLog = {
        id: `act_${Date.now()}`,
        playerId,
        playerName,
        type: 'play',
        card,
        chosenColor: nextActiveColor,
        description: actionDesc,
        timestamp: Date.now(),
      };

      // Update State
      setHands(updatedHands);
      setActiveCard(card);
      setActiveColor(nextActiveColor);
      setDiscardPile(nextDiscardPile);
      setDrawPile(nextDrawPile);
      setTurnDirection(nextDirection);
      setCurrentTurnPlayerId(nextPlayerId);
      setPendingDrawCount(nextPendingDraw);
      setUnoCallers(updatedUnoCallers);
      setUnoVulnerable(updatedUnoVulnerable);
      setHasDrawnThisTurn(false);
      setTurnTimeLeft(timePerTurn);
      setLastAction(actionLog);

      pushSyncState({
        hands: updatedHands,
        activeCard: card,
        activeColor: nextActiveColor,
        discardPile: nextDiscardPile,
        drawPile: nextDrawPile,
        turnDirection: nextDirection,
        currentTurnPlayerId: nextPlayerId,
        pendingDrawCount: nextPendingDraw,
        unoCallers: updatedUnoCallers,
        unoVulnerable: updatedUnoVulnerable,
        hasDrawnThisTurn: false,
        phaseTimeLeft: timePerTurn,
        lastAction: actionLog,
      });
    },
    [
      players,
      targetScore,
      currentPlayerId,
      roomCode,
      allowStacking,
      timePerTurn,
      getNextPlayerId,
      ensureDrawPileCards,
      pushSyncState,
    ]
  );

  // ==========================================
  // Execute Card Draw Logic (Player or Stack Penalty)
  // ==========================================
  const executeDrawCard = useCallback(
    (playerId: string) => {
      const current = stateRef.current;
      const playerName =
        players.find((p) => p.id === playerId)?.displayName || 'Player';

      // 1. Pending stacked draw penalty (+2/+4)
      if (current.pendingDrawCount > 0) {
        const countToDraw = current.pendingDrawCount;
        const { draw: updatedDeck, discard: cleanDiscard } = ensureDrawPileCards(
          current.drawPile,
          current.discardPile,
          countToDraw
        );

        const drawnCards = updatedDeck.slice(0, countToDraw);
        const remainingDeck = updatedDeck.slice(countToDraw);

        const updatedHands = {
          ...current.hands,
          [playerId]: [...(current.hands[playerId] || []), ...drawnCards],
        };

        const nextPlayerId = getNextPlayerId(
          playerId,
          current.turnOrder,
          current.turnDirection,
          1
        );

        const actionLog: UnoActionLog = {
          id: `act_${Date.now()}`,
          playerId,
          playerName,
          type: 'draw',
          description: `${playerName} drew ${countToDraw} penalty cards!`,
          timestamp: Date.now(),
        };

        setHands(updatedHands);
        setDrawPile(remainingDeck);
        setDiscardPile(cleanDiscard);
        setPendingDrawCount(0);
        setCurrentTurnPlayerId(nextPlayerId);
        setHasDrawnThisTurn(false);
        setTurnTimeLeft(timePerTurn);
        setLastAction(actionLog);

        pushSyncState({
          hands: updatedHands,
          drawPile: remainingDeck,
          discardPile: cleanDiscard,
          pendingDrawCount: 0,
          currentTurnPlayerId: nextPlayerId,
          hasDrawnThisTurn: false,
          phaseTimeLeft: timePerTurn,
          lastAction: actionLog,
        });
        return;
      }

      // 2. Standard Draw (1 card)
      const { draw: updatedDeck, discard: cleanDiscard } = ensureDrawPileCards(
        current.drawPile,
        current.discardPile,
        1
      );

      if (updatedDeck.length === 0) return;

      const drawnCard = updatedDeck[0];
      const remainingDeck = updatedDeck.slice(1);

      const updatedHands = {
        ...current.hands,
        [playerId]: [...(current.hands[playerId] || []), drawnCard],
      };

      const isPlayable = canPlayCard(
        drawnCard,
        current.activeCard,
        current.activeColor,
        0,
        allowStacking
      );

      // If it's a bot, bot immediately plays drawn card if playable, or passes
      if (isBotPlayer(playerId)) {
        if (isPlayable) {
          stateRef.current = {
            ...current,
            hands: updatedHands,
            drawPile: remainingDeck,
            discardPile: cleanDiscard,
          };
          setHands(updatedHands);
          setDrawPile(remainingDeck);
          setDiscardPile(cleanDiscard);

          const chosenColor =
            drawnCard.color === 'wild'
              ? chooseBestColorForHand(updatedHands[playerId])
              : undefined;
          executePlayCard(playerId, drawnCard, chosenColor);
          return;
        } else {
          const nextPlayerId = getNextPlayerId(
            playerId,
            current.turnOrder,
            current.turnDirection,
            1
          );

          const actionLog: UnoActionLog = {
            id: `act_${Date.now()}`,
            playerId,
            playerName,
            type: 'draw',
            description: `${playerName} drew a card and passed.`,
            timestamp: Date.now(),
          };

          setHands(updatedHands);
          setDrawPile(remainingDeck);
          setDiscardPile(cleanDiscard);
          setCurrentTurnPlayerId(nextPlayerId);
          setHasDrawnThisTurn(false);
          setTurnTimeLeft(timePerTurn);
          setLastAction(actionLog);

          pushSyncState({
            hands: updatedHands,
            drawPile: remainingDeck,
            discardPile: cleanDiscard,
            currentTurnPlayerId: nextPlayerId,
            hasDrawnThisTurn: false,
            phaseTimeLeft: timePerTurn,
            lastAction: actionLog,
          });
          return;
        }
      }

      // Human player: If card is not playable, auto advance turn
      if (!isPlayable) {
        const nextPlayerId = getNextPlayerId(
          playerId,
          current.turnOrder,
          current.turnDirection,
          1
        );

        const actionLog: UnoActionLog = {
          id: `act_${Date.now()}`,
          playerId,
          playerName,
          type: 'draw',
          description: `${playerName} drew a card and passed.`,
          timestamp: Date.now(),
        };

        setHands(updatedHands);
        setDrawPile(remainingDeck);
        setDiscardPile(cleanDiscard);
        setCurrentTurnPlayerId(nextPlayerId);
        setHasDrawnThisTurn(false);
        setTurnTimeLeft(timePerTurn);
        setLastAction(actionLog);

        pushSyncState({
          hands: updatedHands,
          drawPile: remainingDeck,
          discardPile: cleanDiscard,
          currentTurnPlayerId: nextPlayerId,
          hasDrawnThisTurn: false,
          phaseTimeLeft: timePerTurn,
          lastAction: actionLog,
        });
      } else {
        // Drawn card is playable! Give human player chance to play it or pass
        const actionLog: UnoActionLog = {
          id: `act_${Date.now()}`,
          playerId,
          playerName,
          type: 'draw',
          description: `${playerName} drew a playable card!`,
          timestamp: Date.now(),
        };

        setHands(updatedHands);
        setDrawPile(remainingDeck);
        setDiscardPile(cleanDiscard);
        setHasDrawnThisTurn(true);
        setLastAction(actionLog);

        pushSyncState({
          hands: updatedHands,
          drawPile: remainingDeck,
          discardPile: cleanDiscard,
          currentTurnPlayerId: playerId,
          hasDrawnThisTurn: true,
          lastAction: actionLog,
        });
      }
    },
    [
      players,
      timePerTurn,
      allowStacking,
      isBotPlayer,
      getNextPlayerId,
      ensureDrawPileCards,
      executePlayCard,
      pushSyncState,
    ]
  );

  // ==========================================
  // Bot Turn Automation Logic
  // ==========================================
  const executeBotTurn = useCallback(
    (botId: string) => {
      const current = stateRef.current;
      if (current.phase !== 'playing' || current.currentTurnPlayerId !== botId) return;

      const botHand = toArray<UnoCard>(current.hands[botId]);
      const currentActiveCard = current.activeCard || {
        id: 'c_red_1_fallback',
        color: 'red',
        value: 1 as UnoValue,
        score: 1,
      };
      const currentActiveColor = current.activeColor || 'red';
      const currentPendingDraw = current.pendingDrawCount || 0;

      // 1. If there's an active stacking penalty (+2 or +4)
      if (currentPendingDraw > 0) {
        const matchingStackCard = botHand.find((c) =>
          canPlayCard(c, currentActiveCard, currentActiveColor, currentPendingDraw, allowStacking)
        );

        if (matchingStackCard) {
          const chosenColor =
            matchingStackCard.color === 'wild'
              ? chooseBestColorForHand(botHand)
              : undefined;
          const willHaveOneCard = botHand.length === 2;
          executePlayCard(botId, matchingStackCard, chosenColor, willHaveOneCard);
          return;
        } else {
          // Cannot counter stack: must draw penalty cards
          executeDrawCard(botId);
          return;
        }
      }

      // 2. Normal move decision
      const move = chooseBotMove(
        botHand,
        currentActiveCard,
        currentActiveColor,
        0,
        allowStacking
      );

      if (move.action === 'play') {
        const willHaveOneCard = botHand.length === 2;
        const botCallsUno = willHaveOneCard && Math.random() < 0.95;
        executePlayCard(botId, move.card, move.chosenColor, botCallsUno);
      } else {
        // Bot must draw
        const { draw: updatedDeck, discard: cleanDiscard } = ensureDrawPileCards(
          current.drawPile,
          current.discardPile,
          1
        );

        if (updatedDeck.length === 0) return;

        const drawnCard = updatedDeck[0];
        const remainingDeck = updatedDeck.slice(1);
        const updatedHand = [...botHand, drawnCard];
        const updatedHands = {
          ...current.hands,
          [botId]: updatedHand,
        };

        const isPlayable = canPlayCard(
          drawnCard,
          currentActiveCard,
          currentActiveColor,
          0,
          allowStacking
        );

        if (isPlayable) {
          // Immediately play drawn card!
          stateRef.current = {
            ...current,
            hands: updatedHands,
            drawPile: remainingDeck,
            discardPile: cleanDiscard,
          };
          setHands(updatedHands);
          setDrawPile(remainingDeck);
          setDiscardPile(cleanDiscard);

          const chosenColor =
            drawnCard.color === 'wild'
              ? chooseBestColorForHand(updatedHand)
              : undefined;
          executePlayCard(botId, drawnCard, chosenColor, false);
        } else {
          // Unplayable, pass turn to next player
          const nextPlayerId = getNextPlayerId(
            botId,
            current.turnOrder,
            current.turnDirection,
            1
          );

          const botName =
            players.find((p) => p.id === botId)?.displayName || 'Bot';
          const actionLog: UnoActionLog = {
            id: `act_${Date.now()}`,
            playerId: botId,
            playerName: botName,
            type: 'draw',
            description: `${botName} drew a card and passed.`,
            timestamp: Date.now(),
          };

          setHands(updatedHands);
          setDrawPile(remainingDeck);
          setDiscardPile(cleanDiscard);
          setCurrentTurnPlayerId(nextPlayerId);
          setHasDrawnThisTurn(false);
          setTurnTimeLeft(timePerTurn);
          setLastAction(actionLog);

          pushSyncState({
            hands: updatedHands,
            drawPile: remainingDeck,
            discardPile: cleanDiscard,
            currentTurnPlayerId: nextPlayerId,
            hasDrawnThisTurn: false,
            phaseTimeLeft: timePerTurn,
            lastAction: actionLog,
          });
        }
      }
    },
    [
      allowStacking,
      ensureDrawPileCards,
      executePlayCard,
      executeDrawCard,
      getNextPlayerId,
      players,
      pushSyncState,
      timePerTurn,
    ]
  );

  // ==========================================
  // Timeout Auto Play (when timer runs out)
  // ==========================================
  const handleTimeoutAutoPlay = useCallback(() => {
    const current = stateRef.current;
    const timeoutPlayerId = current.currentTurnPlayerId;
    if (!timeoutPlayerId || current.phase !== 'playing') return;

    const playerName =
      players.find((p) => p.id === timeoutPlayerId)?.displayName || 'Player';
    const nextPlayerId = getNextPlayerId(
      timeoutPlayerId,
      current.turnOrder,
      current.turnDirection,
      1
    );

    // If already drew a card earlier this turn, simply pass turn
    if (current.hasDrawnThisTurn) {
      const actionLog: UnoActionLog = {
        id: `act_${Date.now()}`,
        playerId: timeoutPlayerId,
        playerName,
        type: 'timeout',
        description: `⏰ Time expired! ${playerName}'s turn passed.`,
        timestamp: Date.now(),
      };

      setCurrentTurnPlayerId(nextPlayerId);
      setHasDrawnThisTurn(false);
      setTurnTimeLeft(timePerTurn);
      setLastAction(actionLog);

      pushSyncState({
        currentTurnPlayerId: nextPlayerId,
        hasDrawnThisTurn: false,
        phaseTimeLeft: timePerTurn,
        lastAction: actionLog,
      });
      return;
    }

    // Otherwise, draw cards as timeout penalty (stacked cards if pending, else 1 card)
    const countToDraw = current.pendingDrawCount > 0 ? current.pendingDrawCount : 1;
    const { draw: updatedDeck, discard: cleanDiscard } = ensureDrawPileCards(
      current.drawPile,
      current.discardPile,
      countToDraw
    );

    const drawnCards = updatedDeck.slice(0, countToDraw);
    const remainingDeck = updatedDeck.slice(countToDraw);

    const updatedHands = {
      ...current.hands,
      [timeoutPlayerId]: [...(current.hands[timeoutPlayerId] || []), ...drawnCards],
    };

    const actionLog: UnoActionLog = {
      id: `act_${Date.now()}`,
      playerId: timeoutPlayerId,
      playerName,
      type: 'timeout',
      description: `⏰ Time expired! ${playerName} drew ${countToDraw} card${countToDraw > 1 ? 's' : ''} and lost turn.`,
      timestamp: Date.now(),
    };

    setHands(updatedHands);
    setDrawPile(remainingDeck);
    setDiscardPile(cleanDiscard);
    setPendingDrawCount(0);
    setCurrentTurnPlayerId(nextPlayerId);
    setHasDrawnThisTurn(false);
    setTurnTimeLeft(timePerTurn);
    setLastAction(actionLog);

    pushSyncState({
      hands: updatedHands,
      drawPile: remainingDeck,
      discardPile: cleanDiscard,
      pendingDrawCount: 0,
      currentTurnPlayerId: nextPlayerId,
      hasDrawnThisTurn: false,
      phaseTimeLeft: timePerTurn,
      lastAction: actionLog,
    });
  }, [
    ensureDrawPileCards,
    getNextPlayerId,
    players,
    pushSyncState,
    timePerTurn,
  ]);

  // Pass Turn (when player drew a playable card but opts not to play)
  const handlePassTurn = useCallback(() => {
    if (!isMyTurn || !hasDrawnThisTurn) return;

    haptics.light();
    const current = stateRef.current;
    const playerName =
      players.find((p) => p.id === currentPlayerId)?.displayName || 'Player';

    const nextPlayerId = getNextPlayerId(
      currentPlayerId,
      current.turnOrder,
      current.turnDirection,
      1
    );

    const actionLog: UnoActionLog = {
      id: `act_${Date.now()}`,
      playerId: currentPlayerId,
      playerName,
      type: 'pass',
      description: `${playerName} passed their turn.`,
      timestamp: Date.now(),
    };

    setCurrentTurnPlayerId(nextPlayerId);
    setHasDrawnThisTurn(false);
    setTurnTimeLeft(timePerTurn);
    setLastAction(actionLog);

    pushSyncState({
      currentTurnPlayerId: nextPlayerId,
      hasDrawnThisTurn: false,
      phaseTimeLeft: timePerTurn,
      lastAction: actionLog,
    });
  }, [
    isMyTurn,
    hasDrawnThisTurn,
    currentPlayerId,
    players,
    timePerTurn,
    getNextPlayerId,
    pushSyncState,
  ]);

  // Turn Countdown Timer & Auto-Pass
  useEffect(() => {
    if (phase !== 'playing' || timePerTurn <= 0) return;

    if (timerRef.current) clearInterval(timerRef.current);

    let secondsRemaining = timePerTurn;
    setTurnTimeLeft(timePerTurn);
    let timeoutHandled = false;

    timerRef.current = setInterval(() => {
      secondsRemaining -= 1;
      setTurnTimeLeft(Math.max(0, secondsRemaining));

      // Timeout execution
      if (secondsRemaining <= 0 && !timeoutHandled) {
        const isMyTurn = currentTurnPlayerId === currentPlayerId;

        // Current human player handles own timeout; effective admin handles bot or other player timeouts
        if (isMyTurn || isEffectiveAdmin) {
          timeoutHandled = true;
          handleTimeoutAutoPlay();
        } else if (secondsRemaining <= -2) {
          // Fail-safe: if host dropped or is lagging, any active client executes after 2s grace
          timeoutHandled = true;
          handleTimeoutAutoPlay();
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [
    phase,
    timePerTurn,
    currentTurnPlayerId,
    currentPlayerId,
    isEffectiveAdmin,
    handleTimeoutAutoPlay,
  ]);

  // Bot Turn Automation (Host primary, guest fallback)
  useEffect(() => {
    if (phase !== 'playing') return;

    if (!isBotPlayer(currentTurnPlayerId)) return;

    if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);

    if (isEffectiveAdmin) {
      const delay = Math.floor(Math.random() * 400) + 1000; // 1.0s to 1.4s
      botTurnTimeoutRef.current = setTimeout(() => {
        try {
          executeBotTurn(currentTurnPlayerId);
        } catch (e) {
          console.error('[UnoGame] Error in executeBotTurn, advancing:', e);
          handleTimeoutAutoPlay();
        }
      }, delay);
    } else {
      // Backup driver for guests: If host didn't make bot play within 3.2 seconds, guest steps in
      const backupDelay = 3200;
      botTurnTimeoutRef.current = setTimeout(() => {
        if (stateRef.current.phase === 'playing' && isBotPlayer(stateRef.current.currentTurnPlayerId)) {
          console.warn('[UnoGame] Guest taking over stalled bot turn for:', currentTurnPlayerId);
          try {
            executeBotTurn(currentTurnPlayerId);
          } catch (e) {
            console.error('[UnoGame] Error in guest executeBotTurn:', e);
            handleTimeoutAutoPlay();
          }
        }
      }, backupDelay);
    }

    return () => {
      if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);
    };
  }, [
    phase,
    currentTurnPlayerId,
    isEffectiveAdmin,
    isBotPlayer,
    executeBotTurn,
    handleTimeoutAutoPlay,
  ]);

  // Player clicks card from their hand
  const handleTapCard = (card: UnoCard) => {
    if (!isMyTurn || phase !== 'playing') return;

    const current = stateRef.current;
    const isPlayable = canPlayCard(
      card,
      current.activeCard,
      current.activeColor,
      current.pendingDrawCount,
      allowStacking
    );

    if (!isPlayable) {
      haptics.error();
      return;
    }

    haptics.medium();

    // Check if it's Wild or Wild 4
    if (card.color === 'wild' || card.value === 'wild' || card.value === 'wild4') {
      setPendingWildCard(card);
      setShowColorPicker(true);
      return;
    }

    // Play standard card
    executePlayCard(
      currentPlayerId,
      card,
      undefined,
      unoCallers[currentPlayerId] || false
    );
  };

  // Wild color selected from modal
  const handleSelectWildColor = (selectedColor: UnoActiveColor) => {
    setShowColorPicker(false);
    if (!pendingWildCard) return;

    executePlayCard(
      currentPlayerId,
      pendingWildCard,
      selectedColor,
      unoCallers[currentPlayerId] || false
    );
    setPendingWildCard(null);
  };

  // Shout UNO!
  const handleShoutUno = () => {
    haptics.heavy();
    const current = stateRef.current;
    const playerName =
      players.find((p) => p.id === currentPlayerId)?.displayName || 'Player';

    showCelebration('YOU CALLED UNO! ⚡');

    const updatedUnoCallers = {
      ...current.unoCallers,
      [currentPlayerId]: true,
    };

    setUnoCallers(updatedUnoCallers);
    setUnoVulnerable(null);

    const actionLog: UnoActionLog = {
      id: `act_${Date.now()}`,
      playerId: currentPlayerId,
      playerName,
      type: 'uno',
      description: `⚡ ${playerName} yelled UNO!`,
      timestamp: Date.now(),
    };

    setLastAction(actionLog);

    pushSyncState({
      unoCallers: updatedUnoCallers,
      unoVulnerable: null,
      lastAction: actionLog,
    });
  };

  // Catch someone who failed to call Uno
  const handleCatchUno = (targetPlayerId: string) => {
    haptics.heavy();
    const current = stateRef.current;
    const catcherName =
      players.find((p) => p.id === currentPlayerId)?.displayName || 'Player';
    const targetName =
      players.find((p) => p.id === targetPlayerId)?.displayName || 'Player';

    // Target draws 2 penalty cards
    const { draw: updatedDeck, discard: cleanDiscard } = ensureDrawPileCards(
      current.drawPile,
      current.discardPile,
      2
    );

    const drawnCards = updatedDeck.slice(0, 2);
    const remainingDeck = updatedDeck.slice(2);

    const updatedHands = {
      ...current.hands,
      [targetPlayerId]: [
        ...(current.hands[targetPlayerId] || []),
        ...drawnCards,
      ],
    };

    showCelebration(`🚨 ${targetName} was caught by ${catcherName}! +2 Cards`);

    const actionLog: UnoActionLog = {
      id: `act_${Date.now()}`,
      playerId: currentPlayerId,
      playerName: catcherName,
      type: 'catch_uno',
      description: `🚨 ${targetName} caught without calling UNO! Draws 2 cards.`,
      timestamp: Date.now(),
    };

    setHands(updatedHands);
    setDrawPile(remainingDeck);
    setDiscardPile(cleanDiscard);
    setUnoVulnerable(null);
    setLastAction(actionLog);

    pushSyncState({
      hands: updatedHands,
      drawPile: remainingDeck,
      discardPile: cleanDiscard,
      unoVulnerable: null,
      lastAction: actionLog,
    });
  };

  // Helper to show animated celebration toast
  const showCelebration = (text: string) => {
    setUnoCelebrationText(text);
    bannerAnim.setValue(0);
    RNAnimated.spring(bannerAnim, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
    celebrationTimeoutRef.current = setTimeout(() => {
      RNAnimated.timing(bannerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => setUnoCelebrationText(null));
    }, 2800);
  };

  // End Game Handler
  const handleFinishGame = () => {
    haptics.success();
    // Prepare leaderboard scores
    const sortedScores = activePlayers
      .map((p) => ({
        playerId: p.id,
        displayName: p.displayName,
        score: roundScores[p.id] || 0,
      }))
      .sort((a, b) => b.score - a.score);

    const results: ActivityResults = {
      scores: sortedScores.map((s, idx) => ({
        ...s,
        rank: idx + 1,
      })),
      metadata: {
        totalRounds: roundNumber,
        winnerId: sortedScores[0]?.playerId,
      },
    };

    onActivityEnd(results);
  };

  // Other opponents around the table
  const opponents = useMemo(
    () => activePlayers.filter((p) => p.id !== currentPlayerId),
    [activePlayers, currentPlayerId]
  );

  // Active color palette
  const activeColorTheme = UNO_COLOR_PALETTES[activeColor] || UNO_COLOR_PALETTES.red;

  // ==========================================
  // Render: Countdown Phase
  // ==========================================
  if (phase === 'countdown') {
    return (
      <View style={[styles.screenContainer, { backgroundColor: '#090D16' }]}>
        <View style={styles.countdownCenter}>
          <Text style={styles.gameTitleSmall}>BLITZ UNO</Text>
          <RNAnimated.Text
            style={[
              styles.countdownNumber,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            {countdownVal}
          </RNAnimated.Text>
          <Text style={styles.countdownSub}>Shuffling & Dealing Cards...</Text>
        </View>
      </View>
    );
  }

  // ==========================================
  // Render: Victory / Round Over Modal
  // ==========================================
  if (phase === 'round_over' || phase === 'game_over') {
    const isGameOver = phase === 'game_over';
    const winningPlayer = players.find((p) => p.id === winnerId);

    return (
      <View style={[styles.screenContainer, { backgroundColor: '#090D16' }]}>
        <ScrollView
          contentContainerStyle={styles.victoryScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.victoryCard}>
            <MaterialCommunityIcons name="trophy" size={54} color="#FBBF24" />
            <Text style={styles.victoryTitle}>
              {isGameOver ? 'MATCH CHAMPION!' : `ROUND ${roundNumber} WINNER!`}
            </Text>
            <Text style={styles.winnerName}>
              {winningPlayer?.displayName || 'Player'}
            </Text>

            {/* Scoreboard */}
            <View style={styles.scoreboardTable}>
              <Text style={styles.scoreboardHeader}>LEADERBOARD</Text>
              {activePlayers
                .map((p) => ({
                  ...p,
                  pts: roundScores[p.id] || 0,
                  cardsLeft: (hands[p.id] || []).length,
                }))
                .sort((a, b) => b.pts - a.pts)
                .map((p, idx) => (
                  <View key={p.id} style={styles.scoreRow}>
                    <Text style={styles.scoreRank}>#{idx + 1}</Text>
                    <Text style={styles.scorePlayerName} numberOfLines={1}>
                      {p.displayName} {p.id === currentPlayerId ? '(You)' : ''}
                    </Text>
                    <Text style={styles.scorePoints}>{p.pts} pts</Text>
                  </View>
                ))}
            </View>

            {/* Controls */}
            {isAdmin ? (
              <View style={styles.victoryButtonsRow}>
                {!isGameOver && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => startNewRound(roundNumber + 1)}
                    style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  >
                    <MaterialCommunityIcons name="play" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Next Round</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleFinishGame}
                  style={[styles.finishButton, { backgroundColor: '#DC2626' }]}
                >
                  <MaterialCommunityIcons name="flag-checkered" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Finish Game</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.waitingHostText}>Waiting for host...</Text>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ==========================================
  // Render: Active Gameplay Screen
  // ==========================================
  return (
    <View style={[styles.screenContainer, { backgroundColor: '#090D16' }]}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        {/* Target Points or Round Indicator */}
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>Round {roundNumber}</Text>
        </View>

        {/* Turn Direction Badge */}
        <View style={styles.directionBadge}>
          <MaterialCommunityIcons
            name={turnDirection === 1 ? 'rotate-right' : 'rotate-left'}
            size={18}
            color="#38BDF8"
          />
          <Text style={styles.directionText}>
            {turnDirection === 1 ? 'Clockwise' : 'Counter'}
          </Text>
        </View>

        {/* Turn Timer Pill */}
        {timePerTurn > 0 && (
          <View
            style={[
              styles.timerBadge,
              turnTimeLeft <= 5 && styles.timerBadgeDanger,
            ]}
          >
            <MaterialCommunityIcons
              name="timer-sand"
              size={14}
              color={turnTimeLeft <= 5 ? '#EF4444' : '#FBBF24'}
            />
            <Text
              style={[
                styles.timerText,
                turnTimeLeft <= 5 && styles.timerTextDanger,
              ]}
            >
              {turnTimeLeft}s
            </Text>
          </View>
        )}
      </View>

      {/* Opponents Carousel / Row */}
      <View style={styles.opponentsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.opponentsScroll}
        >
          {opponents.map((opp) => (
            <UnoOpponentView
              key={opp.id}
              player={opp}
              cardCount={(hands[opp.id] || []).length}
              isCurrentTurn={currentTurnPlayerId === opp.id}
              hasCalledUno={unoCallers[opp.id] || false}
              isVulnerableUno={unoVulnerable === opp.id}
              onCatchUno={handleCatchUno}
            />
          ))}
        </ScrollView>
      </View>

      {/* Center Table (Play Arena) */}
      <View style={styles.tableArena}>
        {/* Table Felt Surface */}
        <View
          style={[
            styles.feltSurface,
            { borderColor: `${activeColorTheme.accent}80` },
          ]}
        >
          {/* Active Color Ring Glow */}
          <View
            style={[
              styles.activeColorHalo,
              {
                borderColor: activeColorTheme.bg,
                backgroundColor: `${activeColorTheme.bg}15`,
              },
            ]}
          />

          {/* Draw Pile (Deck) */}
          <TouchableOpacity
            activeOpacity={isMyTurn ? 0.75 : 1}
            onPress={() => {
              if (isMyTurn) {
                haptics.medium();
                executeDrawCard(currentPlayerId);
              }
            }}
            disabled={!isMyTurn}
            style={styles.drawPileContainer}
          >
            <View style={styles.deckStackVisual}>
              <View style={[styles.deckShadowCard, { left: 4, top: 4 }]} />
              <View style={[styles.deckShadowCard, { left: 2, top: 2 }]} />
              <UnoCardView faceDown size="hand" />
            </View>
            <View style={styles.drawPileBadge}>
              <Text style={styles.drawPileText}>
                {drawPile.length} cards
              </Text>
            </View>
            {isMyTurn && !hasDrawnThisTurn && (
              <View style={styles.tapToDrawPill}>
                <Text style={styles.tapToDrawText}>DRAW</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Discard Pile (Top Played Card) */}
          <View style={styles.discardPileContainer}>
            {activeCard ? (
              <UnoCardView card={activeCard} size="table" />
            ) : (
              <UnoCardView faceDown size="table" />
            )}
          </View>
        </View>

        {/* Current Active Color Tag */}
        <View
          style={[
            styles.activeColorPill,
            { backgroundColor: activeColorTheme.bg },
          ]}
        >
          <MaterialCommunityIcons name="palette" size={14} color="#FFFFFF" />
          <Text style={styles.activeColorPillText}>
            COLOR: {activeColor.toUpperCase()}
          </Text>
        </View>

        {/* Stack Multiplier Badge */}
        {pendingDrawCount > 0 && (
          <RNAnimated.View
            style={[
              styles.stackPenaltyBanner,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <MaterialCommunityIcons name="alert-octagon" size={18} color="#FFFFFF" />
            <Text style={styles.stackPenaltyText}>
              +{pendingDrawCount} STACK PENALTY!
            </Text>
          </RNAnimated.View>
        )}
      </View>

      {/* Action Notice / Last Event Toast */}
      {lastAction && (
        <View style={styles.actionNoticeRow}>
          <Text style={styles.actionNoticeText} numberOfLines={1}>
            {lastAction.description}
          </Text>
        </View>
      )}

      {/* Floating Animated Celebration Banner (UNO Calls, Catches) */}
      {unoCelebrationText && (
        <RNAnimated.View
          style={[
            styles.celebrationBanner,
            {
              opacity: bannerAnim,
              transform: [
                {
                  scale: bannerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.celebrationText}>{unoCelebrationText}</Text>
        </RNAnimated.View>
      )}

      {/* Player Hand & Controls Area */}
      <View style={styles.bottomArea}>
        {/* Hand Top Bar with Turn Status & Action Buttons */}
        <View style={styles.handHeaderRow}>
          <View style={styles.handCountInfo}>
            <Text style={styles.handTitle}>YOUR CARDS</Text>
            <View style={styles.handCountPill}>
              <Text style={styles.handCountNumber}>{myHand.length}</Text>
            </View>
          </View>

          <View style={styles.actionButtonsRow}>
            {/* Pass Turn Button (Appears if user drew a card) */}
            {isMyTurn && hasDrawnThisTurn && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePassTurn}
                style={styles.passButton}
              >
                <Text style={styles.passButtonText}>Pass Turn</Text>
              </TouchableOpacity>
            )}

            {/* Big UNO Shout Button */}
            {myHand.length <= 2 && (
              <RNAnimated.View
                style={[
                  { transform: [{ scale: pulseAnim }] },
                  styles.unoButtonWrapper,
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleShoutUno}
                  style={[
                    styles.unoShoutButton,
                    unoCallers[currentPlayerId] && styles.unoShoutedActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={18}
                    color="#FDE047"
                  />
                  <Text style={styles.unoShoutText}>
                    {unoCallers[currentPlayerId] ? 'UNO CALLED!' : 'UNO!'}
                  </Text>
                </TouchableOpacity>
              </RNAnimated.View>
            )}
          </View>
        </View>

        {/* Turn Status Pill */}
        {isMyTurn ? (
          <View style={styles.myTurnBanner}>
            <MaterialCommunityIcons name="arrow-down-bold" size={14} color="#38BDF8" />
            <Text style={styles.myTurnText}>IT'S YOUR TURN — TAP A CARD TO PLAY</Text>
          </View>
        ) : (
          <View style={styles.waitingTurnBanner}>
            <Text style={styles.waitingTurnText}>
              Waiting for{' '}
              {players.find((p) => p.id === currentTurnPlayerId)?.displayName || 'next player'}
              ...
            </Text>
          </View>
        )}

        {/* Cards Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.handCardsScroll}
        >
          {myHand.map((card, idx) => {
            const isPlayable =
              isMyTurn &&
              canPlayCard(
                card,
                activeCard || stateRef.current.activeCard,
                activeColor,
                pendingDrawCount,
                allowStacking
              );

            return (
              <View
                key={card.id}
                style={[
                  styles.handCardWrapper,
                  idx > 0 && styles.handCardOverlap,
                  isPlayable && styles.playableZIndex,
                ]}
              >
                <UnoCardView
                  card={card}
                  size="hand"
                  isPlayable={isPlayable}
                  isDimmed={isMyTurn && !isPlayable}
                  onPress={isPlayable ? () => handleTapCard(card) : undefined}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Wild Color Picker Modal */}
      <ColorPickerModal
        visible={showColorPicker}
        onSelectColor={handleSelectWildColor}
        cardName={pendingWildCard?.value === 'wild4' ? 'Wild Draw 4' : 'Wild Card'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'space-between',
  },
  // Countdown Screen
  countdownCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTitleSmall: {
    fontSize: 20,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 2,
    marginBottom: 12,
  },
  countdownNumber: {
    fontSize: 90,
    fontWeight: '900',
    color: '#FACC15',
    textShadowColor: 'rgba(250, 204, 21, 0.6)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 18,
  },
  countdownSub: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 14,
    fontWeight: '600',
  },
  // Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    zIndex: 10,
  },
  roundBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  roundText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  directionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  timerBadgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#EF4444',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FBBF24',
  },
  timerTextDanger: {
    color: '#EF4444',
  },
  // Opponents Bar
  opponentsContainer: {
    paddingVertical: 4,
  },
  opponentsScroll: {
    paddingHorizontal: 14,
    gap: 10,
  },
  // Center Table Arena
  tableArena: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  feltSurface: {
    width: Math.min(SCREEN_WIDTH * 0.92, 360),
    height: 190,
    borderRadius: 95,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      },
    }),
  },
  activeColorHalo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 95,
    borderWidth: 3,
    opacity: 0.85,
  },
  drawPileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  deckStackVisual: {
    position: 'relative',
  },
  deckShadowCard: {
    position: 'absolute',
    width: 76,
    height: 114,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  drawPileBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  drawPileText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  tapToDrawPill: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#38BDF8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      },
      web: {
        boxShadow: '0 0 8px rgba(56, 189, 248, 0.8)',
      },
    }),
  },
  tapToDrawText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  discardPileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeColorPill: {
    position: 'absolute',
    bottom: -12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  activeColorPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  stackPenaltyBanner: {
    position: 'absolute',
    top: -14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
      },
      web: {
        boxShadow: '0 0 12px rgba(239, 68, 68, 0.9)',
      },
    }),
  },
  stackPenaltyText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // Notice & Toast
  actionNoticeRow: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  actionNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  celebrationBanner: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#FDE047',
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 14,
      },
      android: {
        elevation: 20,
      },
      web: {
        boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
      },
    }),
  },
  celebrationText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // Bottom Player Hand Area
  bottomArea: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    borderTopWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  handHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 6,
  },
  handCountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  handTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  handCountPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  handCountNumber: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passButton: {
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  passButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  unoButtonWrapper: {},
  unoShoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FDE047',
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
      },
      web: {
        boxShadow: '0 0 12px rgba(220, 38, 38, 0.9)',
      },
    }),
  },
  unoShoutedActive: {
    backgroundColor: '#16A34A',
    borderColor: '#86EFAC',
  },
  unoShoutText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  myTurnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    marginHorizontal: 18,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 8,
  },
  myTurnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  waitingTurnBanner: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 6,
  },
  waitingTurnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  handCardsScroll: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  handCardWrapper: {
    zIndex: 1,
  },
  handCardOverlap: {
    marginLeft: -16,
  },
  playableZIndex: {
    zIndex: 10,
  },
  // Victory Screen Styles
  victoryScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  victoryCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  victoryTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FBBF24',
    marginTop: 12,
    letterSpacing: 1,
  },
  winnerName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 16,
  },
  scoreboardTable: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  scoreboardHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  scoreRank: {
    fontSize: 13,
    fontWeight: '900',
    color: '#38BDF8',
    width: 30,
  },
  scorePlayerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  scorePoints: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FBBF24',
  },
  victoryButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  finishButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  waitingHostText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 10,
  },
});
