/**
 * Room Service for BlitzRoom.
 * Implements real-time room communication and management connecting to Firebase.
 */

import { generateRoomCode } from '@/src/utils/generateRoomCode';
import type { Room, RoomStatus } from '@/src/types/room';
import type { Player } from '@/src/types/player';
import type { GameEvent } from '@/src/types/activity';
import { useUserStore } from '@/src/features/user/userStore';

import { db, rtdb } from './firebase';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { ref, set, push, onValue, off, remove, onDisconnect } from 'firebase/database';

interface InMemoryRoomState {
  room: Room;
  players: Map<string, Player>;
  events: GameEvent[];
}

const globalObj = global as any;
const localRooms: Map<string, InMemoryRoomState> = globalObj.localRooms || new Map();
const listeners: Map<string, Set<(data: any) => void>> = globalObj.listeners || new Map();

if (process.env.NODE_ENV !== 'production') {
  globalObj.localRooms = localRooms;
  globalObj.listeners = listeners;
}

function triggerListener(key: string, data: any) {
  const set = listeners.get(key);
  if (set) {
    set.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error(`[LocalDB] Error in listener for ${key}:`, e);
      }
    });
  }
}

class LocalDatabase {
  private isFirestoreAvailable = true;

  private handleFirestoreError(error: any) {
    if (this.isFirestoreAvailable) {
      console.warn('[LocalDatabase] Firestore error encountered. Disabling Firebase and falling back to local in-memory DB:', error);
      this.isFirestoreAvailable = false;
    }
  }

  isFirebaseEnabled(): boolean {
    return useUserStore.getState().isAuthenticated && this.isFirestoreAvailable;
  }

  async createRoom(
    activityType: string,
    settings: Record<string, unknown>,
    maxPlayers: number,
    adminId: string,
    adminName: string,
    adminColor: string
  ): Promise<Room> {
    if (this.isFirebaseEnabled()) {
      try {
        const code = generateRoomCode();
        const roomId = `room_${Date.now()}`;
        const room: Room = {
          id: roomId,
          code,
          adminId,
          status: 'waiting',
          activityType,
          activitySettings: settings,
          maxPlayers,
          createdAt: Date.now(),
          playerCount: 1,
        };

        // Save room in Firestore
        await setDoc(doc(db, 'rooms', roomId), room);

        // Save admin player in Firestore subcollection
        const adminPlayer: Player = {
          id: adminId,
          displayName: adminName,
          avatarColor: adminColor,
          isReady: true,
          score: 0,
          joinedAt: Date.now(),
          isAdmin: true,
        };
        await setDoc(doc(db, 'rooms', roomId, 'players', adminId), adminPlayer);

        return room;
      } catch (error) {
        this.handleFirestoreError(error);
      }
    }

    // Local Fallback
    const code = generateRoomCode();
    const roomId = `room_${Date.now()}`;
    const room: Room = {
      id: roomId,
      code,
      adminId,
      status: 'waiting',
      activityType,
      activitySettings: settings,
      maxPlayers,
      createdAt: Date.now(),
      playerCount: 1,
    };

    const adminPlayer: Player = {
      id: adminId,
      displayName: adminName,
      avatarColor: adminColor,
      isReady: true,
      score: 0,
      joinedAt: Date.now(),
      isAdmin: true,
    };

    const playersMap = new Map<string, Player>();
    playersMap.set(adminId, adminPlayer);

    localRooms.set(roomId, {
      room,
      players: playersMap,
      events: [],
    });

    return room;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    if (this.isFirebaseEnabled()) {
      try {
        const roomsRef = collection(db, 'rooms');
        const q = query(
          roomsRef,
          where('code', '==', code.toUpperCase())
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          return undefined;
        }
        const docSnap = querySnapshot.docs[0];
        const room = docSnap.data() as Room;
        if (room.status === 'finished' || room.status === 'active') {
          return undefined;
        }
        return room;
      } catch (error) {
        this.handleFirestoreError(error);
      }
    }

    const targetCode = code.toUpperCase();
    for (const state of localRooms.values()) {
      if (
        state.room.code === targetCode &&
        state.room.status !== 'finished' &&
        state.room.status !== 'active'
      ) {
        return state.room;
      }
    }
    return undefined;
  }

  async joinRoom(
    roomId: string,
    player: Omit<Player, 'isReady' | 'score' | 'joinedAt' | 'isAdmin'>
  ): Promise<Room> {
    if (this.isFirebaseEnabled()) {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) {
          throw new Error('Room not found');
        }
        const room = roomSnap.data() as Room;

        if (room.status === 'active') {
          throw new Error('Game is already in progress');
        }

        const playersRef = collection(db, 'rooms', roomId, 'players');
        const playersSnap = await getDocs(playersRef);
        const currentPlayers = playersSnap.docs.map((d) => d.data() as Player);

        if (currentPlayers.length >= room.maxPlayers) {
          throw new Error('Room is full');
        }

        if (currentPlayers.some((p) => p.id === player.id)) {
          return room;
        }

        const newPlayer: Player = {
          ...player,
          isReady: false,
          score: 0,
          joinedAt: Date.now(),
          isAdmin: false,
        };

        await setDoc(doc(db, 'rooms', roomId, 'players', player.id), newPlayer);
        const newCount = currentPlayers.length + 1;
        await updateDoc(roomRef, { playerCount: newCount });

        return { ...room, playerCount: newCount };
      } catch (error) {
        this.handleFirestoreError(error);
        throw error;
      }
    }

    const state = localRooms.get(roomId);
    if (!state) {
      throw new Error('Room not found');
    }

    if (state.room.status === 'active') {
      throw new Error('Game is already in progress');
    }

    const currentPlayers = Array.from(state.players.values());
    if (currentPlayers.length >= state.room.maxPlayers) {
      throw new Error('Room is full');
    }

    if (state.players.has(player.id)) {
      return state.room;
    }

    const newPlayer: Player = {
      ...player,
      isReady: false,
      score: 0,
      joinedAt: Date.now(),
      isAdmin: false,
    };

    state.players.set(player.id, newPlayer);
    state.room = {
      ...state.room,
      playerCount: state.players.size,
    };

    triggerListener(`room_${roomId}`, state.room);
    triggerListener(`players_${roomId}`, Array.from(state.players.values()).sort((a, b) => a.joinedAt - b.joinedAt));

    return state.room;
  }

  async leaveRoom(roomId: string, playerId: string) {
    if (this.isFirebaseEnabled()) {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;
        const room = roomSnap.data() as Room;

        const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
        await deleteDoc(playerRef);

        const playersRef = collection(db, 'rooms', roomId, 'players');
        const playersSnap = await getDocs(playersRef);
        const remainingPlayers = playersSnap.docs.map((d) => d.data() as Player);

        if (remainingPlayers.length === 0) {
          // 1. Delete room document
          await deleteDoc(roomRef);

          // 2. Clean up RTDB events tree
          const roomEventsRef = ref(rtdb, `rooms/${roomId}`);
          await remove(roomEventsRef);
          return;
        }

        let adminId = room.adminId;
        if (room.adminId === playerId) {
          remainingPlayers.sort((a, b) => a.joinedAt - b.joinedAt);
          const newAdmin = remainingPlayers[0];
          newAdmin.isAdmin = true;
          adminId = newAdmin.id;
          await updateDoc(doc(db, 'rooms', roomId, 'players', newAdmin.id), { isAdmin: true });
        }

        await updateDoc(roomRef, {
          adminId,
          playerCount: remainingPlayers.length,
        });
        return;
      } catch (error) {
        this.handleFirestoreError(error);
      }
    }

    const state = localRooms.get(roomId);
    if (!state) return;

    state.players.delete(playerId);

    if (state.players.size === 0) {
      localRooms.delete(roomId);
      return;
    }

    const remainingPlayers = Array.from(state.players.values()).sort((a, b) => a.joinedAt - b.joinedAt);
    let adminId = state.room.adminId;
    if (state.room.adminId === playerId) {
      const newAdmin = remainingPlayers[0];
      newAdmin.isAdmin = true;
      adminId = newAdmin.id;
    }

    state.room = {
      ...state.room,
      adminId,
      playerCount: remainingPlayers.length,
    };

    triggerListener(`room_${roomId}`, state.room);
    triggerListener(`players_${roomId}`, remainingPlayers);
  }

  async deleteFinishedRoom(roomId: string) {
    if (this.isFirebaseEnabled()) {
      try {
        const roomRef = doc(db, 'rooms', roomId);

        // 1. Delete players subcollection documents
        const playersRef = collection(db, 'rooms', roomId, 'players');
        const playersSnap = await getDocs(playersRef);
        const batch = writeBatch(db);
        playersSnap.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();

        // 2. Delete room document
        await deleteDoc(roomRef);

        // 3. Clean up RTDB events and state trees
        const roomEventsRef = ref(rtdb, `rooms/${roomId}`);
        await remove(roomEventsRef);
        return;
      } catch (error) {
        this.handleFirestoreError(error);
      }
    }

    // Local Fallback cleanup
    localRooms.delete(roomId);
  }

  async toggleReady(roomId: string, playerId: string, currentReadyState?: boolean) {
    if (this.isFirebaseEnabled()) {
      try {
        const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
        if (currentReadyState !== undefined) {
          await updateDoc(playerRef, { isReady: !currentReadyState });
          return;
        }
        const playerSnap = await getDoc(playerRef);
        if (!playerSnap.exists()) return;
        const player = playerSnap.data() as Player;
        await updateDoc(playerRef, { isReady: !player.isReady });
        return;
      } catch (error) {
        this.handleFirestoreError(error);
      }
    }

    const state = localRooms.get(roomId);
    if (!state) return;
    const player = state.players.get(playerId);
    if (!player) return;
    player.isReady = currentReadyState !== undefined ? !currentReadyState : !player.isReady;

    triggerListener(`players_${roomId}`, Array.from(state.players.values()).sort((a, b) => a.joinedAt - b.joinedAt));
  }

  async updatePlayer(roomId: string, playerId: string, updates: Partial<Player>) {
    if (this.isFirebaseEnabled()) {
      try {
        const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
        await updateDoc(playerRef, updates);
        return;
      } catch (error) {
        this.handleFirestoreError(error);
      }
    }

    const state = localRooms.get(roomId);
    if (!state) return;
    const player = state.players.get(playerId);
    if (!player) return;
    Object.assign(player, updates);

    triggerListener(`players_${roomId}`, Array.from(state.players.values()).sort((a, b) => a.joinedAt - b.joinedAt));
  }

  async resetPlayersForGame(roomId: string) {
    if (this.isFirebaseEnabled()) {
      try {
        const playersRef = collection(db, 'rooms', roomId, 'players');
        const playersSnap = await getDocs(playersRef);
        const batch = writeBatch(db);
        playersSnap.docs.forEach((docSnap) => {
          batch.update(docSnap.ref, { score: 0, isDone: false });
        });
        await batch.commit();
        return;
      } catch (error) {
        this.handleFirestoreError(error);
      }
    }

    const state = localRooms.get(roomId);
    if (!state) return;
    for (const player of state.players.values()) {
      player.score = 0;
      player.isDone = false;
    }
    triggerListener(`players_${roomId}`, Array.from(state.players.values()).sort((a, b) => a.joinedAt - b.joinedAt));
  }

  async startActivity(roomId: string) {
    if (this.isFirebaseEnabled()) {
      try {
        const playersRef = collection(db, 'rooms', roomId, 'players');
        const playersSnap = await getDocs(playersRef);
        const batch = writeBatch(db);
        playersSnap.docs.forEach((docSnap) => {
          batch.update(docSnap.ref, { score: 0, isDone: false });
        });

        const roomRef = doc(db, 'rooms', roomId);
        batch.update(roomRef, { status: 'active' });

        // Clear RTDB events for this room to start fresh (asynchronously)
        const roomEventsRef = ref(rtdb, `rooms/${roomId}/events`);
        remove(roomEventsRef).catch((e) => console.warn('[LocalDatabase] Failed to clear RTDB events:', e));

        await batch.commit();
        return;
      } catch (error) {
        this.handleFirestoreError(error);
      }
    }

    const state = localRooms.get(roomId);
    if (!state) return;
    for (const player of state.players.values()) {
      player.score = 0;
      player.isDone = false;
    }
    state.room = {
      ...state.room,
      status: 'active',
    };
    triggerListener(`players_${roomId}`, Array.from(state.players.values()).sort((a, b) => a.joinedAt - b.joinedAt));
    triggerListener(`room_${roomId}`, state.room);
  }

  async updateRoomStatus(roomId: string, status: RoomStatus) {
    if (this.isFirebaseEnabled()) {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, { status });
        return;
      } catch (error) {
        this.handleFirestoreError(error);
      }
    }

    const state = localRooms.get(roomId);
    if (!state) return;
    state.room = {
      ...state.room,
      status,
    };
    triggerListener(`room_${roomId}`, state.room);
  }

  async updateRoomSettings(roomId: string, settings: Record<string, unknown>) {
    if (this.isFirebaseEnabled()) {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, { activitySettings: settings });
        return;
      } catch (error) {
        this.handleFirestoreError(error);
      }
    }

    const state = localRooms.get(roomId);
    if (!state) return;
    state.room = {
      ...state.room,
      activitySettings: settings,
    };
    triggerListener(`room_${roomId}`, state.room);
  }

  async updatePlayerScore(roomId: string, playerId: string, score: number) {
    if (this.isFirebaseEnabled()) {
      try {
        const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
        const playerSnap = await getDoc(playerRef);
        if (!playerSnap.exists()) return;
        const player = playerSnap.data() as Player;
        await updateDoc(playerRef, { score: player.score + score });
        return;
      } catch (error) {
        this.handleFirestoreError(error);
      }
    }

    const state = localRooms.get(roomId);
    if (!state) return;
    const player = state.players.get(playerId);
    if (!player) return;
    player.score += score;

    triggerListener(`players_${roomId}`, Array.from(state.players.values()).sort((a, b) => a.joinedAt - b.joinedAt));
  }

  broadcastEvent(roomId: string, event: GameEvent) {
    if (this.isFirebaseEnabled()) {
      try {
        const roomEventsRef = ref(rtdb, `rooms/${roomId}/events`);
        const newEventRef = push(roomEventsRef);
        set(newEventRef, event);
        return;
      } catch (error) {
        this.handleFirestoreError(error);
      }
    }

    const state = localRooms.get(roomId);
    if (!state) return;
    state.events.push(event);
    triggerListener(`events_${roomId}`, event);
  }

  subscribeToRoom(roomId: string, callback: (room: Room) => void): () => void {
    if (!this.isFirebaseEnabled()) {
      const state = localRooms.get(roomId);
      if (state) {
        callback(state.room);
      }
      const key = `room_${roomId}`;
      if (!listeners.has(key)) {
        listeners.set(key, new Set());
      }
      listeners.get(key)!.add(callback);
      return () => {
        listeners.get(key)?.delete(callback);
      };
    }

    const roomRef = doc(db, 'rooms', roomId);
    let unsubscribed = false;
    let localUnsubscribe: (() => void) | null = null;

    const myId = useUserStore.getState().userId;
    if (myId) {
      const presenceRef = ref(rtdb, `rooms/${roomId}/presence/${myId}`);
      set(presenceRef, true).catch(() => {});
      onDisconnect(presenceRef).remove().catch(() => {});
    }

    const firestoreUnsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as Room);
      }
    }, (error) => {
      console.warn('[LocalDatabase] subscribeToRoom Firestore error:', error);
      this.handleFirestoreError(error);
      if (!unsubscribed) {
        localUnsubscribe = this.subscribeToRoom(roomId, callback);
      }
    });

    return () => {
      unsubscribed = true;
      firestoreUnsubscribe();
      if (localUnsubscribe) {
        localUnsubscribe();
      }
      if (myId) {
        const presenceRef = ref(rtdb, `rooms/${roomId}/presence/${myId}`);
        remove(presenceRef).catch(() => {});
      }
    };
  }

  subscribeToPlayers(roomId: string, callback: (players: Player[]) => void): () => void {
    if (!this.isFirebaseEnabled()) {
      const state = localRooms.get(roomId);
      if (state) {
        callback(Array.from(state.players.values()).sort((a, b) => a.joinedAt - b.joinedAt));
      }
      const key = `players_${roomId}`;
      if (!listeners.has(key)) {
        listeners.set(key, new Set());
      }
      listeners.get(key)!.add(callback);
      return () => {
        listeners.get(key)?.delete(callback);
      };
    }

    const playersRef = collection(db, 'rooms', roomId, 'players');
    let unsubscribed = false;
    let localUnsubscribe: (() => void) | null = null;
    let lastPlayers: Player[] = [];
    let presenceMap: Record<string, boolean> = {};

    const triggerCallback = () => {
      const updatedList = lastPlayers.map((player) => {
        if (player.id.startsWith('bot_')) {
          return { ...player, isOffline: false };
        }
        return {
          ...player,
          isOffline: !presenceMap[player.id],
        };
      });
      callback(updatedList);

      // Admin promotion: if current admin goes offline, promote the oldest active player
      const currentRoomData = useRoomStore.getState().currentRoom;
      if (currentRoomData && updatedList.length > 0) {
        const adminPlayer = updatedList.find((p) => p.id === currentRoomData.adminId);
        if (adminPlayer && adminPlayer.isOffline) {
          const activePlayers = updatedList.filter((p) => !p.isOffline && !p.id.startsWith('bot_'));
          if (activePlayers.length > 0) {
            const newAdmin = activePlayers[0];
            const myId = useUserStore.getState().userId;
            if (newAdmin.id === myId) {
              const roomDocRef = doc(db, 'rooms', roomId);
              updateDoc(roomDocRef, { adminId: myId }).catch(console.error);
              updateDoc(doc(db, 'rooms', roomId, 'players', myId), { isAdmin: true }).catch(console.error);
              updateDoc(doc(db, 'rooms', roomId, 'players', adminPlayer.id), { isAdmin: false }).catch(console.error);
            }
          }
        }
      }
    };

    const firestoreUnsubscribe = onSnapshot(playersRef, (snapshot) => {
      const playersList: Player[] = [];
      snapshot.forEach((doc) => {
        playersList.push(doc.data() as Player);
      });
      playersList.sort((a, b) => a.joinedAt - b.joinedAt);
      lastPlayers = playersList;
      triggerCallback();
    }, (error) => {
      console.warn('[LocalDatabase] subscribeToPlayers Firestore error:', error);
      this.handleFirestoreError(error);
      if (!unsubscribed) {
        localUnsubscribe = this.subscribeToPlayers(roomId, callback);
      }
    });

    const presenceRef = ref(rtdb, `rooms/${roomId}/presence`);
    const presenceUnsubscribe = onValue(presenceRef, (snapshot) => {
      presenceMap = snapshot.val() || {};
      triggerCallback();
    }, (error) => {
      console.warn('[LocalDatabase] subscribeToPlayers presence RTDB error:', error);
    });

    return () => {
      unsubscribed = true;
      firestoreUnsubscribe();
      off(presenceRef, 'value', presenceUnsubscribe);
      if (localUnsubscribe) {
        localUnsubscribe();
      }
    };
  }

  subscribeToEvents(roomId: string, callback: (event: GameEvent) => void): () => void {
    if (!this.isFirebaseEnabled()) {
      const state = localRooms.get(roomId);
      if (state && state.events.length > 0) {
        callback(state.events[state.events.length - 1]);
      }
      const key = `events_${roomId}`;
      if (!listeners.has(key)) {
        listeners.set(key, new Set());
      }
      listeners.get(key)!.add(callback);
      return () => {
        listeners.get(key)?.delete(callback);
      };
    }

    const roomEventsRef = ref(rtdb, `rooms/${roomId}/events`);
    let unsubscribed = false;
    let localUnsubscribe: (() => void) | null = null;

    const listener = onValue(roomEventsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const keys = Object.keys(data);
        if (keys.length > 0) {
          const latestKey = keys[keys.length - 1];
          callback(data[latestKey] as GameEvent);
        }
      }
    }, (error) => {
      console.warn('[LocalDatabase] subscribeToEvents RTDB error:', error);
      this.handleFirestoreError(error);
      if (!unsubscribed) {
        localUnsubscribe = this.subscribeToEvents(roomId, callback);
      }
    });

    return () => {
      unsubscribed = true;
      off(roomEventsRef, 'value', listener);
      if (localUnsubscribe) {
        localUnsubscribe();
      }
    };
  }

  /**
   * Write the full ToD game state to RTDB (fast path, ~50–150ms WebSocket sync).
   * Uses set() on a fixed path so all subscribers get the current state on first connect.
   */
  setTodState(roomId: string, state: Record<string, unknown>): void {
    if (this.isFirebaseEnabled()) {
      const todRef = ref(rtdb, `rooms/${roomId}/todState`);
      set(todRef, state).catch((e) =>
        console.warn('[LocalDatabase] setTodState RTDB error:', e)
      );
      return;
    }
    // Local fallback
    triggerListener(`todState_${roomId}`, state);
  }

  /**
   * Subscribe to ToD game state from RTDB.
   * Fires immediately with current state AND on every future change.
   */
  subscribeTodState(
    roomId: string,
    callback: (state: Record<string, unknown>) => void
  ): () => void {
    if (this.isFirebaseEnabled()) {
      const todRef = ref(rtdb, `rooms/${roomId}/todState`);
      let unsubscribed = false;

      const listener = onValue(
        todRef,
        (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.val() as Record<string, unknown>);
          }
        },
        (error) => {
          console.warn('[LocalDatabase] subscribeTodState RTDB error:', error);
        }
      );

      return () => {
        unsubscribed = true;
        off(todRef, 'value', listener);
      };
    }

    // Local fallback — register listener
    const key = `todState_${roomId}`;
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    listeners.get(key)!.add(callback);
    return () => {
      listeners.get(key)?.delete(callback);
    };
  }

  async spawnBots(roomId: string) {
    if (this.isFirebaseEnabled()) {
      try {
        const bots: Player[] = [
          {
            id: 'bot_1',
            displayName: 'BlitzBot🤖',
            avatarColor: '#EF4444',
            isReady: true,
            score: 0,
            joinedAt: Date.now(),
            isAdmin: false,
          },
          {
            id: 'bot_2',
            displayName: 'SpeedyFox🦊',
            avatarColor: '#10B981',
            isReady: true,
            score: 0,
            joinedAt: Date.now(),
            isAdmin: false,
          },
        ];

        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) return;
        const room = roomSnap.data() as Room;

        const playersRef = collection(db, 'rooms', roomId, 'players');
        const playersSnap = await getDocs(playersRef);
        const currentCount = playersSnap.size;

        for (const bot of bots) {
          await setDoc(doc(db, 'rooms', roomId, 'players', bot.id), bot);
        }

        await updateDoc(roomRef, { playerCount: currentCount + bots.length });
        return;
      } catch (error) {
        this.handleFirestoreError(error);
      }
    }

    const state = localRooms.get(roomId);
    if (!state) return;

    const bots: Player[] = [
      {
        id: 'bot_1',
        displayName: 'BlitzBot🤖',
        avatarColor: '#EF4444',
        isReady: true,
        score: 0,
        joinedAt: Date.now(),
        isAdmin: false,
      },
      {
        id: 'bot_2',
        displayName: 'SpeedyFox🦊',
        avatarColor: '#10B981',
        isReady: true,
        score: 0,
        joinedAt: Date.now(),
        isAdmin: false,
      },
    ];

    for (const bot of bots) {
      state.players.set(bot.id, bot);
    }

    state.room = {
      ...state.room,
      playerCount: state.players.size,
    };

    triggerListener(`room_${roomId}`, state.room);
    triggerListener(`players_${roomId}`, Array.from(state.players.values()).sort((a, b) => a.joinedAt - b.joinedAt));
  }
}

export const roomDatabase = new LocalDatabase();

export const roomService = {
  createRoom: async (activityType: string, settings: Record<string, unknown>, maxPlayers: number = 8): Promise<Room> => {
    const user = useUserStore.getState();
    if (!user.userId) throw new Error('User not initialized');

    const room = await roomDatabase.createRoom(
      activityType,
      settings,
      maxPlayers,
      user.userId,
      user.displayName,
      user.avatarColor
    );
    return room;
  },

  joinRoom: async (code: string): Promise<Room> => {
    const user = useUserStore.getState();
    if (!user.userId) throw new Error('User not initialized');

    const room = await roomDatabase.getRoomByCode(code);
    if (!room) throw new Error('Room not found');

    const updatedRoom = await roomDatabase.joinRoom(room.id, {
      id: user.userId,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
    });

    return updatedRoom;
  },

  leaveRoom: async (roomId: string): Promise<void> => {
    const user = useUserStore.getState();
    if (!user.userId) return;
    await roomDatabase.leaveRoom(roomId, user.userId);
  },

  toggleReady: async (roomId: string, currentReadyState?: boolean): Promise<void> => {
    const user = useUserStore.getState();
    if (!user.userId) return;
    await roomDatabase.toggleReady(roomId, user.userId, currentReadyState);
  },

  startActivity: async (roomId: string): Promise<void> => {
    await roomDatabase.startActivity(roomId);
  },

  endActivity: async (roomId: string): Promise<void> => {
    await roomDatabase.updateRoomStatus(roomId, 'finished');
  },

  deleteFinishedRoom: async (roomId: string): Promise<void> => {
    await roomDatabase.deleteFinishedRoom(roomId);
  },

  updateSettings: async (roomId: string, settings: Record<string, unknown>): Promise<void> => {
    await roomDatabase.updateRoomSettings(roomId, settings);
  },

  submitScore: async (roomId: string, score: number): Promise<void> => {
    const user = useUserStore.getState();
    if (!user.userId) return;
    await roomDatabase.updatePlayerScore(roomId, user.userId, score);
  },

  updatePlayer: async (roomId: string, playerId: string, updates: Partial<Player>): Promise<void> => {
    await roomDatabase.updatePlayer(roomId, playerId, updates);
  },

  broadcastEvent: (roomId: string, type: string, payload: Record<string, unknown>) => {
    const user = useUserStore.getState();
    const event: GameEvent = {
      type,
      senderId: user.userId || 'unknown',
      payload,
      timestamp: Date.now(),
    };
    roomDatabase.broadcastEvent(roomId, event);
  },

  spawnBots: async (roomId: string) => {
    await roomDatabase.spawnBots(roomId);
  },

  /**
   * Write ToD game state to RTDB (fast path).
   * Call this on every game action instead of updateSettings.
   */
  syncTodState: (roomId: string, state: Record<string, unknown>): void => {
    roomDatabase.setTodState(roomId, state);
  },

  /**
   * Subscribe to ToD game state from RTDB.
   * Returns an unsubscribe function.
   */
  onTodState: (
    roomId: string,
    callback: (state: Record<string, unknown>) => void
  ): (() => void) => {
    return roomDatabase.subscribeTodState(roomId, callback);
  },
};
