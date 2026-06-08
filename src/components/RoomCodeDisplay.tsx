/**
 * Room Code Display Component
 * Renders the room code in a premium stylized layout with quick tap-to-copy.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/src/theme';
import { formatRoomCode } from '@/src/utils/generateRoomCode';
import { haptics } from '@/src/utils/haptics';

interface RoomCodeDisplayProps {
  code: string;
  large?: boolean;
}

export function RoomCodeDisplay({ code, large = false }: RoomCodeDisplayProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    haptics.success();
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatted = formatRoomCode(code);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundTertiary,
          borderColor: copied ? colors.success : colors.border,
          borderRadius: radius.md,
          paddingVertical: large ? spacing.md : spacing.sm,
          paddingHorizontal: large ? spacing.xl : spacing.md,
        },
      ]}
      onPress={handleCopy}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={[styles.codeText, { color: colors.textPrimary, fontSize: large ? 24 : 16 }]}>
          {formatted}
        </Text>
        <MaterialCommunityIcons
          name={copied ? 'check' : 'content-copy'}
          size={large ? 20 : 16}
          color={copied ? colors.success : colors.textSecondary}
          style={{ marginLeft: spacing.sm }}
        />
      </View>
      {copied && (
        <Text style={[styles.copiedText, { color: colors.success, fontSize: large ? 12 : 10 }]}>
          Copied to clipboard!
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeText: {
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'Courier', // monospaced style
  },
  copiedText: {
    marginTop: 4,
    fontWeight: '600',
  },
});
