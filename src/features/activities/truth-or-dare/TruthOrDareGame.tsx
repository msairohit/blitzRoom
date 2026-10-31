/**
 * Truth or Dare Game Component
 * Turn-based party game with spinning wheel player selection.
 *
 * Sync Architecture:
 * - ALL game state is written to RTDB at `rooms/${roomId}/todState` via `syncGameState`.
 * - RTDB uses WebSocket for ~50–150ms propagation (vs 300–800ms for Firestore).
 * - `onGameState` subscribes all clients; fires immediately with current state on mount.
 * - Optimistic local updates keep the acting player's UI instant.
 * - `lastAppliedKeyRef` deduplicates remote state so we don't re-apply the same update.
 *
 * Turn Order:
 * - Admin shuffles the player array once at game start and embeds `playerOrder`
 *   (array of player IDs) into the initial `todState`.
 * - All clients follow the same fixed shuffled order.
 * - Admin gets a "Skip" button when the current player has left the room.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import type { ActivityGameProps } from '@/src/types/activity';
import { SAMPLE_PROMPTS, type TodPrompt, type TodCategory } from './types';
import { haptics } from '@/src/utils/haptics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TodPhase = 'spinning' | 'choosing' | 'prompt' | 'finished';

interface TodState {
  phase: TodPhase;
  /** Ordered list of player IDs (shuffled at game start, immutable thereafter) */
  playerOrder: string[];
  /** Index into playerOrder for the current player */
  orderIndex: number;
  roundCount: number;
  promptId: string | null;
  promptText: string | null;
  promptType: 'truth' | 'dare' | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function todStateKey(s: TodState): string {
  return `${s.roundCount}-${s.orderIndex}-${s.phase}-${s.promptId ?? 'null'}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TruthOrDareGame({
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

  const category = (settings.category as TodCategory) ?? 'fun';
  const maxRounds = (settings.rounds as number) ?? 0;

  // ---- Local state ----
  const [phase, setPhase] = useState<TodPhase>('spinning');
  const [playerOrder, setPlayerOrder] = useState<string[]>(() =>
    players.map((p) => p.id)
  );
  const [orderIndex, setOrderIndex] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState<TodPrompt | null>(null);
  const [roundCount, setRoundCount] = useState(0);
  const [usedPromptIds, setUsedPromptIds] = useState<Set<string>>(new Set());

  // Dedup guard — prevents re-applying the same remote state
  const lastAppliedKeyRef = useRef<string>('');
  // Guard against running init twice
  const didInitRef = useRef(false);
  const hasSavedHistory = useRef(false);

  // Derived: who is playing right now
  const currentPlayerId_turn = playerOrder[orderIndex % playerOrder.length];
  const currentPlayer = players.find((p) => p.id === currentPlayerId_turn) || {
    id: currentPlayerId_turn || 'offline',
    displayName: 'Offline Player',
    avatarColor: '#9CA3AF',
    isReady: false,
    score: 0,
    joinedAt: 0,
    isAdmin: false,
  };
  const isMyTurn = currentPlayerId_turn === currentPlayerId;

  // Is the current player still in the room?
  const isCurrentPlayerPresent = players.some((p) => p.id === currentPlayerId_turn);


  const availablePrompts = SAMPLE_PROMPTS.filter(
    (p) => p.category === category && !usedPromptIds.has(p.id)
  );

  // ---- Push state to RTDB ----
  const pushState = useCallback(
    (newState: TodState) => {
      if (syncGameState) {
        // Cast to satisfy Record<string, unknown>
        syncGameState(newState as unknown as Record<string, unknown>);
      }
    },
    [syncGameState]
  );

  // ---- Subscribe to RTDB game state ----
  useEffect(() => {
    if (!onGameState) return;

    const unsub = onGameState((raw) => {
      const remote = raw as unknown as TodState;
      if (!remote || !remote.playerOrder || remote.playerOrder.length === 0) return;

      // Mark as initialized so admin doesn't overwrite
      didInitRef.current = true;

      const key = todStateKey(remote);
      if (key === lastAppliedKeyRef.current) return;
      lastAppliedKeyRef.current = key;

      // Apply remote state
      setPlayerOrder(remote.playerOrder);
      setOrderIndex(remote.orderIndex);
      setRoundCount(remote.roundCount);
      setPhase(remote.phase);

      if (remote.promptText && remote.promptType) {
        setCurrentPrompt({
          id: remote.promptId ?? 'synced',
          text: remote.promptText,
          type: remote.promptType,
          category,
        });
        if (remote.promptId) {
          setUsedPromptIds((prev) => new Set(prev).add(remote.promptId!));
        }
      } else {
        setCurrentPrompt(null);
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGameState]);

  // ---- Admin: initialise game state on mount ----
  useEffect(() => {
    if (!isAdmin || didInitRef.current) return;
    if (players.length === 0) return; // Wait until players list is loaded
    didInitRef.current = true;

    const shuffled = shuffleArray(players.map((p) => p.id));
    const initial: TodState = {
      phase: 'spinning',
      playerOrder: shuffled,
      orderIndex: 0,
      roundCount: 0,
      promptId: null,
      promptText: null,
      promptType: null,
    };
    // Apply locally too
    setPlayerOrder(shuffled);
    setOrderIndex(0);
    setRoundCount(0);
    setPhase('spinning');
    setCurrentPrompt(null);

    pushState(initial);
  }, [isAdmin, players, pushState]);

  // ---- Admin: clean up players who left ----
  useEffect(() => {
    if (!isAdmin) return;
    if (playerOrder.length === 0 || players.length === 0) return;

    // Check if there are any players in playerOrder who are not in players list
    const missingPlayers = playerOrder.filter(
      (id) => !players.some((p) => p.id === id)
    );

    if (missingPlayers.length > 0) {
      // Find who was the current player before cleanup
      const currentActiveId = playerOrder[orderIndex % playerOrder.length];
      const newPlayerOrder = playerOrder.filter(
        (id) => players.some((p) => p.id === id)
      );

      if (newPlayerOrder.length > 0) {
        let newIndex = newPlayerOrder.indexOf(currentActiveId);
        let nextPhase = phase;
        let nextPromptId = currentPrompt?.id ?? null;
        let nextPromptText = currentPrompt?.text ?? null;
        let nextPromptType = currentPrompt?.type ?? null;

        if (newIndex === -1) {
          // The active player left! Advance to the next available player in original order
          let foundNextId = '';
          for (let i = 1; i <= playerOrder.length; i++) {
            const checkId = playerOrder[(orderIndex + i) % playerOrder.length];
            if (players.some((p) => p.id === checkId)) {
              foundNextId = checkId;
              break;
            }
          }
          if (foundNextId) {
            newIndex = newPlayerOrder.indexOf(foundNextId);
          } else {
            newIndex = 0;
          }
          // Reset phase to spinning for the new active player
          nextPhase = 'spinning';
          nextPromptId = null;
          nextPromptText = null;
          nextPromptType = null;
        }

        setPlayerOrder(newPlayerOrder);
        setOrderIndex(newIndex);
        setPhase(nextPhase);
        if (nextPhase === 'spinning') {
          setCurrentPrompt(null);
        }

        pushState({
          phase: nextPhase,
          playerOrder: newPlayerOrder,
          orderIndex: newIndex,
          roundCount,
          promptId: nextPromptId,
          promptText: nextPromptText,
          promptType: nextPromptType,
        });
      }
    }
  }, [isAdmin, players, playerOrder, orderIndex, phase, currentPrompt, roundCount, pushState]);

  // Save game history once game finishes
  useEffect(() => {
    if (phase !== 'finished' || hasSavedHistory.current) return;
    hasSavedHistory.current = true;

    const saveHistory = async () => {
      try {
        const { historyService } = await import('@/src/services/historyService');
        await historyService.saveGameHistory({
          activityType: 'truth-or-dare',
          roomCode: roomCode,
          score: 0, // No score in ToD
          rank: 1,  // No ranking in ToD
          totalPlayers: players.length,
        });
      } catch (e) {
        console.error('[TruthOrDareGame] Error saving game history:', e);
      }
    };
    saveHistory();
  }, [phase, players.length, roomCode]);

  // ---- Spin animation (runs locally for everyone) ----
  const spinAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (phase !== 'spinning') return;

    spinAnim.setValue(0);
    RNAnimated.timing(spinAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      haptics.medium();

      let didTransition = false;
      setPhase((prev) => {
        if (prev === 'spinning') {
          didTransition = true;
          return 'choosing';
        }
        return prev;
      });

      // Only the acting player (or admin for bot) advances phase in RTDB
      if (didTransition && (isMyTurn || (currentPlayer?.id.startsWith('bot_') && isAdmin))) {
        pushState({
          phase: 'choosing',
          playerOrder,
          orderIndex,
          roundCount,
          promptId: null,
          promptText: null,
          promptType: null,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ---- Fade-in animation when prompt shows ----
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const scaleAnim = useRef(new RNAnimated.Value(0.8)).current;

  useEffect(() => {
    if (phase !== 'prompt') return;
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      RNAnimated.spring(scaleAnim, { toValue: 1, damping: 12, stiffness: 150, useNativeDriver: true }),
    ]).start();
  }, [phase, fadeAnim, scaleAnim]);

  // ---- Select Truth or Dare ----
  const selectTruthOrDare = useCallback(
    (type: 'truth' | 'dare') => {
      haptics.medium();

      const filtered = availablePrompts.filter((p) => p.type === type);
      let selectedPrompt: TodPrompt;
      if (filtered.length === 0) {
        const fallback = SAMPLE_PROMPTS.filter(
          (p) => p.type === type && p.category === category
        );
        selectedPrompt = fallback[Math.floor(Math.random() * fallback.length)];
      } else {
        selectedPrompt = filtered[Math.floor(Math.random() * filtered.length)];
        setUsedPromptIds((prev) => new Set(prev).add(selectedPrompt.id));
      }

      setCurrentPrompt(selectedPrompt);
      setPhase('prompt');

      pushState({
        phase: 'prompt',
        playerOrder,
        orderIndex,
        roundCount,
        promptId: selectedPrompt.id,
        promptText: selectedPrompt.text,
        promptType: selectedPrompt.type,
      });
    },
    [availablePrompts, category, orderIndex, playerOrder, roundCount, pushState]
  );

  // ---- Bot choice simulation (admin only) ----
  useEffect(() => {
    if (!isAdmin || phase !== 'choosing') return;
    if (!currentPlayer?.id.startsWith('bot_')) return;

    const timeout = setTimeout(() => {
      const type = Math.random() < 0.5 ? 'truth' : 'dare';
      selectTruthOrDare(type);
    }, 2000 + Math.random() * 1000);

    return () => clearTimeout(timeout);
  }, [phase, currentPlayer, isAdmin, selectTruthOrDare]);

  // ---- Next Turn ----
  const nextTurn = useCallback(() => {
    const newRound = roundCount + 1;
    if (maxRounds > 0 && newRound > maxRounds) {
      setPhase('finished');
      pushState({
        phase: 'finished',
        playerOrder,
        orderIndex,
        roundCount: newRound,
        promptId: null,
        promptText: null,
        promptType: null,
      });
      return;
    }

    const nextOrderIndex = (orderIndex + 1) % playerOrder.length;
    setRoundCount(newRound);
    setOrderIndex(nextOrderIndex);
    setCurrentPrompt(null);
    setPhase('spinning');
    haptics.light();

    pushState({
      phase: 'spinning',
      playerOrder,
      orderIndex: nextOrderIndex,
      roundCount: newRound,
      promptId: null,
      promptText: null,
      promptType: null,
    });
  }, [roundCount, maxRounds, orderIndex, playerOrder, pushState]);

  // ---- Skip absent player (admin only) ----
  const skipPlayer = useCallback(() => {
    const nextOrderIndex = (orderIndex + 1) % playerOrder.length;
    setOrderIndex(nextOrderIndex);
    setCurrentPrompt(null);
    setPhase('spinning');
    haptics.light();

    pushState({
      phase: 'spinning',
      playerOrder,
      orderIndex: nextOrderIndex,
      roundCount,
      promptId: null,
      promptText: null,
      promptType: null,
    });
  }, [orderIndex, playerOrder, roundCount, pushState]);

  // ---- End Game ----
  const handleFinish = useCallback(() => {
    onActivityEnd({
      scores: players.map((p, i) => ({
        playerId: p.id,
        displayName: p.displayName,
        score: 0,
        rank: i + 1,
      })),
    });
  }, [players, onActivityEnd]);

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (phase === 'finished') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: spacing.xxl }]}>
        <Text style={{ fontSize: 64, marginBottom: spacing.xxl }}>🎉</Text>
        <Text style={[typography.displayMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}>
          Game Over!
        </Text>
        <Text style={[typography.bodyLarge, { color: colors.textSecondary, marginBottom: spacing.xxxl }]}>
          {roundCount} rounds played
        </Text>
        {isAdmin && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: spacing.lg,
                paddingHorizontal: spacing.xxxl,
              },
            ]}
            onPress={handleFinish}
            activeOpacity={0.8}
          >
            <Text style={[typography.titleMedium, { color: colors.textOnPrimary }]}>
              End Game
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.gameContainer, { backgroundColor: colors.background }]}>
      {/* Round counter */}
      <View style={[styles.roundHeader, { padding: spacing.lg }]}>
        <Text style={[typography.labelMedium, { color: colors.textTertiary }]}>
          Round {roundCount + 1}
          {maxRounds > 0 ? ` / ${maxRounds}` : ''}
        </Text>
      </View>

      {/* Current player indicator */}
      <View style={[styles.playerSection, { padding: spacing.xxl }]}>
        <RNAnimated.View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: currentPlayer?.avatarColor ?? colors.primary,
              width: 80,
              height: 80,
              borderRadius: radius.full,
              transform: [{ rotate: phase === 'spinning' ? spinRotation : '0deg' }],
            },
          ]}
        >
          <Text style={[typography.displayMedium, { color: '#FFF' }]}>
            {currentPlayer?.displayName.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </RNAnimated.View>

        <Text
          style={[
            typography.headlineMedium,
            { color: colors.textPrimary, marginTop: spacing.xl, textAlign: 'center' },
          ]}
        >
          {currentPlayer?.displayName ?? 'Unknown'}
          {isMyTurn ? ' (You!)' : "'s turn"}
        </Text>

        {/* Admin: skip if player left the room */}
        {isAdmin && !isCurrentPlayerPresent && (
          <TouchableOpacity
            style={[
              styles.skipButton,
              {
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                borderColor: '#EF4444',
                borderRadius: radius.md,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.xl,
                marginTop: spacing.md,
              },
            ]}
            onPress={skipPlayer}
            activeOpacity={0.8}
          >
            <Text style={[typography.labelMedium, { color: '#EF4444' }]}>
              ⏭ Skip (player left)
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Truth or Dare choice */}
      {phase === 'choosing' && (
        <View style={[styles.choiceSection, { padding: spacing.xxl, gap: spacing.lg }]}>
          <Text
            style={[
              typography.bodyLarge,
              { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
            ]}
          >
            {isMyTurn ? 'Choose your fate!' : `Waiting for ${currentPlayer?.displayName}...`}
          </Text>

          <View style={[styles.choiceRow, { gap: spacing.lg }]}>
            <TouchableOpacity
              style={[
                styles.choiceButton,
                {
                  flex: 1,
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  borderColor: '#3B82F6',
                  borderRadius: radius.xl,
                  paddingVertical: spacing.xxxl,
                  opacity: isMyTurn ? 1 : 0.4,
                },
              ]}
              onPress={() => selectTruthOrDare('truth')}
              activeOpacity={0.7}
              disabled={!isMyTurn}
            >
              <MaterialCommunityIcons name="message-question" size={40} color="#3B82F6" />
              <Text style={[typography.headlineSmall, { color: '#3B82F6', marginTop: spacing.md }]}>
                Truth
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.choiceButton,
                {
                  flex: 1,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderColor: '#EF4444',
                  borderRadius: radius.xl,
                  paddingVertical: spacing.xxxl,
                  opacity: isMyTurn ? 1 : 0.4,
                },
              ]}
              onPress={() => selectTruthOrDare('dare')}
              activeOpacity={0.7}
              disabled={!isMyTurn}
            >
              <MaterialCommunityIcons name="fire" size={40} color="#EF4444" />
              <Text style={[typography.headlineSmall, { color: '#EF4444', marginTop: spacing.md }]}>
                Dare
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Prompt display */}
      {phase === 'prompt' && currentPrompt && (
        <RNAnimated.View
          style={[
            styles.promptSection,
            {
              padding: spacing.xxl,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View
            style={[
              styles.promptCard,
              {
                backgroundColor:
                  currentPrompt.type === 'truth'
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'rgba(239, 68, 68, 0.1)',
                borderColor: currentPrompt.type === 'truth' ? '#3B82F6' : '#EF4444',
                borderRadius: radius.xl,
                padding: spacing.xxl,
              },
            ]}
          >
            <View style={[styles.promptBadge, { marginBottom: spacing.xl }]}>
              <MaterialCommunityIcons
                name={currentPrompt.type === 'truth' ? 'message-question' : 'fire'}
                size={24}
                color={currentPrompt.type === 'truth' ? '#3B82F6' : '#EF4444'}
              />
              <Text
                style={[
                  typography.labelLarge,
                  {
                    color: currentPrompt.type === 'truth' ? '#3B82F6' : '#EF4444',
                    marginLeft: spacing.sm,
                  },
                ]}
              >
                {currentPlayer?.displayName}{"'s"} {currentPrompt.type.toUpperCase()}
              </Text>
            </View>

            <Text
              style={[
                typography.headlineMedium,
                { color: colors.textPrimary, textAlign: 'center', lineHeight: 36 },
              ]}
            >
              {currentPrompt.text}
            </Text>
          </View>

          {/* Next turn / waiting */}
          {isMyTurn || (currentPlayer?.id.startsWith('bot_') && isAdmin) ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  paddingVertical: spacing.lg,
                  paddingHorizontal: spacing.xxxl,
                  marginTop: spacing.xxl,
                },
              ]}
              onPress={nextTurn}
              activeOpacity={0.8}
            >
              <Text style={[typography.titleMedium, { color: colors.textOnPrimary }]}>
                Next Turn →
              </Text>
            </TouchableOpacity>
          ) : (
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: colors.textTertiary,
                  marginTop: spacing.xxl,
                  fontStyle: 'italic',
                  textAlign: 'center',
                },
              ]}
            >
              Waiting for {currentPlayer?.displayName} to complete their turn... ⌛
            </Text>
          )}

          {/* Admin: end game early */}
          {isAdmin && (
            <TouchableOpacity
              style={{ marginTop: spacing.lg }}
              onPress={() => {
                setPhase('finished');
                pushState({
                  phase: 'finished',
                  playerOrder,
                  orderIndex,
                  roundCount,
                  promptId: null,
                  promptText: null,
                  promptType: null,
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={[typography.bodyMedium, { color: colors.textTertiary }]}>
                End Game
              </Text>
            </TouchableOpacity>
          )}
        </RNAnimated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameContainer: {
    flex: 1,
  },
  roundHeader: {
    alignItems: 'center',
  },
  playerSection: {
    alignItems: 'center',
  },
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    borderWidth: 1,
  },
  choiceSection: {
    flex: 1,
  },
  choiceRow: {
    flexDirection: 'row',
  },
  choiceButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  promptSection: {
    flex: 1,
    alignItems: 'center',
  },
  promptCard: {
    width: '100%',
    borderWidth: 1.5,
    alignItems: 'center',
  },
  promptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
  },
});
