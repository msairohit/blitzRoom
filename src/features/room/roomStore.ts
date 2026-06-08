/**
 * Room store for BlitzRoom.
 * Manages room state for the current session.
 * This is a local/client-side store — Firebase integration will plug into this.
 */

import { create } from 'zustand';
import type { Room, RoomStatus } from '@/src/types/room';
import type { Player } from '@/src/types/player';

interface RoomState {
  /** Current room data (null if not in a room) */
  currentRoom: Room | null;
  /** Players in the current room */
  players: Player[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if something went wrong */
  error: string | null;

  // Actions
  setRoom: (room: Room | null) => void;
  updateRoom: (updates: Partial<Room>) => void;
  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  setRoomStatus: (status: RoomStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentRoom: null,
  players: [],
  isLoading: false,
  error: null,
};

export const useRoomStore = create<RoomState>((set) => ({
  ...initialState,

  setRoom: (room) => set({ currentRoom: room, error: null }),

  updateRoom: (updates) =>
    set((state) => ({
      currentRoom: state.currentRoom
        ? { ...state.currentRoom, ...updates }
        : null,
    })),

  setPlayers: (players) => set({ players }),

  addPlayer: (player) =>
    set((state) => {
      // Avoid duplicates
      if (state.players.some((p) => p.id === player.id)) {
        return state;
      }
      return { players: [...state.players, player] };
    }),

  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    })),

  updatePlayer: (playerId, updates) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, ...updates } : p
      ),
    })),

  setRoomStatus: (status) =>
    set((state) => ({
      currentRoom: state.currentRoom
        ? { ...state.currentRoom, status }
        : null,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
