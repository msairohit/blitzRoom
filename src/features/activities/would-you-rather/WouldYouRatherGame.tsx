/**
 * Would You Rather — Multiplayer Game Component
 * Features simultaneous secret voting, live status indicators, animated reveal bars,
 * majority/minority scoring engines, bot simulation, and end-game superlatives.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import type { ActivityGameProps, ActivityResults, GameEvent } from '@/src/types/activity';
import type {
  Dilemma,
  WouldYouRatherCategory,
  WouldYouRatherMode,
  WouldYouRatherPhase,
  WouldYouRatherSyncState,
} from './types';
import { getDilemmaPool } from './data';
import { haptics } from '@/src/utils/haptics';
import { roomService } from '@/src/services/roomService';

export function WouldYouRatherGame({
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
}: ActivityGameProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const category = (settings.category as WouldYouRatherCategory | 'all') ?? 'all';
  const mode = (settings.mode as WouldYouRatherMode) ?? 'majority';
  const rounds = (settings.rounds as number) ?? 8;
  const timePerDilemma = (settings.timePerDilemma as number) ?? 15;
  const autoAdvance = (settings.autoAdvance as boolean) ?? true;
  const customDilemmas = (settings.customDilemmas as Dilemma[]) ?? [];

  // ==========================================
  // State
  // ==========================================
  const [phase, setPhase] = useState<WouldYouRatherPhase>('countdown');
  const [countdownVal, setCountdownVal] = useState(3);
  const [dilemmas, setDilemmas] = useState<Dilemma[]>([]);
  const [dilemmaIndex, setDilemmaIndex] = useState(0);
  const [votes, setVotes] = useState<Record<string, 'A' | 'B'>>({});
  const [myVote, setMyVote] = useState<'A' | 'B' | null>(null);
  const [timeLeft, setTimeLeft] = useState(timePerDilemma);
  const [revealTimer, setRevealTimer] = useState(6);
  const [isTimerPaused, setIsTimerPaused] = useState(!autoAdvance);

  // Superlative statistics tracking across all rounds
  const [majorityPicks, setMajorityPicks] = useState<Record<string, number>>({});
  const [minorityPicks, setMinorityPicks] = useState<Record<string, number>>({});

  // Refs for timers & dedup
  const didInitRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSavedHistory = useRef(false);
  const lastSyncIdRef = useRef('');
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const barAnimA = useRef(new RNAnimated.Value(0)).current;
  const barAnimB = useRef(new RNAnimated.Value(0)).current;
  const dilemmaIndexRef = useRef(dilemmaIndex);
  const isTimerPausedRef = useRef(isTimerPaused);
  const revealTimerRef = useRef(revealTimer);
  const phaseRef = useRef(phase);
  const votesRef = useRef(votes);
  const dilemmasRef = useRef(dilemmas);
  const triggerRevealRef = useRef<() => void>(() => {});
  const handleNextDilemmaRef = useRef<() => void>(() => {});

  useEffect(() => {
    dilemmaIndexRef.current = dilemmaIndex;
  }, [dilemmaIndex]);

  useEffect(() => {
    isTimerPausedRef.current = isTimerPaused;
  }, [isTimerPaused]);

  useEffect(() => {
    revealTimerRef.current = revealTimer;
  }, [revealTimer]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    votesRef.current = votes;
  }, [votes]);

  useEffect(() => {
    dilemmasRef.current = dilemmas;
  }, [dilemmas]);

  // Active dilemma
  const currentDilemma = dilemmas[dilemmaIndex] || null;

  // Active players list
  const activePlayers = useMemo(() => players.filter((p) => !p.isOffline), [players]);

  // Total votes cast this round
  const votesCount = Object.keys(votes).length;
  const allVoted = activePlayers.length > 0 && votesCount >= activePlayers.length;

  // ==========================================
  // Push Shared State (Admin Only)
  // ==========================================
  const pushSyncState = useCallback(
    (newState: Partial<WouldYouRatherSyncState>) => {
      if (!isAdmin || !syncGameState) return;

      const fullState: WouldYouRatherSyncState = {
        phase: newState.phase ?? phaseRef.current,
        dilemmaIndex: newState.dilemmaIndex !== undefined ? newState.dilemmaIndex : dilemmaIndexRef.current,
        votes: newState.votes ?? votesRef.current,
        dilemmas: newState.dilemmas ?? dilemmasRef.current,
        roundStartTime: newState.roundStartTime ?? Date.now(),
        roundCount: rounds,
        syncId: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        isTimerPaused: newState.isTimerPaused !== undefined ? newState.isTimerPaused : isTimerPausedRef.current,
        revealTimer: newState.revealTimer !== undefined ? newState.revealTimer : revealTimerRef.current,
        ...newState,
      };

      lastSyncIdRef.current = fullState.syncId;
      syncGameState(fullState as unknown as Record<string, unknown>);
    },
    [isAdmin, syncGameState, rounds]
  );

  // ==========================================
  // Initialize Dilemmas (Admin)
  // ==========================================
  useEffect(() => {
    if (didInitRef.current) return;

    if (isAdmin) {
      didInitRef.current = true;
      const initialPool = getDilemmaPool(category, rounds, customDilemmas);
      setDilemmas(initialPool);
      dilemmasRef.current = initialPool;

      pushSyncState({
        phase: 'countdown',
        dilemmas: initialPool,
        dilemmaIndex: 0,
        votes: {},
        isTimerPaused: !autoAdvance,
      });
    }
  }, [isAdmin, category, rounds, customDilemmas, autoAdvance, pushSyncState]);

  // ==========================================
  // Subscribe to Shared Game State (RTDB Fast Path)
  // ==========================================
  useEffect(() => {
    if (!onGameState) return;

    const unsub = onGameState((raw) => {
      const remote = raw as unknown as WouldYouRatherSyncState;
      if (!remote || !remote.dilemmas || remote.dilemmas.length === 0) return;

      didInitRef.current = true;
      if (remote.syncId && remote.syncId === lastSyncIdRef.current) return;
      lastSyncIdRef.current = remote.syncId;

      setDilemmas(remote.dilemmas);
      dilemmasRef.current = remote.dilemmas;

      const isNewDilemma = remote.dilemmaIndex !== dilemmaIndexRef.current;
      if (isNewDilemma) {
        dilemmaIndexRef.current = remote.dilemmaIndex;
        setDilemmaIndex(remote.dilemmaIndex);
        setVotes({});
        votesRef.current = {};
        setMyVote(null);
        setTimeLeft(timePerDilemma);
      }

      if (remote.phase !== phaseRef.current) {
        phaseRef.current = remote.phase;
        setPhase(remote.phase);
        if (remote.phase === 'voting') {
          setTimeLeft(timePerDilemma);
          setRevealTimer(6);
          revealTimerRef.current = 6;
          setIsTimerPaused(false);
          isTimerPausedRef.current = false;
          setCountdownVal(0);
        } else if (remote.phase === 'reveal') {
          const revTime = typeof remote.revealTimer === 'number' ? remote.revealTimer : 6;
          setRevealTimer(revTime);
          revealTimerRef.current = revTime;
          const paused = Boolean(remote.isTimerPaused);
          setIsTimerPaused(paused);
          isTimerPausedRef.current = paused;
        }
      } else if (remote.phase === 'reveal') {
        if (remote.isTimerPaused !== undefined) {
          setIsTimerPaused(remote.isTimerPaused);
          isTimerPausedRef.current = remote.isTimerPaused;
        }
        if (typeof remote.revealTimer === 'number') {
          setRevealTimer(remote.revealTimer);
          revealTimerRef.current = remote.revealTimer;
        }
      }

      const remoteVotes = remote.votes || {};
      setVotes(remoteVotes);
      votesRef.current = remoteVotes;

      // If this is a fresh dilemma, in countdown, or remote.votes does not have our vote,
      // myVote MUST be reset to null so options are never locked in by default!
      if (isNewDilemma || remote.phase === 'countdown' || !remoteVotes[currentPlayerId]) {
        setMyVote(null);
      } else {
        setMyVote(remoteVotes[currentPlayerId]);
      }
    });

    return unsub;
  }, [onGameState, currentPlayerId, timePerDilemma]);

  // ==========================================
  // Subscribe to Player Broadcast Events (Votes, Pause, Next)
  // ==========================================
  useEffect(() => {
    if (!onGameEvent) return;

    const unsub = onGameEvent((event: GameEvent) => {
      if (event.type === 'WYR_VOTE') {
        const { playerId, dilemmaIdx, choice } = event.payload as {
          playerId: string;
          dilemmaIdx: number;
          choice: 'A' | 'B';
        };

        if (dilemmaIdx === dilemmaIndexRef.current) {
          setVotes((prev) => {
            const next = { ...prev, [playerId]: choice };
            votesRef.current = next;
            // If Admin, sync updated votes to RTDB
            if (isAdmin) {
              pushSyncState({ votes: next });
            }
            return next;
          });
        }
      } else if (event.type === 'WYR_TRIGGER_REVEAL') {
        const { isTimerPaused: paused } = event.payload as { isTimerPaused?: boolean };
        setPhase('reveal');
        phaseRef.current = 'reveal';
        setRevealTimer(6);
        revealTimerRef.current = 6;
        setIsTimerPaused(Boolean(paused));
        isTimerPausedRef.current = Boolean(paused);
      } else if (event.type === 'WYR_PAUSE_REVEAL') {
        const { isPaused, revealTimer: nextTimer } = event.payload as {
          isPaused: boolean;
          revealTimer?: number;
        };
        setIsTimerPaused(isPaused);
        isTimerPausedRef.current = isPaused;
        if (typeof nextTimer === 'number') {
          setRevealTimer(nextTimer);
          revealTimerRef.current = nextTimer;
        }
      } else if (event.type === 'WYR_NEXT_DILEMMA') {
        const { dilemmaIndex: nextIdx } = event.payload as {
          dilemmaIndex: number;
        };
        dilemmaIndexRef.current = nextIdx;
        setDilemmaIndex(nextIdx);
        setVotes({});
        votesRef.current = {};
        setMyVote(null);
        setTimeLeft(timePerDilemma);
        setPhase('voting');
        phaseRef.current = 'voting';
        setIsTimerPaused(false);
        isTimerPausedRef.current = false;
        setRevealTimer(6);
        revealTimerRef.current = 6;
        setCountdownVal(0);
      }
    });

    return unsub;
  }, [onGameEvent, isAdmin, timePerDilemma, pushSyncState]);

  // ==========================================
  // Countdown Phase Timer
  // ==========================================
  useEffect(() => {
    if (phase !== 'countdown') return;

    const interval = setInterval(() => {
      setCountdownVal((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isAdmin) {
            pushSyncState({
              phase: 'voting',
              dilemmaIndex: 0,
              votes: {},
            });
          }
          setPhase('voting');
          phaseRef.current = 'voting';
          setMyVote(null);
          setVotes({});
          votesRef.current = {};
          setTimeLeft(timePerDilemma);
          return 0;
        }
        haptics.light();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, isAdmin, timePerDilemma, pushSyncState]);

  // ==========================================
  // Voting Timer (Monotonic 1-second countdown)
  // ==========================================
  useEffect(() => {
    if (phase !== 'voting') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    setTimeLeft(timePerDilemma);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (isAdmin) {
            triggerRevealRef.current();
          }
          return 0;
        }

        const next = prev - 1;
        if (next <= 4 && next > 0) {
          haptics.light();
          RNAnimated.sequence([
            RNAnimated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 120,
              useNativeDriver: Platform.OS !== 'web',
            }),
            RNAnimated.timing(pulseAnim, {
              toValue: 1,
              duration: 120,
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]).start();
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, dilemmaIndex, timePerDilemma, isAdmin, pulseAnim]);

  // Auto trigger reveal if everyone voted
  useEffect(() => {
    if (phase === 'voting' && allVoted && isAdmin) {
      const timeout = setTimeout(() => {
        triggerRevealRef.current();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [phase, allVoted, isAdmin]);

  // ==========================================
  // Simulated Bots Loop (Admin Only)
  // ==========================================
  useEffect(() => {
    if (!isAdmin || phase !== 'voting') return;

    const bots = players.filter((p) => p.id.startsWith('bot_'));
    if (bots.length === 0) return;

    const botTimers = bots.map((bot) => {
      const minDelay = Math.max(1500, timePerDilemma * 1000 * 0.2);
      const maxDelay = Math.max(minDelay + 1000, timePerDilemma * 1000 * 0.7);
      const delay = minDelay + Math.random() * (maxDelay - minDelay);

      return setTimeout(() => {
        const choice: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';
        setVotes((prev) => {
          if (prev[bot.id]) return prev;
          const next = { ...prev, [bot.id]: choice };
          votesRef.current = next;
          pushSyncState({ votes: next });
          return next;
        });
      }, delay);
    });

    return () => {
      botTimers.forEach((t) => clearTimeout(t));
    };
  }, [phase, dilemmaIndex, isAdmin, players.length, timePerDilemma, pushSyncState]);

  // ==========================================
  // Trigger Reveal & Calculate Results
  // ==========================================
  const triggerReveal = useCallback(() => {
    haptics.heavy();
    setPhase('reveal');
    phaseRef.current = 'reveal';
    setRevealTimer(6);
    revealTimerRef.current = 6;
    const initialPaused = !autoAdvance;
    setIsTimerPaused(initialPaused);
    isTimerPausedRef.current = initialPaused;

    if (broadcastEvent) {
      broadcastEvent({
        type: 'WYR_TRIGGER_REVEAL',
        senderId: currentPlayerId,
        payload: { isTimerPaused: initialPaused },
        timestamp: Date.now(),
      });
    }

    if (isAdmin) {
      pushSyncState({
        phase: 'reveal',
        isTimerPaused: initialPaused,
        revealTimer: 6,
      });

      const currentVotes = votesRef.current;
      // Compute majority & award points
      const countA = Object.values(currentVotes).filter((v) => v === 'A').length;
      const countB = Object.values(currentVotes).filter((v) => v === 'B').length;

      let winningChoice: 'A' | 'B' | 'TIE' = 'TIE';
      if (countA > countB) {
        winningChoice = mode === 'minority' ? 'B' : 'A';
      } else if (countB > countA) {
        winningChoice = mode === 'minority' ? 'A' : 'B';
      }

      // Track superlative records
      if (countA !== countB) {
        const majChoice = countA > countB ? 'A' : 'B';
        const minChoice = countA > countB ? 'B' : 'A';

        setMajorityPicks((prev) => {
          const next = { ...prev };
          Object.entries(currentVotes).forEach(([pId, choice]) => {
            if (choice === majChoice) next[pId] = (next[pId] || 0) + 1;
          });
          return next;
        });

        setMinorityPicks((prev) => {
          const next = { ...prev };
          Object.entries(currentVotes).forEach(([pId, choice]) => {
            if (choice === minChoice) next[pId] = (next[pId] || 0) + 1;
          });
          return next;
        });
      }

      if (mode !== 'party' && winningChoice !== 'TIE') {
        Object.entries(currentVotes).forEach(([pId, choice]) => {
          if (choice === winningChoice) {
            roomService.updatePlayerScore(roomId, pId, 100).catch(console.error);
          }
        });
      }
    }
  }, [isAdmin, mode, roomId, autoAdvance, broadcastEvent, currentPlayerId, pushSyncState]);

  triggerRevealRef.current = triggerReveal;

  // ==========================================
  // Toggle Pause Timer for Discussion (Admin Only)
  // ==========================================
  const handleTogglePauseTimer = useCallback(() => {
    if (!isAdmin) return;
    haptics.medium();
    const nextVal = !isTimerPaused;
    setIsTimerPaused(nextVal);
    isTimerPausedRef.current = nextVal;

    let nextReveal = revealTimer;
    // If resuming and timer was low, give at least 5s countdown buffer
    if (!nextVal && revealTimer <= 2) {
      nextReveal = 5;
    }
    setRevealTimer(nextReveal);
    revealTimerRef.current = nextReveal;

    if (broadcastEvent) {
      broadcastEvent({
        type: 'WYR_PAUSE_REVEAL',
        senderId: currentPlayerId,
        payload: { isPaused: nextVal, revealTimer: nextReveal },
        timestamp: Date.now(),
      });
    }

    pushSyncState({ isTimerPaused: nextVal, revealTimer: nextReveal });
  }, [isAdmin, isTimerPaused, revealTimer, broadcastEvent, currentPlayerId, pushSyncState]);

  // ==========================================
  // Animate Reveal Bars
  // ==========================================
  useEffect(() => {
    if (phase !== 'reveal') {
      barAnimA.setValue(0);
      barAnimB.setValue(0);
      return;
    }

    const countA = Object.values(votes).filter((v) => v === 'A').length;
    const countB = Object.values(votes).filter((v) => v === 'B').length;
    const total = Math.max(1, countA + countB);

    const targetA = countA / total;
    const targetB = countB / total;

    RNAnimated.parallel([
      RNAnimated.timing(barAnimA, {
        toValue: targetA,
        duration: 800,
        useNativeDriver: false,
      }),
      RNAnimated.timing(barAnimB, {
        toValue: targetB,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();
  }, [phase, votes, barAnimA, barAnimB]);

  const handleNextDilemma = useCallback(() => {
    if (!isAdmin) return;

    const currentIdx = dilemmaIndexRef.current;
    if (currentIdx < dilemmas.length - 1) {
      const nextIdx = currentIdx + 1;
      dilemmaIndexRef.current = nextIdx;
      setDilemmaIndex(nextIdx);
      setVotes({});
      votesRef.current = {};
      setMyVote(null);
      setTimeLeft(timePerDilemma);
      setPhase('voting');
      phaseRef.current = 'voting';
      setIsTimerPaused(false);
      isTimerPausedRef.current = false;
      setRevealTimer(6);
      revealTimerRef.current = 6;

      if (broadcastEvent) {
        broadcastEvent({
          type: 'WYR_NEXT_DILEMMA',
          senderId: currentPlayerId,
          payload: {
            dilemmaIndex: nextIdx,
          },
          timestamp: Date.now(),
        });
      }

      pushSyncState({
        phase: 'voting',
        dilemmaIndex: nextIdx,
        votes: {},
        isTimerPaused: false,
        revealTimer: 6,
      });
    } else {
      setPhase('finished');
      phaseRef.current = 'finished';
      pushSyncState({ phase: 'finished' });
      // Mark all players as done
      players.forEach((p) => {
        roomService.updatePlayer(roomId, p.id, { isDone: true }).catch(console.error);
      });
    }
  }, [isAdmin, dilemmas.length, timePerDilemma, players, roomId, currentPlayerId, broadcastEvent, pushSyncState]);

  handleNextDilemmaRef.current = handleNextDilemma;

  // ==========================================
  // Reveal Timer Countdown & Auto-Advance
  // ==========================================
  useEffect(() => {
    if (phase !== 'reveal') {
      setRevealTimer(6);
      revealTimerRef.current = 6;
      return;
    }

    if (isTimerPaused) {
      return;
    }

    const interval = setInterval(() => {
      setRevealTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isAdmin) {
            handleNextDilemmaRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, isTimerPaused, isAdmin]);

  // ==========================================
  // Save Game History When Finished
  // ==========================================
  useEffect(() => {
    if (phase !== 'finished' || hasSavedHistory.current) return;
    hasSavedHistory.current = true;

    const sortedScores = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const myRank = sortedScores.findIndex((p) => p.id === currentPlayerId) + 1;
    const myCurrentScore = players.find((p) => p.id === currentPlayerId)?.score ?? 0;

    const saveHistory = async () => {
      try {
        const { historyService } = await import('@/src/services/historyService');
        await historyService.saveGameHistory({
          activityType: 'would-you-rather',
          roomCode: roomCode,
          score: myCurrentScore,
          rank: myRank,
          totalPlayers: players.length,
        });
      } catch (e) {
        console.error('[WouldYouRatherGame] Error saving game history:', e);
      }
    };
    saveHistory();
  }, [phase, players, currentPlayerId, roomCode]);

  // ==========================================
  // Handle Player Vote
  // ==========================================
  const handleVote = (choice: 'A' | 'B') => {
    if (myVote !== null || phase !== 'voting') return;

    haptics.medium();
    setMyVote(choice);

    setVotes((prev) => {
      const next = { ...prev, [currentPlayerId]: choice };
      votesRef.current = next;

      // Broadcast to room
      broadcastEvent({
        type: 'WYR_VOTE',
        senderId: currentPlayerId,
        payload: {
          playerId: currentPlayerId,
          dilemmaIdx: dilemmaIndex,
          choice,
        },
        timestamp: Date.now(),
      });

      if (isAdmin) {
        pushSyncState({ votes: next });
      }

      return next;
    });
  };

  // ==========================================
  // End Activity & Cleanup
  // ==========================================
  const handleEndGame = () => {
    haptics.success();
    const sortedScores = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const results: ActivityResults = {
      scores: sortedScores.map((p, idx) => ({
        playerId: p.id,
        displayName: p.displayName,
        score: p.score ?? 0,
        rank: idx + 1,
      })),
      metadata: {
        category,
        mode,
        totalRounds: dilemmas.length,
      },
    };
    onActivityEnd(results);
  };

  // ==========================================
  // Render: 1. Countdown Phase
  // ==========================================
  if (phase === 'countdown') {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <Text style={[typography.labelLarge, { color: colors.textSecondary, letterSpacing: 2, marginBottom: spacing.md }]}>
          GET READY FOR
        </Text>
        <Text style={[typography.headlineLarge, { color: colors.primary, fontWeight: 'bold', textAlign: 'center', marginBottom: spacing.xxl }]}>
          Would You Rather?
        </Text>
        <View style={[styles.countdownCircle, { borderColor: colors.primary, backgroundColor: colors.primaryMuted }]}>
          <Text style={[typography.displayLarge, { color: colors.primary, fontWeight: '900' }]}>
            {countdownVal}
          </Text>
        </View>
        <Text style={[typography.bodyMedium, { color: colors.textTertiary, marginTop: spacing.xl }]}>
          {mode === 'majority' ? '👥 Majority Rules (+100 pts)' : mode === 'minority' ? '🔥 Minority Rebel (+100 pts)' : '🥳 Casual Party Fun'}
        </Text>
      </View>
    );
  }

  // ==========================================
  // Render: 2. Finished Phase (Leaderboard & Superlatives)
  // ==========================================
  if (phase === 'finished') {
    const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    // Find Hive Mind (most majority votes) & Lone Wolf (most minority votes)
    let hiveMindId = '';
    let maxMaj = 0;
    Object.entries(majorityPicks).forEach(([pId, count]) => {
      if (count > maxMaj) {
        maxMaj = count;
        hiveMindId = pId;
      }
    });

    let loneWolfId = '';
    let maxMin = 0;
    Object.entries(minorityPicks).forEach(([pId, count]) => {
      if (count > maxMin) {
        maxMin = count;
        loneWolfId = pId;
      }
    });

    const hivePlayer = players.find((p) => p.id === hiveMindId);
    const wolfPlayer = players.find((p) => p.id === loneWolfId);

    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', marginVertical: spacing.xl }}>
          <Text style={{ fontSize: 48, marginBottom: spacing.xs }}>🏆</Text>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: 'bold' }]}>
            Game Complete!
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
            {dilemmas.length} dilemmas answered
          </Text>
        </View>

        {/* Superlative Badges */}
        <View style={[styles.superlativeRow, { gap: spacing.md, marginBottom: spacing.xl }]}>
          {hivePlayer && (
            <View style={[styles.superlativeCard, { backgroundColor: colors.surface, borderColor: '#F59E0B', borderRadius: radius.lg, padding: spacing.md, flex: 1 }]}>
              <Text style={{ fontSize: 24, textAlign: 'center' }}>🐝</Text>
              <Text style={[typography.titleSmall, { color: '#F59E0B', textAlign: 'center', fontWeight: 'bold', marginTop: 4 }]}>
                Hive Mind
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textPrimary, textAlign: 'center', fontWeight: '600' }]} numberOfLines={1}>
                {hivePlayer.displayName}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textTertiary, textAlign: 'center', fontSize: 10 }]}>
                {maxMaj} with majority
              </Text>
            </View>
          )}

          {wolfPlayer && (
            <View style={[styles.superlativeCard, { backgroundColor: colors.surface, borderColor: '#EC4899', borderRadius: radius.lg, padding: spacing.md, flex: 1 }]}>
              <Text style={{ fontSize: 24, textAlign: 'center' }}>🐺</Text>
              <Text style={[typography.titleSmall, { color: '#EC4899', textAlign: 'center', fontWeight: 'bold', marginTop: 4 }]}>
                Lone Wolf
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textPrimary, textAlign: 'center', fontWeight: '600' }]} numberOfLines={1}>
                {wolfPlayer.displayName}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textTertiary, textAlign: 'center', fontSize: 10 }]}>
                {maxMin} bold rebel picks
              </Text>
            </View>
          )}
        </View>

        {/* Final Standings */}
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}>
          Leaderboard
        </Text>
        <View style={{ gap: spacing.sm, marginBottom: spacing.xxl }}>
          {sorted.map((player, idx) => {
            const isMe = player.id === currentPlayerId;
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            return (
              <View
                key={player.id}
                style={[
                  styles.leaderboardRow,
                  {
                    backgroundColor: isMe ? colors.primaryMuted : colors.surface,
                    borderColor: isMe ? colors.primary : colors.borderLight,
                    borderRadius: radius.md,
                    padding: spacing.md,
                  },
                ]}
              >
                <Text style={{ fontSize: 20, width: 36, textAlign: 'center' }}>{medal}</Text>
                <View style={[styles.avatarDot, { backgroundColor: player.avatarColor || colors.primary }]} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[typography.titleSmall, { color: colors.textPrimary, fontWeight: 'bold' }]}>
                    {player.displayName} {isMe && '(You)'}
                  </Text>
                </View>
                <Text style={[typography.titleMedium, { color: colors.primary, fontWeight: 'bold' }]}>
                  {player.score ?? 0} pts
                </Text>
              </View>
            );
          })}
        </View>

        {/* End Button */}
        {isAdmin ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md }]}
            onPress={handleEndGame}
          >
            <Text style={[typography.titleMedium, { color: '#FFFFFF', textAlign: 'center', fontWeight: 'bold' }]}>
              Finish & Return to Lobby
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[typography.bodyMedium, { color: colors.textTertiary, textAlign: 'center' }]}>
            Waiting for host to end room...
          </Text>
        )}
      </ScrollView>
    );
  }

  // ==========================================
  // Render: 3. Voting & Reveal Screen
  // ==========================================
  if (!currentDilemma) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <Text style={[typography.titleMedium, { color: colors.textSecondary }]}>Loading Dilemma...</Text>
      </View>
    );
  }

  const countA = Object.values(votes).filter((v) => v === 'A').length;
  const countB = Object.values(votes).filter((v) => v === 'B').length;
  const totalVotes = Math.max(1, countA + countB);
  const pctA = Math.round((countA / totalVotes) * 100);
  const pctB = Math.round((countB / totalVotes) * 100);

  const isMajorityA = countA > countB;
  const isMajorityB = countB > countA;
  const isTie = countA === countB;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }]}>
        <View style={styles.roundBadge}>
          <Text style={[typography.labelMedium, { color: colors.textSecondary, fontWeight: 'bold' }]}>
            Dilemma {dilemmaIndex + 1}/{dilemmas.length}
          </Text>
        </View>

        {/* Timer or Status */}
        {phase === 'voting' ? (
          <RNAnimated.View
            style={[
              styles.timerPill,
              {
                backgroundColor: timeLeft <= 4 ? colors.error : colors.surfaceElevated,
                borderColor: timeLeft <= 4 ? colors.error : colors.borderLight,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <MaterialCommunityIcons
              name="clock-outline"
              size={16}
              color={timeLeft <= 4 ? '#FFFFFF' : colors.primary}
            />
            <Text
              style={[
                typography.titleSmall,
                {
                  color: timeLeft <= 4 ? '#FFFFFF' : colors.textPrimary,
                  fontWeight: 'bold',
                  marginLeft: 4,
                },
              ]}
            >
              {timeLeft}s
            </Text>
          </RNAnimated.View>
        ) : (
          <TouchableOpacity
            style={[
              styles.timerPill,
              {
                backgroundColor: isTimerPaused ? '#FEF3C7' : colors.primaryMuted,
                borderColor: isTimerPaused ? '#F59E0B' : colors.primary,
              },
            ]}
            onPress={isAdmin ? handleTogglePauseTimer : undefined}
            activeOpacity={isAdmin ? 0.7 : 1}
          >
            <MaterialCommunityIcons
              name={isTimerPaused ? 'pause-circle' : 'timer-sand'}
              size={16}
              color={isTimerPaused ? '#D97706' : colors.primary}
            />
            <Text
              style={[
                typography.labelMedium,
                {
                  color: isTimerPaused ? '#B45309' : colors.primary,
                  fontWeight: 'bold',
                  marginLeft: 4,
                },
              ]}
            >
              {isTimerPaused ? 'Discussion (Paused)' : `Next in ${revealTimer}s`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Title */}
        <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: 'bold', textAlign: 'center' }]}>
            Would You Rather...
          </Text>
          {phase === 'voting' && (
            <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: 4 }]}>
              {myVote ? 'Choice locked in! Waiting for others...' : 'Tap your choice below!'}
            </Text>
          )}
        </View>

        {/* Group Discussion Banner on Reveal */}
        {phase === 'reveal' && (
          <View
            style={[
              styles.discussionBanner,
              {
                backgroundColor: isTimerPaused ? '#FEF3C7' : colors.surfaceElevated,
                borderColor: isTimerPaused ? '#F59E0B' : colors.borderLight,
                borderRadius: radius.md,
                padding: spacing.sm + 4,
                marginBottom: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
              },
            ]}
          >
            <Text style={{ fontSize: 20, marginRight: 8 }}>{isTimerPaused ? '⏸️' : '💬'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[typography.titleSmall, { color: isTimerPaused ? '#92400E' : colors.textPrimary, fontWeight: 'bold' }]}>
                {isTimerPaused ? 'Group Discussion Mode (Timer Paused)' : `Debate & Discuss! Next in ${revealTimer}s`}
              </Text>
              <Text style={[typography.bodySmall, { color: isTimerPaused ? '#B45309' : colors.textSecondary, fontSize: 11 }]}>
                {isTimerPaused
                  ? isAdmin
                    ? 'Take your time to discuss. Tap "Resume Timer" or "Next Dilemma" when done.'
                    : 'The room creator paused the timer for group discussion!'
                  : isAdmin
                    ? 'Want to discuss? Tap "Pause Timer" below anytime.'
                    : 'Get ready for the next dilemma...'}
              </Text>
            </View>
          </View>
        )}

        {/* Option A Card */}
        <TouchableOpacity
          style={[
            styles.dilemmaCard,
            {
              backgroundColor: myVote === 'A' ? '#1E3A8A' : colors.surface,
              borderColor: myVote === 'A' ? '#3B82F6' : phase === 'reveal' && isMajorityA ? '#3B82F6' : colors.borderLight,
              borderWidth: myVote === 'A' || (phase === 'reveal' && isMajorityA) ? 2.5 : 1,
              borderRadius: radius.xl,
              padding: spacing.lg,
              marginBottom: spacing.md,
            },
          ]}
          onPress={() => handleVote('A')}
          disabled={myVote !== null || phase !== 'voting'}
          activeOpacity={0.8}
        >
          <View style={styles.cardTopRow}>
            <View style={[styles.choiceBadge, { backgroundColor: '#3B82F6' }]}>
              <Text style={[typography.labelMedium, { color: '#FFFFFF', fontWeight: 'bold' }]}>
                OPTION A
              </Text>
            </View>
            {currentDilemma.iconA && (
              <MaterialCommunityIcons name={currentDilemma.iconA as any} size={28} color="#60A5FA" />
            )}
          </View>

          <Text style={[typography.titleMedium, { color: colors.textPrimary, marginVertical: spacing.md, fontWeight: '600', lineHeight: 24 }]}>
            {currentDilemma.optionA}
          </Text>

          {/* Reveal details */}
          {phase === 'reveal' && (
            <View style={styles.revealBox}>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceElevated, borderRadius: radius.full }]}>
                <RNAnimated.View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: '#3B82F6',
                      borderRadius: radius.full,
                      width: barAnimA.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <View style={styles.revealStats}>
                <Text style={[typography.titleSmall, { color: '#60A5FA', fontWeight: 'bold' }]}>
                  {pctA}% ({countA} votes)
                </Text>
                {isMajorityA && (
                  <Text style={[typography.labelSmall, { color: '#34D399', fontWeight: 'bold' }]}>
                    {mode === 'minority' ? 'Underdog Pick' : '👑 Majority!'}
                  </Text>
                )}
              </View>

              {/* Avatars of players who voted A */}
              <View style={styles.voterAvatarsRow}>
                {Object.entries(votes)
                  .filter(([_, choice]) => choice === 'A')
                  .map(([pId]) => {
                    const player = players.find((p) => p.id === pId);
                    if (!player) return null;
                    return (
                      <View key={pId} style={[styles.voterChip, { backgroundColor: colors.surfaceElevated }]}>
                        <View style={[styles.miniDot, { backgroundColor: player.avatarColor || colors.primary }]} />
                        <Text style={[typography.labelSmall, { color: colors.textPrimary, fontSize: 10, marginLeft: 4 }]} numberOfLines={1}>
                          {player.displayName}
                        </Text>
                      </View>
                    );
                  })}
              </View>
            </View>
          )}

          {myVote === 'A' && phase === 'voting' && (
            <View style={styles.lockedRow}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#60A5FA" />
              <Text style={[typography.labelMedium, { color: '#60A5FA', fontWeight: 'bold', marginLeft: 6 }]}>
                Your Selection
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* OR Divider */}
        <View style={styles.orDivider}>
          <View style={[styles.orLine, { backgroundColor: colors.borderLight }]} />
          <View style={[styles.orBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
            <Text style={[typography.labelSmall, { color: colors.textSecondary, fontWeight: '900' }]}>
              OR
            </Text>
          </View>
          <View style={[styles.orLine, { backgroundColor: colors.borderLight }]} />
        </View>

        {/* Option B Card */}
        <TouchableOpacity
          style={[
            styles.dilemmaCard,
            {
              backgroundColor: myVote === 'B' ? '#4C1D95' : colors.surface,
              borderColor: myVote === 'B' ? '#A855F7' : phase === 'reveal' && isMajorityB ? '#A855F7' : colors.borderLight,
              borderWidth: myVote === 'B' || (phase === 'reveal' && isMajorityB) ? 2.5 : 1,
              borderRadius: radius.xl,
              padding: spacing.lg,
              marginTop: spacing.md,
            },
          ]}
          onPress={() => handleVote('B')}
          disabled={myVote !== null || phase !== 'voting'}
          activeOpacity={0.8}
        >
          <View style={styles.cardTopRow}>
            <View style={[styles.choiceBadge, { backgroundColor: '#A855F7' }]}>
              <Text style={[typography.labelMedium, { color: '#FFFFFF', fontWeight: 'bold' }]}>
                OPTION B
              </Text>
            </View>
            {currentDilemma.iconB && (
              <MaterialCommunityIcons name={currentDilemma.iconB as any} size={28} color="#C084FC" />
            )}
          </View>

          <Text style={[typography.titleMedium, { color: colors.textPrimary, marginVertical: spacing.md, fontWeight: '600', lineHeight: 24 }]}>
            {currentDilemma.optionB}
          </Text>

          {/* Reveal details */}
          {phase === 'reveal' && (
            <View style={styles.revealBox}>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceElevated, borderRadius: radius.full }]}>
                <RNAnimated.View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: '#A855F7',
                      borderRadius: radius.full,
                      width: barAnimB.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <View style={styles.revealStats}>
                <Text style={[typography.titleSmall, { color: '#C084FC', fontWeight: 'bold' }]}>
                  {pctB}% ({countB} votes)
                </Text>
                {isMajorityB && (
                  <Text style={[typography.labelSmall, { color: '#34D399', fontWeight: 'bold' }]}>
                    {mode === 'minority' ? 'Underdog Pick' : '👑 Majority!'}
                  </Text>
                )}
              </View>

              {/* Avatars of players who voted B */}
              <View style={styles.voterAvatarsRow}>
                {Object.entries(votes)
                  .filter(([_, choice]) => choice === 'B')
                  .map(([pId]) => {
                    const player = players.find((p) => p.id === pId);
                    if (!player) return null;
                    return (
                      <View key={pId} style={[styles.voterChip, { backgroundColor: colors.surfaceElevated }]}>
                        <View style={[styles.miniDot, { backgroundColor: player.avatarColor || colors.primary }]} />
                        <Text style={[typography.labelSmall, { color: colors.textPrimary, fontSize: 10, marginLeft: 4 }]} numberOfLines={1}>
                          {player.displayName}
                        </Text>
                      </View>
                    );
                  })}
              </View>
            </View>
          )}

          {myVote === 'B' && phase === 'voting' && (
            <View style={styles.lockedRow}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#C084FC" />
              <Text style={[typography.labelMedium, { color: '#C084FC', fontWeight: 'bold', marginLeft: 6 }]}>
                Your Selection
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Live Vote Progress (Who has voted) */}
        <View style={[styles.voteStatusSection, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.xl }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={[typography.labelMedium, { color: colors.textSecondary }]}>
              Room Votes: {votesCount}/{activePlayers.length}
            </Text>
            {phase === 'voting' && allVoted && (
              <Text style={[typography.labelSmall, { color: colors.success, fontWeight: 'bold' }]}>
                All Votes In!
              </Text>
            )}
          </View>

          <View style={styles.playersVoteRow}>
            {activePlayers.map((player) => {
              const hasVoted = Boolean(votes[player.id]);
              return (
                <View key={player.id} style={styles.playerVoteBadge}>
                  <View
                    style={[
                      styles.avatarVoteCircle,
                      {
                        backgroundColor: player.avatarColor || colors.primary,
                        borderColor: hasVoted ? colors.success : colors.borderLight,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    {hasVoted ? (
                      <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                    ) : (
                      <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: 'bold' }}>
                        {player.displayName.substring(0, 1).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text style={[typography.labelSmall, { color: colors.textTertiary, fontSize: 9, marginTop: 2, maxWidth: 50 }]} numberOfLines={1}>
                    {player.displayName}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Reveal Phase Discussion & Advance Controls */}
        {phase === 'reveal' && (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            {isAdmin ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {/* Pause / Resume Discussion Timer Button */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      flex: 1,
                      backgroundColor: isTimerPaused ? colors.surfaceElevated : '#FEF3C7',
                      borderColor: isTimerPaused ? colors.borderLight : '#F59E0B',
                      borderWidth: 1.5,
                      borderRadius: radius.md,
                      paddingVertical: spacing.md,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                  ]}
                  onPress={handleTogglePauseTimer}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={isTimerPaused ? 'play' : 'pause'}
                    size={18}
                    color={isTimerPaused ? colors.textPrimary : '#B45309'}
                  />
                  <Text
                    style={[
                      typography.labelMedium,
                      {
                        color: isTimerPaused ? colors.textPrimary : '#92400E',
                        fontWeight: 'bold',
                        marginLeft: 6,
                      },
                    ]}
                  >
                    {isTimerPaused ? 'Resume Timer' : 'Pause to Discuss'}
                  </Text>
                </TouchableOpacity>

                {/* Next Dilemma Button */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      flex: 1,
                      backgroundColor: colors.primary,
                      borderRadius: radius.md,
                      paddingVertical: spacing.md,
                    },
                  ]}
                  onPress={handleNextDilemma}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.titleSmall, { color: '#FFFFFF', textAlign: 'center', fontWeight: 'bold' }]}>
                    {dilemmaIndex < dilemmas.length - 1 ? 'Next Dilemma ➔' : 'View Results ➔'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : isTimerPaused ? (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderColor: '#F59E0B',
                  borderRadius: radius.md,
                  padding: spacing.md,
                  borderWidth: 1,
                  alignItems: 'center',
                }}
              >
                <Text style={[typography.bodySmall, { color: '#B45309', textAlign: 'center', fontWeight: '600' }]}>
                  💬 Room host paused the countdown for group discussion. Chat away!
                </Text>
              </View>
            ) : null}
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
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  countdownCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundBadge: {},
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  dilemmaCard: {
    minHeight: 140,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  choiceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 8,
  },
  revealBox: {
    marginTop: 8,
  },
  barTrack: {
    height: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
  },
  revealStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  voterAvatarsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  voterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  voteStatusSection: {
    borderWidth: 1,
  },
  playersVoteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  playerVoteBadge: {
    alignItems: 'center',
  },
  avatarVoteCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  superlativeRow: {
    flexDirection: 'row',
  },
  superlativeCard: {
    borderWidth: 1.5,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discussionBanner: {},
});
