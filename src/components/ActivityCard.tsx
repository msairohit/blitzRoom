/**
 * ActivityCard component — shown in the activity picker grid.
 */

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import type { ActivityDefinition } from '@/src/types/activity';
import { haptics } from '@/src/utils/haptics';

interface ActivityCardProps {
  activity: ActivityDefinition;
  onPress: () => void;
}

export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const handlePress = () => {
    haptics.light();
    onPress();
  };

  const categoryColors: Record<string, string> = {
    trivia: '#60A5FA',
    party: '#F472B6',
    game: '#34D399',
    social: '#FBBF24',
  };

  const accentColor = categoryColors[activity.category] ?? colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          padding: spacing.xl,
          borderWidth: 1,
          borderColor: colors.borderLight,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: `${accentColor}20`,
            borderRadius: radius.lg,
            width: 56,
            height: 56,
            marginBottom: spacing.lg,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={activity.icon as keyof typeof MaterialCommunityIcons.glyphMap}
          size={28}
          color={accentColor}
        />
      </View>

      {/* Name */}
      <Text
        style={[
          typography.titleMedium,
          { color: colors.textPrimary, marginBottom: spacing.xs },
        ]}
        numberOfLines={1}
      >
        {activity.name}
      </Text>

      {/* Description */}
      <Text
        style={[
          typography.bodySmall,
          { color: colors.textTertiary, marginBottom: spacing.md },
        ]}
        numberOfLines={2}
      >
        {activity.description}
      </Text>

      {/* Meta info */}
      <View style={[styles.metaRow, { gap: spacing.md }]}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="account-group" size={14} color={colors.textTertiary} />
          <Text style={[typography.bodySmall, { color: colors.textTertiary, marginLeft: spacing.xxs }]}>
            {activity.minPlayers}-{activity.maxPlayers}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textTertiary} />
          <Text style={[typography.bodySmall, { color: colors.textTertiary, marginLeft: spacing.xxs }]}>
            {activity.estimatedDuration}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {},
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
