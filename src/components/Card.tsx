/**
 * Reusable Card component for BlitzRoom.
 * Supports glassmorphism styling and interactive presses.
 */

import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '@/src/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  activeOpacity?: number;
  elevated?: boolean;
}

export function Card({
  children,
  style,
  onPress,
  activeOpacity = 0.8,
  elevated = false,
}: CardProps) {
  const { colors, spacing, radius } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
      borderColor: colors.borderLight,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
