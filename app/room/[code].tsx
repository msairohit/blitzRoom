/**
 * Room Lobby Screen
 * Real-time room waiting room showing connected players, code share, and ready indicators.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Share, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/src/theme';
import { useUserStore } from '@/src/features/user/userStore';
import { useRoomStore } from '@/src/features/room/roomStore';
import { roomDatabase, roomService } from '@/src/services/roomService';
import { Button } from '@/src/components/Button';
import { PlayerCard } from '@/src/components/PlayerCard';
import { RoomCodeDisplay } from '@/src/components/RoomCodeDisplay';
import { LoadingOverlay } from '@/src/components/LoadingOverlay';
import { getActivity } from '@/src/features/activities/registry';
import { haptics } from '@/src/utils/haptics';

export default function RoomLobbyScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();

  const currentUser = useUserStore();
  const { currentRoom, players } = useRoomStore();
  const [loading, setLoading] = useState(false);

  // Find room and subscribe
  useEffect(() => {
    if (!code) return;

    let isMounted = true;
    let unsubRoom = () => {};
    let unsubPlayers = () => {};

    const setupSubscriptions = async () => {
      try {
        const r = await roomDatabase.getRoomByCode(code);
        if (!r) {
          if (isMounted) {
            haptics.error();
            alert('Room not found or already finished.');
            router.replace('/');
          }
          return;
        }

        if (!isMounted) return;
        useRoomStore.getState().setRoom(r);

        // Subscribe to updates
        unsubRoom = roomDatabase.subscribeToRoom(r.id, (updatedRoom) => {
          if (isMounted) {
            useRoomStore.getState().setRoom(updatedRoom);
            
            // If status changes to active, route to play screen
            if (updatedRoom.status === 'active') {
              haptics.success();
              router.replace(`/play/${updatedRoom.id}`);
            }
          }
        });

        unsubPlayers = roomDatabase.subscribeToPlayers(r.id, (updatedPlayers) => {
          if (isMounted) {
            useRoomStore.getState().setPlayers(updatedPlayers);
          }
        });
      } catch (err) {
        console.error('Failed to setup room subscriptions:', err);
        if (isMounted) {
          alert('Failed to load room details.');
          router.replace('/');
        }
      }
    };

    setupSubscriptions();

    return () => {
      isMounted = false;
      unsubRoom();
      unsubPlayers();
    };
  }, [code]);

  if (!currentRoom) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.titleLarge, { color: colors.textSecondary }]}>Loading Lobby...</Text>
      </View>
    );
  }

  const isCurrentUserAdmin = currentRoom.adminId === currentUser.userId;
  const activityInfo = getActivity(currentRoom.activityType);

  const handleToggleReady = async () => {
    haptics.light();
    if (currentUser.userId) {
      useRoomStore.getState().updatePlayer(currentUser.userId, { isReady: !isCurrentPlayerReady });
    }
    roomService.toggleReady(currentRoom.id, isCurrentPlayerReady).catch((err) => {
      console.error('Failed to toggle ready status:', err);
      if (currentUser.userId) {
        useRoomStore.getState().updatePlayer(currentUser.userId, { isReady: isCurrentPlayerReady });
      }
    });
  };

  const handleStartGame = async () => {
    if (players.length < (activityInfo?.minPlayers || 2)) {
      haptics.warning();
      alert(`Need at least ${activityInfo?.minPlayers || 2} players to start!`);
      return;
    }

    const unreadyPlayers = players.filter((p) => !p.isReady);
    if (unreadyPlayers.length > 0) {
      haptics.warning();
      alert('Waiting for all players to be Ready!');
      return;
    }

    setLoading(true);
    haptics.medium();
    try {
      await roomService.startActivity(currentRoom.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    haptics.medium();
    await roomService.leaveRoom(currentRoom.id);
    useRoomStore.getState().reset();
    router.replace('/');
  };

  const handleShareLink = async () => {
    haptics.success();
    try {
      const shareUrl = `blitzroom://room/${currentRoom.code}`;
      await Share.share({
        message: `Join my BlitzRoom activity! Code: ${currentRoom.code}\nLink: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      console.error('Sharing failed', err);
    }
  };

  const handleAddBots = () => {
    haptics.success();
    roomService.spawnBots(currentRoom.id);
  };

  const currentPlayerObj = players.find((p) => p.id === currentUser.userId);
  const isCurrentPlayerReady = currentPlayerObj?.isReady || false;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.lg }]}>
      <LoadingOverlay visible={loading} message="Starting activity..." />

      {/* Header section */}
      <View style={[styles.header, { marginBottom: spacing.lg, marginTop: spacing.xl }]}>
        <Text style={[typography.headlineSmall, { color: colors.textPrimary, fontWeight: 'bold' }]}>
          Room Lobby
        </Text>
        <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
          Activity: <Text style={{ color: colors.secondary, fontWeight: 'bold' }}>{activityInfo?.name || currentRoom.activityType}</Text>
        </Text>
      </View>

      {/* Room code sharing */}
      <View style={[styles.shareSection, { marginBottom: spacing.lg, gap: spacing.md }]}>
        <RoomCodeDisplay code={currentRoom.code} large />
        <Button
          title="Share Invite"
          onPress={handleShareLink}
          variant="outline"
          size="md"
          style={{ flex: 1 }}
        />
      </View>

      {/* Bots helper for testing */}
      {isCurrentUserAdmin && players.length < 3 && (
        <TouchableOpacity
          style={[styles.botsButton, { backgroundColor: colors.primaryMuted, borderColor: colors.primary, borderRadius: 8, padding: spacing.sm, marginBottom: spacing.md }]}
          onPress={handleAddBots}
        >
          <Text style={[typography.titleSmall, { color: colors.primary, textAlign: 'center' }]}>
            🤖 Add Simulated Players (Testing)
          </Text>
        </TouchableOpacity>
      )}

      {/* Player list heading */}
      <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
        Players ({players.length}/{currentRoom.maxPlayers})
      </Text>

      {/* Player List */}
      <FlatList
        data={players}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlayerCard
            player={item}
            isCurrentUser={item.id === currentUser.userId}
            showKickOption={isCurrentUserAdmin}
            onKickPress={async () => {
              haptics.warning();
              roomDatabase.leaveRoom(currentRoom.id, item.id);
            }}
          />
        )}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      />

      {/* Footer controls */}
      <View style={[styles.footer, { gap: spacing.sm }]}>
        {isCurrentUserAdmin ? (
          <Button
            title={`Start ${activityInfo?.name || 'Activity'}`}
            onPress={handleStartGame}
            variant="primary"
            size="lg"
          />
        ) : (
          <Button
            title={isCurrentPlayerReady ? 'Not Ready' : 'Ready Up!'}
            onPress={handleToggleReady}
            variant={isCurrentPlayerReady ? 'outline' : 'primary'}
            size="lg"
          />
        )}

        <Button
          title="Leave Room"
          onPress={handleLeaveRoom}
          variant="ghost"
          size="md"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
  },
  shareSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    marginTop: 'auto',
  },
  botsButton: {
    borderWidth: 1,
  },
});
