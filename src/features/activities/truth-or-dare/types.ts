/**
 * Truth or Dare types
 */

export type TodCategory = 'fun' | 'spicy' | 'wholesome' | 'adventurous';

export interface TodSettings {
  category: TodCategory;
  includeCustomPrompts: boolean;
  customPrompts: string[];
  rounds: number; // 0 = unlimited
}

export interface TodPrompt {
  id: string;
  type: 'truth' | 'dare';
  text: string;
  category: TodCategory;
}

export const TOD_CATEGORIES: Array<{ value: TodCategory; label: string; emoji: string }> = [
  { value: 'fun', label: 'Fun & Casual', emoji: '😄' },
  { value: 'wholesome', label: 'Wholesome', emoji: '💖' },
  { value: 'adventurous', label: 'Adventurous', emoji: '🎯' },
  { value: 'spicy', label: 'Spicy', emoji: '🌶️' },
];

/** Sample prompts — in production, these could come from Firebase */
export const SAMPLE_PROMPTS: TodPrompt[] = [
  // Truths
  { id: 't1', type: 'truth', text: "What's the most embarrassing song on your playlist?", category: 'fun' },
  { id: 't2', type: 'truth', text: "What's the last lie you told?", category: 'fun' },
  { id: 't3', type: 'truth', text: "What's your biggest fear?", category: 'wholesome' },
  { id: 't4', type: 'truth', text: 'If you could have any superpower, what would it be?', category: 'fun' },
  { id: 't5', type: 'truth', text: "What's the nicest thing someone has done for you?", category: 'wholesome' },
  { id: 't6', type: 'truth', text: "What's a secret talent you have?", category: 'wholesome' },
  { id: 't7', type: 'truth', text: "What's the weirdest dream you've ever had?", category: 'fun' },
  { id: 't8', type: 'truth', text: "What's on your bucket list?", category: 'adventurous' },
  { id: 't9', type: 'truth', text: "What's the most adventurous thing you've ever done?", category: 'adventurous' },
  { id: 't10', type: 'truth', text: 'If you had to eat one food for the rest of your life, what would it be?', category: 'fun' },
  { id: 't11', type: 'truth', text: "What's the spiciest food you've ever eaten?", category: 'spicy' },
  { id: 't12', type: 'truth', text: "What's your most controversial opinion?", category: 'spicy' },

  // Dares
  { id: 'd1', type: 'dare', text: 'Do your best impression of another player.', category: 'fun' },
  { id: 'd2', type: 'dare', text: 'Send a funny selfie to the group chat.', category: 'fun' },
  { id: 'd3', type: 'dare', text: 'Say something nice about each player in the room.', category: 'wholesome' },
  { id: 'd4', type: 'dare', text: 'Speak in an accent for the next 2 rounds.', category: 'fun' },
  { id: 'd5', type: 'dare', text: 'Do 10 jumping jacks right now.', category: 'adventurous' },
  { id: 'd6', type: 'dare', text: "Tell the group your phone's battery percentage.", category: 'fun' },
  { id: 'd7', type: 'dare', text: 'Text a friend "I love you" right now.', category: 'wholesome' },
  { id: 'd8', type: 'dare', text: 'Try to lick your elbow.', category: 'fun' },
  { id: 'd9', type: 'dare', text: 'Let another player post a story on your social media.', category: 'spicy' },
  { id: 'd10', type: 'dare', text: 'Sing the chorus of the last song you listened to.', category: 'adventurous' },
  { id: 'd11', type: 'dare', text: 'Call a friend and tell them a joke.', category: 'adventurous' },
  { id: 'd12', type: 'dare', text: 'Keep a straight face while others try to make you laugh for 30 seconds.', category: 'fun' },
];
