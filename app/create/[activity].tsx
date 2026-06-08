/**
 * Dynamic Activity Settings Screen
 * Renders activity-specific config forms and triggers room creation.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/src/theme';
import { getActivity } from '@/src/features/activities/registry';
import { useRoomStore } from '@/src/features/room/roomStore';
import { roomService } from '@/src/services/roomService';
import { Button } from '@/src/components/Button';
import { LoadingOverlay } from '@/src/components/LoadingOverlay';
import { haptics } from '@/src/utils/haptics';

export default function ActivitySettingsScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const { activity: activityId } = useLocalSearchParams<{ activity: string }>();

  const activity = getActivity(activityId);
  const [settings, setSettings] = useState<Record<string, any>>(
    activity?.defaultSettings || {}
  );
  const [loading, setLoading] = useState(false);

  if (!activity) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.titleLarge, { color: colors.error }]}>
          Activity not found
        </Text>
      </View>
    );
  }

  const handleCreateRoom = async () => {
    setLoading(true);
    haptics.medium();

    try {
      const room = await roomService.createRoom(
        activity.id,
        settings,
        activity.maxPlayers
      );
      haptics.success();

      // Store room in state
      useRoomStore.getState().setRoom(room);

      setLoading(false);
      // Navigate to the lobby
      router.push(`/room/${room.code}`);
    } catch (err) {
      setLoading(false);
      haptics.error();
      console.error('Room creation failed', err);
    }
  };

  const SettingsComp = activity.SettingsComponent;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.lg }]}>
      <LoadingOverlay visible={loading} message="Creating room lobby..." />

      <Text style={[typography.headlineSmall, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
        Configure {activity.name}
      </Text>

      <View style={styles.formContainer}>
        <SettingsComp
          settings={settings}
          onSettingsChange={(newSettings) => setSettings(newSettings as any)}
        />
      </View>

      <Button
        title="Create Room Lobby"
        onPress={handleCreateRoom}
        variant="primary"
        size="lg"
        style={{ marginTop: spacing.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
  },
});
