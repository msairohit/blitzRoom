/**
 * Uno Settings Component
 * Configures hand sizes, stacking rules, turn timers, and points.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import type { ActivitySettingsProps } from '@/src/types/activity';
import { haptics } from '@/src/utils/haptics';

const HAND_SIZE_OPTIONS = [
  { value: 5, label: '5 Cards', desc: 'Fast Blitz' },
  { value: 7, label: '7 Cards', desc: 'Classic Standard' },
  { value: 10, label: '10 Cards', desc: 'Long Match' },
];

const TIMER_OPTIONS = [
  { value: 15, label: '15s', desc: 'Blitz' },
  { value: 20, label: '20s', desc: 'Standard' },
  { value: 30, label: '30s', desc: 'Relaxed' },
  { value: 0, label: 'None', desc: 'Casual' },
];

const TARGET_SCORE_OPTIONS = [
  { value: 0, label: '1 Round', desc: 'First to empty hand wins' },
  { value: 250, label: '250 Pts', desc: 'Tournament format' },
  { value: 500, label: '500 Pts', desc: 'Official championship' },
];

export function UnoSettings({ settings, onSettingsChange }: ActivitySettingsProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const currentHandSize = (settings.cardsPerPlayer as number) ?? 7;
  const currentStacking = (settings.allowStacking as boolean) ?? true;
  const currentTimePerTurn = (settings.timePerTurn as number) ?? 20;
  const currentDrawRule = (settings.drawRule as string) ?? 'draw-to-play';
  const currentTargetScore = (settings.targetScore as number) ?? 0;

  const [showRulesGuide, setShowRulesGuide] = useState(false);

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
      {/* Starting Hand Size */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="cards-outline" size={20} color={colors.primary} />
          <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>
            Starting Hand Size
          </Text>
        </View>
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
          Number of cards dealt to each player at the start of the round.
        </Text>

        <View style={styles.optionsRow}>
          {HAND_SIZE_OPTIONS.map((opt) => {
            const isSelected = currentHandSize === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                activeOpacity={0.7}
                onPress={() => updateSetting('cardsPerPlayer', opt.value)}
                style={[
                  styles.optionPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    borderRadius: radius.lg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {opt.label}
                </Text>
                <Text
                  style={[
                    styles.optionDesc,
                    { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary },
                  ]}
                >
                  {opt.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Stacking Rule (+2 on +2, +4 on +4) */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons name="layers-triple" size={20} color="#F59E0B" />
              <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>
                Stack Penalty Cards (+2 / +4)
              </Text>
            </View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
              Allow players to respond to a +2 with another +2 (or +4 with +4), passing the accumulated penalty to the next player!
            </Text>
          </View>
          <Switch
            value={currentStacking}
            onValueChange={(val) => updateSetting('allowStacking', val)}
            trackColor={{ false: colors.borderLight, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Turn Timer */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="timer-sand" size={20} color="#38BDF8" />
          <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>
            Turn Timer
          </Text>
        </View>
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
          Limit time per player turn. If time expires, a card is automatically drawn.
        </Text>

        <View style={styles.optionsRow}>
          {TIMER_OPTIONS.map((opt) => {
            const isSelected = currentTimePerTurn === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                activeOpacity={0.7}
                onPress={() => updateSetting('timePerTurn', opt.value)}
                style={[
                  styles.optionPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    borderRadius: radius.lg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {opt.label}
                </Text>
                <Text
                  style={[
                    styles.optionDesc,
                    { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary },
                  ]}
                >
                  {opt.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Draw Rule */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="card-plus-outline" size={20} color="#10B981" />
          <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>
            Draw Deck Rule
          </Text>
        </View>
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
          What happens when a player taps the draw deck:
        </Text>

        <View style={styles.verticalOptionsCol}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => updateSetting('drawRule', 'draw-to-play')}
            style={[
              styles.verticalOptionCard,
              {
                backgroundColor: currentDrawRule === 'draw-to-play' ? `${colors.primary}18` : colors.surface,
                borderColor: currentDrawRule === 'draw-to-play' ? colors.primary : colors.borderLight,
                borderRadius: radius.lg,
              },
            ]}
          >
            <View style={styles.verticalOptionHeader}>
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                Draw 1 & Play or Pass
              </Text>
              {currentDrawRule === 'draw-to-play' && (
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
              )}
            </View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
              Player draws 1 card. If playable, they can immediately play it or pass. (Recommended for online games)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => updateSetting('drawRule', 'draw-until-match')}
            style={[
              styles.verticalOptionCard,
              {
                backgroundColor: currentDrawRule === 'draw-until-match' ? `${colors.primary}18` : colors.surface,
                borderColor: currentDrawRule === 'draw-until-match' ? colors.primary : colors.borderLight,
                borderRadius: radius.lg,
              },
            ]}
          >
            <View style={styles.verticalOptionHeader}>
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                Draw Until Match
              </Text>
              {currentDrawRule === 'draw-until-match' && (
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
              )}
            </View>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
              Player must keep drawing cards until they pull a valid card that matches color or value.
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Target Points / Length */}
      <View style={[styles.section, { marginBottom: spacing.xl }]}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="trophy-outline" size={20} color="#FBBF24" />
          <Text style={[typography.titleMedium, { color: colors.textPrimary }]}>
            Match Format
          </Text>
        </View>
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
          Win the single round or play cumulative score rounds.
        </Text>

        <View style={styles.optionsRow}>
          {TARGET_SCORE_OPTIONS.map((opt) => {
            const isSelected = currentTargetScore === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                activeOpacity={0.7}
                onPress={() => updateSetting('targetScore', opt.value)}
                style={[
                  styles.optionPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.borderLight,
                    borderRadius: radius.lg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {opt.label}
                </Text>
                <Text
                  style={[
                    styles.optionDesc,
                    { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary },
                  ]}
                >
                  {opt.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Collapsible Rules Guide */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          haptics.light();
          setShowRulesGuide(!showRulesGuide);
        }}
        style={[
          styles.rulesGuideCard,
          {
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            borderColor: colors.borderLight,
          },
        ]}
      >
        <View style={styles.rulesGuideHeader}>
          <MaterialCommunityIcons name="book-open-outline" size={22} color={colors.primary} />
          <Text style={[typography.titleSmall, { color: colors.textPrimary, flex: 1, marginLeft: 10 }]}>
            Official Uno Card & Rules Guide
          </Text>
          <MaterialCommunityIcons
            name={showRulesGuide ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={colors.textSecondary}
          />
        </View>

        {showRulesGuide && (
          <View style={styles.rulesContent}>
            <Text style={[styles.ruleItem, { color: colors.textSecondary }]}>
              • <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Match Card:</Text> Play a card matching current color or number.
            </Text>
            <Text style={[styles.ruleItem, { color: colors.textSecondary }]}>
              • <Text style={{ fontWeight: '700', color: '#EF4444' }}>Draw Two (+2):</Text> Next player draws 2 cards and skips their turn.
            </Text>
            <Text style={[styles.ruleItem, { color: colors.textSecondary }]}>
              • <Text style={{ fontWeight: '700', color: '#3B82F6' }}>Skip (🚫):</Text> Skips the next player's turn completely.
            </Text>
            <Text style={[styles.ruleItem, { color: colors.textSecondary }]}>
              • <Text style={{ fontWeight: '700', color: '#10B981' }}>Reverse (🔄):</Text> Reverses gameplay direction (clockwise ⇄ counter-clockwise).
            </Text>
            <Text style={[styles.ruleItem, { color: colors.textSecondary }]}>
              • <Text style={{ fontWeight: '700', color: '#F59E0B' }}>Wild (🌈):</Text> Change active play color to Red, Blue, Green, or Yellow.
            </Text>
            <Text style={[styles.ruleItem, { color: colors.textSecondary }]}>
              • <Text style={{ fontWeight: '700', color: '#EC4899' }}>Wild Draw 4 (+4):</Text> Change color AND next player draws 4 cards!
            </Text>
            <Text style={[styles.ruleItem, { color: colors.textSecondary }]}>
              • <Text style={{ fontWeight: '700', color: '#FDE047' }}>Call UNO!:</Text> When holding 1 card, press the flashing UNO button before someone catches you!
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    width: '100%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  optionPill: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  optionDesc: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verticalOptionsCol: {
    gap: 10,
  },
  verticalOptionCard: {
    padding: 14,
    borderWidth: 1.5,
  },
  verticalOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rulesGuideCard: {
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  rulesGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rulesContent: {
    marginTop: 14,
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  ruleItem: {
    fontSize: 13,
    lineHeight: 19,
  },
});
