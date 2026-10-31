/**
 * Who Am I? — Multiplayer Game Component
 * The classic secret persona & forehead sticky note party game.
 * Features live reaction feeds, interactive hint unmasking, multiple choice or text guessing,
 * host "Mark Correct" verbal override, and turn rotation across players.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated as RNAnimated,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import type { ActivityGameProps, ActivityResults, GameEvent } from '@/src/types/activity';
import type {
  WhoAmICategory,
  WhoAmIPhase,
  WhoAmIPrivateState,
  WhoAmISyncState,
  PersonaItem,
  PlayerClue,
  ReactionPing,
} from './types';
import { getPersonaPool } from './data';
import { haptics } from '@/src/utils/haptics';
import { roomService } from '@/src/services/roomService';
import { Avatar } from '@/src/components/Avatar';

export function WhoAmIGame({
  roomId,
  roomCode,
  currentPlayerId,
  isAdmin,
  players,
  settings,
  onActivityEnd,
  broadcastEvent,
  onGameEvent,
  syncGameState,
  onGameState,
  syncPrivateState,
  onPrivateState,
}: ActivityGameProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const category = (settings.category as WhoAmICategory | 'all') ?? 'all';
  const timePerTurn = (settings.timePerTurn as number) ?? 90;
  const roundsPerPlayer = (settings.roundsPerPlayer as number) ?? 1;
  const maxHintsAllowed = (settings.maxHintsAllowed as number) ?? 3;
  const customPersonas = (settings.customPersonas as PersonaItem[]) ?? [];

  // ==========================================
  // Shared Game State
  // ==========================================
  const [phase, setPhase] = useState<WhoAmIPhase>('intro');
  const [roundNumber, setRoundNumber] = useState(1);
  const [guesserPlayerId, setGuesserPlayerId] = useState('');
  const [hintsRevealedCount, setHintsRevealedCount] = useState(0);
  const [guessesRemaining, setGuessesRemaining] = useState(3);
  const [guessAttempts, setGuessAttempts] = useState<string[]>([]);
  const [isGuessedCorrectly, setIsGuessedCorrectly] = useState<boolean | null>(null);
  const [phaseTimer, setPhaseTimer] = useState(10);
  const [clues, setClues] = useState<PlayerClue[]>([]);
  const [activePersona, setActivePersona] = useState<PersonaItem | null>(null);

  // ==========================================
  // Local State
  // ==========================================
  const [secretPersonaForAudience, setSecretPersonaForAudience] = useState<PersonaItem | null>(null);
  const [myGuessInput, setMyGuessInput] = useState('');
  const [customClueInput, setCustomClueInput] = useState('');
  const [reactionFeed, setReactionFeed] = useState<ReactionPing[]>([]);

  // Turn tracking across players
  const [turnOrder, setTurnOrder] = useState<string[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);

  // Animations
  const stickyBounceAnim = useRef(new RNAnimated.Value(0)).current;
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  // Refs
  const didInitRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncTsRef = useRef(0);
  const privateStateMapRef = useRef<Record<string, WhoAmIPrivateState>>({});

  // Active players
  const activePlayers = useMemo(() => players.filter((p) => !p.isOffline), [players]);
  const isGuesser = guesserPlayerId === currentPlayerId;
  const guesserPlayer = players.find((p) => p.id === guesserPlayerId);
  const totalRounds = activePlayers.length * roundsPerPlayer;

  // ==========================================
  // Sticky Note Animation
  // ==========================================
  useEffect(() => {
    RNAnimated.spring(stickyBounceAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, [stickyBounceAnim, pulseAnim, guesserPlayerId]);

  // ==========================================
  // Push Shared State (Admin Only)
  // ==========================================
  const pushSyncState = useCallback(
    (newState: Partial<WhoAmISyncState>) => {
      if (!isAdmin || !syncGameState) return;

      const fullState: WhoAmISyncState = {
        phase: newState.phase ?? phase,
        roundNumber: newState.roundNumber ?? roundNumber,
        totalRounds,
        guesserPlayerId: newState.guesserPlayerId ?? guesserPlayerId,
        personaId: activePersona?.id || '',
        hintsRevealedCount: newState.hintsRevealedCount ?? hintsRevealedCount,
        guessesRemaining: newState.guessesRemaining ?? guessesRemaining,
        guessAttempts: newState.guessAttempts ?? guessAttempts,
        isGuessedCorrectly: newState.isGuessedCorrectly !== undefined ? newState.isGuessedCorrectly : isGuessedCorrectly,
        phaseTimeLeft: newState.phaseTimeLeft ?? phaseTimer,
        clues: newState.clues ?? clues,
        syncTimestamp: Date.now(),
      };

      lastSyncTsRef.current = fullState.syncTimestamp;
      syncGameState(fullState as unknown as Record<string, unknown>);
    },
    [
      isAdmin,
      syncGameState,
      phase,
      roundNumber,
      totalRounds,
      guesserPlayerId,
      activePersona,
      hintsRevealedCount,
      guessesRemaining,
      guessAttempts,
      isGuessedCorrectly,
      phaseTimer,
      clues,
    ]
  );

  // ==========================================
  // Initialize Turn / Round (Admin Only)
  // ==========================================
  const initTurn = useCallback(
    (idx: number, roundNum: number) => {
      if (!isAdmin) return;

      const pool = getPersonaPool(category, customPersonas);
      const chosenPersona = pool[Math.floor(Math.random() * pool.length)];
      setActivePersona(chosenPersona);

      let order = turnOrder;
      if (order.length === 0) {
        order = [...activePlayers.map((p) => p.id)].sort(() => 0.5 - Math.random());
        setTurnOrder(order);
      }

      const activeGuesserId = order[idx % order.length] || activePlayers[0]?.id || '';
      setGuesserPlayerId(activeGuesserId);
      setTurnIndex(idx);
      setRoundNumber(roundNum);

      // Reset turn local states
      setHintsRevealedCount(0);
      setGuessesRemaining(3);
      setGuessAttempts([]);
      setIsGuessedCorrectly(null);
      setClues([]);
      setPhase('intro');
      setPhaseTimer(6); // 6s intro announcement

      // Distribute Private State
      const pMap: Record<string, WhoAmIPrivateState> = {};
      activePlayers.forEach((p) => {
        const isCurrentG = p.id === activeGuesserId;
        const pState: WhoAmIPrivateState = {
          isGuesser: isCurrentG,
          secretPersona: isCurrentG ? null : (chosenPersona || null),
        };
        pMap[p.id] = pState;

        if (syncPrivateState) {
          syncPrivateState(p.id, pState as unknown as Record<string, unknown>);
        }
      });
      privateStateMapRef.current = pMap;

      // Admin local mirror
      if (currentPlayerId === activeGuesserId) {
        setSecretPersonaForAudience(null);
      } else {
        setSecretPersonaForAudience(chosenPersona);
      }

      pushSyncState({
        phase: 'intro',
        roundNumber: roundNum,
        guesserPlayerId: activeGuesserId,
        hintsRevealedCount: 0,
        guessesRemaining: 3,
        guessAttempts: [],
        isGuessedCorrectly: null,
        phaseTimeLeft: 6,
        clues: [],
      });
    },
    [
      isAdmin,
      category,
      customPersonas,
      turnOrder,
      activePlayers,
      currentPlayerId,
      syncPrivateState,
      pushSyncState,
    ]
  );

  // Mount init
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    if (isAdmin) {
      initTurn(0, 1);
    }
  }, [isAdmin, initTurn]);

  // ==========================================
  // Subscribe to Private State (Audience gets persona, Guesser gets undefined)
  // ==========================================
  useEffect(() => {
    if (!onPrivateState) return;

    const unsubscribe = onPrivateState((raw) => {
      const pState = raw as unknown as WhoAmIPrivateState;
      if (pState) {
        if (pState.isGuesser) {
          setSecretPersonaForAudience(null);
        } else if (pState.secretPersona) {
          setSecretPersonaForAudience(pState.secretPersona);
        } else {
          setSecretPersonaForAudience(null);
        }
      }
    });

    return () => unsubscribe();
  }, [onPrivateState]);

  // ==========================================
  // Subscribe to Shared Game State (Clients)
  // ==========================================
  useEffect(() => {
    if (!onGameState) return;

    const unsubscribe = onGameState((raw) => {
      const s = raw as unknown as WhoAmISyncState;
      if (!s || !s.syncTimestamp || s.syncTimestamp <= lastSyncTsRef.current) return;

      lastSyncTsRef.current = s.syncTimestamp;
      setPhase(s.phase);
      setRoundNumber(s.roundNumber);
      setGuesserPlayerId(s.guesserPlayerId);
      setHintsRevealedCount(s.hintsRevealedCount);
      setGuessesRemaining(s.guessesRemaining);
      setGuessAttempts(s.guessAttempts || []);
      setIsGuessedCorrectly(s.isGuessedCorrectly);
      const elapsedSinceSync = Math.max(0, Math.floor((Date.now() - s.syncTimestamp) / 1000));
      const adjustedTimeLeft = Math.max(0, s.phaseTimeLeft - elapsedSinceSync);
      setPhaseTimer(adjustedTimeLeft);
      setClues(s.clues || []);

      if (s.personaId && (!activePersona || activePersona.id !== s.personaId)) {
        const pool = getPersonaPool(category, customPersonas);
        const item = pool.find((p) => p.id === s.personaId);
        if (item) setActivePersona(item);
      }
    });

    return () => unsubscribe();
  }, [onGameState, category, customPersonas, activePersona]);

  // ==========================================
  // Broadcast Events (Reactions & Clues)
  // ==========================================
  useEffect(() => {
    const unsubscribe = onGameEvent((event: GameEvent) => {
      if (event.type === 'who_am_i_reaction') {
        const payload = event.payload as unknown as ReactionPing;
        if (payload) {
          haptics.selection();
          setReactionFeed((prev) => [...prev.slice(-4), payload]);
        }
      } else if (event.type === 'who_am_i_clue') {
        const payload = event.payload as { clue: PlayerClue };
        if (payload?.clue) {
          setClues((prev) => [...prev, payload.clue]);
        }
      } else if (event.type === 'who_am_i_guess') {
        const payload = event.payload as { guessText: string };
        if (payload?.guessText && isAdmin) {
          evaluateGuess(payload.guessText);
        }
      } else if (event.type === 'who_am_i_request_hint') {
        if (isAdmin) {
          handleRevealNextHint();
        }
      }
    });

    return () => unsubscribe();
  }, [onGameEvent, isAdmin]);

  // Send Reaction (Audience Action)
  const sendReaction = (type: ReactionPing['type']) => {
    haptics.selection();
    const myPlayer = players.find((p) => p.id === currentPlayerId);
    const ping: ReactionPing = {
      id: `${Date.now()}_${Math.random()}`,
      senderId: currentPlayerId,
      senderName: myPlayer?.displayName || 'Player',
      type,
      timestamp: Date.now(),
    };

    setReactionFeed((prev) => [...prev.slice(-4), ping]);

    broadcastEvent({
      type: 'who_am_i_reaction',
      senderId: currentPlayerId,
      payload: ping as unknown as Record<string, unknown>,
      timestamp: Date.now(),
    });
  };

  // Send Clue (Audience Action)
  const sendClue = (text: string) => {
    if (!text.trim()) return;
    haptics.success();
    const myPlayer = players.find((p) => p.id === currentPlayerId);
    const newClue: PlayerClue = {
      playerId: currentPlayerId,
      playerName: myPlayer?.displayName || 'Player',
      text: text.trim(),
      timestamp: Date.now(),
    };

    const updated = [...clues, newClue];
    setClues(updated);
    setCustomClueInput('');

    if (isAdmin) {
      pushSyncState({ clues: updated });
    } else {
      broadcastEvent({
        type: 'who_am_i_clue',
        senderId: currentPlayerId,
        payload: { clue: newClue },
        timestamp: Date.now(),
      });
    }
  };

  // ==========================================
  // Timer Management (Counts down on all devices)
  // ==========================================
  const handlePhaseTimeoutRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setPhaseTimer((prev) => {
        if (prev <= 1) {
          if (isAdmin) {
            handlePhaseTimeoutRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAdmin, phase]);

  const handlePhaseTimeout = useCallback(() => {
    if (!isAdmin) return;

    if (phase === 'intro') {
      // Intro -> Questioning
      haptics.medium();
      setPhase('questioning');
      setPhaseTimer(timePerTurn);
      pushSyncState({
        phase: 'questioning',
        phaseTimeLeft: timePerTurn,
      });
    } else if (phase === 'questioning') {
      // Time ran out -> Reveal (Guesser didn't get it in time)
      haptics.error();
      endTurnWithResult(false);
    } else if (phase === 'reveal') {
      handleNextTurnOrFinish();
    }
  }, [isAdmin, phase, timePerTurn, pushSyncState]);

  handlePhaseTimeoutRef.current = handlePhaseTimeout;

  // Reveal next hint (Cost deduction)
  const handleRevealNextHint = () => {
    if (hintsRevealedCount >= maxHintsAllowed) return;
    haptics.selection();

    const nextCount = hintsRevealedCount + 1;
    setHintsRevealedCount(nextCount);

    if (isAdmin) {
      pushSyncState({ hintsRevealedCount: nextCount });
    } else {
      broadcastEvent({
        type: 'who_am_i_request_hint',
        senderId: currentPlayerId,
        payload: {},
        timestamp: Date.now(),
      });
    }
  };

  // Submit Guess
  const handleGuessSubmit = (guessText: string) => {
    if (!isGuesser || guessesRemaining <= 0 || !guessText.trim()) return;

    haptics.selection();
    setMyGuessInput('');

    if (isAdmin) {
      evaluateGuess(guessText.trim());
    } else {
      broadcastEvent({
        type: 'who_am_i_guess',
        senderId: currentPlayerId,
        payload: { guessText: guessText.trim() },
        timestamp: Date.now(),
      });
    }
  };

  // Evaluate Guess (Admin Authoritative)
  const evaluateGuess = useCallback(
    (guessText: string) => {
      if (!isAdmin || !activePersona) return;

      const normGuess = guessText.trim().toLowerCase();
      const normTarget = activePersona.name.trim().toLowerCase();

      // Check exact or close match
      const isMatch =
        normGuess === normTarget ||
        normTarget.includes(normGuess) ||
        normGuess.includes(normTarget);

      const updatedAttempts = [...guessAttempts, guessText];
      const remaining = guessesRemaining - 1;

      setGuessAttempts(updatedAttempts);
      setGuessesRemaining(remaining);

      if (isMatch) {
        haptics.success();
        endTurnWithResult(true);
      } else if (remaining <= 0) {
        haptics.error();
        endTurnWithResult(false);
      } else {
        haptics.warning();
        pushSyncState({
          guessAttempts: updatedAttempts,
          guessesRemaining: remaining,
        });
      }
    },
    [isAdmin, activePersona, guessAttempts, guessesRemaining, pushSyncState]
  );

  // Verbal Override: Host Taps "Mark Correct!"
  const handleHostMarkCorrect = () => {
    if (!isAdmin) return;
    haptics.success();
    endTurnWithResult(true);
  };

  // End Turn With Score
  const endTurnWithResult = (success: boolean) => {
    setIsGuessedCorrectly(success);
    setPhase('reveal');
    setPhaseTimer(10); // 10s review reveal

    if (success) {
      // Reward guesser: 150 base + remaining time * 2 - (hints * 25)
      const basePoints = 150;
      const speedBonus = phaseTimer * 2;
      const hintPenalty = hintsRevealedCount * 25;
      const totalPoints = Math.max(50, basePoints + speedBonus - hintPenalty);

      if (guesserPlayer) {
        roomService.updatePlayerScore(roomId, guesserPlayer.id, guesserPlayer.score + totalPoints);
      }

      // Reward audience helpers (+50 each)
      activePlayers.forEach((p) => {
        if (p.id !== guesserPlayerId) {
          roomService.updatePlayerScore(roomId, p.id, p.score + 50);
        }
      });
    }

    pushSyncState({
      phase: 'reveal',
      isGuessedCorrectly: success,
      phaseTimeLeft: 10,
    });
  };

  // Advance to next player turn or activity end
  const handleNextTurnOrFinish = () => {
    if (!isAdmin) return;

    const nextIndex = turnIndex + 1;
    const nextRound = roundNumber + 1;

    if (nextRound <= totalRounds) {
      initTurn(nextIndex, nextRound);
    } else {
      // Activity complete -> Return final rankings
      const sorted = [...players].sort((a, b) => b.score - a.score);
      const results: ActivityResults = {
        scores: sorted.map((p, idx) => ({
          playerId: p.id,
          displayName: p.displayName,
          score: p.score,
          rank: idx + 1,
        })),
      };
      onActivityEnd(results);
    }
  };

  // Bot Reactions & Clues (Admin simulation)
  useEffect(() => {
    if (!isAdmin || phase !== 'questioning') return;

    const botAudience = activePlayers.filter(
      (p) =>
        p.id !== guesserPlayerId &&
        (p.displayName.startsWith('Bot ') || p.id.startsWith('bot_'))
    );

    if (botAudience.length > 0) {
      const interval = setInterval(() => {
        const randomBot = botAudience[Math.floor(Math.random() * botAudience.length)];
        const types: Array<ReactionPing['type']> = ['yes', 'no', 'maybe', 'hot', 'cold'];
        const chosenType = types[Math.floor(Math.random() * types.length)];

        const ping: ReactionPing = {
          id: `${Date.now()}_${Math.random()}`,
          senderId: randomBot.id,
          senderName: randomBot.displayName,
          type: chosenType,
          timestamp: Date.now(),
        };

        setReactionFeed((prev) => [...prev.slice(-4), ping]);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isAdmin, phase, activePlayers, guesserPlayerId]);

  // Persona displayed to Audience or on Reveal
  const personaToDisplay =
    phase === 'reveal' ? activePersona : secretPersonaForAudience;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.headerLeft}>
          <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '700' }]}>
            TURN {roundNumber} / {totalRounds}
          </Text>
          <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>
            Who Am I?
          </Text>
        </View>

        {/* Phase Timer Indicator */}
        <View
          style={[
            styles.timerBadge,
            {
              backgroundColor: phaseTimer <= 10 ? 'rgba(239, 68, 68, 0.15)' : colors.surfaceElevated,
              borderColor: phaseTimer <= 10 ? colors.error : colors.borderLight,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="timer-sand"
            size={16}
            color={phaseTimer <= 10 ? colors.error : colors.primary}
          />
          <Text
            style={[
              typography.labelMedium,
              {
                color: phaseTimer <= 10 ? colors.error : colors.textPrimary,
                marginLeft: spacing.xxs,
                fontWeight: '700',
              },
            ]}
          >
            {phaseTimer}s
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* ==========================================
            PHASE 1: INTRO (SPOTLIGHT)
            ========================================== */}
        {phase === 'intro' && (
          <View style={styles.phaseContent}>
            <Text style={[typography.headlineLarge, { color: colors.textPrimary, textAlign: 'center', fontWeight: '900' }]}>
              Hot Seat Spotlight
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
              A secret identity is being stuck to someone's forehead!
            </Text>

            <View style={[styles.guesserSpotlight, { marginTop: spacing.xl }]}>
              <Avatar
                name={guesserPlayer?.displayName || 'Guesser'}
                color={guesserPlayer?.avatarColor || colors.primary}
                size={88}
              />
              <Text
                style={[
                  typography.headlineMedium,
                  { color: colors.textPrimary, marginTop: spacing.md, fontWeight: '800' },
                ]}
              >
                {guesserPlayer?.displayName}
              </Text>
              <View
                style={[
                  styles.rolePill,
                  { backgroundColor: colors.primaryMuted, borderRadius: radius.full, marginTop: spacing.xs },
                ]}
              >
                <Text style={[typography.labelMedium, { color: colors.primary, fontWeight: '700' }]}>
                  {isGuesser ? 'YOU ARE IN THE HOT SEAT!' : 'ACTIVE GUESSER'}
                </Text>
              </View>
            </View>

            {isAdmin && (
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radius.lg,
                    marginTop: spacing.xxl,
                  },
                ]}
                onPress={handlePhaseTimeout}
              >
                <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                  Start Questioning Now →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ==========================================
            PHASE 2: QUESTIONING & GUESSING
            ========================================== */}
        {phase === 'questioning' && (
          <View style={styles.phaseContent}>
            {/* The Sticky Note on Forehead */}
            <RNAnimated.View
              style={[
                styles.stickyNote,
                {
                  transform: [
                    {
                      scale: stickyBounceAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {isGuesser ? (
                // Guesser's View: Blank sticky note with question mark
                <View style={styles.guesserSticky}>
                  <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <MaterialCommunityIcons name="help-rhombus-outline" size={54} color="#5C4500" />
                  </RNAnimated.View>
                  <Text style={[typography.headlineMedium, { color: '#3A2C00', fontWeight: '900', marginTop: 4 }]}>
                    WHO AM I?
                  </Text>
                  <Text style={[typography.bodySmall, { color: '#735800', textAlign: 'center', marginTop: 4 }]}>
                    Ask Yes/No questions aloud to the room, or ask for clues!
                  </Text>
                </View>
              ) : (
                // Audience's View: The revealed identity
                <View style={styles.audienceSticky}>
                  <Text style={[typography.labelSmall, { color: '#735800', letterSpacing: 1, fontWeight: '800' }]}>
                    {guesserPlayer?.displayName?.toUpperCase()}'S IDENTITY:
                  </Text>
                  <Text
                    style={[
                      typography.headlineMedium,
                      { color: '#2B2000', fontWeight: '900', textAlign: 'center', marginTop: 2 },
                    ]}
                  >
                    {personaToDisplay?.name || 'Mystery Persona'}
                  </Text>
                  <Text
                    style={[
                      typography.labelSmall,
                      { color: '#5C4500', fontWeight: '700', textAlign: 'center', marginTop: 2 },
                    ]}
                  >
                    {personaToDisplay?.tagline}
                  </Text>
                </View>
              )}
            </RNAnimated.View>

            {/* Live Reaction Stream Floating Pill */}
            {reactionFeed.length > 0 && (
              <View style={[styles.reactionFeedRow, { marginTop: spacing.md }]}>
                {reactionFeed.slice(-3).map((r) => {
                  const reactionIcon =
                    r.type === 'yes'
                      ? 'check-circle'
                      : r.type === 'no'
                      ? 'close-circle'
                      : r.type === 'maybe'
                      ? 'help-circle'
                      : r.type === 'hot'
                      ? 'fire'
                      : 'snowflake';
                  const reactionColor =
                    r.type === 'yes' || r.type === 'hot' ? colors.success : colors.error;

                  return (
                    <View
                      key={r.id}
                      style={[
                        styles.reactionBubble,
                        { backgroundColor: colors.surfaceElevated, borderRadius: radius.full },
                      ]}
                    >
                      <MaterialCommunityIcons name={reactionIcon as any} size={16} color={reactionColor} />
                      <Text style={[typography.bodySmall, { color: colors.textPrimary, marginLeft: 4 }]}>
                        <Text style={{ fontWeight: '700' }}>{r.senderName}: </Text>
                        {r.type.toUpperCase()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* GUESSER INTERFACE */}
            {isGuesser ? (
              <View style={{ marginTop: spacing.lg }}>
                {/* Hints Revealed Box */}
                <View
                  style={[
                    styles.hintsBox,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
                      borderRadius: radius.lg,
                      padding: spacing.md,
                    },
                  ]}
                >
                  <View style={styles.hintsHeader}>
                    <Text style={[typography.titleSmall, { color: colors.textPrimary }]}>
                      Unlocked Clues ({hintsRevealedCount} / {maxHintsAllowed})
                    </Text>
                    {hintsRevealedCount < maxHintsAllowed && (
                      <TouchableOpacity
                        style={[
                          styles.unlockHintBtn,
                          { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 4 },
                        ]}
                        onPress={handleRevealNextHint}
                      >
                        <MaterialCommunityIcons name="lightbulb-on" size={16} color={colors.textOnPrimary} />
                        <Text style={[typography.labelSmall, { color: colors.textOnPrimary, marginLeft: 4, fontWeight: '700' }]}>
                          Use Clue
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {hintsRevealedCount === 0 ? (
                    <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: spacing.xs }]}>
                      No hints used yet. Tap "Use Clue" if you are stuck!
                    </Text>
                  ) : (
                    <View style={{ marginTop: spacing.xs }}>
                      {personaToDisplay?.hints.slice(0, hintsRevealedCount).map((hint, i) => (
                        <Text key={i} style={[typography.bodySmall, { color: colors.primary, marginTop: 4 }]}>
                          💡 Clue {i + 1}: {hint}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>

                {/* Guess Submission Input */}
                <View
                  style={[
                    styles.guessForm,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.primary,
                      borderRadius: radius.lg,
                      padding: spacing.md,
                      marginTop: spacing.md,
                    },
                  ]}
                >
                  <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                    Guesses Remaining: {guessesRemaining} / 3
                  </Text>
                  <TextInput
                    style={[
                      styles.guessInput,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.borderLight,
                        color: colors.textPrimary,
                        borderRadius: radius.md,
                        padding: spacing.sm,
                      },
                    ]}
                    placeholder="Type your guess here..."
                    placeholderTextColor={colors.textTertiary}
                    value={myGuessInput}
                    onChangeText={setMyGuessInput}
                  />

                  {/* Multiple Choice Assist Chips */}
                  <View style={styles.assistChipsRow}>
                    {[
                      personaToDisplay?.name || '',
                      ...(personaToDisplay?.decoys || ['Sherlock Holmes', 'Albert Einstein', 'Super Mario']),
                    ]
                      .sort(() => 0.5 - Math.random())
                      .map((decoy) => (
                        <TouchableOpacity
                          key={decoy}
                          style={[
                            styles.assistChip,
                            { backgroundColor: colors.surfaceElevated, borderRadius: radius.full },
                          ]}
                          onPress={() => setMyGuessInput(decoy)}
                        >
                          <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{decoy}</Text>
                        </TouchableOpacity>
                      ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryActionButton,
                      {
                        backgroundColor: colors.primary,
                        borderRadius: radius.md,
                        marginTop: spacing.sm,
                        paddingVertical: spacing.sm,
                      },
                    ]}
                    onPress={() => handleGuessSubmit(myGuessInput)}
                  >
                    <Text style={[typography.labelMedium, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                      Submit Guess →
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // AUDIENCE / HELPERS INTERFACE
              <View style={{ marginTop: spacing.lg }}>
                <Text style={[typography.titleSmall, { color: colors.textPrimary, textAlign: 'center' }]}>
                  Answer {guesserPlayer?.displayName}'s Questions:
                </Text>

                {/* Reaction Tap Buttons */}
                <View style={styles.reactionButtonsRow}>
                  {[
                    { label: 'YES! ✅', type: 'yes' as const, bg: 'rgba(16, 185, 129, 0.15)', text: colors.success },
                    { label: 'NO! ❌', type: 'no' as const, bg: 'rgba(239, 68, 68, 0.15)', text: colors.error },
                    { label: 'MAYBE 🤷‍♂️', type: 'maybe' as const, bg: colors.surfaceElevated, text: colors.textPrimary },
                    { label: 'HOT 🔥', type: 'hot' as const, bg: '#3D1C06', text: '#FF9800' },
                    { label: 'COLD ❄️', type: 'cold' as const, bg: '#08253B', text: '#03A9F4' },
                  ].map((btn) => (
                    <TouchableOpacity
                      key={btn.label}
                      style={[
                        styles.reactionTapBtn,
                        { backgroundColor: btn.bg, borderRadius: radius.md, paddingVertical: 10 },
                      ]}
                      onPress={() => sendReaction(btn.type)}
                      activeOpacity={0.7}
                    >
                      <Text style={[typography.labelSmall, { color: btn.text, fontWeight: '800' }]}>
                        {btn.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Clue Submission */}
                <View
                  style={[
                    styles.customClueBox,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
                      borderRadius: radius.md,
                      padding: spacing.sm,
                      marginTop: spacing.md,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.clueInput,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.borderLight,
                        color: colors.textPrimary,
                        borderRadius: radius.sm,
                        padding: spacing.xs,
                      },
                    ]}
                    placeholder="Give a short verbal hint..."
                    placeholderTextColor={colors.textTertiary}
                    value={customClueInput}
                    onChangeText={setCustomClueInput}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendClueBtn,
                      { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 12 },
                    ]}
                    onPress={() => sendClue(customClueInput)}
                  >
                    <Text style={[typography.labelSmall, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                      Send
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Host "Mark Correct" verbal override */}
                {isAdmin && (
                  <TouchableOpacity
                    style={[
                      styles.markCorrectBtn,
                      {
                        backgroundColor: colors.success,
                        borderRadius: radius.lg,
                        marginTop: spacing.xl,
                        paddingVertical: 12,
                      },
                    ]}
                    onPress={handleHostMarkCorrect}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="check-decagram" size={20} color="#FFFFFF" />
                    <Text style={[typography.labelMedium, { color: '#FFFFFF', fontWeight: '800', marginLeft: 8 }]}>
                      Host: Mark Guessed Correctly! 🎉
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Guess Attempts Feed */}
            {guessAttempts.length > 0 && (
              <View style={{ marginTop: spacing.lg }}>
                <Text style={[typography.labelSmall, { color: colors.textTertiary, marginBottom: 4 }]}>
                  PREVIOUS GUESSES:
                </Text>
                {guessAttempts.map((attempt, i) => (
                  <View
                    key={i}
                    style={[
                      styles.attemptChip,
                      { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.sm },
                    ]}
                  >
                    <MaterialCommunityIcons name="close" size={14} color={colors.error} />
                    <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: 6 }]}>
                      "{attempt}"
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ==========================================
            PHASE 3: REVEAL
            ========================================== */}
        {phase === 'reveal' && (
          <View style={styles.phaseContent}>
            {isGuessedCorrectly ? (
              <View
                style={[
                  styles.resultBanner,
                  { backgroundColor: '#0B2418', borderColor: colors.success, borderRadius: radius.xl },
                ]}
              >
                <MaterialCommunityIcons name="party-popper" size={54} color={colors.success} />
                <Text
                  style={[
                    typography.headlineLarge,
                    { color: colors.success, fontWeight: '900', marginTop: spacing.xs },
                  ]}
                >
                  CORRECT! 🎉
                </Text>
                <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center' }]}>
                  {guesserPlayer?.displayName} guessed their secret identity!
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.resultBanner,
                  { backgroundColor: '#2A080C', borderColor: colors.error, borderRadius: radius.xl },
                ]}
              >
                <MaterialCommunityIcons name="emoticon-sad-outline" size={54} color={colors.error} />
                <Text
                  style={[
                    typography.headlineLarge,
                    { color: colors.error, fontWeight: '900', marginTop: spacing.xs },
                  ]}
                >
                  TIME'S UP!
                </Text>
                <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center' }]}>
                  The secret identity remained undiscovered.
                </Text>
              </View>
            )}

            {/* Full Persona Card */}
            <View
              style={[
                styles.fullPersonaCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                  marginTop: spacing.lg,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={(activePersona?.icon as any) || 'account-question'}
                size={48}
                color={colors.primary}
              />
              <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '900', marginTop: 4 }]}>
                {activePersona?.name}
              </Text>
              <Text style={[typography.bodyMedium, { color: colors.primary, fontWeight: '600' }]}>
                {activePersona?.tagline}
              </Text>

              <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.md, width: '100%' }} />

              <Text style={[typography.labelSmall, { color: colors.textTertiary, alignSelf: 'flex-start' }]}>
                DID YOU KNOW?
              </Text>
              {activePersona?.hints.map((hint, idx) => (
                <Text key={idx} style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
                  • {hint}
                </Text>
              ))}
            </View>

            {/* Admin Advance Button */}
            {isAdmin && (
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radius.lg,
                    marginTop: spacing.xl,
                  },
                ]}
                onPress={handleNextTurnOrFinish}
              >
                <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                  {roundNumber < totalRounds ? `Next Turn (${roundNumber + 1}/${totalRounds}) →` : 'Finish Game 🏆'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  phaseContent: {
    paddingTop: 16,
  },
  guesserSpotlight: {
    alignItems: 'center',
  },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  stickyNote: {
    backgroundColor: '#FFE066',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  guesserSticky: {
    alignItems: 'center',
  },
  audienceSticky: {
    alignItems: 'center',
    width: '100%',
  },
  reactionFeedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hintsBox: {
    borderWidth: 1,
  },
  hintsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unlockHintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guessForm: {
    borderWidth: 1.5,
  },
  guessInput: {
    borderWidth: 1,
    fontSize: 15,
  },
  assistChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  assistChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reactionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    justifyContent: 'space-between',
  },
  reactionTapBtn: {
    width: '31%',
    alignItems: 'center',
  },
  customClueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  clueInput: {
    flex: 1,
    borderWidth: 1,
    fontSize: 14,
  },
  sendClueBtn: {
    marginLeft: 8,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markCorrectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attemptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  resultBanner: {
    alignItems: 'center',
    padding: 24,
    borderWidth: 2,
  },
  fullPersonaCard: {
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryActionButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
