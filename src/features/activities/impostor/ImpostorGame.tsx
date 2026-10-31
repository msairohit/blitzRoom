/**
 * Find the Impostor — Multiplayer Game Component
 * Features private role/word delivery, turn-based clue rounds, live discussion timer,
 * secret voting, vote reveal suspense, and the "Last Gasp Guess" clutch mechanic.
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
  ImpostorCategory,
  ImpostorPhase,
  ImpostorPrivateState,
  ImpostorSyncState,
  SecretWordItem,
  ClueEntry,
  DiscussionChatEntry,
  PlayerRole,
} from './types';
import { getWordPool } from './data';
import { haptics } from '@/src/utils/haptics';
import { roomService } from '@/src/services/roomService';
import { Avatar } from '@/src/components/Avatar';

export function ImpostorGame({
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

  const category = (settings.category as ImpostorCategory | 'all') ?? 'all';
  const impostorCountSetting = (settings.impostorCount as 1 | 2 | 'auto') ?? 'auto';
  const totalRounds = (settings.rounds as number) ?? 5;
  const clueTime = (settings.clueTimePerPlayer as number) ?? 20;
  const discussionTime = (settings.discussionTime as number) ?? 60;
  const customWords = (settings.customWords as SecretWordItem[]) ?? [];

  // ==========================================
  // Shared Game State
  // ==========================================
  const [phase, setPhase] = useState<ImpostorPhase>('reveal_role');
  const [roundNumber, setRoundNumber] = useState(1);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState('');
  const [turnOrder, setTurnOrder] = useState<string[]>([]);
  const [clues, setClues] = useState<ClueEntry[]>([]);
  const [votes, setVotes] = useState<Record<string, string>>({}); // voterId -> targetPlayerId
  const [impostorIds, setImpostorIds] = useState<string[]>([]);
  const [accusedPlayerId, setAccusedPlayerId] = useState<string | null>(null);
  const [impostorGuessCorrect, setImpostorGuessCorrect] = useState<boolean | null>(null);
  const [winner, setWinner] = useState<'detectives' | 'impostors' | null>(null);
  const [activeWordItem, setActiveWordItem] = useState<SecretWordItem | null>(null);
  const [phaseTimer, setPhaseTimer] = useState(10);

  // ==========================================
  // Local / Private State
  // ==========================================
  const [myRole, setMyRole] = useState<PlayerRole>('detective');
  const [mySecretWord, setMySecretWord] = useState<string>('???');
  const [myCategoryHint, setMyCategoryHint] = useState<string>('');
  const [isRoleCardRevealed, setIsRoleCardRevealed] = useState(false);
  const [myClueInput, setMyClueInput] = useState('');
  const [myVote, setMyVote] = useState<string | null>(null);
  const [guessSelection, setGuessSelection] = useState<string | null>(null);
  const [reactions, setReactions] = useState<DiscussionChatEntry[]>([]);
  const [selectedSuspect, setSelectedSuspect] = useState<{ id: string; name: string } | null>(null);
  const [customChatInput, setCustomChatInput] = useState('');
  const chatScrollRef = useRef<ScrollView>(null);

  // Animation values
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const cardFlipAnim = useRef(new RNAnimated.Value(0)).current;

  // Refs
  const didInitRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const privateStateRef = useRef<Record<string, ImpostorPrivateState>>({});
  const lastSyncTsRef = useRef(0);
  const isTransitioningRef = useRef(false);

  // Active connected players
  const activePlayers = useMemo(() => players.filter((p) => !p.isOffline), [players]);
  const isMyTurn = currentTurnPlayerId === currentPlayerId;
  const amImpostor = myRole === 'impostor';

  // ==========================================
  // Pulse Animation for Alerts
  // ==========================================
  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Keep latest mutable state in a ref to avoid callback churn & dependency re-triggers
  const stateRef = useRef({
    phase,
    roundNumber,
    currentTurnPlayerId,
    turnOrder,
    clues,
    votes,
    impostorIds,
    accusedPlayerId,
    impostorGuessCorrect,
    winner,
    activeWordItem,
    phaseTimer,
  });

  useEffect(() => {
    stateRef.current = {
      phase,
      roundNumber,
      currentTurnPlayerId,
      turnOrder,
      clues,
      votes,
      impostorIds,
      accusedPlayerId,
      impostorGuessCorrect,
      winner,
      activeWordItem,
      phaseTimer,
    };
  });

  // ==========================================
  // Push Shared State (Admin Only)
  // ==========================================
  const pushSyncState = useCallback(
    (newState: Partial<ImpostorSyncState>) => {
      if (!isAdmin || !syncGameState) return;

      const current = stateRef.current;
      const fullState: ImpostorSyncState = {
        phase: newState.phase ?? current.phase,
        roundNumber: newState.roundNumber ?? current.roundNumber,
        totalRounds,
        category,
        secretWordId: current.activeWordItem?.id || '',
        currentTurnPlayerId: newState.currentTurnPlayerId ?? current.currentTurnPlayerId,
        turnOrder: newState.turnOrder ?? current.turnOrder,
        clues: newState.clues ?? current.clues,
        votes: newState.votes ?? current.votes,
        impostorIds: newState.impostorIds ?? current.impostorIds,
        accusedPlayerId: newState.accusedPlayerId !== undefined ? newState.accusedPlayerId : current.accusedPlayerId,
        impostorGuessCorrect: newState.impostorGuessCorrect !== undefined ? newState.impostorGuessCorrect : current.impostorGuessCorrect,
        winner: newState.winner !== undefined ? newState.winner : current.winner,
        phaseTimeLeft: newState.phaseTimeLeft ?? current.phaseTimer,
        syncTimestamp: Date.now(),
      };

      lastSyncTsRef.current = fullState.syncTimestamp;
      syncGameState(fullState as unknown as Record<string, unknown>);
    },
    [isAdmin, syncGameState, totalRounds, category]
  );

  // ==========================================
  // Initialize Round (Admin Only)
  // ==========================================
  const initRound = useCallback(
    (newRoundNum: number) => {
      if (!isAdmin) return;

      const pool = getWordPool(category, customWords);
      const chosenWord = pool[Math.floor(Math.random() * pool.length)];
      setActiveWordItem(chosenWord);

      // Determine impostor count
      let numImpostors = 1;
      if (impostorCountSetting === 2) {
        numImpostors = activePlayers.length >= 3 ? 2 : 1;
      } else if (impostorCountSetting === 'auto') {
        numImpostors = activePlayers.length >= 6 ? 2 : 1;
      }

      // Shuffle player IDs to pick impostor(s)
      const shuffledPlayerIds = [...activePlayers.map((p) => p.id)].sort(
        () => 0.5 - Math.random()
      );
      const chosenImpostorIds = shuffledPlayerIds.slice(0, numImpostors);

      // Randomize turn order
      const newTurnOrder = [...activePlayers.map((p) => p.id)].sort(
        () => 0.5 - Math.random()
      );

      // Distribute private states to all players
      const privateMap: Record<string, ImpostorPrivateState> = {};
      activePlayers.forEach((p) => {
        const isImp = chosenImpostorIds.includes(p.id);
        const pState: ImpostorPrivateState = {
          role: isImp ? 'impostor' : 'detective',
          secretWord: isImp ? '???' : chosenWord.word,
          categoryHint: chosenWord.hint,
          category: chosenWord.category,
        };
        privateMap[p.id] = pState;

        // Send via private state sync
        if (syncPrivateState) {
          syncPrivateState(p.id, pState as unknown as Record<string, unknown>);
        }
      });
      privateStateRef.current = privateMap;

      // Reset local voting and inputs
      setMyVote(null);
      setMyClueInput('');
      setVotes({});
      setClues([]);
      setAccusedPlayerId(null);
      setImpostorGuessCorrect(null);
      setWinner(null);
      setIsRoleCardRevealed(false);
      setGuessSelection(null);
      setReactions([]);
      setSelectedSuspect(null);
      setCustomChatInput('');

      // Set state and sync
      setRoundNumber(newRoundNum);
      setImpostorIds(chosenImpostorIds);
      setTurnOrder(newTurnOrder);
      setCurrentTurnPlayerId(newTurnOrder[0] || '');
      setPhase('reveal_role');
      setPhaseTimer(10); // 10s to inspect role

      pushSyncState({
        phase: 'reveal_role',
        roundNumber: newRoundNum,
        turnOrder: newTurnOrder,
        currentTurnPlayerId: newTurnOrder[0] || '',
        clues: [],
        votes: {},
        impostorIds: chosenImpostorIds,
        accusedPlayerId: null,
        impostorGuessCorrect: null,
        winner: null,
        phaseTimeLeft: 10,
      });
    },
    [
      isAdmin,
      category,
      customWords,
      activePlayers,
      impostorCountSetting,
      syncPrivateState,
      pushSyncState,
    ]
  );

  // Initialize once on mount
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    if (isAdmin) {
      initRound(1);
    }
  }, [isAdmin, initRound]);

  // ==========================================
  // Subscribe to Private State
  // ==========================================
  useEffect(() => {
    if (!onPrivateState) return;

    const unsubscribe = onPrivateState((raw) => {
      const pState = raw as unknown as ImpostorPrivateState;
      if (pState && pState.role) {
        setMyRole(pState.role);
        setMySecretWord(pState.secretWord);
        setMyCategoryHint(pState.categoryHint);
      }
    });

    return () => unsubscribe();
  }, [onPrivateState]);

  // Fallback for Admin (who holds the privateMap directly)
  useEffect(() => {
    if (isAdmin && privateStateRef.current[currentPlayerId]) {
      const pState = privateStateRef.current[currentPlayerId];
      setMyRole(pState.role);
      setMySecretWord(pState.secretWord);
      setMyCategoryHint(pState.categoryHint);
    }
  }, [isAdmin, currentPlayerId, roundNumber]);

  // ==========================================
  // Subscribe to Shared Game State (Clients)
  // ==========================================
  useEffect(() => {
    if (!onGameState || isAdmin) return;

    const unsubscribe = onGameState((raw) => {
      const s = raw as unknown as ImpostorSyncState;
      if (!s || !s.syncTimestamp || s.syncTimestamp <= lastSyncTsRef.current) return;

      lastSyncTsRef.current = s.syncTimestamp;
      if (s.phase === 'reveal_role') {
        setReactions([]);
        setSelectedSuspect(null);
        setCustomChatInput('');
      }
      setPhase(s.phase);
      setRoundNumber(s.roundNumber);
      setCurrentTurnPlayerId(s.currentTurnPlayerId);
      setTurnOrder(s.turnOrder || []);
      if (s.clues && Array.isArray(s.clues)) {
        setClues((prev) => {
          const merged = [...s.clues];
          prev.forEach((localClue) => {
            if (
              !merged.some(
                (c) =>
                  c.playerId === localClue.playerId &&
                  (c.timestamp === localClue.timestamp || c.clueText === localClue.clueText)
              )
            ) {
              merged.push(localClue);
            }
          });
          stateRef.current.clues = merged;
          return merged;
        });
      }
      const remoteVotes = s.votes || {};
      setVotes(remoteVotes);
      if (s.phase !== 'voting' || !remoteVotes[currentPlayerId]) {
        setMyVote(null);
      } else {
        setMyVote(remoteVotes[currentPlayerId]);
      }
      setImpostorIds(s.impostorIds || []);
      setAccusedPlayerId(s.accusedPlayerId);
      setImpostorGuessCorrect(s.impostorGuessCorrect);
      setWinner(s.winner);
      const elapsedSinceSync = Math.max(0, Math.floor((Date.now() - s.syncTimestamp) / 1000));
      const adjustedTimeLeft = Math.max(0, s.phaseTimeLeft - elapsedSinceSync);
      setPhaseTimer(adjustedTimeLeft);

      // Hydrate secret word if known in pool
      if (s.secretWordId && !activeWordItem) {
        const pool = getWordPool(category, customWords);
        const item = pool.find((w) => w.id === s.secretWordId);
        if (item) setActiveWordItem(item);
      }
    });

    return () => unsubscribe();
  }, [onGameState, isAdmin, category, customWords, activeWordItem, currentPlayerId]);

  // ==========================================
  // Event Broadcasting & Reactions / Debate Chat
  // ==========================================
  const sendReaction = (text: string, target?: { id: string; name: string } | null) => {
    haptics.selection();
    const myPlayer = players.find((p) => p.id === currentPlayerId);
    const targetToUse = target !== undefined ? target : selectedSuspect;
    const newEntry: DiscussionChatEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentPlayerId,
      sender: myPlayer?.displayName || 'Player',
      text,
      targetPlayerId: targetToUse?.id,
      targetPlayerName: targetToUse?.name,
      isAccusation: !!targetToUse,
      timestamp: Date.now(),
    };

    broadcastEvent({
      type: 'impostor_reaction',
      senderId: currentPlayerId,
      payload: newEntry as unknown as Record<string, unknown>,
      timestamp: Date.now(),
    });

    setReactions((prev) => {
      if (prev.some((r) => r.id === newEntry.id)) return prev;
      return [...prev.slice(-49), newEntry];
    });
  };

  const handleSendCustomChat = () => {
    const trimmed = customChatInput.trim();
    if (!trimmed) return;
    sendReaction(trimmed);
    setCustomChatInput('');
  };

  // Advance turn or go to discussion
  const advanceTurnOrDiscussion = useCallback(
    (latestClues?: ClueEntry[]) => {
      if (!isAdmin) return;

      const current = stateRef.current;
      const cluesToSync = latestClues ?? current.clues;
      stateRef.current.clues = cluesToSync;

      const { turnOrder: currentTurnOrder, currentTurnPlayerId: currentTurnId } = current;
      const currentIndex = currentTurnOrder.indexOf(currentTurnId);
      if (currentIndex >= 0 && currentIndex < currentTurnOrder.length - 1) {
        // Next player's turn
        const nextPlayerId = currentTurnOrder[currentIndex + 1];
        setCurrentTurnPlayerId(nextPlayerId);
        setPhaseTimer(clueTime);
        stateRef.current.currentTurnPlayerId = nextPlayerId;
        stateRef.current.phaseTimer = clueTime;

        pushSyncState({
          clues: cluesToSync,
          currentTurnPlayerId: nextPlayerId,
          phaseTimeLeft: clueTime,
        });
      } else {
        // All players gave clues -> advance to discussion!
        haptics.success();
        setPhase('discussion');
        setPhaseTimer(discussionTime);
        stateRef.current.phase = 'discussion';
        stateRef.current.phaseTimer = discussionTime;

        pushSyncState({
          phase: 'discussion',
          clues: cluesToSync,
          phaseTimeLeft: discussionTime,
        });
      }
    },
    [isAdmin, clueTime, discussionTime, pushSyncState]
  );

  // Finalize Voting
  const finalizeVoting = useCallback(() => {
    if (!isAdmin) return;

    const current = stateRef.current;
    const currentVotes = current.votes;
    const currentImpostorIds = current.impostorIds;

    // Count votes
    const voteCounts: Record<string, number> = {};
    Object.values(currentVotes).forEach((targetId) => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    // Find highest voted
    let maxVotes = -1;
    let accused: string | null = null;
    let isTie = false;

    Object.entries(voteCounts).forEach(([pid, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        accused = pid;
        isTie = false;
      } else if (count === maxVotes) {
        isTie = true;
      }
    });

    // If tie or no votes, impostor escapes
    if (isTie || !accused || maxVotes === 0) {
      haptics.error();
      setAccusedPlayerId(null);
      setWinner('impostors');
      setPhase('round_summary');
      setPhaseTimer(10);
      pushSyncState({
        phase: 'round_summary',
        accusedPlayerId: null,
        winner: 'impostors',
        phaseTimeLeft: 10,
      });
      return;
    }

    setAccusedPlayerId(accused);
    const accusedIsImpostor = currentImpostorIds.includes(accused);

    if (accusedIsImpostor) {
      // Impostor Caught! Give them Last Gasp Guess
      haptics.warning();
      setPhase('impostor_guess');
      setPhaseTimer(20);
      pushSyncState({
        phase: 'impostor_guess',
        accusedPlayerId: accused,
        phaseTimeLeft: 20,
      });
    } else {
      // Innocent player eliminated! Impostor wins!
      haptics.error();
      setWinner('impostors');
      setPhase('round_summary');
      setPhaseTimer(10);
      pushSyncState({
        phase: 'round_summary',
        accusedPlayerId: accused,
        winner: 'impostors',
        phaseTimeLeft: 10,
      });
    }
  }, [isAdmin, pushSyncState]);

  // Finalize Round
  const finalizeRound = useCallback(
    (impostorGuessedCorrect: boolean) => {
      const current = stateRef.current;
      setImpostorGuessCorrect(impostorGuessedCorrect);
      const finalWinner = impostorGuessedCorrect ? 'impostors' : 'detectives';
      setWinner(finalWinner);
      setPhase('round_summary');
      setPhaseTimer(10);

      // Award scores
      if (finalWinner === 'detectives') {
        haptics.success();
        // Reward detectives who voted for the true impostor
        activePlayers.forEach((p) => {
          if (!current.impostorIds.includes(p.id)) {
            const theirVote = current.votes[p.id];
            const votedCorrectly = current.impostorIds.includes(theirVote);
            const pts = votedCorrectly ? 250 : 100;
            roomService.updatePlayerScore(roomId, p.id, p.score + pts);
          }
        });
      } else {
        haptics.error();
        // Reward impostor(s)
        current.impostorIds.forEach((impId) => {
          const impPlayer = activePlayers.find((p) => p.id === impId);
          if (impPlayer) {
            const pts = impostorGuessedCorrect ? 400 : 300;
            roomService.updatePlayerScore(roomId, impId, impPlayer.score + pts);
          }
        });
      }

      pushSyncState({
        phase: 'round_summary',
        impostorGuessCorrect,
        winner: finalWinner,
      });
    },
    [activePlayers, roomId, pushSyncState]
  );

  // Impostor Guess handler
  const handleImpostorGuess = useCallback(
    (guessedWord: string) => {
      const current = stateRef.current;
      const isCorrect =
        current.activeWordItem &&
        guessedWord.trim().toLowerCase() === current.activeWordItem.word.trim().toLowerCase();

      finalizeRound(!!isCorrect);
    },
    [finalizeRound]
  );

  // Next Round / Activity End
  const handleNextRoundOrFinish = useCallback(() => {
    if (!isAdmin) return;

    const current = stateRef.current;
    if (current.roundNumber < totalRounds) {
      initRound(current.roundNumber + 1);
    } else {
      // Game Over -> Finish
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
  }, [isAdmin, totalRounds, initRound, players, onActivityEnd]);

  // Admin Phase Transitions on Timeout / Trigger
  const handlePhaseTimeout = useCallback(() => {
    if (!isAdmin || isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 500);

    const current = stateRef.current;
    const currentPhase = current.phase;

    if (currentPhase === 'reveal_role') {
      // Advance to clue giving
      const firstPlayerId = current.turnOrder[0] || activePlayers[0]?.id || '';
      setPhase('clue_giving');
      setCurrentTurnPlayerId(firstPlayerId);
      setPhaseTimer(clueTime);
      pushSyncState({
        phase: 'clue_giving',
        currentTurnPlayerId: firstPlayerId,
        phaseTimeLeft: clueTime,
      });
    } else if (currentPhase === 'clue_giving') {
      // Auto advance to next turn if time expires
      const turnPlayer = activePlayers.find((p) => p.id === current.currentTurnPlayerId);
      const hasClue = current.clues.some((c) => c.playerId === current.currentTurnPlayerId);
      if (!hasClue && turnPlayer) {
        const timeoutClue: ClueEntry = {
          playerId: turnPlayer.id,
          playerName: turnPlayer.displayName,
          clueText: '(Silent / Ran out of time)',
          timestamp: Date.now(),
        };
        let updated: ClueEntry[] = [];
        setClues((prev) => {
          updated = [...prev, timeoutClue];
          stateRef.current.clues = updated;
          return updated;
        });
        advanceTurnOrDiscussion(updated.length > 0 ? updated : undefined);
      } else {
        advanceTurnOrDiscussion();
      }
    } else if (currentPhase === 'discussion') {
      // Discussion timer expired -> voting phase!
      haptics.warning();
      setPhase('voting');
      setPhaseTimer(30);
      pushSyncState({
        phase: 'voting',
        phaseTimeLeft: 30,
      });
    } else if (currentPhase === 'voting') {
      // Tally votes
      finalizeVoting();
    } else if (currentPhase === 'impostor_guess') {
      // Impostor timed out without guessing
      finalizeRound(false);
    } else if (currentPhase === 'round_summary') {
      handleNextRoundOrFinish();
    }
  }, [
    isAdmin,
    activePlayers,
    clueTime,
    pushSyncState,
    advanceTurnOrDiscussion,
    finalizeVoting,
    finalizeRound,
    handleNextRoundOrFinish,
  ]);

  // ==========================================
  // Main Phase Timer (Counts down on all devices with haptic ticks)
  // ==========================================
  const handlePhaseTimeoutRef = useRef<() => void>(() => {});
  handlePhaseTimeoutRef.current = handlePhaseTimeout;

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setPhaseTimer((prev) => {
        if (prev <= 1) {
          haptics.warning();
          if (isAdmin) {
            handlePhaseTimeoutRef.current();
          }
          return 0;
        }

        const next = prev - 1;
        const current = stateRef.current;
        const isMyTurnActive = current.currentTurnPlayerId === currentPlayerId;

        // Vibrations on timer countdown ticks
        if (next <= 5 && next > 0) {
          if (next <= 2) {
            haptics.medium();
          } else {
            haptics.light();
          }
        } else if (isMyTurnActive && current.phase === 'clue_giving' && next <= 10) {
          // Subtle ticking for the active speaker
          haptics.selection();
        }

        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAdmin, phase, currentTurnPlayerId, currentPlayerId]);

  // ==========================================
  // Event Subscriptions (Reactions, Clues, Votes, Guesses)
  // ==========================================
  useEffect(() => {
    if (!onGameEvent) return;

    const unsubscribe = onGameEvent((event: GameEvent) => {
      if (event.type === 'impostor_reaction') {
        const payload = event.payload as Partial<DiscussionChatEntry>;
        if (payload?.sender && payload?.text) {
          const entryId =
            payload.id || `${event.timestamp || Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const senderName = payload.sender;
          const textContent = payload.text;
          setReactions((prev) => {
            if (
              prev.some(
                (r) =>
                  r.id === entryId ||
                  (r.timestamp === payload.timestamp && r.sender === senderName && r.text === textContent)
              )
            ) {
              return prev;
            }
            return [
              ...prev.slice(-49),
              {
                id: entryId,
                senderId: event.senderId || payload.senderId,
                sender: senderName,
                text: textContent,
                targetPlayerId: payload.targetPlayerId,
                targetPlayerName: payload.targetPlayerName,
                isAccusation: payload.isAccusation,
                timestamp: payload.timestamp || Date.now(),
              },
            ];
          });
        }
      } else if (event.type === 'impostor_clue_submit') {
        // Broadcast clue delivered to ALL connected devices in the room
        const payload = event.payload as { clue: ClueEntry };
        if (payload?.clue) {
          let updatedClues: ClueEntry[] = [];
          setClues((prev) => {
            // Deduplication: prevent adding duplicate clues
            if (
              prev.some(
                (c) =>
                  c.playerId === payload.clue.playerId &&
                  (c.timestamp === payload.clue.timestamp || c.clueText === payload.clue.clueText)
              )
            ) {
              return prev;
            }
            updatedClues = [...prev, payload.clue];
            stateRef.current.clues = updatedClues;
            return updatedClues;
          });

          haptics.selection();

          // Only Admin advances turn and syncs authoritative state
          if (isAdmin) {
            advanceTurnOrDiscussion(updatedClues.length > 0 ? updatedClues : undefined);
          }
        }
      } else if (isAdmin && event.type === 'impostor_cast_vote') {
        const payload = event.payload as { voterId: string; targetPlayerId: string };
        if (payload?.voterId && payload?.targetPlayerId) {
          setVotes((prev) => {
            if (prev[payload.voterId] === payload.targetPlayerId) {
              return prev;
            }
            const updated = { ...prev, [payload.voterId]: payload.targetPlayerId };
            stateRef.current.votes = updated;
            pushSyncState({ votes: updated });
            return updated;
          });
        }
      } else if (isAdmin && event.type === 'impostor_guess_submit') {
        const payload = event.payload as { wordGuess: string };
        if (payload?.wordGuess) {
          handleImpostorGuess(payload.wordGuess);
        }
      }
    });

    return () => unsubscribe();
  }, [onGameEvent, isAdmin, pushSyncState, advanceTurnOrDiscussion, handleImpostorGuess]);

  // Submit Clue (Player Action)
  const handleClueSubmit = (text: string) => {
    if (!isMyTurn || !text.trim()) return;
    haptics.success();

    const myPlayer = players.find((p) => p.id === currentPlayerId);
    const newClue: ClueEntry = {
      playerId: currentPlayerId,
      playerName: myPlayer?.displayName || 'Detective',
      clueText: text.trim(),
      timestamp: Date.now(),
    };

    setMyClueInput('');

    let updatedClues: ClueEntry[] = [];
    setClues((prev) => {
      if (prev.some((c) => c.playerId === newClue.playerId && c.clueText === newClue.clueText)) {
        return prev;
      }
      updatedClues = [...prev, newClue];
      stateRef.current.clues = updatedClues;
      return updatedClues;
    });

    if (isAdmin) {
      advanceTurnOrDiscussion(updatedClues.length > 0 ? updatedClues : undefined);
    } else {
      // Notify all players in room via broadcast
      broadcastEvent({
        type: 'impostor_clue_submit',
        senderId: currentPlayerId,
        payload: { clue: newClue },
        timestamp: Date.now(),
      });
    }
  };

  // Bot Clue Simulation (Admin)
  useEffect(() => {
    if (!isAdmin || phase !== 'clue_giving') return;

    const currentTurnPlayer = activePlayers.find((p) => p.id === currentTurnPlayerId);
    if (!currentTurnPlayer) return;

    // Check if it's a bot (detected via name starting with "Bot" or dummy ID)
    const isBot = currentTurnPlayer.displayName.startsWith('Bot ') || currentTurnPlayer.id.startsWith('bot_');
    if (isBot) {
      const botTimer = setTimeout(() => {
        const isBotImp = impostorIds.includes(currentTurnPlayer.id);
        const botClues = isBotImp
          ? ['Very interesting atmosphere here.', 'I definitely know what this is!', 'Seen this place many times.']
          : ['You definitely need to be careful here.', 'A lot of moving parts involved.', 'People visit this regularly.'];
        const chosenClue = botClues[Math.floor(Math.random() * botClues.length)];

        const newClue: ClueEntry = {
          playerId: currentTurnPlayer.id,
          playerName: currentTurnPlayer.displayName,
          clueText: chosenClue,
          timestamp: Date.now(),
        };

        let updatedClues: ClueEntry[] = [];
        setClues((prev) => {
          if (prev.some((c) => c.playerId === newClue.playerId)) return prev;
          updatedClues = [...prev, newClue];
          stateRef.current.clues = updatedClues;
          return updatedClues;
        });

        advanceTurnOrDiscussion(updatedClues.length > 0 ? updatedClues : undefined);
      }, 3500);

      return () => clearTimeout(botTimer);
    }
  }, [isAdmin, phase, currentTurnPlayerId, activePlayers, impostorIds, advanceTurnOrDiscussion]);

  // Bot Voting Simulation (Admin)
  useEffect(() => {
    if (!isAdmin || phase !== 'voting') return;

    const botPlayers = activePlayers.filter(
      (p) => p.displayName.startsWith('Bot ') || p.id.startsWith('bot_')
    );
    const unvotedBots = botPlayers.filter((b) => !votes[b.id]);

    if (unvotedBots.length > 0) {
      const botVoteTimer = setTimeout(() => {
        setVotes((prev) => {
          const updatedVotes = { ...prev };
          let changed = false;
          unvotedBots.forEach((bot) => {
            if (!updatedVotes[bot.id]) {
              const candidates = activePlayers.filter((p) => p.id !== bot.id);
              if (candidates.length > 0) {
                const picked = candidates[Math.floor(Math.random() * candidates.length)];
                updatedVotes[bot.id] = picked.id;
                changed = true;
              }
            }
          });
          if (changed) {
            pushSyncState({ votes: updatedVotes });
          }
          return updatedVotes;
        });
      }, 2500);

      return () => clearTimeout(botVoteTimer);
    }
  }, [isAdmin, phase, activePlayers, votes, pushSyncState]);

  // Submit Vote
  const handleCastVote = (targetPlayerId: string) => {
    if (phase !== 'voting' || myVote) return;
    if (targetPlayerId === currentPlayerId) {
      Alert.alert('Cannot Vote For Yourself', 'Pick another suspect!');
      return;
    }

    haptics.selection();
    setMyVote(targetPlayerId);

    setVotes((prev) => {
      const updated = { ...prev, [currentPlayerId]: targetPlayerId };
      if (isAdmin) {
        pushSyncState({ votes: updated });
      }
      return updated;
    });

    if (!isAdmin) {
      broadcastEvent({
        type: 'impostor_cast_vote',
        senderId: currentPlayerId,
        payload: { voterId: currentPlayerId, targetPlayerId },
        timestamp: Date.now(),
      });
    }
  };

  // Check if all players have voted
  useEffect(() => {
    if (!isAdmin || phase !== 'voting') return;
    const totalVotes = Object.keys(votes).length;
    if (totalVotes >= activePlayers.length && activePlayers.length > 0) {
      finalizeVoting();
    }
  }, [isAdmin, phase, votes, activePlayers, finalizeVoting]);

  // Card Flip Animation Trigger
  const toggleCardFlip = () => {
    haptics.selection();
    setIsRoleCardRevealed(!isRoleCardRevealed);
  };

  // ==========================================
  // Render Phases
  // ==========================================

  // Accused Player Details
  const accusedPlayer = players.find((p) => p.id === accusedPlayerId);
  const currentTurnPlayer = players.find((p) => p.id === currentTurnPlayerId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.headerLeft}>
          <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '700' }]}>
            ROUND {roundNumber} / {totalRounds}
          </Text>
          <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>
            Find the Impostor
          </Text>
        </View>

        {/* Phase Timer Indicator */}
        <View
          style={[
            styles.timerBadge,
            {
              backgroundColor: phaseTimer <= 5 ? 'rgba(239, 68, 68, 0.15)' : colors.surfaceElevated,
              borderColor: phaseTimer <= 5 ? colors.error : colors.borderLight,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="timer-sand"
            size={16}
            color={phaseTimer <= 5 ? colors.error : colors.primary}
          />
          <Text
            style={[
              typography.labelMedium,
              {
                color: phaseTimer <= 5 ? colors.error : colors.textPrimary,
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
        keyboardShouldPersistTaps="handled"
      >
        {/* ==========================================
            PHASE 1: REVEAL ROLE
            ========================================== */}
        {phase === 'reveal_role' && (
          <View style={styles.phaseContent}>
            <Text style={[typography.titleLarge, { color: colors.textPrimary, textAlign: 'center' }]}>
              Confidential Assignment
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
              ]}
            >
              Tap the card below to reveal your secret identity. Keep your screen hidden!
            </Text>

            <TouchableOpacity
              style={[
                styles.secretCard,
                {
                  backgroundColor: isRoleCardRevealed
                    ? amImpostor
                      ? '#2A080C'
                      : '#0C2018'
                    : colors.surface,
                  borderColor: isRoleCardRevealed
                    ? amImpostor
                      ? colors.error
                      : colors.success
                    : colors.primary,
                  borderRadius: radius.xl,
                  marginTop: spacing.xl,
                },
              ]}
              onPress={toggleCardFlip}
              activeOpacity={0.85}
            >
              {!isRoleCardRevealed ? (
                <View style={styles.cardUnrevealed}>
                  <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <MaterialCommunityIcons
                      name="shield-lock-outline"
                      size={56}
                      color={colors.primary}
                    />
                  </RNAnimated.View>
                  <Text
                    style={[
                      typography.titleMedium,
                      { color: colors.textPrimary, marginTop: spacing.md, fontWeight: '700' },
                    ]}
                  >
                    TOP SECRET DOSSIER
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: spacing.xs }]}>
                    Tap to unlock your role
                  </Text>
                </View>
              ) : (
                <View style={styles.cardRevealed}>
                  {amImpostor ? (
                    <>
                      <View
                        style={[
                          styles.roleBadge,
                          { backgroundColor: colors.error, borderRadius: radius.full },
                        ]}
                      >
                        <MaterialCommunityIcons name="incognito" size={18} color="#FFFFFF" />
                        <Text style={[typography.labelMedium, { color: '#FFFFFF', fontWeight: '800', marginLeft: 6 }]}>
                          YOU ARE THE IMPOSTOR
                        </Text>
                      </View>

                      <Text
                        style={[
                          typography.headlineLarge,
                          { color: colors.error, marginTop: spacing.md, fontWeight: '900', textAlign: 'center' },
                        ]}
                      >
                        ???
                      </Text>
                      <Text
                        style={[
                          typography.bodySmall,
                          { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
                        ]}
                      >
                        You do NOT know the secret word!
                      </Text>

                      <View
                        style={[
                          styles.hintBox,
                          {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: colors.borderLight,
                            borderRadius: radius.md,
                            marginTop: spacing.md,
                          },
                        ]}
                      >
                        <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '700' }]}>
                          CATEGORY HINT:
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.textPrimary, marginTop: 2 }]}>
                          {myCategoryHint || 'Listen closely to what other players say.'}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View
                        style={[
                          styles.roleBadge,
                          { backgroundColor: colors.success, borderRadius: radius.full },
                        ]}
                      >
                        <MaterialCommunityIcons name="shield-check" size={18} color="#FFFFFF" />
                        <Text style={[typography.labelMedium, { color: '#FFFFFF', fontWeight: '800', marginLeft: 6 }]}>
                          DETECTIVE / CREW
                        </Text>
                      </View>

                      <Text
                        style={[
                          typography.labelSmall,
                          { color: colors.textSecondary, marginTop: spacing.md, letterSpacing: 1.5 },
                        ]}
                      >
                        SECRET LOCATION / WORD:
                      </Text>
                      <Text
                        style={[
                          typography.headlineMedium,
                          { color: colors.textPrimary, fontWeight: '900', marginTop: spacing.xxs, textAlign: 'center' },
                        ]}
                      >
                        {mySecretWord}
                      </Text>

                      <Text
                        style={[
                          typography.bodySmall,
                          { color: colors.textTertiary, marginTop: spacing.md, textAlign: 'center' },
                        ]}
                      >
                        Give subtle clues. Do NOT say the word aloud or make it too easy for the Impostor!
                      </Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>

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
                onPress={handlePhaseTimeout}
              >
                <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                  Begin Clue Round →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ==========================================
            PHASE 2: CLUE GIVING ROUND
            ========================================== */}
        {phase === 'clue_giving' && (
          <View style={styles.phaseContent}>
            {/* Active Turn Banner */}
            <View
              style={[
                styles.turnBanner,
                {
                  backgroundColor: isMyTurn ? colors.primaryMuted : colors.surface,
                  borderColor: isMyTurn ? colors.primary : colors.borderLight,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                },
              ]}
            >
              <Avatar
                name={currentTurnPlayer?.displayName || 'Player'}
                color={currentTurnPlayer?.avatarColor || colors.primary}
                size={44}
              />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.labelSmall, { color: colors.textTertiary }]}>
                  CURRENT CLUE GIVER
                </Text>
                <Text style={[typography.titleMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
                  {isMyTurn ? 'Your Turn to Speak!' : `${currentTurnPlayer?.displayName || 'Player'}'s Turn`}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                  {isMyTurn
                    ? 'Give a 1-sentence clue without revealing the secret word!'
                    : 'Listen carefully for hesitations or suspicious clues...'}
                </Text>
              </View>
            </View>

            {/* Secret Reminder Pill */}
            <View style={[styles.reminderPill, { backgroundColor: colors.surfaceElevated, borderRadius: radius.full }]}>
              <MaterialCommunityIcons
                name={amImpostor ? 'incognito' : 'key'}
                size={16}
                color={amImpostor ? colors.error : colors.success}
              />
              <Text
                style={[
                  typography.labelSmall,
                  {
                    color: amImpostor ? colors.error : colors.textPrimary,
                    marginLeft: spacing.xs,
                    fontWeight: '600',
                  },
                ]}
              >
                {amImpostor ? 'You are the Impostor (Bluff!)' : `Secret: ${mySecretWord}`}
              </Text>
            </View>

            {/* If it's my turn: Clue input & templates */}
            {isMyTurn && (
              <View
                style={[
                  styles.myTurnBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.primary,
                    borderRadius: radius.lg,
                    padding: spacing.md,
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
                      borderRadius: radius.md,
                      padding: spacing.sm,
                    },
                  ]}
                  placeholder="Type your clue (or speak aloud)..."
                  placeholderTextColor={colors.textTertiary}
                  value={myClueInput}
                  onChangeText={setMyClueInput}
                />

                <View style={styles.clueChipsRow}>
                  {['Very noisy here', 'Costs a lot of money', 'Cold temperature', 'Needs special gear'].map(
                    (chip) => (
                      <TouchableOpacity
                        key={chip}
                        style={[
                          styles.clueChip,
                          {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: colors.borderLight,
                            borderRadius: radius.full,
                          },
                        ]}
                        onPress={() => setMyClueInput(chip)}
                      >
                        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{chip}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitClueBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: radius.md,
                      paddingVertical: spacing.sm,
                      marginTop: spacing.sm,
                    },
                  ]}
                  onPress={() => handleClueSubmit(myClueInput || 'Clue shared aloud!')}
                >
                  <Text style={[typography.labelMedium, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                    Submit Clue / Done Speaking →
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Clue History Log */}
            <View style={{ marginTop: spacing.lg }}>
              <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                Clues Given This Round ({clues.length} / {turnOrder.length})
              </Text>
              {clues.map((clue, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.clueCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderLight,
                      borderRadius: radius.md,
                      padding: spacing.sm,
                      marginBottom: spacing.xs,
                    },
                  ]}
                >
                  <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '700' }]}>
                    {clue.playerName}:
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textPrimary, marginTop: 2 }]}>
                    "{clue.clueText}"
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ==========================================
            PHASE 3: DISCUSSION & ACCUSATIONS
            ========================================== */}
        {phase === 'discussion' && (
          <View style={styles.phaseContent}>
            <Text style={[typography.titleLarge, { color: colors.textPrimary, textAlign: 'center' }]}>
              Group Interrogation & Debate
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
              ]}
            >
              Tap a suspect to question their clue directly, or send freeform arguments in the debate chat!
            </Text>

            {/* Suspects & Clues Selector */}
            <View style={{ marginTop: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                <Text style={[typography.labelMedium, { color: colors.textSecondary }]}>
                  Round Clues (Tap card to target suspect):
                </Text>
                {selectedSuspect && (
                  <TouchableOpacity onPress={() => setSelectedSuspect(null)}>
                    <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '700' }]}>
                      Clear Target ✕
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {clues.map((c, i) => {
                const isSelected = selectedSuspect?.id === c.playerId;
                const isMyClue = c.playerId === currentPlayerId;

                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    onPress={() => {
                      haptics.selection();
                      if (isSelected) {
                        setSelectedSuspect(null);
                      } else {
                        setSelectedSuspect({ id: c.playerId, name: c.playerName });
                      }
                    }}
                    style={[
                      styles.clueCard,
                      styles.interactiveClueCard,
                      {
                        backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.12)' : colors.surface,
                        borderColor: isSelected ? colors.error : colors.borderLight,
                        borderRadius: radius.md,
                        padding: spacing.sm,
                        marginBottom: spacing.xs,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[typography.labelSmall, { color: isSelected ? colors.error : colors.primary, fontWeight: '700' }]}>
                        {c.playerName} {isMyClue ? '(You)' : ''}
                      </Text>
                      <View
                        style={[
                          styles.clueQuestionBadge,
                          {
                            backgroundColor: isSelected ? colors.error : colors.surfaceElevated,
                            borderColor: isSelected ? colors.error : colors.borderLight,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.labelSmall,
                            {
                              color: isSelected ? '#FFFFFF' : colors.textSecondary,
                              fontSize: 10,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {isSelected ? '🎯 Target Active' : 'Question 💬'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[typography.bodySmall, { color: colors.textPrimary, marginTop: 4 }]}>
                      "{c.clueText}"
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Target Indicator Banner */}
            {selectedSuspect && (
              <View
                style={[
                  styles.targetBanner,
                  {
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    borderColor: colors.error,
                    borderRadius: radius.md,
                    marginTop: spacing.xs,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <MaterialCommunityIcons name="target" size={18} color={colors.error} />
                  <Text style={[typography.labelMedium, { color: colors.error, fontWeight: '700' }]}>
                    Questioning @{selectedSuspect.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedSuspect(null)}
                  style={[styles.clearTargetBtn, { backgroundColor: colors.surface }]}
                >
                  <Text style={[typography.labelSmall, { color: colors.textSecondary }]}>✕ Clear</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Live Debate Chat Feed */}
            <View
              style={[
                styles.chatBoxContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  borderRadius: radius.lg,
                  marginTop: spacing.md,
                },
              ]}
            >
              <View style={[styles.chatBoxHeader, { borderBottomColor: colors.borderLight }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="forum-outline" size={16} color={colors.primary} />
                  <Text style={[typography.labelSmall, { color: colors.textPrimary, fontWeight: '700', marginLeft: 6 }]}>
                    LIVE INTERROGATION FEED
                  </Text>
                </View>
                <Text style={[typography.labelSmall, { color: colors.textTertiary, fontSize: 11 }]}>
                  {reactions.length} {reactions.length === 1 ? 'message' : 'messages'}
                </Text>
              </View>

              <ScrollView
                ref={chatScrollRef}
                style={styles.chatScroll}
                contentContainerStyle={{ padding: spacing.sm, gap: 8 }}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {reactions.length === 0 ? (
                  <View style={styles.chatEmptyState}>
                    <MaterialCommunityIcons name="comment-question-outline" size={26} color={colors.textTertiary} />
                    <Text style={[typography.bodySmall, { color: colors.textTertiary, textAlign: 'center', marginTop: 4 }]}>
                      No accusations yet! Tap a suspect's clue above or send a message to start grilling them.
                    </Text>
                  </View>
                ) : (
                  reactions.map((r) => {
                    const isMyMsg = r.senderId === currentPlayerId;
                    return (
                      <View
                        key={r.id}
                        style={[
                          styles.chatBubble,
                          isMyMsg
                            ? [styles.myChatBubble, { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.3)' }]
                            : [styles.otherChatBubble, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }],
                          { borderRadius: radius.md },
                        ]}
                      >
                        <View style={styles.chatBubbleHeader}>
                          <Text
                            style={[
                              typography.labelSmall,
                              { color: isMyMsg ? colors.primary : colors.textPrimary, fontWeight: '700' },
                            ]}
                          >
                            {r.sender} {isMyMsg ? '(You)' : ''}
                          </Text>
                          {r.targetPlayerName && (
                            <View style={[styles.targetChip, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                              <Text style={[typography.labelSmall, { color: colors.error, fontSize: 10, fontWeight: '700' }]}>
                                ➜ @{r.targetPlayerName}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginTop: 2 }]}>
                          {r.text}
                        </Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* Custom Chat Input Bar inside container */}
              <View style={[styles.chatInputRow, { borderTopColor: colors.borderLight, backgroundColor: colors.surfaceElevated }]}>
                <TextInput
                  style={[styles.chatTextInput, typography.bodyMedium, { color: colors.textPrimary }]}
                  value={customChatInput}
                  onChangeText={setCustomChatInput}
                  placeholder={
                    selectedSuspect
                      ? `Interrogate or accuse @${selectedSuspect.name}...`
                      : 'Type interrogation or defense...'
                  }
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="send"
                  onSubmitEditing={handleSendCustomChat}
                  maxLength={120}
                />
                <TouchableOpacity
                  style={[
                    styles.sendChatBtn,
                    {
                      backgroundColor: customChatInput.trim() ? colors.primary : colors.surface,
                      borderRadius: radius.full,
                      borderColor: customChatInput.trim() ? colors.primary : colors.borderLight,
                    },
                  ]}
                  onPress={handleSendCustomChat}
                  disabled={!customChatInput.trim()}
                >
                  <MaterialCommunityIcons
                    name="send"
                    size={16}
                    color={customChatInput.trim() ? colors.textOnPrimary : colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Accusation & Reaction Chips */}
            <View style={styles.quickChipsWrapper}>
              <Text style={[typography.labelSmall, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                {selectedSuspect ? `Quick actions for @${selectedSuspect.name}:` : 'Quick reactions:'}
              </Text>
              <View style={styles.reactionGrid}>
                {(selectedSuspect
                  ? [
                      { label: 'Sus! 👀', text: `@${selectedSuspect.name} is acting very sus!` },
                      { label: 'Explain! ❓', text: `@${selectedSuspect.name}, explain what your clue meant!` },
                      { label: 'Innocent ✨', text: `I think @${selectedSuspect.name}'s clue actually fits.` },
                      { label: 'Liar! 🤥', text: `@${selectedSuspect.name}'s clue makes zero sense!` },
                    ]
                  : [
                      { label: 'Who is sus? 👀', text: 'Who gave that weird or vague clue?' },
                      { label: 'Defend! 🛡️', text: 'Defend your clue! Impostor is bluffing.' },
                      { label: 'Innocent ✨', text: 'My clue fits 100%, look at the secret category!' },
                      { label: 'Bluff! 🤥', text: 'Someone in this room has no clue what the word is!' },
                    ]
                ).map((btn) => (
                  <TouchableOpacity
                    key={btn.label}
                    style={[
                      styles.reactionBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.borderLight,
                        borderRadius: radius.full,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 6,
                      },
                    ]}
                    onPress={() => sendReaction(btn.text)}
                  >
                    <Text style={[typography.labelSmall, { color: colors.textPrimary }]}>{btn.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {isAdmin && (
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  {
                    backgroundColor: colors.error,
                    borderRadius: radius.lg,
                    marginTop: spacing.xl,
                  },
                ]}
                onPress={handlePhaseTimeout}
              >
                <Text style={[typography.labelLarge, { color: '#FFFFFF', fontWeight: '800' }]}>
                  Call Emergency Vote Now 🚨
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ==========================================
            PHASE 4: VOTING
            ========================================== */}
        {phase === 'voting' && (
          <View style={styles.phaseContent}>
            <Text style={[typography.titleLarge, { color: colors.textPrimary, textAlign: 'center' }]}>
              Cast Your Vote
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
              ]}
            >
              Who is the Impostor? Tap a player to vote them out.
            </Text>

            <View style={styles.playersVoteGrid}>
              {activePlayers.map((p) => {
                const isSelected = myVote === p.id;
                const hasVoted = !!votes[p.id];
                const isMe = p.id === currentPlayerId;

                return (
                  <TouchableOpacity
                    key={p.id}
                    disabled={isMe || !!myVote}
                    style={[
                      styles.votePlayerCard,
                      {
                        backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.15)' : colors.surface,
                        borderColor: isSelected ? colors.error : colors.borderLight,
                        borderRadius: radius.lg,
                        padding: spacing.md,
                        opacity: isMe ? 0.5 : 1,
                      },
                    ]}
                    onPress={() => handleCastVote(p.id)}
                    activeOpacity={0.7}
                  >
                    <Avatar name={p.displayName} color={p.avatarColor} size={48} />
                    <Text
                      style={[
                        typography.titleSmall,
                        { color: colors.textPrimary, marginTop: spacing.xs },
                      ]}
                      numberOfLines={1}
                    >
                      {p.displayName} {isMe ? '(You)' : ''}
                    </Text>

                    {hasVoted ? (
                      <View style={[styles.voteStatusPill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <MaterialCommunityIcons name="check" size={14} color={colors.success} />
                        <Text style={[typography.labelSmall, { color: colors.success, marginLeft: 4 }]}>
                          Voted
                        </Text>
                      </View>
                    ) : (
                      <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: 4 }]}>
                        Waiting...
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {myVote && (
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.primary, textAlign: 'center', marginTop: spacing.lg, fontWeight: '600' },
                ]}
              >
                Vote recorded! Waiting for all players... ({Object.keys(votes).length} / {activePlayers.length})
              </Text>
            )}

            {/* Clues Cheat Sheet during Voting */}
            {clues.length > 0 && (
              <View style={{ marginTop: spacing.xl }}>
                <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                  Clues Cheat Sheet:
                </Text>
                {clues.map((c, i) => (
                  <View
                    key={i}
                    style={[
                      styles.clueCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.borderLight,
                        borderRadius: radius.md,
                        padding: spacing.sm,
                        marginBottom: spacing.xs,
                      },
                    ]}
                  >
                    <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '700' }]}>
                      {c.playerName}:
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textPrimary, marginTop: 2 }]}>
                      "{c.clueText}"
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ==========================================
            PHASE 5: IMPOSTOR GUESS (LAST CHANCE)
            ========================================== */}
        {phase === 'impostor_guess' && (
          <View style={styles.phaseContent}>
            <View
              style={[
                styles.alertBox,
                { backgroundColor: '#2A080C', borderColor: colors.error, borderRadius: radius.xl },
              ]}
            >
              <MaterialCommunityIcons name="alert-decagram" size={48} color={colors.error} />
              <Text
                style={[
                  typography.titleLarge,
                  { color: colors.error, fontWeight: '900', marginTop: spacing.xs, textAlign: 'center' },
                ]}
              >
                IMPOSTOR CAUGHT!
              </Text>
              <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center' }]}>
                {accusedPlayer?.displayName} was voted out! BUT they get one last chance to steal the victory.
              </Text>
            </View>

            {/* Impostor gets to guess */}
            {amImpostor ? (
              <View style={{ marginTop: spacing.xl }}>
                <Text
                  style={[
                    typography.titleMedium,
                    { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.md },
                  ]}
                >
                  What was the secret word?
                </Text>

                {/* Multiple choice options */}
                <View style={styles.optionsColumn}>
                  {[
                    activeWordItem?.word || 'Secret Word',
                    ...(activeWordItem?.decoys || ['Alternate Location', 'Decoy Object', 'Other Place']),
                  ]
                    .sort(() => 0.5 - Math.random())
                    .map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.guessOptionBtn,
                          {
                            backgroundColor: guessSelection === opt ? colors.primary : colors.surface,
                            borderColor: guessSelection === opt ? colors.primary : colors.borderLight,
                            borderRadius: radius.lg,
                            padding: spacing.md,
                            marginBottom: spacing.sm,
                          },
                        ]}
                        onPress={() => {
                          haptics.selection();
                          setGuessSelection(opt);
                          if (isAdmin) {
                            handleImpostorGuess(opt);
                          } else {
                            broadcastEvent({
                              type: 'impostor_guess_submit',
                              senderId: currentPlayerId,
                              payload: { wordGuess: opt },
                              timestamp: Date.now(),
                            });
                          }
                        }}
                      >
                        <Text
                          style={[
                            typography.titleSmall,
                            {
                              color: guessSelection === opt ? colors.textOnPrimary : colors.textPrimary,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', marginTop: spacing.xxl }}>
                <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <MaterialCommunityIcons name="timer-sand" size={48} color={colors.primary} />
                </RNAnimated.View>
                <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.md }]}>
                  The Impostor is attempting their final guess...
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ==========================================
            PHASE 6: ROUND SUMMARY
            ========================================== */}
        {phase === 'round_summary' && (
          <View style={styles.phaseContent}>
            {winner === 'detectives' ? (
              <View
                style={[
                  styles.winBanner,
                  { backgroundColor: '#0B2418', borderColor: colors.success, borderRadius: radius.xl },
                ]}
              >
                <MaterialCommunityIcons name="trophy" size={54} color={colors.success} />
                <Text
                  style={[
                    typography.headlineLarge,
                    { color: colors.success, fontWeight: '900', marginTop: spacing.xs },
                  ]}
                >
                  DETECTIVES WIN!
                </Text>
                <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center' }]}>
                  The Impostor was identified and failed to deduce the secret word.
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.winBanner,
                  { backgroundColor: '#2A080C', borderColor: colors.error, borderRadius: radius.xl },
                ]}
              >
                <MaterialCommunityIcons name="incognito" size={54} color={colors.error} />
                <Text
                  style={[
                    typography.headlineLarge,
                    { color: colors.error, fontWeight: '900', marginTop: spacing.xs },
                  ]}
                >
                  IMPOSTOR WINS!
                </Text>
                <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center' }]}>
                  {impostorGuessCorrect
                    ? 'The Impostor deduced the secret word and stole the victory!'
                    : 'The Impostor escaped undetected among the crew.'}
                </Text>
              </View>
            )}

            {/* Revealed Secret Word & Impostors */}
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                  marginTop: spacing.lg,
                },
              ]}
            >
              <Text style={[typography.labelSmall, { color: colors.textTertiary }]}>
                THE SECRET WORD WAS:
              </Text>
              <Text style={[typography.headlineSmall, { color: colors.primary, fontWeight: '800' }]}>
                {activeWordItem?.word || mySecretWord}
              </Text>

              <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.sm }} />

              <Text style={[typography.labelSmall, { color: colors.textTertiary }]}>
                THE TRUE IMPOSTOR(S):
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {impostorIds.map((impId) => {
                  const imp = players.find((p) => p.id === impId);
                  return (
                    <View
                      key={impId}
                      style={[
                        styles.impostorChip,
                        { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: radius.full },
                      ]}
                    >
                      <MaterialCommunityIcons name="incognito" size={16} color={colors.error} />
                      <Text style={[typography.labelMedium, { color: colors.error, marginLeft: 4, fontWeight: '700' }]}>
                        {imp?.displayName || 'Impostor'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Admin Next Round Button */}
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
                onPress={handleNextRoundOrFinish}
              >
                <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                  {roundNumber < totalRounds ? `Next Round (${roundNumber + 1}/${totalRounds}) →` : 'Finish Game 🏆'}
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
  secretCard: {
    borderWidth: 2,
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardUnrevealed: {
    alignItems: 'center',
  },
  cardRevealed: {
    alignItems: 'center',
    width: '100%',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  hintBox: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
  },
  turnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  reminderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 12,
  },
  myTurnBox: {
    borderWidth: 1.5,
  },
  clueInput: {
    borderWidth: 1,
    fontSize: 14,
  },
  clueChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  clueChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  submitClueBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clueCard: {
    borderWidth: 1,
  },
  reactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    justifyContent: 'center',
  },
  reactionBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reactionFeed: {
    marginTop: 12,
    padding: 10,
  },
  interactiveClueCard: {
    borderWidth: 1.5,
  },
  clueQuestionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  targetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  clearTargetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chatBoxContainer: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  chatBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  chatScroll: {
    maxHeight: 220,
    minHeight: 90,
  },
  chatEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  chatBubble: {
    padding: 10,
    borderWidth: 1,
  },
  myChatBubble: {
    alignSelf: 'stretch',
  },
  otherChatBubble: {
    alignSelf: 'stretch',
  },
  chatBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  sendChatBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quickChipsWrapper: {
    marginTop: 14,
  },
  playersVoteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  votePlayerCard: {
    width: '48%',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  voteStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 6,
  },
  alertBox: {
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
  },
  optionsColumn: {
    width: '100%',
  },
  guessOptionBtn: {
    borderWidth: 1.5,
    alignItems: 'center',
  },
  winBanner: {
    alignItems: 'center',
    padding: 24,
    borderWidth: 2,
  },
  summaryCard: {
    borderWidth: 1,
  },
  impostorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  primaryActionButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
