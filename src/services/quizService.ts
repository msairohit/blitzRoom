import { db, auth } from './firebase';
import { doc, setDoc, getDocs, collection, query, orderBy } from 'firebase/firestore';
import type { CustomQuiz, QuizQuestion } from '../features/activities/quiz/types';

export const quizService = {
  /**
   * Check if the current user is persistently logged in (not anonymous)
   */
  isUserLoggedIn(): boolean {
    const currentUser = auth.currentUser;
    return !!(currentUser && !currentUser.isAnonymous);
  },

  /**
   * Save a custom quiz to Cloud Firestore if the user is logged in.
   */
  async saveCustomQuiz(name: string, emoji: string, questions: QuizQuestion[]): Promise<CustomQuiz> {
    const quizId = `custom_${Date.now()}`;
    const customQuiz: CustomQuiz = {
      id: quizId,
      name,
      emoji,
      questions,
      createdAt: Date.now(),
    };

    if (this.isUserLoggedIn()) {
      try {
        const userId = auth.currentUser!.uid;
        const quizDocRef = doc(db, 'users', userId, 'customQuizzes', quizId);
        await setDoc(quizDocRef, customQuiz);
      } catch (error) {
        console.error('[QuizService] Failed to save custom quiz to Firestore:', error);
      }
    }

    return customQuiz;
  },

  /**
   * Fetch custom quizzes for the logged-in user from Firestore.
   */
  async getCustomQuizzes(): Promise<CustomQuiz[]> {
    if (!this.isUserLoggedIn()) {
      return [];
    }

    try {
      const userId = auth.currentUser!.uid;
      const quizzesCollRef = collection(db, 'users', userId, 'customQuizzes');
      const q = query(quizzesCollRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const quizzes: CustomQuiz[] = [];
      querySnapshot.forEach((doc) => {
        quizzes.push(doc.data() as CustomQuiz);
      });
      return quizzes;
    } catch (error) {
      console.error('[QuizService] Failed to fetch custom quizzes:', error);
      return [];
    }
  },
};
