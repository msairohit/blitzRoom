/**
 * Quiz Game Component
 * The main gameplay screen for the Quiz activity.
 * Handles question display, timer, answer selection, and scoring.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import type { ActivityGameProps, ActivityResults } from '@/src/types/activity';
import { SAMPLE_QUESTIONS, type QuizQuestion } from './types';
import { haptics } from '@/src/utils/haptics';
import { roomService } from '@/src/services/roomService';

type QuizPhase = 'countdown' | 'question' | 'reveal' | 'scores' | 'finished';

export function QuizGame({
  roomId,
  currentPlayerId,
  isAdmin,
  players,
  settings,
  onActivityEnd,
}: ActivityGameProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const numberOfQuestions = (settings.numberOfQuestions as number) ?? 10;
  const timePerQuestion = (settings.timePerQuestion as number) ?? 15;

  const [phase, setPhase] = useState<QuizPhase>('countdown');
  const [countdownValue, setCountdownValue] = useState(3);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timePerQuestion);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const [questions] = useState<QuizQuestion[]>(() => {
    let baseQuestions = SAMPLE_QUESTIONS;
    if (settings.customQuestions && Array.isArray(settings.customQuestions) && settings.customQuestions.length > 0) {
      baseQuestions = settings.customQuestions;
    } else if (settings.category && settings.category !== 'general') {
      baseQuestions = SAMPLE_QUESTIONS.filter((q) => q.category === settings.category);
    }
    // Shuffle and pick questions
    const shuffled = [...baseQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(numberOfQuestions, shuffled.length));
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  const currentQuestion = questions[currentQuestionIndex];

  // Countdown phase
  useEffect(() => {
    if (phase !== 'countdown') return;

    const interval = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase('question');
          return 0;
        }
        haptics.light();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // Question timer
  useEffect(() => {
    if (phase !== 'question') return;

    setTimeLeft(timePerQuestion);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Time's up — show reveal
          setShowCorrect(true);
          setPhase('reveal');
          haptics.warning();
          return 0;
        }
        if (prev <= 5) {
          haptics.light();
          // Pulse animation for last 5 seconds
          RNAnimated.sequence([
            RNAnimated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 100,
              useNativeDriver: true,
            }),
            RNAnimated.timing(pulseAnim, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]).start();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentQuestionIndex, timePerQuestion, pulseAnim]);

  // Auto-advance from reveal to next question
  useEffect(() => {
    if (phase !== 'reveal') return;

    const timeout = setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setShowCorrect(false);
        setPhase('question');
      } else {
        setPhase('finished');
        // Mark player as done in the database
        roomService.updatePlayer(roomId, currentPlayerId, { isDone: true }).catch(console.error);
      }
    }, 2500);

    return () => clearTimeout(timeout);
  }, [phase, currentQuestionIndex, questions.length, roomId, currentPlayerId]);

  // Simulated Bots Loop (Runs only on Admin client)
  useEffect(() => {
    if (!isAdmin || phase !== 'question') return;

    const bots = players.filter((p) => p.id.startsWith('bot_') && !p.isDone);
    if (bots.length === 0) return;

    const timers = bots.map((bot) => {
      // Simulate bot taking random time to answer between 3 and 10 seconds
      const delay = 3000 + Math.random() * 7000;
      return setTimeout(() => {
        const isCorrect = Math.random() < 0.7; // 70% accuracy
        if (isCorrect) {
          const elapsedSec = delay / 1000;
          const botTimeLeft = Math.max(1, timePerQuestion - elapsedSec);
          const timeBonus = Math.round((botTimeLeft / timePerQuestion) * 100);
          const points = 100 + timeBonus;
          const newScore = (bot.score || 0) + points;
          roomService.updatePlayer(roomId, bot.id, { score: newScore }).catch(console.error);
        }
      }, delay);
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [currentQuestionIndex, phase, isAdmin, players, roomId, timePerQuestion]);

  // Mark all bots as done when Admin finishes
  useEffect(() => {
    if (!isAdmin || phase !== 'finished') return;

    const unfinishedBots = players.filter((p) => p.id.startsWith('bot_') && !p.isDone);
    unfinishedBots.forEach((bot) => {
      roomService.updatePlayer(roomId, bot.id, { isDone: true }).catch(console.error);
    });
  }, [phase, isAdmin, players, roomId]);

  const handleAnswer = useCallback(
    (index: number) => {
      if (selectedAnswer !== null || phase !== 'question') return;

      setSelectedAnswer(index);
      if (timerRef.current) clearInterval(timerRef.current);

      const isCorrect = index === currentQuestion.correctIndex;
      if (isCorrect) {
        // Score: base 100 + time bonus
        const timeBonus = Math.round((timeLeft / timePerQuestion) * 100);
        const roundScore = 100 + timeBonus;
        // Submit score to database immediately
        roomService.submitScore(roomId, roundScore).catch(console.error);
        haptics.success();
      } else {
        haptics.error();
      }

      setShowCorrect(true);
      setTimeout(() => setPhase('reveal'), 500);
    },
    [selectedAnswer, phase, currentQuestion, timeLeft, timePerQuestion, roomId]
  );

  const handleFinish = useCallback(() => {
    const results: ActivityResults = {
      scores: players
        .map((p) => ({
          playerId: p.id,
          displayName: p.displayName,
          score: p.score ?? 0,
          rank: 0,
        }))
        .sort((a, b) => b.score - a.score)
        .map((s, i) => ({ ...s, rank: i + 1 })),
    };
    onActivityEnd(results);
  }, [players, onActivityEnd]);

  // --- RENDER ---

  // Countdown
  if (phase === 'countdown') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[typography.displayLarge, { color: colors.textPrimary, fontSize: 100, fontWeight: 'bold' }]}>
          {countdownValue}
        </Text>
        <Text style={[typography.titleLarge, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Get Ready!
        </Text>
      </View>
    );
  }

  // Finished — show final scores
  if (phase === 'finished') {
    const sortedScores = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const allFinished = players.every((p) => p.isDone);
    
    // Find my rank
    const myRank = sortedScores.findIndex((p) => p.id === currentPlayerId) + 1;
    const getOrdinal = (n: number) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const medals = ['🥇', '🥈', '🥉'];

    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: spacing.xxl }]}>
        <Text style={[typography.displayMedium, { color: colors.primary, marginBottom: spacing.lg }]}>
          🏆 Results
        </Text>

        {allFinished ? (
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <Text style={[typography.headlineMedium, { color: colors.success, fontWeight: 'bold', textAlign: 'center' }]}>
              🎉 All Players Done!
            </Text>
            <Text style={[typography.titleLarge, { color: colors.textSecondary, marginTop: spacing.xs }]}>
              You finished in <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{getOrdinal(myRank)}</Text> place!
            </Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <Text style={[typography.titleMedium, { color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center' }]}>
              Waiting for other players to finish... ⏳
            </Text>
          </View>
        )}

        {sortedScores.map((player, index) => (
          <View
            key={player.id}
            style={[
              styles.scoreRow,
              {
                backgroundColor: index === 0 ? colors.primaryMuted : colors.surface,
                borderRadius: radius.md,
                padding: spacing.lg,
                marginBottom: spacing.sm,
                borderWidth: index === 0 ? 1 : 0,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text style={{ fontSize: 24, marginRight: spacing.md }}>
              {medals[index] ?? `#${index + 1}`}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>
                {player.displayName}
                {player.id === currentPlayerId ? ' (You)' : ''}
              </Text>
            </View>
            {player.isDone ? (
              <Text style={[typography.headlineSmall, { color: colors.primary }]}>
                {player.score ?? 0}
              </Text>
            ) : (
              <Text style={[typography.bodyMedium, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                Playing... ⚡
              </Text>
            )}
          </View>
        ))}

        {isAdmin && (
          <TouchableOpacity
            style={[
              styles.finishButton,
              {
                backgroundColor: allFinished ? colors.primary : colors.textSecondary,
                borderRadius: radius.md,
                paddingVertical: spacing.lg,
                paddingHorizontal: spacing.xxxl,
                marginTop: spacing.xxxl,
              },
            ]}
            onPress={handleFinish}
            activeOpacity={0.8}
          >
            <Text style={[typography.titleMedium, { color: colors.textOnPrimary }]}>
              {allFinished ? 'End Game' : 'End Game Early'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Question / Reveal phase
  const progress = (currentQuestionIndex + 1) / questions.length;
  const myCurrentScore = players.find((p) => p.id === currentPlayerId)?.score ?? 0;

  return (
    <View style={[styles.gameContainer, { backgroundColor: colors.background }]}>
      {/* Header — progress + timer */}
      <View style={[styles.header, { padding: spacing.lg }]}>
        <View style={styles.headerLeft}>
          <Text style={[typography.labelMedium, { color: colors.textTertiary }]}>
            {currentQuestionIndex + 1} / {questions.length}
          </Text>
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: colors.backgroundTertiary,
                borderRadius: radius.full,
                height: 4,
                marginTop: spacing.xs,
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.full,
                  width: `${progress * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        <RNAnimated.View
          style={[
            styles.timerBadge,
            {
              backgroundColor: timeLeft <= 5 ? colors.error : colors.primary,
              borderRadius: radius.full,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="timer-outline"
            size={16}
            color={timeLeft <= 5 ? '#FFF' : colors.textOnPrimary}
          />
          <Text
            style={[
              typography.titleSmall,
              {
                color: timeLeft <= 5 ? '#FFF' : colors.textOnPrimary,
                marginLeft: spacing.xs,
              },
            ]}
          >
            {timeLeft}s
          </Text>
        </RNAnimated.View>
      </View>

      {/* Question */}
      <View style={[styles.questionSection, { padding: spacing.xxl }]}>
        <Text
          style={[
            typography.headlineMedium,
            { color: colors.textPrimary, textAlign: 'center' },
          ]}
        >
          {currentQuestion.question}
        </Text>
      </View>

      {/* Options */}
      <View style={[styles.optionsSection, { padding: spacing.lg, gap: spacing.md }]}>
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrectOption = index === currentQuestion.correctIndex;
          const showResult = showCorrect;

          let bgColor = colors.surface;
          let borderColor = colors.borderLight;
          let textColor = colors.textPrimary;

          if (showResult) {
            if (isCorrectOption) {
              bgColor = 'rgba(52, 211, 153, 0.2)';
              borderColor = colors.success;
              textColor = colors.success;
            } else if (isSelected && !isCorrectOption) {
              bgColor = 'rgba(248, 113, 113, 0.2)';
              borderColor = colors.error;
              textColor = colors.error;
            }
          } else if (isSelected) {
            bgColor = colors.primaryMuted;
            borderColor = colors.primary;
            textColor = colors.primary;
          }

          const optionLetters = ['A', 'B', 'C', 'D'];

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                {
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                  borderRadius: radius.lg,
                  paddingVertical: spacing.lg,
                  paddingHorizontal: spacing.xl,
                },
              ]}
              onPress={() => handleAnswer(index)}
              activeOpacity={0.7}
              disabled={selectedAnswer !== null}
            >
              <View
                style={[
                  styles.optionLetter,
                  {
                    backgroundColor: isSelected || (showResult && isCorrectOption)
                      ? borderColor
                      : colors.backgroundTertiary,
                    borderRadius: radius.full,
                    width: 32,
                    height: 32,
                    marginRight: spacing.md,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.titleSmall,
                    {
                      color:
                        isSelected || (showResult && isCorrectOption)
                          ? '#FFF'
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {optionLetters[index]}
                </Text>
              </View>
              <Text style={[typography.bodyLarge, { color: textColor, flex: 1 }]}>
                {option}
              </Text>
              {showResult && isCorrectOption && (
                <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
              )}
              {showResult && isSelected && !isCorrectOption && (
                <MaterialCommunityIcons name="close-circle" size={24} color={colors.error} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Score bar */}
      <View
        style={[
          styles.scoreBar,
          {
            backgroundColor: colors.surface,
            padding: spacing.lg,
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
          },
        ]}
      >
        <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Your Score</Text>
        <Text style={[typography.headlineSmall, { color: colors.primary }]}>
          {myCurrentScore}
        </Text>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  progressBar: {
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionSection: {
    justifyContent: 'center',
    minHeight: 120,
  },
  optionsSection: {
    flex: 1,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  optionLetter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  scoreBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finishButton: {
    alignItems: 'center',
  },
});
