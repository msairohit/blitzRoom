/**
 * Player Card Component
 * Renders a player's avatar, status, and ready/not-ready indicator in the lobby.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import { Avatar } from './Avatar';
import type { Player } from '@/src/types/player';

interface PlayerCardProps {
  player: Player;
  isCurrentUser: boolean;
  onKickPress?: () => void;
  showKickOption?: boolean;
}

export function PlayerCard({
  player,
  isCurrentUser,
  onKickPress,
  showKickOption = false,
}: PlayerCardProps) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: isCurrentUser ? colors.primary : colors.borderLight,
          borderRadius: radius.md,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.leftSection}>
        <Avatar name={player.displayName} color={player.avatarColor} size={42} isAdmin={player.isAdmin} />
        <View style={[styles.infoSection, { marginLeft: spacing.md }]}>
          <Text
            numberOfLines={1}
            style={[
              typography.titleSmall,
              { color: colors.textPrimary, fontWeight: isCurrentUser ? 'bold' : 'normal' },
            ]}
          >
            {player.displayName} {isCurrentUser && '(You)'}
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textTertiary }]}>
            {player.isAdmin ? 'Host' : 'Player'}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {player.isReady ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: 'rgba(52, 211, 153, 0.15)',
                borderColor: colors.success,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              },
            ]}
          >
            <Text style={[typography.bodySmall, { color: colors.success, fontWeight: 'bold' }]}>
              Ready
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                borderColor: colors.warning,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              },
            ]}
          >
            <Text style={[typography.bodySmall, { color: colors.warning, fontWeight: 'bold' }]}>
              Waiting
            </Text>
          </View>
        )}

        {showKickOption && !player.isAdmin && !isCurrentUser && (
          <TouchableOpacity
            style={[styles.kickButton, { marginLeft: spacing.md }]}
            onPress={onKickPress}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="close-circle-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    marginBottom: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoSection: {
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    borderWidth: 1,
  },
  kickButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
