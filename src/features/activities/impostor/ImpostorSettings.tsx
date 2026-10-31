/**
 * Find the Impostor — Settings Screen Component
 * Allows room host to configure categories, impostor count, timer settings, and custom words.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import type { ActivitySettingsProps } from '@/src/types/activity';
import {
  IMPOSTOR_CATEGORIES,
  type ImpostorCategory,
  type SecretWordItem,
} from './types';
import { haptics } from '@/src/utils/haptics';

const ROUND_OPTIONS = [
  { value: 3, label: '3 rounds' },
  { value: 5, label: '5 rounds' },
  { value: 8, label: '8 rounds' },
];

const IMPOSTOR_COUNT_OPTIONS: Array<{ value: 1 | 2 | 'auto'; label: string; desc: string }> = [
  { value: 'auto', label: 'Auto (Recommended)', desc: '1 for <6 players, 2 for 6+' },
  { value: 1, label: '1 Impostor', desc: 'Classic single spy' },
  { value: 2, label: '2 Impostors', desc: 'High chaos & deception' },
];

const CLUE_TIME_OPTIONS = [
  { value: 15, label: '15s' },
  { value: 20, label: '20s' },
  { value: 30, label: '30s' },
];

const DISCUSSION_TIME_OPTIONS = [
  { value: 45, label: '45s' },
  { value: 60, label: '60s' },
  { value: 90, label: '90s' },
];

export function ImpostorSettings({ settings, onSettingsChange }: ActivitySettingsProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const currentCategory = (settings.category as ImpostorCategory | 'all') ?? 'all';
  const currentImpostorCount = (settings.impostorCount as 1 | 2 | 'auto') ?? 'auto';
  const currentRounds = (settings.rounds as number) ?? 5;
  const currentClueTime = (settings.clueTimePerPlayer as number) ?? 20;
  const currentDiscussionTime = (settings.discussionTime as number) ?? 60;
  const customWords = (settings.customWords as SecretWordItem[]) ?? [];

  const [customWord, setCustomWord] = useState('');
  const [customHint, setCustomHint] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const updateSetting = (key: string, value: unknown) => {
    haptics.selection();
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleAddCustom = () => {
    if (!customWord.trim()) {
      haptics.warning();
      Alert.alert('Missing Word', 'Please enter a secret word or location.');
      return;
    }

    const newWordItem: SecretWordItem = {
      id: `custom_${Date.now()}`,
      category: 'objects',
      word: customWord.trim(),
      hint: customHint.trim() || 'A mystery secret known only to the detectives.',
      decoys: ['Mystery Item', 'Unknown Object', 'Secret Place'],
    };

    haptics.success();
    const updated = [newWordItem, ...customWords];
    onSettingsChange({ ...settings, customWords: updated });
    setCustomWord('');
    setCustomHint('');
    setShowCustomForm(false);
  };

  const handleDeleteCustom = (id: string) => {
    haptics.medium();
    const updated = customWords.filter((w) => w.id !== id);
    onSettingsChange({ ...settings, customWords: updated });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Category Section */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
          Mystery Category
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textTertiary, marginBottom: spacing.md }]}>
          Choose the theme of the secret words
        </Text>

        <View style={styles.grid}>
          {IMPOSTOR_CATEGORIES.map((cat) => {
            const isSelected = currentCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                  },
                ]}
                onPress={() => updateSetting('category', cat.value)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryHeader}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                        borderRadius: radius.full,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={cat.icon as any}
                      size={22}
                      color={isSelected ? colors.textOnPrimary : colors.textPrimary}
                    />
                  </View>
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </View>
                <Text
                  style={[
                    typography.titleSmall,
                    { color: colors.textPrimary, marginTop: spacing.sm },
                  ]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.textSecondary, marginTop: spacing.xxs },
                  ]}
                  numberOfLines={2}
                >
                  {cat.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Impostor Count Section */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
          Impostor Count
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textTertiary, marginBottom: spacing.md }]}>
          How many impostors should hide among the players
        </Text>

        <View style={styles.optionsColumn}>
          {IMPOSTOR_COUNT_OPTIONS.map((opt) => {
            const isSelected = currentImpostorCount === opt.value;
            return (
              <TouchableOpacity
                key={String(opt.value)}
                style={[
                  styles.countCard,
                  {
                    backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                  },
                ]}
                onPress={() => updateSetting('impostorCount', opt.value)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.titleSmall, { color: colors.textPrimary }]}>
                    {opt.label}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xxs }]}>
                    {opt.desc}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                  size={22}
                  color={isSelected ? colors.primary : colors.textTertiary}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Rounds Configuration */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
          Game Length
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textTertiary, marginBottom: spacing.md }]}>
          Number of secret word rounds to play
        </Text>

        <View style={styles.segmentedRow}>
          {ROUND_OPTIONS.map((opt) => {
            const isSelected = currentRounds === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.segmentedBtn,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
                onPress={() => updateSetting('rounds', opt.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: isSelected ? colors.textOnPrimary : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Timers Row */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
          Turn & Discussion Timers
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textTertiary, marginBottom: spacing.md }]}>
          Pacing for clues and group debates
        </Text>

        <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          Clue Time Per Player
        </Text>
        <View style={[styles.segmentedRow, { marginBottom: spacing.md }]}>
          {CLUE_TIME_OPTIONS.map((opt) => {
            const isSelected = currentClueTime === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.segmentedBtn,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
                onPress={() => updateSetting('clueTimePerPlayer', opt.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: isSelected ? colors.textOnPrimary : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          Discussion Time
        </Text>
        <View style={styles.segmentedRow}>
          {DISCUSSION_TIME_OPTIONS.map((opt) => {
            const isSelected = currentDiscussionTime === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.segmentedBtn,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
                onPress={() => updateSetting('discussionTime', opt.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: isSelected ? colors.textOnPrimary : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Custom Words Section */}
      <View style={styles.section}>
        <View style={styles.customHeader}>
          <View>
            <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>
              Custom Secret Words ({customWords.length})
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: spacing.xxs }]}>
              Add your own inside jokes or party locations
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.addBtn,
              {
                backgroundColor: showCustomForm ? colors.surfaceElevated : colors.primary,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
              },
            ]}
            onPress={() => {
              haptics.selection();
              setShowCustomForm(!showCustomForm);
            }}
          >
            <MaterialCommunityIcons
              name={showCustomForm ? 'close' : 'plus'}
              size={18}
              color={showCustomForm ? colors.textPrimary : colors.textOnPrimary}
            />
            <Text
              style={[
                typography.labelSmall,
                {
                  color: showCustomForm ? colors.textPrimary : colors.textOnPrimary,
                  marginLeft: spacing.xxs,
                  fontWeight: '600',
                },
              ]}
            >
              {showCustomForm ? 'Cancel' : 'Add Word'}
            </Text>
          </TouchableOpacity>
        </View>

        {showCustomForm && (
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                borderRadius: radius.lg,
                padding: spacing.md,
                marginTop: spacing.md,
              },
            ]}
          >
            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Secret Word / Location:
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderLight,
                  color: colors.textPrimary,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  marginBottom: spacing.sm,
                },
              ]}
              placeholder="e.g. John's Backyard Barbecue"
              placeholderTextColor={colors.textTertiary}
              value={customWord}
              onChangeText={setCustomWord}
            />

            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Hint for Impostor (Optional):
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderLight,
                  color: colors.textPrimary,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  marginBottom: spacing.md,
                },
              ]}
              placeholder="e.g. An outdoor gathering with friends"
              placeholderTextColor={colors.textTertiary}
              value={customHint}
              onChangeText={setCustomHint}
            />

            <TouchableOpacity
              style={[
                styles.submitCustomBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm,
                },
              ]}
              onPress={handleAddCustom}
            >
              <Text style={[typography.labelMedium, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                Save Secret Word
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {customWords.length > 0 && (
          <View style={{ marginTop: spacing.md }}>
            {customWords.map((cw) => (
              <View
                key={cw.id}
                style={[
                  styles.customItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    marginBottom: spacing.xs,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                    {cw.word}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                    Hint: {cw.hint}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteCustom(cw.id)}
                  style={{ padding: spacing.xs }}
                >
                  <MaterialCommunityIcons name="delete-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    borderWidth: 1.5,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsColumn: {
    width: '100%',
  },
  countCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentedBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formCard: {
    borderWidth: 1,
  },
  textInput: {
    borderWidth: 1,
    fontSize: 14,
  },
  submitCustomBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  customItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
});
