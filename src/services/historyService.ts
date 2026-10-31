import { db, auth } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface GameHistoryEntry {
  id: string;
  activityType: string;
  roomCode: string;
  score: number;
  rank: number;
  totalPlayers: number;
  timestamp: number;
}

export const historyService = {
  /**
   * Save a game's statistics to the user's history if they are persistently logged in (non-anonymous).
   */
  async saveGameHistory(entry: Omit<GameHistoryEntry, 'id' | 'timestamp'>): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.isAnonymous) {
      // Ephemeral / anonymous user: skip saving history
      return false;
    }

    try {
      const historyId = `history_${Date.now()}`;
      const historyEntry: GameHistoryEntry = {
        ...entry,
        id: historyId,
        timestamp: Date.now(),
      };

      const historyDocRef = doc(db, 'users', currentUser.uid, 'gameHistory', historyId);
      await setDoc(historyDocRef, historyEntry);
      return true;
    } catch (error) {
      console.error('[HistoryService] Failed to save game history:', error);
      return false;
    }
  }
};
