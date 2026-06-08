/**
 * Quiz-specific types
 */

export interface QuizSettings {
  numberOfQuestions: number;
  timePerQuestion: number;
  category: QuizCategory;
  difficulty: QuizDifficulty;
}

export type QuizCategory =
  | 'general'
  | 'science'
  | 'history'
  | 'geography'
  | 'entertainment'
  | 'sports'
  | 'technology';

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: QuizCategory;
  difficulty: QuizDifficulty;
}

export interface QuizPlayerState {
  playerId: string;
  currentAnswer: number | null;
  answeredAt: number | null;
  isCorrect: boolean | null;
  roundScore: number;
}

export const QUIZ_CATEGORIES: Array<{ value: QuizCategory; label: string; emoji: string }> = [
  { value: 'general', label: 'General Knowledge', emoji: '🧠' },
  { value: 'science', label: 'Science', emoji: '🔬' },
  { value: 'history', label: 'History', emoji: '📜' },
  { value: 'geography', label: 'Geography', emoji: '🌍' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { value: 'sports', label: 'Sports', emoji: '⚽' },
  { value: 'technology', label: 'Technology', emoji: '💻' },
];

export const QUIZ_DIFFICULTIES: Array<{ value: QuizDifficulty; label: string }> = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

/** Sample questions — in production, these would come from an API or Firebase */
export const SAMPLE_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'What is the largest planet in our solar system?',
    options: ['Mars', 'Jupiter', 'Saturn', 'Neptune'],
    correctIndex: 1,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'q2',
    question: 'In what year did World War II end?',
    options: ['1943', '1944', '1945', '1946'],
    correctIndex: 2,
    category: 'history',
    difficulty: 'easy',
  },
  {
    id: 'q3',
    question: 'What is the chemical symbol for gold?',
    options: ['Go', 'Gd', 'Au', 'Ag'],
    correctIndex: 2,
    category: 'science',
    difficulty: 'medium',
  },
  {
    id: 'q4',
    question: 'Which country has the most time zones?',
    options: ['Russia', 'USA', 'China', 'France'],
    correctIndex: 3,
    category: 'geography',
    difficulty: 'hard',
  },
  {
    id: 'q5',
    question: 'What is the fastest land animal?',
    options: ['Lion', 'Cheetah', 'Horse', 'Gazelle'],
    correctIndex: 1,
    category: 'general',
    difficulty: 'easy',
  },
  {
    id: 'q6',
    question: 'Who painted the Mona Lisa?',
    options: ['Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Donatello'],
    correctIndex: 2,
    category: 'entertainment',
    difficulty: 'easy',
  },
  {
    id: 'q7',
    question: 'What programming language was created by Brendan Eich in 10 days?',
    options: ['Python', 'Java', 'JavaScript', 'C++'],
    correctIndex: 2,
    category: 'technology',
    difficulty: 'medium',
  },
  {
    id: 'q8',
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
    correctIndex: 1,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'q9',
    question: 'How many players are on a soccer team on the field?',
    options: ['9', '10', '11', '12'],
    correctIndex: 2,
    category: 'sports',
    difficulty: 'easy',
  },
  {
    id: 'q10',
    question: 'What is the capital of Australia?',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
    correctIndex: 2,
    category: 'geography',
    difficulty: 'medium',
  },
  {
    id: 'q11',
    question: 'Which element has the atomic number 1?',
    options: ['Helium', 'Hydrogen', 'Lithium', 'Carbon'],
    correctIndex: 1,
    category: 'science',
    difficulty: 'easy',
  },
  {
    id: 'q12',
    question: 'Who directed the movie "Inception"?',
    options: ['Steven Spielberg', 'Christopher Nolan', 'James Cameron', 'Martin Scorsese'],
    correctIndex: 1,
    category: 'entertainment',
    difficulty: 'medium',
  },
];
