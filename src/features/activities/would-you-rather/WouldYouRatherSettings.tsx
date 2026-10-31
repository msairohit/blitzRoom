/**
 * Would You Rather — Settings Screen Component
 * Allows room host to configure categories, scoring modes, timers, and custom dilemmas.
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
  WYR_CATEGORIES,
  WYR_MODES,
  type WouldYouRatherCategory,
  type WouldYouRatherMode,
  type Dilemma,
} from './types';
import { haptics } from '@/src/utils/haptics';

const ROUND_OPTIONS = [
  { value: 5, label: '5 rounds' },
  { value: 8, label: '8 rounds' },
  { value: 10, label: '10 rounds' },
  { value: 15, label: '15 rounds' },
];

const TIME_OPTIONS = [
  { value: 10, label: '10s' },
  { value: 15, label: '15s' },
  { value: 20, label: '20s' },
  { value: 30, label: '30s' },
];

export function WouldYouRatherSettings({ settings, onSettingsChange }: ActivitySettingsProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const currentCategory = (settings.category as WouldYouRatherCategory | 'all') ?? 'all';
  const currentMode = (settings.mode as WouldYouRatherMode) ?? 'majority';
  const currentRounds = (settings.rounds as number) ?? 8;
  const currentTime = (settings.timePerDilemma as number) ?? 15;
  const currentAutoAdvance = (settings.autoAdvance as boolean) ?? true;
  const customDilemmas = (settings.customDilemmas as Dilemma[]) ?? [];

  const [customOptA, setCustomOptA] = useState('');
  const [customOptB, setCustomOptB] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const updateSetting = (key: string, value: unknown) => {
    haptics.selection();
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleAddCustom = () => {
    if (!customOptA.trim() || !customOptB.trim()) {
      haptics.warning();
      Alert.alert('Incomplete Dilemma', 'Please enter text for both Option A and Option B.');
      return;
    }

    const newDilemma: Dilemma = {
      id: `custom_${Date.now()}`,
      category: 'party',
      optionA: customOptA.trim(),
      optionB: customOptB.trim(),
      iconA: 'help-circle-outline',
      iconB: 'help-circle-outline',
    };

    haptics.success();
    const updated = [newDilemma, ...customDilemmas];
    onSettingsChange({ ...settings, customDilemmas: updated });
    setCustomOptA('');
    setCustomOptB('');
    setShowCustomForm(false);
  };

  const handleDeleteCustom = (id: string) => {
    haptics.medium();
    const updated = customDilemmas.filter((d) => d.id !== id);
    onSettingsChange({ ...settings, customDilemmas: updated });
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
          Dilemma Theme
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textTertiary, marginBottom: spacing.md }]}>
          Choose the vibe for this round of dilemmas
        </Text>

        <View style={styles.grid}>
          {WYR_CATEGORIES.map((cat) => {
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
                <View style={styles.cardHeader}>
                  <Text style={{ fontSize: 24 }}>{cat.emoji}</Text>
                  {isSelected && (
                    <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
                  )}
                </View>
                <Text
                  style={[
                    typography.titleSmall,
                    {
                      color: isSelected ? colors.primary : colors.textPrimary,
                      marginTop: spacing.xs,
                      fontWeight: 'bold',
                    },
                  ]}
                >
                  {cat.label}
                </Text>
                <Text
                  style={[
                    typography.bodySmall,
                    {
                      color: colors.textSecondary,
                      fontSize: 11,
                      marginTop: 2,
                    },
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

      {/* Game Mode / Scoring Section */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
          Game Mode & Scoring
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textTertiary, marginBottom: spacing.md }]}>
          How players earn points in this match
        </Text>

        <View style={{ gap: spacing.sm }}>
          {WYR_MODES.map((mode) => {
            const isSelected = currentMode === mode.value;
            return (
              <TouchableOpacity
                key={mode.value}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    borderRadius: radius.md,
                    padding: spacing.md,
                  },
                ]}
                onPress={() => updateSetting('mode', mode.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.modeIconWrap, { backgroundColor: isSelected ? colors.primary : colors.surfaceElevated }]}>
                  <MaterialCommunityIcons
                    name={mode.icon as any}
                    size={20}
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[typography.titleSmall, { color: isSelected ? colors.primary : colors.textPrimary, fontWeight: 'bold' }]}>
                    {mode.label}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 12 }]}>
                    {mode.description}
                  </Text>
                </View>
                {isSelected && (
                  <MaterialCommunityIcons name="radiobox-marked" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Rounds & Timer Row */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}>
          Game Length & Timer
        </Text>

        {/* Rounds */}
        <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          Number of Dilemmas
        </Text>
        <View style={[styles.segmentRow, { gap: spacing.sm, marginBottom: spacing.lg }]}>
          {ROUND_OPTIONS.map((option) => {
            const isSelected = currentRounds === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.segmentButton,
                  {
                    flex: 1,
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm + 2,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                  },
                ]}
                onPress={() => updateSetting('rounds', option.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                      textAlign: 'center',
                      fontWeight: isSelected ? 'bold' : 'normal',
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timer */}
        <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          Voting Time per Dilemma
        </Text>
        <View style={[styles.segmentRow, { gap: spacing.sm, marginBottom: spacing.lg }]}>
          {TIME_OPTIONS.map((option) => {
            const isSelected = currentTime === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.segmentButton,
                  {
                    flex: 1,
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm + 2,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                  },
                ]}
                onPress={() => updateSetting('timePerDilemma', option.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                      textAlign: 'center',
                      fontWeight: isSelected ? 'bold' : 'normal',
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Group Discussion & Advance Control */}
        <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          Discussion & Next Dilemma Control
        </Text>
        <View style={{ gap: spacing.sm }}>
          <TouchableOpacity
            style={[
              styles.modeCard,
              {
                backgroundColor: currentAutoAdvance ? colors.primaryMuted : colors.surface,
                borderColor: currentAutoAdvance ? colors.primary : colors.borderLight,
                borderRadius: radius.md,
                padding: spacing.md,
              },
            ]}
            onPress={() => updateSetting('autoAdvance', true)}
            activeOpacity={0.7}
          >
            <View style={[styles.modeIconWrap, { backgroundColor: currentAutoAdvance ? colors.primary : colors.surfaceElevated }]}>
              <MaterialCommunityIcons
                name="timer-sand"
                size={20}
                color={currentAutoAdvance ? '#FFFFFF' : colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.titleSmall, { color: currentAutoAdvance ? colors.primary : colors.textPrimary, fontWeight: 'bold' }]}>
                Timer with Host Pause Button
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 12 }]}>
                Timer counts down to next dilemma, but room creator can pause anytime for discussion.
              </Text>
            </View>
            {currentAutoAdvance && (
              <MaterialCommunityIcons name="radiobox-marked" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeCard,
              {
                backgroundColor: !currentAutoAdvance ? colors.primaryMuted : colors.surface,
                borderColor: !currentAutoAdvance ? colors.primary : colors.borderLight,
                borderRadius: radius.md,
                padding: spacing.md,
              },
            ]}
            onPress={() => updateSetting('autoAdvance', false)}
            activeOpacity={0.7}
          >
            <View style={[styles.modeIconWrap, { backgroundColor: !currentAutoAdvance ? colors.primary : colors.surfaceElevated }]}>
              <MaterialCommunityIcons
                name="chat-processing-outline"
                size={20}
                color={!currentAutoAdvance ? '#FFFFFF' : colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.titleSmall, { color: !currentAutoAdvance ? colors.primary : colors.textPrimary, fontWeight: 'bold' }]}>
                Manual Discussion Mode
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary, fontSize: 12 }]}>
                Unlimited discussion time! The next dilemma only starts when the room creator taps "Next".
              </Text>
            </View>
            {!currentAutoAdvance && (
              <MaterialCommunityIcons name="radiobox-marked" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Dilemmas Section */}
      <View style={[styles.section, { marginBottom: spacing.lg }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>
            Custom Dilemmas ({customDilemmas.length})
          </Text>
          <TouchableOpacity
            style={[styles.addCustomBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 }]}
            onPress={() => {
              haptics.light();
              setShowCustomForm(!showCustomForm);
            }}
          >
            <MaterialCommunityIcons name={showCustomForm ? 'chevron-up' : 'plus'} size={16} color={colors.primary} />
            <Text style={[typography.labelSmall, { color: colors.primary, marginLeft: 4 }]}>
              {showCustomForm ? 'Hide' : 'Add Custom'}
            </Text>
          </TouchableOpacity>
        </View>

        {showCustomForm && (
          <View style={[styles.customForm, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }]}>
            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: 4 }]}>
              Option A:
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight, color: colors.textPrimary, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm }]}
              placeholder="e.g. Always have green skin"
              placeholderTextColor={colors.textTertiary}
              value={customOptA}
              onChangeText={setCustomOptA}
              maxLength={120}
            />

            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: 4 }]}>
              Option B:
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight, color: colors.textPrimary, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.md }]}
              placeholder="e.g. Always have bright blue hair"
              placeholderTextColor={colors.textTertiary}
              value={customOptB}
              onChangeText={setCustomOptB}
              maxLength={120}
            />

            <TouchableOpacity
              style={[styles.submitCustomBtn, { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm }]}
              onPress={handleAddCustom}
            >
              <Text style={[typography.labelMedium, { color: '#FFFFFF', textAlign: 'center', fontWeight: 'bold' }]}>
                Add Dilemma to Game
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {customDilemmas.length > 0 ? (
          customDilemmas.map((item, index) => (
            <View
              key={item.id}
              style={[styles.customItem, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: 'bold' }]}>
                  A: {item.optionA}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.secondary, fontWeight: 'bold' }]}>
                  B: {item.optionB}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteCustom(item.id)}
                style={{ padding: spacing.xs }}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={[typography.bodySmall, { color: colors.textTertiary, fontStyle: 'italic' }]}>
            No custom dilemmas added yet. You can add your own group inside jokes!
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryCard: {
    width: '48%',
    borderWidth: 1.5,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  modeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
  },
  segmentButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  customForm: {
    borderWidth: 1,
  },
  input: {
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
    borderWidth: 1,
  },
});
