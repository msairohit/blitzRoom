/**
 * Who Am I? — Settings Screen Component
 * Allows room host to configure categories, turn timers, hints, and custom personas.
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
  WHO_AM_I_CATEGORIES,
  type WhoAmICategory,
  type PersonaItem,
} from './types';
import { haptics } from '@/src/utils/haptics';

const TIME_OPTIONS = [
  { value: 60, label: '60s' },
  { value: 90, label: '90s' },
  { value: 120, label: '120s' },
];

const ROUNDS_OPTIONS = [
  { value: 1, label: '1 turn each', desc: 'Fast-paced party round' },
  { value: 2, label: '2 turns each', desc: 'Double the mystery & laughs' },
];

const HINT_OPTIONS = [
  { value: 1, label: '1 hint max' },
  { value: 2, label: '2 hints max' },
  { value: 3, label: '3 hints max' },
];

export function WhoAmISettings({ settings, onSettingsChange }: ActivitySettingsProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const currentCategory = (settings.category as WhoAmICategory | 'all') ?? 'all';
  const currentTimePerTurn = (settings.timePerTurn as number) ?? 90;
  const currentRoundsPerPlayer = (settings.roundsPerPlayer as number) ?? 1;
  const currentMaxHints = (settings.maxHintsAllowed as number) ?? 3;
  const customPersonas = (settings.customPersonas as PersonaItem[]) ?? [];

  const [customName, setCustomName] = useState('');
  const [customTagline, setCustomTagline] = useState('');
  const [customHint1, setCustomHint1] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const updateSetting = (key: string, value: unknown) => {
    haptics.selection();
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleAddCustom = () => {
    if (!customName.trim()) {
      haptics.warning();
      Alert.alert('Missing Name', 'Please enter a name for the secret persona.');
      return;
    }

    const newPersona: PersonaItem = {
      id: `custom_${Date.now()}`,
      category: 'characters',
      name: customName.trim(),
      tagline: customTagline.trim() || 'Custom Party Persona',
      hints: [
        customHint1.trim() || 'A well-known figure familiar to everyone in this room.',
        'Ask specific yes/no questions to narrow down their identity!',
        'You are getting very close!',
      ],
      icon: 'account-question',
      decoys: ['Mystery Guest', 'Secret Identity', 'Party Legend'],
    };

    haptics.success();
    const updated = [newPersona, ...customPersonas];
    onSettingsChange({ ...settings, customPersonas: updated });
    setCustomName('');
    setCustomTagline('');
    setCustomHint1('');
    setShowCustomForm(false);
  };

  const handleDeleteCustom = (id: string) => {
    haptics.medium();
    const updated = customPersonas.filter((p) => p.id !== id);
    onSettingsChange({ ...settings, customPersonas: updated });
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
          Persona Deck Theme
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textTertiary, marginBottom: spacing.md }]}>
          Who will be placed on players' foreheads?
        </Text>

        <View style={styles.grid}>
          {WHO_AM_I_CATEGORIES.map((cat) => {
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

      {/* Rounds Configuration */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
          Turns Per Player
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textTertiary, marginBottom: spacing.md }]}>
          How many times each player takes the Hot Seat
        </Text>

        <View style={styles.optionsColumn}>
          {ROUNDS_OPTIONS.map((opt) => {
            const isSelected = currentRoundsPerPlayer === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
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
                onPress={() => updateSetting('roundsPerPlayer', opt.value)}
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

      {/* Turn Timer & Hints */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
          Time & Clues
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textTertiary, marginBottom: spacing.md }]}>
          Guesser timer and hint allowances
        </Text>

        <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          Time In Hot Seat
        </Text>
        <View style={[styles.segmentedRow, { marginBottom: spacing.md }]}>
          {TIME_OPTIONS.map((opt) => {
            const isSelected = currentTimePerTurn === opt.value;
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
                onPress={() => updateSetting('timePerTurn', opt.value)}
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
          Maximum Clues Unlockable
        </Text>
        <View style={styles.segmentedRow}>
          {HINT_OPTIONS.map((opt) => {
            const isSelected = currentMaxHints === opt.value;
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
                onPress={() => updateSetting('maxHintsAllowed', opt.value)}
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

      {/* Custom Personas */}
      <View style={styles.section}>
        <View style={styles.customHeader}>
          <View>
            <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>
              Custom Personas ({customPersonas.length})
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: spacing.xxs }]}>
              Add mutual friends, coworkers, or inside jokes
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
              {showCustomForm ? 'Cancel' : 'Add Persona'}
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
              Persona Name:
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
              placeholder="e.g. Professor Smith"
              placeholderTextColor={colors.textTertiary}
              value={customName}
              onChangeText={setCustomName}
            />

            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Tagline / Description:
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
              placeholder="e.g. Physics Department Head / Coffee Addict"
              placeholderTextColor={colors.textTertiary}
              value={customTagline}
              onChangeText={setCustomTagline}
            />

            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Hint:
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
              placeholder="e.g. Always gives pop quizzes on Mondays"
              placeholderTextColor={colors.textTertiary}
              value={customHint1}
              onChangeText={setCustomHint1}
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
                Save Persona
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {customPersonas.length > 0 && (
          <View style={{ marginTop: spacing.md }}>
            {customPersonas.map((cp) => (
              <View
                key={cp.id}
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
                    {cp.name}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                    {cp.tagline}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteCustom(cp.id)}
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
