/**
 * Truth or Dare Settings Component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/src/theme';
import type { ActivitySettingsProps } from '@/src/types/activity';
import { TOD_CATEGORIES, type TodCategory } from './types';
import { haptics } from '@/src/utils/haptics';

const ROUND_OPTIONS = [
  { value: 0, label: 'Unlimited' },
  { value: 5, label: '5 rounds' },
  { value: 10, label: '10 rounds' },
  { value: 15, label: '15 rounds' },
];

export function TruthOrDareSettings({ settings, onSettingsChange }: ActivitySettingsProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const currentCategory = (settings.category as TodCategory) ?? 'fun';
  const currentRounds = (settings.rounds as number) ?? 0;

  const updateSetting = (key: string, value: unknown) => {
    haptics.selection();
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Category */}
      <View style={[styles.section, { marginBottom: spacing.xxl }]}>
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}>
          Vibe
        </Text>
        <View style={styles.categoryGrid}>
          {TOD_CATEGORIES.map((cat) => {
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
                    paddingVertical: spacing.xl,
                    paddingHorizontal: spacing.md,
                    width: '48%',
                    marginBottom: spacing.sm,
                  },
                ]}
                onPress={() => updateSetting('category', cat.value)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 28, marginBottom: spacing.sm }}>{cat.emoji}</Text>
                <Text
                  style={[
                    typography.titleSmall,
                    {
                      color: isSelected ? colors.primary : colors.textSecondary,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Rounds */}
      <View style={[styles.section, { marginBottom: spacing.xxl }]}>
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}>
          Rounds
        </Text>
        <View style={[styles.segmentRow, { gap: spacing.sm }]}>
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
                    paddingVertical: spacing.md,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                  },
                ]}
                onPress={() => updateSetting('rounds', option.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.bodySmall,
                    {
                      color: isSelected ? colors.textOnPrimary : colors.textSecondary,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {},
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  segmentRow: {
    flexDirection: 'row',
  },
  segmentButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
