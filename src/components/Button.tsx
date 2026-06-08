/**
 * Shared Button component for BlitzRoom.
 * Supports primary, secondary, outline, and ghost variants.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';
import { haptics } from '@/src/utils/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const handlePress = () => {
    haptics.light();
    onPress();
  };

  const sizeStyles = {
    sm: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.sm,
      ...typography.titleSmall,
      iconSize: 16,
    },
    md: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xxl,
      borderRadius: radius.md,
      ...typography.titleMedium,
      iconSize: 20,
    },
    lg: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxxl,
      borderRadius: radius.lg,
      ...typography.titleLarge,
      iconSize: 24,
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: disabled ? colors.backgroundTertiary : colors.primary,
      borderWidth: 0,
      borderColor: 'transparent',
      textColor: disabled ? colors.textTertiary : colors.textOnPrimary,
    },
    secondary: {
      backgroundColor: disabled ? colors.backgroundTertiary : colors.primaryMuted,
      borderWidth: 0,
      borderColor: 'transparent',
      textColor: disabled ? colors.textTertiary : colors.primary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: disabled ? colors.borderLight : colors.primary,
      textColor: disabled ? colors.textTertiary : colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: 'transparent',
      textColor: disabled ? colors.textTertiary : colors.primary,
    },
  };

  const s = sizeStyles[size];
  const v = variantStyles[variant];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: v.backgroundColor,
          borderWidth: v.borderWidth,
          borderColor: v.borderColor,
          borderRadius: s.borderRadius,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          opacity: disabled ? 0.6 : 1,
          alignSelf: fullWidth ? 'stretch' : 'center',
        },
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.textColor} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <MaterialCommunityIcons
              name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={s.iconSize}
              color={v.textColor}
              style={{ marginRight: spacing.sm }}
            />
          )}
          <Text
            style={[
              {
                fontSize: s.fontSize,
                fontWeight: s.fontWeight,
                letterSpacing: s.letterSpacing,
                color: v.textColor,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <MaterialCommunityIcons
              name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={s.iconSize}
              color={v.textColor}
              style={{ marginLeft: spacing.sm }}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
