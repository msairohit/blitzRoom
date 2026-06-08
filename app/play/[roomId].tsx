/**
 * Activity Play Screen
 * Dynamically resolves and mounts the active game/activity component.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/src/theme';
import { useUserStore } from '@/src/features/user/userStore';
import { useRoomStore } from '@/src/features/room/roomStore';
import { roomDatabase, roomService } from '@/src/services/roomService';
import { getActivity } from '@/src/features/activities/registry';
import { haptics } from '@/src/utils/haptics';
import type { GameEvent } from '@/src/types/activity';

export default function PlayScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();

  const currentUser = useUserStore();
  const { currentRoom, players } = useRoomStore();

  // Handle subscriptions to room and players during active game
  useEffect(() => {
    if (!roomId) return;

    const unsubRoom = roomDatabase.subscribeToRoom(roomId, (updatedRoom) => {
      useRoomStore.getState().setRoom(updatedRoom);
      
      // If room status changes back to waiting/finished, route accordingly
      if (updatedRoom.status === 'finished') {
        haptics.medium();
        useRoomStore.getState().reset();
        router.replace('/');
      }
    });

    const unsubPlayers = roomDatabase.subscribeToPlayers(roomId, (updatedPlayers) => {
      useRoomStore.getState().setPlayers(updatedPlayers);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomId]);

  const handleActivityEnd = useCallback(
    async (results: any) => {
      haptics.success();
      // transition room status back to finished
      if (currentRoom) {
        await roomService.endActivity(currentRoom.id);
        // Reset room state
        useRoomStore.getState().reset();
        router.replace('/');
      }
    },
    [currentRoom, router]
  );

  const handleBroadcast = useCallback(
    (event: Omit<GameEvent, 'senderId' | 'timestamp'>) => {
      if (!roomId) return;
      roomDatabase.broadcastEvent(roomId, {
        ...event,
        senderId: currentUser.userId || 'unknown',
        timestamp: Date.now(),
      } as GameEvent);
    },
    [roomId, currentUser.userId]
  );

  const handleSubscribeToEvents = useCallback(
    (callback: (event: GameEvent) => void) => {
      if (!roomId) return () => {};
      return roomDatabase.subscribeToEvents(roomId, callback);
    },
    [roomId]
  );

  const handleSyncGameState = useCallback(
    (state: Record<string, unknown>) => {
      if (!roomId) return;
      roomService.syncTodState(roomId, state);
    },
    [roomId]
  );

  const handleOnGameState = useCallback(
    (callback: (state: Record<string, unknown>) => void) => {
      if (!roomId) return () => {};
      return roomService.onTodState(roomId, callback);
    },
    [roomId]
  );

  if (!currentRoom) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.titleLarge, { color: colors.textSecondary }]}>Loading Game...</Text>
      </View>
    );
  }

  const activity = getActivity(currentRoom.activityType);
  if (!activity) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.titleLarge, { color: colors.error }]}>Activity not found</Text>
      </View>
    );
  }

  const GameComponent = activity.GameComponent;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <GameComponent
        roomId={currentRoom.id}
        roomCode={currentRoom.code}
        currentPlayerId={currentUser.userId || ''}
        isAdmin={currentRoom.adminId === currentUser.userId}
        players={players}
        settings={currentRoom.activitySettings}
        onActivityEnd={handleActivityEnd}
        broadcastEvent={handleBroadcast}
        onGameEvent={handleSubscribeToEvents}
        syncGameState={handleSyncGameState}
        onGameState={handleOnGameState}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
