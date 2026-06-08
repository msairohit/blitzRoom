/**
 * User store for BlitzRoom.
 * Manages the current user's identity with anonymous auth support.
 * Architecture supports easy migration to Firebase Auth later.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateDisplayName } from '@/src/utils/nameGenerator';
import { AVATAR_COLORS } from '@/src/types/player';

import { auth } from '@/src/services/firebase';
import { signInAnonymously } from 'firebase/auth';

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
      // Sign in anonymously with Firebase Auth
      const userCredential = await signInAnonymously(auth);
      const fbUid = userCredential.user.uid;

      const saved = await AsyncStorage.getItem(USER_STORAGE_KEY);
      let displayName = generateDisplayName();
      let avatarColor = randomAvatarColor();

      if (saved) {
        const data = JSON.parse(saved);
        displayName = data.displayName || displayName;
        avatarColor = data.avatarColor || avatarColor;
      }

      const userObj = {
        userId: fbUid,
        displayName,
        avatarColor,
      };

      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
      set({
        ...userObj,
        isAuthenticated: true,
        isInitialized: true,
      });
    } catch (error) {
      console.warn('[UserStore] Firebase Auth initialization failed, using local fallback:', error);
      // Fallback: generate a temporary identity
      const saved = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        set({
          userId: data.userId || generateUserId(),
          displayName: data.displayName || generateDisplayName(),
          avatarColor: data.avatarColor || randomAvatarColor(),
          isAuthenticated: false,
          isInitialized: true,
        });
      } else {
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
    ).catch((error) => {
      console.warn('[UserStore] Failed to save display name:', error);
    });
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
    ).catch((error) => {
      console.warn('[UserStore] Failed to save avatar color:', error);
    });
  },

  generateNewIdentity: () => {
    const newUser = {
      userId: get().userId ?? generateUserId(),
      displayName: generateDisplayName(),
      avatarColor: randomAvatarColor(),
    };
    set(newUser);
    AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser)).catch((error) => {
      console.warn('[UserStore] Failed to save new identity:', error);
    });
  },
}));
