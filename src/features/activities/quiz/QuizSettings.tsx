/**
 * Quiz Settings Component
 * Allows the admin to configure quiz parameters before starting.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '@/src/theme';
import type { ActivitySettingsProps } from '@/src/types/activity';
import {
  QUIZ_CATEGORIES,
  QUIZ_DIFFICULTIES,
  type QuizCategory,
  type QuizDifficulty,
  type QuizQuestion,
  type CustomQuiz,
} from './types';
import { haptics } from '@/src/utils/haptics';
import { quizService } from '@/src/services/quizService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const QUESTION_COUNTS = [5, 10, 15, 20];
const TIME_OPTIONS = [10, 15, 20, 30];

export function QuizSettings({ settings, onSettingsChange }: ActivitySettingsProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const currentCategory = (settings.category as QuizCategory) ?? 'general';
  const currentDifficulty = (settings.difficulty as QuizDifficulty) ?? 'medium';
  const currentQuestionCount = (settings.numberOfQuestions as number) ?? 10;
  const currentTimePerQuestion = (settings.timePerQuestion as number) ?? 15;

  const [customQuizzes, setCustomQuizzes] = useState<CustomQuiz[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for creating a custom quiz
  const [quizName, setQuizName] = useState('');
  const [quizEmoji, setQuizEmoji] = useState('🧠');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  // Question editing sub-states
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrectIndex, setQCorrectIndex] = useState<number>(0);

  // Load custom quizzes if user is logged in
  useEffect(() => {
    const loadCustomQuizzes = async () => {
      const fetched = await quizService.getCustomQuizzes();
      setCustomQuizzes(fetched);
    };
    loadCustomQuizzes();
  }, []);

  const updateSetting = (key: string, value: unknown) => {
    haptics.selection();
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleOpenCreateModal = () => {
    haptics.medium();
    setQuizName('');
    setQuizEmoji('🧠');
    setQuizQuestions([]);
    setIsEditingQuestion(false);
    setEditingQuestionIndex(null);
    setIsModalOpen(true);
  };

  const handleStartAddQuestion = () => {
    haptics.light();
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrectIndex(0);
    setEditingQuestionIndex(null);
    setIsEditingQuestion(true);
  };

  const handleStartEditQuestion = (index: number) => {
    haptics.light();
    const q = quizQuestions[index];
    setQText(q.question);
    setQOptions([...q.options]);
    setQCorrectIndex(q.correctIndex);
    setEditingQuestionIndex(index);
    setIsEditingQuestion(true);
  };

  const handleDeleteQuestion = (index: number) => {
    haptics.warning();
    setQuizQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveQuestion = () => {
    if (!qText.trim()) {
      Alert.alert('Error', 'Question text cannot be empty');
      return;
    }
    if (qOptions.some((opt) => !opt.trim())) {
      Alert.alert('Error', 'All 4 options must be filled');
      return;
    }

    const questionObj: QuizQuestion = {
      id: editingQuestionIndex !== null ? quizQuestions[editingQuestionIndex].id : `q_${Date.now()}_${Math.random()}`,
      question: qText.trim(),
      options: qOptions.map((o) => o.trim()),
      correctIndex: qCorrectIndex,
      category: 'custom',
      difficulty: currentDifficulty,
    };

    if (editingQuestionIndex !== null) {
      // Modify existing
      setQuizQuestions((prev) => {
        const updated = [...prev];
        updated[editingQuestionIndex] = questionObj;
        return updated;
      });
    } else {
      // Add new
      setQuizQuestions((prev) => [...prev, questionObj]);
    }

    haptics.success();
    setIsEditingQuestion(false);
    setEditingQuestionIndex(null);
  };

  const handleSaveQuiz = async () => {
    if (!quizName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    if (quizQuestions.length === 0) {
      Alert.alert('Error', 'Please add at least one question');
      return;
    }

    const savedQuiz = await quizService.saveCustomQuiz(
      quizName.trim(),
      quizEmoji.trim() || '🧠',
      quizQuestions
    );

    // Add to the local categories list so the user can select it in the UI
    setCustomQuizzes((prev) => [savedQuiz, ...prev]);

    // Set as the active quiz selection
    onSettingsChange({
      ...settings,
      category: savedQuiz.id,
      customQuestions: savedQuiz.questions,
      customCategoryName: savedQuiz.name,
      customCategoryEmoji: savedQuiz.emoji,
      numberOfQuestions: Math.min(currentQuestionCount, savedQuiz.questions.length),
    });

    haptics.success();
    setIsModalOpen(false);
  };

  // Combine standard and custom categories for rendering
  const allCategories = [
    ...QUIZ_CATEGORIES,
    ...customQuizzes.map((q) => ({
      value: q.id,
      label: q.name,
      emoji: q.emoji,
    })),
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Category */}
      <View style={[styles.section, { marginBottom: spacing.xxl }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>
            Category
          </Text>
          <TouchableOpacity
            style={[styles.createBtn, { borderColor: colors.primary }]}
            onPress={handleOpenCreateModal}
          >
            <Text style={[typography.labelMedium, { color: colors.primary }]}>
              ➕ Custom Category
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.optionGrid}>
          {allCategories.map((cat) => {
            const isSelected = currentCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    marginRight: spacing.sm,
                    marginBottom: spacing.sm,
                  },
                ]}
                onPress={() => {
                  const custom = customQuizzes.find((q) => q.id === cat.value);
                  if (custom) {
                    onSettingsChange({
                      ...settings,
                      category: custom.id,
                      customQuestions: custom.questions,
                      customCategoryName: custom.name,
                      customCategoryEmoji: custom.emoji,
                      numberOfQuestions: Math.min(currentQuestionCount, custom.questions.length),
                    });
                  } else {
                    onSettingsChange({
                      ...settings,
                      category: cat.value,
                      customQuestions: undefined,
                      customCategoryName: undefined,
                      customCategoryEmoji: undefined,
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16, marginRight: spacing.xs }}>{cat.emoji}</Text>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: isSelected ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Difficulty */}
      <View style={[styles.section, { marginBottom: spacing.xxl }]}>
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}>
          Difficulty
        </Text>
        <View style={[styles.segmentRow, { gap: spacing.sm }]}>
          {QUIZ_DIFFICULTIES.map((diff) => {
            const isSelected = currentDifficulty === diff.value;
            return (
              <TouchableOpacity
                key={diff.value}
                style={[
                  styles.segmentButton,
                  {
                    flex: 1,
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderRadius: radius.md,
                    paddingVertical: spacing.md,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                  },
                ]}
                onPress={() => updateSetting('difficulty', diff.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.titleSmall,
                    {
                      color: isSelected ? colors.textOnPrimary : colors.textSecondary,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {diff.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Number of Questions */}
      <View style={[styles.section, { marginBottom: spacing.xxl }]}>
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}>
          Questions
        </Text>
        <View style={[styles.segmentRow, { gap: spacing.sm }]}>
          {QUESTION_COUNTS.map((count) => {
            const isSelected = currentQuestionCount === count;
            return (
              <TouchableOpacity
                key={count}
                style={[
                  styles.segmentButton,
                  {
                    flex: 1,
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderRadius: radius.md,
                    paddingVertical: spacing.md,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                  },
                ]}
                onPress={() => updateSetting('numberOfQuestions', count)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.titleSmall,
                    {
                      color: isSelected ? colors.textOnPrimary : colors.textSecondary,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Time per Question */}
      <View style={[styles.section, { marginBottom: spacing.xxl }]}>
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}>
          Time per Question (seconds)
        </Text>
        <View style={[styles.segmentRow, { gap: spacing.sm }]}>
          {TIME_OPTIONS.map((time) => {
            const isSelected = currentTimePerQuestion === time;
            return (
              <TouchableOpacity
                key={time}
                style={[
                  styles.segmentButton,
                  {
                    flex: 1,
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderRadius: radius.md,
                    paddingVertical: spacing.md,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                  },
                ]}
                onPress={() => updateSetting('timePerQuestion', time)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.titleSmall,
                    {
                      color: isSelected ? colors.textOnPrimary : colors.textSecondary,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {time}s
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Creation Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderRadius: radius.lg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[typography.titleLarge, { color: colors.textPrimary }]}>
                Create Custom Category
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
              {!isEditingQuestion ? (
                <>
                  <View style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                      Category Name
                    </Text>
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.border, borderRadius: radius.md }]}
                      placeholder="e.g. Harry Potter, Anime, Math..."
                      placeholderTextColor={colors.textTertiary}
                      value={quizName}
                      onChangeText={setQuizName}
                    />
                  </View>

                  <View style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                      Category Emoji
                    </Text>
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.border, borderRadius: radius.md }]}
                      placeholder="e.g. 🧙‍♂️, 🇯🇵, 🔢..."
                      placeholderTextColor={colors.textTertiary}
                      value={quizEmoji}
                      onChangeText={setQuizEmoji}
                      maxLength={4}
                    />
                  </View>

                  <View style={styles.questionsHeader}>
                    <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>
                      Questions ({quizQuestions.length})
                    </Text>
                    <TouchableOpacity
                      style={[styles.addQBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                      onPress={handleStartAddQuestion}
                    >
                      <Text style={[typography.labelMedium, { color: colors.textOnPrimary }]}>
                        ➕ Add Question
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {quizQuestions.length === 0 ? (
                    <View style={styles.emptyQuestions}>
                      <Text style={[typography.bodyMedium, { color: colors.textTertiary }]}>
                        No questions added yet. Add at least one!
                      </Text>
                    </View>
                  ) : (
                    quizQuestions.map((q, index) => (
                      <View key={q.id} style={[styles.qListItem, { backgroundColor: colors.surface, borderRadius: radius.md }]}>
                        <View style={{ flex: 1, marginRight: spacing.sm }}>
                          <Text style={[typography.bodyLarge, { color: colors.textPrimary }]} numberOfLines={1}>
                            {index + 1}. {q.question}
                          </Text>
                          <Text style={[typography.bodySmall, { color: colors.success }]}>
                            Answer: {q.options[q.correctIndex]}
                          </Text>
                        </View>
                        <View style={styles.qActionRow}>
                          <TouchableOpacity onPress={() => handleStartEditQuestion(index)}>
                            <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteQuestion(index)}>
                            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}

                  <TouchableOpacity
                    style={[styles.saveQuizBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                    onPress={handleSaveQuiz}
                  >
                    <Text style={[typography.titleMedium, { color: colors.textOnPrimary }]}>
                      Create Category
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                // Question form
                <>
                  <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}>
                    {editingQuestionIndex !== null ? 'Edit Question' : 'New Question'}
                  </Text>

                  <View style={{ marginBottom: spacing.lg }}>
                    <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                      Question Text
                    </Text>
                    <TextInput
                      style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.border, borderRadius: radius.md }]}
                      placeholder="Enter the question..."
                      placeholderTextColor={colors.textTertiary}
                      value={qText}
                      onChangeText={setQText}
                      multiline
                    />
                  </View>

                  <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                    Answer Options
                  </Text>
                  {qOptions.map((option, index) => {
                    const optionLetters = ['A', 'B', 'C', 'D'];
                    const isCorrect = qCorrectIndex === index;
                    return (
                      <View key={index} style={styles.optionInputRow}>
                        <TouchableOpacity
                          style={[
                            styles.correctRadio,
                            {
                              backgroundColor: isCorrect ? colors.success : colors.backgroundTertiary,
                              borderColor: isCorrect ? colors.success : colors.border,
                            },
                          ]}
                          onPress={() => setQCorrectIndex(index)}
                        >
                          <Text style={{ color: isCorrect ? '#FFF' : colors.textSecondary, fontWeight: 'bold' }}>
                            {optionLetters[index]}
                          </Text>
                        </TouchableOpacity>
                        <TextInput
                          style={[
                            styles.textInput,
                            {
                              flex: 1,
                              marginLeft: spacing.sm,
                              color: colors.textPrimary,
                              borderColor: isCorrect ? colors.success : colors.border,
                              borderRadius: radius.md,
                            },
                          ]}
                          placeholder={`Option ${optionLetters[index]}`}
                          placeholderTextColor={colors.textTertiary}
                          value={option}
                          onChangeText={(text) => {
                            const newOptions = [...qOptions];
                            newOptions[index] = text;
                            setQOptions(newOptions);
                          }}
                        />
                      </View>
                    );
                  })}

                  <View style={[styles.qFormActions, { gap: spacing.md, marginTop: spacing.lg }]}>
                    <TouchableOpacity
                      style={[styles.cancelQBtn, { borderColor: colors.border, borderRadius: radius.md }]}
                      onPress={() => setIsEditingQuestion(false)}
                    >
                      <Text style={[typography.titleSmall, { color: colors.textSecondary }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveQBtn, { backgroundColor: colors.success, borderRadius: radius.md }]}
                      onPress={handleSaveQuestion}
                    >
                      <Text style={[typography.titleSmall, { color: colors.textOnPrimary }]}>
                        Save Question
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {},
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  createBtn: {
    borderWidth: 1.5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  segmentRow: {
    flexDirection: 'row',
  },
  segmentButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  textInput: {
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
  },
  questionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  addQBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  emptyQuestions: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  qActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveQuizBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  correctRadio: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  qFormActions: {
    flexDirection: 'row',
  },
  cancelQBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveQBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
