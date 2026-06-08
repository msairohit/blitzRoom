/**
 * Join Room Screen
 * Allows players to enter a 6-character room code to join an active lobby.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme';
import { useRoomStore } from '@/src/features/room/roomStore';
import { roomService } from '@/src/services/roomService';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { LoadingOverlay } from '@/src/components/LoadingOverlay';
import { haptics } from '@/src/utils/haptics';

export default function JoinRoomScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleJoin = async () => {
    const cleanedCode = code.trim().toUpperCase();
    if (cleanedCode.length !== 6) {
      setErrorMsg('Code must be exactly 6 characters');
      haptics.error();
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const room = await roomService.joinRoom(cleanedCode);
      haptics.success();
      // Store current room in state
      useRoomStore.getState().setRoom(room);
      setLoading(false);
      // Navigate to room lobby
      router.push(`/room/${room.code}`);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Failed to join room');
      haptics.error();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <LoadingOverlay visible={loading} message="Joining room..." />

      <View style={[styles.content, { paddingHorizontal: spacing.lg }]}>
        <Card style={styles.card}>
          <Text style={[typography.titleMedium, { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.md }]}>
            Enter Invite Code
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: errorMsg ? colors.error : colors.border,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: 24,
                marginBottom: spacing.md,
              },
            ]}
            placeholder="E.g. ABC-DEF"
            placeholderTextColor={colors.textTertiary}
            value={code}
            onChangeText={(txt) => {
              setCode(txt.toUpperCase().replace(/[^A-Z0-9]/g, ''));
              setErrorMsg(null);
            }}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="default"
          />

          {errorMsg && (
            <Text style={[typography.bodySmall, { color: colors.error, marginBottom: spacing.md, textAlign: 'center' }]}>
              {errorMsg}
            </Text>
          )}

          <Button
            title="Join Room"
            onPress={handleJoin}
            disabled={code.length !== 6}
            variant="primary"
            size="lg"
          />
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 4,
  },
});
