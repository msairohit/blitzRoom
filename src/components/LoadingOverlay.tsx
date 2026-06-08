/**
 * Shared LoadingOverlay Component
 * Prevents user interaction during async network operations with a loading state.
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '@/src/theme';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message = 'Loading...' }: LoadingOverlayProps) {
  const { colors, spacing, typography } = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.overlay }]}>
      <View style={[styles.card, { backgroundColor: colors.backgroundTertiary, padding: spacing.xl, borderRadius: 12 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {message ? (
          <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' }]}>
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
