export interface VocabItem {
  id: number;
  term: string;
  type: string;
  definition: string;
}

export interface TopicData {
  [key: string]: VocabItem[];
}

export interface Topic {
  id: string;
  name: string;
  data: VocabItem[];
}

export interface PunishmentWord extends VocabItem {
  requiredCount: number;
  currentCount: number;
}

export type AppMode = 
  | 'topic-select' 
  | 'plan' 
  | 'flashcard' 
  | 'quiz' 
  | 'result' 
  | 'punishment' 
  | 'retest';

export type FeedbackType = 'correct' | 'incorrect' | null;