/**
 * User store for BlitzRoom.
 * Manages the current user's identity with anonymous auth support.
 * Architecture supports easy migration to Firebase Auth later.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateDisplayName } from '@/src/utils/nameGenerator';
import { AVATAR_COLORS } from '@/src/types/player';

const USER_STORAGE_KEY = '@blitzroom/user';

interface UserState {
  /** Unique user ID (generated on first launch) */
  userId: string | null;
  /** User's display name */
  displayName: string;
  /** User's avatar color */
  avatarColor: string;
  /** Whether the user is "logged in" (has persistent identity) */
  isAuthenticated: boolean;
  /** Whether user data has been loaded from storage */
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  setDisplayName: (name: string) => void;
  setAvatarColor: (color: string) => void;
  generateNewIdentity: () => void;
}

function generateUserId(): string {
  return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export const useUserStore = create<UserState>((set, get) => ({
  userId: null,
  displayName: '',
  avatarColor: '',
  isAuthenticated: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const saved = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        set({
          userId: data.userId,
          displayName: data.displayName,
          avatarColor: data.avatarColor,
          isAuthenticated: false, // Anonymous for now
          isInitialized: true,
        });
      } else {
        // First launch — generate anonymous identity
        const newUser = {
          userId: generateUserId(),
          displayName: generateDisplayName(),
          avatarColor: randomAvatarColor(),
        };
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
        set({
          ...newUser,
          isAuthenticated: false,
          isInitialized: true,
        });
      }
    } catch {
      // Fallback: generate a temporary identity
      set({
        userId: generateUserId(),
        displayName: generateDisplayName(),
        avatarColor: randomAvatarColor(),
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  },

  setDisplayName: (name: string) => {
    set({ displayName: name });
    // Persist
    const state = get();
    AsyncStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        userId: state.userId,
        displayName: name,
        avatarColor: state.avatarColor,
      })
    );
  },

  setAvatarColor: (color: string) => {
    set({ avatarColor: color });
    const state = get();
    AsyncStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        userId: state.userId,
        displayName: state.displayName,
        avatarColor: color,
      })
    );
  },

  generateNewIdentity: () => {
    const newUser = {
      userId: get().userId ?? generateUserId(),
      displayName: generateDisplayName(),
      avatarColor: randomAvatarColor(),
    };
    set(newUser);
    AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
  },
}));
