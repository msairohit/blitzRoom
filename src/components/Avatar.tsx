/**
 * Shared Avatar component for BlitzRoom.
 * Displays player initials/first-letter on a colored circle background with admin crown option.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme';

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  isAdmin?: boolean;
}

export function Avatar({ name, color, size = 50, isAdmin = false }: AvatarProps) {
  const { radius, typography } = useTheme();
  const initials = name.trim().charAt(0).toUpperCase();

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  };

  const crownSize = Math.max(12, size * 0.35);

  return (
    <View style={styles.container}>
      {isAdmin && (
        <View style={[styles.crown, { top: -crownSize * 0.7 }]}>
          <MaterialCommunityIcons name="crown" size={crownSize} color="#FBBF24" />
        </View>
      )}
      <View style={containerStyle}>
        <Text
          style={[
            typography.titleLarge,
            {
              fontSize: size * 0.45,
              color: '#FFFFFF',
              fontWeight: 'bold',
              textAlign: 'center',
            },
          ]}
        >
          {initials}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crown: {
    position: 'absolute',
    zIndex: 1,
    transform: [{ rotate: '0deg' }],
  },
});
